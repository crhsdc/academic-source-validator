# Source Accuracy Verification Tool - Project Specification

## Project Overview
A serverless web application that helps students verify the accuracy and validity of sources cited in academic papers and research works.

## Problem Statement
Students often struggle to verify if their sources are:
- Accessible and valid (URLs not broken)
- Properly formatted according to citation standards
- From credible domains
- Recently updated (for time-sensitive research)

## Target Users
- Undergraduate and graduate students
- Academic researchers
- Teaching assistants reviewing papers

## Core Features

### 1. Source Input
- Upload sources via:
  - Manual text input (paste bibliography)
  - File upload (support .txt, .docx, .pdf)
  - Browser extension for capturing sources while researching

### 2. Source Validation
- **URL Verification**: Check if web sources are accessible (HTTP status)
- **Domain Credibility**: Flag sources from questionable domains
- **Citation Format**: Validate against common formats (APA, MLA, Chicago)
- **Duplicate Detection**: Identify duplicate sources
- **Date Freshness**: Flag sources older than user-specified threshold

### 3. Results Dashboard
- Visual report showing:
  - Valid vs invalid sources
  - Broken links
  - Formatting issues
  - Credibility warnings
- Export results as PDF/CSV

## Technical Architecture (AWS Stack)

### AWS Serverless Architecture
```
Frontend Layer:
├─ S3: Static website hosting (React/Vue.js build)
├─ CloudFront: CDN for global content delivery
└─ Route 53: DNS management (optional)

API Layer:
├─ API Gateway (REST API)
│  ├─ /parse endpoint
│  ├─ /validate endpoint
│  └─ /report/{id} endpoint
└─ Lambda Authorizer (optional, for auth)

Compute Layer:
├─ Lambda Function: ParseDocumentFunction
│  └─ Runtime: Node.js 20.x or Python 3.12
├─ Lambda Function: ValidateSourcesFunction
│  └─ Runtime: Node.js 20.x (for HTTP requests)
├─ Lambda Function: CheckCitationFunction
│  └─ Runtime: Python 3.12 (better text parsing)
└─ Lambda Function: GenerateReportFunction
   └─ Runtime: Node.js 20.x

Data Layer:
├─ DynamoDB: Main database
│  ├─ Table: ValidationSessions
│  ├─ Table: ValidationResults
│  └─ On-demand pricing (cost-effective)
└─ S3: File storage bucket
   ├─ Uploaded documents (temp storage)
   └─ Generated reports (PDF/CSV)

External Integrations:
├─ CrossRef API: DOI validation
├─ SES: Email delivery for reports
└─ CloudWatch: Logging and monitoring
```

### AWS Services Breakdown

**Amazon S3**
- Host static frontend (React build)
- Store uploaded documents temporarily
- Store generated report files
- Enable CORS for API access
- Lifecycle policy: delete temp files after 24 hours

**Amazon CloudFront**
- CDN for fast content delivery
- HTTPS/SSL certificate via ACM
- Cache static assets
- Custom domain support

**AWS Lambda**
- 4 serverless functions (see Compute Layer above)
- Memory: 512MB-1024MB per function
- Timeout: 30 seconds (API Gateway limit)
- Environment variables for configuration
- VPC not required (public APIs only)

**Amazon API Gateway**
- REST API (not HTTP API for this project)
- CORS enabled
- Request/response validation
- API keys for rate limiting
- Stage: dev, prod

**Amazon DynamoDB**
- On-demand billing mode
- Tables with partition key design:
  - ValidationSessions: sessionId (PK)
  - ValidationResults: sessionId (PK), sourceId (SK)
- TTL enabled for auto-cleanup (7 days)

**Amazon SES (Simple Email Service)**
- Send report emails to users
- Sandbox mode for development
- Production access for real emails

**AWS IAM**
- Separate roles for each Lambda function
- Principle of least privilege
- S3 bucket policies for secure access

## Technology Stack Details

### Frontend
- **Framework**: React 18+ with Hooks
- **State Management**: React Context API (Redux overkill for this)
- **HTTP Client**: Axios or AWS Amplify
- **UI Components**: Material-UI or Tailwind CSS
- **Charts**: Chart.js or Recharts
- **File Upload**: react-dropzone

### Backend (Node.js Lambdas)
- **Runtime**: Node.js 20.x
- **HTTP Client**: axios or node-fetch
- **Citation Parsing**: citation.js or custom regex
- **PDF Generation**: jsPDF or pdfkit
- **CSV Export**: json2csv
- **Testing**: Jest, aws-sdk-mock

### Backend (Python Lambda for Citation)
- **Runtime**: Python 3.12
- **Libraries**:
  - `requests` - HTTP requests
  - `boto3` - AWS SDK
  - `re` - Regex for parsing
  - `pytest` - Testing

### AWS SDK
- **Frontend**: AWS Amplify (for S3 uploads if needed)
- **Backend**: AWS SDK v3 for JavaScript (modular)
  - @aws-sdk/client-s3
  - @aws-sdk/client-dynamodb
  - @aws-sdk/lib-dynamodb
  - @aws-sdk/client-ses

