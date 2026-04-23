"""
Gemini AI Service — Uses REST API directly (compatible with Python 3.8).
- OCR text extraction from images (Gemini Vision)
- Auto-categorization of need descriptions
- Urgency scoring from text
- Structured data extraction from messy survey text
"""

from __future__ import annotations

import json
import base64
import logging
from pathlib import Path
from typing import Optional, Dict, List, Any

import requests

from ..config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"


def _call_gemini(contents: List[Dict], max_tokens: int = 2048) -> Optional[str]:
    """Make a direct REST call to the Gemini API."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set — AI features disabled")
        return None

    try:
        url = f"{GEMINI_API_URL}?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": max_tokens,
                "temperature": 0.2,
            }
        }

        resp = requests.post(url, json=payload, timeout=30)
        resp.raise_for_status()

        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "")

        logger.warning("Gemini returned empty response")
        return None

    except requests.exceptions.Timeout:
        logger.error("Gemini API timed out")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Gemini API request failed: {e}")
        return None
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return None


def _parse_json_response(text: str) -> Optional[Dict]:
    """Parse a JSON response, handling markdown code blocks."""
    if not text:
        return None

    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        # Remove first and last lines (``` markers)
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        return None


async def extract_text_from_image(image_path: str) -> Dict[str, Any]:
    """
    Use Gemini Vision to extract text from a paper survey / field report image.
    Returns both raw text and structured data.
    """
    try:
        img_path = Path(image_path)
        if not img_path.exists():
            raise FileNotFoundError(f"Image not found: {image_path}")

        with open(img_path, "rb") as f:
            image_data = base64.b64encode(f.read()).decode("utf-8")

        suffix = img_path.suffix.lower()
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".bmp": "image/bmp"}
        mime_type = mime_map.get(suffix, "image/jpeg")

        prompt = """You are an OCR + data extraction system for an NGO volunteer coordination platform.

Analyze this image of a paper survey or field report and extract ALL text from it.
The text may be written in ANY language including Hindi, Gujarati, Marathi, Urdu, or English.
Regardless of the original language, ALL output fields must be in ENGLISH.

Then, from the extracted text, identify and structure the following information:

Return your response ONLY as a JSON object (no markdown, no code blocks) with this exact structure:
{
    "raw_text": "the complete extracted text from the image, transliterated/translated to English",
    "original_language": "detected language of the handwriting (e.g. Hindi, Gujarati, English, Mixed)",
    "structured_data": {
        "title": "a short English summary title of the need/issue (max 100 chars)",
        "description": "detailed English description of the need",
        "category": "one of: medical, food, shelter, rescue, education, clothing, sanitation, water, other",
        "urgency": 3,
        "location_text": "any location/address mentioned (keep original place names)",
        "people_affected": 1,
        "key_issues": ["issue1", "issue2"]
    },
    "confidence": 0.85
}

Rules:
- urgency is 1-5 (1=low, 5=critical/life-threatening)
- people_affected should be a number, default to 1 if unclear
- Extract ALL readable text, even if partially obscured
- If text is in Hindi/Gujarati/Marathi, translate the meaning to English but keep location names as-is
- If the image is not a survey/report, still extract any text and set category to "other"
- confidence is 0.0-1.0 based on how clear and complete the extraction is"""

        contents = [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": image_data}}
            ]
        }]

        result_text = _call_gemini(contents)
        if not result_text:
            return {"raw_text": "", "structured_data": None, "confidence": 0.0}

        parsed = _parse_json_response(result_text)
        if parsed:
            logger.info(f"OCR extraction successful, confidence: {parsed.get('confidence', 0)}")
            return parsed

        # Fallback: return the raw text
        return {"raw_text": result_text, "structured_data": None, "confidence": 0.3}

    except Exception as e:
        logger.error(f"Gemini OCR extraction failed: {e}")
        return {"raw_text": "", "structured_data": None, "confidence": 0.0}


async def categorize_text(text: str) -> Dict[str, Any]:
    """
    Use Gemini to auto-categorize a need description.
    Returns category, urgency, and key issues.
    """
    prompt = f"""You are a community need classifier for an NGO platform.

Analyze this text and classify it:

TEXT: "{text}"

Return ONLY a JSON object (no markdown, no code blocks):
{{
    "category": "one of: medical, food, shelter, rescue, education, clothing, sanitation, water, other",
    "urgency": 3,
    "key_issues": ["issue1", "issue2"],
    "suggested_title": "short summary title (max 100 chars)"
}}

Urgency scale:
1 = Low priority, can wait days
2 = Moderate, should be addressed within a day
3 = High, needs attention within hours
4 = Very urgent, needs immediate response
5 = Critical, life-threatening emergency"""

    contents = [{"parts": [{"text": prompt}]}]
    result_text = _call_gemini(contents)
    parsed = _parse_json_response(result_text)
    return parsed or {"category": "other", "urgency": 3, "key_issues": []}


async def enhance_ocr_text(raw_text: str) -> str:
    """Clean up raw OCR text — fix spelling, grammar, and formatting."""
    prompt = f"""Clean up this OCR-extracted text from a field report. Fix spelling errors, 
grammar issues, and formatting. Preserve all factual content. Return ONLY the cleaned text,
nothing else.

RAW TEXT:
{raw_text}"""

    contents = [{"parts": [{"text": prompt}]}]
    result = _call_gemini(contents)
    return result or raw_text


async def analyze_needs_summary(needs_data: List[Dict]) -> str:
    """Generate an AI summary of current community needs for the admin dashboard."""
    prompt = f"""You are an analyst for an NGO volunteer coordination platform.

Analyze these current community needs and provide a brief, actionable summary for the admin:

NEEDS DATA:
{json.dumps(needs_data, indent=2, default=str)}

Provide a 3-5 sentence summary covering:
1. Most critical areas/categories
2. Geographic concentration of needs
3. Resource allocation recommendations
4. Any patterns or trends

Keep it concise and actionable. No markdown formatting."""

    contents = [{"parts": [{"text": prompt}]}]
    result = _call_gemini(contents)
    return result or "AI analysis unavailable — check GEMINI_API_KEY."
