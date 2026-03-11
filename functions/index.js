import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { File } from 'node:buffer';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import OpenAI from 'openai';

// Define config params
const openaiApiKey = defineString('OPENAI_API_KEY', { default: '' });
const openaiModel = defineString('OPENAI_MODEL', { default: 'gpt-4o-mini' });
const openaiModelPremium = defineString('OPENAI_MODEL_PREMIUM', { default: 'gpt-4o' });
const openaiMaxTokens = defineString('OPENAI_MAX_TOKENS', { default: '2000' });

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) {
    return next();
  }

  if (req.url === '/' || req.url.startsWith('/ai/') || req.url === '/health') {
    req.url = req.url === '/' ? '/api' : `/api${req.url}`;
  }

  next();
});

// Lazy-init OpenAI
let openai = null;
function getOpenAI() {
  if (openai) return openai;
  const key = openaiApiKey.value();
  if (!key) return null;
  openai = new OpenAI({ apiKey: key });
  return openai;
}

const selectModel = (tier = 'standard') => {
  if (tier === 'premium') return openaiModelPremium.value();
  return openaiModel.value();
};

const normalizeImportScalar = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (['n/a', 'na', 'none', 'unknown', 'null'].includes(text.toLowerCase())) return null;
  return text;
};

const normalizeImportDate = (value) => {
  const text = normalizeImportScalar(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const parseImportBool = (value) => {
  const text = normalizeImportScalar(value);
  if (!text) return null;
  const lowered = text.toLowerCase();
  if (['yes', 'y', 'true', '1'].includes(lowered)) return true;
  if (['no', 'n', 'false', '0'].includes(lowered)) return false;
  return null;
};

const splitResidentName = (fullName) => {
  const text = normalizeImportScalar(fullName);
  if (!text) return {};
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const splitPeople = (value) => {
  const text = normalizeImportScalar(value);
  if (!text) return [];
  return text
    .split(/\s*(?:&| and |\/|;|\|)\s*/i)
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseFieldValueCsvImport = (profileText) => {
  const parsed = {};
  const warnings = [];
  const lines = String(profileText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const commaIndex = line.indexOf(',');
    if (commaIndex === -1) continue;
    const rawField = line.slice(0, commaIndex).replace(/^"|"$/g, '').trim();
    const rawValue = line.slice(commaIndex + 1).replace(/^"|"$/g, '').trim();
    const field = rawField.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
    const value = normalizeImportScalar(rawValue);
    if (!value) continue;

    if (field === 'field' && rawValue.toLowerCase() === 'value') continue;

    switch (field) {
      case 'resident name': {
        const name = splitResidentName(value);
        if (name.firstName) parsed.firstName = name.firstName;
        if (name.lastName) parsed.lastName = name.lastName;
        break;
      }
      case 'age': {
        const n = Number(value);
        if (Number.isFinite(n) && n > 0) parsed.age = n;
        break;
      }
      case 'gender':
      case 'sex':
        parsed.sex = value;
        break;
      case 'dob':
      case 'date of birth':
        parsed.dob = normalizeImportDate(value) || parsed.dob || null;
        break;
      case 'address':
        parsed.address = value;
        break;
      case 'admission date':
        parsed.admissionDate = normalizeImportDate(value) || parsed.admissionDate || null;
        break;
      case 'placing agency':
      case 'placing agency county':
      case 'placement authority':
        parsed.placingAgencyCounty = value;
        parsed.placementAuthority = [value];
        break;
      case 'legal guardian':
      case 'guardian':
        parsed.legalGuardian = value;
        {
          const names = splitPeople(value);
          if (names[0] && !parsed.motherName && !parsed.mother?.name) {
            parsed.motherName = names[0];
          }
          if (names[1] && !parsed.fatherName && !parsed.father?.name) {
            parsed.fatherName = names[1];
          }
        }
        break;
      case 'guardian relationship':
        parsed.guardianRelationship = value;
        break;
      case 'guardian contact':
        parsed.guardianContact = value;
        break;
      case 'guardian phone':
      case 'legal guardian phone':
        parsed.guardianPhone = value;
        break;
      case 'guardian email':
      case 'legal guardian email':
        parsed.guardianEmail = value;
        break;
      case 'probation officer':
        parsed.probationOfficer = value;
        break;
      case "mother's name":
      case 'mother name':
      case 'mother':
        parsed.motherName = value;
        parsed.mother = {
          ...(typeof parsed.mother === 'object' && parsed.mother ? parsed.mother : {}),
          name: value,
        };
        break;
      case "mother's phone":
      case 'mother phone':
        parsed.motherPhone = value;
        parsed.mother = {
          ...(typeof parsed.mother === 'object' && parsed.mother ? parsed.mother : {}),
          phone: value,
        };
        break;
      case "father's name":
      case 'father name':
      case 'father':
        parsed.fatherName = value;
        parsed.father = {
          ...(typeof parsed.father === 'object' && parsed.father ? parsed.father : {}),
          name: value,
        };
        break;
      case "father's phone":
      case 'father phone':
        parsed.fatherPhone = value;
        parsed.father = {
          ...(typeof parsed.father === 'object' && parsed.father ? parsed.father : {}),
          phone: value,
        };
        break;
      case 'next of kin':
      case 'next of kin name':
        parsed.nextOfKinName = value;
        parsed.nextOfKin = {
          ...(typeof parsed.nextOfKin === 'object' && parsed.nextOfKin ? parsed.nextOfKin : {}),
          name: value,
        };
        break;
      case 'next of kin relationship':
        parsed.nextOfKinRelationship = value;
        parsed.nextOfKin = {
          ...(typeof parsed.nextOfKin === 'object' && parsed.nextOfKin ? parsed.nextOfKin : {}),
          relationship: value,
        };
        break;
      case 'next of kin phone':
        parsed.nextOfKinPhone = value;
        parsed.nextOfKin = {
          ...(typeof parsed.nextOfKin === 'object' && parsed.nextOfKin ? parsed.nextOfKin : {}),
          phone: value,
        };
        break;
      case 'attorney':
        parsed.attorney = value;
        break;
      case 'judge':
        parsed.judge = value;
        break;
      case 'current medications':
      case 'medications':
        parsed.medicalRestrictions = value;
        warnings.push('Current medications mapped to medical restrictions due to schema limitations.');
        break;
      case 'health conditions':
      case 'medical conditions':
        parsed.medicalConditions = value;
        break;
      case 'last school attended':
      case 'current school':
        parsed.currentSchool = value;
        break;
      case 'grade':
      case 'current grade':
        parsed.grade = value;
        break;
      case 'iep': {
        const bool = parseImportBool(value);
        if (bool !== null) parsed.hasIEP = bool;
        break;
      }
      case 'physical markers':
      case 'tattoos/scars':
      case 'tattoos and scars':
        parsed.tattoosScars = value;
        break;
      default:
        break;
    }
  }

  if (warnings.length > 0) parsed.warnings = warnings;
  return parsed;
};

const mergeParsedProfileData = (aiParsed, deterministicParsed) => {
  const merged = { ...(aiParsed || {}) };
  for (const [key, value] of Object.entries(deterministicParsed || {})) {
    if (value === null || value === undefined) continue;
    merged[key] = value;
  }
  return merged;
};

// AI Usage tracking
let aiUsageStats = {
  totalRequests: 0, successfulRequests: 0, failedRequests: 0,
  totalTokens: 0, lastUsed: null, errors: []
};

const logAIUsage = (success, tokens = 0, error = null) => {
  aiUsageStats.totalRequests++;
  if (success) {
    aiUsageStats.successfulRequests++;
    aiUsageStats.totalTokens += tokens;
  } else {
    aiUsageStats.failedRequests++;
    if (error) {
      aiUsageStats.errors.push({ timestamp: new Date().toISOString(), error: error.message || error, code: error.code || 'unknown' });
      if (aiUsageStats.errors.length > 10) aiUsageStats.errors = aiUsageStats.errors.slice(-10);
    }
  }
  aiUsageStats.lastUsed = new Date().toISOString();
};

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const parseJSONContent = (rawContent = '{}') => {
  const cleaned = String(rawContent || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) return {};

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('AI returned an invalid JSON payload');
  }
};

const mapAIError = (error, fallbackMessage) => {
  const errorCode = error?.code || error?.error?.code;
  const statusCode = error?.status || error?.statusCode || error?.response?.status;

  if (errorCode === 'insufficient_quota') {
    return { status: 402, message: 'OpenAI API quota exceeded', code: errorCode, retryable: false };
  }
  if (errorCode === 'invalid_api_key') {
    return { status: 401, message: 'Invalid OpenAI API key', code: errorCode, retryable: false };
  }
  if (statusCode === 429 || errorCode === 'rate_limit_exceeded') {
    return { status: 429, message: 'OpenAI rate limit exceeded. Try again shortly.', code: errorCode, retryable: true };
  }
  if (errorCode === 'model_not_found') {
    return { status: 400, message: 'Configured OpenAI model was not found', code: errorCode, retryable: false };
  }
  if (statusCode >= 500) {
    return { status: 503, message: 'OpenAI service temporarily unavailable', code: errorCode, retryable: true };
  }

  return {
    status: statusCode && statusCode >= 400 ? statusCode : 500,
    message: error?.message || fallbackMessage,
    code: errorCode || 'ai_request_failed',
    retryable: false,
  };
};

const handleAIError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  logAIUsage(false, 0, error);
  const mapped = mapAIError(error, fallbackMessage);
  return res.status(mapped.status).json({
    error: mapped.message,
    code: mapped.code,
    retryable: mapped.retryable,
    fallback: true,
  });
};

async function completeTextPrompt({
  tier = 'standard',
  systemPrompt,
  userPrompt,
  maxTokens = 800,
  temperature = 0.2,
}) {
  const client = getOpenAI();
  if (!client) return { unavailable: true };

  const completion = await client.chat.completions.create({
    model: selectModel(tier),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
  });

  logAIUsage(true, completion.usage?.total_tokens || 0);
  return {
    content: completion.choices[0]?.message?.content || '',
    usage: completion.usage,
    model: completion.model,
  };
}

async function completeJSONPrompt({
  tier = 'standard',
  systemPrompt,
  userPrompt,
  maxTokens = 800,
  temperature = 0.2,
}) {
  const client = getOpenAI();
  if (!client) return { unavailable: true };

  const completion = await client.chat.completions.create({
    model: selectModel(tier),
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
    response_format: { type: 'json_object' },
  });

  const parsed = parseJSONContent(completion.choices[0]?.message?.content || '{}');
  logAIUsage(true, completion.usage?.total_tokens || 0);
  return {
    parsed,
    usage: completion.usage,
    model: completion.model,
  };
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'firestore', timestamp: new Date().toISOString() });
});

