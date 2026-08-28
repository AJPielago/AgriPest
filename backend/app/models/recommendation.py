from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    pest_id = Column(Integer, ForeignKey("pests.id", ondelete="CASCADE"), nullable=False)
    action_title = Column(String(200), nullable=False)
    action_title_tl = Column(String(200), nullable=True)
    description = Column(Text, nullable=False)
    description_tl = Column(Text, nullable=True)
    management_type = Column(String(50), default="Preventative")  # Cultural, Chemical, Biological, Preventative
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pest = relationship("Pest", back_populates="recommendations")
