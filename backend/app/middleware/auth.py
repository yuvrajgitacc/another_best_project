from __future__ import annotations

"""
Authentication middleware.
- Google OAuth ID token verification
- JWT creation and verification
- FastAPI dependency for protected routes
- Role-based access control
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import User

logger = logging.getLogger(__name__)
settings = get_settings()

# Bearer token extraction
security = HTTPBearer(auto_error=False)


# ============================================================
# JWT TOKEN MANAGEMENT
# ============================================================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=settings.JWT_EXPIRATION_HOURS))
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT token. Raises on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ============================================================
# GOOGLE OAUTH TOKEN VERIFICATION
# ============================================================

def verify_google_token(id_token: str) -> dict:
    """
    Verify a Google OAuth ID token and extract user info.

    Returns:
        dict with 'sub' (Google user ID), 'email', 'name', 'picture'
    """
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        # Verify the token with Google
        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        # Verify issuer
        if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid issuer")

        return {
            "google_id": idinfo["sub"],
            "email": idinfo.get("email", ""),
            "name": idinfo.get("name", "Unknown"),
            "picture": idinfo.get("picture", ""),
            "email_verified": idinfo.get("email_verified", False),
        }

    except ValueError as e:
        logger.error(f"Google token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google token: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Google OAuth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to verify Google credentials",
        )


# ============================================================
# FASTAPI DEPENDENCIES
# ============================================================

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency: Extract and validate the current user from JWT.
    Use in any protected route.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # DEV MODE: bypass JWT for development convenience
    if settings.DEBUG and credentials.credentials.startswith("dev-"):
        if credentials.credentials == "dev-vol-token":
            # Return a volunteer user (for volunteer app)
            from ..models import Volunteer
            vol = db.query(Volunteer).first()
            if vol:
                vol_user = db.query(User).filter(User.id == vol.user_id).first()
                if vol_user:
                    return vol_user
        # Default: return admin user (for admin dashboard)
        admin = db.query(User).filter(User.role == "admin", User.is_active == True).first()
        if admin:
            return admin
        # Fallback: return any active user
        any_user = db.query(User).filter(User.is_active == True).first()
        if any_user:
            return any_user
        raise HTTPException(status_code=404, detail="No users in database. Run seed_data.py first.")

    payload = decode_access_token(credentials.credentials)

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload — missing 'sub'",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    FastAPI dependency: Ensure the current user is an admin.
    Use in admin-only routes.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    FastAPI dependency: Optionally extract user if token is provided.
    Returns None if no token. Use for endpoints that work for both
    authenticated and anonymous users.
    """
    if credentials is None:
        return None

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id:
            return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except HTTPException:
        pass

    return None
