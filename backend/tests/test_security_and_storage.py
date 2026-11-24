import os
import uuid
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.rate_limiter import login_limiter, register_limiter, detection_limiter

client = TestClient(app)


def _login(email: str, password: str) -> str:
    login_limiter.clear_all()
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def test_public_registration_prevents_admin_privilege_escalation():
    register_limiter.clear_all()
    unique_email = f"sec_test_{uuid.uuid4().hex[:8]}@example.com"
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": unique_email,
            "full_name": "Attempted Admin",
            "password": "StrongPassword123!",
            "role_id": 1,  # Attempt to claim admin role_id=1
        },
    )
    assert resp.status_code == 201
    user_data = resp.json()
    assert user_data["role"]["name"] == "farmer"

    # Clean up created user via admin API
    admin_token = _login("admin@pestdetect.com", "admin123")
    del_resp = client.delete(
        f"/api/v1/users/{user_data['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert del_resp.status_code == 200


def test_security_headers_and_cors_rejection():
    resp = client.get("/", headers={"Origin": "https://evil-attacker.example"})
    assert resp.status_code == 200
    assert resp.headers.get("x-content-type-options") == "nosniff"
    assert resp.headers.get("x-frame-options") == "DENY"
    assert "x-process-time-ms" in resp.headers
    # Disallowed public origin must NOT receive Access-Control-Allow-Origin
    assert resp.headers.get("access-control-allow-origin") != "https://evil-attacker.example"


def test_delete_detection_removes_uploaded_file_from_disk(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "mock")
    detection_limiter.clear_all()
    token = _login("farmer@pestdetect.com", "farmer123")
    headers = {"Authorization": f"Bearer {token}"}

    img = Image.new("RGB", (128, 128), color="green")
    buf = BytesIO()
    img.save(buf, format="JPEG")

    create_resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("cleanup_test.jpg", buf.getvalue(), "image/jpeg")},
    )
    assert create_resp.status_code == 201
    det = create_resp.json()
    rel = det["image_path"].replace("/static/uploads/", "").lstrip("/\\")
    disk_path = os.path.join(settings.UPLOAD_DIR, rel)
    assert os.path.exists(disk_path)

    del_resp = client.delete(f"/api/v1/detections/{det['id']}", headers=headers)
    assert del_resp.status_code == 200
    assert not os.path.exists(disk_path)


def test_oversized_upload_is_rejected(monkeypatch):
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_MB", 1)
    monkeypatch.setattr(settings, "DETECTION_MODE", "mock")
    detection_limiter.clear_all()
    token = _login("farmer@pestdetect.com", "farmer123")
    headers = {"Authorization": f"Bearer {token}"}

    oversized_bytes = b"0" * (1 * 1024 * 1024 + 2048)
    resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("huge.jpg", oversized_bytes, "image/jpeg")},
    )
    assert resp.status_code == 400
    assert "exceeds maximum allowed limit" in resp.json()["detail"]


def test_admin_health_reports_recursive_upload_stats():
    admin_token = _login("admin@pestdetect.com", "admin123")
    resp = client.get("/api/v1/admin/health", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "upload_total_size_mb" in data
    assert isinstance(data["upload_file_count"], int)
