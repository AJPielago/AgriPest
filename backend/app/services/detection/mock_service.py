import hashlib
import os
import random
from typing import Any, Dict, Optional

import numpy as np
from PIL import Image
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.crop import Crop
from app.models.disease import Disease
from app.models.pest import Pest
from app.services.detection.base import BaseDetectionService


class MockDetectionService(BaseDetectionService):
    """
    Logical Mock Detection Engine for Development & Pre-ML Demonstration.
    Unlike legacy behavior, this mock:
      - Rejects invalid tiny/blank-black images instead of accepting anything.
      - Does NOT force every scan to return both 1 pest AND 1 disease; instead it
        produces realistic 4-state outcomes ('pest', 'disease', 'healthy', 'pest_and_disease')
        strictly filtered to the selected leafy green's linked pests/diseases.
    """

    DEFAULT_SAMPLE_PESTS = [
        {
            "name": "Green Peach Aphid",
            "scientific_name": "Myzus persicae",
            "severity": "Moderate",
            "description": "Small sap-sucking insects colonizing the undersides of lettuce and brassica leaves, causing leaf curling and sooty mold.",
            "recommended_action": "Apply cold-pressed neem oil spray (5ml/L) or potassium salts of fatty acids. Conserve predatory ladybugs.",
        },
        {
            "name": "Diamondback Moth",
            "scientific_name": "Plutella xylostella",
            "severity": "High",
            "description": "Slender pale green caterpillar larvae chewing windowpane holes in bok choy and mustard greens foliage.",
            "recommended_action": "Deploy sticky pheromone delta traps and spray selective Bacillus thuringiensis (Bt) kurstaki at dusk.",
        },
        {
            "name": "Striped Flea Beetle",
            "scientific_name": "Phyllotreta striolata",
            "severity": "High",
            "description": "Small jumping beetles puncturing young seedlings and foliage of bok choy and mustard greens with sieve-like shot-holes.",
            "recommended_action": "Install 32-mesh fine insect netting over beds and dust food-grade diatomaceous earth around seedling stems.",
        },
        {
            "name": "Cabbage Looper",
            "scientific_name": "Trichoplusia ni",
            "severity": "Moderate",
            "description": "Smooth green inchworm caterpillar devouring irregular ragged chew holes across salad green foliage.",
            "recommended_action": "Apply biological Bacillus thuringiensis (Bt) spray thoroughly to both leaf surfaces during evening twilight.",
        },
        {
            "name": "Serpentine Leafminer",
            "scientific_name": "Liriomyza trifolii",
            "severity": "Low",
            "description": "Larvae boring winding silvery-white trails inside lettuce and brassica leaf tissue, reducing photosynthetic capacity.",
            "recommended_action": "Manually prune early mined leaves and deploy yellow sticky card traps at canopy height.",
        },
    ]

    DEFAULT_SAMPLE_DISEASES = [
        {
            "name": "Downy Mildew of Lettuce",
            "scientific_name": "Bremia lactucae",
            "pathogen_type": "Fungal",
            "severity": "High",
            "symptoms": "Pale yellow angular chlorotic spots bounded sharply by veins with white downy mold underneath.",
            "description": "Aggressive oomycete foliar disease thriving in humid highland microclimates.",
            "recommended_action": "Ensure 30cm spacing for canopy airflow; irrigate with drip systems and apply protectant bio-fungicide (Trichoderma).",
        },
        {
            "name": "Black Rot of Brassicas",
            "scientific_name": "Xanthomonas campestris pv. campestris",
            "pathogen_type": "Bacterial",
            "severity": "Moderate",
            "symptoms": "Distinct V-shaped yellow chlorotic lesions starting at leaf margins with blackened veins.",
            "description": "Destructive seed-borne bacterial pathogen entering hydathodes along leaf margins of bok choy and mustard greens.",
            "recommended_action": "Practice crop rotation with non-brassicas. Apply preventative copper hydroxide spray and sanitize tools.",
        },
        {
            "name": "Bacterial Soft Rot",
            "scientific_name": "Pectobacterium carotovorum",
            "pathogen_type": "Bacterial",
            "severity": "Critical",
            "symptoms": "Water-soaked translucent lesions on petioles rapidly advancing into slimy liquefied plant tissue.",
            "description": "Fast-moving bacterial disease causing foul-smelling collapse of succulent leafy green crowns.",
            "recommended_action": "Improve drainage; harvest only dry heads; disinfect harvest knives in bleach solution.",
        },
        {
            "name": "Alternaria Leaf Spot of Brassicas",
            "scientific_name": "Alternaria brassicae",
            "pathogen_type": "Fungal",
            "severity": "Moderate",
            "symptoms": "Concentric target-like circular necrotic brown lesions surrounded by yellow halos.",
            "description": "Airborne fungal pathogen producing expanding spots on bok choy and mustard greens.",
            "recommended_action": "Remove affected outer foliage. Apply preventative copper or contact protectant sprays.",
        },
        {
            "name": "White Rust of Crucifers",
            "scientific_name": "Albugo candida",
            "pathogen_type": "Fungal",
            "severity": "Moderate",
            "symptoms": "Raised porcelain-white chalky blisters on leaf undersides with corresponding pale yellow patches above.",
            "description": "Oomycete pathogen affecting mustard greens and Asian crucifers in cool dewy mornings.",
            "recommended_action": "Eradicate wild weed hosts. Maintain canopy air circulation and spray approved bio-fungicides.",
        },
    ]

    def _resolve_disk_path(self, image_path: Optional[str]) -> Optional[str]:
        if not image_path:
            return None
        if os.path.exists(image_path):
            return image_path
        prefix = "/static/uploads/"
        if image_path.startswith(prefix):
            rel = image_path[len(prefix):].lstrip("/\\")
            candidate = os.path.join(settings.UPLOAD_DIR, rel)
            if os.path.exists(candidate):
                return candidate
        return None

    def _check_mock_foliage_gate(self, image_obj: Optional[Image.Image] = None, image_path: Optional[str] = None) -> Optional[str]:
        """Rejects obviously non-leafy / blank-black / tiny images even in mock mode."""
        im = image_obj
        should_close = False
        if im is None:
            disk_path = self._resolve_disk_path(image_path)
            if not disk_path:
                return None
            try:
                im = Image.open(disk_path).convert("RGB")
                should_close = True
            except Exception:
                return "Uploaded image file could not be decoded."
        else:
            im = im.convert("RGB")

        try:
            w, h = im.size
            if w < 32 or h < 32:
                return "Image resolution is too small. Please scan a clear photo of Lettuce, Bok Choy, or Mustard Greens."
            small = im.resize((48, 48), Image.Resampling.BILINEAR)
            hsv_arr = np.asarray(small.convert("HSV"), dtype=np.uint8)
            hue, sat, val = hsv_arr[:, :, 0], hsv_arr[:, :, 1], hsv_arr[:, :, 2]
            foliage_ratio = float(((hue >= 18) & (hue <= 128) & (sat >= 30) & (val >= 28)).mean())
            if foliage_ratio < 0.08:
                return (
                    "Unrecognized specimen: No leafy green foliage detected. "
                    "Please scan only Lettuce (Litsugas), Bok Choy (Petsay), or Mustard Greens (Mustasa)."
                )
            return None
        finally:
            if should_close:
                im.close()

    def _pick_outcome_mode(self, image_path: str) -> str:
        """
        Deterministically selects a realistic outcome mode from the uploaded filename hash
        so scans reflect real field diversity instead of always forcing 1 pest + 1 disease:
          - ~35% pest only
          - ~35% disease only
          - ~15% healthy crop
          - ~15% pest_and_disease
        """
        digest = hashlib.sha256((image_path or "mock").encode("utf-8")).digest()
        bucket = digest[0] % 20
        if bucket < 7:
            return "pest"
        if bucket < 14:
            return "disease"
        if bucket < 17:
            return "healthy"
        return "pest_and_disease"

    async def analyze_image(
        self,
        image_path: str,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        rejection = self._check_mock_foliage_gate(image_path=image_path)
        if rejection:
            return {
                "rejected": True,
                "http_status": 422,
                "rejection_reason": rejection,
                "detection_type": "rejected",
                "confidence": 0.0,
                "bounding_boxes": [],
            }

        crop_name = "Lettuce"
        db_pests = []
        db_diseases = []

        if db and crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id).first()
            if crop:
                crop_name = crop.name
                if crop.crop_pests:
                    db_pests = [cp.pest for cp in crop.crop_pests if cp.pest]
                if hasattr(crop, "crop_diseases") and crop.crop_diseases:
                    db_diseases = [cd.disease for cd in crop.crop_diseases if cd.disease]

        if not db_pests and db:
            db_pests = db.query(Pest).all()
        if not db_diseases and db:
            db_diseases = db.query(Disease).all()

        outcome = self._pick_outcome_mode(image_path)

        # Resolve candidate pest
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

        # Resolve candidate disease
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

        pest_confidence = round(random.uniform(0.84, 0.96), 2)
        disease_confidence = round(random.uniform(0.82, 0.95), 2)

        if outcome == "healthy":
            healthy_conf = round(random.uniform(0.88, 0.97), 2)
            return {
                "rejected": False,
                "detection_type": "healthy",
                "crop_id": crop_id,
                "crop_name": crop_name,
                "pest_id": None,
                "pest_name": f"Healthy {crop_name}",
                "scientific_name": None,
                "confidence": healthy_conf,
                "severity": "Low",
                "description": f"Specimen classified as healthy {crop_name} with no active insect pest or foliar disease detected.",
                "recommended_action": "Crop appears healthy. Maintain regular irrigation and preventive field scouting.",
                "disease_id": None,
                "detected_disease_name": None,
                "disease_scientific_name": None,
                "disease_pathogen_type": None,
                "disease_confidence_score": None,
                "disease_severity": None,
                "disease_symptoms": None,
                "disease_recommended_action": None,
                "disease_details": {},
                "bounding_boxes": [
                    {
                        "x_min": 0.14,
                        "y_min": 0.16,
                        "x_max": 0.86,
                        "y_max": 0.84,
                        "label": f"Healthy Crop: {crop_name}",
                        "type": "healthy",
                        "confidence": healthy_conf,
                    }
                ],
            }

        if outcome == "pest":
            return {
                "rejected": False,
                "detection_type": "pest",
                "crop_id": crop_id,
                "crop_name": crop_name,
                "pest_id": pest_data["pest_id"],
                "pest_name": pest_data["pest_name"],
                "scientific_name": pest_data["scientific_name"],
                "confidence": pest_confidence,
                "severity": pest_data["severity"],
                "description": pest_data["description"],
                "recommended_action": pest_data["recommended_action"],
                "disease_id": None,
                "detected_disease_name": None,
                "disease_scientific_name": None,
                "disease_pathogen_type": None,
                "disease_confidence_score": None,
                "disease_severity": None,
                "disease_symptoms": None,
                "disease_recommended_action": None,
                "disease_details": {},
                "bounding_boxes": [
                    {
                        "x_min": 0.22,
                        "y_min": 0.28,
                        "x_max": 0.62,
                        "y_max": 0.68,
                        "label": f"Pest: {pest_data['pest_name']}",
                        "type": "pest",
                        "confidence": pest_confidence,
                    }
                ],
            }

        if outcome == "disease":
            return {
                "rejected": False,
                "detection_type": "disease",
                "crop_id": crop_id,
                "crop_name": crop_name,
                "pest_id": None,
                "pest_name": "No Pest Detected",
                "scientific_name": None,
                "confidence": disease_confidence,
                "severity": disease_data["severity"],
                "description": "No active insect pest detected. Foliar disease symptoms were identified.",
                "recommended_action": disease_data["recommended_action"],
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
                    "confidence": disease_confidence,
                },
                "bounding_boxes": [
                    {
                        "x_min": 0.20,
                        "y_min": 0.24,
                        "x_max": 0.78,
                        "y_max": 0.76,
                        "label": f"Disease: {disease_data['disease_name']}",
                        "type": "disease",
                        "confidence": disease_confidence,
                    }
                ],
            }

        # outcome == "pest_and_disease"
        return {
            "rejected": False,
            "detection_type": "pest_and_disease",
            "crop_id": crop_id,
            "crop_name": crop_name,
            "pest_id": pest_data["pest_id"],
            "pest_name": pest_data["pest_name"],
            "scientific_name": pest_data["scientific_name"],
            "confidence": pest_confidence,
            "severity": pest_data["severity"],
            "description": pest_data["description"],
            "recommended_action": pest_data["recommended_action"],
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
                "confidence": disease_confidence,
            },
            "bounding_boxes": [
                {
                    "x_min": 0.18,
                    "y_min": 0.28,
                    "x_max": 0.52,
                    "y_max": 0.65,
                    "label": f"Pest: {pest_data['pest_name']}",
                    "type": "pest",
                    "confidence": pest_confidence,
                },
                {
                    "x_min": 0.56,
                    "y_min": 0.35,
                    "x_max": 0.88,
                    "y_max": 0.78,
                    "label": f"Disease: {disease_data['disease_name']}",
                    "type": "disease",
                    "confidence": disease_confidence,
                },
            ],
        }

    async def check_live_frame(
        self,
        image_path: Optional[str] = None,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None,
        image_obj: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Pre-screening simulation with foliage gate (rejects non-green / blank frames)."""
        rejection = self._check_mock_foliage_gate(image_obj=image_obj, image_path=image_path)
        if rejection:
            return {
                "detected": False,
                "crop_recognized": False,
                "pest_detected": False,
                "disease_detected": False,
                "detection_type": "rejected",
                "confidence": 0.0,
                "bounding_boxes": [],
                "message": rejection,
            }

        confidence = round(random.uniform(0.85, 0.96), 2)
        crop_name = "Leafy Green"
        if db and crop_id:
            crop = db.query(Crop).filter(Crop.id == crop_id).first()
            if crop:
                crop_name = crop.name

        return {
            "detected": True,
            "crop_recognized": True,
            "pest_detected": False,
            "disease_detected": False,
            "detection_type": "healthy",
            "confidence": confidence,
            "crop_name": crop_name,
            "bounding_boxes": [
                {
                    "x_min": 0.20,
                    "y_min": 0.25,
                    "x_max": 0.75,
                    "y_max": 0.75,
                    "label": f"Healthy Crop: {crop_name}",
                    "type": "healthy",
                    "confidence": confidence,
                }
            ],
            "message": f"{crop_name} foliage recognized. Hold steady for diagnostic capture.",
        }
