"""
Firebase Cloud Messaging (FCM) Service — uses REST API directly.
No firebase-admin dependency needed (Python 3.8 compatible).

For full production FCM, you'd use a service account + OAuth2.
This implementation supports both:
1. FCM Legacy HTTP API (with server key) — simpler setup
2. Dry-run mode when no credentials are configured
"""

from __future__ import annotations

import json
import logging
from typing import Optional, Dict, List, Any

import requests

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# FCM Legacy API (simpler, works with just a server key)
FCM_SEND_URL = "https://fcm.googleapis.com/fcm/send"


def _get_fcm_headers() -> Optional[Dict[str, str]]:
    """Get FCM headers. Returns None if not configured."""
    # Check for FCM server key in env (we'll add this setting)
    import os
    server_key = os.environ.get("FCM_SERVER_KEY", "")
    if not server_key:
        return None

    return {
        "Authorization": f"key={server_key}",
        "Content-Type": "application/json",
    }


async def send_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
    image_url: Optional[str] = None,
) -> bool:
    """
    Send a push notification to a single device.
    """
    headers = _get_fcm_headers()

    if headers is None:
        logger.info(f"[DRY RUN] Notification -> '{title}': {body} (to token: {fcm_token[:20]}...)")
        return False

    try:
        payload = {
            "to": fcm_token,
            "notification": {
                "title": title,
                "body": body,
                "sound": "default",
            },
            "data": data or {},
            "priority": "high",
        }
        if image_url:
            payload["notification"]["image"] = image_url

        resp = requests.post(FCM_SEND_URL, headers=headers, json=payload, timeout=10)
        resp.raise_for_status()

        result = resp.json()
        if result.get("success", 0) > 0:
            logger.info(f"FCM notification sent: {title}")
            return True
        else:
            logger.warning(f"FCM send failed: {result}")
            return False

    except Exception as e:
        logger.error(f"FCM send error: {e}")
        return False


async def send_to_multiple(
    fcm_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, str]] = None,
) -> Dict[str, int]:
    """
    Send a notification to multiple devices (batch).
    """
    if not fcm_tokens:
        return {"success_count": 0, "failure_count": 0}

    headers = _get_fcm_headers()
    if headers is None:
        logger.info(f"[DRY RUN] Batch notification to {len(fcm_tokens)} devices -> '{title}'")
        return {"success_count": 0, "failure_count": len(fcm_tokens)}

    success = 0
    failure = 0

    # FCM legacy API supports registration_ids for multicast (max 1000)
    try:
        payload = {
            "registration_ids": fcm_tokens[:1000],
            "notification": {
                "title": title,
                "body": body,
                "sound": "default",
            },
            "data": data or {},
            "priority": "high",
        }

        resp = requests.post(FCM_SEND_URL, headers=headers, json=payload, timeout=15)
        resp.raise_for_status()

        result = resp.json()
        success = result.get("success", 0)
        failure = result.get("failure", 0)

        logger.info(f"FCM batch: {success} sent, {failure} failed")

    except Exception as e:
        logger.error(f"FCM batch error: {e}")
        failure = len(fcm_tokens)

    return {"success_count": success, "failure_count": failure}


async def send_task_assigned_notification(
    fcm_token: str,
    need_title: str,
    need_category: str,
    distance_km: float,
    assignment_id: str,
) -> bool:
    """Send a structured 'task assigned' notification to a volunteer."""
    return await send_notification(
        fcm_token=fcm_token,
        title="New Task: {}".format(need_title),
        body="Category: {} | Distance: {:.1f} km away".format(need_category.title(), distance_km),
        data={
            "type": "task_assigned",
            "assignment_id": assignment_id,
            "need_category": need_category,
            "distance_km": str(round(distance_km, 2)),
            "click_action": "OPEN_TASK_DETAIL",
        },
    )


async def send_broadcast_notification(
    fcm_token: str,
    title: str,
    message: str,
    broadcast_id: str,
    urgency: int,
) -> bool:
    """Send a broadcast alert notification."""
    urgency_emoji = {1: "i", 2: "!", 3: "!!", 4: "!!!", 5: "URGENT"}
    prefix = urgency_emoji.get(urgency, "!!")

    return await send_notification(
        fcm_token=fcm_token,
        title="[{}] {}".format(prefix, title),
        body=message,
        data={
            "type": "broadcast",
            "broadcast_id": broadcast_id,
            "urgency": str(urgency),
            "click_action": "OPEN_BROADCAST",
        },
    )
