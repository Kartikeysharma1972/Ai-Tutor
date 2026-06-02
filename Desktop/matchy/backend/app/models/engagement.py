import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class EngagementStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"
    disputed = "disputed"


class Engagement(Base):
    """An accepted match: the actual working contract between founder & developer.

    This is where the platform's commission is recorded.
    """

    __tablename__ = "engagements"

    id: Mapped[int] = mapped_column(primary_key=True)
    match_id: Mapped[int] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), index=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    developer_id: Mapped[int] = mapped_column(
        ForeignKey("developer_profiles.id", ondelete="CASCADE"), index=True
    )
    founder_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    # Agreed value of the contract.
    agreed_amount: Mapped[float] = mapped_column(Float, default=0.0)

    # Commission snapshot (rates captured at creation so later config changes
    # don't rewrite historical earnings).
    commission_rate_client: Mapped[float] = mapped_column(Float, default=0.0)
    commission_rate_developer: Mapped[float] = mapped_column(Float, default=0.0)
    commission_client: Mapped[float] = mapped_column(Float, default=0.0)
    commission_developer: Mapped[float] = mapped_column(Float, default=0.0)
    platform_revenue: Mapped[float] = mapped_column(Float, default=0.0)

    status: Mapped[EngagementStatus] = mapped_column(
        Enum(EngagementStatus), default=EngagementStatus.active, index=True
    )

    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    match: Mapped["Match"] = relationship()  # noqa: F821
    project: Mapped["Project"] = relationship()  # noqa: F821
    developer: Mapped["DeveloperProfile"] = relationship()  # noqa: F821
