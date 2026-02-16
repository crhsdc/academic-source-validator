# Frontend Specification - React Application

## Overview
A React-based single-page application (SPA) for uploading, validating, and reviewing academic sources. Built with TypeScript, Material-UI, and hosted on AWS S3 + CloudFront.

## Technology Stack

### Core
- **Framework**: React 18.2+
- **Language**: TypeScript 5.3+
- **Build Tool**: Create React App / Vite
- **Package Manager**: npm

### UI Libraries
- **Component Library**: Material-UI (MUI) v5
- **Icons**: @mui/icons-material
- **Charts**: Recharts or Chart.js
- **Styling**: MUI styled-components + CSS modules

### State Management
- **Global State**: React Context API
- **Server State**: React Query (TanStack Query)
- **Form State**: React Hook Form

### HTTP & API
- **Client**: Axios
- **Base URL**: From CDK output (injected at build time)

### File Handling
- **Upload**: react-dropzone
- **Parsing**: Client-side text extraction

### Testing
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Cypress or Playwright
- **Coverage**: >80% target

### Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript strict mode

## Application Architecture

### Folder Structure
```
frontend/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── Button.styles.ts
│   │   │   ├── Loading/
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── LoadingOverlay.tsx
│   │   │   └── ErrorBoundary/
│   │   │       └── ErrorBoundary.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Layout.tsx
│   │   ├── upload/
│   │   │   ├── UploadForm.tsx
│   │   │   ├── TextInput.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── FormatSelector.tsx
│   │   ├── results/
│   │   │   ├── ResultsDashboard.tsx
│   │   │   ├── SourceList.tsx
│   │   │   ├── SourceCard.tsx
│   │   │   ├── ValidationSummary.tsx
│   │   │   └── ValidationChart.tsx
│   │   └── report/
│   │       ├── ReportExport.tsx
│   │       └── ReportDownload.tsx
│   ├── services/
│   │   ├── api.ts                    # API client
│   │   ├── parse.service.ts
│   │   ├── validate.service.ts
│   │   └── report.service.ts
│   ├── hooks/
│   │   ├── useValidation.ts
│   │   ├── useUpload.ts
│   │   └── useReport.ts
│   ├── context/
│   │   ├── ValidationContext.tsx
│   │   └── ThemeContext.tsx
│   ├── types/
│   │   ├── source.types.ts
│   │   ├── validation.types.ts
│   │   └── api.types.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── config/
│   │   └── api.config.ts             # API endpoints
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── UploadPage.tsx
│   │   ├── ResultsPage.tsx
│   │   └── NotFoundPage.tsx
│   ├── App.tsx
│   ├── App.test.tsx
│   ├── index.tsx
│   └── index.css
├── .env.example
├── .env.development
├── .env.production
├── tsconfig.json
├── package.json
└── README.md
```

## Data Models (TypeScript)

### Source Types
```typescript
// src/types/source.types.ts
export enum SourceType {
  BOOK = 'book',
  JOURNAL = 'journal',
  WEBSITE = 'website',
  CONFERENCE = 'conference',
  OTHER = 'other',
}

export enum CitationFormat {
  APA = 'apa',
  MLA = 'mla',
  CHICAGO = 'chicago',
  HARVARD = 'harvard',
}

export interface Source {
  id: string;
  type: SourceType;
  citation: string;
  url?: string;
  author?: string;
  year?: number;
  title?: string;
  publisher?: string;
  doi?: string;
}

export interface ParsedSources {
  sources: Source[];
  format?: CitationFormat;
  totalCount: number;
  parseErrors?: string[];
}
```

### Validation Types
```typescript
// src/types/validation.types.ts
export interface ValidationChecks {
  urlAccessible: boolean | null;
  formatCorrect: boolean;
  credibleDomain: boolean | null;
  isRecent: boolean | null;
  hasRequiredFields: boolean;
}

export interface ValidationResult {
  sourceId: string;
  isValid: boolean;
  checks: ValidationChecks;
  issues: string[];
  warnings: string[];
  score: number; // 0-100
  timestamp: string;
}

export interface ValidationSession {
  sessionId: string;
  sources: Source[];
  results: ValidationResult[];
  summary: {
    totalSources: number;
    validSources: number;
    invalidSources: number;
    averageScore: number;
    completedAt?: string;
  };
}

export enum ValidationStatus {
  IDLE = 'idle',
  PARSING = 'parsing',
  VALIDATING = 'validating',
  COMPLETED = 'completed',
  ERROR = 'error',
}
```

