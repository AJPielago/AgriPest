from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class DashboardStatsOut(BaseModel):
    total_detections: int
    recent_detections_count: int
    avg_confidence: float
    top_pests: List[Dict[str, Any]]
    detection_mode: str
    recent_records: List[Dict[str, Any]]
    severity_dist: Optional[Dict[str, int]] = {}
    monthly_trends: Optional[List[Dict[str, Any]]] = []
    location_breakdown: Optional[List[Dict[str, Any]]] = []
