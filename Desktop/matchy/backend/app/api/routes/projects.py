from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentUser, DbDep, require_founder
from app.api.serializers import project_out
from app.models.project import Project, ProjectStatus
from app.models.skill import ProjectSkillRequirement
from app.models.user import User, UserRole
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.schemas.skill import ProjectSkillIn
from app.services.projects import recompute_complexity
from app.services.skills import get_or_create_skill
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _apply_skills(db, project: Project, skills: list[ProjectSkillIn]) -> None:
    project.skill_requirements.clear()
    db.flush()
    for s in skills:
        skill = get_or_create_skill(db, s.skill_name)
        project.skill_requirements.append(
            ProjectSkillRequirement(
                skill_id=skill.id,
                min_proficiency=s.min_proficiency,
                weight=s.weight,
                is_mandatory=s.is_mandatory,
            )
        )
    db.flush()


@router.post("", response_model=ProjectOut, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: DbDep,
    user: User = Depends(require_founder),
) -> ProjectOut:
    project = Project(
        founder_id=user.id,
        title=payload.title,
        description=payload.description,
        budget=payload.budget,
        estimated_weeks=payload.estimated_weeks,
        team_size=payload.team_size,
        status=ProjectStatus.open,
    )
    db.add(project)
    db.flush()
    _apply_skills(db, project, payload.skills)
    recompute_complexity(db, project)
    db.commit()
    db.refresh(project)
    return project_out(project)


@router.get("", response_model=list[ProjectOut])
def list_projects(
    db: DbDep,
    user: CurrentUser,
    status: ProjectStatus | None = None,
    mine: bool = Query(False, description="Founders: only my projects"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[ProjectOut]:
    stmt = select(Project).options(selectinload(Project.skill_requirements))
    if status is not None:
        stmt = stmt.where(Project.status == status)
    if mine and user.role == UserRole.founder:
        stmt = stmt.where(Project.founder_id == user.id)
    stmt = stmt.order_by(Project.created_at.desc()).offset(offset).limit(limit)
    projects = db.execute(stmt).scalars().all()
    return [project_out(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: DbDep, _: CurrentUser) -> ProjectOut:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project_out(project)


def _owned_project(db, project_id: int, user: User) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.founder_id != user.id:
        raise HTTPException(status_code=403, detail="Not your project")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: DbDep,
    user: User = Depends(require_founder),
) -> ProjectOut:
    project = _owned_project(db, project_id, user)

    if payload.title is not None:
        project.title = payload.title
    if payload.description is not None:
        project.description = payload.description
    if payload.budget is not None:
        project.budget = payload.budget
    if payload.estimated_weeks is not None:
        project.estimated_weeks = payload.estimated_weeks
    if payload.team_size is not None:
        project.team_size = payload.team_size
    if payload.skills is not None:
        _apply_skills(db, project, payload.skills)

    recompute_complexity(db, project)
    db.commit()
    db.refresh(project)
    return project_out(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: DbDep, user: User = Depends(require_founder)) -> None:
    project = _owned_project(db, project_id, user)
    db.delete(project)
    db.commit()
