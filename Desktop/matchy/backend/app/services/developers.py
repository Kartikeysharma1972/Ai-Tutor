import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.developer import DeveloperProfile
from app.models.skill import DeveloperSkill
from app.models.user import User, UserRole
from app.schemas.developer import DeveloperImportRow, DeveloperProfileUpsert
from app.schemas.skill import DeveloperSkillIn
from app.services.skills import get_or_create_skill


def _sync_skills(db: Session, profile: DeveloperProfile, skills: list[DeveloperSkillIn]) -> None:
    """Replace a developer's skill set with the provided list."""
    profile.skills.clear()
    db.flush()
    for s in skills:
        skill = get_or_create_skill(db, s.skill_name)
        profile.skills.append(
            DeveloperSkill(skill_id=skill.id, proficiency=s.proficiency, years=s.years)
        )
    db.flush()


def upsert_profile(db: Session, user: User, data: DeveloperProfileUpsert) -> DeveloperProfile:
    profile = user.developer_profile
    if profile is None:
        profile = DeveloperProfile(user_id=user.id)
        db.add(profile)
        db.flush()

    profile.headline = data.headline
    profile.bio = data.bio
    profile.location = data.location
    profile.years_experience = data.years_experience
    profile.hourly_rate = data.hourly_rate
    profile.github_url = data.github_url
    profile.portfolio_url = data.portfolio_url
    profile.availability = data.availability
    profile.max_concurrent_projects = data.max_concurrent_projects

    _sync_skills(db, profile, data.skills)
    db.flush()
    return profile


def import_developers(db: Session, rows: list[DeveloperImportRow]) -> dict:
    """Bulk-create developer accounts + profiles from imported rows.

    Existing emails are skipped (idempotent re-imports). When a row has no
    password, a random one is generated and returned so credentials can be
    handed out.
    """
    created = 0
    skipped = 0
    errors: list[str] = []
    generated: list[dict] = []

    for row in rows:
        email = row.email.strip().lower()
        try:
            exists = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
            if exists:
                skipped += 1
                continue

            raw_password = row.password or secrets.token_urlsafe(9)
            user = User(
                email=email,
                full_name=row.full_name.strip(),
                hashed_password=hash_password(raw_password),
                role=UserRole.developer,
            )
            db.add(user)
            db.flush()

            profile = DeveloperProfile(
                user_id=user.id,
                headline=row.headline,
                bio=row.bio,
                location=row.location,
                years_experience=row.years_experience,
                hourly_rate=row.hourly_rate,
                github_url=row.github_url,
                portfolio_url=row.portfolio_url,
                availability=row.availability,
                max_concurrent_projects=row.max_concurrent_projects,
            )
            db.add(profile)
            db.flush()
            _sync_skills(db, profile, row.skills)

            created += 1
            if not row.password:
                generated.append({"email": email, "password": raw_password})
        except Exception as exc:  # keep importing the rest of the batch
            db.rollback()
            errors.append(f"{email}: {exc}")

    db.commit()
    return {
        "created": created,
        "skipped": skipped,
        "errors": errors,
        "generated_credentials": generated,
    }
