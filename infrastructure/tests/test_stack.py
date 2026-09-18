"""
CDK stack unit tests.
"""
import os
import pytest
import aws_cdk as cdk
from aws_cdk.assertions import Template, Match
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from stacks.community_pulse_stack import CommunityPulseStack, SAGEMAKER_ENDPOINT_NAME


@pytest.fixture(scope="module")
def template():
    os.environ["CDK_DEFAULT_ACCOUNT"] = "123456789012"
    os.environ["CDK_DEFAULT_REGION"] = "us-east-2"
    os.environ["BEDROCK_MODEL_ID"] = "amazon.nova-lite-v1:0"

    app = cdk.App()
    stack = CommunityPulseStack(
        app, "TestCommunityPulseStack",
        env=cdk.Environment(account="123456789012", region="us-east-2"),
    )
    return Template.from_stack(stack)


def test_sagemaker_endpoint_exists(template):
    template.has_resource_properties("AWS::SageMaker::Endpoint", {
        "EndpointName": SAGEMAKER_ENDPOINT_NAME,
    })


def test_lambda_function_exists(template):
    template.has_resource_properties("AWS::Lambda::Function", {
        "FunctionName": "community-pulse-analyzer",
        "Runtime": "python3.12",
        "Handler": "handler.lambda_handler",
    })


def test_rest_api_exists(template):
    template.has_resource_properties("AWS::ApiGateway::RestApi", {
        "Name": "community-pulse-api",
    })