### API Types
```typescript
// src/types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ParseRequest {
  text?: string;
  format?: CitationFormat;
  file?: File;
}

export interface ParseResponse {
  sessionId: string;
  sources: Source[];
  format: CitationFormat;
}

export interface ValidateRequest {
  sessionId: string;
  sources: Source[];
}

export interface ValidateResponse {
  sessionId: string;
  results: ValidationResult[];
}

export interface ReportResponse {
  reportUrl: string;
  format: 'json' | 'csv' | 'pdf';
  expiresIn: number; // seconds
}
```

## Components Specification

### 1. Upload Form Component

**UploadForm.tsx**
```typescript
Purpose: Main entry point for source submission
Features:
  - Text input (paste bibliography)
  - File upload (drag & drop, click to browse)
  - Format selection (APA, MLA, Chicago)
  - Character/file size limits display
  - Submit button with loading state
  - Clear/reset functionality

Props:
  onSubmit: (data: ParseRequest) => void
  isLoading: boolean

State:
  - inputText: string
  - selectedFile: File | null
  - format: CitationFormat
  - errors: Record<string, string>

Validation:
  - Max text length: 50,000 characters
  - Max file size: 5 MB
  - Allowed file types: .txt, .docx, .pdf
  - Either text OR file (not both)

UI/UX:
  - Tabbed interface (Text Input | File Upload)
  - Real-time character counter
  - File preview with remove option
  - Format selector with descriptions
  - Helpful tooltips and examples
```

### 2. Results Dashboard Component

**ResultsDashboard.tsx**
```typescript
Purpose: Display validation results overview
Features:
  - Summary statistics (cards)
  - Validation progress (if async)
  - Overall score visualization
  - Quick filters (All, Valid, Invalid, Warnings)
  - Export button
  - Re-validate option

Props:
  session: ValidationSession
  onExport: (format: string) => void
  onRevalidate: () => void

Sections:
  1. Summary Cards
     - Total sources
     - Valid sources (green)
     - Invalid sources (red)
     - Warnings (yellow)
     - Average score

  2. Score Chart
     - Pie chart or donut chart
     - Color coded (green/yellow/red)

  3. Issues Overview
     - Top issues list
     - Count per issue type

  4. Action Buttons
     - Export as JSON/CSV/PDF
     - Share session (copy link)
     - Start new validation
```

### 3. Source List Component

**SourceList.tsx**
```typescript
Purpose: Display list of validated sources
Features:
  - Filterable list
  - Sortable columns
  - Expandable rows for details
  - Status indicators
  - Pagination (if >20 sources)

Props:
  sources: Source[]
  results: ValidationResult[]
  onSourceClick: (sourceId: string) => void

Display Columns:
  - Status icon (✓ ✗ ⚠)
  - Citation text (truncated)
  - Type badge
  - Score (0-100)
  - Issues count
  - Actions (view details, copy)

Filters:
  - By status (valid/invalid/warnings)
  - By type (book/journal/website)
  - By score range
  - Search by text

Sort Options:
  - Score (high to low)
  - Citation (A-Z)
  - Type
```

### 4. Source Card Component

**SourceCard.tsx**
```typescript
Purpose: Detailed view of a single source
Features:
  - Full citation display
  - Validation checks breakdown
  - Issues and warnings list
  - Suggestions for fixes
  - Copy citation button

Props:
  source: Source
  result: ValidationResult

Display:
  1. Header
     - Citation text
     - Overall score badge
     - Copy button

  2. Metadata
     - Author, Year, Title
     - URL (clickable if valid)
     - DOI (if available)
     - Type badge

  3. Validation Checks
     ✓ URL accessible
     ✗ Format incorrect
     ⚠ Old publication date
     ✓ Credible domain
     ✓ Required fields present

  4. Issues Section
     - Red alert for errors
     - Yellow for warnings
     - Actionable suggestions

  5. Actions
     - Copy citation
     - Open URL
     - Edit source
```

### 5. Validation Chart Component

**ValidationChart.tsx**
```typescript
Purpose: Visual representation of results
Chart Types:
  1. Pie Chart
     - Valid vs Invalid vs Warnings
     - Color coded segments

  2. Bar Chart
     - Score distribution (0-20, 21-40, 41-60, 61-80, 81-100)
     - Issue type frequency

  3. Line Chart (if historical data)
     - Score trends over time

Props:
  data: ValidationResult[]
  chartType: 'pie' | 'bar' | 'line'

Library: Recharts
Responsive: Yes
Interactive: Tooltips on hover
```

