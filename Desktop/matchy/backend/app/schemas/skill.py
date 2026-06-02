from pydantic import BaseModel, Field


class SkillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    category: str = "general"
    difficulty: float = Field(default=2.0, ge=1.0, le=5.0)


class SkillOut(BaseModel):
    id: int
    name: str
    category: str
    difficulty: float

    model_config = {"from_attributes": True}


class DeveloperSkillIn(BaseModel):
    skill_name: str = Field(min_length=1, max_length=120)
    proficiency: int = Field(default=3, ge=1, le=5)
    years: float = Field(default=0.0, ge=0.0)


class DeveloperSkillOut(BaseModel):
    skill_id: int
    skill_name: str
    proficiency: int
    years: float


class ProjectSkillIn(BaseModel):
    skill_name: str = Field(min_length=1, max_length=120)
    min_proficiency: int = Field(default=3, ge=1, le=5)
    weight: float = Field(default=3.0, ge=1.0, le=5.0)
    is_mandatory: bool = False


class ProjectSkillOut(BaseModel):
    skill_id: int
    skill_name: str
    min_proficiency: int
    weight: float
    is_mandatory: bool
