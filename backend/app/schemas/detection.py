from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any

class DetectionFeedbackIn(BaseModel):
    feedback_accurate: bool
    feedback_notes: Optional[str] = None

class DetectionOut(BaseModel):
    id: int
    user_id: int
    crop_id: Optional[int] = None
    pest_id: Optional[int] = None
    disease_id: Optional[int] = None
    detection_type: Optional[str] = "pest_and_disease"
    image_path: str
    confidence_score: float
    severity: str
    detected_pest_name: str
    recommended_action: str
    bounding_boxes: Optional[List[Any]] = []
    status: str
    created_at: datetime
    crop_name: Optional[str] = None
    scientific_name: Optional[str] = None
    pest_description: Optional[str] = None
    
    # Disease Assessment Integration
    detected_disease_name: Optional[str] = None
    disease_scientific_name: Optional[str] = None
    disease_pathogen_type: Optional[str] = None
    disease_confidence_score: Optional[float] = None
    disease_severity: Optional[str] = None
    disease_symptoms: Optional[str] = None
    disease_recommended_action: Optional[str] = None
    disease_details: Optional[Any] = None

    # Context & Feedback
    weather_condition: Optional[str] = None
    field_location: Optional[str] = None
    feedback_accurate: Optional[bool] = None
    feedback_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DetectionListOut(BaseModel):
    total: int
    items: List[DetectionOut]
