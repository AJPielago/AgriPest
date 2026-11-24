import threading
from typing import Dict
from app.core.config import settings
from app.services.detection.base import BaseDetectionService
from app.services.detection.mock_service import MockDetectionService
from app.services.detection.ai_service import AIDetectionService

_service_cache: Dict[str, BaseDetectionService] = {}
_cache_lock = threading.Lock()


def get_detection_service() -> BaseDetectionService:
    """Returns a cached singleton detection service per mode to avoid reloading YOLO weights per request."""
    mode = settings.DETECTION_MODE.lower()
    cached = _service_cache.get(mode)
    if cached is not None:
        return cached
    with _cache_lock:
        cached = _service_cache.get(mode)
        if cached is None:
            cached = AIDetectionService() if mode == "ai" else MockDetectionService()
            _service_cache[mode] = cached
        return cached


def clear_detection_service_cache() -> None:
    with _cache_lock:
        _service_cache.clear()