### Development Tools
- **IaC**: AWS CDK CLI
- **Local Testing**: Jest (unit tests), SAM CLI with CDK synth (integration)
- **Bundling**: esbuild (via CDK NodejsFunction)
- **Debugging**: AWS X-Ray
- **Logging**: CloudWatch Logs
- **CI/CD**: GitHub Actions + CDK Deploy

### Package.json Scripts (Root)
```json
{
  "name": "source-validator",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "test": "jest",
    "test:watch": "jest --watch",
    "cdk": "cdk",
    "cdk:synth": "cdk synth",
    "cdk:diff": "cdk diff",
    "cdk:deploy": "cdk deploy --all",
    "cdk:deploy:dev": "ENVIRONMENT=dev cdk deploy SourceValidatorStack-Dev",
    "cdk:deploy:prod": "ENVIRONMENT=prod cdk deploy SourceValidatorStack-Prod",
    "cdk:destroy": "cdk destroy",
    "bootstrap": "cdk bootstrap",
    "lint": "eslint . --ext .ts",
    "format": "prettier --write \"**/*.ts\"",
    "test:lambda": "cd lambda/parse && npm test && cd ../validate && npm test",
    "install:lambda": "cd lambda/parse && npm ci && cd ../validate && npm ci && cd ../generateReport && npm ci",
    "build:frontend": "cd frontend && npm run build"
  },
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/node": "^20.0.0",
    "aws-cdk": "^2.100.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "typescript": "~5.3.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "dependencies": {
    "aws-cdk-lib": "^2.100.0",
    "constructs": "^10.0.0",
    "source-map-support": "^0.5.21"
  }
}
```

## MVP Features (Phase 1)
1. Manual text input for bibliography
2. URL accessibility check
3. Basic citation format validation (APA/MLA)
4. Simple results page with pass/fail status
5. Export results as JSON/CSV

## Future Enhancements (Phase 2+)
- Browser extension for live source capture
- Integration with reference managers (Zotero, Mendeley)
- AI-powered source credibility scoring
- Plagiarism detection integration
- Collaborative team features
- Citation recommendation engine

## Data Flow

```
User Input → Upload/Parse → Extract Sources → Validate Each Source → Generate Report → Display/Export
```

### Validation Pipeline
```javascript
For each source:
1. Extract URL (if present)
2. Check URL accessibility (HEAD request)
3. Parse citation format
4. Validate against citation rules
5. Check domain against credibility list
6. Flag issues and assign confidence score
```

## API Endpoints

### POST /api/parse
- Input: { file: Buffer, format: string } or { text: string }
- Output: { sources: Array<Source> }

### POST /api/validate
- Input: { sources: Array<Source> }
- Output: { results: Array<ValidationResult> }

### GET /api/report/:id
- Output: { report: Report, sources: Array, summary: Object }

## Data Models

### Source
```javascript
{
  id: string,
  type: "book" | "journal" | "website" | "other",
  citation: string,
  url?: string,
  author?: string,
  year?: number,
  title?: string
}
```

### ValidationResult
```javascript
{
  sourceId: string,
  isValid: boolean,
  checks: {
    urlAccessible: boolean | null,
    formatCorrect: boolean,
    credibleDomain: boolean | null,
    isRecent: boolean | null
  },
  issues: Array<string>,
  warnings: Array<string>,
  score: number (0-100)
}
```

## AWS Infrastructure as Code with CDK

### CDK Stack Structure (lib/source-validator-stack.ts)
```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class SourceValidatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========== DynamoDB Table ==========
    const validationTable = new dynamodb.Table(this, 'ValidationTable', {
      partitionKey: { name: 'sessionId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sourceId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev only
    });

    // ========== S3 Bucket for File Storage ==========
    const fileBucket = new s3.Bucket(this, 'FileBucket', {
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // ========== Lambda Layer (Shared Dependencies) ==========
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('lambda/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities and models',
    });

    // ========== Lambda Functions ==========
    const parseFunction = new lambda.Function(this, 'ParseFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/parse'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DYNAMODB_TABLE: validationTable.tableName,
        S3_BUCKET: fileBucket.bucketName,
      },
      layers: [sharedLayer],
    });

    const validateFunction = new lambda.Function(this, 'ValidateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/validate'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DYNAMODB_TABLE: validationTable.tableName,
      },
      layers: [sharedLayer],
    });

    const checkCitationFunction = new lambda.Function(this, 'CheckCitationFunction', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('lambda/checkCitation'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DYNAMODB_TABLE: validationTable.tableName,
      },
    });

    const generateReportFunction = new lambda.Function(this, 'GenerateReportFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/generateReport'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        DYNAMODB_TABLE: validationTable.tableName,
        S3_BUCKET: fileBucket.bucketName,
      },
      layers: [sharedLayer],
    });

    // ========== Grant Permissions ==========
    validationTable.grantReadWriteData(parseFunction);
    validationTable.grantReadWriteData(validateFunction);
    validationTable.grantReadWriteData(checkCitationFunction);
    validationTable.grantReadData(generateReportFunction);

    fileBucket.grantReadWrite(parseFunction);
    fileBucket.grantWrite(generateReportFunction);

    // ========== API Gateway ==========
    const api = new apigateway.RestApi(this, 'SourceValidatorAPI', {
      restApiName: 'Source Validator API',
      description: 'API for source validation service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API Resources
    const parseResource = api.root.addResource('parse');
    parseResource.addMethod('POST', new apigateway.LambdaIntegration(parseFunction));

    const validateResource = api.root.addResource('validate');
    validateResource.addMethod('POST', new apigateway.LambdaIntegration(validateFunction));

    const reportResource = api.root.addResource('report');
    const reportIdResource = reportResource.addResource('{id}');
    reportIdResource.addMethod('GET', new apigateway.LambdaIntegration(generateReportFunction));

    // ========== Frontend Hosting ==========
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: {
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Deploy frontend build to S3
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('./frontend/build')],
      destinationBucket: frontendBucket,
    });

    // CloudFront Distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // ========== Outputs ==========
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'SourceValidatorApiUrl',
    });

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront distribution URL',
      exportName: 'SourceValidatorFrontendUrl',
    });

    new cdk.CfnOutput(this, 'DynamoDBTableName', {
      value: validationTable.tableName,
      description: 'DynamoDB table name',
    });
  }
}
```

