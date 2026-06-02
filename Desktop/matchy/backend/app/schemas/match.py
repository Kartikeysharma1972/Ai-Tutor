from datetime import datetime

from pydantic import BaseModel

from app.models.match import MatchStatus
from app.schemas.skill import DeveloperSkillOut


class MatchDeveloperSummary(BaseModel):
    developer_id: int
    full_name: str
    headline: str
    years_experience: float
    rating_avg: float
    rating_count: int
    availability: str
    skills: list[DeveloperSkillOut]


class MatchOut(BaseModel):
    id: int
    project_id: int
    developer_id: int
    score: float
    skill_score: float
    experience_score: float
    availability_score: float
    reputation_score: float
    fairness_score: float
    explanation: str
    status: MatchStatus
    created_at: datetime
    developer: MatchDeveloperSummary


class MatchPreview(BaseModel):
    """A scored candidate not yet persisted (dry-run of the engine)."""

    developer_id: int
    full_name: str
    headline: str
    years_experience: float
    score: float
    skill_score: float
    experience_score: float
    availability_score: float
    reputation_score: float
    fairness_score: float
    explanation: str


class MatchStatusUpdate(BaseModel):
    status: MatchStatus
