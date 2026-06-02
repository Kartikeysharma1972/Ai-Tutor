"""Helpers to convert ORM objects into response schemas.

Kept separate so routes stay thin and the skill-name joining logic lives in one
place.
"""
from app.models.developer import DeveloperProfile
from app.models.match import Match
from app.models.project import Project
from app.schemas.developer import DeveloperOut
from app.schemas.match import MatchDeveloperSummary, MatchOut
from app.schemas.project import ProjectOut
from app.schemas.skill import DeveloperSkillOut, ProjectSkillOut


def developer_skills_out(profile: DeveloperProfile) -> list[DeveloperSkillOut]:
    return [
        DeveloperSkillOut(
            skill_id=s.skill_id,
            skill_name=s.skill.name if s.skill else "",
            proficiency=s.proficiency,
            years=s.years,
        )
        for s in profile.skills
    ]


def developer_out(profile: DeveloperProfile) -> DeveloperOut:
    return DeveloperOut(
        id=profile.id,
        user_id=profile.user_id,
        full_name=profile.user.full_name if profile.user else "",
        headline=profile.headline,
        bio=profile.bio,
        location=profile.location,
        years_experience=profile.years_experience,
        hourly_rate=profile.hourly_rate,
        github_url=profile.github_url,
        portfolio_url=profile.portfolio_url,
        availability=profile.availability,
        max_concurrent_projects=profile.max_concurrent_projects,
        active_engagements=profile.active_engagements,
        rating_avg=profile.rating_avg,
        rating_count=profile.rating_count,
        completed_projects=profile.completed_projects,
        skills=developer_skills_out(profile),
    )


def project_out(project: Project) -> ProjectOut:
    return ProjectOut(
        id=project.id,
        founder_id=project.founder_id,
        title=project.title,
        description=project.description,
        budget=project.budget,
        estimated_weeks=project.estimated_weeks,
        team_size=project.team_size,
        complexity_score=project.complexity_score,
        complexity_tier=project.complexity_tier,
        target_experience=project.target_experience,
        status=project.status,
        created_at=project.created_at,
        skill_requirements=[
            ProjectSkillOut(
                skill_id=r.skill_id,
                skill_name=r.skill.name if r.skill else "",
                min_proficiency=r.min_proficiency,
                weight=r.weight,
                is_mandatory=r.is_mandatory,
            )
            for r in project.skill_requirements
        ],
    )


def match_developer_summary(profile: DeveloperProfile) -> MatchDeveloperSummary:
    return MatchDeveloperSummary(
        developer_id=profile.id,
        full_name=profile.user.full_name if profile.user else "",
        headline=profile.headline,
        years_experience=profile.years_experience,
        rating_avg=profile.rating_avg,
        rating_count=profile.rating_count,
        availability=profile.availability.value,
        skills=developer_skills_out(profile),
    )


def match_out(match: Match) -> MatchOut:
    return MatchOut(
        id=match.id,
        project_id=match.project_id,
        developer_id=match.developer_id,
        score=match.score,
        skill_score=match.skill_score,
        experience_score=match.experience_score,
        availability_score=match.availability_score,
        reputation_score=match.reputation_score,
        fairness_score=match.fairness_score,
        explanation=match.explanation,
        status=match.status,
        created_at=match.created_at,
        developer=match_developer_summary(match.developer),
    )
