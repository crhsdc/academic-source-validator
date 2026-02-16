#!/usr/bin/env python3
"""
Generate AWS Architecture Diagram with Official AWS Icons
Uses the 'diagrams' library
"""

from diagrams import Diagram, Cluster, Edge
from diagrams.aws.compute import Lambda, LambdaFunction
from diagrams.aws.network import APIGateway, CloudFront, Route53
from diagrams.aws.storage import S3
from diagrams.aws.database import Dynamodb
from diagrams.aws.management import Cloudwatch
from diagrams.aws.devtools import XRay
from diagrams.aws.security import IAM
from diagrams.aws.integration import SimpleNotificationServiceSns
from diagrams.onprem.client import Users
from diagrams.onprem.network import Internet

# Configure diagram
graph_attr = {
    "fontsize": "16",
    "bgcolor": "white",
    "pad": "0.5",
    "splines": "ortho",
    "nodesep": "0.8",
    "ranksep": "1.2",
}

node_attr = {
    "fontsize": "12",
    "height": "1.5",
    "width": "1.5",
}

edge_attr = {
    "fontsize": "10",
}

with Diagram(
    "Source Validator - AWS Serverless Architecture",
    filename="specs/aws-architecture-diagram",
    direction="TB",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr,
    show=False,
):
    # User Layer
    users = Users("Users/Students")

    # Optional DNS
    dns = Route53("Route 53\n(Optional DNS)")

    # CDN Layer
    cdn = CloudFront("CloudFront\nCDN + HTTPS")

    # Frontend & API
    with Cluster("Frontend Hosting"):
        frontend_bucket = S3("Frontend Bucket\nReact App\n(Static Site)")

    with Cluster("API Layer"):
        api_gateway = APIGateway("API Gateway\nREST API")

    # Lambda Functions Layer
    with Cluster("Compute Layer - Lambda Functions"):
        with Cluster("Node.js Functions"):
            parse_lambda = LambdaFunction("Parse\nFunction")
            validate_lambda = LambdaFunction("Validate\nFunction")
            report_lambda = LambdaFunction("Generate Report\nFunction")

        check_citation_lambda = LambdaFunction("Check Citation\nFunction\n(Python)")

        # Lambda Layer
        lambda_layer = Lambda("Shared Layer\nCommon Code\n& Dependencies")

    # Data Layer
    with Cluster("Data Layer"):
        dynamodb = Dynamodb("DynamoDB\nValidation\nSessions Table")
        file_bucket = S3("File Storage\nBucket\n(Temp Files)")

    # Monitoring & Security
    with Cluster("Monitoring & Observability"):
        cloudwatch = Cloudwatch("CloudWatch\nLogs + Metrics\n+ Alarms")
        xray = XRay("X-Ray\nDistributed\nTracing")

    with Cluster("Security & Governance"):
        iam = IAM("IAM\nRoles & Policies")

    # External Services
    external_apis = Internet("External APIs\nCrossRef, DOI.org")

    # Optional Notifications
    sns = SimpleNotificationServiceSns("SNS\n(Optional\nNotifications)")

    # Define connections with labels

    # User to DNS to CloudFront
    users >> Edge(label="HTTPS requests") >> dns
    dns >> Edge(label="") >> cdn

    # CloudFront to Frontend and API
    cdn >> Edge(label="Static files") >> frontend_bucket
    cdn >> Edge(label="API calls\n/api/*") >> api_gateway

    # API Gateway to Lambda Functions
    api_gateway >> Edge(label="POST /parse") >> parse_lambda
    api_gateway >> Edge(label="POST /validate") >> validate_lambda
    api_gateway >> Edge(label="GET /report/{id}") >> report_lambda

    # Validate Lambda to Check Citation Lambda
    validate_lambda >> Edge(label="invoke") >> check_citation_lambda

    # Lambda to Data Layer
    parse_lambda >> Edge(label="write session\n& sources") >> dynamodb
    parse_lambda >> Edge(label="upload files\n(optional)") >> file_bucket

    validate_lambda >> Edge(label="read sources\nwrite results") >> dynamodb
    check_citation_lambda >> Edge(label="update\nvalidation") >> dynamodb

    report_lambda >> Edge(label="query results") >> dynamodb
    report_lambda >> Edge(label="store reports") >> file_bucket

    # Lambda to External APIs
    validate_lambda >> Edge(label="HTTP requests\nURL check, DOI") >> external_apis

    # Lambda Layer connections
    lambda_layer >> Edge(label="shared by", style="dashed", color="gray") >> parse_lambda
    lambda_layer >> Edge(label="", style="dashed", color="gray") >> validate_lambda
    lambda_layer >> Edge(label="", style="dashed", color="gray") >> report_lambda

    # IAM connections
    iam >> Edge(label="permissions", style="dashed", color="blue") >> parse_lambda
    iam >> Edge(label="", style="dashed", color="blue") >> validate_lambda
    iam >> Edge(label="", style="dashed", color="blue") >> check_citation_lambda
    iam >> Edge(label="", style="dashed", color="blue") >> report_lambda

    # Monitoring connections
    parse_lambda >> Edge(label="logs", style="dotted", color="orange") >> cloudwatch
    validate_lambda >> Edge(label="", style="dotted", color="orange") >> cloudwatch
    check_citation_lambda >> Edge(label="", style="dotted", color="orange") >> cloudwatch
    report_lambda >> Edge(label="", style="dotted", color="orange") >> cloudwatch
    api_gateway >> Edge(label="", style="dotted", color="orange") >> cloudwatch

    # X-Ray tracing
    api_gateway >> Edge(label="traces", style="dotted", color="purple") >> xray
    parse_lambda >> Edge(label="", style="dotted", color="purple") >> xray
    validate_lambda >> Edge(label="", style="dotted", color="purple") >> xray

    # Optional SNS for alarms
    cloudwatch >> Edge(label="alarms", style="dashed", color="red") >> sns

print("✅ AWS Architecture diagram created: specs/aws-architecture-diagram.png")
