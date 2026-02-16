# Source Validator - Infrastructure (AWS CDK)

AWS CDK infrastructure for the Source Validator serverless application.

## Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`
- AWS account with appropriate permissions

## Setup

```bash
# Install dependencies
npm install

# Bootstrap CDK (first time only, per account/region)
cdk bootstrap aws://ACCOUNT-ID/us-east-1

# Build TypeScript
npm run build
```

## Deployment

### Development Environment
```bash
# Synthesize CloudFormation template
npm run cdk:synth

# View differences
npm run cdk:diff

# Deploy to dev
npm run cdk:deploy:dev
```

### Production Environment
```bash
# Deploy to prod
ENVIRONMENT=prod npm run cdk:deploy:prod
```

## Project Structure

```
infrastructure/
├── bin/
│   └── source-validator.ts      # CDK app entry point
├── lib/
│   ├── source-validator-stack.ts  # Main stack
│   ├── config/
│   │   └── environment.ts       # Environment configs
│   └── constructs/
│       ├── api-construct.ts     # Lambda + API Gateway
│       ├── database-construct.ts  # DynamoDB
│       ├── storage-construct.ts   # S3 buckets
│       ├── frontend-construct.ts  # CloudFront + S3
│       └── monitoring-construct.ts  # CloudWatch
├── test/
│   └── source-validator.test.ts
├── cdk.json
├── tsconfig.json
└── package.json
```

## Lambda Functions

Backend function code is located in `../backend/` directory:
- `parse/` - Parse citations (Node.js)
- `validate/` - Validate sources (Node.js)
- `checkCitation/` - Check citation format (Python)
- `generateReport/` - Generate reports (Node.js)
- `shared/` - Shared layer

## Stack Outputs

After deployment, you'll receive:
- **ApiUrl**: API Gateway endpoint
- **FrontendUrl**: CloudFront distribution URL
- **TableName**: DynamoDB table name
- **FileBucketName**: S3 bucket for files
- **FrontendBucketName**: S3 bucket for frontend

## Environment Configuration

Edit `lib/config/environment.ts` to customize:
- CORS origins
- TTL settings
- Log retention
- Alarm settings
- Custom domain (optional)

## Testing

```bash
# Run unit tests
npm test

# Watch mode
npm run test:watch
```

## Useful Commands

```bash
npm run build      # Compile TypeScript
npm run watch      # Watch for changes
npm run cdk:synth  # Synthesize CloudFormation
npm run cdk:diff   # Compare deployed stack with current state
npm run cdk:deploy # Deploy all stacks
npm run cdk:destroy  # Delete stacks
npm run lint       # Lint TypeScript
npm run format     # Format code with Prettier
```

## Cost Optimization

- DynamoDB: Pay-per-request billing
- Lambda: Only pay for executions
- S3: Lifecycle policies delete old files
- CloudWatch: 7-day log retention in dev

Estimated monthly cost:
- **Dev**: $0-2 (within free tier)
- **Prod** (moderate usage): $5-15

## Monitoring

- CloudWatch Dashboard: View metrics
- CloudWatch Alarms: Get notified of issues
- X-Ray Tracing: Debug performance issues

Access dashboard from Stack Outputs.

## Clean Up

```bash
# Delete dev stack
cdk destroy SourceValidatorStack-Dev

# Delete prod stack
ENVIRONMENT=prod cdk destroy SourceValidatorStack-Prod
```

## Troubleshooting

### CDK Bootstrap Error
```bash
cdk bootstrap aws://ACCOUNT-ID/REGION
```

### Permission Errors
Ensure your AWS credentials have administrator access or CDK deployment permissions.

### Lambda Deployment Issues
Verify Lambda code exists in `../backend/` directory.

## Next Steps

1. Deploy infrastructure
2. Implement Lambda functions (see ../backend/)
3. Deploy frontend (see ../frontend/)
4. Set up CI/CD pipeline

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [CDK API Reference](https://docs.aws.amazon.com/cdk/api/v2/)
- [Project Specifications](../specs/)