### 6. Report Export Component

**ReportExport.tsx**
```typescript
Purpose: Generate and download reports
Features:
  - Format selection (JSON, CSV, PDF)
  - Preview before download
  - Email option (optional)
  - Share link generation

Props:
  sessionId: string
  onExport: (format: string) => void

Export Formats:
  1. JSON
     - Full data structure
     - Machine readable

  2. CSV
     - Spreadsheet compatible
     - One row per source

  3. PDF (future)
     - Formatted report
     - Summary + details

UI:
  - Radio buttons for format
  - Download button
  - Loading state during generation
  - Success message with link
```

## API Integration

### API Client Setup
```typescript
// src/services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.example.com/prod';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        throw error;
      }
    );
  }

  async post<T>(url: string, data: any): Promise<T> {
    return this.client.post(url, data);
  }

  async get<T>(url: string, params?: any): Promise<T> {
    return this.client.get(url, { params });
  }
}

export const apiClient = new ApiClient();
```

### Parse Service
```typescript
// src/services/parse.service.ts
import { apiClient } from './api';
import { ParseRequest, ParseResponse } from '../types/api.types';

export const parseService = {
  async parseSources(request: ParseRequest): Promise<ParseResponse> {
    const formData = new FormData();

    if (request.text) {
      formData.append('text', request.text);
    }

    if (request.file) {
      formData.append('file', request.file);
    }

    if (request.format) {
      formData.append('format', request.format);
    }

    return apiClient.post<ParseResponse>('/parse', formData);
  },
};
```

### Validate Service
```typescript
// src/services/validate.service.ts
import { apiClient } from './api';
import { ValidateRequest, ValidateResponse } from '../types/api.types';

export const validateService = {
  async validateSources(request: ValidateRequest): Promise<ValidateResponse> {
    return apiClient.post<ValidateResponse>('/validate', request);
  },
};
```

### Report Service
```typescript
// src/services/report.service.ts
import { apiClient } from './api';
import { ReportResponse } from '../types/api.types';

export const reportService = {
  async generateReport(
    sessionId: string,
    format: 'json' | 'csv' | 'pdf'
  ): Promise<ReportResponse> {
    return apiClient.get<ReportResponse>(`/report/${sessionId}`, {
      format,
    });
  },

  async downloadReport(url: string, filename: string): Promise<void> {
    const response = await fetch(url);
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(link.href);
  },
};
```

## Custom Hooks

### useValidation Hook
```typescript
// src/hooks/useValidation.ts
import { useState, useCallback } from 'react';
import { parseService } from '../services/parse.service';
import { validateService } from '../services/validate.service';
import { ValidationSession, ValidationStatus, ParseRequest } from '../types';

export const useValidation = () => {
  const [status, setStatus] = useState<ValidationStatus>(ValidationStatus.IDLE);
  const [session, setSession] = useState<ValidationSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(async (request: ParseRequest) => {
    try {
      setStatus(ValidationStatus.PARSING);
      setError(null);

      // Step 1: Parse sources
      const parseResponse = await parseService.parseSources(request);

      setStatus(ValidationStatus.VALIDATING);

      // Step 2: Validate sources
      const validateResponse = await validateService.validateSources({
        sessionId: parseResponse.sessionId,
        sources: parseResponse.sources,
      });

      // Step 3: Build session object
      const newSession: ValidationSession = {
        sessionId: validateResponse.sessionId,
        sources: parseResponse.sources,
        results: validateResponse.results,
        summary: {
          totalSources: parseResponse.sources.length,
          validSources: validateResponse.results.filter(r => r.isValid).length,
          invalidSources: validateResponse.results.filter(r => !r.isValid).length,
          averageScore:
            validateResponse.results.reduce((sum, r) => sum + r.score, 0) /
            validateResponse.results.length,
          completedAt: new Date().toISOString(),
        },
      };

      setSession(newSession);
      setStatus(ValidationStatus.COMPLETED);

      return newSession;
    } catch (err: any) {
      setError(err.message || 'An error occurred during validation');
      setStatus(ValidationStatus.ERROR);
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus(ValidationStatus.IDLE);
    setSession(null);
    setError(null);
  }, []);

  return {
    validate,
    reset,
    status,
    session,
    error,
    isLoading: status === ValidationStatus.PARSING || status === ValidationStatus.VALIDATING,
  };
};
```

## Styling Guidelines

### Theme Configuration
```typescript
// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
    },
    success: {
      main: '#4caf50',
    },
    warning: {
      main: '#ff9800',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});
```

