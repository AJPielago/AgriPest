"""
Comprehensive unit & integration tests for strict 3-leafy-green domain gating
and logical 4-state detection resolution ('healthy', 'pest', 'disease', 'pest_and_disease').
"""

import glob
import os
from io import BytesIO
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.core.config import settings
from app.core.rate_limiter import detection_limiter, login_limiter
from app.main import app
from app.services.detection.condition_analyzer import (
    detect_enclosed_leaf_holes,
    detect_enclosed_leaf_holes_with_boxes,
    extract_visual_foliage_signals,
    get_probable_culprits,
    synthesize_total_condition,
)
from app.services.detection.domain_gate import (
    CLASS_REGISTRY,
    check_image_sanity,
    has_organic_foliage_colors,
    resolve_logical_detections,
    suppress_conflicting_detections,
)

client = TestClient(app)
REPO_ROOT = Path(__file__).resolve().parent.parent.parent


def _make_det(raw_name: str, conf: float, box=(0.1, 0.1, 0.8, 0.8)):
    kind, display_name, valid_crops, meta = CLASS_REGISTRY[raw_name]
    x1, y1, x2, y2 = box
    return {
        "raw_name": raw_name,
        "kind": kind,
        "display_name": display_name,
        "valid_crops": valid_crops,
        "meta": meta,
        "confidence": conf,
        "box": {
            "x_min": x1,
            "y_min": y1,
            "x_max": x2,
            "y_max": y2,
            "label": f"{kind.capitalize()}: {display_name}",
            "type": kind,
            "confidence": conf,
        },
    }


def _login_farmer() -> dict:
    login_limiter.clear_all()
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "farmer@pestdetect.com", "password": "farmer123"},
    )
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


# ---------------------------------------------------------------------------
# 1. Pure Unit Tests: Image Sanity & Foliage/Anti-Paper Gate
# ---------------------------------------------------------------------------


def test_image_sanity_rejects_black_white_flat_and_tiny_images():
    assert check_image_sanity(Image.new("RGB", (1, 1), (0, 0, 0))) is not None
    assert check_image_sanity(Image.new("RGB", (20, 20), (40, 160, 50))) is not None
    assert check_image_sanity(Image.new("RGB", (300, 300), (0, 0, 0))) is not None
    assert check_image_sanity(Image.new("RGB", (300, 300), (255, 255, 255))) is not None
    assert check_image_sanity(Image.new("RGB", (300, 300), (50, 140, 50))) is not None

    # Severely blurred / unreadable smooth gradient -> rejected with blur guidance
    from PIL import ImageFilter
    grad = np.tile(np.linspace(40, 210, 256, dtype=np.uint8), (256, 1))
    blurry = Image.fromarray(np.stack([grad, grad, grad], axis=2), mode="RGB").filter(ImageFilter.GaussianBlur(14))
    blur_err = check_image_sanity(blurry)
    assert blur_err is not None and "blur" in blur_err.lower()


def test_foliage_gate_rejects_paper_card_and_non_plant_colors():
    # Simulated white paper / herbarium index card with faint dark lines
    arr = np.full((200, 200, 3), 240, dtype=np.uint8)
    arr[40:44, 20:180] = 30
    arr[80:84, 20:160] = 30
    paper_img = Image.fromarray(arr)
    full_box = {"x_min": 0.0, "y_min": 0.0, "x_max": 1.0, "y_max": 1.0}
    assert has_organic_foliage_colors(paper_img, full_box) is False

    # Pure blue/purple screen gradient
    blue_arr = np.zeros((200, 200, 3), dtype=np.uint8)
    blue_arr[:, :, 2] = np.linspace(120, 250, 200, dtype=np.uint8)
    blue_arr[:, :, 0] = 40
    assert has_organic_foliage_colors(Image.fromarray(blue_arr), full_box) is False

    # Textured leafy-green pattern (with natural light-to-dark leaf veins/gradient) should pass
    y_grad = np.linspace(80, 195, 200, dtype=np.uint8)[:, None]
    x_grad = np.linspace(20, 75, 200, dtype=np.uint8)[None, :]
    leaf_arr = np.zeros((200, 200, 3), dtype=np.uint8)
    leaf_arr[:, :, 0] = x_grad
    leaf_arr[:, :, 1] = y_grad
    leaf_arr[:, :, 2] = 35
    leaf_arr[95:105, :] = [140, 200, 90]  # central leaf midrib vein
    assert has_organic_foliage_colors(Image.fromarray(leaf_arr), full_box) is True


