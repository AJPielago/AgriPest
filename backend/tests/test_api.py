import pytest
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "detection_mode" in data

def test_login_and_me():
    # Login as farmer
    response = client.post(
        "/api/v1/auth/login",
        data={"username": "farmer@pestdetect.com", "password": "farmer123"}
    )
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Verify /me endpoint
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "farmer@pestdetect.com"

def test_list_crops():
    response = client.get("/api/v1/crops")
    assert response.status_code == 200
    crops = response.json()
    assert len(crops) >= 1
    assert any(c["name"] == "Corn" for c in crops)

def test_list_pests():
    response = client.get("/api/v1/pests")
    assert response.status_code == 200
    pests = response.json()
    assert len(pests) >= 1

def test_mock_detection_upload():
    # 1. Login
    login_resp = client.post(
        "/api/v1/auth/login",
        data={"username": "farmer@pestdetect.com", "password": "farmer123"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create valid test image bytes
    img = Image.new("RGB", (200, 200), color="green")
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    # 3. Post to /api/v1/detect
    files = {"file": ("test_crop.jpg", img_bytes, "image/jpeg")}
    data = {"crop_id": 1}

    detect_resp = client.post("/api/v1/detections/detect", headers=headers, files=files, data=data)
    assert detect_resp.status_code == 201
    det_result = detect_resp.json()

    assert "detected_pest_name" in det_result
    assert "confidence_score" in det_result
    assert det_result["confidence_score"] > 0.0
    assert "recommended_action" in det_result
    assert det_result["severity"] in ["Low", "Moderate", "High", "Critical"]

def test_dashboard_stats():
    login_resp = client.post(
        "/api/v1/auth/login",
        data={"username": "farmer@pestdetect.com", "password": "farmer123"}
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    dash_resp = client.get("/api/v1/dashboard/stats", headers=headers)
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert "total_detections" in stats
    assert stats["total_detections"] >= 1

from app.core.rate_limiter import login_limiter

def test_login_rate_limiting():
    login_limiter.clear_all()
    # Attempt invalid logins until rate limit is triggered
    for i in range(5):
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "farmer@pestdetect.com", "password": "wrongpassword"}
        )
        assert resp.status_code == 401
    
    # 6th attempt should be blocked by rate limiter with 429
    blocked_resp = client.post(
        "/api/v1/auth/login",
        data={"username": "farmer@pestdetect.com", "password": "wrongpassword"}
    )
    assert blocked_resp.status_code == 429
    assert "Too many failed login attempts" in blocked_resp.json()["detail"]

    # Reset limiter after test completes
    login_limiter.clear_all()

