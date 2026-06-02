"""Matching engine orchestration.

Given a project, score every (eligible) developer in the pool and produce a
ranked list of matches. Keeps DB access in one place; the scoring math lives in
`scoring.py` and stays pure/testable.
"""
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.matching.scoring import (
    DevContext,
    DevSkill,
    ReqSkill,
    ScoreBreakdown,
    score_developer,
)
from app.models.developer import DeveloperProfile
from app.models.project import Project


@dataclass
class RankedMatch:
    developer_id: int
    breakdown: ScoreBreakdown


def _project_reqs(project: Project) -> list[ReqSkill]:
    return [
        ReqSkill(
            skill_id=r.skill_id,
            min_proficiency=r.min_proficiency,
            weight=r.weight,
            is_mandatory=r.is_mandatory,
        )
        for r in project.skill_requirements
    ]


def _dev_context(dev: DeveloperProfile) -> DevContext:
    return DevContext(
        years_experience=dev.years_experience,
        availability=dev.availability,
        active_engagements=dev.active_engagements,
        max_concurrent_projects=dev.max_concurrent_projects,
        rating_avg=dev.rating_avg,
        rating_count=dev.rating_count,
        completed_projects=dev.completed_projects,
        skills=[
            DevSkill(skill_id=s.skill_id, proficiency=s.proficiency, years=s.years)
            for s in dev.skills
        ],
    )


def rank_developers(
    db: Session,
    project: Project,
    *,
    limit: int = 20,
    include_ineligible: bool = False,
    min_score: float = 0.0,
) -> list[RankedMatch]:
    """Score the whole developer pool against a project and return the top N."""
    reqs = _project_reqs(project)
    target = project.target_experience

    developers = db.execute(
        select(DeveloperProfile).options(selectinload(DeveloperProfile.skills))
    ).scalars().all()

    ranked: list[RankedMatch] = []
    for dev in developers:
        breakdown = score_developer(_dev_context(dev), reqs, target)
        if not breakdown.eligible and not include_ineligible:
            continue
        if breakdown.score < min_score:
            continue
        ranked.append(RankedMatch(developer_id=dev.id, breakdown=breakdown))

    ranked.sort(key=lambda r: r.breakdown.score, reverse=True)
    return ranked[:limit]
