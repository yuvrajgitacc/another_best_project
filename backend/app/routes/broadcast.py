from __future__ import annotations

"""
Broadcast routes — Send emergency alerts to volunteers within a radius.
"""

import json
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import User, Volunteer, Need, Broadcast, AuditLog
from ..schemas import BroadcastCreateRequest, BroadcastResponse, MessageResponse
from ..middleware.auth import get_current_user, get_current_admin
from ..services.geo_service import haversine_distance, bounding_box
from ..services import fcm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/broadcast", tags=["Broadcast"])


@router.post("/", response_model=BroadcastResponse, status_code=201)
async def send_broadcast(
    body: BroadcastCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Send an emergency broadcast alert to all volunteers within a radius.
    Admin only. Uses FCM for push notifications.
    """
    # Find volunteers within radius using bounding-box + haversine
    min_lat, max_lat, min_lon, max_lon = bounding_box(
        body.latitude, body.longitude, body.radius_km
    )

    candidates = db.query(Volunteer).filter(
        Volunteer.latitude.isnot(None),
        Volunteer.longitude.isnot(None),
        Volunteer.latitude.between(min_lat, max_lat),
        Volunteer.longitude.between(min_lon, max_lon),
        Volunteer.availability.in_(["available", "busy"]),  # Notify all non-offline
    ).all()

    # Exact distance filter
    recipients = []
    for vol in candidates:
        dist = haversine_distance(body.latitude, body.longitude, vol.latitude, vol.longitude)
        if dist <= body.radius_km:
            recipients.append(vol)

    # Create broadcast record
    broadcast = Broadcast(
        sent_by=current_user.id,
        title=body.title,
        message=body.message,
        category=body.category.value if body.category else None,
        urgency=body.urgency,
        latitude=body.latitude,
        longitude=body.longitude,
        radius_km=body.radius_km,
        recipients_count=len(recipients),
        need_id=body.need_id,
    )
    db.add(broadcast)

    # Send FCM notifications to all recipients
    fcm_tokens = [v.fcm_token for v in recipients if v.fcm_token]

    fcm_result = {"success_count": 0, "failure_count": 0}
    if fcm_tokens:
        fcm_result = await fcm_service.send_to_multiple(
            fcm_tokens=fcm_tokens,
            title=body.title,
            body=body.message,
            data={
                "type": "broadcast",
                "broadcast_id": broadcast.id,
                "urgency": str(body.urgency),
                "category": body.category.value if body.category else "",
                "latitude": str(body.latitude),
                "longitude": str(body.longitude),
            },
        )

    # Audit
    audit = AuditLog(
        user_id=current_user.id,
        action="broadcast.sent",
        entity_type="broadcast",
        entity_id=broadcast.id,
        details=json.dumps({
            "radius_km": body.radius_km,
            "total_recipients": len(recipients),
            "fcm_sent": fcm_result.get("success_count", 0),
            "fcm_failed": fcm_result.get("failure_count", 0),
            "need_id": body.need_id,
        }),
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()
    db.refresh(broadcast)

    logger.info(
        f"Broadcast '{body.title}' sent to {len(recipients)} volunteers "
        f"within {body.radius_km}km (FCM: {fcm_result.get('success_count', 0)} OK)"
    )

    return BroadcastResponse(
        id=broadcast.id,
        sent_by=broadcast.sent_by,
        sender_name=current_user.name,
        title=broadcast.title,
        message=broadcast.message,
        category=broadcast.category,
        urgency=broadcast.urgency,
        latitude=broadcast.latitude,
        longitude=broadcast.longitude,
        radius_km=broadcast.radius_km,
        recipients_count=broadcast.recipients_count,
        need_id=broadcast.need_id,
        created_at=broadcast.created_at,
    )


@router.get("/", response_model=List[BroadcastResponse])
async def list_broadcasts(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List broadcast history."""
    offset = (page - 1) * per_page
    broadcasts = (
        db.query(Broadcast)
        .order_by(desc(Broadcast.created_at))
        .offset(offset)
        .limit(per_page)
        .all()
    )

    results = []
    for b in broadcasts:
        sender = db.query(User).filter(User.id == b.sent_by).first()
        results.append(BroadcastResponse(
            id=b.id,
            sent_by=b.sent_by,
            sender_name=sender.name if sender else None,
            title=b.title,
            message=b.message,
            category=b.category,
            urgency=b.urgency,
            latitude=b.latitude,
            longitude=b.longitude,
            radius_km=b.radius_km,
            recipients_count=b.recipients_count,
            need_id=b.need_id,
            created_at=b.created_at,
        ))

    return results


@router.get("/{broadcast_id}", response_model=BroadcastResponse)
async def get_broadcast(
    broadcast_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single broadcast by ID."""
    b = db.query(Broadcast).filter(Broadcast.id == broadcast_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Broadcast not found")

    sender = db.query(User).filter(User.id == b.sent_by).first()
    return BroadcastResponse(
        id=b.id,
        sent_by=b.sent_by,
        sender_name=sender.name if sender else None,
        title=b.title,
        message=b.message,
        category=b.category,
        urgency=b.urgency,
        latitude=b.latitude,
        longitude=b.longitude,
        radius_km=b.radius_km,
        recipients_count=b.recipients_count,
        need_id=b.need_id,
        created_at=b.created_at,
    )
