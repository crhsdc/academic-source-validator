# Infrastructure Specification - AWS CDK

## Overview
This document details the AWS infrastructure setup using CDK (Cloud Development Kit) with TypeScript for the Source Validator application.

## Architecture Diagram

```
                                    ┌─────────────────┐
                                    │   Route 53      │
                                    │  (DNS - opt.)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   CloudFront    │
                                    │  (CDN + HTTPS)  │
                                    └────────┬────────┘
                                             │
                        ┌────────────────────┴────────────────────┐
                        │                                         │
                ┌───────▼────────┐                       ┌────────▼────────┐
                │  S3 - Frontend │                       │  API Gateway    │
                │  (Static Site) │                       │   (REST API)    │
                └────────────────┘                       └────────┬────────┘
                                                                  │
                                          ┌───────────────────────┼───────────────────────┐
                                          │                       │                       │
                                  ┌───────▼──────┐       ┌───────▼──────┐       ┌───────▼──────┐
                                  │   Lambda     │       │   Lambda     │       │   Lambda     │
                                  │   Parse      │       │  Validate    │       │   Report     │
                                  └───────┬──────┘       └───────┬──────┘       └───────┬──────┘
                                          │                       │                       │
                                          └───────────────────────┼───────────────────────┘
                                                                  │
                                          ┌───────────────────────┴───────────────────────┐
                                          │                                               │
                                  ┌───────▼──────┐                               ┌───────▼──────┐
                                  │  DynamoDB    │                               │      S3      │
                                  │  (Sessions)  │                               │  (Files)     │
                                  └──────────────┘                               └──────────────┘
```

## AWS Services Used

### 1. AWS CDK Core
- **Purpose**: Infrastructure as Code
- **Language**: TypeScript
- **Version**: 2.100.0+
- **CLI Commands**: `cdk deploy`, `cdk synth`, `cdk diff`, `cdk destroy`

### 2. Amazon S3 (2 Buckets)

#### Frontend Bucket
```typescript
Purpose: Host React static website
Configuration:
  - Website hosting enabled
  - Public read access
  - CORS enabled
  - Auto-delete on stack removal (dev only)
Naming: source-validator-frontend-{environment}
Size: ~5-10 MB (build files)
```

#### File Storage Bucket
```typescript
Purpose: Temporary document storage
Configuration:
  - Private (no public access)
  - Lifecycle rule: delete after 24 hours
  - Encryption: SSE-S3
  - Versioning: disabled
Naming: source-validator-files-{environment}
Expected usage: <1 GB/month
```

### 3. Amazon CloudFront
```typescript
Purpose: CDN for frontend, HTTPS termination
Configuration:
  - Origin: S3 Frontend Bucket
  - Viewer protocol: Redirect to HTTPS
  - Cache behavior: Cache static assets
  - Error pages: 404 → /index.html (SPA routing)
  - SSL Certificate: CloudFront default (*.cloudfront.net)
  - Custom domain: Optional via ACM certificate
Cost: Free tier 1TB transfer/month
```

### 4. Amazon API Gateway (REST API)
```typescript
Type: REST API (not HTTP API)
Configuration:
  - Stage: prod
  - CORS: Enabled for all origins (dev), specific in prod
  - Throttling: 1000 requests/second burst
  - API Keys: Optional for rate limiting
  - Binary media types: application/pdf, application/octet-stream
Endpoints:
  - POST /parse
  - POST /validate
  - GET /report/{id}
Integration: Lambda Proxy Integration
```

### 5. AWS Lambda (4 Functions)

#### Parse Function
```typescript
Runtime: Node.js 20.x
Memory: 512 MB
Timeout: 30 seconds
Handler: index.handler
Code: lambda/parse/
Environment Variables:
  - DYNAMODB_TABLE
  - S3_BUCKET
  - MAX_FILE_SIZE=5242880
Layers: SharedLayer
Permissions:
  - DynamoDB: PutItem, Query
  - S3: GetObject, PutObject (FileBucket)
Concurrency: Reserved 10, Max 100
```

#### Validate Function
```typescript
Runtime: Node.js 20.x
Memory: 512 MB
Timeout: 30 seconds
Handler: index.handler
Code: lambda/validate/
Environment Variables:
  - DYNAMODB_TABLE
  - CROSSREF_API_URL
Layers: SharedLayer
Permissions:
  - DynamoDB: Query, UpdateItem
  - Internet access: Required for external APIs
Concurrency: Reserved 10, Max 100
```

#### Check Citation Function
```typescript
Runtime: Python 3.12
Memory: 512 MB
Timeout: 30 seconds
Handler: handler.lambda_handler
Code: lambda/checkCitation/
Environment Variables:
  - DYNAMODB_TABLE
Permissions:
  - DynamoDB: Query, UpdateItem
Concurrency: Reserved 5, Max 50
```

