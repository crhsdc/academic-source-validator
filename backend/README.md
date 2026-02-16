# Backend Functions (AWS Lambda)

Backend implementation using AWS Lambda functions for the Source Validator application.

## Overview

This directory contains 4 serverless functions:
- **parse/** - Parse citations from text (Node.js/TypeScript)
- **validate/** - Validate sources (Node.js/TypeScript)
- **checkCitation/** - Check citation formats (Python)
- **generateReport/** - Generate reports (Node.js/TypeScript)
- **shared/** - Shared Lambda layer

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

Lambda functions are deployed automatically via AWS CDK from the infrastructure project.

```bash
cd ../infrastructure
npm run cdk:deploy:dev
```

## Function Details

### Parse Function
- **Runtime**: Node.js 20
- **Purpose**: Parse bibliography text and extract citations
- **Input**: Text with citations
- **Output**: Array of parsed sources with metadata
- **Database**: Writes to DynamoDB

### Validate Function
- **Runtime**: Node.js 20
- **Purpose**: Validate source URLs and credibility
- **Process**: Checks URL accessibility, domain credibility, scoring
- **Database**: Updates DynamoDB with validation results

### Check Citation Function
- **Runtime**: Python 3.12
- **Purpose**: Deep citation format validation
- **Supports**: APA, MLA, Chicago formats
- **Called by**: Validate function

### Generate Report Function
- **Runtime**: Node.js 20
- **Purpose**: Generate downloadable reports
- **Formats**: JSON, CSV, PDF (planned)
- **Storage**: Uploads reports to S3 with presigned URLs

## Local Testing

```bash
# Test with jest (Node.js functions)
cd parse && npm test

# Test Python function
cd checkCitation && python -m pytest
```

## Environment Variables

Set by CDK infrastructure:
- `DYNAMODB_TABLE` - DynamoDB table name
- `S3_BUCKET` - S3 bucket for files
- `ENVIRONMENT` - dev or prod
- `CROSSREF_API_URL` - CrossRef API endpoint
