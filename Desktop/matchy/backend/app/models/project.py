import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProjectStatus(str, enum.Enum):
    draft = "draft"
    open = "open"  # accepting matches
    matching = "matching"  # matches generated, founder reviewing
    in_progress = "in_progress"  # an engagement is active
    completed = "completed"
    cancelled = "cancelled"


class ProjectComplexity(str, enum.Enum):
    simple = "simple"
    medium = "medium"
    complex = "complex"
    expert = "expert"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    founder_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")

    # Founder-provided scope inputs (feed the complexity engine).
    budget: Mapped[float] = mapped_column(Float, default=0.0)
    estimated_weeks: Mapped[float] = mapped_column(Float, default=4.0)
    team_size: Mapped[int] = mapped_column(Integer, default=1)

    # Computed by the complexity engine on creation/update.
    complexity_score: Mapped[float] = mapped_column(Float, default=0.0)
    complexity_tier: Mapped[ProjectComplexity] = mapped_column(
        Enum(ProjectComplexity), default=ProjectComplexity.medium, index=True
    )
    # Target developer experience (years) the matcher centres on.
    target_experience: Mapped[float] = mapped_column(Float, default=3.0)

    status: Mapped[ProjectStatus] = mapped_column(
        Enum(ProjectStatus), default=ProjectStatus.draft, index=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    founder: Mapped["User"] = relationship(back_populates="projects")  # noqa: F821
    skill_requirements: Mapped[list["ProjectSkillRequirement"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
    matches: Mapped[list["Match"]] = relationship(  # noqa: F821
        back_populates="project", cascade="all, delete-orphan"
    )