# ---------------------------------------------------------------------------
# 2. Pure Unit Tests: Logical 4-State Resolver & Host-Crop Consistency
# ---------------------------------------------------------------------------


def test_resolver_healthy_crop_produces_no_pest_and_no_disease():
    dets = [_make_det("lettuce_healthy", 0.92)]
    res = resolve_logical_detections(dets, selected_crop_name="Lettuce")
    assert res["rejected"] is False
    assert res["detection_type"] == "healthy"
    assert res["pest_hits"] == []
    assert res["disease_hits"] == []
    assert len(res["healthy_hits"]) == 1
    assert res["resolved_crop_name"] == "Lettuce"


def test_resolver_pest_only_does_not_fabricate_disease():
    dets = [_make_det("green_peach_aphid", 0.88, box=(0.3, 0.3, 0.5, 0.5))]
    res = resolve_logical_detections(dets, selected_crop_name="Lettuce")
    assert res["rejected"] is False
    assert res["detection_type"] == "pest"
    assert len(res["pest_hits"]) == 1
    assert res["disease_hits"] == []


def test_resolver_disease_only_does_not_fabricate_pest():
    dets = [_make_det("brassica_downy_mildew", 0.86)]
    res = resolve_logical_detections(dets, selected_crop_name="Bok Choy")
    assert res["rejected"] is False
    assert res["detection_type"] == "disease"
    assert res["pest_hits"] == []
    assert len(res["disease_hits"]) == 1


def test_resolver_suppresses_contradictory_healthy_and_disease_on_same_leaf():
    # Exact same box classified as both healthy (0.91) and weak disease (0.60) -> Healthy wins!
    dets = [
        _make_det("lettuce_healthy", 0.91, box=(0.1, 0.1, 0.85, 0.85)),
        _make_det("lettuce_downy_mildew", 0.60, box=(0.12, 0.11, 0.84, 0.86)),
    ]
    res = resolve_logical_detections(dets, selected_crop_name="Lettuce")
    assert res["rejected"] is False
    assert res["detection_type"] == "healthy"
    assert res["disease_hits"] == []


def test_resolver_allows_genuine_dual_pest_and_disease_when_distinct_and_confident():
    # Small pest on a diseased lettuce leaf — both strongly confident and compatible with Lettuce
    dets = [
        _make_det("green_peach_aphid", 0.84, box=(0.20, 0.25, 0.38, 0.42)),
        _make_det("lettuce_downy_mildew", 0.82, box=(0.10, 0.10, 0.90, 0.90)),
    ]
    res = resolve_logical_detections(dets, selected_crop_name="Lettuce")
    assert res["rejected"] is False
    assert res["detection_type"] == "pest_and_disease"
    assert len(res["pest_hits"]) == 1
    assert len(res["disease_hits"]) == 1


def test_resolver_drops_weak_secondary_noise_instead_of_forcing_dual():
    # Strong pest (0.91) + borderline weak disease (0.58 < MIN_JOINT_CONF_DISEASE) -> pest only!
    dets = [
        _make_det("common_cutworm", 0.91, box=(0.25, 0.25, 0.55, 0.55)),
        _make_det("lettuce_downy_mildew", 0.58, box=(0.05, 0.05, 0.95, 0.95)),
    ]
    res = resolve_logical_detections(dets, selected_crop_name="Lettuce")
    assert res["rejected"] is False
    assert res["detection_type"] == "pest"
    assert res["disease_hits"] == []


