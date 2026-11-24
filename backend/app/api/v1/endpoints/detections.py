import os
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.core.config import settings
from app.core.db import get_db
from app.core.rate_limiter import detection_limiter
from app.core.security import get_current_user
from app.models.user import User
from app.models.detection import Detection
from app.models.crop import Crop
from app.models.pest import Pest
from app.models.audit_log import AuditLog
from app.schemas.detection import DetectionOut, DetectionListOut, DetectionFeedbackIn
from app.services.storage import validate_and_save_upload, validate_upload_in_memory
from app.services.detection.factory import get_detection_service

router = APIRouter()


def _remove_uploaded_file(image_url: str) -> None:
    """Deletes a temporary or rejected uploaded file from UPLOAD_DIR."""
    prefix = "/static/uploads/"
    if not image_url or not image_url.startswith(prefix):
        return
    rel = image_url[len(prefix):].lstrip("/\\")
    disk_path = os.path.join(settings.UPLOAD_DIR, rel)
    try:
        if os.path.exists(disk_path):
            os.remove(disk_path)
    except OSError:
        pass


@router.post("/live-check")
async def live_check_frame(
    file: UploadFile = File(...),
    crop_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rapid Live Camera Pre-screening Endpoint.
    Evaluates sampled camera video frame purely in memory (zero temp disk writes)
    and returns recognition status and auto-trigger flag.
    """
    pil_image = validate_upload_in_memory(file)
    detection_service = get_detection_service()
    result = await detection_service.check_live_frame(
        image_path=None,
        crop_id=crop_id,
        db=db,
        image_obj=pil_image,
    )

    conf = result.get("confidence", 0.0)
    auto_trigger = result.get("crop_recognized", False) and (conf >= 0.70)
    
    return {
        "detected": result.get("detected", False),
        "crop_recognized": result.get("crop_recognized", False),
        "pest_detected": result.get("pest_detected", False),
        "disease_detected": result.get("disease_detected", False),
        "detection_type": result.get("detection_type", "rejected"),
        "confidence": conf,
        "auto_trigger": auto_trigger,
        "bounding_boxes": result.get("bounding_boxes", []),
        "message": result.get("message", "Scanning live camera feed...")
    }

def _fuse_two_angle_results(
    top_res: dict,
    underside_res: dict,
    underside_url: str,
) -> dict:
    """
    Immutably fuses top-of-leaf and leaf-underside scan results into a single
    coherent diagnostic report. Pests hiding on the underside (aphids, whiteflies,
    caterpillar larvae) or underside mildew upgrade a healthy/pest_damage top scan.
    """
    fused = dict(top_res)
    top_ca = dict(top_res.get("condition_assessment") or {})
    under_ca = dict(underside_res.get("condition_assessment") or {})

    if underside_res.get("rejected"):
        top_ca["two_angle_scan"] = {
            "enabled": True,
            "underside_image_path": None,
            "underside_status": "rejected",
            "underside_summary": underside_res.get("rejection_reason") or "Underside photo could not be verified.",
        }
        fused["condition_assessment"] = top_ca
        return fused

    top_type = fused.get("detection_type", "healthy")
    under_type = underside_res.get("detection_type", "healthy")

    # Promote active pest found on the underside when top leaf only saw healthy or indirect feeding damage
    if under_type in ("pest", "pest_and_disease") and top_type in ("healthy", "pest_damage", "nutrient_deficiency"):
        fused["pest_id"] = underside_res.get("pest_id")
        fused["pest_name"] = underside_res.get("pest_name")
        fused["scientific_name"] = underside_res.get("scientific_name")
        fused["confidence"] = underside_res.get("confidence", fused.get("confidence", 0.0))
        fused["severity"] = underside_res.get("severity", fused.get("severity", "Moderate"))
        fused["recommended_action"] = underside_res.get("recommended_action", fused.get("recommended_action"))
        fused["detection_type"] = "pest_and_disease" if (top_type == "disease" or under_type == "pest_and_disease") else "pest"
        top_ca["overall_condition"] = "Active Pest Infestation (Confirmed on Underside)"
        top_ca["condition_summary"] = (
            f"Leaf underside scan confirmed active {underside_res.get('pest_name')} "
            f"({int(round((underside_res.get('confidence') or 0) * 100))}%). "
            + (top_ca.get("condition_summary") or "")
        ).strip()
    elif under_type in ("pest", "pest_and_disease") and top_type == "disease":
        fused["pest_id"] = underside_res.get("pest_id")
        fused["pest_name"] = underside_res.get("pest_name")
        fused["scientific_name"] = underside_res.get("scientific_name")
        fused["detection_type"] = "pest_and_disease"
        top_ca["overall_condition"] = "Pest & Disease Infestation"
        top_ca["condition_summary"] = (
            f"Top leaf showed {fused.get('detected_disease_name')} and underside scan confirmed active "
            f"{underside_res.get('pest_name')}."
        )

    # Promote disease found on the underside when top leaf had no disease
    if under_type in ("disease", "pest_and_disease") and not fused.get("detected_disease_name"):
        fused["disease_id"] = underside_res.get("disease_id")
        fused["detected_disease_name"] = underside_res.get("detected_disease_name")
        fused["disease_confidence_score"] = underside_res.get("disease_confidence_score")
        fused["disease_severity"] = underside_res.get("disease_severity")
        fused["disease_recommended_action"] = underside_res.get("disease_recommended_action")
        fused["disease_details"] = underside_res.get("disease_details", {})
        if fused.get("detection_type") in ("healthy", "pest_damage", "nutrient_deficiency"):
            fused["detection_type"] = "disease"
            fused["confidence"] = underside_res.get("disease_confidence_score") or fused.get("confidence", 0.0)
            fused["severity"] = underside_res.get("disease_severity") or fused.get("severity", "Moderate")
            top_ca["overall_condition"] = "Diseased Foliage (Confirmed on Underside)"
        elif fused.get("detection_type") == "pest":
            fused["detection_type"] = "pest_and_disease"
            top_ca["overall_condition"] = "Pest & Disease Infestation"

    # Use the more cautious health score between top and underside views
    if isinstance(top_ca.get("health_score"), (int, float)) and isinstance(under_ca.get("health_score"), (int, float)):
        top_ca["health_score"] = int(min(top_ca["health_score"], under_ca["health_score"]))

    top_ca["two_angle_scan"] = {
        "enabled": True,
        "underside_image_path": underside_url,
        "underside_status": "verified",
        "underside_outcome": under_type,
        "underside_condition": under_ca.get("overall_condition") or underside_res.get("pest_name") or "Verified",
        "underside_summary": under_ca.get("condition_summary") or "Underside leaf scan completed.",
    }
    fused["condition_assessment"] = top_ca
    return fused


@router.post("/detect", response_model=DetectionOut, status_code=status.HTTP_201_CREATED)

@router.post("", response_model=DetectionOut, status_code=status.HTTP_201_CREATED)
async def detect_pest(
    request: Request,
    file: UploadFile = File(...),
    underside_file: Optional[UploadFile] = File(None),
    crop_id: Optional[int] = Form(None),
    weather_condition: Optional[str] = Form(None),
    field_location: Optional[str] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core Pest Detection Endpoint.
    Accepts top-of-leaf image, optional leaf-underside image (2-angle scan),
    optional crop host, weather, and field location tags.
    Executes active detection engine and logs detection audit record.
    """
    detection_limiter.check_and_record(request)

    # 1. Secure file upload & validation
    image_url = validate_and_save_upload(file)
    underside_url = validate_and_save_upload(underside_file) if underside_file is not None else None

    # 2. Invoke modular detection factory
    detection_service = get_detection_service()
    result = await detection_service.analyze_image(
        image_path=image_url,
        crop_id=crop_id,
        db=db
    )

    # 2b. Reject unclassified / non-crop images instead of saving a guessed diagnosis
    if result.get("rejected"):
        _remove_uploaded_file(image_url)
        if underside_url:
            _remove_uploaded_file(underside_url)
        raise HTTPException(
            status_code=result.get("http_status", status.HTTP_422_UNPROCESSABLE_ENTITY),
            detail=result.get(
                "rejection_reason",
                "Unrecognized specimen. Please scan a clear close-up of Lettuce, Bok Choy, Mustard Greens, or a known pest/disease."
            )
        )

    # 2c. Optional 2-Angle Scan Fusion (Top Leaf + Leaf Underside)
    if underside_url:
        underside_result = await detection_service.analyze_image(
            image_path=underside_url,
            crop_id=result.get("crop_id") or crop_id,
            db=db,
        )
        if underside_result.get("rejected"):
            _remove_uploaded_file(underside_url)
        result = _fuse_two_angle_results(result, underside_result, underside_url)

    # 3. Create database record with metadata
    detection_record = Detection(
        user_id=current_user.id,
        crop_id=result.get("crop_id"),
        pest_id=result.get("pest_id"),
        disease_id=result.get("disease_id"),
        detection_type=result.get("detection_type", "pest_and_disease"),
        image_path=image_url,
        confidence_score=result.get("confidence", 0.0),
        severity=result.get("severity", "Moderate"),
        detected_pest_name=result.get("pest_name", "Unknown Pest"),
        recommended_action=result.get("recommended_action", "Consult agricultural extension office."),
        bounding_boxes=result.get("bounding_boxes", []),
        detected_disease_name=result.get("detected_disease_name"),
        disease_confidence_score=result.get("disease_confidence_score"),
        disease_severity=result.get("disease_severity"),
        disease_recommended_action=result.get("disease_recommended_action"),
        disease_details=result.get("disease_details", {}),
        condition_assessment=result.get("condition_assessment", {}),
        weather_condition=weather_condition,
        field_location=field_location,
        latitude=latitude,
        longitude=longitude,
        is_acknowledged=False,
        status="completed"
    )

    db.add(detection_record)
    
    # Audit Log Entry
    audit = AuditLog(
        user_id=current_user.id,
        action="DETECTION_RUN",
        details=(
            f"Ran detection ({detection_record.detection_type}): "
            f"Pest={detection_record.detected_pest_name} ({int(detection_record.confidence_score * 100)}%), "
            f"Disease={detection_record.detected_disease_name or 'None'} ({int((detection_record.disease_confidence_score or 0) * 100)}%)"
        )
    )
    db.add(audit)

    db.commit()
    db.refresh(detection_record)

    crop_obj = db.query(Crop).filter(Crop.id == detection_record.crop_id).first() if detection_record.crop_id else None
    pest_obj = db.query(Pest).filter(Pest.id == detection_record.pest_id).first() if detection_record.pest_id else None

    out_data = DetectionOut.model_validate(detection_record)
    out_data.crop_name = crop_obj.name if crop_obj else result.get("crop_name", "Unspecified Crop")
    out_data.scientific_name = pest_obj.scientific_name if pest_obj else result.get("scientific_name")
    out_data.pest_description = pest_obj.description if pest_obj else result.get("description")

    out_data.disease_scientific_name = result.get("disease_scientific_name")
    out_data.disease_pathogen_type = result.get("disease_pathogen_type")
    out_data.disease_symptoms = result.get("disease_symptoms")

    return out_data

def _enrich_detection_out(rec: Detection) -> DetectionOut:
    out = DetectionOut.model_validate(rec)
    if rec.crop:
        out.crop_name = rec.crop.name
    if rec.pest:
        out.scientific_name = rec.pest.scientific_name
        out.pest_description = rec.pest.description
    if rec.disease:
        out.disease_scientific_name = rec.disease.scientific_name
        out.disease_pathogen_type = rec.disease.pathogen_type
        out.disease_symptoms = rec.disease.symptoms
    elif rec.disease_details:
        out.disease_scientific_name = rec.disease_details.get("scientific_name")
        out.disease_pathogen_type = rec.disease_details.get("pathogen_type")
        out.disease_symptoms = rec.disease_details.get("symptoms")
    return out

@router.post("/{detection_id}/feedback", response_model=DetectionOut)
def submit_detection_feedback(
    detection_id: int,
    payload: DetectionFeedbackIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Farmer Model Feedback Loop — Store farmer ground truth validation for model retraining dataset."""
    rec = db.query(Detection).filter(Detection.id == detection_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Detection record not found.")

    if rec.user_id != current_user.id and current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to submit feedback for this record.")

    rec.feedback_accurate = payload.feedback_accurate
    rec.feedback_notes = payload.feedback_notes

    audit = AuditLog(
        user_id=current_user.id,
        action="DETECTION_FEEDBACK",
        details=f"Feedback for Detection #{detection_id}: Accurate={payload.feedback_accurate}"
    )
    db.add(audit)
    db.commit()
    db.refresh(rec)

    return _enrich_detection_out(rec)

@router.get("/notifications/unread-count")
def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns count of unacknowledged High/Critical detection alerts for the current user."""
    query = db.query(Detection).filter(
        Detection.severity.in_(["High", "Critical"]),
        or_(Detection.is_acknowledged == False, Detection.is_acknowledged.is_(None)),
    )
    is_admin = getattr(current_user, "role", None) and getattr(current_user.role, "name", "") == "admin"
    if not is_admin:
        query = query.filter(Detection.user_id == current_user.id)
    return {"unread_count": query.count()}


@router.post("/notifications/mark-read")
def mark_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Persists notification read state across sessions."""
    query = db.query(Detection).filter(
        or_(Detection.is_acknowledged == False, Detection.is_acknowledged.is_(None))
    )
    is_admin = getattr(current_user, "role", None) and getattr(current_user.role, "name", "") == "admin"
    if not is_admin:
        query = query.filter(Detection.user_id == current_user.id)
    updated = query.update({Detection.is_acknowledged: True}, synchronize_session=False)
    db.commit()
    return {"updated": updated, "unread_count": 0}


@router.get("", response_model=DetectionListOut)
def list_detection_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    crop_id: Optional[int] = None,
    severity: Optional[str] = None,
    search: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve detection records with optional server-side filtering and pagination."""
    query = db.query(Detection)
    
    # Non-admin users only see their own detections
    is_admin = getattr(current_user, "role", None) and getattr(current_user.role, "name", "") == "admin"
    if not is_admin:
        query = query.filter(Detection.user_id == current_user.id)

    if crop_id:
        query = query.filter(Detection.crop_id == crop_id)

    if severity:
        query = query.filter(Detection.severity.ilike(severity.strip()))

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Detection.detected_pest_name.ilike(pattern),
                Detection.detected_disease_name.ilike(pattern),
                Detection.field_location.ilike(pattern),
            )
        )

    if from_date:
        try:
            dt_from = datetime.fromisoformat(from_date)
            query = query.filter(Detection.created_at >= dt_from)
        except ValueError:
            pass

    if to_date:
        try:
            dt_to = datetime.fromisoformat(to_date)
            query = query.filter(Detection.created_at <= dt_to)
        except ValueError:
            pass
    
    total = query.count()
    records = query.order_by(desc(Detection.created_at)).offset(skip).limit(limit).all()

    items = [_enrich_detection_out(rec) for rec in records]

    return {"total": total, "items": items}

@router.get("/{detection_id}", response_model=DetectionOut)
def get_detection_detail(
    detection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(Detection).filter(Detection.id == detection_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Detection record not found.")
    
    if rec.user_id != current_user.id and current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this record.")

    return _enrich_detection_out(rec)

@router.delete("/{detection_id}")
def delete_detection(
    detection_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    rec = db.query(Detection).filter(Detection.id == detection_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Detection record not found.")
    
    if rec.user_id != current_user.id and current_user.role.name != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this record.")

    image_path = rec.image_path
    db.delete(rec)
    db.add(AuditLog(
        user_id=current_user.id,
        action="DETECTION_DELETED",
        details=f"Deleted Detection #{detection_id}",
    ))
    db.commit()
    _remove_uploaded_file(image_path)
    return {"detail": "Detection history entry deleted successfully."}
