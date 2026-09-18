"""
Unit tests for sentiment_aggregator.py
No AWS credentials or network access required.
"""

import pytest
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../lambda"))

from sentiment_aggregator import (
    aggregate_results,
    build_comment_result,
    normalise_label,
)


class TestNormaliseLabel:
    def test_positive_label(self):
        assert normalise_label("positive") == "positive"

    def test_negative_label(self):
        assert normalise_label("negative") == "negative"

    def test_neutral_label(self):
        assert normalise_label("neutral") == "neutral"

    def test_label_0_maps_to_negative(self):
        assert normalise_label("LABEL_0") == "negative"

    def test_label_1_maps_to_neutral(self):
        assert normalise_label("LABEL_1") == "neutral"

    def test_label_2_maps_to_positive(self):
        assert normalise_label("LABEL_2") == "positive"

    def test_case_insensitive(self):
        assert normalise_label("POSITIVE") == "positive"
        assert normalise_label("Neutral") == "neutral"
        assert normalise_label("NEGATIVE") == "negative"

    def test_unknown_label_raises(self):
        with pytest.raises(ValueError, match="Unrecognised sentiment label"):
            normalise_label("unknown_label")

    def test_empty_label_raises(self):
        with pytest.raises(ValueError):
            normalise_label("")


class TestBuildCommentResult:
    def test_basic_positive(self):
        result = build_comment_result("Great park!", "positive", 0.9231)
        assert result["text"] == "Great park!"
        assert result["label"] == "positive"
        assert result["score"] == 0.9231

    def test_score_rounded_to_4_decimals(self):
        result = build_comment_result("Test", "neutral", 0.666666666)
        assert result["score"] == 0.6667

    def test_label_normalised(self):
        result = build_comment_result("Test", "LABEL_0", 0.8)
        assert result["label"] == "negative"

    def test_invalid_label_raises(self):
        with pytest.raises(ValueError):
            build_comment_result("Test", "bad_label", 0.5)


class TestAggregateResults:
    def _make_results(self, labels: list[str]) -> list[dict]:
        return [
            {"text": f"comment {i}", "label": label, "score": 0.9}
            for i, label in enumerate(labels)
        ]

    def test_empty_list(self):
        result = aggregate_results([])
        assert result["total_comments"] == 0
        assert result["positive_count"] == 0
        assert result["neutral_count"] == 0
        assert result["negative_count"] == 0
        assert result["positive_pct"] == 0.0
        assert result["neutral_pct"] == 0.0
        assert result["negative_pct"] == 0.0
        assert result["comments"] == []

    def test_all_positive(self):
        results = self._make_results(["positive", "positive", "positive"])
        agg = aggregate_results(results)
        assert agg["total_comments"] == 3
        assert agg["positive_count"] == 3
        assert agg["neutral_count"] == 0
        assert agg["negative_count"] == 0
        assert agg["positive_pct"] == 100.0
        assert agg["neutral_pct"] == 0.0
        assert agg["negative_pct"] == 0.0

    def test_mixed_sentiments(self):
        results = self._make_results(
            ["positive", "positive", "neutral", "negative", "positive"]
        )
        agg = aggregate_results(results)
        assert agg["total_comments"] == 5
        assert agg["positive_count"] == 3
        assert agg["neutral_count"] == 1
        assert agg["negative_count"] == 1
        assert agg["positive_pct"] == 60.0
        assert agg["neutral_pct"] == 20.0
        assert agg["negative_pct"] == 20.0

    def test_percentages_sum_to_100(self):
        results = self._make_results(["positive", "neutral", "negative"])
        agg = aggregate_results(results)
        total_pct = agg["positive_pct"] + agg["neutral_pct"] + agg["negative_pct"]
        assert abs(total_pct - 100.0) < 0.01

    def test_single_comment(self):
        results = self._make_results(["negative"])
        agg = aggregate_results(results)
        assert agg["total_comments"] == 1
        assert agg["negative_count"] == 1
        assert agg["negative_pct"] == 100.0

    def test_comments_preserved_in_output(self):
        input_results = self._make_results(["positive", "negative"])
        agg = aggregate_results(input_results)
        assert agg["comments"] == input_results
