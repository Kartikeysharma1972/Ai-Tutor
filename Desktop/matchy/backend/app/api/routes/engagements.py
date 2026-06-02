from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import CurrentUser, DbDep, require_founder
from app.models.engagement import Engagement, EngagementStatus
from app.models.match import Match, MatchStatus
from app.models.user import User, UserRole
from app.schemas.engagement import EngagementCreate, EngagementOut, ReviewCreate
from app.services.engagements import add_review, complete_engagement, create_engagement
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/engagements", tags=["engagements"])


@router.post("", response_model=EngagementOut, status_code=201)
def open_engagement(
    payload: EngagementCreate,
    db: DbDep,
    user: User = Depends(require_founder),
) -> EngagementOut:
    """Founder accepts a match into a working contract. Commission is recorded here."""
    match = db.execute(
        select(Match).where(Match.id == payload.match_id).options(selectinload(Match.project))
    ).scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    if match.project.founder_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    if match.status == MatchStatus.accepted:
        raise HTTPException(status_code=409, detail="Match already engaged")

    engagement = create_engagement(db, match, payload.agreed_amount)
    db.commit()
    db.refresh(engagement)
    return engagement


@router.get("", response_model=list[EngagementOut])
def list_my_engagements(db: DbDep, user: CurrentUser) -> list[EngagementOut]:
    stmt = select(Engagement)
    if user.role == UserRole.founder:
        stmt = stmt.where(Engagement.founder_id == user.id)
    elif user.role == UserRole.developer:
        if user.developer_profile is None:
            return []
        stmt = stmt.where(Engagement.developer_id == user.developer_profile.id)
    # admins see all
    engagements = db.execute(stmt.order_by(Engagement.started_at.desc())).scalars().all()
    return list(engagements)


def _accessible_engagement(db, engagement_id: int, user: User) -> Engagement:
    engagement = db.get(Engagement, engagement_id)
    if engagement is None:
        raise HTTPException(status_code=404, detail="Engagement not found")
    is_founder = user.role == UserRole.founder and engagement.founder_id == user.id
    is_dev = (
        user.role == UserRole.developer
        and user.developer_profile is not None
        and engagement.developer_id == user.developer_profile.id
    )
    if not (is_founder or is_dev or user.role == UserRole.admin):
        raise HTTPException(status_code=403, detail="Not your engagement")
    return engagement


@router.post("/{engagement_id}/complete", response_model=EngagementOut)
def mark_complete(engagement_id: int, db: DbDep, user: User = Depends(require_founder)) -> EngagementOut:
    engagement = _accessible_engagement(db, engagement_id, user)
    if engagement.status != EngagementStatus.active:
        raise HTTPException(status_code=409, detail="Engagement is not active")
    complete_engagement(db, engagement)
    db.commit()
    db.refresh(engagement)
    return engagement


@router.post("/{engagement_id}/review", status_code=201)
def review_engagement(
    engagement_id: int,
    payload: ReviewCreate,
    db: DbDep,
    user: User = Depends(require_founder),
) -> dict:
    engagement = _accessible_engagement(db, engagement_id, user)
    if engagement.status != EngagementStatus.completed:
        raise HTTPException(status_code=409, detail="Can only review completed engagements")
    add_review(db, engagement, user.id, payload.rating, payload.comment)
    db.commit()
    return {"detail": "Review recorded"}
