"""
sagemaker_client.py
-------------------
Thin wrapper around the SageMaker Runtime InvokeEndpoint API.

Responsibilities:
  - Accept a single comment string
  - Call the SageMaker serverless endpoint
  - Parse and return the raw label + score

The endpoint hosts cardiffnlp/twitter-roberta-base-sentiment via the
HuggingFace PyTorch Inference DLC.  The model returns a list of dicts:
  [{"label": "positive", "score": 0.9231}]

Environment variables (injected by CDK / Lambda config):
  SAGEMAKER_ENDPOINT_NAME  – name of the deployed endpoint
  AWS_REGION               – AWS region (set automatically by Lambda runtime)
"""

import json
import logging
import os
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Client factory — module-level singleton for connection reuse across
# Lambda warm invocations.
# ---------------------------------------------------------------------------

_sagemaker_runtime_client = None


def _get_client():
    global _sagemaker_runtime_client
    if _sagemaker_runtime_client is None:
        region = os.environ.get("AWS_REGION", "us-east-2")
        _sagemaker_runtime_client = boto3.client(
            "sagemaker-runtime",
            region_name=region,
        )
    return _sagemaker_runtime_client


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_sentiment(comment: str) -> dict[str, Any]:
    """
    Send a single comment to the SageMaker endpoint and return the
    raw classification result.

    Parameters
    ----------
    comment : str
        The comment text to classify.

    Returns
    -------
    dict with keys:
        "label" : str   – raw label from the model (e.g. "positive")
        "score" : float – confidence score (0.0 – 1.0)

    Raises
    ------
    ValueError   : if the comment is empty or the response is malformed
    ClientError  : propagated from boto3 on AWS API errors
    """
    if not comment or not comment.strip():
        raise ValueError("Comment text must not be empty.")

    endpoint_name = os.environ.get("SAGEMAKER_ENDPOINT_NAME")
    if not endpoint_name:
        raise EnvironmentError(
            "SAGEMAKER_ENDPOINT_NAME environment variable is not set."
        )

    # The HuggingFace text-classification DLC expects:
    #   Content-Type: application/json
    #   Body: {"inputs": "<text>"}
    payload = json.dumps({"inputs": comment.strip()})

    logger.info(
        "Invoking SageMaker endpoint '%s' for comment (len=%d)",
        endpoint_name,
        len(comment),
    )

    try:
        client = _get_client()
        response = client.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType="application/json",
            Accept="application/json",
            Body=payload.encode("utf-8"),
        )
    except ClientError as exc:
        error_code = exc.response["Error"]["Code"]
        logger.error(
            "SageMaker InvokeEndpoint failed [%s]: %s",
            error_code,
            exc.response["Error"]["Message"],
        )
        raise

    # Parse response body
    raw_body = response["Body"].read()
    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"SageMaker returned non-JSON response: {raw_body!r}"
        ) from exc

    return _extract_result(parsed)


def classify_batch(comments: list[str]) -> list[dict[str, Any]]:
    """
    Classify a list of comments sequentially.
    """
    if not comments:
        return []

    results = []
    for idx, comment in enumerate(comments):
        logger.info("Classifying comment %d/%d", idx + 1, len(comments))
        result = classify_sentiment(comment)
        results.append(result)

    return results


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_result(parsed: Any) -> dict[str, Any]:
    """
    Extract label and score from the SageMaker response payload.

    The HuggingFace text-classification DLC returns one of:
      - A list of dicts:  [{"label": "positive", "score": 0.92}]
      - A nested list:    [[{"label": "positive", "score": 0.92}]]
    """
    if isinstance(parsed, list) and len(parsed) > 0:
        first = parsed[0]
        if isinstance(first, list) and len(first) > 0:
            first = first[0]
        if isinstance(first, dict) and "label" in first and "score" in first:
            return {
                "label": first["label"],
                "score": float(first["score"]),
            }

    raise ValueError(
        f"Unexpected SageMaker response shape. "
        f"Expected list of {{label, score}} dicts, got: {parsed!r}"
    )
