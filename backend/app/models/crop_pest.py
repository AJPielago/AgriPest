from sqlalchemy import Column, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.db import Base

class CropPest(Base):
    __tablename__ = "crop_pests"
    __table_args__ = (UniqueConstraint("crop_id", "pest_id", name="unique_crop_pest"),)

    id = Column(Integer, primary_key=True, index=True)
    crop_id = Column(Integer, ForeignKey("crops.id", ondelete="CASCADE"), nullable=False)
    pest_id = Column(Integer, ForeignKey("pests.id", ondelete="CASCADE"), nullable=False)
    notes = Column(Text, nullable=True)

    crop = relationship("Crop", back_populates="crop_pests")
    pest = relationship("Pest", back_populates="crop_pests")
