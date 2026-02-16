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

    // Database layer - DynamoDB table
    const database = new DatabaseConstruct(this, 'Database', {
      environment: config.environment,
      ttlDays: config.ttlDays,
    });

    // Storage layer - S3 buckets
    const storage = new StorageConstruct(this, 'Storage', {
      environment: config.environment,
      fileRetentionDays: config.fileRetentionDays,
    });

    // API layer - Lambda functions + API Gateway
    const api = new ApiConstruct(this, 'Api', {
      table: database.table,
      fileBucket: storage.fileBucket,
      environment: config.environment,
      corsOrigins: config.corsOrigins,
    });

    // Frontend layer - S3 + CloudFront
    const frontend = new FrontendConstruct(this, 'Frontend', {
      environment: config.environment,
      apiUrl: api.url,
      domainName: config.domainName,
      certificateArn: config.certificateArn,
    });

    // Monitoring - CloudWatch dashboards and alarms
    if (config.enableAlarms) {
      new MonitoringConstruct(this, 'Monitoring', {
        api: api.restApi,
        functions: api.functions,
        table: database.table,
        environment: config.environment,
      });
    }

    // Stack outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${config.environment}-SourceValidator-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: frontend.distributionUrl,
      description: 'CloudFront distribution URL',
      exportName: `${config.environment}-SourceValidator-FrontendUrl`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontend.bucket.bucketName,
      description: 'S3 bucket name for frontend',
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: database.table.tableName,
      description: 'DynamoDB table name',
    });

    new cdk.CfnOutput(this, 'FileBucketName', {
      value: storage.fileBucket.bucketName,
      description: 'S3 bucket name for file storage',
    });
  }
}
