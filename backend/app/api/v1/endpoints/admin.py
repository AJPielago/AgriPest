from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, text
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

    # Upload storage directory stats (recursively count actual image files)
    upload_path = settings.UPLOAD_DIR
    upload_exists = os.path.exists(upload_path)
    file_count = 0
    total_bytes = 0
    if upload_exists:
        for root, _, files in os.walk(upload_path):
            for fname in files:
                if fname.startswith("."):
                    continue
                file_count += 1
                try:
                    total_bytes += os.path.getsize(os.path.join(root, fname))
                except OSError:
                    pass

    return {
        "status": "healthy" if db_healthy else "unhealthy",
        "database_connected": db_healthy,
        "detection_mode": settings.DETECTION_MODE,
        "python_version": sys.version.split()[0],
        "upload_dir_exists": upload_exists,
        "upload_file_count": file_count,
        "upload_total_size_mb": round(total_bytes / (1024 * 1024), 2),
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
    flagged_detections = db.query(Detection).filter(Detection.feedback_accurate == False).count()  # noqa: E712

    return {
        "total_users": total_users,
        "total_crops": total_crops,
        "total_pests": total_pests,
        "total_detections": total_detections,
        "flagged_detections": flagged_detections,
        "detection_mode": settings.DETECTION_MODE,
        "upload_dir": settings.UPLOAD_DIR,
        "max_upload_size_mb": settings.MAX_UPLOAD_SIZE_MB
    }


@router.get("/flagged-scans")
def get_flagged_scans(
    limit: int = Query(50, ge=1, le=200),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Active-Learning Review Queue: returns farmer-flagged inaccurate detections
    with their original AI diagnosis, confidence, and farmer correction notes
    so admins can review and export them for model retraining.
    """
    rows = (
        db.query(Detection)
        .filter(Detection.feedback_accurate == False)  # noqa: E712
        .order_by(desc(Detection.created_at))
        .limit(limit)
        .all()
    )
    items = []
    for det in rows:
        crop = db.query(Crop).filter(Crop.id == det.crop_id).first() if det.crop_id else None
        user = db.query(User).filter(User.id == det.user_id).first() if det.user_id else None
        items.append(
            {
                "id": det.id,
                "image_path": det.image_path,
                "crop_name": crop.name if crop else "Auto-Detect",
                "farmer_name": user.full_name if user else f"User #{det.user_id}",
                "detection_type": det.detection_type,
                "predicted_pest": det.detected_pest_name,
                "predicted_disease": det.detected_disease_name,
                "confidence_score": det.confidence_score,
                "severity": det.severity,
                "feedback_notes": det.feedback_notes or "",
                "created_at": det.created_at.isoformat() if det.created_at else None,
            }
        )
    return {"total": len(items), "items": items}


@router.get("/flagged-scans/export")
def export_flagged_scans_manifest(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Exports a retraining-ready JSON manifest of all farmer-flagged inaccurate scans
    for the active-learning dataset loop.
    """
    payload = get_flagged_scans(limit=200, admin=admin, db=db)
    return JSONResponse(
        content={
            "schema": "agripest_active_learning_v1",
            "total_flagged": payload["total"],
            "records": payload["items"],
        },
        headers={
            "Content-Disposition": 'attachment; filename="flagged_scans_active_learning.json"'
        },
    )
