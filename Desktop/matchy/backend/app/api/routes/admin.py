from fastapi import APIRouter, Depends

from app.api.deps import DbDep, require_admin
from app.models.developer import DeveloperProfile
from app.models.engagement import Engagement
from app.models.project import Project
from app.models.skill import Skill
from app.models.user import User
from app.schemas.engagement import RevenueReport
from app.schemas.skill import SkillCreate, SkillOut
from app.services.engagements import revenue_summary
from app.services.skills import get_or_create_skill
from sqlalchemy import func, select

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/revenue", response_model=RevenueReport)
def revenue(db: DbDep, _: User = Depends(require_admin)) -> RevenueReport:
    return RevenueReport(**revenue_summary(db))


@router.get("/stats")
def platform_stats(db: DbDep, _: User = Depends(require_admin)) -> dict:
    return {
        "developers": db.scalar(select(func.count()).select_from(DeveloperProfile)),
        "projects": db.scalar(select(func.count()).select_from(Project)),
        "engagements": db.scalar(select(func.count()).select_from(Engagement)),
        "skills": db.scalar(select(func.count()).select_from(Skill)),
    }


@router.post("/skills", response_model=SkillOut, status_code=201)
def create_skill(payload: SkillCreate, db: DbDep, _: User = Depends(require_admin)) -> Skill:
    skill = get_or_create_skill(db, payload.name, difficulty=payload.difficulty)
    skill.category = payload.category
    skill.difficulty = payload.difficulty
    db.commit()
    db.refresh(skill)
    return skill


@router.get("/skills", response_model=list[SkillOut])
def list_skills(db: DbDep, _: User = Depends(require_admin)) -> list[Skill]:
    return list(db.execute(select(Skill).order_by(Skill.name)).scalars().all())
