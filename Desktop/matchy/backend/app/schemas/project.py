from datetime import datetime

from pydantic import BaseModel, Field

from app.models.project import ProjectComplexity, ProjectStatus
from app.schemas.skill import ProjectSkillIn, ProjectSkillOut


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    budget: float = Field(default=0.0, ge=0.0)
    estimated_weeks: float = Field(default=4.0, gt=0.0)
    team_size: int = Field(default=1, ge=1, le=50)
    skills: list[ProjectSkillIn] = []


class ProjectUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    budget: float | None = Field(default=None, ge=0.0)
    estimated_weeks: float | None = Field(default=None, gt=0.0)
    team_size: int | None = Field(default=None, ge=1, le=50)
    skills: list[ProjectSkillIn] | None = None


class ProjectOut(BaseModel):
    id: int
    founder_id: int
    title: str
    description: str
    budget: float
    estimated_weeks: float
    team_size: int
    complexity_score: float
    complexity_tier: ProjectComplexity
    target_experience: float
    status: ProjectStatus
    created_at: datetime
    skill_requirements: list[ProjectSkillOut]