def test_resolver_rejects_host_crop_mismatch():
    # User explicitly selected Lettuce, but image is clearly Bok Choy / Brassica Black Rot
    dets = [_make_det("brassica_black_rot", 0.90)]
    res = resolve_logical_detections(dets, selected_crop_name="Lettuce")
    assert res["rejected"] is True
    assert "mismatch" in res["rejection_reason"].lower()


def test_resolver_filters_impossible_cross_family_detections():
    # User selected Bok Choy: keep Brassica Alternaria, drop impossible Lettuce Septoria
    dets = [
        _make_det("lettuce_septoria_blight", 0.78, box=(0.1, 0.1, 0.45, 0.45)),
        _make_det("brassica_alternaria_leaf_spot", 0.74, box=(0.5, 0.5, 0.9, 0.9)),
    ]
    res = resolve_logical_detections(dets, selected_crop_name="Bok Choy")
    assert res["rejected"] is False
    assert res["detection_type"] == "disease"
    assert res["disease_hits"][0]["raw_name"] == "brassica_alternaria_leaf_spot"


def test_suppress_conflicting_large_pest_and_disease_same_box():
    # Whole-image misclassification: same 0.72-area box labeled both cutworm and soft rot
    dets = [
        _make_det("common_cutworm", 0.85, box=(0.05, 0.05, 0.90, 0.90)),
        _make_det("lettuce_bacterial_soft_rot", 0.68, box=(0.06, 0.06, 0.89, 0.89)),
    ]
    kept = suppress_conflicting_detections(dets)
    assert len(kept) == 1
    assert kept[0]["raw_name"] == "common_cutworm"


# ---------------------------------------------------------------------------
# 2b. Pure Unit Tests: Holistic Condition, Indirect Pest Damage & Nutrient Deficiency
# ---------------------------------------------------------------------------


def test_indirect_pest_damage_infers_host_specific_culprits():
    # Chewing damage on Bok Choy should point to Diamondback Moth & Cabbage Looper
    bok_culprits = [c["name"] for c in get_probable_culprits("chewing_damage", "Bok Choy")]
    assert "Diamondback Moth" in bok_culprits
    assert "Cabbage Looper" in bok_culprits

    # Chewing damage on Lettuce should NOT blame Brassica-specialist Diamondback Moth
    lettuce_culprits = [c["name"] for c in get_probable_culprits("chewing_damage", "Lettuce")]
    assert "Diamondback Moth" not in lettuce_culprits
    assert "Cabbage Looper" in lettuce_culprits

    # Shot-hole damage on Mustard Greens points to Striped Flea Beetle
    shothole_culprits = [c["name"] for c in get_probable_culprits("shothole_damage", "Mustard Greens")]
    assert shothole_culprits[0] == "Striped Flea Beetle"


def test_synthesize_promotes_chewed_leaf_to_pest_damage_without_visible_bug():
    cond_raw = {
        "available": True,
        "visual_signals": {"green_foliage_pct": 62.0, "yellow_chlorosis_pct": 4.0, "brown_necrosis_pct": 3.0},
        "group_probs": {"healthy": 0.12, "pest_damage": 0.71, "nutrient_deficiency": 0.09, "infectious_disease": 0.08},
        "top_pest_damage": ("chewing_damage", 0.64),
        "top_nutrient_deficiency": ("nitrogen_deficiency", 0.05),
    }
    res = synthesize_total_condition(
        det_type="healthy",
        crop_name="Bok Choy",
        primary_conf=0.68,
        pest_name=None,
        disease_name=None,
        condition_raw=cond_raw,
    )
    assert res["promoted_detection_type"] == "pest_damage"
    ca = res["condition_assessment"]
    assert ca["overall_condition"] == "Pest-Damaged Foliage"
    assert ca["pest_damage"]["key"] == "chewing_damage"
    assert any(c["name"] == "Diamondback Moth" for c in ca["probable_pests"])


