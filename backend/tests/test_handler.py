"""
Unit tests for handler.py (Lambda entry point).
All AWS clients are mocked — no real AWS calls.
"""

import json
import pytest
from unittest.mock import MagicMock, patch

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../lambda"))

from handler import lambda_handler


def _make_event(comments: list, method: str = "POST") -> dict:
    return {
        "httpMethod": method,
        "path": "/analyze",
        "body": json.dumps({"comments": comments}),
        "headers": {"Content-Type": "application/json"},
    }


def _make_context():
    ctx = MagicMock()
    ctx.aws_request_id = "test-request-id-123"
    return ctx


MOCK_SENTIMENT_RESULTS = [
    {"label": "positive", "score": 0.95},
    {"label": "negative", "score": 0.88},
]

MOCK_ANALYSIS = {
    "summary": "Mixed feedback.",
    "main_topics": ["Parks", "Traffic"],
    "insights": ["People like parks.", "Traffic is an issue."],
    "suggested_actions": ["Improve traffic flow.", "Maintain parks."],
}


class TestCORSPreflight:
    def test_options_returns_200(self):
        event = {"httpMethod": "OPTIONS", "path": "/analyze"}
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 200
        assert "Access-Control-Allow-Origin" in response["headers"]


class TestInputValidation:
    def test_missing_body_returns_400(self):
        response = lambda_handler({"httpMethod": "POST", "path": "/analyze"}, _make_context())
        assert response["statusCode"] == 400

    def test_invalid_json_body_returns_400(self):
        event = {"httpMethod": "POST", "body": "not json", "path": "/analyze"}
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_missing_comments_field_returns_400(self):
        event = {"httpMethod": "POST", "body": json.dumps({}), "path": "/analyze"}
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_comments_not_list_returns_400(self):
        event = _make_event("not a list")
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_empty_comments_list_returns_400(self):
        event = _make_event([])
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_too_many_comments_returns_400(self):
        event = _make_event(["comment"] * 51)
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_empty_string_comment_returns_400(self):
        event = _make_event(["valid comment", ""])
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_non_string_comment_returns_400(self):
        event = _make_event(["valid comment", 42])
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400

    def test_comment_too_long_returns_400(self):
        event = _make_event(["x" * 2001])
        response = lambda_handler(event, _make_context())
        assert response["statusCode"] == 400


class TestSuccessfulFlow:
    @patch("handler.generate_analysis")
    @patch("handler.classify_batch")
    def test_successful_response_shape(self, mock_classify, mock_generate):
        mock_classify.return_value = MOCK_SENTIMENT_RESULTS
        mock_generate.return_value = MOCK_ANALYSIS

        event = _make_event(["Great park!", "Terrible traffic."])
        response = lambda_handler(event, _make_context())

        assert response["statusCode"] == 200
        body = json.loads(response["body"])

        assert body["total_comments"] == 2
        assert body["positive_count"] == 1
        assert body["negative_count"] == 1
        assert body["neutral_count"] == 0
        assert body["positive_pct"] == 50.0
        assert body["negative_pct"] == 50.0

        assert len(body["comments"]) == 2
        assert body["comments"][0]["label"] == "positive"
        assert body["comments"][1]["label"] == "negative"

        assert body["summary"] == "Mixed feedback."
        assert body["main_topics"] == ["Parks", "Traffic"]
        assert len(body["insights"]) == 2
        assert len(body["suggested_actions"]) == 2
