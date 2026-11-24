from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.core.db import get_db
from app.core.security import get_current_admin
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()

@router.get("")
def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    category: Optional[str] = Query(None, description="ALL | DETECTION | AUTH | ADMIN"),
    search: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieve system activity audit log entries with server-side filtering & pagination (Admin only)."""
    query = db.query(AuditLog)

    cat = (category or "ALL").upper()
    if cat == "DETECTION":
        query = query.filter(AuditLog.action.ilike("%DETECTION%"))
    elif cat == "AUTH":
        query = query.filter(
            or_(
                AuditLog.action.ilike("%LOGIN%"),
                AuditLog.action.ilike("%AUTH%"),
                AuditLog.action.ilike("%REGISTER%"),
            )
        )
    elif cat == "ADMIN":
        query = query.filter(
            or_(
                AuditLog.action.ilike("%ADMIN%"),
                AuditLog.action.ilike("%USER%"),
                AuditLog.action.ilike("%CROP%"),
                AuditLog.action.ilike("%PEST%"),
                AuditLog.action.ilike("%DISEASE%"),
            )
        )

    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                AuditLog.action.ilike(pattern),
                AuditLog.details.ilike(pattern),
                AuditLog.ip_address.ilike(pattern),
            )
        )

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

    return {"total": total, "skip": skip, "limit": limit, "items": items}
