"""Seed the database with demo data and run the matching engine once.

Usage (from backend/):  python -m scripts.seed

Creates an admin, a founder, a handful of developers spanning experience
levels, a couple of projects of different sizes, then generates matches so you
can see small projects route to juniors and big projects to seniors.
"""
from app.database import Base, SessionLocal, engine
from app.core.security import hash_password
from app.models.developer import AvailabilityStatus, DeveloperProfile
from app.models.project import Project, ProjectStatus
from app.models.skill import DeveloperSkill, ProjectSkillRequirement
from app.models.user import User, UserRole
from app.services.projects import recompute_complexity
from app.services.matches import generate_matches
from app.services.skills import get_or_create_skill


def reset() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


DEVELOPERS = [
    # (name, years, [(skill, proficiency)])
    ("Junior Aman", 1.0, [("Python", 3), ("HTML", 4), ("CSS", 3)]),
    ("Junior Riya", 1.5, [("JavaScript", 3), ("React", 3)]),
    ("Mid Sahil", 4.0, [("Python", 4), ("Django", 4), ("PostgreSQL", 3)]),
    ("Mid Neha", 3.5, [("React", 4), ("TypeScript", 4), ("Node.js", 3)]),
    ("Senior Vikram", 7.0, [("Python", 5), ("Kubernetes", 4), ("AWS", 4), ("PostgreSQL", 4)]),
    ("Senior Anjali", 8.0, [("Go", 5), ("Kubernetes", 5), ("AWS", 5), ("System Design", 5)]),
    ("Expert Rohan", 11.0, [("Rust", 5), ("Distributed Systems", 5), ("Kubernetes", 5)]),
]


def make_developer(db, idx, name, years, skills) -> None:
    user = User(
        email=f"dev{idx}@matchy.test",
        full_name=name,
        hashed_password=hash_password("password123"),
        role=UserRole.developer,
    )
    db.add(user)
    db.flush()
    profile = DeveloperProfile(
        user_id=user.id,
        headline=f"{name} - {years}y exp",
        years_experience=years,
        availability=AvailabilityStatus.available,
        max_concurrent_projects=2,
    )
    db.add(profile)
    db.flush()
    for skill_name, prof in skills:
        skill = get_or_create_skill(db, skill_name)
        profile.skills.append(DeveloperSkill(skill_id=skill.id, proficiency=prof, years=years))
    db.flush()


def make_project(db, founder_id, title, budget, weeks, team, skills) -> Project:
    project = Project(
        founder_id=founder_id,
        title=title,
        budget=budget,
        estimated_weeks=weeks,
        team_size=team,
        status=ProjectStatus.open,
    )
    db.add(project)
    db.flush()
    for skill_name, min_prof, weight, mandatory in skills:
        skill = get_or_create_skill(db, skill_name)
        project.skill_requirements.append(
            ProjectSkillRequirement(
                skill_id=skill.id, min_proficiency=min_prof, weight=weight, is_mandatory=mandatory
            )
        )
    db.flush()
    recompute_complexity(db, project)
    db.flush()
    return project


def main() -> None:
    reset()
    db = SessionLocal()
    try:
        db.add(
            User(
                email="admin@matchy.test",
                full_name="Platform Admin",
                hashed_password=hash_password("admin12345"),
                role=UserRole.admin,
            )
        )
        founder = User(
            email="founder@matchy.test",
            full_name="Demo Founder",
            hashed_password=hash_password("founder123"),
            role=UserRole.founder,
        )
        db.add(founder)
        db.flush()

        for i, (name, years, skills) in enumerate(DEVELOPERS, start=1):
            make_developer(db, i, name, years, skills)

        small = make_project(
            db, founder.id, "Simple landing page", budget=15_000, weeks=2, team=1,
            skills=[("HTML", 3, 4, True), ("CSS", 3, 3, False), ("JavaScript", 2, 3, False)],
        )
        big = make_project(
            db, founder.id, "Scalable distributed payments platform",
            budget=600_000, weeks=24, team=5,
            skills=[("Kubernetes", 4, 5, True), ("AWS", 4, 4, True), ("Distributed Systems", 4, 5, False)],
        )
        db.commit()

        for project in (small, big):
            matches = generate_matches(db, project, limit=5)
            db.commit()
            print(f"\n=== {project.title} ===")
            print(
                f"complexity={project.complexity_score} tier={project.complexity_tier.value} "
                f"target_exp={project.target_experience}y"
            )
            for m in matches:
                dev = db.get(DeveloperProfile, m.developer_id)
                name = dev.user.full_name if dev and dev.user else "?"
                print(f"  {m.score:6.2f}  {name:18s}  (exp={dev.years_experience}y)  "
                      f"[skill={m.skill_score} exp_fit={m.experience_score} fair={m.fairness_score}]")

        print("\nSeed complete. Logins:")
        print("  admin@matchy.test / admin12345")
        print("  founder@matchy.test / founder123")
        print("  dev1..7@matchy.test / password123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
