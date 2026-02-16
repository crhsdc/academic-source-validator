import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageConstructProps {
  environment: string;
  fileRetentionDays: number;
}

export class StorageConstruct extends Construct {
  public readonly fileBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    // S3 bucket for temporary file storage
    this.fileBucket = new s3.Bucket(this, 'FileBucket', {
      bucketName: `source-validator-files-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: false,
      lifecycleRules: [
        {
          id: 'DeleteOldFiles',
          enabled: true,
          expiration: cdk.Duration.days(props.fileRetentionDays),
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'], // Will be restricted by API Gateway
          allowedHeaders: ['*'],
        },
      ],
      removalPolicy: props.environment === 'dev'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.environment === 'dev',
    });

    // Add tags
    cdk.Tags.of(this.fileBucket).add('Environment', props.environment);
    cdk.Tags.of(this.fileBucket).add('Component', 'Storage');

    // Output
    new cdk.CfnOutput(this, 'FileBucketName', {
      value: this.fileBucket.bucketName,
      description: 'S3 bucket name for file storage',
    });
  }
}
