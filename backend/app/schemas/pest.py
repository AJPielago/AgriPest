from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from app.schemas.recommendation import RecommendationOut

class PestBase(BaseModel):
    name: str
    name_tl: Optional[str] = None
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_tl: Optional[str] = None
    severity_default: Optional[str] = "Moderate"

class PestCreate(PestBase):
    pass

class PestUpdate(BaseModel):
    name: Optional[str] = None
    name_tl: Optional[str] = None
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_tl: Optional[str] = None
    severity_default: Optional[str] = None

class CropPestLinkRequest(BaseModel):
    crop_id: int
    pest_id: int
    notes: Optional[str] = None

class PestOut(PestBase):
    id: int
    created_at: datetime
    updated_at: datetime
    recommendations: List[RecommendationOut] = []

    model_config = ConfigDict(from_attributes=True)
