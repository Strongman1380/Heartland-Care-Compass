# AI Quick Start Guide

## Getting Started in 5 Minutes

### Step 1: Configure OpenAI API Key

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-your-actual-api-key-here
OPENAI_MODEL_STANDARD=gpt-4o-mini  # Cost-efficient default (falls back to OPENAI_MODEL if set)
OPENAI_MODEL_PREMIUM=gpt-4o        # Higher quality tier for complex workflows
OPENAI_MAX_TOKENS=2000
```

3. Restart your server:
```bash
npm run start
```

### Step 2: Verify AI Service

Visit http://localhost:3000/api/ai/status in your browser.

You should see:
```json
{
  "available": true,
  "configured": true,
  "model": "gpt-4o-mini",
  "models": {
    "standard": "gpt-4o-mini",
    "premium": "gpt-4o"
  },
  "status": "operational"
}
```

✅ **You're ready to use AI features!**

---

## Adding AI to Existing Components

### Add AI Query Interface to Dashboard

**File:** `src/pages/Dashboard.tsx`

```tsx
import { AIQueryInterface } from '@/components/ai/AIQueryInterface';

export default function Dashboard() {
  return (
    <div className="space-y-4">
      {/* Your existing dashboard content */}

      {/* Add AI Query Interface */}
      <AIQueryInterface
        suggestions={[
          "Show me youth with declining behavioral trends",
          "Which youth need clinical review this week?",
          "What are the most common incidents this month?"
        ]}
      />
    </div>
  );
}
```

### Add AI Assist to Case Notes

**File:** `src/components/notes/CaseNotes.tsx`

```tsx
import { AIAssistButton } from '@/components/ai/AIAssistButton';

// Inside your component, add the button near your form submit:
<div className="flex gap-2">
  <AIAssistButton
    youthId={youthId}
    youth={youth}
    noteContent={formData.summary}
    onSummary={(summary) => {
      setFormData({ ...formData, summary });
      toast.success('AI-generated summary inserted!');
    }}
    onSuggestion={(suggestion) => {
      // Handle AI suggestions
      if (suggestion.keyPoints) {
        setFormData({
          ...formData,
          summary: suggestion.keyPoints.join('\n')
        });
      }
    }}
  />

  <Button type="submit">Save Note</Button>
</div>
```

### Add AI Analysis to Incident Reports

**File:** `src/components/incidents/IncidentReportForm.tsx`

```tsx
import aiService from '@/services/aiService';
import { useState } from 'react';

// Add this function inside your component:
const analyzeIncidentWithAI = async () => {
  const response = await aiService.categorizeIncident(formData.description);

  if (response.success && response.data) {
    // Auto-fill categorization
    setFormData({
      ...formData,
      category: response.data.category,
      severity: response.data.severity,
      tags: response.data.tags
    });

    toast.success(`Incident categorized as ${response.data.category}`);
  }
};

// Add button near incident description field:
<Button
  type="button"
  onClick={analyzeIncidentWithAI}
  variant="outline"
>
  <Sparkles className="w-4 h-4 mr-2" />
  Analyze with AI
</Button>
```

### Add Behavioral Insights to Reports

**File:** `src/components/reports/MonthlyProgressReport.tsx`

```tsx
import aiService from '@/services/aiService';

const generateAIInsights = async () => {
  const response = await aiService.generateBehavioralInsights(
    behaviorData,
    youth,
    { startDate, endDate }
  );

  if (response.success && response.data) {
    // Insert insights into report
    setReportData({
      ...reportData,
      behavioralAnalysis: response.data
    });
  }
};

// Add button in your report builder:
<Button onClick={generateAIInsights}>
  Generate AI Insights
</Button>
```

---

## Example Use Cases

### 1. Smart Case Note Writing

```tsx
import { AIAssistButton } from '@/components/ai/AIAssistButton';

function CaseNoteForm() {
  const [noteContent, setNoteContent] = useState('');

  return (
    <div>
      <Textarea
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
        placeholder="Write your case note..."
      />

      <AIAssistButton
        youthId={youth.id}
        youth={youth}
        noteContent={noteContent}
        onSuggestion={(suggestion) => {
          // AI suggests content based on recent data
          setNoteContent(suggestion.summary);
        }}
        onAnalysis={(analysis) => {
          // Show risk indicators
          if (analysis.riskIndicators?.length > 0) {
            alert(`⚠️ ${analysis.riskIndicators.length} risk indicators detected`);
          }
        }}
      />
    </div>
  );
}
```

### 2. Incident Pattern Detection

```tsx
import aiService from '@/services/aiService';

