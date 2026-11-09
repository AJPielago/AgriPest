from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from app.core.db import Base

class Disease(Base):
    __tablename__ = "diseases"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), unique=True, nullable=False, index=True)
    name_tl = Column(String(150), nullable=True)
    scientific_name = Column(String(150), nullable=True)
    pathogen_type = Column(String(50), default="Fungal")  # Fungal, Bacterial, Viral, Nematode, Oomycete
    description = Column(Text, nullable=True)
    description_tl = Column(Text, nullable=True)
    symptoms = Column(Text, nullable=True)
    symptoms_tl = Column(Text, nullable=True)
    severity_default = Column(String(50), default="Moderate")  # Low, Moderate, High, Critical
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    crop_diseases = relationship("CropDisease", back_populates="disease", cascade="all, delete-orphan")
    recommendations = relationship("DiseaseRecommendation", back_populates="disease", cascade="all, delete-orphan")
    detections = relationship("Detection", back_populates="disease")

