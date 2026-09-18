"""
community_pulse_stack.py
------------------------

AWS CDK v2 stack for Community Pulse AI.

Resources created:
  1. IAM role for SageMaker endpoint execution
  2. IAM role for Lambda execution
  3. SageMaker Model (HuggingFace twitter-roberta-base-sentiment)
  4. SageMaker EndpointConfig (Serverless Inference)
  5. SageMaker Endpoint
  6. CloudWatch Log Group
  7. Lambda function (Python 3.12)
  8. API Gateway REST API with CORS
  9. CloudWatch Alarm
 10. CloudWatch Dashboard
"""

import os
from pathlib import Path

from aws_cdk import (
    Duration,
    RemovalPolicy,
    Stack,
    CfnOutput,
    aws_iam as iam,
    aws_lambda as lambda_,
    aws_apigateway as apigw,
    aws_logs as logs,
    aws_cloudwatch as cloudwatch,
    aws_sagemaker as sagemaker,
)
from constructs import Construct


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

HF_MODEL_ID = "cardiffnlp/twitter-roberta-base-sentiment"
HF_TASK = "text-classification"

AWS_REGION = "us-east-2"

HF_INFERENCE_IMAGE_URI = (
    f"763104351884.dkr.ecr.{AWS_REGION}.amazonaws.com/"
    "huggingface-pytorch-inference:"
    "2.3.0-transformers4.48.0-cpu-py311-ubuntu22.04"
)

SERVERLESS_MEMORY_MB = 3072
SERVERLESS_MAX_CONCURRENCY = 5

LAMBDA_MEMORY_MB = 512
LAMBDA_TIMEOUT_SECONDS = 60

DEFAULT_BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0"

SAGEMAKER_ENDPOINT_NAME = "community-pulse-sentiment"
LAMBDA_FUNCTION_NAME = "community-pulse-analyzer"
LAMBDA_LOG_GROUP_NAME = f"/aws/lambda/{LAMBDA_FUNCTION_NAME}"


