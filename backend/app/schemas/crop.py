from datetime import datetime
from pydantic import BaseModel, ConfigDict
from typing import Optional

class CropBase(BaseModel):
    name: str
    name_tl: Optional[str] = None
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    status: Optional[str] = "active"

class CropCreate(CropBase):
    pass

class CropUpdate(BaseModel):
    name: Optional[str] = None
    name_tl: Optional[str] = None
    scientific_name: Optional[str] = None
    description: Optional[str] = None
    description_tl: Optional[str] = None
    status: Optional[str] = None

class CropOut(CropBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
