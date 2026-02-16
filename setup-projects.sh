#!/bin/bash

# Source Validator - Complete Project Setup Script
# This script creates all remaining project files for Backend and Frontend

set -e

echo "🚀 Setting up Source Validator projects..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base directory (get script's directory)
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BASE_DIR"

echo -e "${BLUE}📦 Setting up Backend (Lambda Functions)...${NC}"

# Create Validate Lambda
cat > lambda/validate/package.json << 'EOF'
{
  "name": "validate-function",
  "version": "1.0.0",
  "description": "Validate sources",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-lambda": "^3.400.0",
    "axios": "^1.5.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.119",
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
EOF

cat > lambda/validate/index.ts << 'EOF'
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
EOF

# Create Check Citation Lambda (Python)
cat > lambda/checkCitation/handler.py << 'EOF'
import json
import re
import os

def lambda_handler(event, context):
    """Check citation format"""
    try:
        citation = event.get('citation', '')
        format_type = event.get('format', 'apa').lower()

        result = validate_citation(citation, format_type)

        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def validate_citation(citation, format_type):
    """Validate citation based on format"""
    if format_type == 'apa':
        return validate_apa(citation)
    elif format_type == 'mla':
        return validate_mla(citation)
    else:
        return {'formatCorrect': False, 'issues': ['Unsupported format']}

def validate_apa(citation):
    """Validate APA format: Author, A. (Year). Title."""
    pattern = r'^[^(]+\(\d{4}\)\..+'
    match = re.match(pattern, citation)

    return {
        'formatCorrect': bool(match),
        'hasRequiredFields': bool(match),
        'issues': [] if match else ['Does not match APA format']
    }

def validate_mla(citation):
    """Validate MLA format"""
    pattern = r'^[^.]+\..+'
    match = re.match(pattern, citation)

    return {
        'formatCorrect': bool(match),
        'hasRequiredFields': bool(match),
        'issues': [] if match else ['Does not match MLA format']
    }
EOF

cat > lambda/checkCitation/requirements.txt << 'EOF'
# No external dependencies required for basic version
EOF

# Create Generate Report Lambda
cat > lambda/generateReport/package.json << 'EOF'
{
  "name": "generate-report-function",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "@aws-sdk/client-s3": "^3.400.0",
    "@aws-sdk/s3-request-presigner": "^3.400.0",
    "json2csv": "^6.0.0"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.10.119",
    "typescript": "^5.3.0"
  }
}
EOF

cat > lambda/generateReport/index.ts << 'EOF'
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
EOF

# Create shared layer package.json
cat > lambda/shared/package.json << 'EOF'
{
  "name": "shared-layer",
  "version": "1.0.0",
  "description": "Shared utilities and models",
  "main": "index.js",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.400.0",
    "@aws-sdk/lib-dynamodb": "^3.400.0",
    "uuid": "^9.0.0"
  }
}
EOF

# Create tsconfig for Lambda functions
for dir in parse validate generateReport; do
  cat > lambda/$dir/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist"
  },
  "include": ["*.ts"],
  "exclude": ["node_modules"]
}
EOF
done

echo -e "${GREEN}✅ Backend setup complete!${NC}"

echo -e "${BLUE}📦 Setting up Frontend (React)...${NC}"

# Create frontend directory structure
mkdir -p frontend/src/{components/{common,layout,upload,results,report},services,hooks,context,types,utils,config,pages}
mkdir -p frontend/public

# Create frontend package.json
cat > frontend/package.json << 'EOF'
{
  "name": "source-validator-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.5.0",
    "react-dropzone": "^14.2.0",
    "recharts": "^2.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": ["react-app"]
  },
  "browserslist": {
    "production": [">0.2%", "not dead", "not op_mini all"],
    "development": ["last 1 chrome version", "last 1 firefox version", "last 1 safari version"]
  }
}
EOF

# Create frontend index.html
cat > frontend/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#000000" />
  <meta name="description" content="Source Validator - Verify academic citations" />
  <title>Source Validator</title>
</head>
<body>
  <noscript>You need to enable JavaScript to run this app.</noscript>
  <div id="root"></div>
</body>
</html>
EOF

# Create main App.tsx
cat > frontend/src/App.tsx << 'EOF'
import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ResultsPage from './pages/ResultsPage';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/results/:sessionId" element={<ResultsPage />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
EOF

# Create index.tsx
cat > frontend/src/index.tsx << 'EOF'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOF

# Create API config
cat > frontend/src/config/api.config.ts << 'EOF'
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod';

export const API_ENDPOINTS = {
  PARSE: `${API_BASE_URL}/parse`,
  VALIDATE: `${API_BASE_URL}/validate`,
  REPORT: (id: string) => `${API_BASE_URL}/report/${id}`,
};
EOF

