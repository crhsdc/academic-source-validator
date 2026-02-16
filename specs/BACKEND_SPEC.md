# Backend Specification - AWS Lambda Functions

## Overview
Serverless backend using AWS Lambda functions for parsing, validating, and generating reports for academic source citations. Built with Node.js (TypeScript) and Python.

## Architecture

### Function Overview
```
API Gateway
    │
    ├─── POST /parse ──────────► ParseFunction (Node.js)
    │                                    │
    │                                    ├─► DynamoDB (write session)
    │                                    └─► S3 (optional file storage)
    │
    ├─── POST /validate ───────► ValidateFunction (Node.js)
    │                                    │
    │                                    ├─► CheckCitationFunction (Python)
    │                                    ├─► External APIs (CrossRef, etc.)
    │                                    └─► DynamoDB (write results)
    │
    └─── GET /report/{id} ─────► GenerateReportFunction (Node.js)
                                         │
                                         ├─► DynamoDB (read results)
                                         └─► S3 (write report file)
```

## Data Models

### DynamoDB Schema

**Table Name**: `source-validator-sessions`

**Primary Key**:
- Partition Key: `sessionId` (String)
- Sort Key: `sourceId` (String)

**Attributes**:
```typescript
{
  // Keys
  sessionId: string;          // UUID v4
  sourceId: string;           // UUID v4

  // Session metadata (only on first item)
  sessionData?: {
    userId?: string;          // Future: user ID if auth enabled
    createdAt: number;        // Unix timestamp
    updatedAt: number;
    totalSources: number;
    format?: string;          // Citation format (APA, MLA, etc.)
    status: 'parsing' | 'validating' | 'completed' | 'error';
  };

  // Source data
  source: {
    citation: string;
    type: 'book' | 'journal' | 'website' | 'conference' | 'other';
    url?: string;
    author?: string;
    year?: number;
    title?: string;
    publisher?: string;
    doi?: string;
    metadata?: Record<string, any>;
  };

  // Validation result (added by validate function)
  validationResult?: {
    isValid: boolean;
    score: number;            // 0-100
    checks: {
      urlAccessible: boolean | null;
      formatCorrect: boolean;
      credibleDomain: boolean | null;
      isRecent: boolean | null;
      hasRequiredFields: boolean;
      doiValid: boolean | null;
    };
    issues: Array<{
      type: 'error' | 'warning';
      field: string;
      message: string;
    }>;
    warnings: string[];
    validatedAt: number;
  };

  // TTL
  expiresAt: number;          // Unix timestamp, auto-delete after 7 days
}
```

### Access Patterns
```typescript
1. Create session with sources
   - PutItem: sessionId = uuid, sourceId = 'metadata'
   - BatchWriteItem: sessionId = uuid, sourceId = uuid (per source)

2. Get all sources for a session
   - Query: PK = sessionId

3. Update validation result
   - UpdateItem: PK = sessionId, SK = sourceId

4. Get session summary
   - Query: PK = sessionId, SK = 'metadata'
```

## Lambda Functions

### 1. Parse Function (Node.js/TypeScript)

**Purpose**: Parse bibliography text or uploaded file, extract sources

**Handler**: `lambda/parse/index.handler`

**Input** (API Gateway event):
```typescript
{
  body: {
    text?: string;              // Raw bibliography text
    file?: {
      name: string;
      content: string;          // Base64 encoded
      mimeType: string;
    };
    format?: 'apa' | 'mla' | 'chicago' | 'harvard';
  }
}
```

**Output**:
```typescript
{
  statusCode: 200,
  body: {
    sessionId: string;
    sources: Source[];
    format: string;
    parseErrors?: string[];
  }
}
```

