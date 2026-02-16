import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});

const TABLE_NAME = process.env.DYNAMODB_TABLE!;
const BUCKET_NAME = process.env.S3_BUCKET!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.id;
    const format = event.queryStringParameters?.format || 'json';

    if (!sessionId) {
      return errorResponse(400, 'Session ID is required');
    }

    // Retrieve session data
    const sessionData = await getSessionData(sessionId);

    // Generate report
    const reportContent = generateReport(sessionData, format);

    // Upload to S3
    const key = `reports/${sessionId}-${Date.now()}.${format}`;
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: reportContent,
        ContentType: getContentType(format),
      })
    );

    // Generate presigned URL
    const url = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      { expiresIn: 3600 }
    );

    return successResponse({ reportUrl: url, format, expiresIn: 3600 });
  } catch (error: any) {
    console.error('Report generation error:', error);
    return errorResponse(500, error.message);
  }
};

async function getSessionData(sessionId: string) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'sessionId = :sid',
      ExpressionAttributeValues: { ':sid': sessionId },
    })
  );

  return result.Items || [];
}

function generateReport(data: any[], format: string): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  } else if (format === 'csv') {
    // Simplified CSV generation
    const rows = data.map(item => [
      item.source?.citation || '',
      item.validationResult?.score || 0,
      item.validationResult?.isValid || false,
    ]);
    return ['Citation,Score,Valid', ...rows.map(r => r.join(','))].join('\n');
  }
  return JSON.stringify(data);
}

function getContentType(format: string): string {
  const types: Record<string, string> = {
    json: 'application/json',
    csv: 'text/csv',
    pdf: 'application/pdf',
  };
  return types[format] || 'application/octet-stream';
}

function successResponse(data: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data),
  };
}

function errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: message }),
  };
}