### Custom CDK Constructs (Advanced)

Create reusable constructs for common patterns:

```typescript
// lib/constructs/validation-lambda.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface ValidationLambdaProps {
  table: dynamodb.Table;
  layer?: lambda.LayerVersion;
  timeout?: cdk.Duration;
}

export class ValidationLambda extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: ValidationLambdaProps) {
    super(scope, id);

    this.function = new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(`lambda/${id.toLowerCase()}`),
      timeout: props.timeout || cdk.Duration.seconds(30),
      memorySize: 512,
      environment: {
        DYNAMODB_TABLE: props.table.tableName,
        NODE_ENV: 'production',
      },
      layers: props.layer ? [props.layer] : [],
    });

    // Grant permissions
    props.table.grantReadWriteData(this.function);
  }
}

// Usage in stack:
const parseFunction = new ValidationLambda(this, 'Parse', {
  table: validationTable,
  layer: sharedLayer,
});

const validateFunction = new ValidationLambda(this, 'Validate', {
  table: validationTable,
  layer: sharedLayer,
});
```

### Lambda Function Permissions (CDK)

CDK makes permissions management simple with grant methods:

```typescript
// ParseDocumentFunction permissions
validationTable.grantReadWriteData(parseFunction);  // DynamoDB access
fileBucket.grantReadWrite(parseFunction);           // S3 access

// ValidateSourcesFunction permissions
validationTable.grantReadWriteData(validateFunction);
// No additional permissions needed for external HTTP calls

// CheckCitationFunction permissions
validationTable.grantReadWriteData(checkCitationFunction);

// GenerateReportFunction permissions
validationTable.grantReadData(generateReportFunction);
fileBucket.grantWrite(generateReportFunction);

// Optional: Add SES permissions
import * as iam from 'aws-cdk-lib/aws-iam';
generateReportFunction.addToRolePolicy(new iam.PolicyStatement({
  actions: ['ses:SendEmail', 'ses:SendRawEmail'],
  resources: ['*'],
}));
```

### Environment Variables (CDK)
Environment variables are set directly in the CDK stack:

```typescript
const parseFunction = new lambda.Function(this, 'ParseFunction', {
  // ... other props
  environment: {
    DYNAMODB_TABLE: validationTable.tableName,
    S3_BUCKET: fileBucket.bucketName,
    CORS_ORIGIN: 'https://yourdomain.com',
    CROSSREF_API_URL: 'https://api.crossref.org/works/',
    MAX_FILE_SIZE: '5242880',
    NODE_ENV: 'production',
  },
});
```

### CDK Configuration (cdk.json)

