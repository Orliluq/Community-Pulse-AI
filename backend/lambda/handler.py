"""
handler.py
----------
AWS Lambda entry point for Community Pulse AI.

Request (API Gateway proxy integration):
  POST /analyze
  Body: {"comments": ["comment 1", "comment 2", ...]}

Response:
  {
    "total_comments":    int,
    "positive_count":    int,
    "neutral_count":     int,
    "negative_count":    int,
    "positive_pct":      float,
    "neutral_pct":       float,
    "negative_pct":      float,
    "comments": [
      {"text": str, "label": str, "score": float},
      ...
    ],
    "summary":           str,
    "main_topics":       list[str],
    "insights":          list[str],
    "suggested_actions": list[str]
  }

Environment variables (set by CDK):
  SAGEMAKER_ENDPOINT_NAME
  BEDROCK_MODEL_ID
  AWS_REGION  (set automatically by Lambda runtime)
"""

import json
import logging
from typing import Any

from bedrock_client import generate_analysis
from sagemaker_client import classify_batch
from sentiment_aggregator import aggregate_results, build_comment_result

logger = logging.getLogger()
logger.setLevel(logging.INFO)

MAX_COMMENTS = 50
MIN_COMMENTS = 1
MAX_COMMENT_LENGTH = 2000

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
}


def _ok(body: dict[str, Any]) -> dict[str, Any]:
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(body),
    }


def _error(status_code: int, message: str) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps({"error": message}),
    }


def _validate_request(event: dict[str, Any]) -> tuple[list[str] | None, str | None]:
    if event.get("httpMethod") == "OPTIONS":
        return None, "OPTIONS"

    raw_body = event.get("body", "")
    if not raw_body:
        return None, "Request body is required."

    try:
        body = json.loads(raw_body)
    except json.JSONDecodeError:
        return None, "Request body must be valid JSON."

    if not isinstance(body, dict):
        return None, "Request body must be a JSON object."

    comments = body.get("comments")

    if comments is None:
        return None, "Field 'comments' is required."

    if not isinstance(comments, list):
        return None, "Field 'comments' must be a JSON array."

    if len(comments) < MIN_COMMENTS:
        return None, f"At least {MIN_COMMENTS} comment is required."

    if len(comments) > MAX_COMMENTS:
        return None, (
            f"Too many comments. Maximum allowed is {MAX_COMMENTS}, "
            f"received {len(comments)}."
        )

    sanitised = []
    for idx, comment in enumerate(comments):
        if not isinstance(comment, str):
            return None, f"Comment at index {idx} must be a string."
        stripped = comment.strip()
        if not stripped:
            return None, f"Comment at index {idx} must not be empty."
        if len(stripped) > MAX_COMMENT_LENGTH:
            return None, (
                f"Comment at index {idx} exceeds maximum length of "
                f"{MAX_COMMENT_LENGTH} characters."
            )
        sanitised.append(stripped)

    return sanitised, None


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    logger.info(
        "Received request. requestId=%s path=%s",
        getattr(context, "aws_request_id", "local"),
        event.get("path", "/analyze"),
    )

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": "",
        }

    comments, validation_error = _validate_request(event)
    if validation_error and validation_error != "OPTIONS":
        logger.warning("Validation error: %s", validation_error)
        return _error(400, validation_error)

    logger.info("Processing %d comments", len(comments))

    try:
        raw_results = classify_batch(comments)
    except EnvironmentError as exc:
        logger.error("Configuration error: %s", exc)
        return _error(500, "Server configuration error. Please contact support.")
    except Exception as exc:
        logger.error("SageMaker classification failed: %s", exc, exc_info=True)
        return _error(502, "Sentiment classification service is unavailable.")

    try:
        comment_results = [
            build_comment_result(
                text=comment,
                raw_label=raw["label"],
                score=raw["score"],
            )
            for comment, raw in zip(comments, raw_results)
        ]
    except ValueError as exc:
        logger.error("Label normalisation error: %s", exc)
        return _error(500, f"Unexpected model output: {exc}")

    aggregation = aggregate_results(comment_results)

    try:
        analysis = generate_analysis(
            comments=comments,
            sentiment_results=raw_results,
            aggregation=aggregation,
        )
    except EnvironmentError as exc:
        logger.error("Configuration error: %s", exc)
        return _error(500, "Server configuration error. Please contact support.")
    except Exception as exc:
        logger.error("Bedrock analysis failed: %s", exc, exc_info=True)
        return _error(502, "Generative analysis service is unavailable.")

    response_body = {
        **aggregation,
        **analysis,
    }

    logger.info("Request completed successfully.")
    return _ok(response_body)
