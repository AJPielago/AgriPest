import logging
import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_DB_FILE = (PROJECT_ROOT / "pest_detection.db").as_posix()
DEFAULT_UPLOAD_DIR = str(PROJECT_ROOT / "uploads")
DEFAULT_INSECURE_SECRET = "super-secret-capstone-key-change-in-production-12345"

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI-Based Pest Detection System"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = DEFAULT_INSECURE_SECRET
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12 hours
    
    # CORS Allowed Origins (explicit origins + optional regex for local LAN dev only)
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    BACKEND_CORS_ORIGIN_REGEX: Optional[str] = r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$"
    
    # Database URL
    DATABASE_URL: str = f"sqlite:///{DEFAULT_DB_FILE}"
    
    # Detection Mode: 'mock' or 'ai'
    DETECTION_MODE: str = "mock"
    
    # File Storage
    UPLOAD_DIR: str = DEFAULT_UPLOAD_DIR
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/jpg", "image/webp"]
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp"]
    
    model_config = SettingsConfigDict(
        env_file=str(PROJECT_ROOT / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    def __init__(self, **values):
        super().__init__(**values)
        if self.SECRET_KEY == DEFAULT_INSECURE_SECRET:
            if self.ENVIRONMENT.lower() == "production":
                raise RuntimeError("SECRET_KEY must be set to a strong random value in production.")
            logger.warning("Using default development SECRET_KEY; override via environment variable in production.")
        # If DATABASE_URL is a relative sqlite path, resolve it relative to PROJECT_ROOT
        if self.DATABASE_URL.startswith("sqlite:///."):
            rel_path = self.DATABASE_URL.replace("sqlite:///.", "").lstrip("/\\")
            self.DATABASE_URL = f"sqlite:///{(PROJECT_ROOT / rel_path).as_posix()}"
        if not os.path.isabs(self.UPLOAD_DIR):
            self.UPLOAD_DIR = str(PROJECT_ROOT / self.UPLOAD_DIR.lstrip(".\\/"))

settings = Settings()