```json
{
  "app": "npx ts-node --prefer-ts-exts bin/source-validator.ts",
  "watch": {
    "include": [
      "**"
    ],
    "exclude": [
      "README.md",
      "cdk*.json",
      "**/*.d.ts",
      "**/*.js",
      "tsconfig.json",
      "package*.json",
      "yarn.lock",
      "node_modules",
      "test"
    ]
  },
  "context": {
    "@aws-cdk/aws-lambda:recognizeLayerVersion": true,
    "@aws-cdk/core:checkSecretUsage": true,
    "@aws-cdk/core:target-partitions": [
      "aws",
      "aws-cn"
    ],
    "@aws-cdk-containers/ecs-service-extensions:enableDefaultLogDriver": true,
    "@aws-cdk/aws-ec2:uniqueImdsv2TemplateName": true,
    "@aws-cdk/aws-ecs:arnFormatIncludesClusterName": true,
    "@aws-cdk/aws-iam:minimizePolicies": true,
    "@aws-cdk/core:validateSnapshotRemovalPolicy": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeyAliasStackSafeResourceName": true,
    "@aws-cdk/aws-s3:createDefaultLoggingPolicy": true,
    "@aws-cdk/aws-sns-subscriptions:restrictSqsDescryption": true,
    "@aws-cdk/aws-apigateway:disableCloudWatchRole": false,
    "@aws-cdk/core:enablePartitionLiterals": true,
    "@aws-cdk/aws-events:eventsTargetQueueSameAccount": true,
    "@aws-cdk/aws-iam:standardizedServicePrincipals": true,
    "@aws-cdk/aws-ecs:disableExplicitDeploymentControllerForCircuitBreaker": true,
    "@aws-cdk/aws-iam:importedRoleStackSafeDefaultPolicyName": true,
    "@aws-cdk/aws-s3:serverAccessLogsUseBucketPolicy": true,
    "@aws-cdk/aws-route53-patters:useCertificate": true,
    "@aws-cdk/customresources:installLatestAwsSdkDefault": false,
    "@aws-cdk/aws-rds:databaseProxyUniqueResourceName": true,
    "@aws-cdk/aws-codedeploy:removeAlarmsFromDeploymentGroup": true,
    "@aws-cdk/aws-apigateway:authorizerChangeDeploymentLogicalId": true,
    "@aws-cdk/aws-ec2:launchTemplateDefaultUserData": true,
    "@aws-cdk/aws-secretsmanager:useAttachedSecretResourcePolicyForSecretTargetAttachments": true,
    "@aws-cdk/aws-redshift:columnId": true,
    "@aws-cdk/aws-stepfunctions-tasks:enableEmrServicePolicyV2": true,
    "@aws-cdk/aws-ec2:restrictDefaultSecurityGroup": true,
    "@aws-cdk/aws-apigateway:requestValidatorUniqueId": true,
    "@aws-cdk/aws-kms:aliasNameRef": true,
    "@aws-cdk/aws-autoscaling:generateLaunchTemplateInsteadOfLaunchConfig": true,
    "@aws-cdk/core:includePrefixInUniqueNameGeneration": true,
    "@aws-cdk/aws-efs:denyAnonymousAccess": true,
    "@aws-cdk/aws-opensearchservice:enableOpensearchMultiAzWithStandby": true,
    "@aws-cdk/aws-lambda-nodejs:useLatestRuntimeVersion": true,
    "@aws-cdk/aws-efs:mountTargetOrderInsensitiveLogicalId": true,
    "@aws-cdk/aws-rds:auroraClusterChangeScopeOfInstanceParameterGroupWithEachParameters": true,
    "@aws-cdk/aws-appsync:useArnForSourceApiAssociationIdentifier": true,
    "@aws-cdk/aws-rds:preventRenderingDeprecatedCredentials": true,
    "@aws-cdk/aws-codepipeline-actions:useNewDefaultBranchForCodeCommitSource": true,
    "@aws-cdk/aws-cloudwatch-actions:changeLambdaPermissionLogicalIdForLambdaAction": true,
    "@aws-cdk/aws-codepipeline:crossAccountKeysDefaultValueToFalse": true,
    "@aws-cdk/aws-codepipeline:defaultPipelineTypeToV2": true,
    "@aws-cdk/aws-kms:reduceCrossAccountRegionPolicyScope": true,
    "@aws-cdk/aws-eks:nodegroupNameAttribute": true,
    "@aws-cdk/aws-ec2:ebsDefaultGp3Volume": true,
    "@aws-cdk/aws-ecs:removeDefaultDeploymentAlarm": true,
    "@aws-cdk/custom-resources:logApiResponseDataPropertyTrueDefault": false,
    "@aws-cdk/aws-s3:keepNotificationInImportedBucket": false
  }
}
```

### CDK Best Practices
- **Use constructs**: Create reusable constructs for common patterns (see Custom CDK Constructs above)
- **Type safety**: Leverage TypeScript for compile-time checks and IDE autocomplete
- **Testing**: Write tests for your infrastructure code using CDK assertions
- **Aspects**: Use CDK Aspects for cross-cutting concerns (tagging, security hardening)
- **Context values**: Use `cdk.json` for feature flags and environment-specific configuration
- **Removal policies**: Set appropriate removal policies (DESTROY for dev, RETAIN for prod)
- **Outputs**: Export important values using `CfnOutput` for frontend configuration
- **Bundling**: Use `NodejsFunction` for automatic TypeScript bundling
- **Layers**: Share common dependencies across Lambda functions with layers
- **Environment**: Use different stacks for dev/staging/prod environments

## Security Considerations

### AWS Security Best Practices
- **IAM Roles**: Use least privilege principle for Lambda execution roles
- **API Gateway**:
  - Enable API keys and usage plans for rate limiting
  - Set up request throttling (1000 requests/second)
  - Use AWS WAF for DDoS protection (optional)
- **S3 Buckets**:
  - Block public access except for frontend bucket
  - Enable versioning for important data
  - Use bucket policies, not ACLs
  - Enable server-side encryption (SSE-S3)
- **Lambda**:
  - Set environment variables, not hardcoded secrets
  - Use AWS Secrets Manager for sensitive data
  - Enable X-Ray tracing for monitoring
  - Set memory/timeout limits to prevent abuse
- **DynamoDB**:
  - Enable point-in-time recovery
  - Use DynamoDB Streams for audit logs
  - Enable encryption at rest

### Application Security
- **Input Validation**:
  - File size limits: 5MB max
  - Allowed file types: .txt, .docx, .pdf only
  - Sanitize all user input to prevent XSS/injection
