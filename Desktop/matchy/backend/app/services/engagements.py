from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.developer import DeveloperProfile
from app.models.engagement import Engagement, EngagementStatus
from app.models.match import Match, MatchStatus
from app.models.project import Project, ProjectStatus
from app.models.review import Review


def compute_commission(amount: float) -> tuple[float, float, float]:
    """Return (client_commission, developer_commission, platform_revenue).

    Commission is charged to *both* parties — the founder pays on top of the
    contract value, the developer has a cut withheld. Platform revenue is the
    sum of both.
    """
    client = round(amount * settings.commission_rate_client / 100.0, 2)
    developer = round(amount * settings.commission_rate_developer / 100.0, 2)
    return client, developer, round(client + developer, 2)


def create_engagement(db: Session, match: Match, agreed_amount: float) -> Engagement:
    """Promote an accepted match into a working engagement and bump developer load."""
    client_comm, dev_comm, revenue = compute_commission(agreed_amount)

    project: Project = match.project
    engagement = Engagement(
        match_id=match.id,
        project_id=match.project_id,
        developer_id=match.developer_id,
        founder_id=project.founder_id,
        agreed_amount=agreed_amount,
        commission_rate_client=settings.commission_rate_client,
        commission_rate_developer=settings.commission_rate_developer,
        commission_client=client_comm,
        commission_developer=dev_comm,
        platform_revenue=revenue,
        status=EngagementStatus.active,
    )
    db.add(engagement)

    match.status = MatchStatus.accepted
    project.status = ProjectStatus.in_progress

    dev = db.get(DeveloperProfile, match.developer_id)
    if dev is not None:
        dev.active_engagements += 1

    db.flush()
    return engagement


def complete_engagement(db: Session, engagement: Engagement) -> Engagement:
    if engagement.status != EngagementStatus.active:
        return engagement
    engagement.status = EngagementStatus.completed
    engagement.completed_at = datetime.now(timezone.utc)

    project = db.get(Project, engagement.project_id)
    if project is not None:
        project.status = ProjectStatus.completed

    dev = db.get(DeveloperProfile, engagement.developer_id)
    if dev is not None:
        dev.active_engagements = max(0, dev.active_engagements - 1)
        dev.completed_projects += 1

    db.flush()
    return engagement


def add_review(db: Session, engagement: Engagement, author_id: int, rating: float, comment: str) -> Review:
    """Record a review and roll the developer's running rating average forward."""
    review = Review(
        engagement_id=engagement.id,
        developer_id=engagement.developer_id,
        author_id=author_id,
        rating=rating,
        comment=comment,
    )
    db.add(review)

    dev = db.get(DeveloperProfile, engagement.developer_id)
    if dev is not None:
        total = dev.rating_avg * dev.rating_count + rating
        dev.rating_count += 1
        dev.rating_avg = round(total / dev.rating_count, 3)

    db.flush()
    return review


def revenue_summary(db: Session) -> dict:
    engagements = db.execute(select(Engagement)).scalars().all()
    total = len(engagements)
    active = sum(1 for e in engagements if e.status == EngagementStatus.active)
    completed = sum(1 for e in engagements if e.status == EngagementStatus.completed)
    gross = round(sum(e.agreed_amount for e in engagements), 2)
    platform_rev = round(sum(e.platform_revenue for e in engagements), 2)
    realised = round(
        sum(e.platform_revenue for e in engagements if e.status == EngagementStatus.completed), 2
    )
    return {
        "total_engagements": total,
        "active_engagements": active,
        "completed_engagements": completed,
        "gross_contract_value": gross,
        "total_platform_revenue": platform_rev,
        "realised_revenue": realised,
        "commission_rate_client": settings.commission_rate_client,
        "commission_rate_developer": settings.commission_rate_developer,
    }
