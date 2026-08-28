from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.core.db import Base

class Detection(Base):
    __tablename__ = "detections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    crop_id = Column(Integer, ForeignKey("crops.id", ondelete="SET NULL"), nullable=True)
    pest_id = Column(Integer, ForeignKey("pests.id", ondelete="SET NULL"), nullable=True)
    
    image_path = Column(String(500), nullable=False)
    confidence_score = Column(Float, nullable=False)
    severity = Column(String(50), nullable=False, default="Moderate")  # Low, Moderate, High, Critical
    detected_pest_name = Column(String(150), nullable=False)
    recommended_action = Column(Text, nullable=False)
    bounding_boxes = Column(JSON, nullable=True, default=list)
    status = Column(String(50), default="completed")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Domain Context & Environmental Metadata
    weather_condition = Column(String(100), nullable=True)  # Sunny, Rainy, Humid, Overcast, etc.
    field_location = Column(String(255), nullable=True)     # Barangay / Field ID / Farm Location

    # Farmer Feedback Loop (Ground Truth for Model Retraining)
    feedback_accurate = Column(Boolean, nullable=True)     # True = Correct, False = Incorrect
    feedback_notes = Column(Text, nullable=True)            # Farmer ground-truth notes / actual pest species name

    user = relationship("User", back_populates="detections")
    crop = relationship("Crop", back_populates="detections")
    pest = relationship("Pest", back_populates="detections")
