from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Skill(Base):
    """Canonical skill taxonomy (e.g. 'Python', 'React', 'Kubernetes')."""

    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    category: Mapped[str] = mapped_column(String(120), default="general", index=True)
    # Intrinsic difficulty/rarity of the skill (1=common, 5=rare/expert).
    # Feeds project complexity scoring.
    difficulty: Mapped[float] = mapped_column(Float, default=2.0)


class DeveloperSkill(Base):
    """A developer's proficiency in a given skill."""

    __tablename__ = "developer_skills"
    __table_args__ = (UniqueConstraint("developer_id", "skill_id", name="uq_dev_skill"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    developer_id: Mapped[int] = mapped_column(
        ForeignKey("developer_profiles.id", ondelete="CASCADE"), index=True
    )
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), index=True)
    # Self/verified proficiency on a 1-5 scale.
    proficiency: Mapped[int] = mapped_column(Integer, default=3)
    years: Mapped[float] = mapped_column(Float, default=0.0)

    developer: Mapped["DeveloperProfile"] = relationship(back_populates="skills")  # noqa: F821
    skill: Mapped["Skill"] = relationship()


class ProjectSkillRequirement(Base):
    """A skill required by a project, with weight and minimum proficiency."""

    __tablename__ = "project_skill_requirements"
    __table_args__ = (UniqueConstraint("project_id", "skill_id", name="uq_project_skill"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), index=True
    )
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id", ondelete="CASCADE"), index=True)
    min_proficiency: Mapped[int] = mapped_column(Integer, default=3)
    # Importance weight of this skill for the project (1=nice-to-have, 5=critical).
    weight: Mapped[float] = mapped_column(Float, default=3.0)
    is_mandatory: Mapped[bool] = mapped_column(default=False)

    project: Mapped["Project"] = relationship(back_populates="skill_requirements")  # noqa: F821
    skill: Mapped["Skill"] = relationship()
