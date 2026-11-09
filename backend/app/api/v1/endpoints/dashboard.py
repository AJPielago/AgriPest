from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, extract
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.detection import Detection
from app.schemas.dashboard import DashboardStatsOut

router = APIRouter()

@router.get("/stats", response_model=DashboardStatsOut)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    is_admin = getattr(current_user, "role", None) and getattr(current_user.role, "name", "") == "admin"
    
    user_detections = db.query(Detection)
    if not is_admin:
        user_detections = user_detections.filter(Detection.user_id == current_user.id)
        
    total_count = user_detections.count()

    # Average confidence
    avg_conf_query = db.query(func.avg(Detection.confidence_score))
    if not is_admin:
        avg_conf_query = avg_conf_query.filter(Detection.user_id == current_user.id)
    avg_conf_res = avg_conf_query.scalar()
    avg_confidence = round(float(avg_conf_res), 2) if avg_conf_res is not None else 0.0

    # Severity distribution counts
    sev_q = db.query(Detection.severity, func.count(Detection.id))
    if not is_admin:
        sev_q = sev_q.filter(Detection.user_id == current_user.id)
    severity_query = sev_q.group_by(Detection.severity).all()
    severity_dist = {sev: count for sev, count in severity_query}

    # Top detected pests
    top_pests_q = db.query(Detection.detected_pest_name, func.count(Detection.id).label("count"))
    if not is_admin:
        top_pests_q = top_pests_q.filter(Detection.user_id == current_user.id)
    top_pests_query = (
        top_pests_q.group_by(Detection.detected_pest_name)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    top_pests = [{"pest_name": name, "count": count} for name, count in top_pests_query]

    # Top detected plant diseases
    top_dis_q = db.query(Detection.detected_disease_name, func.count(Detection.id).label("count")).filter(Detection.detected_disease_name.isnot(None))
    if not is_admin:
        top_dis_q = top_dis_q.filter(Detection.user_id == current_user.id)
    top_diseases_query = (
        top_dis_q.group_by(Detection.detected_disease_name)
        .order_by(desc("count"))
        .limit(5)
        .all()
    )
    top_diseases = [{"disease_name": name, "count": count} for name, count in top_diseases_query if name]

    # Time series breakdown (Monthly detections)
    monthly_q = db.query(
        func.strftime("%Y-%m", Detection.created_at).label("month"),
        func.count(Detection.id).label("count")
    )
    if not is_admin:
        monthly_q = monthly_q.filter(Detection.user_id == current_user.id)
    monthly_query = (
        monthly_q.group_by("month")
        .order_by("month")
        .limit(6)
        .all()
    )
    monthly_trends = [{"month": m or "2026-08", "count": c} for m, c in monthly_query]

    # Location / Barangay breakdown for Outbreak Heatmap
    loc_q = db.query(Detection.field_location, func.count(Detection.id).label("count"))
    if not is_admin:
        loc_q = loc_q.filter(Detection.user_id == current_user.id)
    location_query = (
        loc_q.group_by(Detection.field_location)
        .order_by(desc("count"))
        .limit(6)
        .all()
    )
    location_breakdown = [
        {"location": loc or "Unspecified Location", "count": c}
        for loc, c in location_query
    ]

    # Recent records (last 5)
    recent_query = (
        user_detections.order_by(desc(Detection.created_at))
        .limit(5)
        .all()
    )
    recent_records = [
        {
            "id": r.id,
            "pest_name": r.detected_pest_name,
            "disease_name": r.detected_disease_name,
            "confidence": r.confidence_score,
            "severity": r.severity,
            "disease_severity": r.disease_severity,
            "created_at": r.created_at.isoformat(),
            "image_path": r.image_path,
            "weather_condition": r.weather_condition,
            "field_location": r.field_location,
            "feedback_accurate": r.feedback_accurate
        }
        for r in recent_query
    ]

    return {
        "total_detections": total_count,
        "recent_detections_count": len(recent_records),
        "avg_confidence": avg_confidence,
        "top_pests": top_pests,
        "top_diseases": top_diseases,
        "detection_mode": settings.DETECTION_MODE,
        "recent_records": recent_records,
        "severity_dist": severity_dist,
        "monthly_trends": monthly_trends,
        "location_breakdown": location_breakdown
    }
