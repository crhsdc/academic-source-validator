import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import axios from 'axios';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const TABLE_NAME = process.env.DYNAMODB_TABLE!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const request = JSON.parse(event.body || '{}');
    const { sessionId, sources } = request;

    if (!sessionId || !sources || !Array.isArray(sources)) {
      return errorResponse(400, 'Invalid request');
    }

    // Validate each source
    const results = await Promise.all(
      sources.map(source => validateSource(source))
    );

    // Store validation results
    await storeResults(sessionId, results);

    return successResponse({ sessionId, results });
  } catch (error: any) {
    console.error('Validation error:', error);
    return errorResponse(500, error.message);
  }
};

async function validateSource(source: any) {
  const checks = {
    urlAccessible: source.url ? await checkUrl(source.url) : null,
    formatCorrect: true, // Simplified
    credibleDomain: source.url ? isCredibleDomain(source.url) : null,
    isRecent: source.year ? (new Date().getFullYear() - source.year) < 10 : null,
    hasRequiredFields: !!source.author && !!source.title,
  };

  const score = calculateScore(checks);

  return {
    sourceId: source.id,
    isValid: score >= 60,
    score,
    checks,
    issues: [],
    warnings: [],
  };
}

async function checkUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.head(url, { timeout: 5000 });
    return response.status >= 200 && response.status < 400;
  } catch {
    return false;
  }
}

function isCredibleDomain(url: string): boolean {
  const credibleDomains = ['.edu', '.gov', '.org', 'springer.com', 'ieee.org'];
  return credibleDomains.some(domain => url.includes(domain));
}

function calculateScore(checks: any): number {
  let score = 0;
  if (checks.urlAccessible) score += 20;
  if (checks.formatCorrect) score += 30;
  if (checks.credibleDomain) score += 20;
  if (checks.isRecent) score += 10;
  if (checks.hasRequiredFields) score += 20;
  return score;
}

async function storeResults(sessionId: string, results: any[]) {
  for (const result of results) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { sessionId, sourceId: result.sourceId },
        UpdateExpression: 'SET validationResult = :result',
        ExpressionAttributeValues: { ':result': result },
      })
    );
  }
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
