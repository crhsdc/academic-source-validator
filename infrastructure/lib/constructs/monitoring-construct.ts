import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Construct } from 'constructs';

export interface MonitoringConstructProps {
  api: apigateway.RestApi;
  functions: lambda.Function[];
  table: dynamodb.Table;
  environment: string;
}

export class MonitoringConstruct extends Construct {
  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    // SNS topic for alarms
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `Source Validator Alarms - ${props.environment}`,
      topicName: `source-validator-alarms-${props.environment}`,
    });

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `SourceValidator-${props.environment}`,
    });

    // API Gateway Metrics
    const apiRequests = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: {
        ApiName: props.api.restApiName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const api4xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: {
        ApiName: props.api.restApiName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const api5xxErrors = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiName: props.api.restApiName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const apiLatency = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: {
        ApiName: props.api.restApiName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    // Add API Gateway widgets
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Requests',
        left: [apiRequests],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway Errors',
        left: [api4xxErrors, api5xxErrors],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Latency',
        left: [apiLatency],
        width: 24,
      })
    );

    // Lambda Metrics
    const lambdaRow: cloudwatch.IWidget[] = [];
    props.functions.forEach((func) => {
      const invocations = func.metricInvocations({
        period: cdk.Duration.minutes(5),
      });
      const errors = func.metricErrors({
        period: cdk.Duration.minutes(5),
      });
      const duration = func.metricDuration({
        period: cdk.Duration.minutes(5),
      });

      lambdaRow.push(
        new cloudwatch.GraphWidget({
          title: `${func.functionName} - Invocations & Errors`,
          left: [invocations],
          right: [errors],
          width: 12,
        })
      );

      // Alarm for high error rate
      const errorAlarm = new cloudwatch.Alarm(this, `${func.functionName}-ErrorAlarm`, {
        metric: errors,
        threshold: 5,
        evaluationPeriods: 2,
        alarmDescription: `High error rate for ${func.functionName}`,
        alarmName: `${func.functionName}-HighErrors`,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      errorAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));
    });

    dashboard.addWidgets(...lambdaRow);

    // DynamoDB Metrics
    const readCapacity = props.table.metricConsumedReadCapacityUnits({
      period: cdk.Duration.minutes(5),
    });
    const writeCapacity = props.table.metricConsumedWriteCapacityUnits({
      period: cdk.Duration.minutes(5),
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Capacity',
        left: [readCapacity, writeCapacity],
        width: 24,
      })
    );

    // Alarm for API Gateway 5XX errors
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xxAlarm', {
      metric: api5xxErrors,
      threshold: 10,
      evaluationPeriods: 2,
      alarmDescription: 'High 5XX error rate on API Gateway',
      alarmName: `SourceValidator-${props.environment}-Api5xxErrors`,
    });
    api5xxAlarm.addAlarmAction(new actions.SnsAction(alarmTopic));

    // Outputs
    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS Topic ARN for alarms',
    });
  }
}