def test_enclosed_leaf_hole_detector_distinguishes_perforated_vs_intact_leaf():
    # Intact bright green leaf blade with mild vein texture -> near-zero enclosed holes
    rng = np.random.default_rng(7)
    base = np.zeros((360, 360, 3), dtype=np.uint8)
    base[:, :, 0] = rng.integers(55, 85, size=(360, 360))
    base[:, :, 1] = rng.integers(170, 205, size=(360, 360))
    base[:, :, 2] = rng.integers(35, 65, size=(360, 360))
    intact_im = Image.fromarray(base, mode="RGB")
    intact_holes, intact_area = detect_enclosed_leaf_holes(intact_im)
    assert intact_holes < 5
    assert intact_area < 0.3

    # Same leaf perforated with 30 dark insect chew-holes inside the blade
    chewed = base.copy()
    for row in range(5):
        for col in range(6):
            cy = 75 + row * 45
            cx = 70 + col * 42
            chewed[cy - 4 : cy + 5, cx - 4 : cx + 5] = [18, 42, 12]
    chewed_im = Image.fromarray(chewed, mode="RGB")
    chewed_holes, chewed_area, dmg_boxes = detect_enclosed_leaf_holes_with_boxes(chewed_im)
    assert chewed_holes >= 20
    assert chewed_area >= 0.45
    assert 1 <= len(dmg_boxes) <= 4
    assert all(0.0 <= b["x_min"] < b["x_max"] <= 1.0 and 0.0 <= b["y_min"] < b["y_max"] <= 1.0 for b in dmg_boxes)


def test_synthesize_overrides_high_conf_healthy_when_leaf_is_riddled_with_insect_holes():
    # Even if YOLO classifies an insect-riddled green lettuce leaf as 'lettuce_healthy' (0.96),
    # strong enclosed hole count + CLIP agreeing leaf isn't healthy promotes it to 'pest_damage'.
    cond_raw = {
        "available": True,
        "visual_signals": {
            "green_foliage_pct": 88.7,
            "yellow_chlorosis_pct": 0.0,
            "brown_necrosis_pct": 0.0,
            "leaf_hole_count": 59,
            "hole_area_pct": 2.40,
        },
        "group_probs": {"healthy": 0.19, "pest_damage": 0.08, "nutrient_deficiency": 0.05, "infectious_disease": 0.68},
        "top_pest_damage": ("chewing_damage", 0.06),
        "top_nutrient_deficiency": ("nitrogen_deficiency", 0.03),
    }
    res = synthesize_total_condition(
        det_type="healthy",
        crop_name="Lettuce",
        primary_conf=0.96,
        pest_name=None,
        disease_name=None,
        condition_raw=cond_raw,
    )
    assert res["promoted_detection_type"] == "pest_damage"
    ca = res["condition_assessment"]
    assert ca["overall_condition"] == "Pest-Damaged Foliage"
    assert ca["health_score"] < 60
    assert ca["pest_damage"]["key"] == "chewing_damage"
    assert any(c["name"] == "Cabbage Looper" for c in ca["probable_pests"])
    assert "screened_targets" in ca
    assert "Green Peach Aphid" in ca["screened_targets"]["pests"]
    assert "Downy Mildew of Lettuce" in ca["screened_targets"]["diseases"]
    assert "Alternaria Leaf Spot of Brassicas" not in ca["screened_targets"]["diseases"]


def test_synthesize_catches_overwhelming_holes_even_when_clip_healthy_is_above_50_pct():
    # Clean high-res bright-green perforated leaf (99% green, 77 holes, 1.43% area) where CLIP ViT-B-32
    # blurs away small holes and outputs p_healthy=0.51 -> must STILL be caught as pest_damage!
    cond_raw = {
        "available": True,
        "visual_signals": {
            "green_foliage_pct": 99.3,
            "yellow_chlorosis_pct": 0.2,
            "brown_necrosis_pct": 0.0,
            "leaf_hole_count": 77,
            "hole_area_pct": 1.43,
        },
        "group_probs": {"healthy": 0.51, "pest_damage": 0.14, "nutrient_deficiency": 0.21, "infectious_disease": 0.14},
        "top_pest_damage": ("chewing_damage", 0.10),
        "top_nutrient_deficiency": ("potassium_deficiency", 0.14),
    }
    res = synthesize_total_condition(
        det_type="healthy",
        crop_name="Lettuce",
        primary_conf=0.50,
        pest_name=None,
        disease_name=None,
        condition_raw=cond_raw,
    )
    assert res["promoted_detection_type"] == "pest_damage"
    assert res["condition_assessment"]["overall_condition"] == "Pest-Damaged Foliage"
    assert res["condition_assessment"]["health_score"] < 60