- **Rate Limiting**:
  - API Gateway: 1000 requests/second burst
  - Per-user limits: 100 validations/day (via API keys)
- **Data Privacy**:
  - Don't log sensitive content
  - Auto-delete uploaded files after 24 hours (S3 lifecycle)
  - DynamoDB TTL: delete sessions after 7 days
  - No PII storage
- **HTTPS Only**:
  - CloudFront enforces HTTPS
  - API Gateway with ACM certificate
- **CORS**:
  - Restrict origins in production (not '*')
  - Limit allowed methods to POST, GET only

### Monitoring & Alerts
- **CloudWatch Alarms**:
  - Lambda error rate > 5%
  - API Gateway 4xx/5xx errors
  - DynamoDB throttling events
- **AWS CloudTrail**: Enable for audit logging
- **VPC**: Not required (all public APIs), but can add for extra security

## Cost Estimation (AWS)

### Free Tier (First 12 months)
- **Lambda**: 1M requests/month + 400,000 GB-seconds compute
- **API Gateway**: 1M requests/month (12 months only)
- **DynamoDB**: 25GB storage + 25 read/write capacity units
- **S3**: 5GB storage + 20,000 GET + 2,000 PUT requests
- **CloudFront**: 1TB data transfer out + 10M requests
- **SES**: 62,000 emails/month (if using EC2/Lambda)

### Estimated Monthly Costs (Student Project)
Assuming 1,000 validations/month with 10 sources each:

| Service | Usage | Cost |
|---------|-------|------|
| Lambda (4 functions) | 10,000 invocations @ 512MB, 3s avg | $0.00 (free tier) |
| API Gateway | 10,000 requests | $0.00 (free tier year 1) / $0.04 (after) |
| DynamoDB | 10,000 writes, 10,000 reads | $0.00 (free tier) |
| S3 Storage | <1GB files | $0.02 |
| S3 Requests | 10,000 PUTs, 10,000 GETs | $0.05 |
| CloudFront | 10GB transfer | $0.00 (free tier) |
| SES | 100 emails | $0.00 (free tier) |
| **Total** | | **$0-2/month** |

### After Free Tier (Months 13+)
- Expected: **$5-10/month** for moderate usage
- At scale (10K validations/month): **$15-25/month**

### Cost Optimization Tips
- Use DynamoDB on-demand pricing
- Enable S3 lifecycle policies (delete temp files)
- Set Lambda memory to minimum required
- Enable CloudWatch Logs retention (7 days)
- Use Lambda layers for shared dependencies

## Development Timeline

### Week 1: AWS Setup & Infrastructure with CDK
- Create AWS account and configure CLI
- Install CDK CLI globally (`npm install -g aws-cdk`)
- Bootstrap CDK in AWS account (`cdk bootstrap`)
- Initialize CDK project with TypeScript
- Create `lib/source-validator-stack.ts` with basic resources:
  - DynamoDB table
  - S3 buckets
  - Simple Lambda function
  - API Gateway
- Deploy initial stack (`cdk deploy`)
- Create React frontend skeleton with TypeScript
- Write CDK stack tests with Jest
- Configure CORS and test deployment

### Week 2: Document Parsing & Source Extraction
- Implement `ParseDocumentFunction`
  - Handle text input from POST request
  - Support file upload to S3
  - Extract sources using regex patterns
  - Parse citations into structured data
- Add text parsing libraries (citation.js or custom)
- Store parsed sources in DynamoDB
- Create frontend upload form
- Test with sample bibliographies

### Week 3: Validation Logic
- Implement `ValidateSourcesFunction`
  - HTTP HEAD requests for URL checking
  - Domain credibility checking (whitelist/blacklist)
  - Citation format validation (APA/MLA)
  - Duplicate detection
- Implement `CheckCitationFunction` (Python)
  - Regex patterns for citation formats
  - Field extraction (author, year, title)
- Configure Lambda timeout and retries
- Add CloudWatch logging
- Test with various source types

### Week 4: Results Dashboard & Reports
- Implement `GenerateReportFunction`
  - Query DynamoDB for session results
  - Generate summary statistics
  - Create CSV export
  - Optional: PDF generation with jsPDF
- Build frontend results page
  - Visual dashboard with charts
  - Source-by-source breakdown
  - Download buttons (JSON/CSV)
- Integrate with API Gateway endpoints
- Add loading states and error handling

### Week 5: Testing, Polish & Deployment
- Write unit tests for Lambda functions
- Integration tests with SAM local
- Frontend E2E tests (Cypress/Playwright)
- Performance optimization
  - Lambda memory tuning
  - DynamoDB query optimization
- Security hardening
  - Input validation
  - Rate limiting with API keys
- Documentation (README, API docs)
- Production deployment
- Domain setup with Route 53 (optional)
- CloudFront distribution for frontend

## CI/CD Pipeline with CDK

### GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS with CDK

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      # Test CDK stack
      - name: Install dependencies
        run: npm ci

      - name: Run CDK tests
        run: npm test

      # Test Lambda functions
      - name: Test Lambda functions
        run: |
          cd lambda/parse && npm ci && npm test
          cd ../validate && npm ci && npm test
          cd ../generateReport && npm ci && npm test

      # Test frontend
      - name: Test frontend
        run: cd frontend && npm ci && npm test

  synth:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Synthesize CDK
        run: npx cdk synth

      - name: Upload CloudFormation template
        uses: actions/upload-artifact@v3
        with:
          name: cdk-template
          path: cdk.out/

  deploy:
    needs: synth
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Install dependencies
        run: npm ci

      - name: Build frontend
        run: cd frontend && npm ci && npm run build

      - name: CDK Deploy
        run: |
          npx cdk deploy --all --require-approval never
        env:
          ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'prod' || 'dev' }}

      - name: Output deployment info
        run: |
          echo "API URL: $(aws cloudformation describe-stacks --stack-name SourceValidatorStack --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' --output text)"
          echo "Frontend URL: $(aws cloudformation describe-stacks --stack-name SourceValidatorStack --query 'Stacks[0].Outputs[?OutputKey==`FrontendURL`].OutputValue' --output text)"
```

### Multi-Environment CDK Setup

**bin/source-validator.ts** (Entry point with environments):
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SourceValidatorStack } from '../lib/source-validator-stack';

const app = new cdk.App();

const env = process.env.ENVIRONMENT || 'dev';

// Dev stack
new SourceValidatorStack(app, 'SourceValidatorStack-Dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1',
  },
  stackName: 'SourceValidator-Dev',
  tags: {
    Environment: 'dev',
    Project: 'SourceValidator',
  },
});

// Prod stack (manual approval required)
if (env === 'prod') {
  new SourceValidatorStack(app, 'SourceValidatorStack-Prod', {
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: 'us-east-1',
    },
    stackName: 'SourceValidator-Prod',
    tags: {
      Environment: 'prod',
      Project: 'SourceValidator',
    },
  });
}
```

### Deployment Commands

```bash
# Deploy to dev
ENVIRONMENT=dev cdk deploy SourceValidatorStack-Dev

# Deploy to prod
ENVIRONMENT=prod cdk deploy SourceValidatorStack-Prod

# View differences before deploy
cdk diff

# Destroy stack
cdk destroy SourceValidatorStack-Dev
```

### Rollback Strategy
- **CDK**: CloudFormation automatic rollback on failure
- **Manual rollback**: Redeploy previous git commit
- **Emergency**: Use CloudFormation console to rollback stack
```bash
# Rollback via CloudFormation CLI
aws cloudformation continue-update-rollback --stack-name SourceValidatorStack-Prod
```

## Testing Strategy

### Infrastructure Tests (CDK)
```typescript
// test/source-validator.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { SourceValidatorStack } from '../lib/source-validator-stack';

test('DynamoDB Table Created', () => {
  const app = new cdk.App();
  const stack = new SourceValidatorStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::DynamoDB::Table', 1);
  template.hasResourceProperties('AWS::DynamoDB::Table', {
    BillingMode: 'PAY_PER_REQUEST',
  });
});

test('Lambda Functions Created', () => {
  const app = new cdk.App();
  const stack = new SourceValidatorStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::Lambda::Function', 4);
});

test('API Gateway Has CORS', () => {
  const app = new cdk.App();
  const stack = new SourceValidatorStack(app, 'TestStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::ApiGateway::RestApi', {
    Name: 'Source Validator API',
  });
});
```

### Lambda Unit Tests
```typescript
// test/lambda/parse.test.ts
import { handler } from '../../lambda/parse/index';

describe('Parse Function', () => {
  test('parses APA citation correctly', async () => {
    const event = {
      body: JSON.stringify({
        text: 'Smith, J. (2020). Sample article. Journal Name, 10(2), 123-145.',
      }),
    };

    const result = await handler(event);
    const body = JSON.parse(result.body);

    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].author).toBe('Smith, J.');
    expect(body.sources[0].year).toBe(2020);
  });
});
```

### Integration Tests
- Use AWS SDK to test deployed Lambda functions
- Test API endpoints with real HTTP requests
- Verify DynamoDB records are created correctly
- Test S3 file uploads and downloads

### E2E Tests (Frontend)
```typescript
// Cypress or Playwright
describe('Source Validation Flow', () => {
  it('validates a bibliography successfully', () => {
    cy.visit('/');
    cy.get('[data-testid="upload-input"]').type('Sample citation...');
    cy.get('[data-testid="validate-button"]').click();
    cy.get('[data-testid="results"]').should('contain', 'Validation Complete');
  });
});
```

### Test Commands
```bash
# Test CDK stack
npm test

# Test Lambda functions
cd lambda/parse && npm test

# Test frontend
cd frontend && npm test

# Integration tests (requires deployed stack)
npm run test:integration

# Run all tests
npm run test:all
```

## Monitoring & Observability

### CloudWatch Dashboards
Create custom dashboard tracking:
- **API Metrics**:
  - Request count per endpoint
  - Average latency
  - Error rates (4xx, 5xx)
- **Lambda Metrics**:
  - Invocation count
  - Duration (p50, p95, p99)
  - Error count and types
  - Concurrent executions
- **DynamoDB Metrics**:
  - Read/Write capacity consumption
  - Throttled requests
  - Query latency
- **S3 Metrics**:
  - Upload success rate
  - Storage usage