#### Generate Report Function
```typescript
Runtime: Node.js 20.x
Memory: 1024 MB (needs more for PDF generation)
Timeout: 60 seconds
Handler: index.handler
Code: lambda/generateReport/
Environment Variables:
  - DYNAMODB_TABLE
  - S3_BUCKET
Layers: SharedLayer
Permissions:
  - DynamoDB: Query
  - S3: PutObject (reports)
  - SES: SendEmail (optional)
Concurrency: Reserved 5, Max 50
```

#### Shared Lambda Layer
```typescript
Purpose: Common dependencies and utilities
Contents:
  - node_modules: axios, uuid, aws-sdk v3 clients
  - Shared models (TypeScript interfaces)
  - Utility functions
Path: lambda/shared/
Compatible runtimes: nodejs20.x
Size: ~10-20 MB
```

### 6. Amazon DynamoDB

#### ValidationSessions Table
```typescript
Table Name: source-validator-sessions-{env}
Partition Key: sessionId (String)
Sort Key: sourceId (String)
Billing Mode: On-Demand
TTL: expiresAt (7 days)
Indexes: None (simple access pattern)
Encryption: AWS owned keys
Point-in-time recovery: Enabled (prod only)

Item Structure:
{
  sessionId: string,        // UUID
  sourceId: string,         // UUID per source
  sessionData: {
    userId?: string,
    createdAt: number,      // timestamp
    totalSources: number,
  },
  source: {
    citation: string,
    type: string,
    url?: string,
    author?: string,
    year?: number,
    title?: string,
  },
  validationResult?: {
    isValid: boolean,
    checks: {...},
    issues: string[],
    warnings: string[],
    score: number,
  },
  expiresAt: number,        // TTL timestamp
}

Estimated size: 1-5 GB/month (free tier)
```

### 7. Amazon CloudWatch

#### Log Groups
```typescript
Lambda Function Logs:
  - /aws/lambda/parse-function
  - /aws/lambda/validate-function
  - /aws/lambda/check-citation-function
  - /aws/lambda/generate-report-function
Retention: 7 days (dev), 30 days (prod)
```

#### Dashboards
```typescript
Custom Dashboard: SourceValidatorMetrics
Widgets:
  - API Gateway requests (sum)
  - API Gateway 4xx/5xx errors
  - Lambda invocations
  - Lambda duration (p50, p95, p99)
  - Lambda errors
  - DynamoDB consumed capacity
  - S3 requests
```

#### Alarms
```typescript
HighErrorRate:
  Metric: Lambda Errors
  Threshold: > 5% error rate
  Period: 5 minutes
  Action: SNS notification

ApiGatewayErrors:
  Metric: 5xx errors
  Threshold: > 10 errors
  Period: 5 minutes
  Action: SNS notification

LambdaThrottling:
  Metric: Throttles
  Threshold: > 5
  Period: 1 minute
  Action: SNS notification
```

### 8. AWS X-Ray
```typescript
Purpose: Distributed tracing
Configuration:
  - Enabled on all Lambda functions
  - Enabled on API Gateway
  - Sampling rate: 10% (to reduce cost)
  - Service map visualization
```

### 9. Amazon SES (Optional)
```typescript
Purpose: Email report delivery
Configuration:
  - Sandbox mode: Verified email addresses only
  - Production: Domain verification required
  - Region: us-east-1 (or same as stack)
Usage: Generate Report function only
```

### 10. AWS IAM

#### Lambda Execution Roles
```typescript
ParseFunctionRole:
  Policies:
    - AWSLambdaBasicExecutionRole (managed)
    - Custom: DynamoDB PutItem/Query
    - Custom: S3 GetObject/PutObject on FileBucket

ValidateFunctionRole:
  Policies:
    - AWSLambdaBasicExecutionRole
    - Custom: DynamoDB Query/UpdateItem

CheckCitationFunctionRole:
  Policies:
    - AWSLambdaBasicExecutionRole
    - Custom: DynamoDB Query/UpdateItem

GenerateReportFunctionRole:
  Policies:
    - AWSLambdaBasicExecutionRole
    - Custom: DynamoDB Query
    - Custom: S3 PutObject on FileBucket
    - Custom: SES SendEmail (if enabled)

Principle: Least privilege - each role only has permissions it needs
```

## CDK Stack Implementation

### Project Structure
```
source-validator/
├── bin/
│   └── source-validator.ts          # App entry point
├── lib/
│   ├── source-validator-stack.ts    # Main stack
│   ├── constructs/
│   │   ├── api-construct.ts         # API Gateway + Lambdas
│   │   ├── database-construct.ts    # DynamoDB tables
│   │   ├── storage-construct.ts     # S3 buckets
│   │   ├── frontend-construct.ts    # CloudFront + S3
│   │   └── monitoring-construct.ts  # CloudWatch dashboards/alarms
│   └── config/
│       ├── environment.ts           # Environment interface
│       ├── dev.ts                   # Dev config
│       └── prod.ts                  # Prod config
├── cdk.json
├── cdk.context.json
├── tsconfig.json
└── package.json
```

