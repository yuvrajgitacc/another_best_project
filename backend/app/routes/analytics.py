from __future__ import annotations

"""
Analytics routes — dashboard stats, heatmap data, category breakdown, timelines.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..database import get_db
from ..models import Need, Volunteer, Assignment, AuditLog
from ..schemas import (
    DashboardSummary, CategoryBreakdown, HeatmapPoint,
    TimelinePoint,
)
from ..middleware.auth import get_current_user, get_current_admin
from ..services import gemini_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """High-level dashboard statistics."""
    # Need counts
    total_needs = db.query(func.count(Need.id)).scalar() or 0
    open_needs = db.query(func.count(Need.id)).filter(Need.status == "open").scalar() or 0
    resolved_needs = db.query(func.count(Need.id)).filter(Need.status == "resolved").scalar() or 0
    in_progress_needs = db.query(func.count(Need.id)).filter(
        Need.status.in_(["assigned", "in_progress"])
    ).scalar() or 0

    # Volunteer counts
    total_volunteers = db.query(func.count(Volunteer.id)).scalar() or 0
    active_volunteers = db.query(func.count(Volunteer.id)).filter(
        Volunteer.availability == "available"
    ).scalar() or 0
    busy_volunteers = db.query(func.count(Volunteer.id)).filter(
        Volunteer.availability == "busy"
    ).scalar() or 0

    # Assignment counts
    total_assignments = db.query(func.count(Assignment.id)).scalar() or 0
    completed_assignments = db.query(func.count(Assignment.id)).filter(
        Assignment.status == "completed"
    ).scalar() or 0

    # Average response time (assigned → completed)
    completed = db.query(Assignment).filter(
        Assignment.status == "completed",
        Assignment.completed_at.isnot(None),
    ).all()

    avg_response_hours = None
    if completed:
        total_hours = 0
        count = 0
        for a in completed:
            if a.assigned_at and a.completed_at:
                delta = a.completed_at - a.assigned_at
                total_hours += delta.total_seconds() / 3600
                count += 1
        if count > 0:
            avg_response_hours = round(total_hours / count, 2)

    # Total people helped
    people_helped = db.query(func.sum(Need.people_affected)).filter(
        Need.status == "resolved"
    ).scalar() or 0

    return DashboardSummary(
        total_needs=total_needs,
        open_needs=open_needs,
        resolved_needs=resolved_needs,
        in_progress_needs=in_progress_needs,
        total_volunteers=total_volunteers,
        active_volunteers=active_volunteers,
        busy_volunteers=busy_volunteers,
        total_assignments=total_assignments,
        completed_assignments=completed_assignments,
        avg_response_time_hours=avg_response_hours,
        people_helped=people_helped,
    )


@router.get("/categories", response_model=List[CategoryBreakdown])
async def get_category_breakdown(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Breakdown of needs by category."""
    categories = db.query(
        Need.category,
        func.count(Need.id).label("count"),
    ).group_by(Need.category).all()

    results = []
    for cat, count in categories:
        open_count = db.query(func.count(Need.id)).filter(
            Need.category == cat, Need.status == "open"
        ).scalar() or 0
        resolved_count = db.query(func.count(Need.id)).filter(
            Need.category == cat, Need.status == "resolved"
        ).scalar() or 0

        results.append(CategoryBreakdown(
            category=cat,
            count=count,
            open_count=open_count,
            resolved_count=resolved_count,
        ))

    # Sort by count descending
    results.sort(key=lambda x: x.count, reverse=True)
    return results


