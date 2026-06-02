from sqlalchemy.orm import Session

from app.core.matching.complexity import ComplexityInputs, score_complexity
from app.models.project import Project


def recompute_complexity(db: Session, project: Project) -> None:
    """Recompute and store a project's complexity, tier and target experience.

    Pulls skill difficulty from the linked Skill rows so the score reflects how
    hard the required stack actually is, not just how many skills were listed.
    """
    skills: list[tuple[float, float, int]] = []
    for req in project.skill_requirements:
        difficulty = req.skill.difficulty if req.skill else 2.0
        skills.append((req.weight, difficulty, req.min_proficiency))

    score, tier, target = score_complexity(
        ComplexityInputs(
            budget=project.budget,
            estimated_weeks=project.estimated_weeks,
            team_size=project.team_size,
            skills=skills,
        )
    )
    project.complexity_score = score
    project.complexity_tier = tier
    project.target_experience = target
