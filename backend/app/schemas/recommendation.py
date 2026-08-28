from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class RecommendationBase(BaseModel):
    pest_id: int
    action_title: str
    action_title_tl: Optional[str] = None
    description: str
    description_tl: Optional[str] = None
    management_type: Optional[str] = "Preventative"

class RecommendationCreate(RecommendationBase):
    pass

class RecommendationUpdate(BaseModel):
    action_title: Optional[str] = None
    action_title_tl: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    management_type: Optional[str] = None

class RecommendationOut(RecommendationBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
