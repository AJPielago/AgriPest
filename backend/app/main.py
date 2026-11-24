import logging
import os
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.db import engine, Base, ensure_schema_compatibility
from app.api.v1.api import api_router
# Import all models to guarantee SQLAlchemy metadata creation
from app.models import *

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("agripest.main")

# Initialize database tables & apply schema upgrades
Base.metadata.create_all(bind=engine)
ensure_schema_compatibility()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Backend API service for AI-Based Pest Detection System Capstone."
)

# Configure CORS (explicit origins + optional LAN-only regex for local demos)
cors_kwargs = {
    "allow_origins": settings.BACKEND_CORS_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["Authorization", "Content-Type", "Accept-Language"],
}
if settings.BACKEND_CORS_ORIGIN_REGEX:
    cors_kwargs["allow_origin_regex"] = settings.BACKEND_CORS_ORIGIN_REGEX

app.add_middleware(CORSMiddleware, **cors_kwargs)


@app.middleware("http")
async def security_and_timing_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
    return response


# Ensure uploads directory exists and mount static route
os.makedirs(os.path.join(settings.UPLOAD_DIR, "detections"), exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.on_event("startup")
def on_startup():
    try:
        import sys
        sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from seed import seed_db
        seed_db()
        logger.info("Automatic startup database initialization completed successfully.")
    except Exception as e:
        logger.warning("Startup seed note: %s", e)

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "online",
        "detection_mode": settings.DETECTION_MODE,
        "docs_url": "/docs"
    }
