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
          content: 'You are a data analyst specializing in behavioral statistics for youth residential treatment. Focus on interpreting numerical data, calculating trends, identifying patterns in the statistics, and providing quantitative insights. Use the calculated statistics to support your analysis.'
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

// ============================================================================
// NEW AI ENDPOINTS - Enhanced Features
// ============================================================================

// Case Note Summarization
app.post('/api/ai/summarize-note', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { noteContent, maxLength } = req.body;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical documentation specialist. Summarize case notes concisely while preserving critical information, clinical observations, and action items.'
        },
        {
          role: 'user',
          content: `Summarize this case note in ${maxLength || 150} words or less. Include key points and action items.\n\nNote:\n${noteContent}`
        }
      ],
      max_tokens: 500,
      temperature: 0.2,
    });

    const summary = completion.choices[0]?.message?.content || '';

    // Extract key points and action items
    const keyPoints = summary.split('\n').filter(line => line.trim().startsWith('-') || line.trim().startsWith('•'));
    const actionItems = keyPoints.filter(point =>
      point.toLowerCase().includes('follow up') ||
      point.toLowerCase().includes('action') ||
      point.toLowerCase().includes('next')
    );

    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      summary,
      keyPoints,
      actionItems,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Note summarization error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to summarize note', fallback: true });
  }
});

// Case Note Content Analysis (Sentiment & Risk Detection)
app.post('/api/ai/analyze-note', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { noteContent, youth } = req.body;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical risk assessment specialist. Analyze case notes for sentiment, risk indicators, and recommended actions. Respond in JSON format with: sentiment (positive/neutral/concerning/critical), riskIndicators (array of {type, severity, description}), and suggestedActions (array of strings).'
        },
        {
          role: 'user',
          content: `Analyze this case note for ${youth.firstName}:\n\n${noteContent}`
        }
      ],
      max_tokens: 800,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      ...analysis,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Note analysis error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze note', fallback: true });
  }
});

// Incident Categorization
app.post('/api/ai/categorize-incident', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { description } = req.body;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an incident classification specialist. Categorize incidents into: Physical Aggression, Verbal Aggression, Property Damage, Self-Harm, Elopement, Substance Use, Policy Violation, or Other. Assign severity (low/medium/high/critical) and provide relevant tags. Respond in JSON format with: category, subcategory, severity, tags (array), confidence (0-1).'
        },
        {
          role: 'user',
          content: `Categorize this incident:\n\n${description}`
        }
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const categorization = JSON.parse(completion.choices[0]?.message?.content || '{}');
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      ...categorization,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Incident categorization error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to categorize incident', fallback: true });
  }
});

// Incident Pattern Analysis
app.post('/api/ai/analyze-incident', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { incidentData, youthId, historicalIncidents } = req.body;

    const prompt = `Analyze this incident and identify patterns, triggers, and recommendations.

Current Incident:
${JSON.stringify(incidentData, null, 2)}

Historical Incidents (last 10):
${JSON.stringify(historicalIncidents?.slice(0, 10) || [], null, 2)}

Provide analysis in JSON format with:
- severity: low/medium/high/critical
- category: primary incident type
- patterns: array of identified patterns
- triggers: array of potential triggers
- recommendations: array of intervention recommendations`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a behavioral pattern analyst for youth treatment. Identify patterns, triggers, and provide evidence-based recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      ...analysis,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Incident analysis error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze incident', fallback: true });
  }
});

// Behavioral Analysis and Predictions
app.post('/api/ai/analyze-behavior', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { youthId, behaviorData, timeframe } = req.body;

    const recentData = behaviorData.slice(-30); // Last 30 entries
    const points = recentData.map(d => d.totalPoints || 0);
    const avg = points.reduce((sum, p) => sum + p, 0) / points.length;

    const prompt = `Analyze behavioral trends and provide predictions.

Recent Behavior Data (${recentData.length} days):
Points: ${points.join(', ')}
Average: ${avg.toFixed(1)}

Provide analysis in JSON format with:
- trends: {overall: improving/stable/declining, shortTerm: string, longTerm: string}
- predictions: {nextWeekAverage: number, levelAdvancementLikelihood: number (0-100), concernAreas: array}
- recommendations: array of actionable recommendations`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a behavioral analyst specializing in youth treatment outcomes. Analyze trends and make data-driven predictions.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      ...analysis,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Behavior analysis error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze behavior', fallback: true });
  }
});

// Natural Language Query Interface
app.post('/api/ai/query', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { question, context } = req.body;

    // Determine if this is a text expansion request or data analysis request
    const isTextExpansion = context?.fieldType || context?.currentText;
    
    let systemPrompt, userPrompt;
    
    if (isTextExpansion) {
      // Text expansion mode - expand brief notes into paragraphs
      systemPrompt = 'You are a professional clinical writer. Your job is to take brief notes or keywords and expand them into clear, well-written paragraphs (2-3 sentences). Keep the original meaning and facts, just add appropriate structure and professional clinical language. Do not add information that was not implied in the original notes.';
      userPrompt = question;
    } else {
      // Data analysis mode - help with calculations, distributions, insights
      systemPrompt = 'You are a clinical data analyst and assistant. Help with data calculations, distributions, statistical analysis, and insights about youth treatment data. Provide clear, accurate answers with specific numbers and data points when available. If asked to perform calculations, show your work.';
      userPrompt = `Question: "${question}"

Available data:
${JSON.stringify(context, null, 2)}

Provide a clear, professional answer. If this involves calculations or data analysis, show the specific numbers and your reasoning.`;
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      max_tokens: isTextExpansion ? 300 : 1000,
      temperature: isTextExpansion ? 0.5 : 0.3,
    });

    const answer = completion.choices[0]?.message?.content || '';
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      answer,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Query error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to process query', fallback: true });
  }
});

