from app.core.config import settings
from app.services.detection.base import BaseDetectionService
from app.services.detection.mock_service import MockDetectionService
from app.services.detection.ai_service import AIDetectionService

def get_detection_service() -> BaseDetectionService:
    mode = settings.DETECTION_MODE.lower()
    if mode == "ai":
        return AIDetectionService()
    return MockDetectionService()
