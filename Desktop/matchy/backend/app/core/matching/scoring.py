"""Developer<->project scoring.

Produces a 0-100 match score from five components:

  skill        - how well the developer's skills cover the project's needs
  experience   - bell-curve alignment to the project's target experience
                 (penalises BOTH under- and over-qualification -> fairness)
  availability - is the developer free to take work
  reputation   - past ratings & completed projects
  fairness     - workload balancing, boosts developers with little current work

The experience + fairness components are what replace bidding: instead of the
cheapest/most-aggressive bidder winning, work is steered to the developer whose
level *fits* the project and who needs the work.
"""
import math
from dataclasses import dataclass

from app.models.developer import AvailabilityStatus


# Final blend of the five components. Must sum to 1.0.
COMPONENT_WEIGHTS = {
    "skill": 0.40,
    "experience": 0.25,
    "availability": 0.10,
    "reputation": 0.15,
    "fairness": 0.10,
}

# Width (in years) of the experience bell curve. Larger => more tolerant of
# mismatch. Scales mildly with the target so expert projects aren't impossibly
# narrow.
EXPERIENCE_SIGMA_BASE = 2.5


@dataclass
class DevSkill:
    skill_id: int
    proficiency: int  # 1-5
    years: float


@dataclass
class ReqSkill:
    skill_id: int
    min_proficiency: int  # 1-5
    weight: float  # importance 1-5
    is_mandatory: bool


@dataclass
class DevContext:
    years_experience: float
    availability: AvailabilityStatus
    active_engagements: int
    max_concurrent_projects: int
    rating_avg: float  # 0-5
    rating_count: int
    completed_projects: int
    skills: list[DevSkill]


@dataclass
class ScoreBreakdown:
    score: float
    skill: float
    experience: float
    availability: float
    reputation: float
    fairness: float
    explanation: str
    eligible: bool  # False if a mandatory requirement is unmet


def _skill_score(dev_skills: list[DevSkill], reqs: list[ReqSkill]) -> tuple[float, bool, int, int]:
    """Weighted coverage of required skills. Returns (0-100, all_mandatory_met,
    matched_count, total_reqs)."""
    if not reqs:
        return 100.0, True, 0, 0

    total_weight = sum(r.weight for r in reqs) or 1.0
    dev_by_id = {s.skill_id: s for s in dev_skills}

    earned = 0.0
    mandatory_met = True
    matched = 0
    for r in reqs:
        ds = dev_by_id.get(r.skill_id)
        if ds is None:
            if r.is_mandatory:
                mandatory_met = False
            continue
        matched += 1
        # Proficiency ratio vs requirement, capped at 1.0 (over-skilling a
        # single requirement gives no extra credit).
        ratio = min(1.0, ds.proficiency / max(1, r.min_proficiency))
        if r.is_mandatory and ds.proficiency < r.min_proficiency:
            mandatory_met = False
        earned += r.weight * ratio

    return round((earned / total_weight) * 100, 2), mandatory_met, matched, len(reqs)


def _experience_score(dev_years: float, target_years: float) -> float:
    """Gaussian alignment to the target experience.

    Peaks (100) when the developer's experience equals the project target and
    falls off symmetrically. This is the core anti-bidding mechanic: an
    over-qualified senior scores LOW on a junior project, so juniors surface.
    """
    sigma = EXPERIENCE_SIGMA_BASE + 0.15 * target_years
    diff = dev_years - target_years
    return round(100.0 * math.exp(-(diff * diff) / (2 * sigma * sigma)), 2)


def _availability_score(ctx: DevContext) -> float:
    base = {
        AvailabilityStatus.available: 100.0,
        AvailabilityStatus.partially_available: 70.0,
        AvailabilityStatus.busy: 30.0,
        AvailabilityStatus.unavailable: 0.0,
    }[ctx.availability]
    # If already at capacity, hard-drop availability.
    if ctx.max_concurrent_projects > 0 and ctx.active_engagements >= ctx.max_concurrent_projects:
        return 0.0
    return base


def _reputation_score(ctx: DevContext) -> float:
    """Bayesian-smoothed rating so a single 5-star doesn't beat a proven 4.7.

    New developers (no ratings) get a neutral prior of 70 rather than 0, so the
    platform can still bootstrap them onto projects.
    """
    prior_rating = 3.5  # neutral prior on a 5-scale
    prior_weight = 5.0
    if ctx.rating_count == 0:
        smoothed = prior_rating
    else:
        smoothed = (prior_rating * prior_weight + ctx.rating_avg * ctx.rating_count) / (
            prior_weight + ctx.rating_count
        )
    rating_component = (smoothed / 5.0) * 100.0
    # Small track-record bonus, saturating at ~10 completed projects.
    track = min(1.0, ctx.completed_projects / 10.0) * 10.0
    return round(min(100.0, rating_component * 0.9 + track), 2)


def _fairness_score(ctx: DevContext) -> float:
    """Workload-balancing boost: developers with spare capacity score higher.

    Ensures work spreads across the pool instead of piling onto a few stars -
    'sabko kaam mile'.
    """
    cap = max(1, ctx.max_concurrent_projects)
    load = min(1.0, ctx.active_engagements / cap)
    return round((1.0 - load) * 100.0, 2)


def score_developer(ctx: DevContext, reqs: list[ReqSkill], target_years: float) -> ScoreBreakdown:
    skill, mandatory_met, matched, total_reqs = _skill_score(ctx.skills, reqs)
    experience = _experience_score(ctx.years_experience, target_years)
    availability = _availability_score(ctx)
    reputation = _reputation_score(ctx)
    fairness = _fairness_score(ctx)

    eligible = mandatory_met and availability > 0.0

    total = (
        COMPONENT_WEIGHTS["skill"] * skill
        + COMPONENT_WEIGHTS["experience"] * experience
        + COMPONENT_WEIGHTS["availability"] * availability
        + COMPONENT_WEIGHTS["reputation"] * reputation
        + COMPONENT_WEIGHTS["fairness"] * fairness
    )
    score = round(total, 2)

    explanation = (
        f"Skills {matched}/{total_reqs} covered ({skill:.0f}/100); "
        f"experience fit {experience:.0f}/100 vs target {target_years:.1f}y "
        f"(has {ctx.years_experience:.1f}y); "
        f"availability {availability:.0f}; reputation {reputation:.0f}; "
        f"workload-fairness {fairness:.0f}."
    )
    if not eligible:
        reasons = []
        if not mandatory_met:
            reasons.append("missing a mandatory skill")
        if availability <= 0.0:
            reasons.append("at capacity / unavailable")
        explanation = "INELIGIBLE (" + ", ".join(reasons) + "). " + explanation

    return ScoreBreakdown(
        score=score,
        skill=skill,
        experience=experience,
        availability=availability,
        reputation=reputation,
        fairness=fairness,
        explanation=explanation,
        eligible=eligible,
    )