def test_synthesize_catches_zoomed_in_large_caterpillar_chew_holes():
    # Close-up zoomed scan showing 5 large caterpillar chew holes covering 1.0% of the leaf blade
    cond_raw = {
        "available": True,
        "visual_signals": {
            "green_foliage_pct": 99.6,
            "yellow_chlorosis_pct": 0.0,
            "brown_necrosis_pct": 0.0,
            "leaf_hole_count": 5,
            "hole_area_pct": 1.02,
        },
        "group_probs": {"healthy": 0.11, "pest_damage": 0.04, "nutrient_deficiency": 0.07, "infectious_disease": 0.78},
        "top_pest_damage": ("chewing_damage", 0.02),
        "top_nutrient_deficiency": ("potassium_deficiency", 0.04),
    }
    res = synthesize_total_condition(
        det_type="healthy",
        crop_name="Lettuce",
        primary_conf=0.60,
        pest_name=None,
        disease_name=None,
        condition_raw=cond_raw,
    )
    assert res["promoted_detection_type"] == "pest_damage"
    assert res["condition_assessment"]["pest_damage"]["key"] == "chewing_damage"
    assert res["condition_assessment"]["health_score"] < 60


def test_two_angle_fusion_upgrades_top_damage_with_underside_pest():
    from app.api.v1.endpoints.detections import _fuse_two_angle_results

    top = {
        "rejected": False,
        "detection_type": "pest_damage",
        "pest_name": "Chewing / Skeletonized Foliage Damage",
        "confidence": 0.78,
        "severity": "High",
        "condition_assessment": {
            "overall_condition": "Pest-Damaged Foliage",
            "condition_summary": "Lettuce shows chewed holes.",
            "health_score": 52,
        },
    }
    underside = {
        "rejected": False,
        "detection_type": "pest",
        "pest_id": 2,
        "pest_name": "Green Peach Aphid",
        "scientific_name": "Myzus persicae",
        "confidence": 0.86,
        "severity": "High",
        "recommended_action": "Spray neem oil on leaf undersides.",
        "condition_assessment": {
            "overall_condition": "Active Pest Infestation",
            "condition_summary": "Active Green Peach Aphid detected on Lettuce.",
            "health_score": 44,
        },
    }
    fused = _fuse_two_angle_results(top, underside, "/static/uploads/detections/under.jpg")
    assert fused["detection_type"] == "pest"
    assert fused["pest_name"] == "Green Peach Aphid"
    assert fused["condition_assessment"]["health_score"] == 44
    assert fused["condition_assessment"]["two_angle_scan"]["enabled"] is True
    assert fused["condition_assessment"]["two_angle_scan"]["underside_outcome"] == "pest"


def test_resolver_handles_native_yolo_pest_damage_and_nutrient_classes():
    dmg_res = resolve_logical_detections(
        [_make_det("chewing_damage", 0.78, box=(0.2, 0.2, 0.7, 0.7))],
        selected_crop_name="Lettuce",
    )
    assert dmg_res["rejected"] is False
    assert dmg_res["detection_type"] == "pest_damage"
    assert len(dmg_res["pest_damage_hits"]) == 1

    nut_res = resolve_logical_detections(
        [_make_det("nitrogen_deficiency", 0.81, box=(0.1, 0.1, 0.85, 0.85))],
        selected_crop_name="Bok Choy",
    )
    assert nut_res["rejected"] is False
    assert nut_res["detection_type"] == "nutrient_deficiency"
    assert len(nut_res["nutrient_hits"]) == 1