**Logic Flow**:
```typescript
1. Validate input
   - Check text or file present (not both)
   - Validate file size (<5MB)
   - Validate file type (.txt, .docx, .pdf)

2. Extract text
   - If text: use directly
   - If file: extract text based on type
     - .txt: read directly
     - .docx: use mammoth library
     - .pdf: use pdf-parse library

3. Parse citations
   - Split by newlines/paragraphs
   - Detect citation format (if not provided)
   - Extract each citation

4. Parse each citation
   - Use regex patterns for each format
   - Extract: author, year, title, publisher, url, doi
   - Determine source type (book, journal, website)

5. Store in DynamoDB
   - Generate sessionId
   - Write session metadata
   - Write each source with unique sourceId

6. Return response
   - sessionId for subsequent calls
   - Parsed sources array
```

**Dependencies**:
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "uuid": "^9.0.0",
    "mammoth": "^1.6.0",
    "pdf-parse": "^1.1.1",
    "citation-js": "^0.7.0"
  }
}
```

**Code Structure**:
```typescript
// lambda/parse/index.ts
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;

// lambda/parse/parser.ts
export class CitationParser {
  parseText(text: string, format?: CitationFormat): Source[];
  detectFormat(text: string): CitationFormat;
  parseCitation(citation: string, format: CitationFormat): Source;
  extractMetadata(citation: string): Partial<Source>;
}

// lambda/parse/file-extractor.ts
export class FileExtractor {
  async extractFromTxt(buffer: Buffer): Promise<string>;
  async extractFromDocx(buffer: Buffer): Promise<string>;
  async extractFromPdf(buffer: Buffer): Promise<string>;
}

// lambda/parse/dynamodb.ts
export class SessionRepository {
  async createSession(sources: Source[]): Promise<string>;
  async getSources(sessionId: string): Promise<Source[]>;
}
```

**Citation Parsing Patterns**:
```typescript
// APA Pattern
// Author, A. A. (Year). Title of work. Publisher.
// Smith, J. (2020). Sample article. Journal Name, 10(2), 123-145.
const APA_PATTERN = /^([^(]+)\((\d{4})\)\.\s*([^.]+)\.\s*(.+)$/;

// MLA Pattern
// Author. "Title." Source, Date, Pages.
// Smith, John. "Sample Article." Journal Name, vol. 10, no. 2, 2020, pp. 123-145.
const MLA_PATTERN = /^([^.]+)\.\s*"([^"]+)"\s*([^,]+),\s*(.+)$/;

// Chicago Pattern
// Author. Title. Publisher, Year.
// Smith, John. Sample Article. Chicago: University Press, 2020.
const CHICAGO_PATTERN = /^([^.]+)\.\s*([^.]+)\.\s*([^,]+),\s*(\d{4})\.$/;
```

**Error Handling**:
```typescript
- Invalid input → 400 Bad Request
- File too large → 413 Payload Too Large
- Unsupported file type → 415 Unsupported Media Type
- Parse error → 200 with parseErrors array
- DynamoDB error → 500 Internal Server Error
```

---

### 2. Validate Function (Node.js/TypeScript)

**Purpose**: Validate sources (URL check, format check, credibility)

**Handler**: `lambda/validate/index.handler`

**Input**:
```typescript
{
  body: {
    sessionId: string;
    sources: Source[];
  }
}
```

**Output**:
```typescript
{
  statusCode: 200,
  body: {
    sessionId: string;
    results: ValidationResult[];
  }
}
```

**Logic Flow**:
```typescript
1. Retrieve session from DynamoDB
   - Verify session exists
   - Get all sources

2. For each source, validate in parallel:
   a. URL Validation (if URL present)
      - HTTP HEAD request
      - Check status code (200-299 = valid)
      - Check SSL certificate
      - Timeout: 5 seconds

   b. Format Validation
      - Call CheckCitationFunction (Python)
      - Verify required fields present
      - Check format compliance

   c. Domain Credibility (if URL present)
      - Check against credibility list
      - Academic domains (.edu, .gov)
      - Known publishers
      - Flag suspicious domains

   d. Recency Check
      - If year present, compare to current year
      - Flag if >10 years old (configurable)

   e. DOI Validation (if present)
      - Call CrossRef API
      - Verify DOI exists
      - Match metadata

3. Calculate score (0-100)
   - URL accessible: 20 points
   - Format correct: 30 points
   - Credible domain: 20 points
   - Recent: 10 points
   - Has required fields: 20 points

