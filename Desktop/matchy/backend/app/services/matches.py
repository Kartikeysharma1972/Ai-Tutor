from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.matching.engine import rank_developers
from app.models.match import Match, MatchStatus
from app.models.project import Project, ProjectStatus


def generate_matches(db: Session, project: Project, *, limit: int = 20) -> list[Match]:
    """Run the engine and persist/refresh Match rows for a project.

    Existing matches that the founder hasn't acted on (still 'suggested') are
    refreshed in place; matches the founder has touched are left untouched so we
    don't clobber their shortlist on a re-run.
    """
    ranked = rank_developers(db, project, limit=limit)

    existing = {
        m.developer_id: m
        for m in db.execute(
            select(Match).where(Match.project_id == project.id)
        ).scalars().all()
    }

    results: list[Match] = []
    for rm in ranked:
        b = rm.breakdown
        match = existing.get(rm.developer_id)
        if match is None:
            match = Match(project_id=project.id, developer_id=rm.developer_id)
            db.add(match)
        elif match.status != MatchStatus.suggested:
            results.append(match)
            continue  # don't overwrite a founder's decision

        match.score = b.score
        match.skill_score = b.skill
        match.experience_score = b.experience
        match.availability_score = b.availability
        match.reputation_score = b.reputation
        match.fairness_score = b.fairness
        match.explanation = b.explanation
        results.append(match)

    if project.status in (ProjectStatus.draft, ProjectStatus.open):
        project.status = ProjectStatus.matching

    db.flush()
    results.sort(key=lambda m: m.score, reverse=True)
    return results