class CommunityPulseStack(Stack):
    """
    Main infrastructure stack for Community Pulse AI.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # -------------------------------------------------------------------
        # Configuration
        # -------------------------------------------------------------------

        bedrock_model_id = os.environ.get(
            "BEDROCK_MODEL_ID",
            DEFAULT_BEDROCK_MODEL_ID,
        )

        # -------------------------------------------------------------------
        # SageMaker
        # -------------------------------------------------------------------

        sagemaker_role = self._create_sagemaker_role()

        sm_model = self._create_sagemaker_model(
            sagemaker_role,
        )

        endpoint_config = self._create_endpoint_config(
            sm_model,
        )

        endpoint = self._create_endpoint(
            endpoint_config,
        )

        # -------------------------------------------------------------------
        # Lambda
        # -------------------------------------------------------------------

        lambda_role = self._create_lambda_role(
            bedrock_model_id,
        )

        lambda_log_group = self._create_lambda_log_group()

        lambda_fn = self._create_lambda_function(
            lambda_role,
            bedrock_model_id,
            lambda_log_group,
        )

        # Lambda must wait for SageMaker endpoint creation.
        lambda_fn.node.add_dependency(endpoint)

        # -------------------------------------------------------------------
        # API Gateway
        # -------------------------------------------------------------------

        api = self._create_api_gateway(
            lambda_fn,
        )

        # -------------------------------------------------------------------
        # CloudWatch
        # -------------------------------------------------------------------

        self._create_alarms(
            lambda_fn,
            api,
        )

        self._create_dashboard(
            lambda_fn,
            api,
        )

        # -------------------------------------------------------------------
        # Outputs
        # -------------------------------------------------------------------

        CfnOutput(
            self,
            "ApiEndpointUrl",
            value=api.url,
            description="API Gateway endpoint URL",
            export_name="CommunityPulseApiUrl",
        )

        CfnOutput(
            self,
            "SageMakerEndpointName",
            value=SAGEMAKER_ENDPOINT_NAME,
            description="SageMaker serverless endpoint name",
            export_name="CommunityPulseSageMakerEndpoint",
        )

        CfnOutput(
            self,
            "LambdaFunctionName",
            value=lambda_fn.function_name,
            description="Lambda function name",
            export_name="CommunityPulseLambdaFunction",
        )

        CfnOutput(
            self,
            "BedrockModelId",
            value=bedrock_model_id,
            description="Bedrock model ID in use",
        )

    # =======================================================================
    # SageMaker
    # =======================================================================

    def _create_sagemaker_role(self) -> iam.Role:
        """
        Create execution role used by the SageMaker endpoint.
        """

        role = iam.Role(
            self,
            "SageMakerExecutionRole",
            role_name="CommunityPulseSageMakerRole",
            assumed_by=iam.ServicePrincipal(
                "sagemaker.amazonaws.com",
            ),
            description=(
                "Execution role for Community Pulse "
                "SageMaker endpoint"
            ),
        )

        role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "AmazonSageMakerFullAccess",
            )
        )

        return role

    def _create_sagemaker_model(
        self,
        execution_role: iam.Role,
    ) -> sagemaker.CfnModel:
        """
        Create SageMaker model using the HuggingFace inference image.
        """

        return sagemaker.CfnModel(
            self,
            "SentimentModel",
            model_name="community-pulse-sentiment-model",
            execution_role_arn=execution_role.role_arn,
            primary_container=sagemaker.CfnModel.ContainerDefinitionProperty(
                image=HF_INFERENCE_IMAGE_URI,
                environment={
                    "HF_MODEL_ID": HF_MODEL_ID,
                    "HF_TASK": HF_TASK,
                    "SAGEMAKER_CONTAINER_LOG_LEVEL": "20",
                    "SAGEMAKER_REGION": self.region,
                },
            ),
        )

    def _create_endpoint_config(
        self,
        model: sagemaker.CfnModel,
    ) -> sagemaker.CfnEndpointConfig:
        """
        Create Serverless Inference endpoint configuration.
        """

        config = sagemaker.CfnEndpointConfig(
            self,
            "SentimentEndpointConfig",
            endpoint_config_name="community-pulse-sentiment-config",
            production_variants=[
                sagemaker.CfnEndpointConfig.ProductionVariantProperty(
                    variant_name="AllTraffic",
                    model_name=model.model_name,
                    serverless_config=(
                        sagemaker.CfnEndpointConfig.ServerlessConfigProperty(
                            memory_size_in_mb=SERVERLESS_MEMORY_MB,
                            max_concurrency=SERVERLESS_MAX_CONCURRENCY,
                        )
                    ),
                )
            ],
        )

        config.add_dependency(model)

        return config

    def _create_endpoint(
        self,
        endpoint_config: sagemaker.CfnEndpointConfig,
    ) -> sagemaker.CfnEndpoint:
        """
        Create the SageMaker serverless endpoint.
        """

        endpoint = sagemaker.CfnEndpoint(
            self,
            "SentimentEndpoint",
            endpoint_name=SAGEMAKER_ENDPOINT_NAME,
            endpoint_config_name=endpoint_config.endpoint_config_name,
        )

        endpoint.add_dependency(endpoint_config)

        return endpoint

    # =======================================================================
    # Lambda IAM
    # =======================================================================

    def _create_lambda_role(
        self,
        bedrock_model_id: str,
    ) -> iam.Role:
        """
        Create execution role for Lambda.
        """

        role = iam.Role(
            self,
            "LambdaExecutionRole",
            role_name="CommunityPulseLambdaRole",
            assumed_by=iam.ServicePrincipal(
                "lambda.amazonaws.com",
            ),
        )

        role.add_managed_policy(
            iam.ManagedPolicy.from_aws_managed_policy_name(
                "service-role/AWSLambdaBasicExecutionRole",
            )
        )

        # SageMaker permission
        role.add_to_policy(
            iam.PolicyStatement(
                sid="SageMakerInvokeEndpoint",
                effect=iam.Effect.ALLOW,
                actions=[
                    "sagemaker:InvokeEndpoint",
                ],
                resources=[
                    (
                        f"arn:aws:sagemaker:{self.region}:"
                        f"{self.account}:endpoint/"
                        f"{SAGEMAKER_ENDPOINT_NAME}"
                    )
                ],
            )
        )

        # Bedrock permission
        role.add_to_policy(
            iam.PolicyStatement(
                sid="BedrockConverse",
                effect=iam.Effect.ALLOW,
                actions=[
                    "bedrock:InvokeModel",
                    "bedrock:Converse",
                ],
                resources=[
                    (
                        f"arn:aws:bedrock:{self.region}::"
                        f"foundation-model/{bedrock_model_id}"
                    )
                ],
            )
        )

        return role

    # =======================================================================
    # CloudWatch Logs
    # =======================================================================

    def _create_lambda_log_group(self) -> logs.LogGroup:
        """
        Create a dedicated CloudWatch Log Group for Lambda.

        This replaces the deprecated log_retention property and avoids
        creating a second log group/custom-resource combination.
        """

        return logs.LogGroup(
            self,
            "LambdaLogGroup",
            log_group_name=LAMBDA_LOG_GROUP_NAME,
            retention=logs.RetentionDays.ONE_MONTH,
            removal_policy=RemovalPolicy.DESTROY,
        )

    # =======================================================================
    # Lambda
    # =======================================================================

    def _create_lambda_function(
        self,
        execution_role: iam.Role,
        bedrock_model_id: str,
        log_group: logs.LogGroup,
    ) -> lambda_.Function:
        """
        Create Lambda function.

        The Lambda source directory is resolved from this Python file,
        making the path independent of the current working directory.
        """

        project_root = Path(__file__).resolve().parents[2]

        lambda_code_path = (
            project_root
            / "backend"
            / "lambda"
        )

        # Fail early with a clear error if the source folder is missing.
        if not lambda_code_path.exists():
            raise FileNotFoundError(
                f"Lambda source directory not found: "
                f"{lambda_code_path}"
            )

        if not lambda_code_path.is_dir():
            raise NotADirectoryError(
                f"Lambda source path is not a directory: "
                f"{lambda_code_path}"
            )

        return lambda_.Function(
            self,
            "AnalyzerFunction",
            function_name=LAMBDA_FUNCTION_NAME,
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="handler.lambda_handler",
            code=lambda_.Code.from_asset(
                str(lambda_code_path),
            ),
            role=execution_role,
            memory_size=LAMBDA_MEMORY_MB,
            timeout=Duration.seconds(
                LAMBDA_TIMEOUT_SECONDS,
            ),
            environment={
                "SAGEMAKER_ENDPOINT_NAME": SAGEMAKER_ENDPOINT_NAME,
                "BEDROCK_MODEL_ID": bedrock_model_id,
            },
            log_group=log_group,
        )

    # =======================================================================
    # API Gateway
    # =======================================================================

    def _create_api_gateway(
        self,
        lambda_fn: lambda_.Function,
    ) -> apigw.RestApi:
        """
        Create REST API with /analyze endpoint.
        """

        api = apigw.RestApi(
            self,
            "CommunityPulseApi",
            rest_api_name="community-pulse-api",
            deploy_options=apigw.StageOptions(
                stage_name="prod",
                throttling_rate_limit=10,
                throttling_burst_limit=20,
            ),
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,
                allow_methods=[
                    "POST",
                    "OPTIONS",
                ],
            ),
        )

        lambda_integration = apigw.LambdaIntegration(
            lambda_fn,
            timeout=Duration.seconds(29),
        )

        analyze_resource = api.root.add_resource(
            "analyze",
        )

        analyze_resource.add_method(
            "POST",
            lambda_integration,
        )

        return api

    # =======================================================================
    # CloudWatch Alarm
    # =======================================================================

    def _create_alarms(
        self,
        lambda_fn: lambda_.Function,
        api: apigw.RestApi,
    ) -> None:
        """
        Create Lambda error alarm.
        """

        cloudwatch.Alarm(
            self,
            "LambdaErrorAlarm",
            metric=lambda_fn.metric_errors(
                period=Duration.minutes(5),
            ),
            threshold=5,
            evaluation_periods=1,
        )

    # =======================================================================
    # CloudWatch Dashboard
    # =======================================================================

    def _create_dashboard(
        self,
        lambda_fn: lambda_.Function,
        api: apigw.RestApi,
    ) -> None:
        """
        Create operational CloudWatch dashboard.
        """

        dashboard = cloudwatch.Dashboard(
            self,
            "OperationalDashboard",
            dashboard_name="CommunityPulseAI",
        )

        dashboard.add_widgets(
            cloudwatch.GraphWidget(
                title="Lambda Invocations & Errors",
                left=[
                    lambda_fn.metric_invocations(),
                ],
                right=[
                    lambda_fn.metric_errors(),
                ],
            )
        )