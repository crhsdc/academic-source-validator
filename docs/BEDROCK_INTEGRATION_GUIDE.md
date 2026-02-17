# AWS Bedrock Integration Guide

## How Simple It Is to Integrate Bedrock AI

This guide demonstrates how straightforward it is to add AI capabilities using AWS Bedrock to any serverless application.

---

## ⚡ Quick Summary

**Total Time**: ~30 minutes
**Lines of Code**: ~150 lines
**Cost**: ~$0.001 per request
**Difficulty**: ⭐⭐☆☆☆ (Easy)

---

## 📦 What You Need

```json
{
  "dependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.700.0"
  }
}
```

That's it! One npm package.

---

## 🚀 Step 1: Create Lambda Function (5 minutes)

### backend/aiAnalyze/index.ts

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Initialize Bedrock client - ONE LINE!
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });

export const handler = async (event) => {
  const { sources } = JSON.parse(event.body);

  // Analyze each source with AI
  const analyses = await Promise.all(
    sources.map(source => analyzeWithBedrock(source))
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ analyses }),
  };
};

async function analyzeWithBedrock(source) {
  // 1. Create your prompt
  const prompt = `Analyze this citation: ${source.citation}`;

  // 2. Prepare the request payload
  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  };

  // 3. Invoke Bedrock - THREE LINES!
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    body: JSON.stringify(payload),
  });

  const response = await bedrockClient.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));

  // 4. Parse and return
  return JSON.parse(result.content[0].text);
}
```

**That's literally it!** 40 lines of code to add AI to your app.

---

## 🔐 Step 2: Add IAM Permissions (2 minutes)

### infrastructure/lib/constructs/api-construct.ts

```typescript
// Grant Lambda permission to invoke Bedrock
aiAnalyzeFunction.addToRolePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['bedrock:InvokeModel'],
    resources: [
      `arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-haiku-*`,
    ],
  })
);
```

**That's it for permissions!** 8 lines of CDK code.

---

## 🌐 Step 3: Add API Endpoint (1 minute)

```typescript
// POST /analyze
const analyzeResource = restApi.root.addResource('analyze');
analyzeResource.addMethod(
  'POST',
  new LambdaIntegration(aiAnalyzeFunction)
);
```

**Done!** 5 lines to expose the AI endpoint.

---

## 💻 Step 4: Frontend Integration (10 minutes)

### React Component

```typescript
const handleGetAISuggestions = async () => {
  const response = await apiClient.post('/analyze', { sources });
  setAiAnalyses(response.data.analyses);
};

// Display AI suggestions
{aiAnalyses.map(analysis => (
  <Box key={analysis.sourceId}>
    <Typography>{analysis.analysis}</Typography>
    <List>
      {analysis.suggestions.map(s => <ListItem>{s}</ListItem>)}
    </List>
  </Box>
))}
```

**That's the entire frontend integration!** 15 lines of React code.

---

## 📊 Complete Implementation Summary

| Component | Lines of Code | Time |
|-----------|---------------|------|
| Lambda Function | ~40 | 5 min |
| IAM Permissions | ~8 | 2 min |
| API Endpoint | ~5 | 1 min |
| Frontend UI | ~15 | 10 min |
| Dependencies | 1 package | 1 min |
| **TOTAL** | **~70 lines** | **~20 min** |

---

## 💰 Cost Analysis

### Claude 3.5 Haiku Pricing
- **Input**: $1 per million tokens (~$0.25 per 250K tokens)
- **Output**: $5 per million tokens (~$1.25 per 250K tokens)

### Per Request (Average)
- Input tokens: ~200 (citation + prompt)
- Output tokens: ~300 (analysis + suggestions)
- **Cost per analysis**: ~$0.0016 (less than a penny!)

### Monthly Estimates
| Usage | Requests/Month | Cost |
|-------|---------------|------|
| Light | 100 | $0.16 |
| Medium | 1,000 | $1.60 |
| Heavy | 10,000 | $16.00 |

**Perfect for student projects!**

---

## 🎯 Key Advantages

### 1. **No Model Management**
- ✅ No model training
- ✅ No model hosting
- ✅ No GPU infrastructure
- ✅ No scaling concerns

### 2. **Pay-Per-Use**
- ✅ Only pay for actual API calls
- ✅ No monthly minimums
- ✅ No reserved capacity
- ✅ Automatic scaling

### 3. **Latest Models**
- ✅ Always up-to-date
- ✅ Claude 3.5, 3.7, 4.0 available
- ✅ Multiple model choices
- ✅ Easy to switch models

### 4. **Production-Ready**
- ✅ AWS reliability (99.9% SLA)
- ✅ Global availability
- ✅ Automatic retries
- ✅ Built-in monitoring

---

## 🔄 Available Models

```typescript
// Fast & Cheap (Perfect for most use cases)
const haiku = 'anthropic.claude-3-5-haiku-20241022-v1:0';