@router.get("/heatmap", response_model=List[HeatmapPoint])
async def get_heatmap_data(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    category: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Get need locations with intensity scores for heatmap rendering.
    Intensity = urgency × log(people_affected + 1)
    """
    import math

    query = db.query(Need).filter(
        Need.latitude.isnot(None),
        Need.longitude.isnot(None),
    )

    if status_filter:
        query = query.filter(Need.status == status_filter)
    else:
        query = query.filter(Need.status.in_(["open", "assigned", "in_progress"]))

    if category:
        query = query.filter(Need.category == category)

    needs = query.all()

    return [
        HeatmapPoint(
            latitude=n.latitude,
            longitude=n.longitude,
            intensity=n.urgency * math.log(n.people_affected + 1, 10) * 20,
            category=n.category,
            need_id=n.id,
            title=n.title,
        )
        for n in needs
    ]


@router.get("/timeline", response_model=List[TimelinePoint])
async def get_timeline(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get daily need creation and resolution counts for charting."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Get all needs within the time range
    needs = db.query(Need).filter(Need.created_at >= cutoff).all()

    # Aggregate by date
    date_map: Dict[str, dict] = {}
    for i in range(days + 1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        date_map[d] = {"needs_created": 0, "needs_resolved": 0}

    for n in needs:
        d = n.created_at.strftime("%Y-%m-%d")
        if d in date_map:
            date_map[d]["needs_created"] += 1
        if n.resolved_at:
            rd = n.resolved_at.strftime("%Y-%m-%d")
            if rd in date_map:
                date_map[rd]["needs_resolved"] += 1

    # Convert to sorted list
    result = [
        TimelinePoint(date=d, **counts)
        for d, counts in sorted(date_map.items())
    ]

    return result


@router.get("/response-times")
async def get_response_times(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """Average response time breakdown by category. Admin only."""
    categories = db.query(Need.category).distinct().all()
    result = {}

    for (cat,) in categories:
        assignments = (
            db.query(Assignment)
            .join(Need, Assignment.need_id == Need.id)
            .filter(
                Need.category == cat,
                Assignment.status == "completed",
                Assignment.completed_at.isnot(None),
            )
            .all()
        )

        if assignments:
            times = []
            for a in assignments:
                if a.assigned_at and a.completed_at:
                    delta = (a.completed_at - a.assigned_at).total_seconds() / 3600
                    times.append(delta)
            if times:
                result[cat] = {
                    "avg_hours": round(sum(times) / len(times), 2),
                    "min_hours": round(min(times), 2),
                    "max_hours": round(max(times), 2),
                    "total_completed": len(times),
                }

    return result


@router.get("/ai-summary")
async def get_ai_summary(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_admin),
):
    """
    Get an AI-generated summary of current community needs.
    Uses Gemini to analyze patterns and provide recommendations.
    """
    needs = db.query(Need).filter(Need.status.in_(["open", "assigned", "in_progress"])).all()

    needs_data = [
        {
            "title": n.title,
            "category": n.category,
            "urgency": n.urgency,
            "people_affected": n.people_affected,
            "status": n.status,
            "address": n.address,
            "created_at": str(n.created_at),
        }
        for n in needs
    ]

    summary = await gemini_service.analyze_needs_summary(needs_data)
    return {"summary": summary, "needs_analyzed": len(needs_data)}


@router.get("/impact")
async def get_impact_stats(
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Impact Dashboard stats — shows what was accomplished in the last N days.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Needs resolved in period
    needs_resolved = db.query(func.count(Need.id)).filter(
        Need.status == "resolved",
        Need.resolved_at >= cutoff,
    ).scalar() or 0

    # Total needs created in period
    needs_created = db.query(func.count(Need.id)).filter(
        Need.created_at >= cutoff,
    ).scalar() or 0

    # People helped in period (from resolved needs)
    people_helped = db.query(func.sum(Need.people_affected)).filter(
        Need.status == "resolved",
        Need.resolved_at >= cutoff,
    ).scalar() or 0

    # Assignments completed in period
    assignments_completed = db.query(func.count(Assignment.id)).filter(
        Assignment.status == "completed",
        Assignment.completed_at >= cutoff,
    ).scalar() or 0

    # Average response time in period
    completed = db.query(Assignment).filter(
        Assignment.status == "completed",
        Assignment.completed_at >= cutoff,
        Assignment.completed_at.isnot(None),
        Assignment.assigned_at.isnot(None),
    ).all()

    avg_response_hours = 0
    if completed:
        total_hours = sum(
            (a.completed_at - a.assigned_at).total_seconds() / 3600
            for a in completed if a.assigned_at and a.completed_at
        )
        avg_response_hours = round(total_hours / len(completed), 1) if completed else 0

    # Active volunteers in period
    active_vols = db.query(func.count(Volunteer.id)).filter(
        Volunteer.availability.in_(["available", "busy"]),
    ).scalar() or 0

    # Total volunteer tasks completed (all time)
    total_vol_tasks = db.query(func.sum(Volunteer.tasks_completed)).scalar() or 0

    # Top categories in period
    top_cats = db.query(
        Need.category,
        func.count(Need.id).label("count"),
    ).filter(
        Need.created_at >= cutoff,
    ).group_by(Need.category).order_by(func.count(Need.id).desc()).limit(3).all()

    # Currently open critical needs (urgency >= 4)
    critical_open = db.query(func.count(Need.id)).filter(
        Need.status == "open",
        Need.urgency >= 4,
    ).scalar() or 0

    return {
        "period_days": days,
        "needs_created": needs_created,
        "needs_resolved": needs_resolved,
        "people_helped": people_helped,
        "assignments_completed": assignments_completed,
        "avg_response_hours": avg_response_hours,
        "active_volunteers": active_vols,
        "total_volunteer_tasks": total_vol_tasks,
        "critical_open_needs": critical_open,
        "top_categories": [{"category": cat, "count": cnt} for cat, cnt in top_cats],
        "resolution_rate": round((needs_resolved / needs_created * 100), 1) if needs_created > 0 else 0,
    }