4. Store results in DynamoDB
   - Update each source item with validationResult

5. Return response
   - Array of validation results
```

**Dependencies**:
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-lambda": "^3.400.0",
    "axios": "^1.5.0",
    "p-limit": "^4.0.0"
  }
}
```

**Code Structure**:
```typescript
// lambda/validate/index.ts
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;

// lambda/validate/url-checker.ts
export class UrlChecker {
  async checkUrl(url: string): Promise<{ accessible: boolean; statusCode?: number }>;
  async checkSsl(url: string): Promise<boolean>;
}

// lambda/validate/credibility.ts
export class CredibilityChecker {
  isCredibleDomain(url: string): boolean;
  getDomainCategory(domain: string): 'academic' | 'publisher' | 'general' | 'suspicious';
}

// lambda/validate/doi-validator.ts
export class DoiValidator {
  async validateDoi(doi: string): Promise<{ valid: boolean; metadata?: any }>;
}

// lambda/validate/scoring.ts
export class ScoreCalculator {
  calculateScore(checks: ValidationChecks): number;
  generateIssues(checks: ValidationChecks): Issue[];
  generateWarnings(source: Source, checks: ValidationChecks): string[];
}
```

**Credibility Lists**:
```typescript
// Academic domains
const ACADEMIC_DOMAINS = [
  '.edu', '.ac.uk', '.edu.au', '.gov', '.org'
];

// Known publishers
const CREDIBLE_PUBLISHERS = [
  'springer.com', 'wiley.com', 'elsevier.com',
  'nature.com', 'ieee.org', 'acm.org', 'jstor.org'
];

// Suspicious indicators
const SUSPICIOUS_PATTERNS = [
  'sci-hub', 'libgen', 'free-pdf', 'download-paper'
];
```

**External API Integration**:
```typescript
// CrossRef API
GET https://api.crossref.org/works/{doi}
Response: {
  status: 'ok',
  message: {
    title: string,
    author: Array<{family: string, given: string}>,
    published: {date-parts: [[year, month, day]]},
    URL: string
  }
}
```

**Parallel Processing**:
```typescript
import pLimit from 'p-limit';

// Limit concurrent validations to 10
const limit = pLimit(10);

const validationPromises = sources.map(source =>
  limit(() => validateSource(source))
);

const results = await Promise.all(validationPromises);
```

---

### 3. Check Citation Function (Python)

**Purpose**: Deep citation format validation using Python regex/NLP

**Handler**: `lambda/checkCitation/handler.lambda_handler`

**Input**:
```python
{
  "citation": str,
  "format": str,  # 'apa', 'mla', 'chicago'
  "type": str     # 'book', 'journal', 'website'
}
```

**Output**:
```python
{
  "formatCorrect": bool,
  "hasRequiredFields": bool,
  "extractedFields": {
    "author": str,
    "year": int,
    "title": str,
    # ...
  },
  "issues": List[str]
}
```

**Logic**:
```python
1. Parse citation using regex
2. Validate against format rules
3. Check required fields by type
4. Return validation result
```

**Dependencies**:
```txt
boto3>=1.28.0
```

**Code Structure**:
```python
# lambda/checkCitation/handler.py
def lambda_handler(event, context):
    # Entry point

# lambda/checkCitation/parsers.py
class APAParser:
    def parse(citation: str) -> Dict
    def validate(citation: str) -> ValidationResult

class MLAParser:
    def parse(citation: str) -> Dict
    def validate(citation: str) -> ValidationResult

class ChicagoParser:
    def parse(citation: str) -> Dict
    def validate(citation: str) -> ValidationResult

# lambda/checkCitation/validators.py
def validate_apa_journal(fields: Dict) -> List[str]:
    # Check: author, year, title, journal, volume, pages

def validate_mla_book(fields: Dict) -> List[str]:
    # Check: author, title, publisher, year

# lambda/checkCitation/utils.py
def normalize_author(author: str) -> str
def extract_year(text: str) -> Optional[int]
def extract_doi(text: str) -> Optional[str]
```

