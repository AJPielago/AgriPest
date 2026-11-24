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

    # 2. Pest specimen (Green Peach Aphid) -> 'pest' (no fabricated disease!)
    aphid_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "green_peach_aphid__*")))
    assert aphid_imgs
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("aphid.jpg", Path(aphid_imgs[0]).read_bytes(), "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    det = resp.json()
    assert det["detection_type"] == "pest"
    assert det["detected_disease_name"] is None
    client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 3. Disease specimen (Lettuce Powdery Mildew on real lettuce leaf) -> 'disease' (no fabricated pest!)
    disease_imgs = sorted(glob.glob(str(TEST_DATASET_DIR / "lettuce_powdery_mildew__*")))
    assert disease_imgs
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("mildew.jpg", Path(disease_imgs[0]).read_bytes(), "image/jpeg")},
    )
    assert resp.status_code == 201, resp.text
    det = resp.json()
    assert det["detection_type"] == "disease"
    assert det["pest_id"] is None
    assert det["detected_pest_name"] == "No Pest Detected"
    assert det["detected_disease_name"] is not None
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
