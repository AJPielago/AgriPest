from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class DiseaseRecommendationBase(BaseModel):
    action_title: str
    action_title_tl: Optional[str] = None
    description: str
    description_tl: Optional[str] = None
    management_type: Optional[str] = "Preventative"

class DiseaseRecommendationCreate(DiseaseRecommendationBase):
    pass

class DiseaseRecommendationUpdate(BaseModel):
    action_title: Optional[str] = None
    action_title_tl: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    management_type: Optional[str] = None

class DiseaseRecommendationOut(DiseaseRecommendationBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DiseaseBase(BaseModel):
    name: str
    name_tl: Optional[str] = None
    scientific_name: Optional[str] = None
    pathogen_type: Optional[str] = "Fungal"  # Fungal, Bacterial, Viral, Nematode, Oomycete
    description: Optional[str] = None
    description_tl: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_tl: Optional[str] = None
    severity_default: Optional[str] = "Moderate"

class DiseaseCreate(DiseaseBase):
    pass

class DiseaseUpdate(BaseModel):
    name: Optional[str] = None
    name_tl: Optional[str] = None
    scientific_name: Optional[str] = None
    pathogen_type: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    symptoms: Optional[str] = None
    symptoms_tl: Optional[str] = None
    severity_default: Optional[str] = None

class CropDiseaseLinkRequest(BaseModel):
    crop_id: int
    disease_id: int
    notes: Optional[str] = None

class DiseaseOut(DiseaseBase):
    id: int
    created_at: datetime
    updated_at: datetime
    recommendations: List[DiseaseRecommendationOut] = []

    model_config = ConfigDict(from_attributes=True)

