"""
========================================================================================
AI MODEL DETECTION SERVICE (YOLOv8 LEAFY-GREEN DETECTOR + CLIP/COCO OOD REJECTION)
========================================================================================
Enforces a strict, logically sound detection pipeline for the 3 target leafy greens
(Lettuce / Litsugas, Bok Choy / Petsay, Mustard Greens / Mustasa):

  1. Image Sanity Gate: Rejects blank, tiny, pitch-black, or washed-out frames.
  2. Always-On COCO General-Object Veto (`yolov8n.pt`): Never skipped regardless of
     YOLO confidence; rejects people, phones, laptops, furniture, fruits, potted plants, etc.
  3. Local CLIP ViT-B-32 Semantic Domain Gate (`weights/clip/ViT-B-32.pt`):
     - Tier 1: Rejects non-agricultural scenes, screenshots, paper/herbarium cards,
       and non-target plants (tomatoes, flowers, trees, fruits, rice, corn, houseplants).
     - Tier 2: Verifies leafy-green crop specificity whenever crop/disease is detected.
  4. Strict Per-Category Confidence & Foliage HSV/Anti-Paper Gate (never bypassed).
  5. Logical Resolution Engine:
     - Cross-class spatial conflict suppression (IoU NMS across overlapping boxes).
     - Botanical host-crop compatibility filtering (Lettuce vs Brassica).
     - Clean 4-state outcomes: 'healthy', 'pest', 'disease', or 'pest_and_disease'.
       Every scan does NOT need 1 pest and 1 disease.
========================================================================================
"""

import asyncio
import logging
import os
from typing import Any, Dict, List, Optional, Tuple, Union

from PIL import Image
from sqlalchemy.orm import Session

logger = logging.getLogger("agripest.ai")

from app.core.config import settings
from app.models.crop import Crop
from app.models.disease import Disease
from app.models.disease_recommendation import DiseaseRecommendation
from app.models.pest import Pest
from app.models.recommendation import Recommendation
from app.services.detection.base import BaseDetectionService
from app.services.detection.condition_analyzer import (
    HolisticConditionAnalyzer,
    synthesize_total_condition,
)
from app.services.detection.domain_gate import (
    CLASS_REGISTRY,
    CLIPDomainGate,
    MIN_CONF_DISEASE,
    MIN_CONF_HEALTHY,
    MIN_CONF_LIVE_CHECK,
    MIN_CONF_PEST,
    NON_CROP_COCO_CLASSES,
    TARGET_CROPS,
    DomainGateResult,
    check_image_sanity,
    has_organic_foliage_colors,
    resolve_logical_detections,
)


def _severity_from_conf(conf: float) -> str:
    if conf >= 0.85:
        return "Critical"
    if conf >= 0.70:
        return "High"
    if conf >= 0.50:
        return "Moderate"
    return "Low"