### Main Stack (lib/source-validator-stack.ts)
```typescript
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DatabaseConstruct } from './constructs/database-construct';
import { StorageConstruct } from './constructs/storage-construct';
import { ApiConstruct } from './constructs/api-construct';
import { FrontendConstruct } from './constructs/frontend-construct';
import { MonitoringConstruct } from './constructs/monitoring-construct';
import { EnvironmentConfig } from './config/environment';

export interface SourceValidatorStackProps extends cdk.StackProps {
  config: EnvironmentConfig;
}

export class SourceValidatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SourceValidatorStackProps) {
    super(scope, id, props);

    const { config } = props;

    // Database layer
    const database = new DatabaseConstruct(this, 'Database', {
      environment: config.environment,
      ttlDays: config.ttlDays,
    });

    // Storage layer
    const storage = new StorageConstruct(this, 'Storage', {
      environment: config.environment,
      fileRetentionDays: config.fileRetentionDays,
    });

    // API layer
    const api = new ApiConstruct(this, 'Api', {
      table: database.table,
      fileBucket: storage.fileBucket,
      environment: config.environment,
      corsOrigins: config.corsOrigins,
    });

    // Frontend layer
    const frontend = new FrontendConstruct(this, 'Frontend', {
      environment: config.environment,
      apiUrl: api.url,
    });

    // Monitoring
    new MonitoringConstruct(this, 'Monitoring', {
      api: api.restApi,
      functions: api.functions,
      table: database.table,
    });

    // Stack outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint',
      exportName: `${config.environment}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: frontend.distributionUrl,
      description: 'CloudFront distribution URL',
      exportName: `${config.environment}-FrontendUrl`,
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: database.table.tableName,
      description: 'DynamoDB table name',
    });
  }
}
```

### Environment Configuration (lib/config/environment.ts)
```typescript
export interface EnvironmentConfig {
  environment: 'dev' | 'prod';
  account: string;
  region: string;
  corsOrigins: string[];
  ttlDays: number;
  fileRetentionDays: number;
  enableAlarms: boolean;
  logRetentionDays: number;
  domainName?: string;
}

// lib/config/dev.ts
export const devConfig: EnvironmentConfig = {
  environment: 'dev',
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: 'us-east-1',
  corsOrigins: ['*'],
  ttlDays: 1,
  fileRetentionDays: 1,
  enableAlarms: false,
  logRetentionDays: 7,
};

// lib/config/prod.ts
export const prodConfig: EnvironmentConfig = {
  environment: 'prod',
  account: process.env.CDK_DEFAULT_ACCOUNT!,
  region: 'us-east-1',
  corsOrigins: ['https://yourdomain.com'],
  ttlDays: 7,
  fileRetentionDays: 7,
  enableAlarms: true,
  logRetentionDays: 30,
  domainName: 'validator.yourdomain.com',
};
```

### API Construct (lib/constructs/api-construct.ts)
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface ApiConstructProps {
  table: dynamodb.Table;
  fileBucket: s3.Bucket;
  environment: string;
  corsOrigins: string[];
}

export class ApiConstruct extends Construct {
  public readonly restApi: apigateway.RestApi;
  public readonly url: string;
  public readonly functions: lambda.Function[];

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    // Shared Lambda Layer
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities and models',
    });

    // Common environment variables
    const commonEnv = {
      DYNAMODB_TABLE: props.table.tableName,
      ENVIRONMENT: props.environment,
    };

    // Lambda Functions
    const parseFunction = new lambda.Function(this, 'ParseFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/parse'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        S3_BUCKET: props.fileBucket.bucketName,
        MAX_FILE_SIZE: '5242880',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const validateFunction = new lambda.Function(this, 'ValidateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/validate'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        CROSSREF_API_URL: 'https://api.crossref.org/works/',
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const checkCitationFunction = new lambda.Function(this, 'CheckCitationFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/checkCitation'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      tracing: lambda.Tracing.ACTIVE,
    });

    const generateReportFunction = new lambda.Function(this, 'GenerateReportFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/generateReport'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        S3_BUCKET: props.fileBucket.bucketName,
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    // Grant permissions
    props.table.grantReadWriteData(parseFunction);
    props.table.grantReadWriteData(validateFunction);
    props.table.grantReadWriteData(checkCitationFunction);
    props.table.grantReadData(generateReportFunction);

    props.fileBucket.grantReadWrite(parseFunction);
    props.fileBucket.grantWrite(generateReportFunction);

    // API Gateway
    this.restApi = new apigateway.RestApi(this, 'Api', {
      restApiName: `SourceValidator-${props.environment}`,
      description: 'Source Validator API',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        throttlingBurstLimit: 1000,
        throttlingRateLimit: 500,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.corsOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date'],
      },
    });

    // API Resources
    const parseResource = this.restApi.root.addResource('parse');
    parseResource.addMethod('POST', new apigateway.LambdaIntegration(parseFunction));

    const validateResource = this.restApi.root.addResource('validate');
    validateResource.addMethod('POST', new apigateway.LambdaIntegration(validateFunction));

    const reportResource = this.restApi.root.addResource('report');
    const reportIdResource = reportResource.addResource('{id}');
    reportIdResource.addMethod('GET', new apigateway.LambdaIntegration(generateReportFunction));

    this.url = this.restApi.url;
    this.functions = [parseFunction, validateFunction, checkCitationFunction, generateReportFunction];
  }
}
```

