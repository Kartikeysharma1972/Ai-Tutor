from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Review(Base):
    """A founder's review of a developer after an engagement completes.

    Feeds the developer's reputation score used by the matching engine.
    """

    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    engagement_id: Mapped[int] = mapped_column(
        ForeignKey("engagements.id", ondelete="CASCADE"), index=True
    )
    developer_id: Mapped[int] = mapped_column(
        ForeignKey("developer_profiles.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)

    rating: Mapped[float] = mapped_column(Float, default=5.0)  # 1-5
    comment: Mapped[str] = mapped_column(Text, default="")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    developer: Mapped["DeveloperProfile"] = relationship()  # noqa: F821