async function checkIncidentPatterns(youthId: string) {
  const response = await aiService.identifyIncidentPatterns(youthId, {
    start: '2025-09-01',
    end: '2025-10-02'
  });

  if (response.success && response.data) {
    console.log('Patterns:', response.data.patterns);
    console.log('Triggers:', response.data.triggers);
    console.log('Trends:', response.data.trends);

    // Display in UI
    return response.data;
  }
}
```

### 3. Predictive Behavioral Analysis

```tsx
import aiService from '@/services/aiService';

async function predictBehavior(youthId: string, recentData: any[]) {
  const response = await aiService.analyzeBehaviorTrends(
    youthId,
    recentData,
    30 // Last 30 days
  );

  if (response.success && response.data) {
    const { trends, predictions } = response.data;

    // Show prediction
    alert(`
      Current Trend: ${trends.overall}
      Next Week Prediction: ${predictions.nextWeekAverage} points
      Level Advancement: ${predictions.levelAdvancementLikelihood}% likely
    `);
  }
}
```

### 4. Natural Language Queries

```tsx
import aiService from '@/services/aiService';

async function askQuestion(question: string, allData: any) {
  const response = await aiService.queryData(question, allData);

  if (response.success && response.data) {
    console.log('Answer:', response.data.answer);
    return response.data.answer;
  }
}

// Example queries:
askQuestion("Which youth need immediate clinical attention?", youthData);
askQuestion("What percentage of incidents involved aggression?", incidentData);
askQuestion("Show me the top 3 most effective interventions", interventionData);
```

---

## Integration Checklist

Use this checklist to add AI to your components:

### Case Notes Component
- [ ] Import `AIAssistButton` component
- [ ] Add summarization button
- [ ] Add content analysis feature
- [ ] Add writing suggestions
- [ ] Test with sample notes

### Incident Reports Component
- [ ] Import `aiService`
- [ ] Add auto-categorization
- [ ] Add pattern detection
- [ ] Add severity assessment
- [ ] Test with sample incidents

### Reports Component
- [ ] Import AI service
- [ ] Add behavioral insights generation
- [ ] Add treatment recommendations
- [ ] Add report enhancement
- [ ] Test report generation

### Dashboard
- [ ] Add `AIQueryInterface` component
- [ ] Configure context data
- [ ] Add relevant suggestions
- [ ] Test natural language queries

### Risk Assessment
- [ ] Add AI-powered predictions
- [ ] Add intervention suggestions
- [ ] Add risk factor analysis
- [ ] Test with historical data

---

## Testing Your AI Integration

### 1. Test AI Service Status

```bash
curl http://localhost:3000/api/ai/status
```

Expected response:
```json
{
  "available": true,
  "configured": true,
  "model": "gpt-4o-mini",
  "status": "operational"
}
```

### 2. Test Case Note Summarization

```bash
curl -X POST http://localhost:3000/api/ai/summarize-note \
  -H "Content-Type: application/json" \
  -d '{
    "noteContent": "Youth participated in group therapy today. Showed good engagement and shared feelings about recent family visit. Some frustration noted but used coping skills appropriately.",
    "maxLength": 50
  }'
```

### 3. Test Incident Categorization

```bash
curl -X POST http://localhost:3000/api/ai/categorize-incident \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Youth became verbally aggressive with peer during lunch. Raised voice and used profanity. No physical contact. Staff intervened and youth de-escalated within 5 minutes."
  }'
```

### 4. Test Natural Language Query

```bash
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What are the most common behavioral issues?",
    "context": { "incidents": [...], "notes": [...] }
  }'
