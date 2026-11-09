from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.db import Base

class Crop(Base):
    __tablename__ = "crops"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    name_tl = Column(String(100), nullable=True)
    scientific_name = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    description_tl = Column(Text, nullable=True)
    status = Column(String(20), default="active")  # 'active', 'inactive'
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    crop_pests = relationship("CropPest", back_populates="crop", cascade="all, delete-orphan")
    crop_diseases = relationship("CropDisease", back_populates="crop", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="crop")
