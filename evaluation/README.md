# Bilingual sentiment evaluation pilot

This folder contains a controlled 90-record pilot dataset and a script that evaluates the **deployed** Community Pulse AI SageMaker endpoint.

## Scope and limitations

- 90 synthetic comments: 45 English and 45 Spanish.
- Balanced labels: 30 positive, 30 neutral, and 30 negative.
- Each language/class pair contains 15 examples.
- The labels are reference labels assigned during dataset construction. They are not annotations from real community members or independently adjudicated labels.
- The script reuses `backend/lambda/sagemaker_client.py` and `sentiment_aggregator.py`; it does not train or fine-tune a model.
- The script invokes one comment at a time, matching the current sequential inference path.

**Language warning:** the repository's current baseline, `cardiffnlp/twitter-roberta-base-sentiment`, is English-oriented. Spanish rows are an exploratory cross-lingual stress test. Results on Spanish must be reported separately and do not establish Spanish-language support. Do not use a combined bilingual score to conceal this limitation.

Because the examples are synthetic and intentionally straightforward, this pilot is an initial controlled check, not a representative benchmark, a measure of real-world community sentiment quality, or a production accuracy claim. A stronger follow-up should use consented, de-identified real comments independently annotated by multiple reviewers, disagreements adjudicated, and an untouched holdout set.

## Dataset schema

`datasets/sentiment_pilot_bilingual.csv` has these columns:

| Column | Description |
|---|---|
| `id` | Stable record identifier |
| `language` | `en` or `es` |
| `expected_label` | Reference label: `positive`, `neutral`, or `negative` |
| `text` | Synthetic community-feedback comment |

## Install and validate

Run commands from the repository root. Use your existing project virtual environment if it is active.

```bash
python -m pip install -r evaluation/requirements.txt
python evaluation/scripts/evaluate_sentiment.py --validate-only
```

The validation-only command checks the CSV structure, duplicate IDs, valid labels, total row count, and balance without making AWS calls or incurring endpoint invocation charges.

## Run against the deployed endpoint

First ensure the SageMaker endpoint is deployed and in `InService` status. Configure AWS credentials through an approved Boto3 credential provider (for example, an AWS CLI profile or role). Do not commit access keys. The identity needs `sagemaker:InvokeEndpoint` permission for the selected endpoint.

Git Bash:

```bash
export AWS_REGION=us-east-2
export SAGEMAKER_ENDPOINT_NAME=community-pulse-sentiment
python evaluation/scripts/evaluate_sentiment.py
```

Or pass the endpoint explicitly:

```bash
python evaluation/scripts/evaluate_sentiment.py --endpoint-name community-pulse-sentiment --region us-east-2
```

The script does not deploy, create, or delete AWS resources. It invokes the endpoint once per record (90 calls for the full pilot), so AWS usage charges may apply. If an inference call fails, it stops and does not present partial predictions as full-pilot metrics.

### Optional smoke test

```bash
python evaluation/scripts/evaluate_sentiment.py --limit 3
```

A limited run is only a connectivity/code smoke test. It is not a valid result for the 90-record pilot.

## Generated artifacts

Each full run creates a timestamped folder under `evaluation/results/` containing:

- `predictions.csv`: reference and predicted labels, model score, and per-comment latency.
- `classification_report.json`: dataset SHA-256, endpoint/model metadata, overall and per-language metrics, confusion matrices, and latency summary.
- `confusion_matrix.png`: overall confusion matrix.

Use `--output-dir` to select a different output folder. Generated result files are ignored by Git to avoid accidentally committing run artifacts.

## Metrics and interpretation

The report includes accuracy, per-class precision/recall/F1, macro and weighted averages, and confusion matrices. Review English and Spanish reports separately. Latencies are client-observed wall-clock times for sequential `InvokeEndpoint` calls; they are not pure model-compute benchmarks and may include network, service queueing, and serverless cold-start effects.
