// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, resolve } from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// AI Usage tracking (in-memory for this session)
let aiUsageStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalTokens: 0,
  lastUsed: null,
  errors: []
};

// Helper function to log AI usage
const logAIUsage = (success, tokens = 0, error = null) => {
  aiUsageStats.totalRequests++;
  if (success) {
    aiUsageStats.successfulRequests++;
    aiUsageStats.totalTokens += tokens;
  } else {
    aiUsageStats.failedRequests++;
    if (error) {
      aiUsageStats.errors.push({
        timestamp: new Date().toISOString(),
        error: error.message || error,
        code: error.code || 'unknown'
      });
      // Keep only last 10 errors
      if (aiUsageStats.errors.length > 10) {
        aiUsageStats.errors = aiUsageStats.errors.slice(-10);
      }
    }
  }
  aiUsageStats.lastUsed = new Date().toISOString();
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    database: 'supabase',
    timestamp: new Date().toISOString()
  });
});

// AI Report Summarization Endpoint
app.post('/api/ai/summarize-report', async (req, res) => {
  try {
    // Validate request
    if (!req.body || !req.body.youth || !req.body.reportType) {
      return res.status(400).json({
        error: 'Missing required fields: youth, reportType'
      });
    }

    // Check if OpenAI is configured
    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI service not configured. Please set OPENAI_API_KEY environment variable.',
        fallback: true
      });
    }

    const { youth, reportType, period, data } = req.body;

    // Generate enhanced prompt based on report type and data
    const prompt = generateAIPrompt(youth, reportType, period, data);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional clinical writer specializing in youth residential treatment reports. Generate comprehensive, evidence-based narratives that are appropriate for ${reportType} reports. Use clinical language while maintaining clarity. Focus on measurable outcomes, treatment progress, and professional recommendations.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: 0.3, // Lower temperature for more consistent, professional output
    });

    const summary = completion.choices[0]?.message?.content || '';

    // Log successful usage
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      summary,
      model: completion.model,
      usage: completion.usage
    });

  } catch (error) {
    console.error('AI summarization error:', error);

    // Log failed usage
    logAIUsage(false, 0, error);

    // Provide specific error information
    if (error.code === 'insufficient_quota') {
      return res.status(402).json({
        error: 'OpenAI API quota exceeded. Please check your billing settings.',
        fallback: true
      });
    }

    if (error.code === 'invalid_api_key') {
      return res.status(401).json({
        error: 'Invalid OpenAI API key. Please check your configuration.',
        fallback: true
      });
    }

    res.status(500).json({
      error: 'AI service temporarily unavailable',
      fallback: true,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Enhanced AI insights endpoint
app.post('/api/ai/behavioral-insights', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI service not configured',
        fallback: true
      });
    }

    const { behaviorData, youth, period } = req.body;

    const prompt = generateBehavioralInsightsPrompt(behaviorData, youth, period);

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a behavioral analysis specialist for youth residential treatment. Provide professional, evidence-based insights about behavioral patterns and treatment recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    // Log successful usage
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      insights: completion.choices[0]?.message?.content || '',
      usage: completion.usage
    });

  } catch (error) {
    console.error('Behavioral insights error:', error);

    // Log failed usage
    logAIUsage(false, 0, error);

    res.status(500).json({
      error: 'Failed to generate behavioral insights',
      fallback: true
    });
  }
});

// AI Status Check endpoint
app.get('/api/ai/status', async (req, res) => {
  try {
    if (!openai) {
      return res.json({
        available: false,
        error: 'OpenAI API key not configured',
        configured: false
      });
    }

    // Test the OpenAI connection with a minimal request
    const testCompletion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 1,
      temperature: 0,
    });

    res.json({
      available: true,
      configured: true,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      status: 'operational',
      usage: aiUsageStats
    });

  } catch (error) {
    console.error('AI status check failed:', error);

    let errorMessage = 'Unknown error';
    if (error.code === 'insufficient_quota') {
      errorMessage = 'API quota exceeded';
    } else if (error.code === 'invalid_api_key') {
      errorMessage = 'Invalid API key';
    } else if (error.code === 'model_not_found') {
      errorMessage = 'Model not available';
    }

    res.json({
      available: false,
      configured: true,
      error: errorMessage,
      status: 'error',
      usage: aiUsageStats
    });
  }
});