def test_pure_green_perforated_leaf_overrides_false_disease_to_pest_damage():
    # A 99% bright-green leaf with 0% yellowing/browning and 60 sharp insect chew holes
    # must resolve to pest_damage even if YOLO confuses the dark holes for a foliar leaf spot.
    cond_raw = {
        "available": True,
        "visual_signals": {
            "green_foliage_pct": 99.3,
            "yellow_chlorosis_pct": 0.2,
            "brown_necrosis_pct": 0.0,
            "leaf_hole_count": 60,
            "hole_area_pct": 1.94,
        },
        "group_probs": {"healthy": 0.45, "pest_damage": 0.25, "nutrient_deficiency": 0.15, "infectious_disease": 0.15},
        "top_pest_damage": ("chewing_damage", 0.20),
        "top_nutrient_deficiency": None,
    }
    res = synthesize_total_condition(
        det_type="disease",
        crop_name="Lettuce",
        primary_conf=0.76,
        pest_name=None,
        disease_name="Downy Mildew of Lettuce",
        condition_raw=cond_raw,
    )
    assert res["promoted_detection_type"] == "pest_damage"
    assert res["condition_assessment"]["overall_condition"] == "Pest-Damaged Foliage"


def test_synthesize_promotes_yellowing_leaf_to_nutrient_deficiency():
    cond_raw = {
        "available": True,
        "visual_signals": {"green_foliage_pct": 40.0, "yellow_chlorosis_pct": 38.0, "brown_necrosis_pct": 4.0},
        "group_probs": {"healthy": 0.08, "pest_damage": 0.07, "nutrient_deficiency": 0.74, "infectious_disease": 0.11},
        "top_pest_damage": ("sucking_damage", 0.05),
        "top_nutrient_deficiency": ("nitrogen_deficiency", 0.61),
    }
    res = synthesize_total_condition(
        det_type="none",
        crop_name="Lettuce",
        primary_conf=0.0,
        pest_name=None,
        disease_name=None,
        condition_raw=cond_raw,
    )
    assert res["promoted_detection_type"] == "nutrient_deficiency"
    ca = res["condition_assessment"]
    assert ca["overall_condition"] == "Nutrient Deficiency / Abiotic Stress"
    assert ca["nutrient_deficiency"]["key"] == "nitrogen_deficiency"
    assert ca["probable_pests"] == []


def test_visual_foliage_signals_quantifies_green_vs_yellow_chlorosis():
    yellow_leaf = Image.new("RGB", (120, 120), (220, 210, 45))
    sig = extract_visual_foliage_signals(yellow_leaf)
    assert sig["yellow_chlorosis_pct"] >= 80.0
    assert sig["green_foliage_pct"] <= 10.0


# ---------------------------------------------------------------------------
# 3. Real AI Engine Integration Tests (runs when best.pt + ultralytics exist)
# ---------------------------------------------------------------------------

BEST_PT = REPO_ROOT / "backend" / "app" / "ml_models" / "best.pt"
TEST_DATASET_DIR = REPO_ROOT / "datasets" / "yolo_dataset" / "images" / "test"


@pytest.mark.skipif(not BEST_PT.exists(), reason="Trained YOLOv8 weights not present")
def test_ai_engine_rejects_non_crop_images_and_screenshots(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "ai")
    detection_limiter.clear_all()
    headers = _login_farmer()

    # A. Pitch-black image -> 422 rejected
    black_buf = BytesIO()
    Image.new("RGB", (300, 300), (0, 0, 0)).save(black_buf, format="JPEG")
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("black.jpg", black_buf.getvalue(), "image/jpeg")},
    )
    assert resp.status_code == 422

    # B. Random noise image -> 422 rejected
    rng = np.random.default_rng(123)
    noise_buf = BytesIO()
    Image.fromarray(rng.integers(0, 255, (320, 320, 3), dtype=np.uint8)).save(noise_buf, format="JPEG")
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("noise.jpg", noise_buf.getvalue(), "image/jpeg")},
    )
    assert resp.status_code == 422

    # C. UI Dashboard screenshot (previously caused 67% YOLO false positive!) -> 422 rejected
    dashboard_png = REPO_ROOT / "stitch-frontend" / "dashboard" / "screen.png"
    if dashboard_png.exists():
        resp = client.post(
            "/api/v1/detections/detect",
            headers=headers,
            files={"file": ("dashboard.png", dashboard_png.read_bytes(), "image/png")},
        )
        assert resp.status_code == 422

    # D. Live-check must also reject blank/noise frames cleanly
    live_resp = client.post(
        "/api/v1/detections/live-check",
        headers=headers,
        files={"file": ("noise.jpg", noise_buf.getvalue(), "image/jpeg")},
    )
    assert live_resp.status_code == 200
    assert live_resp.json()["detected"] is False
    assert live_resp.json()["crop_recognized"] is False


