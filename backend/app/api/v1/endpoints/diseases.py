from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.disease import Disease
from app.models.crop import Crop
from app.models.crop_disease import CropDisease
from app.models.disease_recommendation import DiseaseRecommendation
from app.models.user import User
from app.schemas.disease import (
    DiseaseOut, DiseaseCreate, DiseaseUpdate, CropDiseaseLinkRequest,
    DiseaseRecommendationOut, DiseaseRecommendationCreate, DiseaseRecommendationUpdate
)

router = APIRouter()

@router.get("", response_model=List[DiseaseOut])
def list_diseases(
    crop_id: Optional[int] = None, 
    pathogen_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List plant diseases. Optionally filter by crop_id or pathogen_type."""
    query = db.query(Disease)
    if crop_id:
        query = query.join(CropDisease).filter(CropDisease.crop_id == crop_id)
    if pathogen_type:
        query = query.filter(Disease.pathogen_type.ilike(pathogen_type))
    return query.all()

@router.get("/{disease_id}", response_model=DiseaseOut)
def get_disease(disease_id: int, db: Session = Depends(get_db)):
    """Retrieve full catalog details for a single disease species."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease record not found.")
    return disease

@router.post("", response_model=DiseaseOut, status_code=status.HTTP_201_CREATED)
def create_disease(
    disease_in: DiseaseCreate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    """Create a new crop disease entry (Administrator only)."""
    existing = db.query(Disease).filter(Disease.name.ilike(disease_in.name)).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Disease '{disease_in.name}' already exists.")
    
    disease = Disease(
        name=disease_in.name,
        name_tl=disease_in.name_tl,
        scientific_name=disease_in.scientific_name,
        pathogen_type=disease_in.pathogen_type or "Fungal",
        description=disease_in.description,
        description_tl=disease_in.description_tl,
        symptoms=disease_in.symptoms,
        symptoms_tl=disease_in.symptoms_tl,
        severity_default=disease_in.severity_default or "Moderate"
    )
    db.add(disease)
    db.commit()
    db.refresh(disease)
    return disease

@router.put("/{disease_id}", response_model=DiseaseOut)
def update_disease(
    disease_id: int, 
    disease_in: DiseaseUpdate, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    """Update an existing disease record (Administrator only)."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found.")
    
    if disease_in.name is not None:
        disease.name = disease_in.name
    if disease_in.name_tl is not None:
        disease.name_tl = disease_in.name_tl
    if disease_in.scientific_name is not None:
        disease.scientific_name = disease_in.scientific_name
    if disease_in.pathogen_type is not None:
        disease.pathogen_type = disease_in.pathogen_type
    if disease_in.description is not None:
        disease.description = disease_in.description
    if disease_in.description_tl is not None:
        disease.description_tl = disease_in.description_tl
    if disease_in.symptoms is not None:
        disease.symptoms = disease_in.symptoms
    if disease_in.symptoms_tl is not None:
        disease.symptoms_tl = disease_in.symptoms_tl
    if disease_in.severity_default is not None:
        disease.severity_default = disease_in.severity_default

    db.commit()
    db.refresh(disease)
    return disease

@router.delete("/{disease_id}")
def delete_disease(
    disease_id: int, 
    db: Session = Depends(get_db), 
    admin: User = Depends(get_current_admin)
):
    """Delete a disease record (Administrator only)."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found.")
    db.delete(disease)
    db.commit()
    return {"detail": "Disease record deleted successfully."}

@router.post("/link-crop", status_code=status.HTTP_201_CREATED)
def link_disease_to_crop(
    link_req: CropDiseaseLinkRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Associate a host crop to a vulnerable disease."""
    crop = db.query(Crop).filter(Crop.id == link_req.crop_id).first()
    disease = db.query(Disease).filter(Disease.id == link_req.disease_id).first()
    if not crop or not disease:
        raise HTTPException(status_code=404, detail="Crop or Disease not found.")

    existing_link = db.query(CropDisease).filter(
        CropDisease.crop_id == link_req.crop_id,
        CropDisease.disease_id == link_req.disease_id
    ).first()

    if existing_link:
        return {"detail": "Association already exists."}

    crop_disease = CropDisease(crop_id=link_req.crop_id, disease_id=link_req.disease_id, notes=link_req.notes)
    db.add(crop_disease)
    db.commit()
    return {"detail": f"Linked disease '{disease.name}' to crop '{crop.name}' successfully."}

@router.post("/{disease_id}/recommendations", response_model=DiseaseRecommendationOut, status_code=status.HTTP_201_CREATED)
def add_disease_recommendation(
    disease_id: int,
    rec_in: DiseaseRecommendationCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    """Add targeted IPM or treatment recommendation to a disease entry."""
    disease = db.query(Disease).filter(Disease.id == disease_id).first()
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found.")
    
    rec = DiseaseRecommendation(
        disease_id=disease_id,
        action_title=rec_in.action_title,
        action_title_tl=rec_in.action_title_tl,
        description=rec_in.description,
        description_tl=rec_in.description_tl,
        management_type=rec_in.management_type or "Preventative"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec

