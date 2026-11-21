#!/usr/bin/env python3
"""Evaluate the deployed Community Pulse AI SageMaker sentiment endpoint.

Run from the repository root:
    python evaluation/scripts/evaluate_sentiment.py --validate-only
    python evaluation/scripts/evaluate_sentiment.py --endpoint-name community-pulse-sentiment

This script reuses the production Lambda adapter and label normalizer. It does
not train or fine-tune the model.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import os
import statistics
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

REPO_ROOT = Path(__file__).resolve().parents[2]
LAMBDA_PATH = REPO_ROOT / "backend" / "lambda"
if str(LAMBDA_PATH) not in sys.path:
    sys.path.insert(0, str(LAMBDA_PATH))

from sagemaker_client import classify_sentiment  # noqa: E402
from sentiment_aggregator import normalise_label  # noqa: E402

LOGGER = logging.getLogger("community_pulse_evaluation")
LABELS = ["negative", "neutral", "positive"]
LANGUAGES = ["en", "es"]
DEFAULT_DATASET = REPO_ROOT / "evaluation" / "datasets" / "sentiment_pilot_bilingual.csv"
MODEL_ID = "cardiffnlp/twitter-roberta-base-sentiment"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Evaluate a deployed Community Pulse AI SageMaker endpoint."
    )
    parser.add_argument(
        "--endpoint-name", default=os.getenv("SAGEMAKER_ENDPOINT_NAME"),
        help="SageMaker endpoint name (or SAGEMAKER_ENDPOINT_NAME environment variable).",
    )
    parser.add_argument(
        "--region", default=os.getenv("AWS_REGION", "us-east-2"),
        help="AWS region. Defaults to AWS_REGION or us-east-2.",
    )
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument(
        "--skip-balance-check", action="store_true",
        help="Allow a custom dataset that is not balanced by language and class.",
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Optional row limit for a smoke test. Limited runs are not final pilot metrics.",
    )
    parser.add_argument(
        "--validate-only", action="store_true",
        help="Validate dataset structure and class balance without calling AWS.",
    )
    return parser.parse_args()


def load_dataset(path: Path, require_balanced: bool = True) -> list[dict[str, str]]:
    if not path.is_file():
        raise FileNotFoundError(f"Dataset not found: {path}")

    required = ["id", "language", "expected_label", "text"]
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = set(required) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Dataset is missing required columns: {sorted(missing)}")

        records: list[dict[str, str]] = []
        seen_ids: set[str] = set()
        for line_number, row in enumerate(reader, start=2):
            record = {key: (row.get(key) or "").strip() for key in required}
            if not all(record.values()):
                raise ValueError(f"Empty required value at CSV line {line_number}.")
            if record["id"] in seen_ids:
                raise ValueError(f"Duplicate id '{record['id']}' at CSV line {line_number}.")
            if record["language"] not in LANGUAGES:
                raise ValueError(f"Unsupported language '{record['language']}' at line {line_number}.")
            if record["expected_label"] not in LABELS:
                raise ValueError(f"Invalid expected_label '{record['expected_label']}' at line {line_number}.")
            seen_ids.add(record["id"])
            records.append(record)

    if not records:
        raise ValueError("Dataset contains no records.")

    if require_balanced:
        counts = Counter((row["language"], row["expected_label"]) for row in records)
        expected = {(language, label) for language in LANGUAGES for label in LABELS}
        wrong_counts = {
            f"{language}/{label}": counts[(language, label)]
            for language, label in expected
            if counts[(language, label)] != 15
        }
        unexpected = set(counts) - expected
        if len(records) != 90 or wrong_counts or unexpected:
            raise ValueError(
                "The pilot must contain exactly 90 rows and 15 examples for each "
                f"language/class pair. Total={len(records)}, counts={wrong_counts}, "
                f"unexpected={sorted(unexpected)}."
            )

    return records


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def percentile(values: list[float], percentile_value: float) -> float:
    """Nearest-rank percentile, in milliseconds."""
    if not values:
        return 0.0
    ordered = sorted(values)
    rank = max(1, int((percentile_value / 100.0) * len(ordered) + 0.999999))
    return ordered[min(rank - 1, len(ordered) - 1)]


def evaluate_records(
    records: list[dict[str, str]], endpoint_name: str, region: str
) -> tuple[list[dict[str, Any]], list[float]]:
    os.environ["SAGEMAKER_ENDPOINT_NAME"] = endpoint_name
    os.environ["AWS_REGION"] = region
    predictions: list[dict[str, Any]] = []
    latencies_ms: list[float] = []

    for index, record in enumerate(records, start=1):
        started = time.perf_counter()
        try:
            result = classify_sentiment(record["text"])
            latency_ms = (time.perf_counter() - started) * 1000.0
            predicted_label = normalise_label(str(result["label"]))
            score = float(result["score"])
            if not 0.0 <= score <= 1.0:
                raise ValueError(f"Model score is outside [0, 1]: {score}")
        except Exception as exc:
            LOGGER.exception(
                "Inference failed for %s (%d/%d). Stopping; partial results "
                "must not be reported as final metrics.",
                record["id"], index, len(records),
            )
            raise RuntimeError(
                f"Inference failed for {record['id']} ({index}/{len(records)}): {exc}"
            ) from exc

        latencies_ms.append(latency_ms)
        predictions.append({
            **record,
            "predicted_label": predicted_label,
            "score": round(score, 6),
            "latency_ms": round(latency_ms, 3),
        })
        LOGGER.info(
            "[%d/%d] %s | expected=%s predicted=%s score=%.4f latency=%.1f ms",
            index, len(records), record["id"], record["expected_label"],
            predicted_label, score, latency_ms,
        )
    return predictions, latencies_ms


def metrics_for_subset(predictions: list[dict[str, Any]]) -> dict[str, Any]:
    y_true = [item["expected_label"] for item in predictions]
    y_pred = [item["predicted_label"] for item in predictions]
    return {
        "sample_count": len(predictions),
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 6),
        "classification_report": classification_report(
            y_true, y_pred, labels=LABELS, target_names=LABELS,
            output_dict=True, zero_division=0,
        ),
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=LABELS).tolist(),
    }


def write_predictions(path: Path, predictions: list[dict[str, Any]]) -> None:
    fields = ["id", "language", "text", "expected_label", "predicted_label", "score", "latency_ms"]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(predictions)


def write_confusion_matrix(path: Path, matrix: list[list[int]], title: str) -> None:
    figure, axis = plt.subplots(figsize=(7, 6))
    image = axis.imshow(matrix)
    axis.set(
        xticks=range(len(LABELS)), yticks=range(len(LABELS)),
        xticklabels=LABELS, yticklabels=LABELS,
        xlabel="Predicted label", ylabel="Expected label", title=title,
    )
    figure.colorbar(image, ax=axis, label="Number of comments")
    threshold = max((max(row) for row in matrix), default=0) / 2.0
    for row_index, row in enumerate(matrix):
        for column_index, value in enumerate(row):
            axis.text(
                column_index, row_index, str(value), ha="center", va="center",
                color="white" if value > threshold else "black",
            )
    figure.tight_layout()
    figure.savefig(path, dpi=160)
    plt.close(figure)


def main() -> int:
    args = parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if args.limit is not None and args.limit < 1:
        LOGGER.error("--limit must be at least 1.")
        return 2

    dataset_path = args.dataset.resolve()
    records = load_dataset(dataset_path, require_balanced=not args.skip_balance_check)
    if args.validate_only:
        counts = Counter((row["language"], row["expected_label"]) for row in records)
        LOGGER.info("Dataset validation passed: %d rows", len(records))
        for language in LANGUAGES:
            LOGGER.info(
                "%s: %s", language,
                {label: counts[(language, label)] for label in LABELS},
            )
        LOGGER.info("Dataset SHA-256: %s", sha256_file(dataset_path))
        return 0

    if not args.endpoint_name:
        LOGGER.error(
            "Provide --endpoint-name or set SAGEMAKER_ENDPOINT_NAME. "
            "This script does not create or deploy an endpoint."
        )
        return 2

    if args.limit is not None:
        LOGGER.warning(
            "Running a limited smoke test (%d rows). Do not report it as the full pilot.",
            args.limit,
        )
        records = records[:args.limit]

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output_dir = args.output_dir.resolve() if args.output_dir else REPO_ROOT / "evaluation" / "results" / timestamp
    output_dir.mkdir(parents=True, exist_ok=True)

    LOGGER.info(
        "Evaluating %d comments against endpoint '%s' in region '%s'.",
        len(records), args.endpoint_name, args.region,
    )
    predictions, latencies_ms = evaluate_records(records, args.endpoint_name, args.region)
    overall = metrics_for_subset(predictions)
    by_language = {
        language: metrics_for_subset([item for item in predictions if item["language"] == language])
        for language in LANGUAGES
        if any(item["language"] == language for item in predictions)
    }

    report = {
        "metadata": {
            "evaluated_at_utc": datetime.now(timezone.utc).isoformat(),
            "dataset_path": str(dataset_path.relative_to(REPO_ROOT)) if dataset_path.is_relative_to(REPO_ROOT) else str(dataset_path),
            "dataset_sha256": sha256_file(dataset_path),
            "endpoint_name": args.endpoint_name,
            "aws_region": args.region,
            "model_id_configured_in_project": MODEL_ID,
            "total_records_evaluated": len(predictions),
            "languages": sorted({item["language"] for item in predictions}),
            "latency_ms": {
                "mean": round(statistics.mean(latencies_ms), 3),
                "median": round(statistics.median(latencies_ms), 3),
                "p95_nearest_rank": round(percentile(latencies_ms, 95), 3),
            },
            "evaluation_note": (
                "Synthetic pilot with manually assigned labels. This is an initial "
                "controlled check, not a representative benchmark or production "
                "accuracy claim. The configured CardiffNLP RoBERTa baseline is "
                "English-oriented; Spanish results are an exploratory cross-lingual "
                "stress test and do not establish Spanish-language support."
            ),
        },
        "overall": overall,
        "by_language": by_language,
    }

    write_predictions(output_dir / "predictions.csv", predictions)
    with (output_dir / "classification_report.json").open("w", encoding="utf-8") as handle:
        json.dump(report, handle, ensure_ascii=False, indent=2)
    write_confusion_matrix(
        output_dir / "confusion_matrix.png", overall["confusion_matrix"],
        "Community Pulse AI — overall pilot confusion matrix",
    )
    LOGGER.info("Evaluation completed successfully.")
    LOGGER.info("Overall accuracy: %.4f", overall["accuracy"])
    LOGGER.info("Artifacts written to: %s", output_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
