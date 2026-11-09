import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.core.config import settings
from app.core.rate_limit import limiter
from app.routers.timemap import router as timemap_router

logger = logging.getLogger("uvicorn.error")


def _run_migrations() -> None:
    """Run Alembic migrations on startup (no-op if already at head)."""
    import subprocess
    import sys

    try:
        subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError as exc:
        logger.error("Alembic migration failed: %s", exc.stderr.decode(errors="replace")[-2000:])
    except Exception as exc:  # alembic unavailable (e.g. during tests)
        logger.warning("Alembic migration skipped: %s", exc)


async def _seed_if_empty() -> None:
    """Load the TimeMap seed data on first start (no-op once seeded)."""
    from app.core.database import async_session
    from app.services.seed import seed

    try:
        async with async_session() as session:
            counts = await seed(session)
        if counts:
            logger.info("TimeMap seed loaded: %s", counts)
    except Exception as exc:
        logger.error("TimeMap seeding failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    _run_migrations()
    await _seed_if_empty()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Rate limiting (slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
_upload_path = Path(settings.UPLOAD_DIR)
_upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_path), name="uploads")

# Include routers here as you create them:
app.include_router(timemap_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "version": settings.APP_VERSION}
