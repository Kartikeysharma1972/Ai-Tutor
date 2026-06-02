from datetime import datetime

from pydantic import BaseModel, Field

from app.models.engagement import EngagementStatus


class EngagementCreate(BaseModel):
    """Created by a founder when accepting a match into a working contract."""

    match_id: int
    agreed_amount: float = Field(ge=0.0)


class EngagementOut(BaseModel):
    id: int
    match_id: int
    project_id: int
    developer_id: int
    founder_id: int
    agreed_amount: float
    commission_rate_client: float
    commission_rate_developer: float
    commission_client: float
    commission_developer: float
    platform_revenue: float
    status: EngagementStatus
    started_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class ReviewCreate(BaseModel):
    rating: float = Field(ge=1.0, le=5.0)
    comment: str = ""


class RevenueReport(BaseModel):
    total_engagements: int
    active_engagements: int
    completed_engagements: int
    gross_contract_value: float
    total_platform_revenue: float
    realised_revenue: float  # from completed engagements only
    commission_rate_client: float
    commission_rate_developer: float
