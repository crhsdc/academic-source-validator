# Security Policy

## Reporting Security Vulnerabilities

If you discover a security vulnerability in this project, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email details to the repository maintainers
3. Include steps to reproduce the vulnerability
4. Wait for acknowledgment before public disclosure

## Security Best Practices

This project implements the following security measures:

### Infrastructure
- ✅ IAM roles with least privilege principle
- ✅ Encryption at rest (DynamoDB, S3)
- ✅ HTTPS-only communication via CloudFront
- ✅ API Gateway throttling and rate limiting
- ✅ No hardcoded credentials or secrets
- ✅ Environment variables for configuration

### Code
- ✅ Input validation on all Lambda functions
- ✅ CORS properly configured
- ✅ SQL injection prevention (using DynamoDB DocumentClient)
- ✅ XSS prevention in frontend
- ✅ No sensitive data in logs
- ✅ Dependencies regularly updated

### Development
- ✅ `.env` files in `.gitignore`
- ✅ No AWS credentials in code
- ✅ No API keys committed
- ✅ Separate dev/prod environments

## Known Limitations

This is a student/educational project with these considerations:

1. **CORS**: Development uses `'*'` for simplicity. Production should restrict origins.
2. **Authentication**: No user authentication implemented. Add AWS Cognito for production.
3. **Rate Limiting**: Basic API Gateway throttling. Consider WAF for production.
4. **Input Size**: File uploads limited to 5MB. Adjust for production needs.
5. **Data Retention**: TTL set to 7 days. Adjust based on requirements.

## Secure Deployment Checklist

Before deploying to production:

- [ ] Update CORS origins in `infrastructure/lib/config/environment.ts`
- [ ] Enable CloudWatch alarms
- [ ] Set up AWS WAF rules
- [ ] Configure AWS Secrets Manager for sensitive data
- [ ] Enable CloudTrail for audit logging
- [ ] Review IAM permissions
- [ ] Set up backup policies
- [ ] Configure budget alerts
- [ ] Enable MFA for AWS account
- [ ] Review all environment variables

## Dependencies

We use automated tools to check for vulnerabilities:
- `npm audit` for Node.js dependencies
- `pip check` for Python dependencies
- Dependabot for automated updates (when enabled)

Run security checks:
```bash
# Node.js
cd infrastructure && npm audit
cd ../backend/parse && npm audit
cd ../frontend && npm audit

# Python
cd ../backend/checkCitation && pip check
```

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## License

This project is provided "as is" for educational purposes. Use in production at your own risk after proper security review.