### CloudWatch Alarms
Set up alarms for:
```yaml
Alarms:
  HighErrorRate:
    Threshold: 5% error rate
    Action: SNS email notification

  LambdaThrottling:
    Threshold: > 10 throttles/minute
    Action: SNS notification

  HighLatency:
    Threshold: p95 > 5 seconds
    Action: SNS notification

  DynamoDBThrottling:
    Threshold: > 5 throttled requests
    Action: Auto-scale or alert
```

### AWS X-Ray Integration
Enable distributed tracing:
- Track full request lifecycle (API Gateway → Lambda → DynamoDB)
- Identify bottlenecks and slow external API calls
- Visualize service map
- Enable in SAM template:
```yaml
Globals:
  Function:
    Tracing: Active
```

### Logging Best Practices
```javascript
// Structured logging in Lambda
console.log(JSON.stringify({
  level: 'INFO',
  sessionId: event.sessionId,
  action: 'validation_started',
  sourceCount: sources.length,
  timestamp: new Date().toISOString()
}));
```

### CloudWatch Logs Insights Queries
```sql
-- Find slowest validations
fields @timestamp, sessionId, @duration
| filter action = "validation_complete"
| sort @duration desc
| limit 20

-- Error analysis
fields @timestamp, @message, errorType
| filter level = "ERROR"
| stats count() by errorType
```

### Cost Monitoring
- Enable AWS Cost Explorer
- Set budget alerts ($10, $25, $50 thresholds)
- Tag resources by environment (dev/prod)
- Monitor Lambda memory optimization opportunities

## Documentation Deliverables
- README.md with setup instructions
- API documentation
- User guide with screenshots
- Architecture diagram
- Deployment guide

## Success Metrics
- Successfully parse 95%+ of common citation formats
- Validate URLs with <2 second average latency
- Handle 100+ sources per submission
- 90%+ accuracy in format detection

## Getting Started with AWS

### Prerequisites
1. **AWS Account**: Create free tier account at aws.amazon.com
2. **AWS CLI**: Install and configure with `aws configure`
3. **Node.js**: v18+ and npm/yarn
4. **AWS CDK**: Install globally with `npm install -g aws-cdk`
5. **Git**: Version control
6. **TypeScript**: Basic knowledge (CDK uses TypeScript)

### Infrastructure as Code: AWS CDK (Cloud Development Kit)
Why CDK:
- **Real programming language** (TypeScript/Python/Java/Go) instead of YAML
- **Type safety** and IDE autocomplete
- **Reusable constructs** - create custom infrastructure components
- **Built-in best practices** with high-level L3 constructs
- **Direct integration** with AWS services
- **Better for complex logic** and conditionals
- **Easier testing** with standard testing frameworks
- **Great for learning** AWS architecture programmatically

### Setup Steps

**Step 1: Initialize CDK Project**
```bash
# Create project directory
mkdir source-validator && cd source-validator

# Initialize CDK app with TypeScript
cdk init app --language typescript

# Install CDK libraries
npm install @aws-cdk/aws-lambda \
            @aws-cdk/aws-apigateway \
            @aws-cdk/aws-dynamodb \
            @aws-cdk/aws-s3 \
            @aws-cdk/aws-cloudfront \
            @aws-cdk/aws-s3-deployment

# Bootstrap CDK (first time only)
cdk bootstrap aws://ACCOUNT-ID/REGION
```

**Step 2: Set Up Project Structure**
```bash
# Create directories
mkdir -p lambda/parse lambda/validate lambda/checkCitation lambda/generateReport
mkdir frontend

# CDK structure (auto-created)
# lib/source-validator-stack.ts - Main infrastructure stack
# bin/source-validator.ts - CDK app entry point
```

**Step 3: Set Up Frontend**
```bash
# Create React app
cd frontend
npx create-react-app . --template typescript
npm install axios aws-amplify
cd ..
```

**Step 4: Define Infrastructure in CDK**
Edit `lib/source-validator-stack.ts` to define:
- Lambda functions
- API Gateway
- DynamoDB tables
- S3 buckets
- CloudFront distribution

**Step 5: Develop Lambda Functions**
```bash
lambda/
├─ parse/
│  ├─ index.ts
│  ├─ parser.ts
│  └─ package.json
├─ validate/
│  ├─ index.ts
│  └─ package.json
├─ checkCitation/
│  ├─ handler.py
│  └─ requirements.txt
└─ generateReport/
   ├─ index.ts
   └─ package.json
```

**Step 6: Local Testing**
```bash
# CDK doesn't have built-in local testing like SAM
# Options:
# 1. Use AWS SAM CLI with CDK (cdk synth generates CloudFormation)
sam local start-api -t ./cdk.out/SourceValidatorStack.template.json

# 2. Use LocalStack (full AWS emulator)
# 3. Unit test Lambda handlers directly with Jest
npm test
```

**Step 7: Deploy to AWS**
```bash
# View changes
cdk diff

# Deploy infrastructure
cdk deploy

# CDK automatically handles:
# - Lambda bundling
# - S3 asset uploads
# - Frontend deployment (with S3Deployment construct)
# - CloudFormation stack updates

# Output will show API Gateway URL and CloudFront URL
```

