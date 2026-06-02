from pydantic import BaseModel, Field

from app.models.developer import AvailabilityStatus
from app.schemas.skill import DeveloperSkillIn, DeveloperSkillOut


class DeveloperProfileUpsert(BaseModel):
    headline: str = Field(default="", max_length=255)
    bio: str = ""
    location: str = Field(default="", max_length=120)
    years_experience: float = Field(default=0.0, ge=0.0, le=60.0)
    hourly_rate: float = Field(default=0.0, ge=0.0)
    github_url: str = Field(default="", max_length=255)
    portfolio_url: str = Field(default="", max_length=255)
    availability: AvailabilityStatus = AvailabilityStatus.available
    max_concurrent_projects: int = Field(default=2, ge=0, le=20)
    skills: list[DeveloperSkillIn] = []


class DeveloperOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    headline: str
    bio: str
    location: str
    years_experience: float
    hourly_rate: float
    github_url: str
    portfolio_url: str
    availability: AvailabilityStatus
    max_concurrent_projects: int
    active_engagements: int
    rating_avg: float
    rating_count: int
    completed_projects: int
    skills: list[DeveloperSkillOut]


class DeveloperImportRow(BaseModel):
    """One row of the bulk-import payload for your 180 profiles.

    `password` is optional; if omitted a random one is generated and returned
    so you can hand out credentials.
    """

    email: str
    full_name: str
    password: str | None = None
    headline: str = ""
    bio: str = ""
    location: str = ""
    years_experience: float = 0.0
    hourly_rate: float = 0.0
    github_url: str = ""
    portfolio_url: str = ""
    availability: AvailabilityStatus = AvailabilityStatus.available
    max_concurrent_projects: int = 2
    # "Python:4:3, React:3:2" -> name:proficiency:years  (proficiency/years optional)
    skills: list[DeveloperSkillIn] = []


class DeveloperImportResult(BaseModel):
    created: int
    skipped: int
    errors: list[str]
    generated_credentials: list[dict]