// AI Report Summarization
app.post('/api/ai/summarize-report', async (req, res) => {
  try {
    if (!req.body || !req.body.youth || !req.body.reportType) {
      return res.status(400).json({ error: 'Missing required fields: youth, reportType' });
    }
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI service not configured', fallback: true });

    const { youth, reportType, period, data } = req.body;
    const prompt = generateAIPrompt(youth, reportType, period, data);

    const completion = await client.chat.completions.create({
      model: selectModel('premium'),
      messages: [
        { role: 'system', content: `You are a professional clinical writer specializing in youth residential treatment reports. Generate comprehensive, evidence-based narratives that are appropriate for ${reportType} reports. Use clinical language while maintaining clarity. Focus on measurable outcomes, treatment progress, and professional recommendations.` },
        { role: 'user', content: prompt }
      ],
      max_tokens: parseInt(openaiMaxTokens.value()) || 2000,
      temperature: 0.3,
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ summary: completion.choices[0]?.message?.content || '', model: completion.model, usage: completion.usage });
  } catch (error) {
    console.error('AI summarization error:', error);
    logAIUsage(false, 0, error);
    if (error.code === 'insufficient_quota') return res.status(402).json({ error: 'OpenAI API quota exceeded', fallback: true });
    if (error.code === 'invalid_api_key') return res.status(401).json({ error: 'Invalid OpenAI API key', fallback: true });
    res.status(500).json({ error: 'AI service temporarily unavailable', fallback: true });
  }
});

