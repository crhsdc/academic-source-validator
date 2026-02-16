import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface DatabaseConstructProps {
  environment: string;
  ttlDays: number;
}

export class DatabaseConstruct extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: DatabaseConstructProps) {
    super(scope, id);

    // DynamoDB table for validation sessions
    this.table = new dynamodb.Table(this, 'ValidationTable', {
      tableName: `source-validator-sessions-${props.environment}`,
      partitionKey: {
        name: 'sessionId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sourceId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: props.environment === 'dev'
        ? cdk.RemovalPolicy.DESTROY
        : cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: props.environment === 'prod',
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
    });

    // Add tags
    cdk.Tags.of(this.table).add('Environment', props.environment);
    cdk.Tags.of(this.table).add('Component', 'Database');

    // Output
    new cdk.CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'DynamoDB table ARN',
    });
  }
}
