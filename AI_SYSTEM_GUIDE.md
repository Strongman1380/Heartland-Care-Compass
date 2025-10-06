# AI System Guide - Heartland Care Compass

## Overview

The Heartland Care Compass application now includes a comprehensive AI system powered by OpenAI's GPT-4o-mini (standard) and GPT-4o (premium) models. This tiered setup provides intelligent data navigation, analysis, and content generation features designed specifically for youth treatment facilities while balancing quality and cost.

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [AI Features](#ai-features)
3. [Using the AI Service](#using-the-ai-service)
4. [AI Components](#ai-components)
5. [API Endpoints](#api-endpoints)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Setup & Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL_STANDARD=gpt-4o-mini  # Cost-effective default (falls back to OPENAI_MODEL if set)
OPENAI_MODEL_PREMIUM=gpt-4o        # Higher quality tier for complex narratives and recommendations
OPENAI_MAX_TOKENS=2000
```

### Getting an OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key to your `.env` file

### Model Information

**Standard Model: `gpt-4o-mini`**
- Cost-effective for high-volume usage
- Fast response times
- Excellent for summarization, classification, and structured analysis tasks
- Approximate cost: $0.15 per 1M input tokens, $0.60 per 1M output tokens

**Premium Model: `gpt-4o`**
- Higher reasoning depth for complex narratives and risk-sensitive analysis
- Recommended for court reports, clinical recommendations, and critical risk detection
- Approximate cost: $5.00 per 1M input tokens, $15.00 per 1M output tokens

---

## AI Features

### 1. **Data Navigation & Semantic Search**

Natural language interface for querying your data:

```typescript
// Example queries:
"Show me youth with declining behavioral trends this month"
"What interventions have been most effective for trauma cases?"
"Which youth are ready for level advancement?"
```

**Features:**
- Natural language understanding
- Context-aware responses
- Citations to specific data points
- Cross-reference multiple data sources

### 2. **Case Note Intelligence**

#### Summarization
Automatically summarize lengthy case notes while preserving critical information.

```typescript
import aiService from '@/services/aiService';

const summary = await aiService.summarizeCaseNote(noteContent, maxLength);
// Returns: { summary, keyPoints, actionItems }
```

#### Content Analysis
Analyze case notes for sentiment, risk indicators, and recommended actions.

```typescript
const analysis = await aiService.analyzeNoteContent(noteContent, youth);
// Returns: { sentiment, riskIndicators, suggestedActions }
```

**Sentiment Levels:**
- `positive`: Youth showing progress
- `neutral`: Stable, no concerns
- `concerning`: Issues requiring attention
- `critical`: Immediate intervention needed

### 3. **Incident Report Analysis**

#### Auto-Categorization
Automatically categorize and assess incident severity.

```typescript
const categorization = await aiService.categorizeIncident(description);
// Returns: { category, subcategory, severity, tags, confidence }
```

**Categories:**
- Physical Aggression
- Verbal Aggression
- Property Damage
- Self-Harm
- Elopement
- Substance Use
- Policy Violation
- Other

#### Pattern Detection
Identify patterns across multiple incidents.

```typescript
const analysis = await aiService.analyzeIncident(incidentData, youthId, historicalIncidents);
// Returns: { severity, category, patterns, triggers, recommendations }
```

### 4. **Behavioral Analysis & Predictions**

Analyze behavioral trends and predict outcomes.

```typescript
const prediction = await aiService.analyzeBehaviorTrends(youthId, behaviorData, timeframe);
// Returns: { trends, predictions, recommendations, interventionEffectiveness }
```

**Predictions Include:**
- Overall trend (improving/stable/declining)
- Next week average point prediction
- Level advancement likelihood
- Concern areas

### 5. **Risk Assessment Enhancement**

AI-powered risk assessment with intervention recommendations.

```typescript
const riskPrediction = await aiService.assessRisk(youthId, assessmentData, historicalData);
// Returns: { overallRisk, domains, protectiveFactors, riskFactors, interventionPriorities }
```

### 6. **Report Generation**

Generate comprehensive, professional reports.

```typescript
const report = await aiService.generateReport({
  youth,
  reportType: 'court', // or 'progress', 'dpn', etc.
  period: { startDate, endDate },
  data: { behaviorPoints, progressNotes, dailyRatings }
});
// Returns: { summary, sections, recommendations }
```

**Report Types:**
- Court Reports
- DPN (Discharge Planning Notes)
- Progress Evaluations
- Monthly Progress Reports

### 7. **Treatment Recommendations**

Evidence-based treatment recommendations.

```typescript
const recommendations = await aiService.generateTreatmentRecommendations(
  youth,
  progressData,
  assessmentData
);
// Returns: { recommendations, priorities, narrative }
```

---

## Using the AI Service

### Import the Service

```typescript
import aiService from '@/services/aiService';
```

### Check AI Service Status

```typescript
const status = await aiService.checkAIStatus();
console.log(status.available); // true/false
console.log(status.usage); // Usage statistics
```

### Error Handling

All AI service methods return an `AIResponse` object:

```typescript
interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
  usage?: {
    model?: string;
    tokens?: number;
  };
}
```

Example usage:

```typescript
const response = await aiService.summarizeCaseNote(content);

if (response.success && response.data) {
  // Use the data
  console.log(response.data.summary);
  console.log(`Used ${response.usage?.tokens} tokens`);
} else {
  // Handle error
  console.error(response.error);
  if (response.fallback) {
    // Service fell back to local processing
  }
}
```

---

## AI Components

### 1. AIQueryInterface

Natural language query interface for data navigation.

```tsx
import { AIQueryInterface } from '@/components/ai/AIQueryInterface';

<AIQueryInterface
  context={yourDataContext}
  placeholder="Ask me anything about your data..."
  suggestions={[
    "Show me youth with declining trends",
    "What are the most common incidents this week?"
  ]}
/>
```

### 2. AIAssistButton

Reusable AI assistant button for forms.

```tsx
import { AIAssistButton } from '@/components/ai/AIAssistButton';

<AIAssistButton
  youthId={youth.id}
  youth={youth}
  noteContent={formData.summary}
  onSummary={(summary) => setFormData({ ...formData, summary })}
  onAnalysis={(analysis) => handleAnalysis(analysis)}
/>
```

**Features:**
- Summarize content
- Analyze sentiment & risks
- Get writing suggestions
- Generate behavioral insights

---

## API Endpoints

All AI endpoints are prefixed with `/api/ai/`:

### Report Generation
```
POST /api/ai/summarize-report
Body: { youth, reportType, period, data }
Returns: { summary, model, usage }
```

### Behavioral Insights
```
POST /api/ai/behavioral-insights
Body: { behaviorData, youth, period }
Returns: { insights, usage }
```

### Case Note Summarization
```
POST /api/ai/summarize-note
Body: { noteContent, maxLength }
Returns: { summary, keyPoints, actionItems, usage }
```

### Note Analysis
```
POST /api/ai/analyze-note
Body: { noteContent, youth }
Returns: { sentiment, riskIndicators, suggestedActions, usage }
```

### Incident Categorization
```
POST /api/ai/categorize-incident
Body: { description }
Returns: { category, subcategory, severity, tags, confidence, usage }
```

### Incident Analysis
```
POST /api/ai/analyze-incident
Body: { incidentData, youthId, historicalIncidents }
Returns: { severity, category, patterns, triggers, recommendations, usage }
```

### Behavioral Analysis
```
POST /api/ai/analyze-behavior
Body: { youthId, behaviorData, timeframe }
Returns: { trends, predictions, recommendations, usage }
```

### Natural Language Query
```
POST /api/ai/query
Body: { question, context }
Returns: { answer, usage }
```

### Treatment Recommendations
```
POST /api/ai/treatment-recommendations
Body: { youth, progressData, assessmentData }
Returns: { recommendations, priorities, narrative, usage }
```

### Report Enhancement
```
POST /api/ai/enhance-report
Body: { reportContent, reportType, youth }
Returns: { enhancedContent, originalLength, enhancedLength, usage }
```

### Service Status
```
GET /api/ai/status
Returns: { available, configured, model, status, usage }
```

---

## Best Practices

### 1. **Token Management**

- Monitor token usage through `/api/ai/status`
- Use appropriate `max_tokens` settings
- Summarize large datasets before sending to AI

### 2. **Error Handling**

Always handle both success and error cases:

```typescript
const response = await aiService.queryData(question, context);

if (response.success) {
  // Success
  processData(response.data);
} else {
  // Error
  if (response.fallback) {
    // AI unavailable, using fallback
    toast.info('Using local processing');
  } else {
    toast.error(response.error);
  }
}
```

### 3. **Privacy & Security**

- **Never** send personally identifiable information (PII) without proper safeguards
- Use anonymization for research queries
- Implement proper access controls
- Review OpenAI's data usage policies

### 4. **Performance Optimization**

- Cache frequently requested analyses
- Batch similar requests
- Use appropriate timeouts
- Implement retry logic for transient failures

### 5. **User Experience**

- Show loading states
- Provide fallback options
- Display token/cost information to administrators
- Allow users to opt-out of AI features

---

## Troubleshooting

### AI Service Not Available

**Check:**
1. Is `OPENAI_API_KEY` set in `.env`?
2. Is the key valid? Test at `/api/ai/status`
3. Do you have sufficient quota?
4. Is the server running?

```bash
# Check server logs
npm run start
# Visit http://localhost:3000/api/ai/status
```

### Quota Exceeded

```
Error: OpenAI API quota exceeded
```

**Solution:**
1. Check your OpenAI billing dashboard
2. Add payment method or increase limits
3. The app will automatically fall back to local processing

### Invalid API Key

```
Error: Invalid OpenAI API key
```

**Solution:**
1. Verify key in `.env` file
2. Generate new key from OpenAI dashboard
3. Restart server after updating

### Slow Responses

**Optimization:**
1. Reduce `OPENAI_MAX_TOKENS` value
2. Use `gpt-4o-mini` instead of larger models
3. Implement caching for repeated queries
4. Batch multiple small requests

### Inconsistent Results

**Tips:**
1. Lower `temperature` for more consistent outputs (0.1-0.3)
2. Provide more specific context
3. Use structured prompts
4. Implement result validation

---

## Example Use Cases

### 1. Daily Staff Workflow

```typescript
// Morning briefing: Check youth needing attention
const warnings = await aiService.checkBehavioralWarnings(youthId, recentData);

// During documentation: Get AI assistance
<AIAssistButton
  youthId={youthId}
  youth={youth}
  noteContent={noteContent}
  onSuggestion={handleSuggestion}
/>

// End of day: Generate reports
const report = await aiService.generateReport({
  youth,
  reportType: 'progress',
  period: { startDate, endDate },
  data: dailyData
});
```

### 2. Clinical Review

```typescript
// Analyze trends across multiple youth
const comparison = await aiService.compareYouthProgress(youthId);

// Identify effective interventions
const effectiveness = await aiService.analyzeInterventionEffectiveness(
  youthId,
  interventionHistory,
  outcomeData
);

// Generate treatment recommendations
const recommendations = await aiService.generateTreatmentRecommendations(
  youth,
  progressData,
  assessmentData
);
```

### 3. Administrative Queries

```typescript
// Natural language data exploration
<AIQueryInterface
  context={allYouthData}
  suggestions={[
    "Which programs have the best outcomes?",
    "Show incident trends by month",
    "Identify youth at risk of regression"
  ]}
/>
```

---

## Cost Estimation

With `gpt-4o-mini`:

| Operation | Avg Tokens | Est. Cost |
|-----------|-----------|-----------|
| Case Note Summary | 500 | $0.0004 |
| Incident Analysis | 800 | $0.0006 |
| Behavioral Insights | 1000 | $0.0008 |
| Report Generation | 2000 | $0.0015 |
| Query Response | 600 | $0.0005 |

**Example Monthly Costs:**
- 50 reports/month: $0.08
- 200 case note summaries/month: $0.08
- 100 incident analyses/month: $0.06
- 500 queries/month: $0.25
- **Total: ~$0.50/month** for moderate usage

---

## Support

For issues or questions:
1. Check server logs: `npm run start`
2. Visit `/api/ai/status` for service health
3. Review OpenAI status: https://status.openai.com/
4. Contact your system administrator

---

## Future Enhancements

Planned features:
- [ ] Voice input for queries
- [ ] Automated alert generation
- [ ] Predictive discharge planning
- [ ] Multi-language support
- [ ] Custom model fine-tuning
- [ ] Integration with external research databases

---

**Last Updated:** 2025-10-02
**Model:** gpt-4o-mini
**Documentation Version:** 1.0
