from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.skill import Skill


def get_or_create_skill(db: Session, name: str, *, difficulty: float = 2.0) -> Skill:
    """Look up a skill case-insensitively, creating it if absent.

    Skill names are normalised (trimmed, collapsed case) so 'python' and
    'Python ' resolve to the same canonical skill.
    """
    normalized = name.strip()
    existing = db.execute(
        select(Skill).where(Skill.name.ilike(normalized))
    ).scalar_one_or_none()
    if existing:
        return existing
    skill = Skill(name=normalized, difficulty=difficulty)
    db.add(skill)
    db.flush()  # assign id without committing the outer transaction
    return skill