**Validation Rules**:
```python
APA_JOURNAL_REQUIRED = ['author', 'year', 'title', 'journal', 'volume']
APA_BOOK_REQUIRED = ['author', 'year', 'title', 'publisher']
MLA_REQUIRED = ['author', 'title', 'source']
CHICAGO_BOOK_REQUIRED = ['author', 'title', 'publisher', 'year']
```

---

### 4. Generate Report Function (Node.js/TypeScript)

**Purpose**: Generate downloadable reports (JSON, CSV, PDF)

**Handler**: `lambda/generateReport/index.handler`

**Input**:
```typescript
{
  pathParameters: {
    id: string  // sessionId
  },
  queryStringParameters: {
    format?: 'json' | 'csv' | 'pdf'
  }
}
```

**Output**:
```typescript
{
  statusCode: 200,
  body: {
    reportUrl: string;      // S3 presigned URL
    format: string;
    expiresIn: number;      // 3600 seconds (1 hour)
  }
}
```

**Logic Flow**:
```typescript
1. Retrieve session data from DynamoDB
   - Query all items with sessionId
   - Combine session metadata and results

2. Generate report based on format
   a. JSON: Serialize entire session object
   b. CSV: Convert to tabular format
   c. PDF: Generate formatted document (future)

3. Upload to S3
   - Generate filename: {sessionId}-{timestamp}.{format}
   - Upload to reports folder
   - Set metadata (content-type, cache-control)

4. Generate presigned URL
   - Expires in 1 hour
   - Public read access via URL only

5. Return response
   - URL for download
```

**Dependencies**:
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0",
    "json2csv": "^6.0.0",
    "pdfkit": "^0.13.0"
  }
}
```

**Code Structure**:
```typescript
// lambda/generateReport/index.ts
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult>;

// lambda/generateReport/report-generator.ts
export abstract class ReportGenerator {
  abstract generate(session: ValidationSession): Promise<Buffer>;
}

export class JsonReportGenerator extends ReportGenerator {
  async generate(session: ValidationSession): Promise<Buffer>;
}

export class CsvReportGenerator extends ReportGenerator {
  async generate(session: ValidationSession): Promise<Buffer>;
  private flattenSource(source: Source, result: ValidationResult): any;
}

export class PdfReportGenerator extends ReportGenerator {
  async generate(session: ValidationSession): Promise<Buffer>;
  private generateHeader(doc: PDFDocument): void;
  private generateSummary(doc: PDFDocument, summary: any): void;
  private generateSourceTable(doc: PDFDocument, sources: any[]): void;
}

// lambda/generateReport/s3-uploader.ts
export class S3Uploader {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  async generatePresignedUrl(key: string, expiresIn: number): Promise<string>;
}
```

**CSV Format**:
```csv
Citation,Type,URL,Author,Year,Title,Valid,Score,URL Accessible,Format Correct,Credible Domain,Issues
"Smith, J. (2020)...",journal,https://...,Smith,2020,Sample Article,true,95,true,true,true,""
```

**Report File Naming**:
```typescript
const filename = `${sessionId}-${Date.now()}.${format}`;
const s3Key = `reports/${filename}`;
```

---

## Shared Layer

**Purpose**: Common utilities, models, and dependencies shared across Lambda functions

**Path**: `lambda/shared/`

**Structure**:
```
lambda/shared/
├── nodejs/
│   ├── node_modules/    # Installed dependencies
│   └── package.json
├── models/
│   ├── source.ts
│   ├── validation.ts
│   └── session.ts
├── utils/
│   ├── dynamodb.ts
│   ├── s3.ts
│   ├── logger.ts
│   └── error-handler.ts
└── constants/
    └── index.ts
