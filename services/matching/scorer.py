"""
Similarity scoring for the Matching Service.

score_items(item_a, item_b) -> float in [0.0, 1.0]

Scoring breakdown:
  - Category match:      +0.4 if same category, else 0
  - Location similarity: +0.3 * cosine_sim(TF-IDF vectors of location strings)
  - Date proximity:      +0.3 * max(0, 1 - abs(days_diff) / 30)
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Union

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


def _parse_date(value: Union[str, date, datetime, None]) -> date | None:
    """Coerce various date representations to a date object."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    # Try ISO string YYYY-MM-DD
    try:
        return date.fromisoformat(str(value)[:10])
    except (ValueError, TypeError):
        return None


def _location_cosine(loc_a: str, loc_b: str) -> float:
    """Return cosine similarity between two location strings using TF-IDF."""
    loc_a = (loc_a or "").strip()
    loc_b = (loc_b or "").strip()
    if not loc_a or not loc_b:
        return 0.0
    try:
        vectorizer = TfidfVectorizer()
        tfidf = vectorizer.fit_transform([loc_a, loc_b])
        sim = cosine_similarity(tfidf[0:1], tfidf[1:2])[0][0]
        return float(sim)
    except Exception:
        return 0.0


def score_items(item_a: dict, item_b: dict) -> float:
    """
    Compute similarity score between two items.

    Returns a float clamped to [0.0, 1.0].
    """
    score = 0.0

    # --- Category match (+0.4) ---
    cat_a = (item_a.get("category") or "").strip().lower()
    cat_b = (item_b.get("category") or "").strip().lower()
    if cat_a and cat_b and cat_a == cat_b:
        score += 0.4

    # --- Location TF-IDF cosine similarity (+0.3 * sim) ---
    loc_a = str(item_a.get("location") or "")
    loc_b = str(item_b.get("location") or "")
    score += 0.3 * _location_cosine(loc_a, loc_b)

    # --- Date proximity (+0.3 * max(0, 1 - |days_diff| / 30)) ---
    date_a = _parse_date(item_a.get("date"))
    date_b = _parse_date(item_b.get("date"))
    if date_a is not None and date_b is not None:
        days_diff = abs((date_a - date_b).days)
        proximity = max(0.0, 1.0 - days_diff / 30.0)
        score += 0.3 * proximity

    # Clamp to [0.0, 1.0]
    return max(0.0, min(1.0, score))
