from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.detection import Detection
from app.models.crop import Crop
from app.models.pest import Pest
from app.models.audit_log import AuditLog
from app.schemas.detection import DetectionOut, DetectionListOut, DetectionFeedbackIn
from app.services.storage import validate_and_save_upload
from app.services.detection.factory import get_detection_service

router = APIRouter()

@router.post("/live-check")
async def live_check_frame(
    file: UploadFile = File(...),
    crop_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Rapid Live Camera Pre-screening Endpoint.
    Evaluates sampled camera video frame and returns recognition status and auto-trigger flag.
    """
    image_url = validate_and_save_upload(file)
    detection_service = get_detection_service()
    result = await detection_service.check_live_frame(
        image_path=image_url,
        crop_id=crop_id,
        db=db
    )
    conf = result.get("confidence", 0.0)
    auto_trigger = result.get("crop_recognized", False) and (conf >= 0.80)
    
    return {
        "detected": result.get("detected", False),
        "crop_recognized": result.get("crop_recognized", False),
        "pest_detected": result.get("pest_detected", False),
        "confidence": conf,
        "auto_trigger": auto_trigger,
        "bounding_boxes": result.get("bounding_boxes", []),
        "message": result.get("message", "Scanning live camera feed...")
    }

@router.post("/detect", response_model=DetectionOut, status_code=status.HTTP_201_CREATED)

@router.post("", response_model=DetectionOut, status_code=status.HTTP_201_CREATED)
async def detect_pest(
    file: UploadFile = File(...),
    crop_id: Optional[int] = Form(None),
    weather_condition: Optional[str] = Form(None),
    field_location: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Core Pest Detection Endpoint.
    Accepts image, optional crop host, weather, and field location tags.
    Executes active detection engine and logs detection audit record.
    """
    # 1. Secure file upload & validation
    image_url = validate_and_save_upload(file)

    # 2. Invoke modular detection factory
    detection_service = get_detection_service()
    result = await detection_service.analyze_image(
        image_path=image_url,
        crop_id=crop_id,
        db=db
    )

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
        weather_condition=weather_condition,
        field_location=field_location,
        status="completed"
    )

    db.add(detection_record)
    
    # Audit Log Entry
    audit = AuditLog(
        user_id=current_user.id,
        action="DETECTION_RUN",
        details=f"Ran detection: Pest={detection_record.detected_pest_name} ({int(detection_record.confidence_score * 100)}%), Disease={detection_record.detected_disease_name or 'None'} ({int((detection_record.disease_confidence_score or 0) * 100)}%)"
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

@router.get("", response_model=DetectionListOut)
def list_detection_history(
    skip: int = 0,
    limit: int = 50,
    crop_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve user's detection records."""
    query = db.query(Detection).filter(Detection.user_id == current_user.id)
    if crop_id:
        query = query.filter(Detection.crop_id == crop_id)
    
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

    db.delete(rec)
    db.commit()
    return {"detail": "Detection history entry deleted successfully."}
