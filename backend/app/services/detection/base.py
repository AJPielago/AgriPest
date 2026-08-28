from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

class BaseDetectionService(ABC):
    @abstractmethod
    async def analyze_image(
        self, 
        image_path: str, 
        crop_id: Optional[int] = None, 
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Processes an uploaded crop image and returns standardized detection metadata.
        
        Expected Return Keys:
        - pest_name (str)
        - scientific_name (str)
        - confidence (float: 0.0 to 1.0)
        - severity (str: 'Low', 'Moderate', 'High', 'Critical')
        - description (str)
        - recommended_action (str)
        - pest_id (int | None)
        - crop_id (int | None)
        - crop_name (str | None)
        - bounding_boxes (list of dicts)
        """
        pass

    @abstractmethod
    async def check_live_frame(
        self,
        image_path: str,
        crop_id: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Pre-screens a live camera frame to check if crop/pest is recognized with high confidence.

        Expected Return Keys:
        - detected (bool)
        - crop_recognized (bool)
        - confidence (float)
        - bounding_boxes (list)
        - message (str)
        """
        pass

