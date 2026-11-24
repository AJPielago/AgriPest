import pytest
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token(email="farmer@pestdetect.com", password="farmer123"):
    response = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password}
    )
    assert response.status_code == 200
    return response.json()["access_token"]

def test_list_diseases():
    response = client.get("/api/v1/diseases")
    assert response.status_code == 200
    diseases = response.json()
    assert len(diseases) >= 1
    # Check that disease properties exist
    first = diseases[0]
    assert "name" in first
    assert "pathogen_type" in first
    assert "recommendations" in first

def test_filter_diseases_by_pathogen():
    response = client.get("/api/v1/diseases?pathogen_type=Bacterial")
    assert response.status_code == 200
    diseases = response.json()
    assert all(d["pathogen_type"].lower() == "bacterial" for d in diseases)

def test_get_disease_detail():
    list_resp = client.get("/api/v1/diseases")
    first_id = list_resp.json()[0]["id"]

    detail_resp = client.get(f"/api/v1/diseases/{first_id}")
    assert detail_resp.status_code == 200
    disease = detail_resp.json()
    assert disease["id"] == first_id
    assert "symptoms" in disease

from app.core.config import settings
from app.core.rate_limiter import detection_limiter

def test_mock_detection_returns_logical_single_or_dual_outcome(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "mock")
    detection_limiter.clear_all()
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Valid leafy-green-colored image should produce one of the 4 logical states
    img = Image.new("RGB", (200, 200), color="green")
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    files = {"file": ("crop_test.jpg", img_bytes, "image/jpeg")}
    data = {"crop_id": 1, "weather_condition": "Humid", "field_location": "North Plot 3"}

    detect_resp = client.post("/api/v1/detections/detect", headers=headers, files=files, data=data)
    assert detect_resp.status_code == 201
    det = detect_resp.json()

    assert det["detection_type"] in {"healthy", "pest", "disease", "pest_and_disease"}
    assert det["confidence_score"] > 0.0
    assert len(det.get("bounding_boxes", [])) >= 1

    if det["detection_type"] == "healthy":
        assert det["pest_id"] is None
        assert det["detected_disease_name"] is None
    elif det["detection_type"] == "pest":
        assert det["detected_disease_name"] is None
    elif det["detection_type"] == "disease":
        assert det["pest_id"] is None
        assert det["detected_pest_name"] == "No Pest Detected"
        assert det["detected_disease_name"] is not None
        assert det["disease_confidence_score"] > 0.0
    else:
        assert det["detected_pest_name"] is not None
        assert det["detected_disease_name"] is not None

    # Clean up test record
    client.delete(f"/api/v1/detections/{det['id']}", headers=headers)

    # 2. Pure black / non-leafy image must be rejected even in mock mode
    black_img = Image.new("RGB", (200, 200), color=(0, 0, 0))
    black_buf = BytesIO()
    black_img.save(black_buf, format="JPEG")
    rej_resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("black.jpg", black_buf.getvalue(), "image/jpeg")},
        data={"crop_id": 1},
    )
    assert rej_resp.status_code == 422

def test_admin_create_and_manage_disease():
    admin_token = get_auth_token("admin@pestdetect.com", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    new_disease = {
        "name": "Test Anthracnose",
        "scientific_name": "Colletotrichum spp.",
        "pathogen_type": "Fungal",
        "severity_default": "Moderate",
        "description": "Fungal pathogen causing sunken dark lesions.",
        "symptoms": "Dark sunken circular lesions with concentric rings."
    }

    create_resp = client.post("/api/v1/diseases", headers=headers, json=new_disease)
    assert create_resp.status_code in [201, 400]  # 400 if already created in rerun

    if create_resp.status_code == 201:
        created_id = create_resp.json()["id"]

        # Add recommendation
        rec_data = {
            "action_title": "Copper Spray",
            "description": "Apply copper-based fungicide at flowering stage.",
            "management_type": "Chemical"
        }
        rec_resp = client.post(f"/api/v1/diseases/{created_id}/recommendations", headers=headers, json=rec_data)
        assert rec_resp.status_code == 201

        # Delete disease
        del_resp = client.delete(f"/api/v1/diseases/{created_id}", headers=headers)
        assert del_resp.status_code == 200