// Treatment Recommendations
app.post('/api/ai/treatment-recommendations', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { youth, progressData, assessmentData } = req.body;

    const prompt = `Generate evidence-based treatment recommendations.

Youth Profile:
${JSON.stringify(youth, null, 2)}

Progress Data:
${JSON.stringify(progressData, null, 2)}

Assessment Data:
${JSON.stringify(assessmentData, null, 2)}

Provide in JSON format:
- recommendations: array of recommendation strings
- priorities: array of {area: string, priority: high/medium/low, rationale: string}
- narrative: comprehensive narrative summary`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a clinical treatment planning specialist. Provide evidence-based, trauma-informed treatment recommendations.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const recommendations = JSON.parse(completion.choices[0]?.message?.content || '{}');
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      ...recommendations,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Treatment recommendations error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to generate recommendations', fallback: true });
  }
});

// Parse Youth Profile from Text
app.post('/api/ai/parse-youth-profile', async (req, res) => {
  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const { profileText } = req.body;

    if (!profileText || typeof profileText !== 'string') {
      return res.status(400).json({ error: 'Profile text is required' });
    }

    const prompt = `Parse the following youth profile text and extract structured information. The text may contain labeled fields or be in paragraph form. Extract as much information as possible and return it in JSON format.

Profile Text:
${profileText}

Return a JSON object with the following structure (use null for missing fields):
{
  "firstName": string,
  "lastName": string,
  "dob": string (YYYY-MM-DD format),
  "age": number,
  "sex": string,
  "race": string,
  "religion": string,
  "placeOfBirth": string,
  "socialSecurityNumber": string,
  "address": string (full address as single string),
  "height": string,
  "weight": string,
  "hairColor": string,
  "eyeColor": string,
  "tattoosScars": string,
  "admissionDate": string (YYYY-MM-DD format),
  "level": number (1-5),
  "legalGuardian": string,
  "guardianRelationship": string,
  "guardianContact": string,
  "guardianPhone": string,
  "guardianEmail": string,
  "probationOfficer": string,
  "probationContact": string,
  "probationPhone": string,
  "placementAuthority": string,
  "estimatedStay": string,
  "referralSource": string,
  "referralReason": string,
  "priorPlacements": array of strings,
  "numPriorPlacements": string,
  "lengthRecentPlacement": string,
  "courtInvolvement": array of strings,
  "currentSchool": string,
  "grade": string,
  "hasIEP": boolean,
  "academicStrengths": string,
  "academicChallenges": string,
  "educationGoals": string,
  "schoolContact": string,
  "schoolPhone": string,
  "physician": string,
  "physicianPhone": string,
  "insuranceProvider": string,
  "policyNumber": string,
  "allergies": string,
  "medicalConditions": string,
  "medicalRestrictions": string,
  "currentDiagnoses": string,
  "traumaHistory": array of strings,
  "previousTreatment": string,
  "currentCounseling": array of strings,
  "therapistName": string,
  "therapistContact": string,
  "sessionFrequency": string,
  "sessionTime": string,
  "selfHarmHistory": array of strings,
  "lastIncidentDate": string,
  "hasSafetyPlan": boolean,
  "hyrnaRiskLevel": string,
  "hyrnaScore": number,
  "hyrnaAssessmentDate": string
}

Important:
- Extract dates in YYYY-MM-DD format
- Convert age to number if found
- Convert level to number (1-5) if found
- Arrays should contain strings
- Use null for any field not found in the text
- Be intelligent about parsing - look for common variations of field names`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a data extraction specialist for youth residential care profiles. Extract structured information from unstructured or semi-structured text accurately and comprehensively.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1, // Very low temperature for consistent extraction
      response_format: { type: "json_object" }
    });

    const parsedData = JSON.parse(completion.choices[0]?.message?.content || '{}');
    logAIUsage(true, completion.usage?.total_tokens || 0);

    res.json({
      parsedData,
      usage: completion.usage
    });

  } catch (error) {
    console.error('Parse youth profile error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ 
      error: 'Failed to parse youth profile', 
      fallback: true,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
  
  // Calculate additional statistics
  const median = [...points].sort((a, b) => a - b)[Math.floor(points.length / 2)];
  const variance = points.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / points.length;
  const stdDev = Math.sqrt(variance);

  return `
Analyze the behavioral data for ${youth.firstName} ${youth.lastName} with focus on statistical patterns and data-driven insights:

CALCULATED STATISTICS:
- Data points: ${points.length} entries
- Average daily points: ${avg.toFixed(1)}
- Median points: ${median.toFixed(1)}
- Standard deviation: ${stdDev.toFixed(1)}
- Overall trend: ${trend > 0 ? `+${trend.toFixed(1)} (Improving)` : trend < 0 ? `${trend.toFixed(1)} (Declining)` : 'Stable'}
- Point range: ${Math.min(...points)} to ${Math.max(...points)}
- Recent performance: ${points.slice(-5).join(', ')} (last 5 entries)
- Consistency: ${stdDev < 5 ? 'High' : stdDev < 10 ? 'Moderate' : 'Variable'}

YOUTH CONTEXT:
- Current Level: ${youth.level || 'Not specified'}
- Investment Level: ${youth.investmentLevel || 'Not rated'}/5
- Trauma History: ${youth.traumaHistory?.length ? 'Present' : 'None documented'}

Based on these calculations and data patterns, provide:
1. Statistical interpretation of behavioral trends
2. Data-driven pattern analysis (consistency, volatility, trajectory)
3. Quantitative comparison to expected performance
4. Evidence-based treatment recommendations
5. Measurable goals based on current data

Focus on data-driven insights and quantifiable observations.`;
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