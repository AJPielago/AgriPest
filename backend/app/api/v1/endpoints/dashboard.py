from collections import Counter, defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.core.config import settings
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.crop import Crop
from app.models.detection import Detection
from app.schemas.dashboard import DashboardStatsOut

router = APIRouter()

SEVERITY_PENALTY = {
    "critical": 40,
    "high": 28,
    "moderate": 15,
    "low": 4,
}


def _compute_health_score(severities) -> int:
    if not severities:
        return 100
    total_penalty = sum(SEVERITY_PENALTY.get((s or "low").lower(), 10) for s in severities)
    avg_penalty = total_penalty / len(severities)
    return max(20, min(100, round(100 - avg_penalty)))


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

    # Top detected pests (exclude healthy crops, disease-only, and abiotic nutrient deficiency scans)
    top_pests_q = db.query(Detection.detected_pest_name, func.count(Detection.id).label("count")).filter(
        Detection.detected_pest_name.isnot(None),
        Detection.detected_pest_name != "No Pest Detected",
        ~Detection.detected_pest_name.ilike("Healthy%"),
        ~Detection.detected_pest_name.ilike("%Deficiency%"),
        ~Detection.detected_pest_name.ilike("%Stress%"),
    )
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

    # DB-portable monthly & daily telemetry aggregation (works on both SQLite and PostgreSQL)
    ts_rows_q = db.query(
        Detection.created_at,
        Detection.severity,
        Detection.crop_id,
        Detection.confidence_score,
        Detection.field_location,
        Detection.detected_disease_name,
    )
    if not is_admin:
        ts_rows_q = ts_rows_q.filter(Detection.user_id == current_user.id)
    ts_rows = ts_rows_q.order_by(Detection.created_at).all()

    monthly_counter = Counter()
    daily_severities = defaultdict(list)
    crop_buckets = defaultdict(lambda: {"count": 0, "alerts": 0, "severities": [], "conf_sum": 0.0, "last_seen": None})
    all_severities = []

    for created_at, severity, crop_id, conf_score, field_loc, dis_name in ts_rows:
        all_severities.append(severity)
        if created_at:
            month_key = created_at.strftime("%Y-%m")
            day_key = created_at.strftime("%Y-%m-%d")
            monthly_counter[month_key] += 1
            daily_severities[day_key].append(severity)
        if crop_id is not None:
            bucket = crop_buckets[crop_id]
            bucket["count"] += 1
            bucket["severities"].append(severity)
            bucket["conf_sum"] += float(conf_score or 0.0)
            if (severity or "").lower() in ("high", "critical"):
                bucket["alerts"] += 1
            if created_at and (bucket["last_seen"] is None or created_at > bucket["last_seen"]):
                bucket["last_seen"] = created_at

    sorted_months = sorted(monthly_counter.items())[-6:]
    monthly_trends = [{"month": m, "count": c} for m, c in sorted_months]

    sorted_days = sorted(daily_severities.items())[-7:]
    daily_health_trend = [
        {"date": d, "health_score": _compute_health_score(sevs), "scans": len(sevs)}
        for d, sevs in sorted_days
    ]

    # Per-crop health summary for FarmMonitoring & Reports
    crops = db.query(Crop).all()
    crop_health_summary = []
    for crop in crops:
        bucket = crop_buckets.get(crop.id)
        if bucket and bucket["count"] > 0:
            health = _compute_health_score(bucket["severities"])
            crop_health_summary.append({
                "crop_id": crop.id,
                "crop_name": crop.name,
                "crop_name_tl": crop.name_tl or crop.name,
                "scan_count": bucket["count"],
                "active_alerts": bucket["alerts"],
                "health_score": health,
                "avg_confidence": round(bucket["conf_sum"] / bucket["count"], 2),
                "last_monitored": bucket["last_seen"].isoformat() if bucket["last_seen"] else None,
            })
        else:
            crop_health_summary.append({
                "crop_id": crop.id,
                "crop_name": crop.name,
                "crop_name_tl": crop.name_tl or crop.name,
                "scan_count": 0,
                "active_alerts": 0,
                "health_score": 100,
                "avg_confidence": 0.0,
                "last_monitored": None,
            })

    overall_health_score = _compute_health_score(all_severities)

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

    # Unread high/critical alerts count
    unread_q = user_detections.filter(
        Detection.severity.in_(["High", "Critical"]),
        or_(Detection.is_acknowledged == False, Detection.is_acknowledged.is_(None)),
    )
    unread_alerts_count = unread_q.count()

    # Recent records (last 5)
    recent_query = (
        user_detections.order_by(desc(Detection.created_at))
        .limit(5)
        .all()
    )
    recent_records = [
        {
            "id": r.id,
            "detection_type": r.detection_type,
            "crop_name": r.crop.name if r.crop else None,
            "pest_name": r.detected_pest_name,
            "disease_name": r.detected_disease_name,
            "confidence": r.confidence_score,
            "severity": r.severity,
            "disease_severity": r.disease_severity,
            "created_at": r.created_at.isoformat(),
            "image_path": r.image_path,
            "weather_condition": r.weather_condition,
            "field_location": r.field_location,
            "feedback_accurate": r.feedback_accurate,
            "is_acknowledged": bool(r.is_acknowledged),
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
        "location_breakdown": location_breakdown,
        "crop_health_summary": crop_health_summary,
        "daily_health_trend": daily_health_trend,
        "overall_health_score": overall_health_score,
        "unread_alerts_count": unread_alerts_count,
    }
