# Community Pulse AI

A serverless application that analyzes community feedback using a combination of Machine Learning and Generative AI on AWS.

**Amazon SageMaker** classifies the sentiment of each comment (positive, neutral, negative). **Amazon Bedrock** then generates a narrative summary, identifies main topics, extracts insights, and recommends actions — all without any external AI APIs.

---

## Table of Contents

1. [Project Description](#1-project-description)
2. [Architecture](#2-architecture)
3. [AWS Services](#3-aws-services)
4. [Selected Models](#4-selected-models)
5. [Installation](#5-installation)
6. [Configuration](#6-configuration)
7. [Deployment](#7-deployment)
8. [Testing](#8-testing)
9. [Cost Management](#9-cost-management)
10. [Cleanup](#10-cleanup)
11. [Lessons Learned](#11-lessons-learned)

---

## 1. Project Description

Community Pulse AI demonstrates how **structured ML inference** and **generative AI** can work together in a single serverless pipeline.

### What it does

The user enters community feedback comments (up to 50 at a time). The application:
- Classifies each comment as **positive**, **neutral**, or **negative** using a fine-tuned RoBERTa model on Amazon SageMaker.
- Calculates sentiment counts and percentages.
- Sends the results to Amazon Bedrock, which generates:
  - A narrative **summary** of the overall feedback.
  - **Main topics** identified across comments.
  - Specific **insights** grounded in the data.
  - Concrete **suggested actions** for community managers.

### Why SageMaker + Bedrock Together

| Concern | Service | Why |
|---|---|---|
| Sentiment classification | SageMaker | Deterministic, fast, low-cost per call, purpose-built ML model |
| Summary + insights | Bedrock | Generative, handles open-ended reasoning, no model training needed |

Using SageMaker for classification keeps the Bedrock prompt small and focused — the model receives structured sentiment data rather than raw text, which improves output quality and reduces token costs.

---

## 2. Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                                 │
│              React + TypeScript (Amplify / S3+CloudFront)           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS POST /analyze
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Amazon API Gateway (REST API)                          │
│              POST /analyze  ->  Lambda Proxy Integration            │
│              Throttle: 10 rps / burst 20                            │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ Invoke
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              AWS Lambda  (Python 3.12, 512 MB, 60s)                 │
│              community-pulse-analyzer                               │
│                                                                     │
│   1. Validate request (1-50 comments, max 2000 chars each)          │
│   2. Call SageMaker endpoint per comment                            │
│   3. Aggregate sentiment results                                    │
│   4. Call Bedrock Converse API                                      │
│   5. Return unified JSON response                                   │
└──────────┬──────────────────────────────┬───────────────────────────┘
           │ InvokeEndpoint               │ Converse
           ▼                              ▼
┌──────────────────────┐    ┌─────────────────────────────────────────┐
│  Amazon SageMaker    │    │  Amazon Bedrock                         │
│  Serverless Endpoint │    │  amazon.nova-lite-v1:0                  │
│                      │    │                                         │
│  cardiffnlp/         │    │  Input: comments + sentiment results    │
│  twitter-roberta-    │    │  Output (JSON):                         │
│  base-sentiment      │    │   - summary                             │
│                      │    │   - main_topics[]                       │
│  3 classes:          │    │   - insights[]                          │
│  negative / neutral  │    │   - suggested_actions[]                 │
│  / positive          │    │                                         │
│                      │    │  API: Converse (not InvokeModel)        │
│  3072 MB serverless  │    │  Temp: 0.3 / Max tokens: 1024           │
│  Max concurrency: 5  │    │                                         │
└──────────────────────┘    └─────────────────────────────────────────┘
           │                              │
           └──────────────┬───────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Amazon CloudWatch                                      │
│   - Lambda logs (/aws/lambda/community-pulse-analyzer)              │
│   - API Gateway access logs (/aws/apigateway/community-pulse)       │
│   - SageMaker endpoint invocation metrics                           │
│   - Alarms: Lambda errors, Lambda P99 duration, API 5xx             │
│   - Dashboard: CommunityPulseAI                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. AWS Services

- **Amazon SageMaker**: Serverless Inference, 3072 MB memory, max concurrency 5, hosts HuggingFace `cardiffnlp/twitter-roberta-base-sentiment`.
- **Amazon Bedrock**: Foundation model `amazon.nova-lite-v1:0` using Bedrock Converse API for structured JSON insights.
- **AWS Lambda**: Python 3.12 orchestrator coordinating validation, ML inference, and LLM synthesis.
- **Amazon API Gateway**: REST API with CORS preflight and 10 rps / 20 burst throttling.
- **Amazon CloudWatch**: End-to-end logging, alarms, and latency tracking.
- **AWS CDK v2**: Infrastructure-as-Code in Python.
- **React + TypeScript**: Client application.

---

## 4. Selected Models

### SageMaker: `cardiffnlp/twitter-roberta-base-sentiment`
- Outputs 3 native classes: `negative`, `neutral`, `positive` without artificial threshold hacks.
- Trained on 58M+ tweets, well suited to informal community feedback.
- Deployed on HuggingFace PyTorch Inference Deep Learning Container (DLC).

### Bedrock: `amazon.nova-lite-v1:0`
- Directly accessible ON_DEMAND without cross-region inference profile setup.
- Native Converse API support, optimized for strict JSON generation at temperature 0.3.
- Most cost-effective tier in the Nova family ($0.00006/1K in, $0.00024/1K out).

---

## 5. Installation

```bash
# Backend
cd backend
pip install -r lambda/requirements.txt
pip install pytest pytest-cov

# Infrastructure
cd ../infrastructure
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

---

## 6. Configuration

Environment variables in `infrastructure/.env`:
```env
CDK_DEFAULT_REGION=us-east-2
CDK_DEFAULT_ACCOUNT=123456789012
BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
```

Frontend environment variable in `frontend/.env.local`:
```env
REACT_APP_API_URL=https://YOUR_API_ID.execute-api.us-east-2.amazonaws.com/prod/
```

---

## 7. Deployment

1. **Enable Bedrock Model Access**: In AWS Console -> Bedrock -> Model access -> Enable **Amazon Nova Lite**.
2. **Bootstrap CDK**:
   ```bash
   cd infrastructure
   cdk bootstrap aws://YOUR_ACCOUNT/us-east-2
   ```
3. **Deploy Stack**:
   ```bash
   cdk deploy
   ```
4. **Deploy Frontend**:
   ```bash
   cd ../frontend
   npm run build
   ```

---

## 8. Testing

Run backend test suite (54 unit tests with zero AWS credential requirements):
```bash
pytest backend/tests/ -v --cov=backend/lambda
```

Run CDK infrastructure tests:
```bash
pytest infrastructure/tests/ -v
```

---

## 9. Cost Management

Estimated monthly cost for 500 comment batches per month: ~$0.65 to $3.65 (depending on CloudWatch dashboard retention).
- SageMaker Serverless scales to 0 when idle.
- Bedrock Nova Lite charges only per token used.
- API Gateway & Lambda have generous free tiers.

---

## 10. Cleanup

```bash
cd infrastructure
cdk destroy
```

---

## 11. Lessons Learned

1. **3-Class Sentiment**: Using a native 3-class model (RoBERTa) is vastly superior to thresholding a 2-class model (like DistilBERT SST-2).
2. **Converse API**: Bedrock Converse API provides clean JSON enforcement and uniform model swapping.
3. **Serverless Cold Starts**: Frontend UX must communicate the initial 30-60s serverless container wake-up gracefully.
4. **Decoupling ML from GenAI**: Offloading classification to an ML endpoint keeps LLM token costs minimal while increasing accuracy.
