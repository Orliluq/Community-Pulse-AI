"""
bedrock_client.py
-----------------
Wrapper around the Amazon Bedrock Runtime Converse API.

Responsibilities:
  - Accept aggregated sentiment data + original comments
  - Build a structured prompt requesting JSON output
  - Call Bedrock Converse API (model: amazon.nova-lite-v1:0)
  - Parse and return the structured analysis

Environment variables:
  BEDROCK_MODEL_ID  – Bedrock model ID (default: amazon.nova-lite-v1:0)
  AWS_REGION        – AWS region (set automatically by Lambda runtime)
"""

import json
import logging
import os
import re
from typing import Any

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

DEFAULT_MODEL_ID = "amazon.nova-lite-v1:0"

# ---------------------------------------------------------------------------
# Client factory
# ---------------------------------------------------------------------------

_bedrock_client = None


def _get_client():
    global _bedrock_client
    if _bedrock_client is None:
        region = os.environ.get("AWS_REGION", "us-east-2")
        _bedrock_client = boto3.client(
            "bedrock-runtime",
            region_name=region,
        )
    return _bedrock_client


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_prompt(
    comments: list[str],
    sentiment_results: list[dict[str, Any]],
    aggregation: dict[str, Any],
) -> str:
    """
    Build the user-turn prompt that instructs Nova Lite to produce
    a structured JSON analysis of the community feedback.
    """
    total = aggregation["total_comments"]
    pos = aggregation["positive_count"]
    neu = aggregation["neutral_count"]
    neg = aggregation["negative_count"]

    # Format each comment with its sentiment label and score
    comment_lines = []
    for i, (comment, result) in enumerate(zip(comments, sentiment_results), 1):
        label = result["label"]
        score = result["score"]
        comment_lines.append(
            f"{i}. [{label.upper()} | score: {score:.4f}] {comment}"
        )
    comments_block = "\n".join(comment_lines)

    prompt = f"""You are an expert community analyst. You have received {total} community feedback comments.

SENTIMENT SUMMARY:
- Total comments: {total}
- Positive: {pos} ({aggregation['positive_pct']}%)
- Neutral: {neu} ({aggregation['neutral_pct']}%)
- Negative: {neg} ({aggregation['negative_pct']}%)

COMMENTS WITH SENTIMENT SCORES:
{comments_block}

Analyse the comments above and respond with ONLY a valid JSON object — no markdown, no code fences, no explanation outside the JSON.

The JSON must follow this exact schema:
{{
  "summary": "<2-3 sentence narrative summary of the overall community sentiment and key themes>",
  "main_topics": ["<topic 1>", "<topic 2>", "<topic 3>"],
  "insights": [
    "<specific insight 1 derived from the data>",
    "<specific insight 2 derived from the data>",
    "<specific insight 3 derived from the data>"
  ],
  "suggested_actions": [
    "<concrete actionable recommendation 1>",
    "<concrete actionable recommendation 2>",
    "<concrete actionable recommendation 3>"
  ]
}}

Rules:
- main_topics: 3 to 5 short topic labels (2-4 words each)
- insights: 3 to 5 specific observations grounded in the comment data
- suggested_actions: 3 to 5 concrete, actionable recommendations for community managers
- All values must be strings — no nested objects or arrays within the values
- Respond with the JSON object only"""

    return prompt


SYSTEM_PROMPT = (
    "You are a precise community feedback analyst. "
    "You always respond with valid JSON only — no markdown, no prose outside the JSON object. "
    "Your analysis is grounded strictly in the provided data."
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_analysis(
    comments: list[str],
    sentiment_results: list[dict[str, Any]],
    aggregation: dict[str, Any],
) -> dict[str, Any]:
    """
    Call the Bedrock Converse API to generate a structured analysis
    of the community feedback.
    """
    model_id = os.environ.get("BEDROCK_MODEL_ID", DEFAULT_MODEL_ID)

    prompt = _build_prompt(comments, sentiment_results, aggregation)

    logger.info(
        "Calling Bedrock Converse API. model=%s, comments=%d",
        model_id,
        len(comments),
    )

    try:
        client = _get_client()
        response = client.converse(
            modelId=model_id,
            system=[{"text": SYSTEM_PROMPT}],
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ],
            inferenceConfig={
                "maxTokens": 1024,
                "temperature": 0.3,
                "topP": 0.9,
            },
        )
    except ClientError as exc:
        error_code = exc.response["Error"]["Code"]
        logger.error(
            "Bedrock Converse failed [%s]: %s",
            error_code,
            exc.response["Error"]["Message"],
        )
        raise

    return _parse_response(response)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_response(response: dict[str, Any]) -> dict[str, Any]:
    try:
        content_blocks = response["output"]["message"]["content"]
        raw_text = content_blocks[0]["text"].strip()
    except (KeyError, IndexError) as exc:
        raise ValueError(
            f"Unexpected Bedrock response structure: {response!r}"
        ) from exc

    usage = response.get("usage", {})
    logger.info(
        "Bedrock token usage — input: %d, output: %d, total: %d",
        usage.get("inputTokens", 0),
        usage.get("outputTokens", 0),
        usage.get("totalTokens", 0),
    )

    cleaned = _strip_code_fences(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Bedrock returned non-JSON content: {cleaned!r}"
        ) from exc

    return _validate_analysis(parsed)


def _strip_code_fences(text: str) -> str:
    pattern = r"^```(?:json)?\s*([\s\S]*?)\s*```$"
    match = re.match(pattern, text.strip())
    if match:
        return match.group(1).strip()
    return text


def _validate_analysis(data: Any) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise ValueError(
            f"Expected a JSON object from Bedrock, got {type(data).__name__}"
        )

    def ensure_str(val: Any, default: str = "") -> str:
        return str(val) if val is not None else default

    def ensure_list_of_str(val: Any, default: list) -> list[str]:
        if isinstance(val, list):
            return [str(item) for item in val if item is not None]
        return default

    return {
        "summary": ensure_str(data.get("summary"), "No summary available."),
        "main_topics": ensure_list_of_str(data.get("main_topics"), []),
        "insights": ensure_list_of_str(data.get("insights"), []),
        "suggested_actions": ensure_list_of_str(data.get("suggested_actions"), []),
    }
