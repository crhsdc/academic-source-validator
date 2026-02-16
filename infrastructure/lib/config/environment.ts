export interface EnvironmentConfig {
  environment: 'dev' | 'prod';
  corsOrigins: string[];
  ttlDays: number;
  fileRetentionDays: number;
  enableAlarms: boolean;
  logRetentionDays: number;
  domainName?: string;
  certificateArn?: string;
}

export const devConfig: EnvironmentConfig = {
  environment: 'dev',
  corsOrigins: ['*'], // Allow all origins in development
  ttlDays: 1, // Delete DynamoDB items after 1 day
  fileRetentionDays: 1, // Delete S3 files after 1 day
  enableAlarms: false,
  logRetentionDays: 7,
};

export const prodConfig: EnvironmentConfig = {
  environment: 'prod',
  corsOrigins: ['https://yourdomain.com'], // Restrict to your domain
  ttlDays: 7, // Delete DynamoDB items after 7 days
  fileRetentionDays: 7, // Keep files for 7 days
  enableAlarms: true,
  logRetentionDays: 30,
  // domainName: 'validator.yourdomain.com', // Uncomment if using custom domain
  // certificateArn: 'arn:aws:acm:...', // Uncomment if using custom domain
};
