import pytest
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_live_check_frame_endpoint():
    # 1. Login to retrieve bearer token
    login_resp = client.post(
        "/api/v1/auth/login",
        data={"username": "farmer@pestdetect.com", "password": "farmer123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Generate a valid image frame
    img = Image.new("RGB", (300, 300), color="green")
    img_byte_arr = BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    # 3. Post to /api/v1/detections/live-check
    files = {"file": ("camera_frame.jpg", img_bytes, "image/jpeg")}
    data = {"crop_id": 1}

    resp = client.post("/api/v1/detections/live-check", headers=headers, files=files, data=data)
    assert resp.status_code == 200
    res_data = resp.json()

    assert "detected" in res_data
    assert "crop_recognized" in res_data
    assert "confidence" in res_data
    assert "auto_trigger" in res_data
    assert "bounding_boxes" in res_data
    assert "message" in res_data
