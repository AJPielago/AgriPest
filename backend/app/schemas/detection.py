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
    
    # New Fields
    weather_condition: Optional[str] = None
    field_location: Optional[str] = None
    feedback_accurate: Optional[bool] = None
    feedback_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DetectionListOut(BaseModel):
    total: int
    items: List[DetectionOut]