// Behavioral Insights
app.post('/api/ai/behavioral-insights', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });

    const { behaviorData, youth, period } = req.body;
    const prompt = generateBehavioralInsightsPrompt(behaviorData, youth, period);

    const completion = await client.chat.completions.create({
      model: selectModel('standard'),
      messages: [
        { role: 'system', content: 'You are a data analyst specializing in behavioral statistics for youth residential treatment.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 800, temperature: 0.2,
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ insights: completion.choices[0]?.message?.content || '', usage: completion.usage });
  } catch (error) {
    console.error('Behavioral insights error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to generate behavioral insights', fallback: true });
  }
});

// AI Status
app.get('/api/ai/status', async (req, res) => {
  try {
    const client = getOpenAI();
    const models = { standard: openaiModel.value(), premium: openaiModelPremium.value() };
    if (!client) return res.json({ available: false, error: 'OpenAI API key not configured', configured: false, models });

    const test = await client.chat.completions.create({
      model: selectModel('standard'), messages: [{ role: 'user', content: 'Test' }], max_tokens: 1, temperature: 0,
    });

    res.json({ available: true, configured: true, model: test.model, models, status: 'operational', usage: aiUsageStats });
  } catch (error) {
    console.error('AI status check failed:', error);
    res.json({ available: false, configured: true, error: error.message, status: 'error', usage: aiUsageStats });
  }
});

// Enhance Report
app.post('/api/ai/enhance-report', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { reportContent, reportType, youth } = req.body;
    if (!reportContent) return res.status(400).json({ error: 'Report content is required' });

    const completion = await client.chat.completions.create({
      model: selectModel('premium'),
      messages: [
        { role: 'system', content: 'You are a professional clinical writer specializing in enhancing youth treatment reports.' },
        { role: 'user', content: `Please enhance this ${reportType} report for ${youth.firstName} ${youth.lastName}. Improve clarity, professionalism, and clinical accuracy.\n\nOriginal:\n${reportContent}\n\nEnhanced:` }
      ],
      max_tokens: parseInt(openaiMaxTokens.value()) || 2000, temperature: 0.3,
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ enhancedContent: completion.choices[0]?.message?.content || reportContent, usage: completion.usage });
  } catch (error) {
    console.error('Report enhancement error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to enhance report', fallback: true });
  }
});

// Summarize Note
app.post('/api/ai/summarize-note', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { noteContent, maxLength } = req.body;

    const completion = await client.chat.completions.create({
      model: selectModel('standard'),
      messages: [
        { role: 'system', content: 'Summarize case notes concisely while preserving critical information.' },
        { role: 'user', content: `Summarize in ${maxLength || 150} words or less:\n\n${noteContent}` }
      ],
      max_tokens: 500, temperature: 0.2,
    });

    const summary = completion.choices[0]?.message?.content || '';
    const keyPoints = summary.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'));
    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ summary, keyPoints, usage: completion.usage });
  } catch (error) {
    console.error('Note summarization error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to summarize note', fallback: true });
  }
});

// Analyze Note
app.post('/api/ai/analyze-note', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { noteContent, youth } = req.body;

    const completion = await client.chat.completions.create({
      model: selectModel('premium'),
      messages: [
        { role: 'system', content: 'Analyze case notes for sentiment, risk indicators, and recommended actions. Respond in JSON.' },
        { role: 'user', content: `Analyze for ${youth.firstName}:\n\n${noteContent}` }
      ],
      max_tokens: 800, temperature: 0.1, response_format: { type: "json_object" }
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ ...JSON.parse(completion.choices[0]?.message?.content || '{}'), usage: completion.usage });
  } catch (error) {
    console.error('Note analysis error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze note', fallback: true });
  }
});

// Categorize Incident
app.post('/api/ai/categorize-incident', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { description } = req.body;

    const completion = await client.chat.completions.create({
      model: selectModel('standard'),
      messages: [
        { role: 'system', content: 'Categorize incidents. Respond in JSON with: category, subcategory, severity, tags, confidence.' },
        { role: 'user', content: `Categorize:\n\n${description}` }
      ],
      max_tokens: 300, temperature: 0.1, response_format: { type: "json_object" }
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ ...JSON.parse(completion.choices[0]?.message?.content || '{}'), usage: completion.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to categorize incident', fallback: true });
  }
});

// Analyze Incident
app.post('/api/ai/analyze-incident', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { incidentData, historicalIncidents } = req.body;

    const completion = await client.chat.completions.create({
      model: selectModel('premium'),
      messages: [
        { role: 'system', content: 'Analyze incidents for patterns and triggers. Respond in JSON.' },
        { role: 'user', content: `Current: ${JSON.stringify(incidentData)}\nHistory: ${JSON.stringify(historicalIncidents?.slice(0, 10) || [])}` }
      ],
      max_tokens: 1000, temperature: 0.2, response_format: { type: "json_object" }
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ ...JSON.parse(completion.choices[0]?.message?.content || '{}'), usage: completion.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze incident', fallback: true });
  }
});

