from __future__ import annotations

"""
Smart Matching Engine — The core algorithm.

Scores volunteers against needs using a weighted multi-factor model:
  - Distance (40%): Haversine proximity, with bounding-box pre-filter
  - Skill match (35%): Category-to-skill mapping with vehicle bonus
  - Availability (25%): Current volunteer status

Returns ranked suggestions with human-readable explanations.
"""

import json
import logging
from typing import Optional

from sqlalchemy.orm import Session

from ..models import Volunteer, Need, Assignment, User
from ..config import get_settings
from .geo_service import haversine_distance, bounding_box, compass_direction, bearing

logger = logging.getLogger(__name__)
settings = get_settings()


# ============================================================
# CATEGORY → REQUIRED SKILLS MAPPING
# ============================================================
CATEGORY_SKILL_MAP: dict[str, list[str]] = {
    "medical":     ["medical", "first_aid", "nursing", "mental_health"],
    "food":        ["cooking", "driving", "logistics"],
    "shelter":     ["construction", "driving", "logistics"],
    "rescue":      ["swimming", "driving", "first_aid"],
    "education":   ["teaching", "counseling", "childcare"],
    "clothing":    ["logistics", "driving"],
    "sanitation":  ["cleaning", "logistics"],
    "water":       ["driving", "logistics"],
    "other":       [],
}

# Categories where having a vehicle gives a significant advantage
VEHICLE_BONUS_CATEGORIES = {"food", "clothing", "water", "shelter", "rescue"}


def calculate_distance_score(distance_km: float, max_distance: float) -> float:
    """
    Score 0–100. Uses inverse exponential decay for realistic falloff.
    - 0 km  → 100
    - 5 km  → ~82
    - 10 km → ~67
    - 25 km → ~30
    - 50 km → ~5
    - 50+ km → 0
    """
    if distance_km > max_distance:
        return 0.0

    # Exponential decay: e^(-0.05 * d) normalized to 0-100
    score = 100.0 * (2.71828 ** (-0.04 * distance_km))
    return max(0.0, min(100.0, score))


def calculate_skill_score(volunteer_skills: list[str], need_category: str, has_vehicle: bool) -> float:
    """
    Score 0–100. Matches volunteer skills against required skills for the need category.
    Gives a bonus if volunteer has a vehicle and the category benefits from it.
    """
    required_skills = CATEGORY_SKILL_MAP.get(need_category, [])

    if not required_skills:
        # 'other' category — everyone gets a base score
        return 50.0

    matched = set(volunteer_skills) & set(required_skills)
    base_score = (len(matched) / len(required_skills)) * 100.0

    # Vehicle bonus for delivery/transport-heavy categories
    if need_category in VEHICLE_BONUS_CATEGORIES and has_vehicle:
        base_score = min(100.0, base_score + 20.0)

    return base_score


def calculate_availability_score(availability: str) -> float:
    """Score 0–100 based on current availability."""
    return {
        "available": 100.0,
        "busy": 0.0,     # Busy volunteers shouldn't be assigned
        "offline": 0.0,  # Offline volunteers can't respond
    }.get(availability, 0.0)


def calculate_match_score(
    volunteer: Volunteer,
    need: Need,
    distance_km: float
) -> dict:
    """
    Calculate comprehensive match score for a volunteer–need pair.

    Returns:
        dict with total_score, sub-scores, and human-readable reasons.
    """
    w_dist = settings.MATCH_WEIGHT_DISTANCE
    w_skill = settings.MATCH_WEIGHT_SKILL
    w_avail = settings.MATCH_WEIGHT_AVAILABILITY

    skills = volunteer.skills_list
    dist_score = calculate_distance_score(distance_km, settings.MATCH_MAX_DISTANCE_KM)
    skill_score = calculate_skill_score(skills, need.category, volunteer.has_vehicle)
    avail_score = calculate_availability_score(volunteer.availability)

    total = (w_dist * dist_score) + (w_skill * skill_score) + (w_avail * avail_score)
    total = round(total, 2)

    # Build human-readable reasons
    reasons = []

    if distance_km <= 2:
        reasons.append(f"📍 Very close — only {distance_km:.1f} km away")
    elif distance_km <= 5:
        reasons.append(f"📍 Nearby — {distance_km:.1f} km away")
    elif distance_km <= 15:
        reasons.append(f"📍 Moderate distance — {distance_km:.1f} km away")
    else:
        reasons.append(f"📍 Far — {distance_km:.1f} km away")

    required = CATEGORY_SKILL_MAP.get(need.category, [])
    matched_skills = set(skills) & set(required)
    if matched_skills:
        reasons.append(f"🎯 Skills match: {', '.join(sorted(matched_skills))}")
    elif required:
        reasons.append("⚠️ No matching skills for this category")

    if need.category in VEHICLE_BONUS_CATEGORIES and volunteer.has_vehicle:
        reasons.append(f"🚗 Has {volunteer.vehicle_type or 'vehicle'} for delivery")

    if volunteer.availability == "available":
        reasons.append("✅ Currently available")

    if volunteer.tasks_completed > 10:
        reasons.append(f"⭐ Experienced — {volunteer.tasks_completed} tasks completed")

    if volunteer.rating >= 4.0 and volunteer.total_ratings >= 3:
        reasons.append(f"⭐ Highly rated — {volunteer.rating:.1f}/5.0")

    return {
        "total_score": total,
        "distance_score": round(dist_score, 2),
        "skill_score": round(skill_score, 2),
        "availability_score": round(avail_score, 2),
        "distance_km": round(distance_km, 2),
        "skill_match_pct": round(skill_score, 2),
        "reasons": reasons,
    }