```

**Shared Dependencies**:
```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "uuid": "^9.0.0"
  }
}
```

**Logger Utility**:
```typescript
// lambda/shared/utils/logger.ts
export class Logger {
  info(message: string, meta?: any): void {
    console.log(JSON.stringify({ level: 'INFO', message, ...meta }));
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      error: error?.message,
      stack: error?.stack,
      ...meta
    }));
  }

  warn(message: string, meta?: any): void {
    console.warn(JSON.stringify({ level: 'WARN', message, ...meta }));
  }
}
```

**Error Handler**:
```typescript
// lambda/shared/utils/error-handler.ts
export function handleError(error: any): APIGatewayProxyResult {
  if (error.statusCode) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({ error: error.message }),
    };
  }

  logger.error('Unhandled error', error);

  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Internal server error' }),
  };
}
```

---

## Testing

### Unit Tests

**Parse Function Tests**:
```typescript
describe('CitationParser', () => {
  test('parses APA citation correctly', () => {
    const parser = new CitationParser();
    const citation = 'Smith, J. (2020). Sample. Journal, 10(2), 123-145.';
    const result = parser.parseCitation(citation, 'apa');

    expect(result.author).toBe('Smith, J.');
    expect(result.year).toBe(2020);
    expect(result.title).toBe('Sample');
  });

  test('detects format automatically', () => {
    const parser = new CitationParser();
    const text = 'Smith, J. (2020). Sample. Journal.';
    const format = parser.detectFormat(text);

    expect(format).toBe('apa');
  });
});
```

**Validate Function Tests**:
```typescript
describe('UrlChecker', () => {
  test('validates accessible URL', async () => {
    const checker = new UrlChecker();
    const result = await checker.checkUrl('https://google.com');

    expect(result.accessible).toBe(true);
    expect(result.statusCode).toBe(200);
  });

  test('handles invalid URL', async () => {
    const checker = new UrlChecker();
    const result = await checker.checkUrl('https://invalid-domain-12345.com');

    expect(result.accessible).toBe(false);
  });
});

describe('ScoreCalculator', () => {
  test('calculates score correctly', () => {
    const calculator = new ScoreCalculator();
    const checks = {
      urlAccessible: true,
      formatCorrect: true,
      credibleDomain: true,
      isRecent: true,
      hasRequiredFields: true,
    };

    const score = calculator.calculateScore(checks);
    expect(score).toBe(100);
  });
});
```

### Integration Tests

**Full Flow Test**:
```typescript
describe('Source Validation Flow', () => {
  let sessionId: string;

  test('parse sources', async () => {
    const event = {
      body: JSON.stringify({
        text: 'Smith, J. (2020). Sample. Journal, 10(2), 123-145.',
        format: 'apa',
      }),
    };

    const result = await parseHandler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.sources).toHaveLength(1);
    sessionId = body.sessionId;
  });

  test('validate sources', async () => {
    const event = {
      body: JSON.stringify({
        sessionId,
        sources: [/* ... */],
      }),
    };

    const result = await validateHandler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].score).toBeGreaterThan(0);
  });

  test('generate report', async () => {
    const event = {
      pathParameters: { id: sessionId },
      queryStringParameters: { format: 'json' },
    };

    const result = await generateReportHandler(event as any);
    const body = JSON.parse(result.body);

    expect(result.statusCode).toBe(200);
    expect(body.reportUrl).toBeDefined();
  });
});
```

---

## Performance Optimization

### Cold Start Optimization
```typescript
// Initialize AWS clients outside handler
const dynamoClient = new DynamoDBClient({});
const s3Client = new S3Client({});

// Use Lambda layers for shared dependencies
// Reduce bundle size: tree-shaking, minification

// Use SnapStart (Java/Node.js 18+)
// Provisioned concurrency for critical functions
```

### Parallel Processing
```typescript
// Validate multiple sources in parallel
const limit = pLimit(10); // Max 10 concurrent
const results = await Promise.all(
  sources.map(source => limit(() => validateSource(source)))
);

// Batch DynamoDB operations
await dynamoClient.send(new BatchWriteCommand({
  RequestItems: {
    [tableName]: items.map(item => ({
      PutRequest: { Item: item }
    }))
  }
}));
```

### Caching
```typescript
// Cache credibility lists in memory
let credibilityCache: string[] | null = null;

