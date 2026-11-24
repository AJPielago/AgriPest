import os
from io import BytesIO
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.rate_limiter import login_limiter, detection_limiter
from app.services.detection.factory import get_detection_service, clear_detection_service_cache

client = TestClient(app)


def _login(email: str, password: str) -> str:
    login_limiter.clear_all()
    resp = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


def _jpeg_bytes() -> bytes:
    img = Image.new("RGB", (160, 160), color="green")
    buf = BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_detection_service_singleton_caching(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "mock")
    clear_detection_service_cache()
    svc1 = get_detection_service()
    svc2 = get_detection_service()
    assert svc1 is svc2


def test_live_check_writes_zero_temp_files(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "mock")
    token = _login("farmer@pestdetect.com", "farmer123")
    headers = {"Authorization": f"Bearer {token}"}

    det_dir = os.path.join(settings.UPLOAD_DIR, "detections")
    before_files = set(os.listdir(det_dir)) if os.path.exists(det_dir) else set()

    resp = client.post(
        "/api/v1/detections/live-check",
        headers=headers,
        files={"file": ("frame.jpg", _jpeg_bytes(), "image/jpeg")},
        data={"crop_id": 1},
    )
    assert resp.status_code == 200
    assert resp.json()["crop_recognized"] is True

    after_files = set(os.listdir(det_dir)) if os.path.exists(det_dir) else set()
    assert before_files == after_files


def test_gps_metadata_server_filtering_and_notification_persistence(monkeypatch):
    monkeypatch.setattr(settings, "DETECTION_MODE", "mock")
    detection_limiter.clear_all()
    token = _login("farmer@pestdetect.com", "farmer123")
    headers = {"Authorization": f"Bearer {token}"}

    unique_sector = "Sector-GPS-Test-99"
    create_resp = client.post(
        "/api/v1/detections/detect",
        headers=headers,
        files={"file": ("gps_leaf.jpg", _jpeg_bytes(), "image/jpeg")},
        data={
            "crop_id": 1,
            "weather_condition": "Humid",
            "field_location": unique_sector,
            "latitude": 14.1436,
            "longitude": 121.5137,
        },
    )
    assert create_resp.status_code == 201
    det = create_resp.json()
    assert det["latitude"] == 14.1436
    assert det["longitude"] == 121.5137
    assert det["is_acknowledged"] is False

    # Server-side search filter
    search_resp = client.get(f"/api/v1/detections?search={unique_sector}", headers=headers)
    assert search_resp.status_code == 200
    found_ids = [item["id"] for item in search_resp.json()["items"]]
    assert det["id"] in found_ids

    # Mark notifications read and confirm persisted unread_count == 0
    mark_resp = client.post("/api/v1/detections/notifications/mark-read", headers=headers)
    assert mark_resp.status_code == 200
    unread_resp = client.get("/api/v1/detections/notifications/unread-count", headers=headers)
    assert unread_resp.status_code == 200
    assert unread_resp.json()["unread_count"] == 0

    # Clean up test record
    client.delete(f"/api/v1/detections/{det['id']}", headers=headers)


def test_audit_server_side_category_filter_and_dashboard_telemetry():
    admin_token = _login("admin@pestdetect.com", "admin123")
    headers = {"Authorization": f"Bearer {admin_token}"}

    audit_resp = client.get("/api/v1/admin/audit?category=AUTH&limit=10", headers=headers)
    assert audit_resp.status_code == 200
    body = audit_resp.json()
    assert "total" in body and "items" in body
    assert all(
        any(tok in item["action"].upper() for tok in ("LOGIN", "AUTH", "REGISTER"))
        for item in body["items"]
    )

    dash_resp = client.get("/api/v1/dashboard/stats", headers=headers)
    assert dash_resp.status_code == 200
    stats = dash_resp.json()
    assert "crop_health_summary" in stats
    assert "daily_health_trend" in stats
    assert "overall_health_score" in stats
    assert "unread_alerts_count" in stats
    assert 20 <= stats["overall_health_score"] <= 100