def find_best_matches(
    db: Session,
    need: Need,
    limit: int = 5,
    exclude_volunteer_ids: Optional[list[str]] = None
) -> list[dict]:
    """
    Find the best volunteer matches for a given need.

    Strategy:
    1. Bounding-box pre-filter (fast SQL WHERE) to narrow candidates
    2. Haversine exact distance calculation on candidates
    3. Weighted scoring on each candidate
    4. Sort by score, return top N

    Returns:
        List of dicts with volunteer info + match data.
    """
    if need.latitude is None or need.longitude is None:
        logger.warning(f"Need {need.id} has no coordinates, cannot match.")
        return []

    exclude_ids = set(exclude_volunteer_ids or [])

    # Also exclude volunteers already assigned to this need
    existing_assignments = (
        db.query(Assignment.volunteer_id)
        .filter(
            Assignment.need_id == need.id,
            Assignment.status.in_(["assigned", "accepted", "in_progress"])
        )
        .all()
    )
    for (vid,) in existing_assignments:
        exclude_ids.add(vid)

    # Step 1: Bounding-box pre-filter
    max_dist = settings.MATCH_MAX_DISTANCE_KM
    min_lat, max_lat, min_lon, max_lon = bounding_box(need.latitude, need.longitude, max_dist)

    query = (
        db.query(Volunteer)
        .filter(
            Volunteer.latitude.isnot(None),
            Volunteer.longitude.isnot(None),
            Volunteer.latitude.between(min_lat, max_lat),
            Volunteer.longitude.between(min_lon, max_lon),
            Volunteer.availability == "available",
        )
    )

    if exclude_ids:
        query = query.filter(Volunteer.id.notin_(exclude_ids))

    candidates = query.all()
    logger.info(f"Matching need '{need.title}': {len(candidates)} candidates after bounding-box filter")

    # Step 2 & 3: Calculate exact distance + score
    scored = []
    for vol in candidates:
        dist = haversine_distance(need.latitude, need.longitude, vol.latitude, vol.longitude)

        # Skip if actually outside radius (bounding box is approximate)
        if dist > max_dist:
            continue

        match_data = calculate_match_score(vol, need, dist)

        # Skip if score is too low (below 10 = essentially unusable)
        if match_data["total_score"] < 10:
            continue

        # Get user info for display
        user = db.query(User).filter(User.id == vol.user_id).first()

        scored.append({
            "volunteer": vol,
            "user": user,
            "match_data": match_data,
        })

    # Step 4: Sort by total score (descending) and return top N
    scored.sort(key=lambda x: x["match_data"]["total_score"], reverse=True)

    results = []
    for item in scored[:limit]:
        vol = item["volunteer"]
        user = item["user"]
        md = item["match_data"]

        results.append({
            "volunteer_id": vol.id,
            "user_name": user.name if user else "Unknown",
            "user_email": user.email if user else None,
            "user_picture": user.picture if user else None,
            "skills": vol.skills_list,
            "has_vehicle": vol.has_vehicle,
            "vehicle_type": vol.vehicle_type,
            "latitude": vol.latitude,
            "longitude": vol.longitude,
            "availability": vol.availability,
            "tasks_completed": vol.tasks_completed,
            "rating": vol.rating,
            "total_ratings": vol.total_ratings,
            "match_score": md["total_score"],
            "distance_km": md["distance_km"],
            "distance_score": md["distance_score"],
            "skill_score": md["skill_score"],
            "skill_match_pct": md["skill_match_pct"],
            "availability_score": md["availability_score"],
            "reasons": md["reasons"],
        })

    logger.info(f"Found {len(results)} viable matches for need '{need.title}'")
    return results


def auto_assign_best(db: Session, need: Need) -> Optional[dict]:
    """
    Automatically assign the single best volunteer.
    Returns the match data if successful, None otherwise.
    """
    matches = find_best_matches(db, need, limit=1)
    if not matches:
        return None
    return matches[0]
