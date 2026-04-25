from __future__ import annotations

"""
Auth routes — Google OAuth login, email/password login, token refresh, profile.
"""

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import get_db
from ..models import User, Volunteer, AuditLog
from ..schemas import (
    GoogleAuthRequest, EmailRegisterRequest, EmailLoginRequest,
    AuthResponse, UserResponse, UserUpdateRequest, MessageResponse,
)
from ..middleware.auth import (
    verify_google_token, create_access_token,
    get_current_user,
)
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/google", response_model=AuthResponse)
async def google_login(
    body: GoogleAuthRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Authenticate with Google OAuth.
    1. Verify Google ID token
    2. Create or retrieve user
    3. Return JWT access token
    """
    # Verify Google token
    google_info = verify_google_token(body.id_token)

    # Check if user exists
    user = db.query(User).filter(User.google_id == google_info["google_id"]).first()
    is_new = False

    if user is None:
        # Also check by email (in case of prior registration)
        user = db.query(User).filter(User.email == google_info["email"]).first()
        if user:
            # Link Google account to existing email user
            user.google_id = google_info["google_id"]
            user.picture = google_info.get("picture") or user.picture
        else:
            # Create new user
            user = User(
                email=google_info["email"],
                name=google_info["name"],
                picture=google_info.get("picture"),
                role=body.role.value,
                google_id=google_info["google_id"],
            )
            db.add(user)
            db.flush()  # Get the ID assigned
            is_new = True

            # Auto-create volunteer profile if role is volunteer
            if body.role.value == "volunteer":
                volunteer = Volunteer(user_id=user.id)
                if body.fcm_token:
                    volunteer.fcm_token = body.fcm_token
                db.add(volunteer)

    else:
        # Update user info from Google (name, picture may change)
        user.name = google_info["name"]
        if google_info.get("picture"):
            user.picture = google_info["picture"]
        user.updated_at = datetime.now(timezone.utc)

        # Update FCM token if provided
        if body.fcm_token and user.volunteer_profile:
            user.volunteer_profile.fcm_token = body.fcm_token

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="auth.login" if not is_new else "auth.register",
        entity_type="user",
        entity_id=user.id,
        details=json.dumps({"method": "google", "is_new": is_new}),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500],
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    # Create JWT
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
        is_new_user=is_new,
    )


@router.post("/register", response_model=AuthResponse)
async def email_register(
    body: EmailRegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Register a new user with email and password."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Try logging in.",
        )

    # Create user with hashed password
    user = User(
        email=body.email,
        name=body.name,
        role=body.role.value,
        password_hash=pwd_context.hash(body.password),
    )
    db.add(user)
    db.flush()

    # Auto-create volunteer profile if role is volunteer
    if body.role.value == "volunteer":
        volunteer = Volunteer(user_id=user.id)
        db.add(volunteer)

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="auth.register",
        entity_type="user",
        entity_id=user.id,
        details=json.dumps({"method": "email"}),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500],
    )
    db.add(audit)
    db.commit()
    db.refresh(user)

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
        is_new_user=True,
    )


@router.post("/login", response_model=AuthResponse)
async def email_login(
    body: EmailLoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Login with email and password."""
    user = db.query(User).filter(User.email == body.email).first()

    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    # Audit log
    audit = AuditLog(
        user_id=user.id,
        action="auth.login",
        entity_type="user",
        entity_id=user.id,
        details=json.dumps({"method": "email"}),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent", "")[:500],
    )
    db.add(audit)
    db.commit()

    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role}
    )

    return AuthResponse(
        access_token=access_token,
        user=UserResponse.model_validate(user),
        is_new_user=False,
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile."""
    if body.name is not None:
        current_user.name = body.name
    if body.picture is not None:
        current_user.picture = body.picture

    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Log out — clear FCM token so notifications stop.
    JWT is stateless, so the client must discard the token.
    """
    if current_user.volunteer_profile:
        current_user.volunteer_profile.fcm_token = None
        current_user.volunteer_profile.availability = "offline"

    audit = AuditLog(
        user_id=current_user.id,
        action="auth.logout",
        entity_type="user",
        entity_id=current_user.id,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return MessageResponse(message="Logged out successfully")

