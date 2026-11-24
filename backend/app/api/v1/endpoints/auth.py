from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import get_password_hash, verify_password, create_access_token, get_current_user
from app.core.rate_limiter import login_limiter, register_limiter
from app.models.user import User
from app.models.role import Role
from app.models.audit_log import AuditLog
from app.schemas.user import UserCreate, UserOut
from app.schemas.auth import Token, PasswordChange

router = APIRouter()

@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register_user(request: Request, user_in: UserCreate, db: Session = Depends(get_db)):
    register_limiter.check_and_record(request)
    client_ip = register_limiter.get_client_ip(request)

    # Check existing email
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )
    
    # Security: Public registration MUST always assign the standard farmer role
    # (never trust client-supplied role_id to prevent privilege escalation).
    farmer_role = db.query(Role).filter(Role.name == "farmer").first()
    if not farmer_role:
        farmer_role = Role(name="farmer", description="Standard Farmer User")
        db.add(farmer_role)
        db.commit()
        db.refresh(farmer_role)

    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role_id=farmer_role.id,
        is_active=True
    )
    db.add(new_user)
    db.flush()
    db.add(AuditLog(
        user_id=new_user.id,
        action="USER_REGISTERED",
        details=f"New farmer account registered: {new_user.email}",
        ip_address=client_ip,
    ))
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    login_limiter.check_rate_limit(request)
    client_ip = login_limiter.get_client_ip(request)

    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        login_limiter.record_failed_attempt(request)
        db.add(AuditLog(
            user_id=user.id if user else None,
            action="LOGIN_FAILED",
            details=f"Failed login attempt for email: {form_data.username}",
            ip_address=client_ip,
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated."
        )

    login_limiter.reset_attempts(request)
    access_token = create_access_token(data={"sub": user.email})
    db.add(AuditLog(
        user_id=user.id,
        action="LOGIN_SUCCESS",
        details=f"User signed in: {user.email}",
        ip_address=client_ip,
    ))
    db.commit()
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/change-password")
def change_password(
    request: Request,
    pwd_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(pwd_data.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )
    current_user.password_hash = get_password_hash(pwd_data.new_password)
    db.add(AuditLog(
        user_id=current_user.id,
        action="AUTH_PASSWORD_CHANGED",
        details="User updated account password.",
        ip_address=login_limiter.get_client_ip(request),
    ))
    db.commit()
    return {"detail": "Password updated successfully."}
