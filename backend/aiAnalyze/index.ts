import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

interface Source {
  id: string;
  citation: string;
  type: string;
  author?: string;
  year?: number;
  title?: string;
  url?: string;
}

interface AnalyzeRequest {
  sources: Source[];
  format?: string;
}

interface AnalysisResult {
  sourceId: string;
  analysis: string;
  suggestions: string[];
  completeness: number;
  aiConfidence: number;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('AI Analyze function invoked', { event });

  try {
    if (!event.body) {
      return errorResponse(400, 'Request body is required');
    }

    const request: AnalyzeRequest = JSON.parse(event.body);

    if (!request.sources || !Array.isArray(request.sources)) {
      return errorResponse(400, 'Sources array is required');
    }

    if (request.sources.length === 0) {
      return errorResponse(400, 'At least one source is required');
    }

    if (request.sources.length > 20) {
      return errorResponse(400, 'Maximum 20 sources allowed per request');
    }

    // Analyze sources with AI
    const results = await Promise.all(
      request.sources.map(source => analyzeSourceWithAI(source, request.format))
    );

    return successResponse({
      analyses: results,
      count: results.length,
    });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return errorResponse(500, `Analysis failed: ${error.message}`);
  }
};

async function analyzeSourceWithAI(
  source: Source,
  format?: string
): Promise<AnalysisResult> {
  const prompt = `You are an academic citation expert. Analyze this citation and provide constructive feedback.

Citation: ${source.citation}
Type: ${source.type}
Format: ${format || 'unknown'}
${source.author ? `Author: ${source.author}` : ''}
${source.year ? `Year: ${source.year}` : ''}
${source.title ? `Title: ${source.title}` : ''}
${source.url ? `URL: ${source.url}` : ''}

Provide a brief analysis (2-3 sentences) covering:
1. Overall quality and completeness
2. Any missing elements (author, year, title, publisher, page numbers, etc.)
3. Formatting issues

Then provide 3-5 specific, actionable suggestions to improve this citation.

Format your response as JSON:
{
  "analysis": "Brief overall assessment...",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2", ...],
  "completeness": 85,
  "confidence": 90
}

Where completeness is 0-100 (how complete the citation is) and confidence is 0-100 (your confidence in the analysis).`;

  try {
    // Use Claude 3.5 Haiku foundation model (fast & cost-effective)
    const modelId = 'anthropic.claude-3-5-haiku-20241022-v1:0';

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract the text content from Claude's response
    const textContent = responseBody.content[0].text;

    // Parse the JSON from the response
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);

    return {
      sourceId: source.id,
      analysis: aiResponse.analysis || 'Unable to analyze citation.',
      suggestions: aiResponse.suggestions || [],
      completeness: aiResponse.completeness || 50,
      aiConfidence: aiResponse.confidence || 50,
    };
  } catch (error: any) {
    console.error('Bedrock invocation error:', error);

    // Fallback response if Bedrock fails
    return {
      sourceId: source.id,
      analysis: 'AI analysis temporarily unavailable.',
      suggestions: ['Consider verifying all required citation elements are present.'],
      completeness: 50,
      aiConfidence: 0,
    };
  }
}

function successResponse(data: any): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
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
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'OPTIONS,POST',
    },
    body: JSON.stringify({ error: message }),
  };
}
