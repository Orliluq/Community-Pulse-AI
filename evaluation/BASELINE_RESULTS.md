# SageMaker Sentiment Evaluation — Baseline Results

## Evaluation metadata

- Date: 2026-11-21
- Endpoint: `community-pulse-sentiment`
- Region: `us-east-2`
- Model: `cardiffnlp/twitter-roberta-base-sentiment`
- Dataset: 90 synthetic comments
- Dataset SHA-256: `b8746b08173cc17fe3b1f10b121efbda8b0c89aa3683aa54cfc74b2bb70bd9c0`
- Evaluation run: `20261121T181929Z`

## Overall results

| Metric | Result |
|---|---:|
| Samples | 90 |
| Correct predictions | 56 |
| Accuracy | 62.22% |

## Results by language

| Language | Samples | Correct | Accuracy |
|---|---:|---:|---:|
| English | 45 | 41 | 91.11% |
| Spanish | 45 | 15 | 33.33% |

### English classification metrics

| Class | Precision | Recall | F1-score |
|---|---:|---:|---:|
| Negative | 1.000 | 0.800 | 0.889 |
| Neutral | 0.824 | 0.933 | 0.875 |
| Positive | 0.938 | 1.000 | 0.968 |

Confusion matrix (expected rows, predicted columns):

```text
[[12,  3,  0],
 [ 0, 14,  1],
 [ 0,  0, 15]]