// Analyze Behavior
app.post('/api/ai/analyze-behavior', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { behaviorData } = req.body;
    const recent = behaviorData.slice(-30);
    const points = recent.map(d => d.totalPoints || 0);
    const avg = points.reduce((s, p) => s + p, 0) / points.length;

    const completion = await client.chat.completions.create({
      model: selectModel('standard'),
      messages: [
        { role: 'system', content: 'Analyze behavioral trends. Respond in JSON with: trends, predictions, recommendations.' },
        { role: 'user', content: `Points (${recent.length} days): ${points.join(', ')}\nAverage: ${avg.toFixed(1)}` }
      ],
      max_tokens: 800, temperature: 0.2, response_format: { type: "json_object" }
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ ...JSON.parse(completion.choices[0]?.message?.content || '{}'), usage: completion.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze behavior', fallback: true });
  }
});

// Query
app.post('/api/ai/query', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { question, context } = req.body;
    const isTextExpansion = context?.fieldType || context?.currentText;

    const completion = await client.chat.completions.create({
      model: selectModel(isTextExpansion ? 'premium' : 'standard'),
      messages: [
        { role: 'system', content: isTextExpansion ? 'Expand brief notes into professional clinical paragraphs.' : 'Help with clinical data analysis.' },
        { role: 'user', content: isTextExpansion ? question : `Question: "${question}"\nData: ${JSON.stringify(context)}` }
      ],
      max_tokens: isTextExpansion ? 300 : 1000, temperature: isTextExpansion ? 0.5 : 0.3,
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ answer: completion.choices[0]?.message?.content || '', usage: completion.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to process query', fallback: true });
  }
});

// Treatment Recommendations
app.post('/api/ai/treatment-recommendations', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { youth, progressData, assessmentData } = req.body;

    const completion = await client.chat.completions.create({
      model: selectModel('premium'),
      messages: [
        { role: 'system', content: 'Provide evidence-based, trauma-informed treatment recommendations. Respond in JSON.' },
        { role: 'user', content: `Youth: ${JSON.stringify(youth)}\nProgress: ${JSON.stringify(progressData)}\nAssessment: ${JSON.stringify(assessmentData)}` }
      ],
      max_tokens: 1500, temperature: 0.3, response_format: { type: "json_object" }
    });

    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ ...JSON.parse(completion.choices[0]?.message?.content || '{}'), usage: completion.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to generate recommendations', fallback: true });
  }
});

// Parse Youth Profile
app.post('/api/ai/parse-youth-profile', async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    const { profileText } = req.body;
    if (!profileText || !String(profileText).trim()) {
      return res.status(400).json({ error: 'Profile text is required' });
    }
    const deterministicParsed = parseFieldValueCsvImport(profileText);

    const extractionSchema = `{
  "firstName": string|null,
  "lastName": string|null,
  "dob": "YYYY-MM-DD"|null,
  "age": number|null,
  "sex": string|null,
  "race": string|null,
  "religion": string|null,
  "placeOfBirth": string|null,
  "socialSecurityNumber": string|null,
  "address": string|null,
  "height": string|null,
  "weight": string|null,
  "hairColor": string|null,
  "eyeColor": string|null,
  "tattoosScars": string|null,
  "admissionDate": "YYYY-MM-DD"|null,
  "level": number|null,
  "legalGuardian": string|{ "name": string|null, "relationship": string|null, "contact": string|null, "phone": string|null, "email": string|null }|null,
  "guardianRelationship": string|null,
  "guardianContact": string|null,
  "guardianPhone": string|null,
  "guardianEmail": string|null,
  "probationOfficer": string|{ "name": string|null, "contact": string|null, "phone": string|null }|null,
  "probationContact": string|null,
  "probationPhone": string|null,
  "mother": { "name": string|null, "phone": string|null }|null,
  "father": { "name": string|null, "phone": string|null }|null,
  "nextOfKin": { "name": string|null, "relationship": string|null, "phone": string|null }|null,
  "placingAgencyCounty": string|null,
  "caseworker": { "name": string|null, "phone": string|null }|null,
  "guardianAdLitem": { "name": string|null }|null,
  "attorney": string|null,
  "judge": string|null,
  "placementAuthority": string[]|null,
  "estimatedStay": string|null,
  "referralSource": string|null,
  "referralReason": string|null,
  "priorPlacements": string[]|null,
  "numPriorPlacements": string|null,
  "lengthRecentPlacement": string|null,
  "courtInvolvement": string[]|null,
  "currentSchool": string|null,
  "grade": string|null,
  "currentGrade": string|null,
  "hasIEP": boolean|null,
  "academicStrengths": string|null,
  "academicChallenges": string|null,
  "educationGoals": string|null,
  "schoolContact": string|null,
  "schoolPhone": string|null,
  "physician": string|null,
  "physicianPhone": string|null,
  "insuranceProvider": string|null,
  "policyNumber": string|null,
  "allergies": string|null,
  "medicalConditions": string|null,
  "medicalRestrictions": string|null,
  "currentDiagnoses": string|null,
  "diagnoses": string|null,
  "traumaHistory": string[]|null,
  "previousTreatment": string|null,
  "currentCounseling": string[]|null,
  "therapistName": string|null,
  "therapistContact": string|null,
  "sessionFrequency": string|null,
  "sessionTime": string|null,
  "selfHarmHistory": string[]|null,
  "lastIncidentDate": "YYYY-MM-DD"|null,
  "hasSafetyPlan": boolean|null,
  "onSubsystem": boolean|null,
  "pointsInCurrentLevel": number|null,
  "dailyPointsForPrivileges": number|null,
  "hyrnaRiskLevel": string|null,
  "hyrnaScore": number|string|null,
  "hyrnaAssessmentDate": "YYYY-MM-DD"|null,
  "warnings": string[],
  "confidence": number
}`;

    const completion = await client.chat.completions.create({
      model: selectModel('premium'),
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical data extraction specialist for a youth treatment profile system. ' +
            'Your responsibility is to map pasted profile text into the exact target fields with minimal mistakes. ' +
            'Do not invent values. Use null when unknown. Keep booleans as true/false, arrays as arrays, and dates as YYYY-MM-DD when possible. ' +
            'If a value is ambiguous, leave it null and add a warning. ' +
            'Return ONLY a valid JSON object using this schema: ' + extractionSchema
        },
        {
          role: 'user',
          content:
            `Extract all possible structured profile data from this text and map to the schema fields.\n\n` +
            `Profile text:\n${profileText}`
        }
      ],
      max_tokens: parseInt(openaiMaxTokens.value()) || 2000,
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0]?.message?.content || '';
    let parsedData = null;
    try {
      parsedData = JSON.parse(rawContent);
    } catch {
      // Some model responses may still include markdown code fences or prefix/suffix text.
      const cleaned = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        parsedData = JSON.parse(cleaned);
      } else {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          parsedData = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } else {
          throw new Error('AI returned an invalid JSON payload for profile parsing');
        }
      }
    }

    const mergedParsedData = mergeParsedProfileData(parsedData, deterministicParsed);
    logAIUsage(true, completion.usage?.total_tokens || 0);
    res.json({ parsedData: mergedParsedData, usage: completion.usage });
  } catch (error) {
    console.error('Parse youth profile error:', error);
    logAIUsage(false, 0, error);
    const errorCode = error?.code || error?.error?.code;
    const statusCode = error?.status || error?.statusCode;

    if (errorCode === 'insufficient_quota') {
      return res.status(402).json({ error: 'OpenAI API quota exceeded', fallback: true, code: errorCode });
    }
    if (errorCode === 'invalid_api_key') {
      return res.status(401).json({ error: 'Invalid OpenAI API key', fallback: true, code: errorCode });
    }
    if (statusCode === 429 || errorCode === 'rate_limit_exceeded') {
      return res.status(429).json({ error: 'OpenAI rate limit exceeded. Try again shortly.', fallback: true, code: errorCode });
    }
    if (errorCode === 'model_not_found') {
      return res.status(400).json({ error: 'Configured OpenAI model was not found', fallback: true, code: errorCode });
    }
    if (statusCode >= 500) {
      return res.status(503).json({ error: 'OpenAI service temporarily unavailable', fallback: true, code: errorCode });
    }

    res.status(500).json({
      error: error?.message || 'Failed to parse youth profile',
      fallback: true,
      code: errorCode || 'parse_failed',
    });
  }
});

