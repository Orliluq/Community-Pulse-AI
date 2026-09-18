import React, { useState } from 'react';
import { Code2, Copy, Check, FileText, Download } from 'lucide-react';

const CODE_SNIPPETS: Record<string, { filename: string; language: string; content: string; description: string }> = {
  handler: {
    filename: 'backend/lambda/handler.py',
    language: 'python',
    description: 'AWS Lambda entry point orchestrating SageMaker inference, aggregator, and Bedrock Converse API.',
    content: `import json
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

def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    comments, validation_error = _validate_request(event)
    if validation_error:
        return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": validation_error})}

    # 1. SageMaker Sentiment Classification
    raw_results = classify_batch(comments)

    # 2. Build normalized per-comment structures
    comment_results = [
        build_comment_result(text=comment, raw_label=raw["label"], score=raw["score"])
        for comment, raw in zip(comments, raw_results)
    ]

    # 3. Aggregate statistics
    aggregation = aggregate_results(comment_results)

    # 4. Bedrock Generative Insights (Converse API)
    analysis = generate_analysis(
        comments=comments,
        sentiment_results=raw_results,
        aggregation=aggregation,
    )

    # 5. Return merged response
    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({**aggregation, **analysis})
    }`
  },
  sagemaker: {
    filename: 'backend/lambda/sagemaker_client.py',
    language: 'python',
    description: 'Boto3 client calling SageMaker Serverless Endpoint running cardiffnlp/twitter-roberta-base-sentiment.',
    content: `import json
import os
import boto3

def classify_sentiment(comment: str) -> dict:
    endpoint_name = os.environ.get("SAGEMAKER_ENDPOINT_NAME")
    client = boto3.client("sagemaker-runtime", region_name=os.environ.get("AWS_REGION", "us-east-2"))

    payload = json.dumps({"inputs": comment.strip()})
    response = client.invoke_endpoint(
        EndpointName=endpoint_name,
        ContentType="application/json",
        Accept="application/json",
        Body=payload.encode("utf-8")
    )
    raw = json.loads(response["Body"].read())
    first = raw[0] if isinstance(raw, list) else raw
    if isinstance(first, list):
        first = first[0]
    return {"label": first["label"], "score": float(first["score"])}`
  },
  bedrock: {
    filename: 'backend/lambda/bedrock_client.py',
    language: 'python',
    description: 'Amazon Bedrock Runtime client using the Converse API with amazon.nova-lite-v1:0.',
    content: `import json
import os
import boto3

SYSTEM_PROMPT = "You are a precise community feedback analyst. You always respond with valid JSON only."

def generate_analysis(comments: list[str], sentiment_results: list[dict], aggregation: dict) -> dict:
    model_id = os.environ.get("BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")
    client = boto3.client("bedrock-runtime", region_name=os.environ.get("AWS_REGION", "us-east-2"))

    prompt = build_prompt(comments, sentiment_results, aggregation)
    response = client.converse(
        modelId=model_id,
        system=[{"text": SYSTEM_PROMPT}],
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        inferenceConfig={"maxTokens": 1024, "temperature": 0.3, "topP": 0.9}
    )
    raw_text = response["output"]["message"]["content"][0]["text"].strip()
    return json.loads(strip_code_fences(raw_text))`
  },
  cdk: {
    filename: 'infrastructure/stacks/community_pulse_stack.py',
    language: 'python',
    description: 'AWS CDK v2 stack provisioning SageMaker Serverless Endpoint, Lambda, API Gateway, and IAM roles.',
    content: `from aws_cdk import (
    Stack, Duration,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_sagemaker as sagemaker,
)
from constructs import Construct

class CommunityPulseStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs):
        super().__init__(scope, construct_id, **kwargs)

        # 1. SageMaker Serverless Endpoint (RoBERTa)
        endpoint_config = sagemaker.CfnEndpointConfig(
            self, "SentimentEndpointConfig",
            endpoint_config_name="community-pulse-sentiment-config",
            production_variants=[{
                "variantName": "AllTraffic",
                "modelName": model.model_name,
                "serverlessConfig": {"memorySizeInMb": 3072, "maxConcurrency": 5}
            }]
        )

        # 2. Lambda Function (Python 3.12)
        analyzer_fn = lambda_.Function(
            self, "AnalyzerFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset("../backend/lambda"),
            timeout=Duration.seconds(60),
            memory_size=512,
            environment={
                "SAGEMAKER_ENDPOINT_NAME": "community-pulse-sentiment",
                "BEDROCK_MODEL_ID": "amazon.nova-lite-v1:0"
            }
        )

        # 3. API Gateway REST API with CORS
        api = apigw.RestApi(self, "CommunityPulseApi", rest_api_name="community-pulse-api")
        api.root.add_resource("analyze").add_method("POST", apigw.LambdaIntegration(analyzer_fn))`
  },
  csv: {
    filename: 'sample_data/comments.csv',
    language: 'csv',
    description: '15 realistic community survey feedback entries across municipal services.',
    content: `comment
The new community park is absolutely wonderful! My kids love playing there every weekend.
The trash collection schedule is very confusing and inconsistent. We never know when to put bins out.
The library hours are okay, but it would be great if they opened earlier on weekdays.
I am extremely frustrated with the pothole situation on Main Street. My car was damaged last week.
The new bike lanes are a fantastic addition. I feel much safer commuting to work now.
The local farmers market is a highlight of our neighborhood. Fresh produce and great community spirit.
Noise levels near the construction site are unbearable. It starts at 6am and wakes up my whole family.
The community center staff are always helpful and friendly. Great programs for seniors too.
Internet connectivity in the south district is terrible. We lose connection multiple times a day.
The new street lighting has made evening walks feel much safer. Thank you for this improvement.
Public transport frequency needs improvement. Waiting 45 minutes for a bus is unacceptable.
The annual street festival was amazing this year. Best event the neighborhood has had in years.
Water pressure in our building has been low for three months. Multiple complaints have been ignored.
The new recycling program is a great initiative. Easy to follow and makes a real difference.
Customer service at the city office is slow and unhelpful. Spent two hours waiting for a simple form.`
  }
};

export const CodeExplorer: React.FC = () => {
  const [selectedKey, setSelectedKey] = useState<string>('handler');
  const [copied, setCopied] = useState(false);

  const active = CODE_SNIPPETS[selectedKey];

  const handleCopy = () => {
    navigator.clipboard.writeText(active.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([active.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = active.filename.split('/').pop() || 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl dark:shadow-2xl space-y-4 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Project Code & Infrastructure Assets
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Production files created in the workspace for AWS Lambda, SageMaker, Bedrock, and CDK
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {Object.entries(CODE_SNIPPETS).map(([key, data]) => {
          const isSelected = selectedKey === key;
          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              className={`px-3 py-1.5 rounded-xl border whitespace-nowrap font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
              }`}
            >
              {data.filename.split('/').pop()}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
        <span>{active.description}</span>
        <code className="text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">{active.filename}</code>
      </div>

      {/* Code Display */}
      <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-200 overflow-x-auto max-h-[500px] leading-relaxed">
        {active.content}
      </pre>
    </div>
  );
};
