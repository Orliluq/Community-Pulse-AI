"""
Unit tests for bedrock_client.py
Uses unittest.mock to avoid real AWS calls.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../lambda"))

from bedrock_client import (
    generate_analysis,
    _parse_response,
    _strip_code_fences,
    _validate_analysis,
    _build_prompt,
)

SAMPLE_COMMENTS = [
    "The park is wonderful!",
    "Traffic is terrible.",
    "Library hours are okay.",
]

SAMPLE_SENTIMENT_RESULTS = [
    {"label": "positive", "score": 0.95},
    {"label": "negative", "score": 0.88},
    {"label": "neutral", "score": 0.72},
]

SAMPLE_AGGREGATION = {
    "total_comments": 3,
    "positive_count": 1,
    "neutral_count": 1,
    "negative_count": 1,
    "positive_pct": 33.33,
    "neutral_pct": 33.33,
    "negative_pct": 33.33,
    "comments": [],
}

SAMPLE_ANALYSIS = {
    "summary": "Mixed community feedback with equal positive, neutral, and negative responses.",
    "main_topics": ["Parks", "Traffic", "Library Services"],
    "insights": [
        "Community members appreciate green spaces.",
        "Traffic management is a key concern.",
        "Library services are considered adequate but not exceptional.",
    ],
    "suggested_actions": [
        "Invest in traffic calming measures.",
        "Expand park facilities.",
        "Review library opening hours.",
    ],
}


def _make_bedrock_response(content: str) -> dict:
    return {
        "output": {
            "message": {
                "role": "assistant",
                "content": [{"text": content}],
            }
        },
        "usage": {"inputTokens": 500, "outputTokens": 200, "totalTokens": 700},
        "stopReason": "end_turn",
    }


def _make_client_error(code: str) -> ClientError:
    return ClientError(
        {"Error": {"Code": code, "Message": "Test error"}},
        "Converse",
    )


class TestStripCodeFences:
    def test_strips_json_fence(self):
        text = "```json\n{\"key\": \"value\"}\n```"
        assert _strip_code_fences(text) == '{"key": "value"}'

    def test_strips_plain_fence(self):
        text = "```\n{\"key\": \"value\"}\n```"
        assert _strip_code_fences(text) == '{"key": "value"}'

    def test_no_fence_unchanged(self):
        text = '{"key": "value"}'
        assert _strip_code_fences(text) == text

    def test_partial_fence_unchanged(self):
        text = '```{"key": "value"}'
        assert _strip_code_fences(text) == text


class TestValidateAnalysis:
    def test_valid_analysis_passes(self):
        result = _validate_analysis(SAMPLE_ANALYSIS)
        assert result["summary"] == SAMPLE_ANALYSIS["summary"]
        assert result["main_topics"] == SAMPLE_ANALYSIS["main_topics"]
        assert result["insights"] == SAMPLE_ANALYSIS["insights"]
        assert result["suggested_actions"] == SAMPLE_ANALYSIS["suggested_actions"]

    def test_non_dict_raises(self):
        with pytest.raises(ValueError, match="Expected a JSON object"):
            _validate_analysis(["not", "a", "dict"])

    def test_missing_keys_return_defaults(self):
        result = _validate_analysis({})
        assert result["summary"] == "No summary available."
        assert result["main_topics"] == []
        assert result["insights"] == []
        assert result["suggested_actions"] == []

    def test_non_string_values_coerced(self):
        data = {
            "summary": 42,
            "main_topics": [1, 2, 3],
            "insights": ["valid"],
            "suggested_actions": [],
        }
        result = _validate_analysis(data)
        assert result["summary"] == "42"
        assert result["main_topics"] == ["1", "2", "3"]


class TestParseResponse:
    def test_valid_json_response(self):
        response = _make_bedrock_response(json.dumps(SAMPLE_ANALYSIS))
        result = _parse_response(response)
        assert result["summary"] == SAMPLE_ANALYSIS["summary"]

    def test_json_with_code_fences(self):
        fenced = f"```json\n{json.dumps(SAMPLE_ANALYSIS)}\n```"
        response = _make_bedrock_response(fenced)
        result = _parse_response(response)
        assert result["summary"] == SAMPLE_ANALYSIS["summary"]

    def test_malformed_json_raises(self):
        response = _make_bedrock_response("not valid json {{{")
        with pytest.raises(ValueError, match="non-JSON content"):
            _parse_response(response)

    def test_missing_output_key_raises(self):
        with pytest.raises(ValueError, match="Unexpected Bedrock response structure"):
            _parse_response({"wrong_key": {}})


class TestBuildPrompt:
    def test_prompt_contains_comment_count(self):
        prompt = _build_prompt(
            SAMPLE_COMMENTS, SAMPLE_SENTIMENT_RESULTS, SAMPLE_AGGREGATION
        )
        assert "3" in prompt

    def test_prompt_contains_all_comments(self):
        prompt = _build_prompt(
            SAMPLE_COMMENTS, SAMPLE_SENTIMENT_RESULTS, SAMPLE_AGGREGATION
        )
        for comment in SAMPLE_COMMENTS:
            assert comment in prompt

    def test_prompt_contains_sentiment_labels(self):
        prompt = _build_prompt(
            SAMPLE_COMMENTS, SAMPLE_SENTIMENT_RESULTS, SAMPLE_AGGREGATION
        )
        assert "POSITIVE" in prompt
        assert "NEGATIVE" in prompt
        assert "NEUTRAL" in prompt

    def test_prompt_requests_json_schema(self):
        prompt = _build_prompt(
            SAMPLE_COMMENTS, SAMPLE_SENTIMENT_RESULTS, SAMPLE_AGGREGATION
        )
        assert "summary" in prompt
        assert "main_topics" in prompt
        assert "insights" in prompt
        assert "suggested_actions" in prompt


class TestGenerateAnalysis:
    @patch("bedrock_client._get_client")
    def test_successful_analysis(self, mock_get_client, monkeypatch):
        monkeypatch.setenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")
        mock_client = MagicMock()
        mock_client.converse.return_value = _make_bedrock_response(
            json.dumps(SAMPLE_ANALYSIS)
        )
        mock_get_client.return_value = mock_client

        result = generate_analysis(
            SAMPLE_COMMENTS, SAMPLE_SENTIMENT_RESULTS, SAMPLE_AGGREGATION
        )

        assert result["summary"] == SAMPLE_ANALYSIS["summary"]
        assert len(result["main_topics"]) == 3
        assert len(result["insights"]) == 3
        assert len(result["suggested_actions"]) == 3

    @patch("bedrock_client._get_client")
    def test_client_error_propagated(self, mock_get_client, monkeypatch):
        monkeypatch.setenv("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")
        mock_client = MagicMock()
        mock_client.converse.side_effect = _make_client_error("AccessDeniedException")
        mock_get_client.return_value = mock_client

        with pytest.raises(ClientError):
            generate_analysis(
                SAMPLE_COMMENTS, SAMPLE_SENTIMENT_RESULTS, SAMPLE_AGGREGATION
            )
