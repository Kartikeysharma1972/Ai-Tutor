from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentUser, DbDep, require_developer, require_founder
from app.api.serializers import match_out
from app.core.matching.engine import rank_developers
from app.models.developer import DeveloperProfile
from app.models.match import Match, MatchStatus
from app.models.project import Project
from app.models.user import User
from app.schemas.match import MatchOut, MatchPreview, MatchStatusUpdate
from app.services.matches import generate_matches
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api", tags=["matches"])


def _owned_project(db, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.founder_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    return project


@router.get("/projects/{project_id}/match-preview", response_model=list[MatchPreview])
def preview_matches(
    project_id: int,
    db: DbDep,
    user: User = Depends(require_founder),
    limit: int = Query(20, ge=1, le=100),
) -> list[MatchPreview]:
    """Dry-run the engine without persisting — lets a founder see who'd surface."""
    project = _owned_project(db, project_id, user)
    ranked = rank_developers(db, project, limit=limit)

    previews: list[MatchPreview] = []
    for rm in ranked:
        dev = db.get(DeveloperProfile, rm.developer_id)
        b = rm.breakdown
        previews.append(
            MatchPreview(
                developer_id=rm.developer_id,
                full_name=dev.user.full_name if dev and dev.user else "",
                headline=dev.headline if dev else "",
                years_experience=dev.years_experience if dev else 0.0,
                score=b.score,
                skill_score=b.skill,
                experience_score=b.experience,
                availability_score=b.availability,
                reputation_score=b.reputation,
                fairness_score=b.fairness,
                explanation=b.explanation,
            )
        )
    return previews


@router.post("/projects/{project_id}/matches", response_model=list[MatchOut], status_code=201)
def create_matches(
    project_id: int,
    db: DbDep,
    user: User = Depends(require_founder),
    limit: int = Query(20, ge=1, le=100),
) -> list[MatchOut]:
    """Generate & persist matches for a project."""
    project = _owned_project(db, project_id, user)
    matches = generate_matches(db, project, limit=limit)
    db.commit()
    # reload with relationships for serialization
    ids = [m.id for m in matches]
    rows = db.execute(
        select(Match)
        .where(Match.id.in_(ids))
        .options(
            selectinload(Match.developer).selectinload(DeveloperProfile.skills),
            selectinload(Match.developer).selectinload(DeveloperProfile.user),
        )
    ).scalars().all()
    rows.sort(key=lambda m: m.score, reverse=True)
    return [match_out(m) for m in rows]


@router.get("/projects/{project_id}/matches", response_model=list[MatchOut])
def list_project_matches(
    project_id: int,
    db: DbDep,
    user: User = Depends(require_founder),
    status: MatchStatus | None = None,
) -> list[MatchOut]:
    _owned_project(db, project_id, user)
    stmt = (
        select(Match)
        .where(Match.project_id == project_id)
        .options(
            selectinload(Match.developer).selectinload(DeveloperProfile.skills),
            selectinload(Match.developer).selectinload(DeveloperProfile.user),
        )
        .order_by(Match.score.desc())
    )
    if status is not None:
        stmt = stmt.where(Match.status == status)
    matches = db.execute(stmt).scalars().all()
    return [match_out(m) for m in matches]


def _load_match(db, match_id: int) -> Match:
    match = db.execute(
        select(Match)
        .where(Match.id == match_id)
        .options(
            selectinload(Match.developer).selectinload(DeveloperProfile.skills),
            selectinload(Match.developer).selectinload(DeveloperProfile.user),
            selectinload(Match.project),
        )
    ).scalar_one_or_none()
    if match is None:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


# Founder transitions: shortlist / invite / reject.
_FOUNDER_TRANSITIONS = {MatchStatus.shortlisted, MatchStatus.invited, MatchStatus.rejected}
# Developer transitions: accept(ed via engagement) / decline.
_DEVELOPER_TRANSITIONS = {MatchStatus.declined}


@router.patch("/matches/{match_id}/status", response_model=MatchOut)
def update_match_status(
    match_id: int,
    payload: MatchStatusUpdate,
    db: DbDep,
    user: CurrentUser,
) -> MatchOut:
    match = _load_match(db, match_id)
    new_status = payload.status

    if new_status in _FOUNDER_TRANSITIONS:
        if match.project.founder_id != user.id:
            raise HTTPException(status_code=403, detail="Not your project")
    elif new_status in _DEVELOPER_TRANSITIONS:
        if user.developer_profile is None or match.developer_id != user.developer_profile.id:
            raise HTTPException(status_code=403, detail="Not your match")
    else:
        raise HTTPException(
            status_code=400,
            detail="Use the engagement endpoint to accept a match",
        )

    match.status = new_status
    db.commit()
    db.refresh(match)
    return match_out(match)


@router.get("/developers/me/matches", response_model=list[MatchOut])
def my_matches(
    db: DbDep,
    user: User = Depends(require_developer),
) -> list[MatchOut]:
    """Matches where this developer has been invited/shortlisted."""
    if user.developer_profile is None:
        return []
    stmt = (
        select(Match)
        .where(
            Match.developer_id == user.developer_profile.id,
            Match.status.in_([MatchStatus.invited, MatchStatus.shortlisted]),
        )
        .options(
            selectinload(Match.developer).selectinload(DeveloperProfile.skills),
            selectinload(Match.developer).selectinload(DeveloperProfile.user),
        )
        .order_by(Match.score.desc())
    )
    matches = db.execute(stmt).scalars().all()
    return [match_out(m) for m in matches]
