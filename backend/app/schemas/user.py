from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str
    role_id: Optional[int] = 2  # Default to farmer

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None
    role_id: Optional[int] = None

class UserOut(UserBase):
    id: int
    role_id: int
    is_active: bool
    created_at: datetime
    role: Optional[RoleOut] = None

    model_config = ConfigDict(from_attributes=True)