## Deployment

### Prerequisites
```bash
# Install CDK CLI
npm install -g aws-cdk

# Configure AWS credentials
aws configure

# Verify credentials
aws sts get-caller-identity
```

### Bootstrap CDK
```bash
# Bootstrap CDK (first time only, per account/region)
cdk bootstrap aws://ACCOUNT-ID/us-east-1

# Or with profile
cdk bootstrap aws://ACCOUNT-ID/us-east-1 --profile your-profile
```

### Deploy Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Synthesize CloudFormation template
cdk synth

# View differences
cdk diff

# Deploy to dev
npm run cdk:deploy:dev

# Deploy to prod
npm run cdk:deploy:prod

# Deploy all stacks
cdk deploy --all

# Destroy stack
cdk destroy SourceValidatorStack-Dev
```

### Deployment Order
1. Database construct (DynamoDB)
2. Storage construct (S3 buckets)
3. API construct (Lambda + API Gateway)
4. Frontend construct (S3 + CloudFront)
5. Monitoring construct (CloudWatch)

CDK handles dependencies automatically.

## Cost Estimation

### Monthly Cost (Free Tier)
```
Lambda: 1M requests/month           = $0.00
API Gateway: 1M requests/month      = $0.00 (year 1) / $3.50 (after)
DynamoDB: 25 GB + 25 WCU/RCU        = $0.00
S3: 5 GB storage + 20K GET          = $0.12
CloudFront: 1 TB transfer           = $0.00
CloudWatch: 10 metrics + logs       = $0.50
----------------------------------------------
Total: $0.62/month (first year)
       $4.12/month (after free tier)
```

### At Scale (10K validations/month)
```
Lambda: 50K invocations @ 3s avg    = $0.20
API Gateway: 50K requests           = $0.18
DynamoDB: 50K writes, 50K reads     = $0.65
S3: 10 GB storage + 100K requests   = $0.50
CloudFront: 100 GB transfer         = $0.85
CloudWatch: Logs + metrics          = $2.00
----------------------------------------------
Total: $4.38/month
```

## Security

### IAM Best Practices
- Use CDK grant methods instead of manual policies
- Enable MFA for console access
- Use IAM roles, not access keys
- Rotate credentials regularly
- Enable CloudTrail for audit logs

### Resource Security
- S3: Block public access (except frontend bucket)
- DynamoDB: Encryption at rest enabled
- Lambda: VPC not required (stateless)
- API Gateway: Use API keys for rate limiting
- CloudFront: HTTPS only

### Monitoring
- Enable X-Ray tracing
- Set up CloudWatch alarms
- Monitor cost with AWS Budgets
- Review CloudTrail logs

## Testing Infrastructure

### CDK Tests
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

### Integration Tests
```bash
# Deploy to test environment
cdk deploy SourceValidatorStack-Test

# Run integration tests
npm run test:integration

# Cleanup
cdk destroy SourceValidatorStack-Test
```

## Troubleshooting

### Common Issues

**CDK Bootstrap Error**
```bash
# Solution: Bootstrap the account/region
cdk bootstrap aws://ACCOUNT-ID/REGION
```

**Lambda Permission Denied**
```bash
# Solution: Check IAM role has correct permissions
# Add grants in CDK: table.grantReadWriteData(function)
```

**API Gateway CORS Error**
```bash
# Solution: Check CORS configuration in API construct
# Ensure OPTIONS method is enabled
```

**CloudFormation Stack Update Failed**
```bash
# Solution: Check CloudFormation console for detailed error
# May need to manually fix or rollback
aws cloudformation describe-stack-events --stack-name SourceValidatorStack-Dev
```

## Next Steps
1. Review BACKEND_SPEC.md for Lambda function implementation
2. Review FRONTEND_SPEC.md for React application details
3. Set up CI/CD pipeline (see PROJECT_SPEC.md)
4. Configure custom domain (optional)
5. Set up monitoring and alerts