```

---

## Common Patterns

### Pattern 1: AI-Enhanced Form Field

```tsx
function SmartTextField() {
  const [value, setValue] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');

  const getSuggestion = async () => {
    const response = await aiService.suggestCaseNoteContent(youthId, 'case-note');
    if (response.success) {
      setAiSuggestion(response.data.summary);
    }
  };

  return (
    <div>
      <Textarea value={value} onChange={(e) => setValue(e.target.value)} />

      {aiSuggestion && (
        <div className="mt-2 p-2 bg-blue-50 rounded">
          <p className="text-sm text-blue-900">AI Suggestion:</p>
          <p className="text-sm">{aiSuggestion}</p>
          <Button size="sm" onClick={() => setValue(aiSuggestion)}>
            Use This
          </Button>
        </div>
      )}

      <Button onClick={getSuggestion}>Get AI Suggestion</Button>
    </div>
  );
}
```

### Pattern 2: Real-time Risk Detection

```tsx
function RiskMonitor({ noteContent, youth }) {
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    const checkRisks = async () => {
      if (noteContent.length > 50) {
        const response = await aiService.analyzeNoteContent(noteContent, youth);
        if (response.success && response.data.riskIndicators) {
          setRisks(response.data.riskIndicators);
        }
      }
    };

    const debounced = setTimeout(checkRisks, 1000);
    return () => clearTimeout(debounced);
  }, [noteContent]);

  return (
    <div>
      {risks.length > 0 && (
        <Alert variant="warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Risk Indicators Detected</AlertTitle>
          <AlertDescription>
            {risks.map((risk, i) => (
              <div key={i}>
                • {risk.description} ({risk.severity})
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### Pattern 3: Progressive Enhancement

```tsx
function ReportGenerator() {
  const [useAI, setUseAI] = useState(true);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    aiService.checkAIStatus().then(setAiStatus);
  }, []);

  const generateReport = async () => {
    if (useAI && aiStatus?.available) {
      // Use AI generation
      const response = await aiService.generateReport({...});
      return response.data.summary;
    } else {
      // Fall back to local generation
      return generateLocalReport();
    }
  };

  return (
    <div>
      {aiStatus?.available && (
        <label>
          <input
            type="checkbox"
            checked={useAI}
            onChange={(e) => setUseAI(e.target.checked)}
          />
          Use AI Enhancement
        </label>
      )}

      <Button onClick={generateReport}>
        Generate Report {useAI && '✨'}
      </Button>
    </div>
  );
}
```

---

## Monitoring & Debugging

### Check Usage Statistics

```tsx
import { useEffect, useState } from 'react';
import aiService from '@/services/aiService';

function AIUsageMonitor() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const checkStats = async () => {
      const status = await aiService.checkAIStatus();
      setStats(status.usage);
    };

    checkStats();
    const interval = setInterval(checkStats, 60000); // Every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>AI Usage</h3>
      <p>Total Requests: {stats?.totalRequests}</p>
      <p>Successful: {stats?.successfulRequests}</p>
      <p>Failed: {stats?.failedRequests}</p>
      <p>Total Tokens: {stats?.totalTokens}</p>
      <p>Est. Cost: ${(stats?.totalTokens * 0.000002).toFixed(4)}</p>
    </div>
  );
}
```

### Debug Mode

Add this to your component to see detailed AI responses:

```tsx
const DEBUG_AI = true;

const callAI = async () => {
  const response = await aiService.queryData(question, context);

  if (DEBUG_AI) {
    console.group('AI Response');
    console.log('Success:', response.success);
    console.log('Data:', response.data);
    console.log('Usage:', response.usage);
    console.log('Tokens:', response.usage?.tokens);
    console.log('Model:', response.usage?.model);
    console.groupEnd();
  }

  return response;
};
```

---

## Next Steps

1. ✅ Configure API key
2. ✅ Test AI service status
3. ✅ Add AIQueryInterface to dashboard
4. ✅ Add AIAssistButton to case notes
5. ✅ Add incident analysis to incident reports
6. ✅ Test with real data
7. ✅ Monitor usage and costs
8. ✅ Train staff on AI features

---

## Support

- 📖 Full documentation: See `AI_SYSTEM_GUIDE.md`
- 🔧 Troubleshooting: Check server logs and `/api/ai/status`
- 💡 Feature requests: Add to project issues
- 🐛 Bug reports: Include AI response logs

---

**Ready to build? Start with one component at a time!**

The easiest starting point is adding the `AIQueryInterface` to your Dashboard - it requires no code changes to existing components and provides immediate value to users.
