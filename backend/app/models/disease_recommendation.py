from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class DiseaseRecommendation(Base):
    __tablename__ = "disease_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    disease_id = Column(Integer, ForeignKey("diseases.id", ondelete="CASCADE"), nullable=False)
    action_title = Column(String(200), nullable=False)
    action_title_tl = Column(String(200), nullable=True)
    description = Column(Text, nullable=False)
    description_tl = Column(Text, nullable=True)
    management_type = Column(String(50), default="Preventative")  # Cultural, Chemical, Biological, Preventative
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    disease = relationship("Disease", back_populates="recommendations")

