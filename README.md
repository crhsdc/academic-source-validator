# Source Validator - Serverless Academic Citation Validator

A complete serverless application for validating academic sources and citations, built with AWS CDK, Lambda, and React.

## 🎯 Project Purpose

This application helps students and researchers validate their academic citations by:
- Parsing citations from bibliography text
- Checking URL accessibility
- Validating citation formats (APA, MLA, Chicago)
- Assessing domain credibility
- Generating validation reports

Perfect for academic papers, research projects, and citation management.

## 🏗️ Architecture

**Serverless AWS Architecture:**
- **Frontend**: React 18 + TypeScript, hosted on S3 + CloudFront
- **Backend**: 4 AWS Lambda functions (Node.js + Python)
- **API**: API Gateway REST API
- **Database**: DynamoDB with TTL
- **Storage**: S3 for file storage and reports
- **Infrastructure**: AWS CDK (TypeScript)
- **Monitoring**: CloudWatch + X-Ray

See [architecture diagrams](specs/) for visual representation.

## 📁 Project Structure

```
├── specs/              # Complete project specifications
├── infrastructure/     # AWS CDK infrastructure code
├── lambda/            # Lambda functions (Backend)
├── frontend/          # React application
├── PROJECT_OVERVIEW.md # Detailed overview
├── setup-projects.sh  # Project generation script
└── README.md          # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- AWS CLI configured
- AWS CDK CLI: `npm install -g aws-cdk`
- Python 3.12 (for one Lambda function)

### 1. Install Dependencies

```bash
# Infrastructure
cd infrastructure && npm install

# Lambda functions
cd ../lambda/parse && npm install
cd ../validate && npm install
cd ../generateReport && npm install
cd ../shared && npm install

# Python function
cd ../checkCitation
pip install -r requirements.txt

# Frontend
cd ../../frontend && npm install
```

### 2. Deploy to AWS

```bash
# Bootstrap CDK (first time only)
cd infrastructure
cdk bootstrap aws://YOUR-ACCOUNT-ID/us-east-1

# Deploy development environment
npm run cdk:deploy:dev

# Save the API URL from outputs!
```

### 3. Configure & Run Frontend

```bash
cd frontend

# Create environment file
cp .env.example .env.local

# Edit .env.local and add your API Gateway URL
# REACT_APP_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com/prod

# Run locally
npm start

# Build for production
npm run build

# Deploy to S3 (use bucket name from CDK outputs)
aws s3 sync build/ s3://YOUR-FRONTEND-BUCKET --delete
```

## 📚 Documentation

### Comprehensive Specifications
All located in the [`specs/`](specs/) directory:
- **[PROJECT_SPEC.md](specs/PROJECT_SPEC.md)** - Complete project overview
- **[INFRASTRUCTURE_SPEC.md](specs/INFRASTRUCTURE_SPEC.md)** - AWS CDK details
- **[BACKEND_SPEC.md](specs/BACKEND_SPEC.md)** - Lambda functions
- **[FRONTEND_SPEC.md](specs/FRONTEND_SPEC.md)** - React application
- **[README.md](specs/README.md)** - Specifications navigation

### Quick Reference
- **[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** - Setup and deployment guide
- **[infrastructure/README.md](infrastructure/README.md)** - CDK deployment
- **[lambda/README.md](lambda/README.md)** - Lambda functions
- **[frontend/README.md](frontend/README.md)** - React app

## 🎨 Architecture Diagrams

Two professional diagrams available in `specs/`:
1. **architecture-diagram.png** - Detailed flow diagram with labels
2. **aws-architecture-diagram.png** - Official AWS service icons

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Infrastructure** | AWS CDK (TypeScript) |
| **Frontend** | React 18, TypeScript, Material-UI |
| **Backend** | AWS Lambda (Node.js 20 + Python 3.12) |
| **API** | API Gateway (REST) |
| **Database** | DynamoDB |
| **Storage** | S3 |
| **CDN** | CloudFront |
| **Monitoring** | CloudWatch, X-Ray |

## 💰 Cost

### Free Tier (First 12 Months)
- **Estimated**: $0-2/month
- Perfect for student projects

### After Free Tier
- **Light usage** (1K validations/month): ~$5/month
- **Moderate usage** (10K validations/month): ~$15-25/month
- Auto-scales with demand

## ✨ Features

### Current (MVP)
- ✅ Parse citations from text
- ✅ Validate URL accessibility
- ✅ Check citation format (basic)
- ✅ Assess domain credibility
- ✅ Calculate validation score
- ✅ Generate JSON/CSV reports
- ✅ Multi-environment deployment
- ✅ CloudWatch monitoring

### Future Enhancements
- 📝 File upload support (.docx, .pdf)
- 📝 Advanced citation parsing (multiple formats)
- 📝 PDF report generation
- 📝 User authentication
- 📝 Save validation history
- 📝 Browser extension
- 📝 Integration with reference managers

## 🧪 Testing

```bash
# Infrastructure tests
cd infrastructure && npm test

