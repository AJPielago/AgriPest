from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.crop import Crop
from app.models.user import User
from app.schemas.crop import CropOut, CropCreate, CropUpdate

router = APIRouter()

@router.get("", response_model=List[CropOut])
def list_crops(db: Session = Depends(get_db)):
    """List all available active crops."""
    return db.query(Crop).filter(Crop.status == "active").all()

@router.get("/all", response_model=List[CropOut])
def list_all_crops(db: Session = Depends(get_db), admin: User = Depends(get_current_admin)):
    """List all crops including inactive ones (Admin only)."""
    return db.query(Crop).all()

@router.post("", response_model=CropOut, status_code=status.HTTP_201_CREATED)
def create_crop(
    crop_in: CropCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    existing = db.query(Crop).filter(Crop.name.ilike(crop_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Crop '{crop_in.name}' already exists.")
    
    crop = Crop(
        name=crop_in.name,
        scientific_name=crop_in.scientific_name,
        description=crop_in.description,
        status=crop_in.status or "active"
    )
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop

@router.put("/{crop_id}", response_model=CropOut)
def update_crop(
    crop_id: int, 
    crop_in: CropUpdate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    crop = db.query(Crop).filter(Crop.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found.")
    
    if crop_in.name is not None:
        crop.name = crop_in.name
    if crop_in.scientific_name is not None:
        crop.scientific_name = crop_in.scientific_name
    if crop_in.description is not None:
        crop.description = crop_in.description
    if crop_in.status is not None:
        crop.status = crop_in.status

    db.commit()
    db.refresh(crop)
    return crop

@router.delete("/{crop_id}")
def delete_crop(
    crop_id: int, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    crop = db.query(Crop).filter(Crop.id == crop_id).first()
    if not crop:
        raise HTTPException(status_code=404, detail="Crop not found.")
    db.delete(crop)
    db.commit()
    return {"detail": "Crop deleted successfully."}
