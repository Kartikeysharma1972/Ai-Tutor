# Matchy — Backend

A developer–founder matching marketplace. **No bidding.** Instead, projects are
scored for complexity and developers are routed to projects that *fit their
level*, with workload balancing so work spreads across the whole pool.

> Small project → junior developers surface.
> Big project → senior developers surface.
> An over-qualified senior scores **low** on a small project, so juniors win it.
> The platform takes a commission from **both** parties on each engagement.

## Why no bidding is fair

Bidding lets the most aggressive/experienced developer win everything. Matchy
replaces price competition with **fit**:

1. **Complexity engine** (`core/matching/complexity.py`) turns a project's
   budget, duration, team size and required-skill difficulty into a 0–100
   score, a tier (simple/medium/complex/expert) and a **target experience** in
   years.
2. **Scoring** (`core/matching/scoring.py`) scores each developer on five
   components:
   - `skill` — weighted coverage of required skills
   - `experience` — a **bell curve** centred on the project's target experience
     (penalises both under- and over-qualification)
   - `availability` — free to take work / not at capacity
   - `reputation` — Bayesian-smoothed rating + track record
   - `fairness` — workload balancing; idle developers score higher
3. **Engine** (`core/matching/engine.py`) ranks the pool and returns the top N.

## Tech stack

- **FastAPI** + **SQLAlchemy 2.0** (sync)
- **SQLite** in dev (zero setup), **PostgreSQL** in prod (set `DATABASE_URL`)
- **JWT** auth with roles: `developer`, `founder`, `admin`

## Run it

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env          # edit SECRET_KEY for anything real

# seed demo data + see the matching engine in action
python -m scripts.seed

# start the API
uvicorn app.main:app --reload
```

Interactive API docs: http://127.0.0.1:8000/docs

## Core flow

```
founder registers ──► posts project ──► engine generates matches
                                            │
developers register ──► fill profile ───────┘
                                            ▼
founder shortlists / invites ──► founder opens an Engagement (commission booked)
                                            ▼
work happens ──► founder marks complete ──► founder reviews developer
                                            ▼
              reputation updates, developer freed up for new matches
```

## Key endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | – | Create account (developer/founder/admin) |
| POST | `/api/auth/login` | – | Get JWT |
| PUT  | `/api/developers/me` | developer | Create/update profile + skills |
| GET  | `/api/developers` | any | Browse/filter developers |
| POST | `/api/developers/import` | admin | **Bulk import your 180 profiles** |
| POST | `/api/projects` | founder | Post a project (auto-scores complexity) |
| GET  | `/api/projects/{id}/match-preview` | founder | Dry-run the engine |
| POST | `/api/projects/{id}/matches` | founder | Generate & persist matches |
| PATCH| `/api/matches/{id}/status` | founder/dev | Shortlist / invite / decline |
| POST | `/api/engagements` | founder | Accept a match → contract + commission |
| POST | `/api/engagements/{id}/complete` | founder | Close out, free the developer |
| POST | `/api/engagements/{id}/review` | founder | Rate the developer |
| GET  | `/api/admin/revenue` | admin | Platform commission report |

## Importing the 180 profiles

`POST /api/developers/import` (admin token) accepts a JSON array. Rows without a
`password` get a generated one returned in `generated_credentials`. Example row:

```json
{
  "email": "dev@example.com",
  "full_name": "Aman Verma",
  "years_experience": 3,
  "location": "Delhi",
  "skills": [
    {"skill_name": "Python", "proficiency": 4, "years": 3},
    {"skill_name": "React", "proficiency": 3, "years": 2}
  ]
}
```

Once you share the actual format of your 180 profiles (CSV/Excel/JSON), I'll add
a converter so they map straight onto this endpoint.

## Tuning the engine

All knobs are constants at the top of the matching modules:
- `complexity.py`: `BUDGET_REF`, `WEEKS_REF`, `TEAM_REF`, `WEIGHTS`, tier cutoffs
- `scoring.py`: `COMPONENT_WEIGHTS`, `EXPERIENCE_SIGMA_BASE`
- commission rates: `.env` (`COMMISSION_RATE_CLIENT`, `COMMISSION_RATE_DEVELOPER`)