**Step 8: Update Frontend Configuration**
```bash
# CDK outputs are automatically available
# Use CfnOutput in your stack to export values
# Update frontend/.env with the API URL
```

### Project Structure
```
source-validator/
├── bin/
│   └── source-validator.ts        # CDK app entry point
│
├── lib/
│   ├── source-validator-stack.ts  # Main infrastructure stack
│   ├── constructs/                # Custom CDK constructs
│   │   ├── validation-api.ts      # API Gateway + Lambda construct
│   │   ├── storage-layer.ts       # S3 + DynamoDB construct
│   │   └── frontend-hosting.ts    # S3 + CloudFront construct
│   └── config/
│       ├── dev.ts                 # Dev environment config
│       └── prod.ts                # Prod environment config
│
├── lambda/
│   ├── parse/
│   │   ├── index.ts               # Parse document handler
│   │   ├── parser.ts              # Citation parsing logic
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── validate/
│   │   ├── index.ts               # Validation handler
│   │   ├── urlChecker.ts          # URL validation
│   │   ├── credibility.ts         # Domain checking
│   │   └── package.json
│   ├── checkCitation/
│   │   ├── handler.py             # Python citation checker
│   │   └── requirements.txt
│   ├── generateReport/
│   │   ├── index.ts               # Report generation
│   │   ├── exporters/             # CSV, JSON, PDF
│   │   └── package.json
│   └── shared/                    # Shared code (Lambda Layer)
│       ├── models.ts              # Data models
│       ├── utils.ts               # Utility functions
│       └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadForm.tsx
│   │   │   ├── ResultsDashboard.tsx
│   │   │   ├── SourceList.tsx
│   │   │   └── ValidationChart.tsx
│   │   ├── services/
│   │   │   └── api.ts             # API Gateway client
│   │   ├── utils/
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   └── config.ts              # API endpoint config (from CDK outputs)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── test/
│   ├── source-validator.test.ts   # CDK stack tests
│   ├── lambda/
│   │   ├── parse.test.ts          # Lambda unit tests
│   │   ├── validate.test.ts
│   │   └── generateReport.test.ts
│   └── integration/
│       └── api.test.ts            # E2E API tests
│
├── docs/
│   ├── API.md                     # API documentation
│   ├── ARCHITECTURE.md            # System design
│   └── DEPLOYMENT.md              # Deployment guide
│
├── cdk.json                       # CDK configuration
├── cdk.context.json               # CDK context (auto-generated)
├── tsconfig.json                  # TypeScript configuration
├── package.json                   # Root dependencies
├── jest.config.js                 # Jest configuration
├── .gitignore
├── README.md
└── PROJECT_SPEC.md                # This file
```

## Resources

### AWS CDK Documentation
- **CDK Developer Guide**: https://docs.aws.amazon.com/cdk/
- **CDK API Reference**: https://docs.aws.amazon.com/cdk/api/v2/
- **CDK Workshop**: https://cdkworkshop.com/
- **CDK Patterns**: https://cdkpatterns.com/
- **CDK Examples**: https://github.com/aws-samples/aws-cdk-examples

### AWS Service Documentation
- **Lambda Developer Guide**: https://docs.aws.amazon.com/lambda/
- **API Gateway**: https://docs.aws.amazon.com/apigateway/
- **DynamoDB**: https://docs.aws.amazon.com/dynamodb/
- **S3 Static Hosting**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- **CloudFront**: https://docs.aws.amazon.com/cloudfront/
- **AWS Free Tier**: https://aws.amazon.com/free/

### CDK Sample Projects
- **Serverless API with CDK**: https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/api-cors-lambda-crud-dynamodb
- **Full-Stack App with CDK**: https://github.com/aws-samples/aws-cdk-examples/tree/master/typescript/static-site
- **CDK Patterns Repository**: https://github.com/cdk-patterns/serverless

### Tools & SDKs
- **AWS SDK v3 for JavaScript**: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/
- **AWS Amplify** (Frontend): https://docs.amplify.aws/
- **Boto3** (Python SDK): https://boto3.amazonaws.com/v1/documentation/api/latest/index.html
- **CDK Testing**: https://docs.aws.amazon.com/cdk/v2/guide/testing.html

### Citation & Validation
- **Purdue OWL** (Citation Guides): https://owl.purdue.edu/owl/research_and_citation/resources.html
- **CrossRef API**: https://www.crossref.org/documentation/retrieve-metadata/rest-api/
- **Citation.js**: https://citation.js.org/ (JavaScript citation parser)
- **DOI.org**: https://www.doi.org/ (Digital Object Identifier)

### TypeScript & Testing
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **AWS SDK Mock**: https://github.com/dwyl/aws-sdk-mock

### Video Tutorials
- **AWS CDK Crash Course**: https://www.youtube.com/results?search_query=aws+cdk+crash+course
- **Build Serverless Apps with CDK**: AWS re:Invent sessions on YouTube
- **CDK Best Practices**: AWS Online Tech Talks

### Community
- **CDK Slack**: https://cdk.dev/
- **AWS Reddit**: https://www.reddit.com/r/aws/
- **Stack Overflow**: Tag `aws-cdk`
