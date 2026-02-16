#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SourceValidatorStack } from '../lib/source-validator-stack';
import { devConfig, prodConfig } from '../lib/config/environment';

const app = new cdk.App();

const environment = process.env.ENVIRONMENT || 'dev';

// Development Stack
new SourceValidatorStack(app, 'SourceValidatorStack-Dev', {
  config: devConfig,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  stackName: 'SourceValidator-Dev',
  description: 'Source Validator Application - Development Environment',
  tags: {
    Environment: 'dev',
    Project: 'SourceValidator',
    ManagedBy: 'CDK',
  },
});

// Production Stack (only deploy if ENVIRONMENT=prod)
if (environment === 'prod') {
  new SourceValidatorStack(app, 'SourceValidatorStack-Prod', {
    config: prodConfig,
    env: {
      account: process.env.CDK_DEFAULT_ACCOUNT,
      region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    stackName: 'SourceValidator-Prod',
    description: 'Source Validator Application - Production Environment',
    tags: {
      Environment: 'prod',
      Project: 'SourceValidator',
      ManagedBy: 'CDK',
    },
  });
}

app.synth();
