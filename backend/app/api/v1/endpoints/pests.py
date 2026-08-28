from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.pest import Pest
from app.models.crop import Crop
from app.models.crop_pest import CropPest
from app.models.recommendation import Recommendation
from app.models.user import User
from app.schemas.pest import PestOut, PestCreate, PestUpdate, CropPestLinkRequest
from app.schemas.recommendation import RecommendationOut, RecommendationCreate, RecommendationUpdate

router = APIRouter()

@router.get("", response_model=List[PestOut])
def list_pests(crop_id: Optional[int] = None, db: Session = Depends(get_db)):
    """List pests. Optionally filter by crop_id."""
    if crop_id:
        pests = db.query(Pest).join(CropPest).filter(CropPest.crop_id == crop_id).all()
        return pests
    return db.query(Pest).all()

@router.get("/{pest_id}", response_model=PestOut)
def get_pest(pest_id: int, db: Session = Depends(get_db)):
    pest = db.query(Pest).filter(Pest.id == pest_id).first()
    if not pest:
        raise HTTPException(status_code=404, detail="Pest record not found.")
    return pest

@router.post("", response_model=PestOut, status_code=status.HTTP_201_CREATED)
def create_pest(
    pest_in: PestCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    existing = db.query(Pest).filter(Pest.name.ilike(pest_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Pest '{pest_in.name}' already exists.")
    
    pest = Pest(
        name=pest_in.name,
        scientific_name=pest_in.scientific_name,
        description=pest_in.description,
        symptoms=pest_in.symptoms,
        severity_default=pest_in.severity_default or "Moderate"
    )
    db.add(pest)
    db.commit()
    db.refresh(pest)
    return pest

@router.put("/{pest_id}", response_model=PestOut)
def update_pest(
    pest_id: int, 
    pest_in: PestUpdate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    pest = db.query(Pest).filter(Pest.id == pest_id).first()
    if not pest:
        raise HTTPException(status_code=404, detail="Pest not found.")
    
    if pest_in.name is not None:
        pest.name = pest_in.name
    if pest_in.scientific_name is not None:
        pest.scientific_name = pest_in.scientific_name
    if pest_in.description is not None:
        pest.description = pest_in.description
    if pest_in.symptoms is not None:
        pest.symptoms = pest_in.symptoms
    if pest_in.severity_default is not None:
        pest.severity_default = pest_in.severity_default

    db.commit()
    db.refresh(pest)
    return pest

@router.delete("/{pest_id}")
def delete_pest(
    pest_id: int, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    pest = db.query(Pest).filter(Pest.id == pest_id).first()
    if not pest:
        raise HTTPException(status_code=404, detail="Pest not found.")
    db.delete(pest)
    db.commit()
    return {"detail": "Pest record deleted successfully."}

# Crop-Pest Association
@router.post("/link-crop", status_code=status.HTTP_201_CREATED)
def link_pest_to_crop(
    link_req: CropPestLinkRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    crop = db.query(Crop).filter(Crop.id == link_req.crop_id).first()
    pest = db.query(Pest).filter(Pest.id == link_req.pest_id).first()
    if not crop or not pest:
        raise HTTPException(status_code=404, detail="Crop or Pest not found.")

    existing_link = db.query(CropPest).filter(
        CropPest.crop_id == link_req.crop_id,
        CropPest.pest_id == link_req.pest_id
    ).first()

    if existing_link:
        return {"detail": "Association already exists."}

    crop_pest = CropPest(crop_id=link_req.crop_id, pest_id=link_req.pest_id, notes=link_req.notes)
    db.add(crop_pest)
    db.commit()
    return {"detail": f"Linked pest '{pest.name}' to crop '{crop.name}' successfully."}

# Recommendation endpoints
@router.post("/{pest_id}/recommendations", response_model=RecommendationOut, status_code=status.HTTP_201_CREATED)
def add_recommendation(
    pest_id: int,
    rec_in: RecommendationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    pest = db.query(Pest).filter(Pest.id == pest_id).first()
    if not pest:
        raise HTTPException(status_code=404, detail="Pest not found.")
    
    rec = Recommendation(
        pest_id=pest_id,
        action_title=rec_in.action_title,
        description=rec_in.description,
        management_type=rec_in.management_type or "Preventative"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec
