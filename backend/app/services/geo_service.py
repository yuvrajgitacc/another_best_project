"""
Geolocation utilities.
- Haversine distance calculation (no external dependency)
- Bounding box pre-filter for fast radius search
- Coordinate validation
"""

from __future__ import annotations

import math
import logging
from typing import Optional, Tuple

import requests

logger = logging.getLogger(__name__)


# Earth radius in kilometers
EARTH_RADIUS_KM = 6371.0


def haversine_distance(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.

    Args:
        lat1, lon1: Coordinates of point 1 (degrees)
        lat2, lon2: Coordinates of point 2 (degrees)

    Returns:
        Distance in kilometers
    """
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r)
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def bounding_box(
    lat: float, lon: float, radius_km: float
) -> tuple[float, float, float, float]:
    """
    Calculate a bounding box around a center point for pre-filtering.
    This avoids calculating haversine for every row in the DB.

    Returns:
        (min_lat, max_lat, min_lon, max_lon)
    """
    # Approximate degrees per km
    lat_delta = radius_km / 111.0  # ~111 km per degree latitude
    lon_delta = radius_km / (111.0 * math.cos(math.radians(lat)))  # varies with latitude

    return (
        lat - lat_delta,  # min_lat
        lat + lat_delta,  # max_lat
        lon - lon_delta,  # min_lon
        lon + lon_delta,  # max_lon
    )


def is_within_radius(
    center_lat: float, center_lon: float,
    point_lat: float, point_lon: float,
    radius_km: float
) -> bool:
    """Check if a point is within a given radius of a center point."""
    return haversine_distance(center_lat, center_lon, point_lat, point_lon) <= radius_km


def validate_coordinates(lat: Optional[float], lon: Optional[float]) -> bool:
    """Validate that coordinates are within valid ranges."""
    if lat is None or lon is None:
        return False
    return -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0


def midpoint(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> tuple[float, float]:
    """Calculate the geographic midpoint between two coordinates."""
    lat1_r = math.radians(lat1)
    lon1_r = math.radians(lon1)
    lat2_r = math.radians(lat2)
    lon2_r = math.radians(lon2)

    bx = math.cos(lat2_r) * math.cos(lon2_r - lon1_r)
    by = math.cos(lat2_r) * math.sin(lon2_r - lon1_r)

    mid_lat = math.atan2(
        math.sin(lat1_r) + math.sin(lat2_r),
        math.sqrt((math.cos(lat1_r) + bx) ** 2 + by ** 2)
    )
    mid_lon = lon1_r + math.atan2(by, math.cos(lat1_r) + bx)

    return (math.degrees(mid_lat), math.degrees(mid_lon))


def bearing(
    lat1: float, lon1: float,
    lat2: float, lon2: float
) -> float:
    """Calculate initial bearing from point 1 to point 2 in degrees."""
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlon_r = math.radians(lon2 - lon1)

    x = math.sin(dlon_r) * math.cos(lat2_r)
    y = (
        math.cos(lat1_r) * math.sin(lat2_r)
        - math.sin(lat1_r) * math.cos(lat2_r) * math.cos(dlon_r)
    )

    initial_bearing = math.atan2(x, y)
    compass_bearing = (math.degrees(initial_bearing) + 360) % 360

    return compass_bearing


def compass_direction(bearing_deg: float) -> str:
    """Convert bearing degrees to compass direction (N, NE, E, etc.)."""
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = round(bearing_deg / 45) % 8
    return directions[idx]


def geocode_address(address: str) -> Optional[Tuple[float, float]]:
    """
    Convert an address string to (latitude, longitude) using
    free OpenStreetMap Nominatim API. No API key needed.

    Returns:
        (lat, lon) tuple or None if geocoding fails
    """
    if not address or len(address.strip()) < 3:
        return None

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": address.strip(),
                "format": "json",
                "limit": 1,
                "countrycodes": "in",  # Prioritize India
            },
            headers={"User-Agent": "SmartResourceAllocation/1.0"},
            timeout=10,
        )
        resp.raise_for_status()

        results = resp.json()
        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            logger.info(f"Geocoded '{address}' -> ({lat}, {lon})")
            return (lat, lon)

        logger.warning(f"Geocoding found no results for: '{address}'")
        return None

    except Exception as e:
        logger.error(f"Geocoding failed for '{address}': {e}")
        return None
