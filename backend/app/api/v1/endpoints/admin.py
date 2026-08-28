from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
import sys
import os

from app.core.config import settings
from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.crop import Crop
from app.models.pest import Pest
from app.models.detection import Detection

router = APIRouter()

@router.get("/health")
def get_system_health(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin System Health & Health Check Endpoint."""
    # DB Connectivity Ping
    db_healthy = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_healthy = False

    # Upload storage directory stats
    upload_path = settings.UPLOAD_DIR
    upload_exists = os.path.exists(upload_path)
    file_count = len(os.listdir(upload_path)) if upload_exists else 0

    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database_connected": db_healthy,
        "detection_mode": settings.DETECTION_MODE,
        "python_version": sys.version.split()[0],
        "upload_dir_exists": upload_exists,
        "upload_file_count": file_count,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
    }

@router.get("/metrics")
def get_admin_metrics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    total_crops = db.query(Crop).count()
    total_pests = db.query(Pest).count()
    total_detections = db.query(Detection).count()
    
    return {
        "total_users": total_users,
        "total_crops": total_crops,
        "total_pests": total_pests,
        "total_detections": total_detections,
        "detection_mode": settings.DETECTION_MODE,
        "upload_dir": settings.UPLOAD_DIR,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
    }