# Create API service
cat > frontend/src/services/api.ts << 'EOF'
import axios from 'axios';
import { API_BASE_URL } from '../config/api.config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
EOF

# Create types
cat > frontend/src/types/source.types.ts << 'EOF'
export interface Source {
  id: string;
  citation: string;
  type: 'book' | 'journal' | 'website' | 'conference' | 'other';
  author?: string;
  year?: number;
  title?: string;
  url?: string;
}

export interface ValidationResult {
  sourceId: string;
  isValid: boolean;
  score: number;
  checks: {
    urlAccessible: boolean | null;
    formatCorrect: boolean;
    credibleDomain: boolean | null;
    isRecent: boolean | null;
    hasRequiredFields: boolean;
  };
  issues: string[];
  warnings: string[];
}
EOF

# Create HomePage
cat > frontend/src/pages/HomePage.tsx << 'EOF'
import React, { useState } from 'react';
import { Container, Typography, Box, TextField, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { API_ENDPOINTS } from '../config/api.config';

export default function HomePage() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await apiClient.post(API_ENDPOINTS.PARSE, { text });
      const { sessionId } = response.data;

      // Validate sources
      await apiClient.post(API_ENDPOINTS.VALIDATE, {
        sessionId,
        sources: response.data.sources,
      });

      navigate(`/results/${sessionId}`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error processing sources');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Source Validator
        </Typography>
        <Typography variant="h6" gutterBottom align="center" color="text.secondary">
          Validate academic citations and sources
        </Typography>

        <Paper sx={{ p: 3, mt: 4 }}>
          <TextField
            fullWidth
            multiline
            rows={10}
            label="Paste your bibliography here"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Smith, J. (2020). Sample article. Journal Name, 10(2), 123-145."
            disabled={loading}
          />

          <Button
            fullWidth
            variant="contained"
            size="large"
            sx={{ mt: 2 }}
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
          >
            {loading ? 'Processing...' : 'Validate Sources'}
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
EOF

# Create ResultsPage placeholder
cat > frontend/src/pages/ResultsPage.tsx << 'EOF'
import React from 'react';
import { Container, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';

export default function ResultsPage() {
  const { sessionId } = useParams();

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Validation Results
      </Typography>
      <Typography>Session ID: {sessionId}</Typography>
      <Typography color="text.secondary">
        Results display coming soon...
      </Typography>
    </Container>
  );
}
EOF

# Create tsconfig for frontend
cat > frontend/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
EOF

# Create .env.example
cat > frontend/.env.example << 'EOF'
REACT_APP_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
EOF

# Create frontend .gitignore
cat > frontend/.gitignore << 'EOF'
node_modules
build
.env.local
.env.development.local
.env.test.local
.env.production.local
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.DS_Store
EOF

# Create backend README
cat > lambda/README.md << 'EOF'
# Lambda Functions

## Setup

```bash
# Install dependencies for each function
cd parse && npm install
cd ../validate && npm install
cd ../generateReport && npm install
cd ../checkCitation && pip install -r requirements.txt
cd ../shared && npm install
```

## Build

```bash
# Build TypeScript functions
cd parse && npm run build
cd ../validate && npm run build
cd ../generateReport && npm run build
```

## Deploy

Lambda functions are deployed via CDK from the infrastructure project.

```bash
cd ../infrastructure
npm run cdk:deploy
```
EOF

# Create frontend README
cat > frontend/README.md << 'EOF'
# Source Validator Frontend

React application for validating academic sources.

## Setup

```bash
npm install
```

## Development

```bash
npm start
```

## Build

```bash
npm run build
```

## Deploy

Deploy build folder to S3 (done via infrastructure/CDK).

## Environment Variables

Copy `.env.example` to `.env.local` and update with your API Gateway URL.
EOF

echo -e "${GREEN}✅ Frontend setup complete!${NC}"

echo -e "${GREEN}🎉 All projects generated successfully!${NC}"
echo ""
echo "Project structure:"
echo "  ├── infrastructure/  (AWS CDK)"
echo "  ├── lambda/          (Backend functions)"
echo "  └── frontend/        (React app)"
echo ""
echo "Next steps:"
echo "  1. cd infrastructure && npm install"
echo "  2. cd ../lambda/parse && npm install"
echo "  3. cd ../../frontend && npm install"
echo "  4. Configure AWS credentials"
echo "  5. Deploy: cd infrastructure && npm run cdk:deploy:dev"
echo ""
echo "📚 See specs/ folder for detailed documentation"

chmod +x "$BASE_DIR/setup-projects.sh"
