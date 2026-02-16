import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE!;

interface ParseRequest {
  text?: string;
  format?: 'apa' | 'mla' | 'chicago' | 'harvard';
}

interface Source {
  id: string;
  citation: string;
  type: 'book' | 'journal' | 'website' | 'conference' | 'other';
  author?: string;
  year?: number;
  title?: string;
  url?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('Parse function invoked', { event });

  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'Request body is required');
    }

    const request: ParseRequest = JSON.parse(event.body);

    // Validate input
    if (!request.text || request.text.trim().length === 0) {
      return errorResponse(400, 'Text is required and cannot be empty');
    }

    if (request.text.length > 50000) {
      return errorResponse(413, 'Text exceeds maximum length of 50,000 characters');
    }

    // Generate session ID
    const sessionId = uuidv4();
    const timestamp = Date.now();

    // Parse citations from text
    const sources = parseCitations(request.text, request.format);

    if (sources.length === 0) {
      return errorResponse(400, 'No citations found in the provided text');
    }

    // Store in DynamoDB
    await storeSession(sessionId, sources, request.format || 'unknown', timestamp);

    // Return response
    return successResponse({
      sessionId,
      sources,
      format: request.format || 'auto-detected',
      totalCount: sources.length,
    });
  } catch (error: any) {
    console.error('Error in parse function:', error);
    return errorResponse(500, `Internal server error: ${error.message}`);
  }
};

function parseCitations(text: string, format?: string): Source[] {
  const sources: Source[] = [];

  // Split text by newlines and filter empty lines
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  lines.forEach((citation, index) => {
    // Basic citation parsing (this is simplified - real implementation would be more complex)
    const source = parseSingleCitation(citation, format);
    if (source) {
      sources.push(source);
    }
  });

  return sources;
}

function parseSingleCitation(citation: string, format?: string): Source | null {
  const source: Source = {
    id: uuidv4(),
    citation,
    type: 'other',
  };

  // APA pattern: Author, A. A. (Year). Title.
  const apaPattern = /^([^(]+)\((\d{4})\)\.\s*([^.]+)\./;
  const apaMatch = citation.match(apaPattern);

  if (apaMatch) {
    source.author = apaMatch[1].trim();
    source.year = parseInt(apaMatch[2]);
    source.title = apaMatch[3].trim();
    source.type = 'journal';
  }

  // Extract URL if present
  const urlPattern = /(https?:\/\/[^\s]+)/;
  const urlMatch = citation.match(urlPattern);
  if (urlMatch) {
    source.url = urlMatch[1];
    source.type = 'website';
  }

  // Extract DOI if present
  const doiPattern = /doi:\s*(10\.\d+\/[^\s]+)/i;
  const doiMatch = citation.match(doiPattern);
  if (doiMatch) {
    source.type = 'journal';
  }

  return source;
}

async function storeSession(
  sessionId: string,
  sources: Source[],
  format: string,
  timestamp: number
): Promise<void> {
  const ttl = timestamp + 7 * 24 * 60 * 60 * 1000; // 7 days from now

  // Store session metadata
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        sessionId,
        sourceId: 'metadata',
        sessionData: {
          createdAt: timestamp,
          updatedAt: timestamp,
          totalSources: sources.length,
          format,
          status: 'parsing_complete',
        },
        expiresAt: Math.floor(ttl / 1000),
      },
    })
  );

  // Store sources in batches (DynamoDB limit: 25 items per batch)
  const batchSize = 25;
  for (let i = 0; i < sources.length; i += batchSize) {
    const batch = sources.slice(i, i + batchSize);

    const putRequests = batch.map((source) => ({
      PutRequest: {
        Item: {
          sessionId,
          sourceId: source.id,
          source: {
            citation: source.citation,
            type: source.type,
            author: source.author,
            year: source.year,
            title: source.title,
            url: source.url,
          },
          expiresAt: Math.floor(ttl / 1000),
        },
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: putRequests,
        },
      })
    );
  }
}

function successResponse(data: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(data),
  };
}

function errorResponse(statusCode: number, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: message }),
  };
}
