import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.detection.base import BaseDetectionService
from app.models.pest import Pest
from app.models.crop import Crop

class MockDetectionService(BaseDetectionService):
    """
    Mock Detection Engine for Development & Pre-ML Demonstration Phase.
    Generates realistic detection outputs using database pests or sample fallback data.
    """

    DEFAULT_SAMPLE_PESTS = [
        {
            "name": "Fall Armyworm",
            "scientific_name": "Spodoptera frugiperda",
            "severity": "High",
            "description": "Larvae attack foliage, stems, and reproductive structures of host plants.",
            "recommended_action": "Inspect plant whorls immediately. Apply biological control (Bacillus thuringiensis) or recommended bio-pesticides early in infestation."
        },
        {
            "name": "Corn Earworm / Tomato Fruitworm",
            "scientific_name": "Helicoverpa zea",
            "severity": "Moderate",
            "description": "Feeds on leaves, buds, and fruits causing severe cosmetic and yield loss.",
            "recommended_action": "Remove affected fruits/leaves. Utilize pheromone traps and target young larvae before fruit entry."
        },
        {
            "name": "Aphids (Plant Lice)",
            "scientific_name": "Aphidoidea spp.",
            "severity": "Moderate",
            "description": "Small sap-sucking insects that cause leaf curling, stunting, and soot mold growth.",
            "recommended_action": "Apply insecticidal soap or neem oil spray. Encourage natural predators like ladybugs."
        },
        {
            "name": "Leafminer",
            "scientific_name": "Liriomyza spp.",
            "severity": "Low",
            "description": "Larvae bore winding trails inside leaves, reducing photosynthesis capacity.",
            "recommended_action": "Pick off affected leaves with visible trails. Use yellow sticky traps to monitor adult flies."
        }
    ]

    async def analyze_image(
        self, 
        image_path: str, 
        crop_id: Optional[int] = None, 
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        
        crop_name = "Configurable Target Crop"
        db_pests = []
        if db and crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id).first()
            if crop:
                crop_name = crop.name
                if crop.crop_pests:
                    crop_linked_pests = [cp.pest for cp in crop.crop_pests if cp.pest]
                    if crop_linked_pests:
                        db_pests = crop_linked_pests

        # Fall back to all database pests if no crop-specific links exist
        if not db_pests and db:
            db_pests = db.query(Pest).all()

        if db_pests:
            selected_pest = random.choice(db_pests)
            recommendation_text = (
                selected_pest.recommendations[0].description 
                if selected_pest.recommendations 
                else "Inspect crop thoroughly and consult local agricultural extensión office."
            )
            pest_data = {
                "pest_id": selected_pest.id,
                "pest_name": selected_pest.name,
                "scientific_name": selected_pest.scientific_name or "Unknown",
                "severity": selected_pest.severity_default or "Moderate",
                "description": selected_pest.description or "No description available.",
                "recommended_action": recommendation_text,
            }
        else:
            sample = random.choice(self.DEFAULT_SAMPLE_PESTS)
            pest_data = {
                "pest_id": None,
                "pest_name": sample["name"],
                "scientific_name": sample["scientific_name"],
                "severity": sample["severity"],
                "description": sample["description"],
                "recommended_action": sample["recommended_action"],
            }

        # Generate realistic confidence score (between 0.82 and 0.98)
        confidence = round(random.uniform(0.82, 0.98), 2)

        # Generate mock object detection bounding box (formatted for standard 100x100 relative grid)
        mock_bbox = [
            {
                "x_min": 0.22,
                "y_min": 0.30,
                "x_max": 0.65,
                "y_max": 0.75,
                "label": pest_data["pest_name"],
                "confidence": confidence
            }
        ]

        return {
            "pest_id": pest_data["pest_id"],
            "pest_name": pest_data["pest_name"],
            "scientific_name": pest_data["scientific_name"],
            "confidence": confidence,
            "severity": pest_data["severity"],
            "description": pest_data["description"],
            "recommended_action": pest_data["recommended_action"],
            "crop_id": crop_id,
            "crop_name": crop_name,
            "bounding_boxes": mock_bbox
        }

    async def check_live_frame(
        self,
        image_path: str,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Pre-screening simulation for live camera stream polling."""
        confidence = round(random.uniform(0.85, 0.97), 2)
        crop_name = "Target Crop"
        if db and crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id).first()
            if crop:
                crop_name = crop.name

        return {
            "detected": True,
            "crop_recognized": True,
            "pest_detected": True,
            "confidence": confidence,
            "crop_name": crop_name,
            "bounding_boxes": [
                {
                    "x_min": 0.20,
                    "y_min": 0.25,
                    "x_max": 0.70,
                    "y_max": 0.75,
                    "label": f"{crop_name} Leaf Specimen",
                    "confidence": confidence
                }
            ],
            "message": "Crop specimen recognized. Hold steady for auto-capture."
        }

