from __future__ import annotations

"""
OCR routes — Upload paper survey images, extract text, auto-create needs.
"""

import os
import uuid
import json
import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Need, AuditLog
from ..schemas import OCRExtractResponse, NeedResponse, MessageResponse
from ..middleware.auth import get_current_user
from ..services import gemini_service
from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/ocr", tags=["OCR"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff", ".tif"}


def _validate_upload(file: UploadFile):
    """Validate uploaded file type and size."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    return ext


@router.post("/extract", response_model=OCRExtractResponse)
async def extract_from_image(
    request: Request,
    file: UploadFile = File(..., description="Paper survey or field report image"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload an image of a paper survey.
    Uses Gemini Vision to extract text and auto-categorize.
    Returns both raw text and structured data.
    """
    ext = _validate_upload(file)

    # Save uploaded file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Uploaded file saved: {file_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    # Check file size
    file_size = os.path.getsize(file_path)
    if file_size > settings.max_upload_bytes:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size / 1024 / 1024:.1f} MB). Max: {settings.MAX_UPLOAD_SIZE_MB} MB"
        )

    # Extract with Gemini Vision
    result = await gemini_service.extract_text_from_image(str(file_path))

    # Audit
    audit = AuditLog(
        user_id=current_user.id,
        action="ocr.extracted",
        entity_type="ocr",
        details=json.dumps({
            "filename": filename,
            "confidence": result.get("confidence", 0),
            "category": result.get("structured_data", {}).get("category") if result.get("structured_data") else None,
        }),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return OCRExtractResponse(
        raw_text=result.get("raw_text", ""),
        original_language=result.get("original_language"),
        structured_data=result.get("structured_data"),
        confidence=result.get("confidence", 0.0),
    )


@router.post("/extract-and-create", response_model=NeedResponse)
async def extract_and_create_need(
    request: Request,
    file: UploadFile = File(..., description="Paper survey or field report image"),
    latitude: float = 0.0,
    longitude: float = 0.0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload image → Extract text → Auto-create a Need record.
    One-click from paper to database.
    """
    ext = _validate_upload(file)

    # Save file
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{ext}"
    file_path = upload_dir / filename

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    file_size = os.path.getsize(file_path)
    if file_size > settings.max_upload_bytes:
        os.remove(file_path)
        raise HTTPException(status_code=400, detail="File too large")

    # Extract with Gemini
    result = await gemini_service.extract_text_from_image(str(file_path))
    structured = result.get("structured_data") or {}

    # Auto-geocode extracted location text
    final_lat = latitude
    final_lon = longitude
    location_text = structured.get("location_text", "")
    if location_text and (latitude == 0.0 or longitude == 0.0 or (latitude == 19.076 and longitude == 72.878)):
        from ..services.geo_service import geocode_address
        coords = geocode_address(location_text)
        if coords:
            final_lat, final_lon = coords

    # Create Need from extracted data
    need = Need(
        reported_by=current_user.id,
        title=structured.get("title") or "OCR Extracted Need",
        description=structured.get("description") or result.get("raw_text", ""),
        category=structured.get("category") or "other",
        urgency=structured.get("urgency") or 3,
        latitude=final_lat or 0.0,
        longitude=final_lon or 0.0,
        address=location_text or structured.get("location_text"),
        people_affected=structured.get("people_affected") or 1,
        source="ocr",
        ocr_raw_text=result.get("raw_text", ""),
        images=json.dumps([filename]),
    )
    db.add(need)

    # Audit
    audit = AuditLog(
        user_id=current_user.id,
        action="ocr.need_created",
        entity_type="need",
        entity_id=need.id,
        details=json.dumps({
            "filename": filename,
            "confidence": result.get("confidence", 0),
            "auto_category": structured.get("category"),
            "auto_urgency": structured.get("urgency"),
        }),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(need)

    logger.info(f"OCR Need created: '{need.title}' [{need.category}] from image")

    # Import here to avoid circular import
    from .needs import _need_to_response
    return _need_to_response(need, db)
