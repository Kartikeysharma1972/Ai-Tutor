import enum

from sqlalchemy import Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AvailabilityStatus(str, enum.Enum):
    available = "available"
    partially_available = "partially_available"
    busy = "busy"
    unavailable = "unavailable"


class DeveloperProfile(Base):
    __tablename__ = "developer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True
    )

    headline: Mapped[str] = mapped_column(String(255), default="")
    bio: Mapped[str] = mapped_column(Text, default="")
    location: Mapped[str] = mapped_column(String(120), default="")

    years_experience: Mapped[float] = mapped_column(Float, default=0.0)
    hourly_rate: Mapped[float] = mapped_column(Float, default=0.0)

    # Portfolio / proof links.
    github_url: Mapped[str] = mapped_column(String(255), default="")
    portfolio_url: Mapped[str] = mapped_column(String(255), default="")

    availability: Mapped[AvailabilityStatus] = mapped_column(
        Enum(AvailabilityStatus), default=AvailabilityStatus.available, index=True
    )
    # How many concurrent projects the developer can take.
    max_concurrent_projects: Mapped[int] = mapped_column(Integer, default=2)
    # Live count of active engagements (kept in sync by the engagement service).
    active_engagements: Mapped[int] = mapped_column(Integer, default=0)

    # Reputation, updated as reviews come in.
    rating_avg: Mapped[float] = mapped_column(Float, default=0.0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    completed_projects: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship(back_populates="developer_profile")  # noqa: F821
    skills: Mapped[list["DeveloperSkill"]] = relationship(  # noqa: F821
        back_populates="developer", cascade="all, delete-orphan"
    )
