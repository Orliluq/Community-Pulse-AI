#!/usr/bin/env python3
"""
app.py - CDK application entry point
"""
import os
import aws_cdk as cdk
from stacks.community_pulse_stack import CommunityPulseStack

app = cdk.App()

CommunityPulseStack(
    app,
    "CommunityPulseStack",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=os.environ.get("CDK_DEFAULT_REGION", "us-east-2"),
    ),
    description="Community Pulse AI — SageMaker + Bedrock sentiment analysis stack",
)

app.synth()
