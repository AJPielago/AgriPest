import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.db import engine, Base, ensure_schema_compatibility
from app.api.v1.api import api_router
# Import all models to guarantee SQLAlchemy metadata creation
from app.models import *

# Initialize database tables & apply schema upgrades
Base.metadata.create_all(bind=engine)
ensure_schema_compatibility()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Backend API service for AI-Based Pest Detection System Capstone."
)

# Configure CORS (open for localhost and local network demo)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        print("[+] Automatic startup database initialization completed successfully.")
    except Exception as e:
        print(f"[-] Startup seed note: {e}")

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "status": "online",
        "detection_mode": settings.DETECTION_MODE,
        "docs_url": "/docs"
    }
