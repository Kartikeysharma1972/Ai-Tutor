from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import CurrentUser, DbDep, require_admin, require_developer
from app.api.serializers import developer_out
from app.models.developer import AvailabilityStatus, DeveloperProfile
from app.models.user import User
from app.schemas.developer import (
    DeveloperImportResult,
    DeveloperImportRow,
    DeveloperOut,
    DeveloperProfileUpsert,
)
from app.services.developers import import_developers, upsert_profile
from sqlalchemy import select
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/api/developers", tags=["developers"])


@router.put("/me", response_model=DeveloperOut)
def upsert_my_profile(
    payload: DeveloperProfileUpsert,
    db: DbDep,
    user: User = Depends(require_developer),
) -> DeveloperOut:
    profile = upsert_profile(db, user, payload)
    db.commit()
    db.refresh(profile)
    return developer_out(profile)


@router.get("/me", response_model=DeveloperOut)
def get_my_profile(db: DbDep, user: User = Depends(require_developer)) -> DeveloperOut:
    if user.developer_profile is None:
        raise HTTPException(status_code=404, detail="Profile not created yet")
    return developer_out(user.developer_profile)


@router.get("", response_model=list[DeveloperOut])
def list_developers(
    db: DbDep,
    _: CurrentUser,
    availability: AvailabilityStatus | None = None,
    min_experience: float = Query(0.0, ge=0.0),
    skill: str | None = Query(None, description="Filter by skill name (contains)"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[DeveloperOut]:
    stmt = (
        select(DeveloperProfile)
        .options(selectinload(DeveloperProfile.skills), selectinload(DeveloperProfile.user))
        .where(DeveloperProfile.years_experience >= min_experience)
    )
    if availability is not None:
        stmt = stmt.where(DeveloperProfile.availability == availability)

    profiles = db.execute(stmt.offset(offset).limit(limit)).scalars().all()

    if skill:
        needle = skill.strip().lower()
        profiles = [
            p for p in profiles if any(needle in (s.skill.name.lower() if s.skill else "") for s in p.skills)
        ]
    return [developer_out(p) for p in profiles]


@router.get("/{developer_id}", response_model=DeveloperOut)
def get_developer(developer_id: int, db: DbDep, _: CurrentUser) -> DeveloperOut:
    profile = db.get(DeveloperProfile, developer_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Developer not found")
    return developer_out(profile)


@router.post("/import", response_model=DeveloperImportResult)
def bulk_import(
    rows: list[DeveloperImportRow],
    db: DbDep,
    _: User = Depends(require_admin),
) -> DeveloperImportResult:
    """Admin-only bulk import for the initial 180 developer profiles."""
    result = import_developers(db, rows)
    return DeveloperImportResult(**result)