# Lambda function tests
cd lambda/parse && npm test

# Frontend tests
cd frontend && npm test
```

## 📊 AWS Resources Created

- **1 DynamoDB Table** - Store validation sessions
- **2 S3 Buckets** - Frontend hosting + file storage
- **4 Lambda Functions** - Parse, Validate, CheckCitation, Report
- **1 Lambda Layer** - Shared dependencies
- **1 API Gateway** - REST API (3 endpoints)
- **1 CloudFront Distribution** - Global CDN
- **CloudWatch** - Logs, metrics, alarms
- **IAM Roles** - One per Lambda function

## 🔐 Security

- ✅ IAM roles with least privilege
- ✅ CORS configured properly
- ✅ S3 buckets private (except frontend via CloudFront)
- ✅ DynamoDB encryption at rest
- ✅ HTTPS-only via CloudFront
- ✅ API Gateway throttling
- ✅ CloudWatch alarms

## 🤝 Development

### Project was generated using:
- AWS CDK for infrastructure
- TypeScript for type safety
- Python for citation parsing
- React for modern UI
- Material-UI for components

### Key Design Decisions:
- **Serverless**: Zero server management, auto-scaling
- **TypeScript**: Type safety across stack
- **Multi-environment**: Separate dev/prod environments
- **CDK Constructs**: Reusable infrastructure components
- **Cost-optimized**: Pay only for what you use

## 📝 Environment Variables

### Infrastructure
Set in CDK stack:
- `DYNAMODB_TABLE` - Table name
- `S3_BUCKET` - File storage bucket
- `ENVIRONMENT` - dev or prod

### Frontend
Create `.env.local`:
```bash
REACT_APP_API_URL=https://your-api-url.execute-api.us-east-1.amazonaws.com/prod
```

## 🐛 Troubleshooting

### CDK Deploy Fails
- Check AWS credentials: `aws sts get-caller-identity`
- Ensure CDK is bootstrapped: `cdk bootstrap`
- Verify Node.js 18+: `node --version`

### Lambda Errors
- Check CloudWatch Logs
- Verify environment variables
- Ensure dependencies installed

### Frontend Can't Connect
- Verify API URL in `.env.local`
- Check CORS in API Gateway
- Inspect browser Network tab

## 📞 Support

- Review [specifications](specs/)
- Check [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
- Check AWS CloudWatch logs
- Verify CDK outputs

## 🎓 Learning Resources

- [AWS CDK Workshop](https://cdkworkshop.com/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## 📄 License

MIT License - Feel free to use for academic and personal projects.

## 🙏 Acknowledgments

Built as a student project for learning:
- AWS serverless architecture
- Infrastructure as Code (CDK)
- Modern web development
- Citation validation algorithms

## 🚀 Get Started Now!

```bash
# Clone and setup
cd infrastructure && npm install

# Deploy
npm run cdk:deploy:dev

# Start building!
```

---

**Made with ❤️ using AWS CDK, Lambda, and React**

**Perfect for:** Student projects | Academic tools | Learning serverless | AWS certification prep

**Total Setup Time:** 30 minutes | **Lines of Code:** 3,500+ | **Cost:** $0-15/month
