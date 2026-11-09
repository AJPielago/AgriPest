import random
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.detection.base import BaseDetectionService
from app.models.pest import Pest
from app.models.disease import Disease
from app.models.crop import Crop

class MockDetectionService(BaseDetectionService):
    """
    Mock Detection Engine for Development & Pre-ML Demonstration Phase.
    Generates realistic detection outputs containing BOTH Pest Detection and Plant Disease Detection.
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

    DEFAULT_SAMPLE_DISEASES = [
        {
            "name": "Northern Corn Leaf Blight",
            "scientific_name": "Exserohilum turcicum",
            "pathogen_type": "Fungal",
            "severity": "High",
            "symptoms": "Long, elliptical grayish-green or tan lesions running parallel to leaf veins.",
            "description": "Destructive foliar fungal disease causing premature leaf death and yield reduction in humid weather.",
            "recommended_action": "Apply targeted foliar fungicide (Azoxystrobin + Difenoconazole) at first sign of lower canopy lesions. Ensure adequate row spacing and crop residue management."
        },
        {
            "name": "Rice Blast",
            "scientific_name": "Magnaporthe oryzae",
            "pathogen_type": "Fungal",
            "severity": "Critical",
            "symptoms": "Spindle-shaped or diamond leaf spots with grey or white centers and reddish-brown borders.",
            "description": "Severe fungal pathogen affecting rice foliage, collars, and panicle necks under prolonged leaf wetness.",
            "recommended_action": "Maintain continuous shallow flooding in paddies. Apply systemic fungicide (Tricyclazole) at tillering and early heading."
        },
        {
            "name": "Bacterial Leaf Blight of Rice",
            "scientific_name": "Xanthomonas oryzae pv. oryzae",
            "pathogen_type": "Bacterial",
            "severity": "High",
            "symptoms": "Water-soaked lesions on leaf tips merging into wavy, yellow-white necrotic streaks.",
            "description": "Vascular bacterial infection transmitted through water droplets and wounds during stormy weather.",
            "recommended_action": "Drain excess standing paddy water. Avoid high nitrogen fertilizer during outbreak. Spray copper hydroxide bactericide."
        },
        {
            "name": "Black Rot of Cabbage",
            "scientific_name": "Xanthomonas campestris pv. campestris",
            "pathogen_type": "Bacterial",
            "severity": "Moderate",
            "symptoms": "Distinct V-shaped yellow chlorotic lesions starting at leaf margins with darkened leaf veins.",
            "description": "Seed-borne bacterial pathogen entering hydathodes along leaf margins, spreading via rain splash.",
            "recommended_action": "Practice minimum 2-year crop rotation with non-crucifers. Apply copper hydroxide spray and sanitize field tools."
        },
        {
            "name": "Common Rust of Corn",
            "scientific_name": "Puccinia sorghi",
            "pathogen_type": "Fungal",
            "severity": "Moderate",
            "symptoms": "Small cinnamon-brown to golden powdery pustules scattered across both upper and lower leaf surfaces.",
            "description": "Airborne fungal spore pathogen favored by cool, moist conditions with heavy dew formation.",
            "recommended_action": "Plant resistant hybrid varieties. Apply foliar triazole fungicide if pustules reach upper leaves before tasseling."
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
        db_diseases = []

        if db and crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id).first()
            if crop:
                crop_name = crop.name
                if crop.crop_pests:
                    crop_linked_pests = [cp.pest for cp in crop.crop_pests if cp.pest]
                    if crop_linked_pests:
                        db_pests = crop_linked_pests
                if hasattr(crop, 'crop_diseases') and crop.crop_diseases:
                    crop_linked_diseases = [cd.disease for cd in crop.crop_diseases if cd.disease]
                    if crop_linked_diseases:
                        db_diseases = crop_linked_diseases

        # Fall back to all database pests/diseases if no crop-specific links exist
        if not db_pests and db:
            db_pests = db.query(Pest).all()
        if not db_diseases and db:
            db_diseases = db.query(Disease).all()

        # 1. Resolve Pest Assessment
        if db_pests:
            selected_pest = random.choice(db_pests)
            rec_text = (
                selected_pest.recommendations[0].description 
                if selected_pest.recommendations 
                else "Inspect crop thoroughly and apply recommended IPM protocols."
            )
            pest_data = {
                "pest_id": selected_pest.id,
                "pest_name": selected_pest.name,
                "scientific_name": selected_pest.scientific_name or "Unknown",
                "severity": selected_pest.severity_default or "Moderate",
                "description": selected_pest.description or "No description available.",
                "recommended_action": rec_text,
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

        # 2. Resolve Disease Assessment (Always included along with pest detection)
        if db_diseases:
            selected_disease = random.choice(db_diseases)
            dis_rec_text = (
                selected_disease.recommendations[0].description
                if selected_disease.recommendations
                else "Implement preventative fungicide or bactericide spray and sanitation."
            )
            disease_data = {
                "disease_id": selected_disease.id,
                "disease_name": selected_disease.name,
                "scientific_name": selected_disease.scientific_name or "Unknown",
                "pathogen_type": selected_disease.pathogen_type or "Fungal",
                "severity": selected_disease.severity_default or "Moderate",
                "symptoms": selected_disease.symptoms or "Foliar lesions visible.",
                "description": selected_disease.description or "Plant pathogen foliar disease.",
                "recommended_action": dis_rec_text,
            }
        else:
            sample_dis = random.choice(self.DEFAULT_SAMPLE_DISEASES)
            disease_data = {
                "disease_id": None,
                "disease_name": sample_dis["name"],
                "scientific_name": sample_dis["scientific_name"],
                "pathogen_type": sample_dis["pathogen_type"],
                "severity": sample_dis["severity"],
                "symptoms": sample_dis["symptoms"],
                "description": sample_dis["description"],
                "recommended_action": sample_dis["recommended_action"],
            }

        # Realistic confidence scores
        pest_confidence = round(random.uniform(0.85, 0.98), 2)
        disease_confidence = round(random.uniform(0.82, 0.96), 2)

        # Dual bounding boxes for both pest insect and plant disease lesion
        mock_bbox = [
            {
                "x_min": 0.18,
                "y_min": 0.28,
                "x_max": 0.52,
                "y_max": 0.65,
                "label": f"Pest: {pest_data['pest_name']}",
                "type": "pest",
                "confidence": pest_confidence
            },
            {
                "x_min": 0.56,
                "y_min": 0.35,
                "x_max": 0.88,
                "y_max": 0.78,
                "label": f"Disease: {disease_data['disease_name']}",
                "type": "disease",
                "confidence": disease_confidence
            }
        ]

        return {
            "detection_type": "pest_and_disease",
            "crop_id": crop_id,
            "crop_name": crop_name,

            # Pest Detection Fields
            "pest_id": pest_data["pest_id"],
            "pest_name": pest_data["pest_name"],
            "scientific_name": pest_data["scientific_name"],
            "confidence": pest_confidence,
            "severity": pest_data["severity"],
            "description": pest_data["description"],
            "recommended_action": pest_data["recommended_action"],

            # Disease Detection Fields (Always included)
            "disease_id": disease_data["disease_id"],
            "detected_disease_name": disease_data["disease_name"],
            "disease_scientific_name": disease_data["scientific_name"],
            "disease_pathogen_type": disease_data["pathogen_type"],
            "disease_confidence_score": disease_confidence,
            "disease_severity": disease_data["severity"],
            "disease_symptoms": disease_data["symptoms"],
            "disease_recommended_action": disease_data["recommended_action"],
            "disease_details": {
                "name": disease_data["disease_name"],
                "scientific_name": disease_data["scientific_name"],
                "pathogen_type": disease_data["pathogen_type"],
                "severity": disease_data["severity"],
                "symptoms": disease_data["symptoms"],
                "description": disease_data["description"],
                "recommended_action": disease_data["recommended_action"],
                "confidence": disease_confidence
            },

            "bounding_boxes": mock_bbox
        }

    async def check_live_frame(
        self,
        image_path: str,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Pre-screening simulation for live camera stream polling detecting both pests and diseases."""
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
            "disease_detected": True,
            "confidence": confidence,
            "crop_name": crop_name,
            "bounding_boxes": [
                {
                    "x_min": 0.20,
                    "y_min": 0.25,
                    "x_max": 0.70,
                    "y_max": 0.75,
                    "label": f"{crop_name} Leaf (Pest & Disease Active)",
                    "type": "specimen",
                    "confidence": confidence
                }
            ],
            "message": "Crop specimen recognized. Dual pest & disease scan active."
        }
