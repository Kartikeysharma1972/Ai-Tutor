from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine

# Import models so their tables register on Base.metadata before create_all.
import app.models  # noqa: F401
from app.api.routes import admin, auth, developers, engagements, matches, projects


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dev convenience: auto-create tables. In production, use Alembic migrations.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Skill-to-complexity developer matching marketplace (no bidding).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(developers.router)
app.include_router(projects.router)
app.include_router(matches.router)
app.include_router(engagements.router)
app.include_router(admin.router)


@app.get("/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "app": settings.app_name, "env": settings.env}
