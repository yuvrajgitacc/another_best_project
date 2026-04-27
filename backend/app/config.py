"""
Application configuration loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from __future__ import annotations

import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central settings object, populated from .env file."""

    # --- App ---
    APP_NAME: str = "SevaSetu"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production-please"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # --- Gemini AI ---
    GEMINI_API_KEY: str = ""

    # --- Firebase Cloud Messaging ---
    FCM_SERVER_KEY: str = ""

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./smartalloc.db"

    @property
    def effective_db_url(self) -> str:
        """Use plain SQLite — compatible with Python 3.11 on Render."""
        return self.DATABASE_URL

    # --- CORS ---
    FRONTEND_ADMIN_URL: str = "http://localhost:5173"
    FRONTEND_VOLUNTEER_URL: str = "http://localhost:5174"
    # Optional comma-separated list of extra allowed origins (e.g. Render + Capacitor)
    CORS_ORIGINS: str = ""

    # --- File Uploads ---
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # --- OpenWeatherMap ---
    OWM_API_KEY: str = ""

    # --- JWT ---
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # --- Matching Algorithm Weights ---
    MATCH_WEIGHT_DISTANCE: float = 0.40
    MATCH_WEIGHT_SKILL: float = 0.35
    MATCH_WEIGHT_AVAILABILITY: float = 0.25
    MATCH_MAX_DISTANCE_KM: float = 50.0

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            self.FRONTEND_ADMIN_URL,
            self.FRONTEND_VOLUNTEER_URL,
            "http://localhost:5175",
            # Capacitor / WebView origins (for APK)
            "capacitor://localhost",
            "ionic://localhost",
            "http://localhost",
        ]

        if self.DEBUG:
            origins.append("http://localhost:3000")

        extra = [o.strip() for o in (self.CORS_ORIGINS or "").split(",") if o.strip()]
        origins.extend(extra)

        # De-dupe while preserving order
        seen: set[str] = set()
        uniq: list[str] = []
        for o in origins:
            if o not in seen:
                seen.add(o)
                uniq.append(o)
        return uniq

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
