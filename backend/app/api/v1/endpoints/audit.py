from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()

@router.get("")
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieve system activity audit log entries (Admin only)."""
    query = db.query(AuditLog)
    total = query.count()
    logs = query.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    items = [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_name": log.user.full_name if log.user else "System",
            "action": log.action,
            "details": log.details,
            "ip_address": log.ip_address,
            "created_at": log.created_at.isoformat()
        }
        for log in logs
    ]

    return {"total": total, "items": items}
