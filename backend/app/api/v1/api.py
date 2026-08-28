from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, crops, pests, detections, dashboard, admin, audit

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/admin/users", tags=["Admin Users"])
api_router.include_router(crops.router, prefix="/crops", tags=["Crops"])
api_router.include_router(pests.router, prefix="/pests", tags=["Pests & Recommendations"])
api_router.include_router(detections.router, prefix="/detections", tags=["Detection Engine & History"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin Operations"])
api_router.include_router(audit.router, prefix="/admin/audit", tags=["Admin Audit Trail"])
