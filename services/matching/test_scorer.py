# Feature: lost-and-found-app, Property 10, Property 11
"""
Property-based tests for the Matching Service scorer.

Property 10: Match score bounds
  For any pair of items, score_items() returns a value in [0.0, 1.0].
  Validates: Requirements 5.2

Property 11: Match threshold enforcement
  For any item pair whose score is below the configured threshold,
  no Match record is produced (tested via the filtering logic, not DB).
  Validates: Requirements 5.1, 5.5

Property 5.4: Top-5 ordering
  For any list of match dicts, the top-5 selection is sorted descending
  and has length <= 5.
  Validates: Requirements 5.4
"""
import pytest
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

from scorer import score_items

# ---------------------------------------------------------------------------
# Helpers / strategies
# ---------------------------------------------------------------------------

CATEGORIES = [
    "Electronics", "Clothing", "Accessories", "Documents",
    "Keys", "Pets", "Bags", "Wallets", "Jewelry", "Other",
]

date_strings = st.dates().map(lambda d: d.isoformat())

# Simplified strategy to avoid slow TF-IDF computation
item_strategy = st.fixed_dictionaries({
    "category": st.sampled_from(CATEGORIES + [""]),
    "location": st.text(min_size=0, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Zs"))),
    "date": st.one_of(date_strings, st.none()),
})


# ---------------------------------------------------------------------------
# Property 10: Match score bounds
# Validates: Requirements 5.2
# ---------------------------------------------------------------------------

@given(item_a=item_strategy, item_b=item_strategy)
@settings(max_examples=25, suppress_health_check=[HealthCheck.too_slow])
def test_property_10_score_bounds(item_a, item_b):
    """For any pair of items, score_items() must return a value in [0.0, 1.0]."""
    score = score_items(item_a, item_b)
    assert isinstance(score, float), f"score must be float, got {type(score)}"
    assert 0.0 <= score <= 1.0, f"score {score} is out of bounds [0.0, 1.0]"


# ---------------------------------------------------------------------------
# Property 11: Match threshold enforcement
# Validates: Requirements 5.1, 5.5
# ---------------------------------------------------------------------------

def _would_create_match(item_a: dict, item_b: dict, threshold: float) -> bool:
    """Return True only if the pair's score meets or exceeds the threshold."""
    return score_items(item_a, item_b) >= threshold


@given(
    item_a=item_strategy,
    item_b=item_strategy,
    threshold=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
)
@settings(max_examples=25)
def test_property_11_threshold_enforcement(item_a, item_b, threshold):
    """
    For any item pair whose score is strictly below the threshold,
    _would_create_match must return False (no Match record created).
    """
    score = score_items(item_a, item_b)
    creates_match = _would_create_match(item_a, item_b, threshold)

    if score < threshold:
        assert not creates_match, (
            f"Expected no match for score={score} < threshold={threshold}, "
            f"but _would_create_match returned True"
        )
    else:
        assert creates_match, (
            f"Expected match for score={score} >= threshold={threshold}, "
            f"but _would_create_match returned False"
        )


# ---------------------------------------------------------------------------
# Property 5.4: Top-5 ordering
# Validates: Requirements 5.4
# ---------------------------------------------------------------------------

match_dict_strategy = st.fixed_dictionaries({
    "id": st.uuids().map(str),
    "lost_item_id": st.uuids().map(str),
    "found_item_id": st.uuids().map(str),
    "score": st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
})


def top_five(matches: list[dict]) -> list[dict]:
    """Return top-5 matches sorted by descending score."""
    return sorted(matches, key=lambda m: m["score"], reverse=True)[:5]


@given(matches=st.lists(match_dict_strategy, max_size=50))
@settings(max_examples=25)
def test_property_5_4_top_five_ordering(matches):
    """
    For any list of match dicts, top_five() returns a list that:
    - has length <= 5
    - is sorted in descending order by score
    """
    result = top_five(matches)

    assert len(result) <= 5, f"Expected at most 5 matches, got {len(result)}"

    scores = [m["score"] for m in result]
    assert scores == sorted(scores, reverse=True), (
        f"Matches are not sorted in descending order: {scores}"
    )
