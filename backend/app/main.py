from __future__ import annotations

"""
FastAPI Application Entry Point.
Configures CORS, includes all routers, initializes DB on startup.
Serves static frontend builds (landing page + admin dashboard).
"""

import os
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse

from .config import get_settings
from .database import init_db

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

settings = get_settings()

# Static file directories (created by Render build script)
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
ADMIN_DIR = STATIC_DIR / "admin"


# ============================================================
# LIFESPAN — startup / shutdown
# ============================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events."""
    # STARTUP
    logger.info(f"🚀 Starting {settings.APP_NAME} ({settings.APP_ENV})")

    # Create upload directory
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Initialize database tables
    init_db()

    logger.info("✅ Database initialized")
    logger.info(f"📁 Uploads directory: {os.path.abspath(settings.UPLOAD_DIR)}")
    logger.info(f"🌐 CORS origins: {settings.cors_origins}")
    logger.info(f"📂 Static dir exists: {STATIC_DIR.exists()}")

    yield

    # SHUTDOWN
    logger.info("👋 Shutting down...")


# ============================================================
# APP CREATION
# ============================================================
app = FastAPI(
    title="Smart Resource Allocation API",
    description=(
        "Data-Driven Volunteer Coordination for Social Impact. "
        "Digitize field surveys with OCR, visualize needs on a crisis map, "
        "and smart-match volunteers using a weighted scoring algorithm."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ============================================================
# MIDDLEWARE
# ============================================================

# CORS — allow all origins in production (single-origin serving)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc) if settings.DEBUG else "Something went wrong"},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


# ============================================================
# INCLUDE ROUTERS
# ============================================================
from .routes import auth, needs, volunteers, matching, analytics, ocr, broadcast

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(needs.router, prefix=settings.API_V1_PREFIX)
app.include_router(volunteers.router, prefix=settings.API_V1_PREFIX)
app.include_router(matching.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ocr.router, prefix=settings.API_V1_PREFIX)
app.include_router(broadcast.router, prefix=settings.API_V1_PREFIX)


# ============================================================
# STATIC FILES (uploaded images)
# ============================================================
upload_path = Path(settings.UPLOAD_DIR)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")


# ============================================================
# APK DOWNLOAD
# ============================================================
@app.get("/SevaSetu.apk", tags=["Static"])
async def download_apk():
    apk_path = STATIC_DIR / "SevaSetu.apk"
    if apk_path.exists():
        return FileResponse(
            str(apk_path),
            media_type="application/vnd.android.package-archive",
            filename="SevaSetu.apk",
        )
    raise HTTPException(status_code=404, detail="APK not found")


# ============================================================
# ADMIN DASHBOARD (SPA)
# ============================================================
@app.get("/admin/{rest_of_path:path}", tags=["Static"])
async def serve_admin(rest_of_path: str):
    """Serve admin dashboard SPA."""
    if ADMIN_DIR.exists():
        # Try to serve the exact file first
        file_path = ADMIN_DIR / rest_of_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        # Fallback to index.html (SPA routing)
        index = ADMIN_DIR / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text())
    raise HTTPException(status_code=404, detail="Admin dashboard not built")


# ============================================================
# HEALTH & ROOT
# ============================================================
@app.get("/health", tags=["System"])
async def health_check():
    """Health check for monitoring and load balancers."""
    from .database import SessionLocal
    from sqlalchemy import text
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "database": db_status,
        "environment": settings.APP_ENV,
    }


# ============================================================
# LANDING PAGE (SPA — catch-all, MUST be last!)
# ============================================================
if STATIC_DIR.exists() and (STATIC_DIR / "assets").exists():
    # Mount static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="landing-assets")

@app.get("/{rest_of_path:path}", tags=["Static"])
async def serve_landing(rest_of_path: str):
    """Serve landing page SPA — catch-all route (must be registered last)."""
    if STATIC_DIR.exists():
        file_path = STATIC_DIR / rest_of_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        index = STATIC_DIR / "index.html"
        if index.exists():
            return HTMLResponse(index.read_text())
    return {"name": settings.APP_NAME, "version": "1.0.0", "status": "running", "docs": "/docs"}