app.post('/api/ai/query-stream', async (req, res) => {
  try {
    const { question, context } = req.body || {};
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required', code: 'question_required' });
    }

    const isTextExpansion = context?.fieldType || context?.currentText;
    const result = await completeTextPrompt({
      tier: isTextExpansion ? 'premium' : 'standard',
      systemPrompt: isTextExpansion
        ? 'Expand brief notes into professional clinical paragraphs.'
        : 'Help with clinical data analysis.',
      userPrompt: isTextExpansion
        ? question
        : `Question: "${question}"\nData: ${JSON.stringify(context || {})}`,
      maxTokens: isTextExpansion ? 420 : 1100,
      temperature: isTextExpansion ? 0.45 : 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    res.json({
      answer: result.content || '',
      usage: result.usage,
      model: result.model,
      cached: false,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to process streaming query');
  }
});

app.post('/api/ai/suggest-note', async (req, res) => {
  try {
    const { youthId, noteType, recentData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'Create clinically appropriate drafting suggestions for youth case notes.',
      userPrompt: `Generate structured case note drafting support.
Return JSON:
{
  "summary":"string",
  "keyPoints":["string"],
  "suggestedInterventions":["string"],
  "followUpItems":["string"]
}

Context:
- youthId: ${youthId || 'unknown'}
- noteType: ${noteType || 'case-note'}
- recentData: ${JSON.stringify(recentData || {}, null, 2)}`,
      maxTokens: 700,
      temperature: 0.25,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      suggestedInterventions: Array.isArray(parsed.suggestedInterventions) ? parsed.suggestedInterventions : [],
      followUpItems: Array.isArray(parsed.followUpItems) ? parsed.followUpItems : [],
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to suggest case note content');
  }
});

app.post('/api/ai/search', async (req, res) => {
  try {
    const { query, dataTypes, youthId, dateRange, limit = 10, contextData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'Act as a clinical search planner and semantic matcher for treatment documentation.',
      userPrompt: `Interpret and resolve this semantic search request.
Return JSON:
{
  "results":[{"type":"string","id":"string","relevance":0.0,"summary":"string","data":{}}],
  "queryPlan":{"intent":"string","suggestedFilters":["string"]},
  "notes":"string"
}
If no real dataset is supplied, return an empty results array and provide best filter guidance.

Request:
- query: ${query || ''}
- dataTypes: ${JSON.stringify(dataTypes || [])}
- youthId: ${youthId || 'any'}
- dateRange: ${JSON.stringify(dateRange || null)}
- contextData: ${JSON.stringify(contextData || null)}
- limit: ${limit}`,
      maxTokens: 900,
      temperature: 0.15,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    const results = Array.isArray(parsed.results) ? parsed.results.slice(0, limit) : [];
    res.json({
      results,
      queryPlan: parsed.queryPlan || { intent: 'general-search', suggestedFilters: [] },
      notes: parsed.notes || '',
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to process semantic search');
  }
});

app.post('/api/ai/youth-insights', async (req, res) => {
  try {
    const { youthId, analysisType, youth, contextData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'premium',
      systemPrompt: 'Summarize youth progress with balanced strengths, concerns, and pragmatic recommendations.',
      userPrompt: `Generate concise youth insights.
Return JSON:
{
  "summary":"string",
  "strengths":["string"],
  "concerns":["string"],
  "recommendations":["string"]
}

Inputs:
- youthId: ${youthId || youth?.id || 'unknown'}
- analysisType: ${analysisType || 'general'}
- youth: ${JSON.stringify(youth || {}, null, 2)}
- contextData: ${JSON.stringify(contextData || {}, null, 2)}`,
      maxTokens: 900,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to generate youth insights');
  }
});

app.post('/api/ai/incident-patterns', async (req, res) => {
  try {
    const { youthId, timeframe, incidentHistory } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'Identify repeat incident trends, trigger clusters, and prevention recommendations.',
      userPrompt: `Analyze incident patterns from historical records.
Return JSON:
{
  "patterns":[{"pattern":"string","frequency":0,"severity":"low|medium|high|critical","recommendation":"string"}],
  "triggers":["string"],
  "trends":"string"
}

Inputs:
- youthId: ${youthId || 'unknown'}
- timeframe: ${JSON.stringify(timeframe || null)}
- incidentHistory: ${JSON.stringify(incidentHistory || [], null, 2)}`,
      maxTokens: 900,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      trends: parsed.trends || 'No clear trend available.',
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to analyze incident patterns');
  }
});

app.post('/api/ai/assess-risk', async (req, res) => {
  try {
    const { youthId, assessmentData, historicalData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'premium',
      systemPrompt: 'Provide a trauma-informed risk stratification and intervention priorities.',
      userPrompt: `Assess youth risk profile from assessment and historical context.
Return JSON:
{
  "overallRisk":"low|moderate|high|very-high",
  "domains":{"domainName":{"score":0,"trend":"improving|stable|declining","recommendation":"string"}},
  "protectiveFactors":["string"],
  "riskFactors":["string"],
  "interventionPriorities":[{"priority":1,"domain":"string","target":"string","rationale":"string"}]
}

Inputs:
- youthId: ${youthId || 'unknown'}
- assessmentData: ${JSON.stringify(assessmentData || {}, null, 2)}
- historicalData: ${JSON.stringify(historicalData || {}, null, 2)}`,
      maxTokens: 1100,
      temperature: 0.15,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      overallRisk: parsed.overallRisk || 'moderate',
      domains: parsed.domains || {},
      protectiveFactors: Array.isArray(parsed.protectiveFactors) ? parsed.protectiveFactors : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      interventionPriorities: Array.isArray(parsed.interventionPriorities) ? parsed.interventionPriorities : [],
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to assess risk');
  }
});

app.post('/api/ai/suggest-interventions', async (req, res) => {
  try {
    const { assessmentData, youth } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'premium',
      systemPrompt: 'Recommend practical interventions with rationale and expected outcomes.',
      userPrompt: `Generate intervention suggestions from assessment profile.
Return JSON:
{"interventions":[{"intervention":"string","rationale":"string","expectedOutcome":"string","evidenceBase":"string","priority":"high|medium|low"}]}

Inputs:
- youth: ${JSON.stringify(youth || {}, null, 2)}
- assessmentData: ${JSON.stringify(assessmentData || {}, null, 2)}`,
      maxTokens: 900,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [],
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to suggest interventions');
  }
});

app.post('/api/ai/behavioral-warnings', async (req, res) => {
  try {
    const { youthId, recentData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'Detect early warning signs and classify urgency for staff follow-up.',
      userPrompt: `Evaluate early warning indicators from recent behavior data.
Return JSON:
{
  "warnings":[{"type":"string","severity":"low|medium|high","indicator":"string","recommendation":"string"}],
  "urgency":"routine|elevated|immediate"
}

Inputs:
- youthId: ${youthId || 'unknown'}
- recentData: ${JSON.stringify(recentData || {}, null, 2)}`,
      maxTokens: 750,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      urgency: parsed.urgency || 'routine',
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to evaluate behavioral warnings');
  }
});

app.post('/api/ai/intervention-effectiveness', async (req, res) => {
  try {
    const { youthId, interventionHistory, outcomeData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'Rank intervention effectiveness using available outcome signals and explain uncertainty.',
      userPrompt: `Assess intervention effectiveness.
Return JSON:
{
  "effectiveInterventions":[{"intervention":"string","effectiveness":0,"context":"string"}],
  "ineffectiveInterventions":["string"],
  "recommendations":["string"]
}

Inputs:
- youthId: ${youthId || 'unknown'}
- interventionHistory: ${JSON.stringify(interventionHistory || [], null, 2)}
- outcomeData: ${JSON.stringify(outcomeData || [], null, 2)}`,
      maxTokens: 850,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      effectiveInterventions: Array.isArray(parsed.effectiveInterventions) ? parsed.effectiveInterventions : [],
      ineffectiveInterventions: Array.isArray(parsed.ineffectiveInterventions) ? parsed.ineffectiveInterventions : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to analyze intervention effectiveness');
  }
});

app.post('/api/ai/compare-progress', async (req, res) => {
  try {
    const { youthId, comparisonCriteria, cohortData } = req.body || {};
    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'Provide benchmark-oriented interpretation while clearly noting missing comparative data.',
      userPrompt: `Compare youth progress to available benchmarks.
Return JSON:
{
  "comparison":"string",
  "benchmarks":[{"metric":"string","youthScore":0,"averageScore":0,"percentile":0}],
  "insights":["string"]
}

Inputs:
- youthId: ${youthId || 'unknown'}
- comparisonCriteria: ${JSON.stringify(comparisonCriteria || {}, null, 2)}
- cohortData: ${JSON.stringify(cohortData || [], null, 2)}`,
      maxTokens: 850,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      comparison: parsed.comparison || '',
      benchmarks: Array.isArray(parsed.benchmarks) ? parsed.benchmarks : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to compare progress');
  }
});

app.post('/api/ai/screen-referral', async (req, res) => {
  try {
    const { referralText } = req.body || {};
    if (!referralText || !String(referralText).trim()) {
      return res.status(400).json({ error: 'Referral text is required' });
    }

    const result = await completeTextPrompt({
      tier: 'standard',
      systemPrompt: `You are the Heartland Boys Home Referral Screening Engine.

MISSION: Run a 5-step screening process on the referral and return a structured JSON recommendation.

PROGRAM SCOPE
Heartland Group Home A provides: 24/7 monitoring (rooms and facility), on-site substance abuse counseling, on-site mental health counseling, on-site skill-building programs, medication management support.
Heartland does NOT provide: PRTF-level clinical containment or secure/locked programming, hands-on physical intervention (hands-off facility), 1:1 staffing as a standard baseline.

STEP 1 - PARSE + NORMALIZE
Extract key fields. Set null for missing data and add field name to missing_info array.
Fields to extract: youth basics (name, DOB/age, gender, county/jurisdiction, legal status), current placement + timeline (where now, how long, why moved), referral ask (treatment vs non-treatment, short vs long term), legal team (PO, PO phone, judge, attorney, GAL/CASA), family demographics and contacts (guardian names, relationships, address, city/state/zip, phone numbers, household context if explicitly stated), current placement contact details (facility name, address, city/state, phone number, contact person if explicitly stated), risk tools (YLS/CMI overall risk score, date completed, top drivers), safety risks (violence history, weapons, fire setting, elopement, gang, sexual behavior issues), clinical risks (psychosis, suicidality, recent hospitalization, med status/compliance), developmental (ASD/FASD/IQ/DD flags, IEP/504), substance use (substances, frequency, last use, UA history), family system (guardians, engagement, conflicts, contact restrictions), strengths + motivators, discharge constraints.

STEP 2 - HARD SCREENS
Auto-decline - set recommendation=DECLINE if ANY of these are explicitly present:
- Active gang involvement, affiliation, or credible current gang-related behavior/pressure
- Recent serious violence toward people/animals with pattern, escalation, weapon use, or predatory aggression that cannot be safely managed in a hands-off group home
- PRTF-level psychiatric profile: recent psych hospitalization/hold, active psychosis/hallucinations not stabilized, or severe suicidal behavior requiring intensive containment
- Any factor making 24/7 group home supervision without 1:1 staffing unsafe or operationally unmanageable

IMPORTANT nuances (do NOT auto-decline for these):
- Absconding/running away: assess context (frequency, duration, reasons, risk while gone). Leaving is straightforward in Lincoln/Omaha. Not an auto-decline.
- Prior detention: does NOT mean higher LOC is needed unless explicitly mandated OR there is a documented history of severe persistent non-compliance with MH/SA/medication interventions.
- General negative behavior, defiance, or attitude: expected in this population. Do not penalize.
- General mental health or substance abuse diagnoses: with on-site MH/SA counseling available, many therapeutic needs can be met directly.

Conditional flag - set screen_status=CONDITIONAL (NOT auto-decline) if:
- Suspected or diagnosed ASD/FASD/DD/IQ limitations are present -> flag for accommodation planning, confirm functioning level, school/IEP plan, and behavior support needs

STEP 3 - HOUSE-FIT CHECK
Evaluate fit_rating as STRONG, MIXED, or POOR based on:
- Peer contagion risk: will this youth escalate others (gang talk, defiance culture, sexually reactive behavior, intimidation)?
- Victimization risk: will this youth be targeted, bullied, or exploited by current residents?
- Operational fit: can staff manage predictable behaviors within group home schedule/level system without constant 1:1?
- Programming fit: can the youth tolerate structure, school, chores, groups, supervision, and correction?
- "What works" alignment: does referral indicate structure/consistency helps? Do they respond to firm limits?

STEP 4 - NEEDS-TO-SERVICES MATCH
Map needs into buckets: behavioral (defiance, aggression, impulsivity, authority issues), clinical (therapy type needed, medication management, crisis history), educational (IEP/504, classroom tolerance, credit recovery), family (contact plan, reunification feasibility, guardianship), substance (prevention vs active SUD needs, UA expectations). Assess whether each need is within Heartland scope and whether aggregate needs can be handled without turning placement into a clinical containment unit.

STEP 5 - DECISION
Apply exactly one recommendation label:
- INTERVIEW: Hard screens pass, fit is MIXED or STRONG, services can meet needs
- INTERVIEW_WITH_CONDITIONS: Hard screens pass but missing critical info or conditional flags require resolution first - list specific conditions that must be met
- DECLINE: Hard screen triggered, fit is clearly unsafe, or needs exceed scope

OUTPUT: Return ONLY valid JSON - no preamble, no markdown fences, no text outside the JSON object.

{
  "youth_profile": {
    "name": null,
    "dob": null,
    "age": null,
    "gender": null,
    "county": null,
    "legal_status": null
  },
  "legal_team": {
    "po": null,
    "po_phone": null,
    "judge": null,
    "attorney": null,
    "gal_casa": null
  },
  "family_contacts": {
    "guardians": [],
    "primary_contact": null,
    "relationship": null,
    "phone": null,
    "alternate_phone": null,
    "address": null,
    "city_state_zip": null,
    "demographics": []
  },
  "placement_request": {
    "type": null,
    "duration": null,
    "current_placement": null
  },
  "current_placement_contact": {
    "facility_name": null,
    "address": null,
    "city_state": null,
    "phone": null,
    "contact_name": null
  },
  "risk_summary": { "yls_score": null, "yls_date": null, "top_drivers": [] },
  "behavioral_flags": { "violence": null, "gang": null, "weapons": null, "elopement": null, "fire": null, "sexual_behavior": null },
  "clinical_flags": { "psychosis": null, "suicidality": null, "hospitalizations": null, "meds": null },
  "developmental_flags": { "asd_fasd_dd": null, "iq": null, "iep_504": null },
  "substance_flags": { "substances": null, "frequency": null, "last_use": null },
  "family_flags": { "guardians": null, "engagement": null, "contact_restrictions": null },
  "strengths": [],
  "barriers": [],
  "missing_info": [],
  "screen_status": "PASS",
  "fit_rating": "MIXED",
  "recommendation": "INTERVIEW",
  "conditions": [],
  "rationale_bullets": [],
  "questions_for_referral_source": []
}

RULES: Do not invent facts. Only use what is explicitly in the referral. If contact, address, demographic, or placement fields are present anywhere in the referral packet, extract them into the header objects above. If a hard-no item is explicitly present, recommendation MUST be DECLINE. If suspected but not explicit, set screen_status=CONDITIONAL and ask targeted questions. Be blunt, operational, specific. No moralizing.`,
      userPrompt: String(referralText).trim(),
      maxTokens: 2500,
      temperature: 0.1,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    res.json({
      screening: result.content || '',
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to screen referral');
  }
});

app.post('/api/ai/transcribe-audio', audioUpload.single('audio'), async (req, res) => {
  try {
    const client = getOpenAI();
    if (!client) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    const mimeType = req.file.mimetype || 'audio/webm';
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a')
      ? 'm4a'
      : mimeType.includes('ogg')
        ? 'ogg'
        : 'webm';

    const audioFile = new File([req.file.buffer], `recording.${ext}`, { type: mimeType });
    const transcription = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    });

    res.json({ transcript: transcription.text || '' });
  } catch (error) {
    return handleAIError(res, error, 'Transcription failed');
  }
});

app.post('/api/ai/organize-meeting-notes', async (req, res) => {
  try {
    const { transcript, youthName } = req.body || {};
    if (!transcript || !String(transcript).trim()) {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    const result = await completeJSONPrompt({
      tier: 'standard',
      systemPrompt: 'You organize Family Team Meeting transcripts into structured clinical documentation for a youth residential program. Return a JSON object with exactly these four keys: "attendees" (comma-separated list of names and roles mentioned), "objectives" (bullet points of stated meeting goals or purpose), "discussion" (clear paragraph summary of what was discussed), "actionItems" (numbered list of concrete next steps, responsibilities, or follow-ups). Be concise and professional. Do not use markdown formatting characters like ** or #. Plain prose only.',
      userPrompt: `Youth: ${youthName || 'Unknown'}\n\nMeeting transcript:\n${String(transcript).trim()}`,
      maxTokens: 1200,
      temperature: 0.2,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true });
    }

    const parsed = result.parsed || {};
    res.json({
      attendees: parsed.attendees || '',
      objectives: parsed.objectives || '',
      discussion: parsed.discussion || '',
      actionItems: parsed.actionItems || '',
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to organize meeting notes');
  }
});

// Catch-all
app.all('/api/*', (req, res) => {
  res.json({ message: 'Data operations are handled by Firestore client in the frontend', timestamp: new Date().toISOString() });
});

// Helper functions
function generateAIPrompt(youth, reportType, period, data) {
  const behaviorPoints = data?.behaviorPoints || [];
  const progressNotes = data?.progressNotes || [];
  const dailyRatings = data?.dailyRatings || [];
  const totalPoints = behaviorPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
  const avgPoints = behaviorPoints.length ? Math.round(totalPoints / behaviorPoints.length) : 0;
  const recentTrend = behaviorPoints.length > 5 ?
    (behaviorPoints.slice(-3).reduce((sum, p) => sum + (p.totalPoints || 0), 0) / 3) -
    (behaviorPoints.slice(0, 3).reduce((sum, p) => sum + (p.totalPoints || 0), 0) / 3) : 0;

  return `Generate a professional ${reportType} report for ${youth.firstName} ${youth.lastName}, age ${youth.age || 'N/A'}.
Admission: ${youth.admissionDate || 'N/A'}, Level: ${youth.level || 'N/A'}, Diagnoses: ${youth.currentDiagnoses || 'TBD'}
Period: ${period?.startDate || 'N/A'} to ${period?.endDate || 'N/A'}
Points: ${totalPoints} total, ${avgPoints} avg/day, ${behaviorPoints.length} entries
Trend: ${recentTrend > 0 ? 'Improving' : recentTrend < 0 ? 'Declining' : 'Stable'}
Notes: ${progressNotes.length} entries, Ratings: ${dailyRatings.length} entries`;
}

function generateBehavioralInsightsPrompt(behaviorData, youth) {
  const points = (behaviorData || []).map(d => d.totalPoints || 0);
  const avg = points.length ? points.reduce((s, p) => s + p, 0) / points.length : 0;
  const sorted = [...points].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const variance = points.reduce((s, p) => s + Math.pow(p - avg, 2), 0) / (points.length || 1);

  return `Analyze behavioral data for ${youth.firstName} ${youth.lastName}:
${points.length} entries, Avg: ${avg.toFixed(1)}, Median: ${median}, StdDev: ${Math.sqrt(variance).toFixed(1)}
Range: ${Math.min(...points)} - ${Math.max(...points)}, Recent: ${points.slice(-5).join(', ')}
Level: ${youth.level || 'N/A'}, Investment: ${youth.investmentLevel || 'N/A'}/5
Provide statistical insights, patterns, and recommendations.`;
}

// Export as Firebase Function
export const api = onRequest({ cors: true, maxInstances: 10 }, app);
