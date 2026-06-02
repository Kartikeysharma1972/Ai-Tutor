"""Project complexity engine.

Turns a founder's scope inputs (budget, duration, team size, required skills)
into a 0-100 complexity score, a tier, and a *target developer experience*
(in years). The matcher then centres developer selection on that target, which
is what makes small projects route to juniors and big projects to seniors.
"""
from dataclasses import dataclass

from app.models.project import ProjectComplexity


@dataclass
class ComplexityInputs:
    budget: float
    estimated_weeks: float
    team_size: int
    # (weight, difficulty, min_proficiency) for each required skill.
    skills: list[tuple[float, float, int]]


# Reference points used to normalise raw inputs into 0-1 signals. Tune these
# to your market; they're deliberately conservative.
BUDGET_REF = 500_000.0  # budget that alone implies an expert-tier project
WEEKS_REF = 26.0  # ~6 months
TEAM_REF = 6

# Relative importance of each signal in the final complexity score.
WEIGHTS = {
    "budget": 0.30,
    "duration": 0.20,
    "team": 0.15,
    "skills": 0.35,
}


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, x))


def _skill_signal(skills: list[tuple[float, float, int]]) -> float:
    """0-1 signal from required skills.

    Combines breadth (how many skills), depth (required proficiency) and
    rarity (intrinsic difficulty), weighted by each skill's importance.
    """
    if not skills:
        return 0.0

    total_weight = sum(w for w, _, _ in skills) or 1.0
    # Depth+rarity per skill, on a 0-1 scale (difficulty 1-5, proficiency 1-5).
    weighted_depth = sum(
        w * ((difficulty / 5.0) * 0.5 + (min_prof / 5.0) * 0.5)
        for w, difficulty, min_prof in skills
    ) / total_weight

    # Breadth: more distinct skills => more complex, saturating around 8.
    breadth = _clamp01(len(skills) / 8.0)

    return _clamp01(0.65 * weighted_depth + 0.35 * breadth)


def score_complexity(inp: ComplexityInputs) -> tuple[float, ProjectComplexity, float]:
    """Return (complexity_score 0-100, tier, target_experience_years)."""
    budget_sig = _clamp01(inp.budget / BUDGET_REF)
    duration_sig = _clamp01(inp.estimated_weeks / WEEKS_REF)
    team_sig = _clamp01((inp.team_size - 1) / (TEAM_REF - 1)) if TEAM_REF > 1 else 0.0
    skill_sig = _skill_signal(inp.skills)

    raw = (
        WEIGHTS["budget"] * budget_sig
        + WEIGHTS["duration"] * duration_sig
        + WEIGHTS["team"] * team_sig
        + WEIGHTS["skills"] * skill_sig
    )
    score = round(_clamp01(raw) * 100, 2)

    tier = tier_for_score(score)
    target_experience = target_experience_for_score(score)
    return score, tier, target_experience


def tier_for_score(score: float) -> ProjectComplexity:
    if score < 30:
        return ProjectComplexity.simple
    if score < 55:
        return ProjectComplexity.medium
    if score < 80:
        return ProjectComplexity.complex
    return ProjectComplexity.expert


def target_experience_for_score(score: float) -> float:
    """Map complexity (0-100) to the ideal developer experience in years.

    A smooth ramp from ~1yr (trivial) to ~10yr (expert). The matcher uses this
    as the centre of a bell curve, so developers far from it - in *either*
    direction - score lower. That's the anti-bidding fairness mechanic:
    a 10-year senior is a poor fit for a 1-year-target project.
    """
    return round(1.0 + (score / 100.0) * 9.0, 2)