// Report enhancement endpoint
app.post('/api/ai/enhance-report', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({
        error: 'OpenAI service not configured',
        fallback: true
      });
    }

    const { reportContent, reportType, youth } = req.body;

    if (!reportContent) {
      return res.status(400).json({
        error: 'Report content is required'
      });
    }

    const enhancementPrompt = `
Please enhance the following ${reportType} report for ${youth.firstName} ${youth.lastName}.
Improve clarity, professionalism, and clinical accuracy while maintaining all factual information.
Focus on:
1. Professional clinical language
2. Clear, evidence-based statements
3. Appropriate tone for ${reportType} audience
4. Logical flow and organization
5. Removal of redundancy

Original Report:
${reportContent}

Enhanced Report:`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional clinical writer specializing in enhancing youth treatment reports. Maintain all factual content while improving clarity, professionalism, and clinical accuracy.'
        },
        {
          role: 'user',
          content: enhancementPrompt
        }
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 2000,
      temperature: 0.3,
    });

    // Log successful usage
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      enhancedContent: completion.choices[0]?.message?.content || reportContent,
      originalLength: reportContent.length,
      enhancedLength: completion.choices[0]?.message?.content?.length || 0,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Report enhancement error:', error);

    // Log failed usage
    logAIUsage(false, 0, error);

    res.status(500).json({
      error: 'Failed to enhance report',
      fallback: true
    });
  }
});