### Color Coding
```typescript
Valid sources: Green (#4caf50)
Invalid sources: Red (#f44336)
Warnings: Orange/Yellow (#ff9800)
In progress: Blue (#1976d2)
Neutral: Gray (#757575)
```

## User Flow

### Primary Flow
```
1. Landing Page
   ↓
2. Upload Form
   - Paste text OR upload file
   - Select citation format
   - Click "Validate"
   ↓
3. Loading State
   - "Parsing sources..."
   - "Validating sources..."
   ↓
4. Results Dashboard
   - View summary
   - Browse source list
   - Click on source for details
   ↓
5. Export Results
   - Choose format
   - Download report
   ↓
6. Done / Start New
```

### Error Handling
```
Upload error → Show error message, allow retry
Parse error → Show partial results, highlight issues
API error → Show friendly message, offer retry
Network error → Show offline message, cache data
```

## Responsive Design

### Breakpoints
```typescript
Mobile: 0-600px (xs)
Tablet: 600-960px (sm, md)
Desktop: 960px+ (lg, xl)
```

### Mobile Optimizations
- Single column layout
- Larger touch targets (min 44px)
- Bottom sheet for modals
- Swipe gestures for navigation
- Compressed data tables
- Collapsible sections

### Desktop Optimizations
- Multi-column layout
- Hover states
- Keyboard shortcuts
- Side panel for details
- Full data tables
- Sticky headers

## Performance Optimization

### Code Splitting
```typescript
// Lazy load pages
const UploadPage = lazy(() => import('./pages/UploadPage'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));

// Lazy load heavy components
const ValidationChart = lazy(() => import('./components/results/ValidationChart'));
```

### Caching Strategy
- Cache API responses with React Query
- Stale time: 5 minutes
- Cache time: 30 minutes
- Refetch on window focus: disabled

### Bundle Optimization
- Tree shaking
- Code splitting by route
- Lazy loading images
- Minification
- Gzip compression

Target Metrics:
- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Bundle size: <300 KB (gzipped)

## Testing Strategy

### Unit Tests
```typescript
// Component tests
- UploadForm renders correctly
- UploadForm validates input
- SourceCard displays data correctly
- ResultsDashboard calculates summary

// Hook tests
- useValidation handles API calls
- useValidation manages state correctly

// Service tests
- API client handles errors
- parseService formats requests correctly
```

### Integration Tests
```typescript
// User flow tests
- User can upload and validate sources
- User can view results
- User can export report
- User can handle errors gracefully
```

### E2E Tests (Cypress)
```typescript
describe('Source Validation Flow', () => {
  it('validates sources successfully', () => {
    cy.visit('/');
    cy.get('[data-testid="text-input"]').type('Sample citation...');
    cy.get('[data-testid="validate-btn"]').click();
    cy.get('[data-testid="results-dashboard"]').should('be.visible');
    cy.get('[data-testid="valid-count"]').should('contain', '1');
  });
});
```

## Build & Deployment

### Build Configuration
```json
// package.json scripts
{
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "build:dev": "REACT_APP_ENV=dev npm run build",
    "build:prod": "REACT_APP_ENV=prod npm run build",
    "test": "react-scripts test",
    "test:coverage": "react-scripts test --coverage --watchAll=false",
    "lint": "eslint src/**/*.{ts,tsx}",
    "format": "prettier --write src/**/*.{ts,tsx,css}"
  }
}
```

### Environment Variables
```bash
# .env.development
REACT_APP_API_URL=http://localhost:3000/dev
REACT_APP_ENV=development

# .env.production
REACT_APP_API_URL=https://api.yourdomain.com/prod
REACT_APP_ENV=production
```

### Deployment to S3
```bash
# Build production bundle
npm run build:prod

# Deploy via CDK (automatic)
# Or manually:
aws s3 sync build/ s3://your-frontend-bucket --delete
aws cloudfront create-invalidation --distribution-id DIST_ID --paths "/*"
```

## Future Enhancements
1. Dark mode toggle
2. User authentication (optional)
3. Save validation history
4. Collaborative features (team validation)
5. Browser extension for live capture
6. Mobile app (React Native)
7. Advanced filtering and search
8. Batch processing (multiple files)
9. Integration with reference managers (Zotero, Mendeley)
10. AI-powered source recommendations

## Next Steps
1. Review BACKEND_SPEC.md for API contract details
2. Set up development environment
3. Create basic components
4. Integrate with API
5. Add tests
6. Deploy to dev environment
