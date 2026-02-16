import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as logs from 'aws-cdk-lib/aws-logs';
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

    // Shared Lambda Layer for Node.js functions
    const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
      code: lambda.Code.fromAsset('../backend/shared'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
      description: 'Shared utilities, models, and dependencies',
    });

    // Common environment variables
    const commonEnv = {
      DYNAMODB_TABLE: props.table.tableName,
      ENVIRONMENT: props.environment,
      NODE_ENV: props.environment === 'prod' ? 'production' : 'development',
    };

    // Lambda Functions

    // 1. Parse Function
    const parseFunction = new lambda.Function(this, 'ParseFunction', {
      functionName: `source-validator-parse-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset('../backend/parse'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        S3_BUCKET: props.fileBucket.bucketName,
        MAX_FILE_SIZE: '5242880', // 5MB
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 2. Validate Function
    const validateFunction = new lambda.Function(this, 'ValidateFunction', {
      functionName: `source-validator-validate-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset('../backend/validate'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        CROSSREF_API_URL: 'https://api.crossref.org/works/',
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 3. Check Citation Function (Python)
    const checkCitationFunction = new lambda.Function(this, 'CheckCitationFunction', {
      functionName: `source-validator-check-citation-${props.environment}`,
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('../backend/checkCitation'),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      environment: commonEnv,
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // 4. Generate Report Function
    const generateReportFunction = new lambda.Function(this, 'GenerateReportFunction', {
      functionName: `source-validator-report-${props.environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'dist/index.handler',
      code: lambda.Code.fromAsset('../backend/generateReport'),
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024, // More memory for PDF generation
      layers: [sharedLayer],
      environment: {
        ...commonEnv,
        S3_BUCKET: props.fileBucket.bucketName,
      },
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions
    props.table.grantReadWriteData(parseFunction);
    props.table.grantReadWriteData(validateFunction);
    props.table.grantReadWriteData(checkCitationFunction);
    props.table.grantReadData(generateReportFunction);

    props.fileBucket.grantReadWrite(parseFunction);
    props.fileBucket.grantWrite(generateReportFunction);

    // Grant validate function permission to invoke check citation
    checkCitationFunction.grantInvoke(validateFunction);

    // API Gateway
    this.restApi = new apigateway.RestApi(this, 'Api', {
      restApiName: `SourceValidator-${props.environment}`,
      description: `Source Validator API - ${props.environment}`,
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        dataTraceEnabled: props.environment === 'dev',
        loggingLevel: props.environment === 'dev'
          ? apigateway.MethodLoggingLevel.INFO
          : apigateway.MethodLoggingLevel.ERROR,
        throttlingBurstLimit: 1000,
        throttlingRateLimit: 500,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: props.corsOrigins,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    // API Resources and Methods

    // POST /parse
    const parseResource = this.restApi.root.addResource('parse');
    parseResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(parseFunction, {
        proxy: true,
        integrationResponses: [
          {
            statusCode: '200',
          },
        ],
      }),
      {
        methodResponses: [{ statusCode: '200' }],
      }
    );

    // POST /validate
    const validateResource = this.restApi.root.addResource('validate');
    validateResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(validateFunction, {
        proxy: true,
      })
    );

    // GET /report/{id}
    const reportResource = this.restApi.root.addResource('report');
    const reportIdResource = reportResource.addResource('{id}');
    reportIdResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(generateReportFunction, {
        proxy: true,
      })
    );

    // API URL
    this.url = this.restApi.url;

    // Store functions for monitoring
    this.functions = [
      parseFunction,
      validateFunction,
      checkCitationFunction,
      generateReportFunction,
    ];

    // Add tags
    cdk.Tags.of(this.restApi).add('Environment', props.environment);
    cdk.Tags.of(this.restApi).add('Component', 'API');

    // Outputs
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.url,
      description: 'API Gateway endpoint URL',
    });
  }
}