// API Routes - All other data operations are handled by Supabase client in the frontend
app.all('/api/*', (req, res) => {
  res.json({
    message: 'API operations are handled by Supabase client in the frontend',
    supabaseUrl: process.env.VITE_SUPABASE_URL || 'Supabase URL not configured',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from the dist directory
const distPath = resolve('dist');
app.use(express.static(distPath));

// Serve the index.html for all non-API routes to support SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// Helper function to generate enhanced AI prompts
function generateAIPrompt(youth, reportType, period, data) {
  const behaviorPoints = data.behaviorPoints || [];
  const progressNotes = data.progressNotes || [];
  const dailyRatings = data.dailyRatings || [];

  const totalPoints = behaviorPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
  const avgPoints = behaviorPoints.length ? Math.round(totalPoints / behaviorPoints.length) : 0;
  const noteCount = progressNotes.length;

  // Calculate additional metrics
  const recentTrend = behaviorPoints.length > 5 ?
    (behaviorPoints.slice(-3).reduce((sum, p) => sum + p.totalPoints, 0) / 3) -
    (behaviorPoints.slice(0, 3).reduce((sum, p) => sum + p.totalPoints, 0) / 3) : 0;

  const ratingAvgs = dailyRatings.length ? {
    attitude: dailyRatings.reduce((sum, r) => sum + (r.attitude || 0), 0) / dailyRatings.length,
    peers: dailyRatings.reduce((sum, r) => sum + (r.peers || 0), 0) / dailyRatings.length,
    staff: dailyRatings.reduce((sum, r) => sum + (r.staff || 0), 0) / dailyRatings.length,
    chores: dailyRatings.reduce((sum, r) => sum + (r.chores || 0), 0) / dailyRatings.length,
    school: dailyRatings.reduce((sum, r) => sum + (r.school || 0), 0) / dailyRatings.length
  } : null;

  const basePrompt = `
Generate a professional ${reportType} report narrative for ${youth.firstName} ${youth.lastName}, a ${youth.age || 'N/A'} year old resident in our treatment facility.

YOUTH PROFILE:
- Admission Date: ${youth.admissionDate || 'Not provided'}
- Current Level: ${youth.level || 'Not specified'}
- Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || 'To be determined'}
- Legal Guardian: ${youth.legalGuardian || 'Not specified'}
- Has IEP: ${youth.hasIEP ? 'Yes' : 'No'}

REPORTING PERIOD: ${period?.startDate || 'Not specified'} to ${period?.endDate || 'Not specified'}

BEHAVIORAL DATA:
- Total behavior points earned: ${totalPoints}
- Daily average: ${avgPoints} points
- Number of data points: ${behaviorPoints.length}
- Recent trend: ${recentTrend > 0 ? 'Improving' : recentTrend < 0 ? 'Declining' : 'Stable'} (${recentTrend.toFixed(1)} point change)

DAILY RATINGS (Average scores out of 5):
${ratingAvgs ? `
- Attitude: ${ratingAvgs.attitude.toFixed(1)}
- Peer Interactions: ${ratingAvgs.peers.toFixed(1)}
- Staff Relations: ${ratingAvgs.staff.toFixed(1)}
- Chore Completion: ${ratingAvgs.chores.toFixed(1)}
- School Performance: ${ratingAvgs.school.toFixed(1)}
` : 'No daily ratings available for this period'}

PROGRESS NOTES: ${noteCount} documented entries during this period

TREATMENT CONTEXT:
- Academic Strengths: ${youth.academicStrengths || 'To be assessed'}
- Academic Challenges: ${youth.academicChallenges || 'To be assessed'}
- Trauma History: ${youth.traumaHistory?.length ? 'Documented concerns requiring trauma-informed care' : 'No documented trauma history'}
- Investment Level: ${youth.investmentLevel || 'Not rated'}/5
- Peer Interaction Rating: ${youth.peerInteraction || 'Not rated'}/5
`;

  // Add specific instructions based on report type
  switch (reportType) {
    case 'court':
      return basePrompt + `
Please generate a comprehensive court report that includes:
1. Current placement status and treatment progress
2. Behavioral achievements and areas for improvement
3. Educational progress and accommodations
4. Family engagement and discharge planning
5. Clinical recommendations for continued care
6. Risk assessment and safety considerations
7. Estimated timeline for treatment goals

Use formal language appropriate for court proceedings and focus on measurable outcomes and evidence-based treatment.`;

    case 'dpnWeekly':
    case 'dpnBiWeekly':
    case 'dpnMonthly':
      return basePrompt + `
Generate a comprehensive DPN (Discharge Planning Note) that covers:
1. Current clinical presentation and mental status
2. Progress toward treatment goals and objectives
3. Behavioral management and intervention strategies
4. Family therapy and support system engagement
5. Educational/vocational progress
6. Medication compliance and effectiveness (if applicable)
7. Risk factors and safety planning
8. Discharge planning activities and timeline
9. Recommendations for continued care

Format should be clinical and professional, suitable for treatment team review and insurance documentation.`;

    case 'progress':
    case 'progressMonthly':
      return basePrompt + `
Create a detailed progress evaluation that addresses:
1. Treatment goal achievement and measurement
2. Behavioral modification outcomes
3. Therapeutic intervention effectiveness
4. Educational and skill development progress
5. Family dynamics and engagement
6. Peer relationships and social skills development
7. Level advancement criteria and timeline
8. Barrier identification and intervention strategies
9. Updated treatment plan recommendations

Focus on measurable progress indicators and evidence-based outcomes.`;

    default:
      return basePrompt + `
Generate a comprehensive treatment summary that includes progress across all domains of care, current functioning level, and recommendations for continued treatment. Use professional clinical language appropriate for interdisciplinary team review.`;
  }
}

function generateBehavioralInsightsPrompt(behaviorData, youth, period) {
  const points = behaviorData.map(d => d.totalPoints || 0);
  const avg = points.reduce((sum, p) => sum + p, 0) / points.length;
  const trend = points.length > 1 ? points[points.length - 1] - points[0] : 0;

  return `
Analyze the behavioral data for ${youth.firstName} ${youth.lastName} and provide professional clinical insights:

BEHAVIORAL DATA ANALYSIS:
- Data points: ${points.length} entries
- Average daily points: ${avg.toFixed(1)}
- Overall trend: ${trend > 0 ? 'Improving' : trend < 0 ? 'Declining' : 'Stable'}
- Point range: ${Math.min(...points)} to ${Math.max(...points)}
- Recent performance: ${points.slice(-5).join(', ')} (last 5 entries)

YOUTH CONTEXT:
- Current Level: ${youth.level || 'Not specified'}
- Investment Level: ${youth.investmentLevel || 'Not rated'}/5
- Trauma History: ${youth.traumaHistory?.length ? 'Present' : 'None documented'}

Please provide:
1. Behavioral pattern analysis
2. Potential triggers and motivators
3. Treatment recommendations
4. Risk factors and protective factors
5. Prognosis for continued improvement

Keep response clinical and actionable for treatment planning.`;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Create HTTP server
const server = createServer(app);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Open http://localhost:${PORT} in your browser`);
  console.log(`🔗 Using Supabase for data operations`);
});