class AIDetectionService(BaseDetectionService):
    def __init__(self):
        self.model_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ml_models")
        self.model_path: Optional[str] = None
        self.model = None
        self.ood_model = None
        self.clip_gate: Optional[CLIPDomainGate] = None
        self.condition_analyzer: Optional[HolisticConditionAnalyzer] = None
        self.load_error: Optional[str] = None
        self._load_models()

    def _load_models(self):
        possible_paths = [
            os.path.join(self.model_dir, "best.pt"),
            os.path.join(self.model_dir, "best.onnx"),
            os.path.join(self.model_dir, "pest_yolov8.pt"),
        ]
        for path in possible_paths:
            if os.path.exists(path):
                self.model_path = path
                break

        if not self.model_path:
            self.load_error = f"Trained model weights not found in {self.model_dir}."
            logger.error("[AI Model] %s", self.load_error)
            return

        try:
            from ultralytics import YOLO

            self.model = YOLO(self.model_path)
            self.load_error = None
            logger.info("[AI Model] Loaded trained YOLOv8 weights from %s", self.model_path)

            # Load lightweight COCO yolov8n.pt for non-crop / everyday-object rejection
            coco_candidates = [
                os.path.join(self.model_dir, "yolov8n.pt"),
                os.path.join(os.path.dirname(self.model_dir), "..", "yolov8n.pt"),
            ]
            coco_path = next((p for p in coco_candidates if os.path.exists(p)), "yolov8n.pt")
            try:
                self.ood_model = YOLO(coco_path)
                logger.info("[AI Model] Loaded COCO yolov8n non-crop rejection gate (%s).", coco_path)
            except Exception as ood_err:
                logger.warning("[AI Model] Optional COCO veto model unavailable: %s", ood_err)
                self.ood_model = None

            # Load local CLIP ViT-B-32 semantic domain gate (rejects non-target plants & non-agri objects)
            try:
                self.clip_gate = CLIPDomainGate()
                self.condition_analyzer = HolisticConditionAnalyzer(self.clip_gate)
            except Exception as clip_err:
                logger.warning("[AI Model] Optional CLIP domain gate unavailable: %s", clip_err)
                self.clip_gate = None
                self.condition_analyzer = HolisticConditionAnalyzer(None)
        except Exception as e:
            self.load_error = (
                f"Failed to load Ultralytics YOLO runtime ({e}). "
                "Run backend with datasets/.venv or install ultralytics."
            )
            logger.error("[AI Model] %s", self.load_error)

    def _resolve_image_path(self, image_path: str) -> str:
        if os.path.exists(image_path):
            return image_path
        prefix = "/static/uploads/"
        if image_path.startswith(prefix):
            rel = image_path[len(prefix):].lstrip("/\\")
            candidate = os.path.join(settings.UPLOAD_DIR, rel)
            if os.path.exists(candidate):
                return candidate
        return image_path

    def _detect_non_crop_object(self, image_source: Union[str, Image.Image]) -> Optional[Tuple[str, float]]:
        """
        Always-on COCO veto: rejects prominent everyday non-crop objects and non-target produce
        (people/selfies, phones, laptops, furniture, bottles, pets, apples, bananas, oranges,
        carrots, potted houseplants, etc.).
        Returns (label, confidence) if rejected, else None.
        """
        if self.ood_model is None:
            return None
        try:
            res = self.ood_model.predict(image_source, conf=0.42, iou=0.45, verbose=False)[0]
            if res.boxes is None or len(res.boxes) == 0:
                return None
            for i in range(len(res.boxes)):
                cls_name = str(res.names.get(int(res.boxes.cls[i]), "")).lower()
                conf = float(res.boxes.conf[i])
                x1, y1, x2, y2 = res.boxes.xyxyn[i].tolist()
                area = max(0.0, (x2 - x1) * (y2 - y1))
                if cls_name in NON_CROP_COCO_CLASSES:
                    if cls_name == "person":
                        # Allow small hands holding a leaf (< 30% frame), reject prominent people/selfies
                        if (conf >= 0.55 and area >= 0.30) or (conf >= 0.72 and area >= 0.22):
                            return (cls_name, round(conf, 2))
                    elif (conf >= 0.55 and area >= 0.12) or conf >= 0.68:
                        return (cls_name, round(conf, 2))
        except Exception:
            return None
        return None

    def _parse_yolo_detections(
        self,
        result,
        image_source: Union[str, Image.Image],
        min_healthy_conf: float = MIN_CONF_HEALTHY,
        min_disease_conf: float = MIN_CONF_DISEASE,
        min_pest_conf: float = MIN_CONF_PEST,
    ) -> List[Dict[str, Any]]:
        parsed: List[Dict[str, Any]] = []
        boxes = result.boxes
        if boxes is None or len(boxes) == 0:
            return parsed

        for i in range(len(boxes)):
            conf = float(boxes.conf[i])
            cls_id = int(boxes.cls[i])
            raw_name = str(result.names.get(cls_id, "unknown"))
            x1, y1, x2, y2 = [max(0.0, min(1.0, float(v))) for v in boxes.xyxyn[i].tolist()]

            if raw_name not in CLASS_REGISTRY:
                # Never accept unknown / unmapped classes
                continue

            kind, display_name, valid_crops, meta = CLASS_REGISTRY[raw_name]

            if kind == "pest":
                threshold = min_pest_conf
            elif kind == "disease":
                threshold = min_disease_conf
            else:
                threshold = min_healthy_conf

            if conf < threshold:
                continue

            box_dict = {
                "x_min": round(x1, 4),
                "y_min": round(y1, 4),
                "x_max": round(x2, 4),
                "y_max": round(y2, 4),
                "label": f"{'Healthy Crop' if kind == 'healthy' else kind.capitalize()}: {display_name}",
                "type": kind,
                "confidence": round(conf, 2),
            }

            # ALWAYS enforce organic foliage + anti-paper check on crop & disease boxes
            # (never bypassed even at high YOLO confidence!)
            if kind in ("healthy", "disease"):
                if not has_organic_foliage_colors(image_source, box_dict):
                    continue

            parsed.append({
                "raw_name": raw_name,
                "kind": kind,
                "display_name": display_name,
                "valid_crops": valid_crops,
                "meta": meta,
                "confidence": round(conf, 3),
                "box": box_dict,
            })

        parsed.sort(key=lambda item: item["confidence"], reverse=True)
        return parsed

    def _run_tiled_tiny_pest_pass(
        self,
        image_source: Union[str, Image.Image],
        min_tile_pest_conf: float = 0.62,
    ) -> List[Dict[str, Any]]:
        """
        SAHI-style 2x2 overlapping tiled inference pass for tiny insect pests
        (aphids, whiteflies, thrips, flea beetles) that shrink to <12px when
        YOLOv8 downscales a full smartphone photo to 640x640.
        Runs all 4 tiles in a single batched GPU/CPU forward pass and maps
        high-confidence insect boxes back to full-image normalized coordinates.
        """
        try:
            if isinstance(image_source, Image.Image):
                im = image_source.convert("RGB")
                should_close = False
            else:
                im = Image.open(image_source).convert("RGB")
                should_close = True
            try:
                w, h = im.size
                if w < 400 or h < 400:
                    return []
                tile_specs = (
                    (0.0, 0.0, 0.60, 0.60),
                    (0.40, 0.0, 1.0, 0.60),
                    (0.0, 0.40, 0.60, 1.0),
                    (0.40, 0.40, 1.0, 1.0),
                )
                tile_imgs = [
                    im.crop((int(tx0 * w), int(ty0 * h), int(tx1 * w), int(ty1 * h)))
                    for (tx0, ty0, tx1, ty1) in tile_specs
                ]
            finally:
                if should_close:
                    im.close()

            batch_results = self.model.predict(
                tile_imgs,
                conf=min_tile_pest_conf,
                iou=0.45,
                verbose=False,
            )

            tiled_pests: List[Dict[str, Any]] = []
            for (tx0, ty0, tx1, ty1), res in zip(tile_specs, batch_results):
                boxes = res.boxes
                if boxes is None or len(boxes) == 0:
                    continue
                tw = tx1 - tx0
                th = ty1 - ty0
                for i in range(len(boxes)):
                    conf = float(boxes.conf[i])
                    if conf < min_tile_pest_conf:
                        continue
                    cls_id = int(boxes.cls[i])
                    raw_name = str(res.names.get(cls_id, "unknown"))
                    if raw_name not in CLASS_REGISTRY:
                        continue
                    kind, display_name, valid_crops, meta = CLASS_REGISTRY[raw_name]
                    if kind != "pest":
                        continue
                    lx1, ly1, lx2, ly2 = [max(0.0, min(1.0, float(v))) for v in boxes.xyxyn[i].tolist()]
                    gx1 = max(0.0, min(1.0, tx0 + lx1 * tw))
                    gy1 = max(0.0, min(1.0, ty0 + ly1 * th))
                    gx2 = max(0.0, min(1.0, tx0 + lx2 * tw))
                    gy2 = max(0.0, min(1.0, ty0 + ly2 * th))
                    # Ignore absurdly huge full-tile hallucinations (tiny pests occupy a localized box)
                    if (gx2 - gx1) * (gy2 - gy1) > 0.30:
                        continue
                    tiled_pests.append({
                        "raw_name": raw_name,
                        "kind": kind,
                        "display_name": display_name,
                        "valid_crops": valid_crops,
                        "meta": meta,
                        "confidence": round(conf, 3),
                        "box": {
                            "x_min": round(gx1, 4),
                            "y_min": round(gy1, 4),
                            "x_max": round(gx2, 4),
                            "y_max": round(gy2, 4),
                            "label": f"Pest: {display_name}",
                            "type": "pest",
                            "confidence": round(conf, 2),
                        },
                    })
            tiled_pests.sort(key=lambda item: item["confidence"], reverse=True)
            return tiled_pests[:6]
        except Exception as err:
            logger.debug("Tiled tiny-pest pass skipped due to error: %s", err)
            return []

    def _run_inference_sync(
        self,
        image_source: Union[str, Image.Image],
        selected_crop_name: Optional[str] = None,
        is_live_check: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes the full gated inference pipeline synchronously in a worker thread:
          1. Image sanity check
          2. Local CLIP Tier-1 semantic domain gate (primary gate — rejects non-agri & non-target plants)
          3. COCO general-object veto (runs when CLIP is unavailable OR uncertain, preventing tiny
             yolov8n from hallucinating 'cat'/'bird' on real rotting/curled leafy greens that CLIP
             already verified at >= 72% confidence)
          4. YOLOv8 detection + adaptive CLIP-verified thresholds + always-on foliage HSV check
          5. CLIP Tier-2 leafy-green specificity verification (when crop/disease is present)
          6. Logical conflict suppression, host-crop filtering & 4-state resolution
        """
        # 1. Image sanity gate
        sanity_error = check_image_sanity(image_source)
        if sanity_error:
            return {"rejected": True, "rejection_reason": sanity_error}

        # 2. CLIP Tier-1 semantic domain gate FIRST (much more accurate than tiny yolov8n COCO)
        clip_t1: Optional[DomainGateResult] = None
        clip_available = self.clip_gate is not None and self.clip_gate.available
        if clip_available:
            clip_t1 = self.clip_gate.evaluate(image_source, require_leafy_crop=False)
            if not clip_t1.allowed:
                return {
                    "rejected": True,
                    "rejection_reason": clip_t1.reason,
                    "gate_category": clip_t1.category,
                }

        # 3. COCO veto: only run when CLIP is unavailable OR CLIP is not strongly confident
        #    (prevents yolov8n from false-vetoing rotting lettuce leaves as 'cat' or 'sandwich')
        clip_strongly_verified = (
            clip_t1 is not None
            and clip_t1.allowed
            and clip_t1.pos_prob >= 0.72
            and clip_t1.neg_nonagri_prob < 0.20
        )
        if not clip_strongly_verified:
            non_crop = self._detect_non_crop_object(image_source)
            if non_crop:
                obj_label, obj_conf = non_crop
                return {
                    "rejected": True,
                    "rejection_reason": (
                        f"Unrecognized non-crop object detected ({obj_label}, {int(obj_conf * 100)}%). "
                        "Please scan only Lettuce (Litsugas), Bok Choy (Petsay), Mustard Greens (Mustasa), "
                        "or their pests and diseases."
                    ),
                    "non_crop_label": obj_label,
                }

        # 4. Run trained YOLOv8 detector (strict primary pass first so clear scans stay noise-free)
        clip_verified_leafy = (
            clip_t1 is not None
            and clip_t1.allowed
            and clip_t1.pos_prob >= 0.85
            and clip_t1.leafy_vs_other_plant_prob >= 0.75
            and not is_live_check
        )
        yolo_conf_floor = 0.25 if clip_verified_leafy else 0.45
        results = self.model.predict(image_source, conf=yolo_conf_floor, iou=0.45, verbose=False)

        min_crop_conf = MIN_CONF_LIVE_CHECK if is_live_check else MIN_CONF_HEALTHY
        min_dis_conf = MIN_CONF_LIVE_CHECK if is_live_check else MIN_CONF_DISEASE
        detections = self._parse_yolo_detections(
            results[0],
            image_source,
            min_healthy_conf=min_crop_conf,
            min_disease_conf=min_dis_conf,
            min_pest_conf=MIN_CONF_PEST,
        )

        # 4a-tile. Run 2x2 overlapping tiled pass on CLIP-verified leafy greens when no high-conf
        #          pest was already spotted at full resolution (catches tiny aphids/thrips/flea beetles)
        has_strong_full_pest = any(d["kind"] == "pest" and d["confidence"] >= 0.72 for d in detections)
        if clip_verified_leafy and not is_live_check and not has_strong_full_pest:
            tiled_pests = self._run_tiled_tiny_pest_pass(image_source, min_tile_pest_conf=0.66)
            if tiled_pests:
                detections.extend(tiled_pests)
                detections.sort(key=lambda item: item["confidence"], reverse=True)

        # 4b. Compute holistic plant condition / indirect pest-damage / nutrient-deficiency signals
        condition_raw: Dict[str, Any] = {}
        if not is_live_check and self.condition_analyzer is not None:
            condition_raw = self.condition_analyzer.analyze(image_source)

        # 4c. If primary strict pass found nothing BUT CLIP strongly verified this IS one of the 3
        #     leafy greens (e.g., chewed holes with no visible bug, nutrient yellowing, or severe brown rot),
        #     retry with softer YOLO floor, indirect pest-damage / nutrient-deficiency promotion,
        #     or CLIP verified leafy-green condition classifier so real affected crops aren't rejected.
        if not detections and clip_verified_leafy:
            detections = self._parse_yolo_detections(
                results[0],
                image_source,
                min_healthy_conf=0.30,
                min_disease_conf=0.28,
                min_pest_conf=0.38,
            )

        clip_high_certainty_leafy = (
            clip_t1 is not None
            and clip_t1.allowed
            and clip_t1.pos_prob >= 0.90
            and clip_t1.leafy_vs_other_plant_prob >= 0.85
            and clip_t1.neg_nonagri_prob < 0.05
            and not is_live_check
            and clip_available
        )

        if not detections and clip_high_certainty_leafy:
            target_crop = selected_crop_name or clip_t1.inferred_crop
            if target_crop in TARGET_CROPS:
                gp = condition_raw.get("group_probs", {})
                if gp.get("pest_damage", 0.0) >= 0.42 or gp.get("nutrient_deficiency", 0.0) >= 0.45:
                    return {
                        "rejected": False,
                        "rejection_reason": None,
                        "detection_type": "none",
                        "resolved_crop_name": target_crop,
                        "pest_hits": [],
                        "disease_hits": [],
                        "healthy_hits": [],
                        "final_boxes": [],
                        "condition_raw": condition_raw,
                    }
                fb_det = self.clip_gate.classify_verified_leafy_green(image_source, target_crop)
                if fb_det is not None:
                    detections = [fb_det]

        if not detections:
            return {
                "rejected": True,
                "rejection_reason": (
                    "Unrecognized specimen: This image does not clearly match Lettuce (Litsugas), "
                    "Bok Choy (Petsay), Mustard Greens (Mustasa), or any known crop pest/disease. "
                    "Please capture a clear, well-lit close-up of the crop leaf or pest."
                ),
            }

        # 5. CLIP Tier-2 leafy-green specificity gate:
        #    Whenever the primary finding is a crop or foliar disease (not a pure macro pest),
        #    verify the plant is actually one of the 3 leafy greens (not tomato/flower/tree/grass/houseplant).
        has_crop_or_disease = any(d["kind"] in ("healthy", "disease") for d in detections)
        has_strong_pest = any(d["kind"] == "pest" and d["confidence"] >= 0.65 for d in detections)
        if has_crop_or_disease and not has_strong_pest and clip_available:
            clip_t2 = self.clip_gate.evaluate(image_source, require_leafy_crop=True)
            if not clip_t2.allowed:
                return {
                    "rejected": True,
                    "rejection_reason": clip_t2.reason,
                    "gate_category": clip_t2.category,
                }
            clip_inferred_crop = clip_t2.inferred_crop
        else:
            clip_inferred_crop = clip_t1.inferred_crop if clip_t1 else None

        # 6. Logical resolution (spatial NMS, host-crop compatibility, 4-state outcome)
        resolved = resolve_logical_detections(
            detections,
            selected_crop_name=selected_crop_name,
            clip_inferred_crop=clip_inferred_crop,
        )
        if not resolved.get("rejected"):
            resolved["condition_raw"] = condition_raw
        return resolved

    def _reject(self, reason: str, http_status: int = 422) -> Dict[str, Any]:
        return {
            "rejected": True,
            "http_status": http_status,
            "rejection_reason": reason,
            "detection_type": "rejected",
            "confidence": 0.0,
            "bounding_boxes": [],
        }

    def _lookup_crop_name(self, db: Optional[Session], crop_id: Optional[int]) -> Optional[str]:
        if db and crop_id:
            crop_obj = db.query(Crop).filter(Crop.id == crop_id).first()
            if crop_obj and crop_obj.name in TARGET_CROPS:
                return crop_obj.name
        return None

    async def analyze_image(
        self,
        image_path: str,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None,
    ) -> Dict[str, Any]:
        """Runs strict gated YOLOv8 inference and returns a logically consistent 4-state diagnosis."""
        if self.model is None:
            self._load_models()

        if self.model is None:
            return self._reject(
                f"AI detection engine is offline: {self.load_error or 'Model not loaded.'}",
                http_status=503,
            )

        disk_path = self._resolve_image_path(image_path)
        if not os.path.exists(disk_path):
            return self._reject("Uploaded image file could not be read for analysis.", http_status=400)

        selected_crop_name = self._lookup_crop_name(db, crop_id)

        try:
            resolved = await asyncio.to_thread(
                self._run_inference_sync,
                disk_path,
                selected_crop_name,
                False,
            )

            if resolved.get("rejected"):
                return self._reject(
                    resolved.get(
                        "rejection_reason",
                        "Unrecognized specimen. Please scan Lettuce, Bok Choy, Mustard Greens, or their pests/diseases.",
                    )
                )

            det_type: str = resolved["detection_type"]
            pest_hits: List[Dict[str, Any]] = resolved["pest_hits"]
            disease_hits: List[Dict[str, Any]] = resolved["disease_hits"]
            healthy_hits: List[Dict[str, Any]] = resolved["healthy_hits"]
            bounding_boxes: List[Dict[str, Any]] = resolved["final_boxes"]
            resolved_crop_name: Optional[str] = resolved.get("resolved_crop_name")

            resolved_crop_id = crop_id
            if resolved_crop_id is None and db and resolved_crop_name:
                crop_obj = db.query(Crop).filter(Crop.name == resolved_crop_name).first()
                if crop_obj:
                    resolved_crop_id = crop_obj.id

            # --- Resolve Pest Finding (ONLY if pest_hits is non-empty) ---
            pest_id = None
            pest_name = "No Pest Detected"
            scientific_name = None
            description = "No active insect pest detected on this specimen."
            pest_conf = 0.0
            pest_severity = "Low"
            rec_action = "Continue regular field monitoring and preventive IPM."

            if pest_hits:
                top_pest = pest_hits[0]
                pest_name = top_pest["display_name"]
                pest_conf = round(top_pest["confidence"], 2)
                pest_severity = _severity_from_conf(pest_conf)
                scientific_name = top_pest["meta"].get("scientific_name")
                rec_action = top_pest["meta"].get("action", rec_action)
                if db:
                    p_obj = db.query(Pest).filter(Pest.name == pest_name).first()
                    if p_obj:
                        pest_id = p_obj.id
                        scientific_name = p_obj.scientific_name
                        description = p_obj.description
                        rec = db.query(Recommendation).filter(Recommendation.pest_id == p_obj.id).first()
                        if rec:
                            rec_action = f"{rec.action_title}: {rec.description}"

            # --- Resolve Disease Finding (ONLY if disease_hits is non-empty) ---
            disease_id = None
            dis_name = None
            dis_scientific = None
            dis_pathogen = None
            dis_symptoms = None
            dis_desc = None
            dis_conf = None
            dis_severity = None
            dis_action = None
            disease_details: Dict[str, Any] = {}

            if disease_hits:
                top_dis = disease_hits[0]
                dis_name = top_dis["display_name"]
                dis_conf = round(top_dis["confidence"], 2)
                dis_severity = _severity_from_conf(dis_conf)
                dis_scientific = top_dis["meta"].get("scientific_name")
                dis_pathogen = top_dis["meta"].get("pathogen_type", "Fungal")
                dis_action = top_dis["meta"].get("action")
                if db:
                    d_obj = db.query(Disease).filter(Disease.name == dis_name).first()
                    if d_obj:
                        disease_id = d_obj.id
                        dis_scientific = d_obj.scientific_name
                        dis_pathogen = d_obj.pathogen_type
                        dis_symptoms = d_obj.symptoms
                        dis_desc = d_obj.description
                        d_rec = (
                            db.query(DiseaseRecommendation)
                            .filter(DiseaseRecommendation.disease_id == d_obj.id)
                            .first()
                        )
                        if d_rec:
                            dis_action = f"{d_rec.action_title}: {d_rec.description}"
                disease_details = {
                    "name": dis_name,
                    "scientific_name": dis_scientific,
                    "pathogen_type": dis_pathogen,
                    "severity": dis_severity,
                    "symptoms": dis_symptoms,
                    "description": dis_desc,
                    "recommended_action": dis_action,
                    "confidence": dis_conf,
                }

            # --- Finalize Clean Multi-State Payload + Holistic Condition Synthesis ---
            if det_type == "disease":
                # Disease ONLY — do NOT fabricate a pest name!
                pest_id = None
                pest_name = "No Pest Detected"
                scientific_name = None
                description = "No active insect pest detected. Foliar disease symptoms were identified."
                # Primary record confidence & severity mirror the detected disease for alerts/analytics
                pest_conf = dis_conf or 0.0
                pest_severity = dis_severity or "Moderate"
                rec_action = dis_action or rec_action
            elif det_type == "healthy":
                top_h = healthy_hits[0]
                crop_label = resolved_crop_name or top_h["display_name"]
                pest_id = None
                pest_name = f"Healthy {crop_label}"
                scientific_name = top_h["meta"].get("scientific_name")
                pest_conf = round(top_h["confidence"], 2)
                pest_severity = "Low"
                description = (
                    f"Specimen classified as healthy {crop_label} with no active insect pest or foliar disease detected."
                )
                rec_action = top_h["meta"].get("action", rec_action)

            # Synthesize holistic plant condition (indirect pest damage + nutrient deficiency + health score)
            condition_raw = resolved.get("condition_raw", {})
            synth = synthesize_total_condition(
                det_type=det_type,
                crop_name=resolved_crop_name,
                primary_conf=pest_conf,
                pest_name=pest_name if pest_hits else None,
                disease_name=dis_name,
                condition_raw=condition_raw,
            )
            promoted_type = synth["promoted_detection_type"]
            condition_assessment = synth["condition_assessment"]

            localized_boxes = condition_raw.get("localized_boxes") or {}
            if promoted_type == "pest_damage" and condition_assessment.get("pest_damage"):
                dmg = condition_assessment["pest_damage"]
                culprits = condition_assessment.get("probable_pests") or []
                det_type = "pest_damage"
                pest_id = None
                pest_name = dmg["damage_type"]
                scientific_name = culprits[0]["scientific_name"] if culprits else None
                pest_conf = dmg["confidence"]
                pest_severity = dmg["severity"]
                description = condition_assessment["condition_summary"]
                rec_action = dmg["recommended_action"]
                dmg_zones = localized_boxes.get("damage_boxes") or []
                if dmg_zones:
                    bounding_boxes = [
                        {
                            "x_min": z["x_min"],
                            "y_min": z["y_min"],
                            "x_max": z["x_max"],
                            "y_max": z["y_max"],
                            "label": f"Pest Damage: {dmg['damage_type']}",
                            "type": "pest_damage",
                            "confidence": pest_conf,
                        }
                        for z in dmg_zones
                    ]
                else:
                    bounding_boxes = [
                        {
                            "x_min": 0.08,
                            "y_min": 0.08,
                            "x_max": 0.92,
                            "y_max": 0.92,
                            "label": f"Pest Damage: {dmg['damage_type']}",
                            "type": "pest_damage",
                            "confidence": pest_conf,
                        }
                    ]
            elif promoted_type == "nutrient_deficiency" and condition_assessment.get("nutrient_deficiency"):
                nut = condition_assessment["nutrient_deficiency"]
                det_type = "nutrient_deficiency"
                pest_id = None
                pest_name = nut["name"]
                scientific_name = f"Abiotic Disorder ({nut['nutrient']})"
                pest_conf = nut["confidence"]
                pest_severity = nut["severity"]
                description = nut["symptoms"]
                rec_action = nut["recommended_action"]
                disease_id = None
                dis_name = None
                dis_scientific = None
                dis_pathogen = None
                dis_symptoms = None
                dis_conf = None
                dis_severity = None
                dis_action = None
                disease_details = {}
                stress_zones = localized_boxes.get("stress_boxes") or []
                if stress_zones:
                    bounding_boxes = [
                        {
                            "x_min": z["x_min"],
                            "y_min": z["y_min"],
                            "x_max": z["x_max"],
                            "y_max": z["y_max"],
                            "label": f"Nutrient: {nut['name']}",
                            "type": "nutrient",
                            "confidence": pest_conf,
                        }
                        for z in stress_zones
                    ]
                else:
                    bounding_boxes = [
                        {
                            "x_min": 0.08,
                            "y_min": 0.08,
                            "x_max": 0.92,
                            "y_max": 0.92,
                            "label": f"Nutrient: {nut['name']}",
                            "type": "nutrient",
                            "confidence": pest_conf,
                        }
                    ]
            elif det_type == "none":
                return self._reject(
                    "Unrecognized specimen: Unable to determine plant condition clearly. "
                    "Please capture a well-lit close-up of the leaf."
                )

            return {
                "rejected": False,
                "detection_type": det_type,
                "crop_id": resolved_crop_id,
                "crop_name": resolved_crop_name,
                "pest_id": pest_id,
                "pest_name": pest_name,
                "scientific_name": scientific_name,
                "description": description,
                "confidence": pest_conf,
                "severity": pest_severity,
                "recommended_action": rec_action,
                "disease_id": disease_id,
                "detected_disease_name": dis_name,
                "disease_scientific_name": dis_scientific,
                "disease_pathogen_type": dis_pathogen,
                "disease_confidence_score": dis_conf,
                "disease_severity": dis_severity,
                "disease_symptoms": dis_symptoms,
                "disease_recommended_action": dis_action,
                "disease_details": disease_details,
                "condition_assessment": condition_assessment,
                "bounding_boxes": bounding_boxes,
            }
        except Exception as e:
            logger.exception("[AI Model Inference] Exception during YOLO inference: %s", e)
            return self._reject(f"AI inference failed to process this image: {e}", http_status=500)

    async def check_live_frame(
        self,
        image_path: Optional[str] = None,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None,
        image_obj: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Strict live-camera pre-screening using the exact same OOD & crop-consistency gate."""
        if self.model is None:
            self._load_models()

        if self.model is None:
            return {
                "detected": False,
                "crop_recognized": False,
                "pest_detected": False,
                "disease_detected": False,
                "detection_type": "rejected",
                "confidence": 0.0,
                "bounding_boxes": [],
                "message": "AI model not loaded on server.",
            }

        image_source: Union[str, Image.Image, None] = image_obj
        if image_source is None:
            disk_path = self._resolve_image_path(image_path or "")
            if not disk_path or not os.path.exists(disk_path):
                return {
                    "detected": False,
                    "crop_recognized": False,
                    "pest_detected": False,
                    "disease_detected": False,
                    "detection_type": "rejected",
                    "confidence": 0.0,
                    "bounding_boxes": [],
                    "message": "Invalid camera frame.",
                }
            image_source = disk_path

        selected_crop_name = self._lookup_crop_name(db, crop_id)

        try:
            resolved = await asyncio.to_thread(
                self._run_inference_sync,
                image_source,
                selected_crop_name,
                True,
            )

            if resolved.get("rejected"):
                non_crop_lbl = resolved.get("non_crop_label")
                msg = (
                    f"Ignored non-crop object ({non_crop_lbl}). Aim at Lettuce, Bok Choy, or Mustard Greens."
                    if non_crop_lbl
                    else resolved.get(
                        "rejection_reason",
                        "No target leafy green recognized. Aim at Lettuce, Bok Choy, or Mustard Greens.",
                    )
                )
                return {
                    "detected": False,
                    "crop_recognized": False,
                    "pest_detected": False,
                    "disease_detected": False,
                    "detection_type": "rejected",
                    "confidence": 0.0,
                    "bounding_boxes": [],
                    "message": msg,
                }

            det_type = resolved["detection_type"]
            pest_hits = resolved["pest_hits"]
            disease_hits = resolved["disease_hits"]
            healthy_hits = resolved["healthy_hits"]
            all_hits = sorted(pest_hits + disease_hits + healthy_hits, key=lambda d: d["confidence"], reverse=True)
            top = all_hits[0]
            conf = round(top["confidence"], 2)

            if det_type == "healthy":
                summary = f"Healthy {top['display_name']} ({int(conf * 100)}%). Hold steady for capture."
            elif det_type == "pest":
                summary = f"Pest detected: {top['display_name']} ({int(conf * 100)}%). Hold steady for capture."
            elif det_type == "disease":
                summary = f"Disease detected: {top['display_name']} ({int(conf * 100)}%). Hold steady for capture."
            else:
                summary = (
                    f"Detected {pest_hits[0]['display_name']} & {disease_hits[0]['display_name']} "
                    f"({int(conf * 100)}%). Hold steady for capture."
                )

            return {
                "detected": True,
                "crop_recognized": True,
                "pest_detected": bool(pest_hits),
                "disease_detected": bool(disease_hits),
                "detection_type": det_type,
                "confidence": conf,
                "bounding_boxes": resolved["final_boxes"][:5],
                "message": summary,
            }
        except Exception as e:
            logger.exception("AI live-check exception: %s", e)
            return {
                "detected": False,
                "crop_recognized": False,
                "pest_detected": False,
                "disease_detected": False,
                "detection_type": "rejected",
                "confidence": 0.0,
                "bounding_boxes": [],
                "message": "Unable to evaluate frame. Hold steady and try again.",
            }