@pytest.mark.skipif(
    not (BEST_PT.exists() and TEST_DATASET_DIR.exists()),
    reason="Trained weights or test dataset not present",
)
def test_ai_engine_returns_clean_single_outcomes_on_real_specimens(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "ai")
    detection_limiter.clear_all()
    headers = _login_farmer()

    # 1. Healthy Lettuce -> 'healthy' (no pest, no disease!)
    lettuce_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "lettuce_healthy__*")))
    assert lettuce_imgs
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("lettuce.jpg", Path(lettuce_imgs[0]).read_bytes(), "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    det = resp.json()
    assert det["detection_type"] == "healthy"
    assert det["pest_id"] is None
    assert det["detected_disease_name"] is None
    client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 2. Active insect pest specimen (Diamondback Moth) -> 'pest' (no fabricated disease!)
    pest_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "diamondback_moth__*")))
    assert pest_imgs
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("dbm.jpg", Path(pest_imgs[0]).read_bytes(), "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    det = resp.json()
    assert det["detection_type"] == "pest"
    assert det["detected_disease_name"] is None
    client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 3. Foliar disease specimen (Brassica Alternaria Leaf Spot) -> 'disease' (no fabricated pest!)
    disease_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "brassica_alternaria_leaf_spot__*")))
    assert disease_imgs
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("alternaria.jpg", Path(disease_imgs[0]).read_bytes(), "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    det = resp.json()
    assert det["detection_type"] == "disease"
    assert det["pest_id"] is None
    assert det["detected_pest_name"] == "No Pest Detected"
    assert det["detected_disease_name"] is not None
    client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 4. Native Indirect Pest Damage (Chewing Damage) -> 'pest_damage' with probable culprits
    chew_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "chewing_damage__*")))
    if chew_imgs:
        resp = client.post(
            "/api/v1/detections/detect",
            headers=headers,
            files={"file": ("chewed.jpg", Path(chew_imgs[0]).read_bytes(), "image/jpeg")},
        )
        assert resp.status_code == 201, resp.text
        det = resp.json()
        assert det["detection_type"] == "pest_damage"
        assert det["condition_assessment"]["probable_pests"]
        client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 5. Native Nutrient Deficiency (Potassium Deficiency) -> 'nutrient_deficiency'
    nut_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "potassium_deficiency__*")))
    if nut_imgs:
        resp = client.post(
            "/api/v1/detections/detect",
            headers=headers,
            files={"file": ("potassium.jpg", Path(nut_imgs[0]).read_bytes(), "image/jpeg")},
        )
        assert resp.status_code == 201, resp.text
        det = resp.json()
        assert det["detection_type"] == "nutrient_deficiency"
        assert det["condition_assessment"]["nutrient_deficiency"] is not None
        client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 4. Herbarium paper card & non-target wild weed in test folder must be REJECTED (422)
    herbarium_card = TEST_DATASET_DIR / "brassica_alternaria_leaf_spot__gbif_1a4a7d250f64.jpg"
    if herbarium_card.exists():
        rej = client.post(
            "/api/v1/detections/detect",
            headers=headers,
            files={"file": ("card.jpg", herbarium_card.read_bytes(), "image/jpeg")},
        )
        assert rej.status_code == 422