// Balanced (Better quality)
const sonnet = 'anthropic.claude-3-5-sonnet-20241022-v2:0';

// Best Quality (Most expensive)
const opus = 'anthropic.claude-opus-4-6-v1';

// Just change the modelId - that's it!
```

---

## 🚀 Deployment

```bash
# 1. Build Lambda
cd backend/aiAnalyze
npm install
npm run build

# 2. Deploy infrastructure
cd infrastructure
cdk deploy

# 3. Test
curl -X POST https://your-api.com/analyze \
  -d '{"sources":[{"citation":"..."}]}'

# Done! ✅
```

---

## 🎨 Real-World Example Output

**Input:**
```json
{
  "citation": "Smith, J. (2020). Climate Change. Science Journal."
}
```

**Output (in ~2 seconds):**
```json
{
  "sourceId": "123",
  "analysis": "This citation is incomplete and lacks several required elements for proper academic referencing.",
  "suggestions": [
    "Add volume and issue numbers (e.g., 45(3))",
    "Include page range (e.g., pp. 123-145)",
    "Specify the full journal name",
    "Add DOI or URL for digital accessibility",
    "Verify author's full name or initials consistency"
  ],
  "completeness": 45,
  "aiConfidence": 92
}
```

---

## 🎓 What Makes This Simple?

### Traditional AI Integration
```
❌ Train a model (weeks/months)
❌ Set up GPU infrastructure ($$$)
❌ Manage model versions
❌ Handle scaling and load balancing
❌ Monitor model drift
❌ Retrain periodically
```

### Bedrock Integration
```
✅ Import SDK (1 line)
✅ Call API (3 lines)
✅ Done!
```

---

## 🔧 Troubleshooting

### Common Issues

1. **"Model not found"**
   - Solution: Check model ID is correct
   - Use: `aws bedrock list-foundation-models`

2. **"Access Denied"**
   - Solution: Add IAM permission for `bedrock:InvokeModel`
   - Check: Model ARN in policy

3. **"Throttling"**
   - Solution: Models have default quotas
   - Request increase in AWS Service Quotas

### Enable Model Access

```bash
# Check if model access is granted
aws bedrock get-foundation-model \
  --model-identifier anthropic.claude-3-5-haiku-20241022-v1:0

# Status should be "ACTIVE"
```

---

## 📚 Additional Resources

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Anthropic Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Bedrock Pricing Calculator](https://aws.amazon.com/bedrock/pricing/)
- [Example Applications](https://github.com/aws-samples/amazon-bedrock-samples)

---

## 🎉 Conclusion

**Adding AI to your serverless app with Bedrock is THIS simple:**

1. Install one npm package
2. Write ~70 lines of code
3. Deploy with CDK
4. Done!

**No machine learning expertise required.**
**No infrastructure management needed.**
**Pay only for what you use.**
**Production-ready from day one.**

That's the power of AWS Bedrock! 🚀

---

**Project**: Academic Source Validator
**Integration Time**: 30 minutes
**Lines of Code**: ~150 total
**Monthly Cost**: $0.16 - $16 (usage-based)
**Difficulty**: ⭐⭐☆☆☆

---

## Quick Start Template

Want to add Bedrock to your project? Use this template:

```typescript
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

export async function callBedrock(prompt: string) {
  const command = new InvokeModelCommand({
    modelId: 'anthropic.claude-3-5-haiku-20241022-v1:0',
    body: JSON.stringify({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const response = await client.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.content[0].text;
}
```

**Copy, paste, and you're done!** ✨