async function getCredibilityList(): Promise<string[]> {
  if (credibilityCache) return credibilityCache;

  // Load from S3 or environment
  credibilityCache = await loadFromS3();
  return credibilityCache;
}
```

---

## Monitoring & Logging

### Structured Logging
```typescript
logger.info('Parsing started', {
  sessionId,
  sourceCount: sources.length,
  format,
});

logger.error('Validation failed', error, {
  sessionId,
  sourceId,
});
```

### Custom Metrics
```typescript
import { MetricUnits } from '@aws-lambda-powertools/metrics';

metrics.addMetric('SourcesParsed', MetricUnits.Count, sources.length);
metrics.addMetric('ValidationDuration', MetricUnits.Milliseconds, duration);
metrics.addMetric('ValidationScore', MetricUnits.None, averageScore);
```

### X-Ray Tracing
```typescript
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer();

export const handler = tracer.captureLambdaHandler(async (event) => {
  const segment = tracer.getSegment();
  const subsegment = segment.addNewSubsegment('parseText');

  try {
    const result = await parseText(text);
    subsegment.close();
    return result;
  } catch (error) {
    subsegment.addError(error);
    throw error;
  }
});
```

---

## Error Handling

### Error Types
```typescript
export class ValidationError extends Error {
  constructor(message: string, public statusCode: number = 400) {
    super(message);
  }
}

export class NotFoundError extends ValidationError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class RateLimitError extends ValidationError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429);
  }
}
```

### Global Error Handler
```typescript
export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    // Business logic
    return successResponse(data);
  } catch (error) {
    return handleError(error);
  }
};

function handleError(error: any): APIGatewayProxyResult {
  if (error instanceof ValidationError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({ error: error.message }),
    };
  }

  logger.error('Unhandled error', error);
  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Internal server error' }),
  };
}
```

---

## Security

### Input Validation
```typescript
import Joi from 'joi';

const parseRequestSchema = Joi.object({
  text: Joi.string().max(50000),
  file: Joi.object({
    name: Joi.string().required(),
    content: Joi.string().base64().required(),
    mimeType: Joi.string().valid('text/plain', 'application/pdf').required(),
  }),
  format: Joi.string().valid('apa', 'mla', 'chicago'),
}).xor('text', 'file');

// Validate
const { error, value } = parseRequestSchema.validate(body);
if (error) throw new ValidationError(error.message);
```

### Secrets Management
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({});

async function getApiKey(): Promise<string> {
  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: 'crossref-api-key' })
  );
  return JSON.parse(response.SecretString!).apiKey;
}
```

### Rate Limiting
```typescript
// Use API Gateway usage plans
// Or implement custom rate limiting with DynamoDB

async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}:${Date.now() / 60000}`;
  const count = await getFromDynamoDB(key);

  if (count >= 100) {
    throw new RateLimitError();
  }

  await incrementInDynamoDB(key);
  return true;
}
```

---

## Deployment

### Build Process
```bash
# Install dependencies for each function
cd lambda/parse && npm install
cd lambda/validate && npm install
cd lambda/generateReport && npm install

# Build TypeScript
npm run build

# Package for deployment (CDK handles this)
```

### Environment Variables
```typescript
// Set in CDK stack
environment: {
  DYNAMODB_TABLE: table.tableName,
  S3_BUCKET: bucket.bucketName,
  ENVIRONMENT: 'production',
  LOG_LEVEL: 'INFO',
  CROSSREF_API_URL: 'https://api.crossref.org/works/',
}
```

---

## Future Enhancements
1. Batch processing (SQS + Step Functions)
2. Real-time validation (WebSocket API)
3. Machine learning for format detection
4. Advanced plagiarism detection
5. Integration with academic databases
6. User authentication and authorization
7. API rate limiting per user
8. Webhook notifications
9. Async processing for large files
10. Multi-language support

## Next Steps
1. Implement Lambda functions
2. Write unit tests
3. Deploy to dev environment
4. Test integration with frontend
5. Monitor performance and optimize
6. Deploy to production
