"""
Unit tests for sagemaker_client.py
Uses unittest.mock to avoid real AWS calls.
"""

import json
import pytest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../lambda"))

from sagemaker_client import classify_sentiment, classify_batch, _extract_result


def _make_client_error(code: str, message: str) -> ClientError:
    return ClientError(
        {"Error": {"Code": code, "Message": message}},
        "InvokeEndpoint",
    )


def _make_mock_response(label: str, score: float) -> dict:
    body_content = json.dumps([{"label": label, "score": score}])
    mock_body = MagicMock()
    mock_body.read.return_value = body_content.encode("utf-8")
    return {"Body": mock_body}


class TestExtractResult:
    def test_standard_list_format(self):
        result = _extract_result([{"label": "positive", "score": 0.92}])
        assert result["label"] == "positive"
        assert result["score"] == 0.92

    def test_nested_list_format(self):
        result = _extract_result([[{"label": "negative", "score": 0.85}]])
        assert result["label"] == "negative"
        assert result["score"] == 0.85

    def test_invalid_format_raises(self):
        with pytest.raises(ValueError, match="Unexpected SageMaker response shape"):
            _extract_result({"label": "positive", "score": 0.9})

    def test_empty_list_raises(self):
        with pytest.raises(ValueError):
            _extract_result([])


class TestClassifySentiment:
    @patch("sagemaker_client._get_client")
    def test_successful_classification(self, mock_get_client, monkeypatch):
        monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")
        mock_client = MagicMock()
        mock_client.invoke_endpoint.return_value = _make_mock_response("positive", 0.93)
        mock_get_client.return_value = mock_client

        result = classify_sentiment("The park is great!")
        assert result["label"] == "positive"
        assert result["score"] == 0.93

        mock_client.invoke_endpoint.assert_called_once()
        call_kwargs = mock_client.invoke_endpoint.call_args[1]
        assert call_kwargs["EndpointName"] == "test-endpoint"
        assert call_kwargs["ContentType"] == "application/json"

    def test_empty_comment_raises(self, monkeypatch):
        monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")
        with pytest.raises(ValueError, match="must not be empty"):
            classify_sentiment("")

    def test_whitespace_only_raises(self, monkeypatch):
        monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")
        with pytest.raises(ValueError, match="must not be empty"):
            classify_sentiment("   ")

    def test_missing_endpoint_env_raises(self, monkeypatch):
        monkeypatch.delenv("SAGEMAKER_ENDPOINT_NAME", raising=False)
        with pytest.raises(EnvironmentError, match="SAGEMAKER_ENDPOINT_NAME"):
            classify_sentiment("Some comment")

    @patch("sagemaker_client._get_client")
    def test_client_error_propagated(self, mock_get_client, monkeypatch):
        monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")
        mock_client = MagicMock()
        mock_client.invoke_endpoint.side_effect = _make_client_error(
            "ModelError", "Model returned 500"
        )
        mock_get_client.return_value = mock_client

        with pytest.raises(ClientError):
            classify_sentiment("Some comment")

    @patch("sagemaker_client._get_client")
    def test_payload_format(self, mock_get_client, monkeypatch):
        monkeypatch.setenv("SAGEMAKER_ENDPOINT_NAME", "test-endpoint")
        mock_client = MagicMock()
        mock_client.invoke_endpoint.return_value = _make_mock_response("neutral", 0.7)
        mock_get_client.return_value = mock_client

        classify_sentiment("  Hello world  ")

        call_kwargs = mock_client.invoke_endpoint.call_args[1]
        body = json.loads(call_kwargs["Body"].decode("utf-8"))
        assert body["inputs"] == "Hello world"


class TestClassifyBatch:
    @patch("sagemaker_client.classify_sentiment")
    def test_batch_calls_classify_for_each(self, mock_classify):
        mock_classify.side_effect = [
            {"label": "positive", "score": 0.9},
            {"label": "negative", "score": 0.8},
            {"label": "neutral", "score": 0.6},
        ]
        results = classify_batch(["c1", "c2", "c3"])
        assert len(results) == 3
        assert mock_classify.call_count == 3

    def test_empty_list_returns_empty(self):
        results = classify_batch([])
        assert results == []

    @patch("sagemaker_client.classify_sentiment")
    def test_results_order_preserved(self, mock_classify):
        mock_classify.side_effect = [
            {"label": "positive", "score": 0.9},
            {"label": "negative", "score": 0.8},
        ]
        results = classify_batch(["first", "second"])
        assert results[0]["label"] == "positive"
        assert results[1]["label"] == "negative"
