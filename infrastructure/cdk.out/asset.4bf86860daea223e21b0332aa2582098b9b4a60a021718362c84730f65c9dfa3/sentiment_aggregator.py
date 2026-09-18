"""
sentiment_aggregator.py

Pure-logic module: aggregates per-comment SageMaker sentiment results
into counts, percentages, and a structured summary dict.

No AWS SDK calls here — fully unit-testable without mocking.
"""

from typing import Any


# ---------------------------------------------------------------------------
# Label normalisation
# ---------------------------------------------------------------------------

# cardiffnlp/twitter-roberta-base-sentiment returns these raw labels:
# LABEL_0 → negative
# LABEL_1 → neutral
# LABEL_2 → positive
#
# The HuggingFace DLC may return either the raw LABEL_N form or the
# human-readable form depending on whether a config.json is present.
# We normalise both here.

_LABEL_MAP: dict[str, str] = {
    "label_0": "negative",
    "label_1": "neutral",
    "label_2": "positive",
    "negative": "negative",
    "neutral": "neutral",
    "positive": "positive",
}


def normalise_label(raw_label: str) -> str:
    """
    Convert a raw SageMaker label string to one of:
    'positive', 'neutral', 'negative'.

    Raises ValueError for unrecognised labels so callers can surface
    the problem clearly rather than silently misclassifying.
    """
    key = raw_label.strip().lower()

    if key not in _LABEL_MAP:
        raise ValueError(
            f"Unrecognised sentiment label '{raw_label}'. "
            f"Expected one of: {list(_LABEL_MAP.keys())}"
        )

    return _LABEL_MAP[key]


# ---------------------------------------------------------------------------
# Per-comment result builder
# ---------------------------------------------------------------------------


def build_comment_result(
    text: str,
    raw_label: str,
    score: float,
) -> dict[str, Any]:
    """
    Build a single comment result dict.

    Parameters
    ----------
    text:
        Original comment text.

    raw_label:
        Label string returned by SageMaker.

    score:
        Confidence score (0.0 – 1.0).

    Returns
    -------
    {
        "text": str,
        "label": "positive" | "neutral" | "negative",
        "score": float
    }
    """
    return {
        "text": text,
        "label": normalise_label(raw_label),
        "score": round(score, 4),
    }


# ---------------------------------------------------------------------------
# Aggregation
# ---------------------------------------------------------------------------


def aggregate_results(
    comment_results: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Aggregate a list of per-comment result dicts into summary statistics.

    Parameters
    ----------
    comment_results:
        List of dicts produced by build_comment_result().

    Returns
    -------
    {
        "total_comments": int,
        "positive_count": int,
        "neutral_count": int,
        "negative_count": int,
        "positive_pct": float,
        "neutral_pct": float,
        "negative_pct": float,
        "comments": list[dict]
    }
    """

    if not comment_results:
        return {
            "total_comments": 0,
            "positive_count": 0,
            "neutral_count": 0,
            "negative_count": 0,
            "positive_pct": 0.0,
            "neutral_pct": 0.0,
            "negative_pct": 0.0,
            "comments": [],
        }

    total = len(comment_results)

    counts: dict[str, int] = {
        "positive": 0,
        "neutral": 0,
        "negative": 0,
    }

    for result in comment_results:
        label = result["label"]  # already normalised

        if label in counts:
            counts[label] += 1

    # Calculate percentages rounded to two decimal places.
    def pct(n: int) -> float:
        return round((n / total) * 100, 2)

    positive_pct = pct(counts["positive"])
    neutral_pct = pct(counts["neutral"])
    negative_pct = pct(counts["negative"])

    # -----------------------------------------------------------------------
    # Adjust rounding so percentages always sum to exactly 100.00%.
    #
    # Example:
    # 33.33 + 33.33 + 33.33 = 99.99
    #
    # We add the rounding difference to the category with the
    # highest number of comments.
    # -----------------------------------------------------------------------

    total_pct = positive_pct + neutral_pct + negative_pct
    difference = round(100.0 - total_pct, 2)

    if difference != 0:
        percentages = {
            "positive": positive_pct,
            "neutral": neutral_pct,
            "negative": negative_pct,
        }

        largest_label = max(
            counts,
            key=lambda label: counts[label],
        )

        percentages[largest_label] = round(
            percentages[largest_label] + difference,
            2,
        )

        positive_pct = percentages["positive"]
        neutral_pct = percentages["neutral"]
        negative_pct = percentages["negative"]

    return {
        "total_comments": total,
        "positive_count": counts["positive"],
        "neutral_count": counts["neutral"],
        "negative_count": counts["negative"],
        "positive_pct": positive_pct,
        "neutral_pct": neutral_pct,
        "negative_pct": negative_pct,
        "comments": comment_results,
    }