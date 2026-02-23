// Import necessary modules
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { join, resolve } from 'path';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

// Tiered model selection offers cost-effective defaults with an optional premium tier
const modelTiers = {
  standard: process.env.OPENAI_MODEL_STANDARD || process.env.OPENAI_MODEL || 'gpt-4o-mini',
  premium: process.env.OPENAI_MODEL_PREMIUM || 'gpt-4o',
};

const selectModel = (tier = 'standard') => {
  if (tier === 'premium' && modelTiers.premium) {
    return modelTiers.premium;
  }
  return modelTiers[tier] || modelTiers.standard;
};

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

// AI runtime controls
const AI_CACHE_TTL_MS = (parseInt(process.env.AI_CACHE_TTL_SECONDS || '600', 10) || 600) * 1000;
const AI_CACHE_MAX_ITEMS = parseInt(process.env.AI_CACHE_MAX_ITEMS || '400', 10) || 400;
const AI_DAILY_REQUEST_LIMIT = parseInt(process.env.AI_DAILY_REQUEST_LIMIT || '1200', 10) || 1200;
const AI_DAILY_TOKEN_LIMIT = parseInt(process.env.AI_DAILY_TOKEN_LIMIT || '450000', 10) || 450000;
const AI_CLIENT_DAILY_REQUEST_LIMIT = parseInt(process.env.AI_CLIENT_DAILY_REQUEST_LIMIT || '250', 10) || 250;
const AI_CLIENT_DAILY_TOKEN_LIMIT = parseInt(process.env.AI_CLIENT_DAILY_TOKEN_LIMIT || '125000', 10) || 125000;

const aiResponseCache = new Map();
let globalDailyUsage = { day: new Date().toISOString().slice(0, 10), requests: 0, tokens: 0 };
const clientDailyUsage = new Map();

const HEARTLAND_CLINICAL_CONTEXT = `
You are assisting a youth residential treatment facility (Heartland Boys Home).
Use trauma-informed, strengths-based, clinically neutral language.
Base your analysis primarily on case notes and staff observations documented in the system.
When giving recommendations, be specific, measurable, and actionable.
Do not fabricate facts. If information is missing, state that clearly.
FORMATTING RULES: Do not use markdown formatting such as ** for bold, * for italics, or # for headers. Write in plain professional prose with no special formatting characters. Use paragraph breaks and simple labels like "SECTION NAME:" for structure.
`;

const getRequestId = () => `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const getClientKey = (req) => {
  const auth = req.headers.authorization || '';
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || 'unknown';
  const basis = auth ? `${ip}:${auth.slice(-24)}` : ip;
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 20);
};

const resetUsageIfNeeded = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (globalDailyUsage.day !== today) {
    globalDailyUsage = { day: today, requests: 0, tokens: 0 };
  }
};

const getClientUsage = (clientKey) => {
  const today = new Date().toISOString().slice(0, 10);
  const current = clientDailyUsage.get(clientKey);
  if (!current || current.day !== today) {
    const seeded = { day: today, requests: 0, tokens: 0 };
    clientDailyUsage.set(clientKey, seeded);
    return seeded;
  }
  return current;
};

const incrementRequestUsage = (req) => {
  resetUsageIfNeeded();
  const clientKey = getClientKey(req);
  const client = getClientUsage(clientKey);
  globalDailyUsage.requests += 1;
  client.requests += 1;
  clientDailyUsage.set(clientKey, client);
};

const incrementTokenUsage = (req, tokens = 0) => {
  if (!tokens || Number.isNaN(tokens)) return;
  resetUsageIfNeeded();
  const clientKey = getClientKey(req);
  const client = getClientUsage(clientKey);
  globalDailyUsage.tokens += tokens;
  client.tokens += tokens;
  clientDailyUsage.set(clientKey, client);
};

const enforceAILimits = (req, res, next) => {
  // Keep status endpoint available even during limit exhaustion.
  if (req.path === '/status') {
    return next();
  }

  resetUsageIfNeeded();
  const clientUsage = getClientUsage(getClientKey(req));

  if (globalDailyUsage.requests >= AI_DAILY_REQUEST_LIMIT || globalDailyUsage.tokens >= AI_DAILY_TOKEN_LIMIT) {
    return res.status(429).json({
      error: 'Daily AI usage limit reached. Please try again tomorrow.',
      code: 'daily_limit_reached',
      retryable: false,
      limits: {
        requests: AI_DAILY_REQUEST_LIMIT,
        tokens: AI_DAILY_TOKEN_LIMIT,
      },
    });
  }

  if (clientUsage.requests >= AI_CLIENT_DAILY_REQUEST_LIMIT || clientUsage.tokens >= AI_CLIENT_DAILY_TOKEN_LIMIT) {
    return res.status(429).json({
      error: 'Your AI usage limit was reached for today.',
      code: 'client_daily_limit_reached',
      retryable: false,
      limits: {
        requests: AI_CLIENT_DAILY_REQUEST_LIMIT,
        tokens: AI_CLIENT_DAILY_TOKEN_LIMIT,
      },
    });
  }

  incrementRequestUsage(req);
  return next();
};

const stableStringify = (value) => {
  const seen = new WeakSet();
  return JSON.stringify(value, (key, val) => {
    if (val && typeof val === 'object') {
      if (seen.has(val)) return undefined;
      seen.add(val);
      if (Array.isArray(val)) return val;
      return Object.keys(val).sort().reduce((acc, k) => {
        acc[k] = val[k];
        return acc;
      }, {});
    }
    return val;
  });
};

const buildCacheKey = (endpoint, payload) => {
  const digest = crypto.createHash('sha256').update(stableStringify(payload)).digest('hex');
  return `${endpoint}:${digest}`;
};

const getCached = (cacheKey) => {
  const cached = aiResponseCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt < Date.now()) {
    aiResponseCache.delete(cacheKey);
    return null;
  }
  return cached.value;
};

const setCached = (cacheKey, value, ttlMs = AI_CACHE_TTL_MS) => {
  if (!cacheKey) return;
  if (aiResponseCache.size >= AI_CACHE_MAX_ITEMS) {
    const firstKey = aiResponseCache.keys().next().value;
    if (firstKey) aiResponseCache.delete(firstKey);
  }
  aiResponseCache.set(cacheKey, {
    expiresAt: Date.now() + ttlMs,
    value,
  });
};

const safeJsonParse = (value, fallback = {}) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
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

const mapOpenAIError = (error) => {
  if (!error) {
    return { status: 500, code: 'unknown_error', message: 'Unknown AI error', retryable: false };
  }
  if (error.code === 'insufficient_quota') {
    return { status: 402, code: 'insufficient_quota', message: 'OpenAI quota exceeded. Update billing or reduce usage.', retryable: false };
  }
  if (error.code === 'invalid_api_key') {
    return { status: 401, code: 'invalid_api_key', message: 'OpenAI API key is invalid. Update OPENAI_API_KEY.', retryable: false };
  }
  if (error.code === 'rate_limit_exceeded') {
    return { status: 429, code: 'rate_limit_exceeded', message: 'OpenAI rate limit reached. Retry shortly.', retryable: true };
  }
  if (error.name === 'AbortError') {
    return { status: 408, code: 'request_timeout', message: 'AI request timed out. Retry with less input context.', retryable: true };
  }
  return {
    status: 500,
    code: error.code || 'ai_request_failed',
    message: error.message || 'AI request failed',
    retryable: true,
  };
};

const extractContextSnippets = (context, question, maxSnippets = 12) => {
  if (!context) return [];
  const snippets = [];

  const visit = (value, path = '') => {
    if (value == null) return;
    if (snippets.length > 800) return; // guard
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      const text = `${path}: ${String(value)}`.trim();
      if (text.length > 3) snippets.push(text.slice(0, 320));
      return;
    }
    if (Array.isArray(value)) {
      value.slice(0, 40).forEach((item, idx) => visit(item, `${path}[${idx}]`));
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value).slice(0, 50).forEach(([k, v]) => visit(v, path ? `${path}.${k}` : k));
    }
  };

  visit(context);

  const terms = (question || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = snippets.map((text) => {
    const lower = text.toLowerCase();
    const score = terms.reduce((sum, term) => sum + (lower.includes(term) ? 1 : 0), 0);
    return { text, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSnippets)
    .map((entry) => entry.text);
};

const buildClinicalPrompt = (taskPrompt, { json = false } = {}) => {
  const formatInstruction = json
    ? '\nReturn valid JSON only. Do not wrap with markdown.'
    : '\nReturn concise, professional plain text.';
  return `${HEARTLAND_CLINICAL_CONTEXT}\n${taskPrompt}${formatInstruction}`;
};

const aiCompletion = async ({
  req,
  endpoint,
  tier = 'standard',
  systemPrompt,
  userPrompt,
  maxTokens = 800,
  temperature = 0.2,
  json = false,
  cachePayload = null,
  cacheTtlMs = AI_CACHE_TTL_MS,
}) => {
  const requestId = getRequestId();
  if (!openai) {
    return {
      requestId,
      unavailable: true,
    };
  }

  const model = selectModel(tier);
  const cacheKey = cachePayload ? buildCacheKey(endpoint, { model, cachePayload }) : null;
  const cached = cacheKey ? getCached(cacheKey) : null;
  if (cached) {
    return {
      requestId,
      model,
      cached: true,
      ...cached,
    };
  }

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: maxTokens,
    temperature,
    ...(json ? { response_format: { type: 'json_object' } } : {}),
  });

  const content = completion.choices[0]?.message?.content || '';
  const usage = completion.usage || null;
  incrementTokenUsage(req, usage?.total_tokens || 0);
  logAIUsage(true, usage?.total_tokens || 0);

  const payload = {
    content,
    parsed: json ? safeJsonParse(content, {}) : null,
    usage,
  };
  if (cacheKey) {
    setCached(cacheKey, payload, cacheTtlMs);
  }

  return {
    requestId,
    model,
    cached: false,
    ...payload,
  };
};

// Create Express app
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/ai', enforceAILimits);

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

    const { youth, reportType, period, data } = req.body;
    const prompt = generateAIPrompt(youth, reportType, period, data);
    const result = await aiCompletion({
      req,
      endpoint: 'summarize-report',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        `Generate the actual content text for a report form. Do not describe the report type or explain what kind of report this is. Just write the narrative content that goes into the form fields. Base everything on the documented case notes provided. Do not use any markdown formatting (no ** or * or #). Write in plain professional prose.`
      ),
      userPrompt: prompt,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
      temperature: 0.25,
      cachePayload: { reportType, youthId: youth?.id, period, data },
      cacheTtlMs: 5 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({
        error: 'OpenAI service not configured. Please set OPENAI_API_KEY environment variable.',
        fallback: true,
        requestId: result.requestId,
      });
    }

    res.json({
      summary: result.content || '',
      model: result.model,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('AI summarization error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({
      error: mapped.message,
      code: mapped.code,
      retryable: mapped.retryable,
      fallback: true,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// Enhanced AI insights endpoint
app.post('/api/ai/behavioral-insights', async (req, res) => {
  try {
    const { behaviorData, youth, period } = req.body;

    const prompt = generateBehavioralInsightsPrompt(behaviorData, youth, period);
    const result = await aiCompletion({
      req,
      endpoint: 'behavioral-insights',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Analyze behavioral patterns from case notes and staff observations. Identify trends, areas of progress, and areas needing support. Write in plain text with no markdown formatting.'
      ),
      userPrompt: prompt,
      maxTokens: 900,
      temperature: 0.2,
      cachePayload: { youthId: youth?.id, period, behaviorData },
      cacheTtlMs: 4 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({
        error: 'OpenAI service not configured',
        fallback: true,
        requestId: result.requestId,
      });
    }

    res.json({
      insights: result.content || '',
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Behavioral insights error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({
      error: mapped.message,
      code: mapped.code,
      retryable: mapped.retryable,
      fallback: true,
    });
  }
});

// AI Status Check endpoint
app.get('/api/ai/status', async (req, res) => {
  try {
    resetUsageIfNeeded();
    const cacheStats = {
      items: aiResponseCache.size,
      maxItems: AI_CACHE_MAX_ITEMS,
      ttlSeconds: Math.floor(AI_CACHE_TTL_MS / 1000),
    };
    const limits = {
      global: { requests: AI_DAILY_REQUEST_LIMIT, tokens: AI_DAILY_TOKEN_LIMIT },
      perClient: { requests: AI_CLIENT_DAILY_REQUEST_LIMIT, tokens: AI_CLIENT_DAILY_TOKEN_LIMIT },
    };

    if (!openai) {
      return res.json({
        available: false,
        error: 'OpenAI API key not configured',
        configured: false,
        models: modelTiers,
        limits,
        dailyUsage: globalDailyUsage,
        cache: cacheStats,
      });
    }

    const healthModel = selectModel('standard');

    // Test the OpenAI connection with a minimal request
    const testCompletion = await openai.chat.completions.create({
      model: healthModel,
      messages: [{ role: 'user', content: 'Test' }],
      max_tokens: 1,
      temperature: 0,
    });

    res.json({
      available: true,
      configured: true,
      model: testCompletion.model || healthModel,
      models: modelTiers,
      status: 'operational',
      usage: aiUsageStats,
      limits,
      dailyUsage: globalDailyUsage,
      cache: cacheStats,
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
      models: modelTiers,
      usage: aiUsageStats,
      limits: {
        global: { requests: AI_DAILY_REQUEST_LIMIT, tokens: AI_DAILY_TOKEN_LIMIT },
        perClient: { requests: AI_CLIENT_DAILY_REQUEST_LIMIT, tokens: AI_CLIENT_DAILY_TOKEN_LIMIT },
      },
      dailyUsage: globalDailyUsage,
      cache: {
        items: aiResponseCache.size,
        maxItems: AI_CACHE_MAX_ITEMS,
        ttlSeconds: Math.floor(AI_CACHE_TTL_MS / 1000),
      },
    });
  }
});

// Report enhancement endpoint
app.post('/api/ai/enhance-report', async (req, res) => {
  try {
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

    const result = await aiCompletion({
      req,
      endpoint: 'enhance-report',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Improve clinical clarity and organization while preserving all facts. Never invent case details. Do not use any markdown formatting (no ** or * or #). Write in plain professional prose.'
      ),
      userPrompt: enhancementPrompt,
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
      temperature: 0.25,
      cachePayload: { reportType, youthId: youth?.id, reportContent },
      cacheTtlMs: 8 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({
        error: 'OpenAI service not configured',
        fallback: true,
        requestId: result.requestId,
      });
    }

    res.json({
      enhancedContent: result.content || reportContent,
      originalLength: reportContent.length,
      enhancedLength: result.content?.length || 0,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Report enhancement error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({
      error: mapped.message,
      code: mapped.code,
      retryable: mapped.retryable,
      fallback: true,
    });
  }
});

// ============================================================================
// NEW AI ENDPOINTS - Enhanced Features
// ============================================================================

// Case Note Summarization
app.post('/api/ai/summarize-note', async (req, res) => {
  try {
    const { noteContent, maxLength } = req.body;
    const result = await aiCompletion({
      req,
      endpoint: 'summarize-note',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Summarize a case note into clear highlights and action items.',
        { json: true }
      ),
      userPrompt: `Summarize this case note in ${maxLength || 150} words or less.
Return JSON with keys: summary (string), keyPoints (string[]), actionItems (string[]).

Case note:
${noteContent}`,
      maxTokens: 500,
      temperature: 0.2,
      json: true,
      cachePayload: { noteContent, maxLength },
      cacheTtlMs: 4 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const parsed = result.parsed || {};
    const summary = parsed.summary || result.content || '';
    const keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [];
    const actionItems = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];

    res.json({
      summary,
      keyPoints,
      actionItems,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Note summarization error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Case Note Content Analysis (Sentiment & Risk Detection)
app.post('/api/ai/analyze-note', async (req, res) => {
  try {
    const { noteContent, youth } = req.body;
    const result = await aiCompletion({
      req,
      endpoint: 'analyze-note',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Analyze case notes for sentiment and risk signals. Include practical intervention actions.',
        { json: true }
      ),
      userPrompt: `Analyze this case note for ${youth?.firstName || 'the youth'}.
Return JSON:
{
  "sentiment":"positive|neutral|concerning|critical",
  "riskIndicators":[{"type":"string","severity":"low|medium|high","description":"string"}],
  "suggestedActions":["string"]
}

Case note:
${noteContent}`,
      maxTokens: 800,
      temperature: 0.1,
      json: true,
      cachePayload: { youthId: youth?.id, noteContent },
      cacheTtlMs: 3 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const analysis = result.parsed || {};

    res.json({
      ...analysis,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Note analysis error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Incident Categorization
app.post('/api/ai/categorize-incident', async (req, res) => {
  try {
    const { description } = req.body;
    const result = await aiCompletion({
      req,
      endpoint: 'categorize-incident',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Classify incidents by category/subcategory/severity and include practical tags.',
        { json: true }
      ),
      userPrompt: `Categorize this incident and return JSON with keys:
category, subcategory, severity (low|medium|high|critical), tags (string[]), confidence (0..1)

Incident description:
${description}`,
      maxTokens: 350,
      temperature: 0.1,
      json: true,
      cachePayload: { description },
      cacheTtlMs: 6 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const categorization = result.parsed || {};

    res.json({
      ...categorization,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Incident categorization error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Incident Pattern Analysis
app.post('/api/ai/analyze-incident', async (req, res) => {
  try {
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

    const result = await aiCompletion({
      req,
      endpoint: 'analyze-incident',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Identify repeat incident patterns, likely triggers, and evidence-based interventions.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 1000,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, incidentData, historicalIncidents: historicalIncidents?.slice?.(0, 10) || [] },
      cacheTtlMs: 4 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const analysis = result.parsed || {};

    res.json({
      ...analysis,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Incident analysis error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Behavioral Analysis and Predictions
app.post('/api/ai/analyze-behavior', async (req, res) => {
  try {
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

    const result = await aiCompletion({
      req,
      endpoint: 'analyze-behavior',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Analyze behavior trajectory and predict short-term outcomes with measurable recommendations.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 850,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, timeframe, recentData },
      cacheTtlMs: 3 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const analysis = result.parsed || {};

    res.json({
      ...analysis,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Behavior analysis error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Natural Language Query Interface
app.post('/api/ai/query', async (req, res) => {
  try {
    const { question, context } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({
        error: 'Question is required',
        code: 'question_required',
      });
    }

    // Determine if this is a text expansion request or data analysis request
    const isTextExpansion = context?.fieldType || context?.currentText;
    
    let systemPrompt, userPrompt;
    
    if (isTextExpansion) {
      // Text expansion mode - expand brief notes into paragraphs
      systemPrompt = buildClinicalPrompt(
        'Take brief notes/keywords and expand them into clear clinical prose (2-4 sentences), preserving facts and meaning.'
      );
      userPrompt = question;
    } else {
      const snippets = extractContextSnippets(context, question, 18);
      const focusedContext = snippets.length > 0
        ? snippets.join('\n')
        : 'No matching context snippets were provided.';

      systemPrompt = buildClinicalPrompt(
        'You are a clinical data analyst assistant. Show calculations when relevant and clearly separate facts from recommendations.'
      );
      userPrompt = `Question: "${question}"

Focused context snippets:
${focusedContext}

Provide a clear, professional answer.
- If calculation is requested, show formula + computed values.
- If data is incomplete, state what is missing.
- Keep response concise and actionable.`;
    }

    const result = await aiCompletion({
      req,
      endpoint: 'query',
      tier: isTextExpansion ? 'premium' : 'standard',
      systemPrompt,
      userPrompt,
      maxTokens: isTextExpansion ? 420 : 1100,
      temperature: isTextExpansion ? 0.45 : 0.2,
      cachePayload: { question, context, mode: isTextExpansion ? 'text' : 'analysis' },
      cacheTtlMs: 4 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const answer = result.content || '';

    res.json({
      answer,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Query error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Streaming Natural Language Query (Server-Sent Events)
app.post('/api/ai/query-stream', async (req, res) => {
  const requestId = getRequestId();

  try {
    if (!openai) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId });
    }

    const { question, context } = req.body;
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Question is required', code: 'question_required', requestId });
    }

    const isTextExpansion = context?.fieldType || context?.currentText;
    const snippets = extractContextSnippets(context, question, 18);
    const focusedContext = snippets.length > 0 ? snippets.join('\n') : 'No matching context snippets were provided.';

    const systemPrompt = isTextExpansion
      ? buildClinicalPrompt('Expand concise notes into structured clinical prose without inventing facts.')
      : buildClinicalPrompt('Answer using provided context snippets. Show calculations for numeric questions.');

    const userPrompt = isTextExpansion
      ? question
      : `Question: "${question}"\n\nContext snippets:\n${focusedContext}\n\nReturn a concise, actionable response.`;

    const cacheKey = buildCacheKey('query-stream', { question, context, mode: isTextExpansion ? 'text' : 'analysis' });
    const cached = getCached(cacheKey);
    if (cached?.content) {
      return res.json({
        answer: cached.content,
        usage: cached.usage || null,
        requestId,
        cached: true,
      });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const sendEvent = (event, payload) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent('meta', { requestId, model: selectModel(isTextExpansion ? 'premium' : 'standard') });

    const stream = await openai.chat.completions.create({
      model: selectModel(isTextExpansion ? 'premium' : 'standard'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: isTextExpansion ? 420 : 1100,
      temperature: isTextExpansion ? 0.45 : 0.2,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of stream) {
      const delta = chunk?.choices?.[0]?.delta?.content || '';
      if (!delta) continue;
      fullText += delta;
      sendEvent('chunk', { delta });
    }

    // Estimate tokens for streaming responses where usage may not be available
    const estimatedTokens = Math.max(1, Math.ceil(fullText.length / 4));
    incrementTokenUsage(req, estimatedTokens);
    logAIUsage(true, estimatedTokens);

    const payload = {
      content: fullText,
      usage: { total_tokens: estimatedTokens, estimated: true },
    };
    setCached(cacheKey, payload, 4 * 60 * 1000);

    sendEvent('done', {
      answer: fullText,
      usage: payload.usage,
      requestId,
      cached: false,
    });
    res.end();
  } catch (error) {
    console.error('Query stream error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    if (!res.headersSent || res.getHeader('Content-Type') !== 'text/event-stream') {
      return res.status(mapped.status).json({
        error: mapped.message,
        code: mapped.code,
        retryable: mapped.retryable,
        requestId,
      });
    }
    res.write(`event: error\ndata: ${JSON.stringify({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, requestId })}\n\n`);
    res.end();
  }
});

// Treatment Recommendations
app.post('/api/ai/treatment-recommendations', async (req, res) => {
  try {
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

    const result = await aiCompletion({
      req,
      endpoint: 'treatment-recommendations',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Provide trauma-informed, evidence-based treatment recommendations mapped to measurable targets.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 1500,
      temperature: 0.25,
      json: true,
      cachePayload: { youthId: youth?.id, progressData, assessmentData },
      cacheTtlMs: 6 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const recommendations = result.parsed || {};

    res.json({
      ...recommendations,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Treatment recommendations error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

// Parse Youth Profile from Text
app.post('/api/ai/parse-youth-profile', async (req, res) => {
  try {
    const { profileText } = req.body;

    if (!profileText || typeof profileText !== 'string') {
      return res.status(400).json({ error: 'Profile text is required' });
    }
    const deterministicParsed = parseFieldValueCsvImport(profileText);

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

    const result = await aiCompletion({
      req,
      endpoint: 'parse-youth-profile',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Extract structured youth profile fields from mixed-format intake text with high precision.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 2000,
      temperature: 0.1,
      json: true,
      cachePayload: { profileText },
      cacheTtlMs: 10 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const parsedData = mergeParsedProfileData(result.parsed || {}, deterministicParsed);

    res.json({
      parsedData,
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });

  } catch (error) {
    console.error('Parse youth profile error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(500).json({ 
      error: mapped.message, 
      code: mapped.code,
      retryable: mapped.retryable,
      fallback: true,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----------------------------------------------------------------------------
// Additional AI endpoints consumed by frontend services
// ----------------------------------------------------------------------------

app.post('/api/ai/suggest-note', async (req, res) => {
  try {
    const { youthId, noteType, recentData } = req.body || {};
    const prompt = `Generate structured case note drafting support.
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
- recentData: ${JSON.stringify(recentData || {}, null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'suggest-note',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Create clinically appropriate drafting suggestions for youth case notes.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 700,
      temperature: 0.25,
      json: true,
      cachePayload: { youthId, noteType, recentData },
      cacheTtlMs: 3 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const parsed = result.parsed || {};
    res.json({
      summary: parsed.summary || '',
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      suggestedInterventions: Array.isArray(parsed.suggestedInterventions) ? parsed.suggestedInterventions : [],
      followUpItems: Array.isArray(parsed.followUpItems) ? parsed.followUpItems : [],
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Suggest note error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/search', async (req, res) => {
  try {
    const { query, dataTypes, youthId, dateRange, limit = 10, contextData } = req.body || {};
    const prompt = `Interpret and resolve this semantic search request.
Return JSON:
{
  "results":[{"type":"string","id":"string","relevance":0.0,"summary":"string","data":{}}],
  "queryPlan":{"intent":"string","suggestedFilters":["string"]},
  "notes":"string"
}
If no real dataset is supplied, return an empty results array and provide best filter guidance.

Request:
- query: ${query}
- dataTypes: ${JSON.stringify(dataTypes || [])}
- youthId: ${youthId || 'any'}
- dateRange: ${JSON.stringify(dateRange || null)}
- contextData: ${JSON.stringify(contextData || null)}
- limit: ${limit}`;

    const result = await aiCompletion({
      req,
      endpoint: 'search',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Act as a clinical search planner and semantic matcher for treatment documentation.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 900,
      temperature: 0.15,
      json: true,
      cachePayload: { query, dataTypes, youthId, dateRange, limit, contextData },
      cacheTtlMs: 2 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const parsed = result.parsed || {};
    const results = Array.isArray(parsed.results) ? parsed.results.slice(0, limit) : [];
    res.json({
      results,
      queryPlan: parsed.queryPlan || { intent: 'general-search', suggestedFilters: [] },
      notes: parsed.notes || '',
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Search error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/youth-insights', async (req, res) => {
  try {
    const { youthId, analysisType, youth, contextData } = req.body || {};
    const prompt = `Generate concise youth insights.
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
- contextData: ${JSON.stringify(contextData || {}, null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'youth-insights',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Summarize youth progress with balanced strengths, concerns, and pragmatic recommendations.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 900,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, analysisType, youth, contextData },
      cacheTtlMs: 3 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const parsed = result.parsed || {};
    res.json({
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Youth insights error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/incident-patterns', async (req, res) => {
  try {
    const { youthId, timeframe, incidentHistory } = req.body || {};
    const prompt = `Analyze incident patterns from historical records.
Return JSON:
{
  "patterns":[{"pattern":"string","frequency":0,"severity":"low|medium|high|critical","recommendation":"string"}],
  "triggers":["string"],
  "trends":"string"
}

Inputs:
- youthId: ${youthId || 'unknown'}
- timeframe: ${JSON.stringify(timeframe || null)}
- incidentHistory: ${JSON.stringify(incidentHistory || [], null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'incident-patterns',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Identify repeat incident trends, trigger clusters, and prevention recommendations.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 900,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, timeframe, incidentHistory },
      cacheTtlMs: 4 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }

    const parsed = result.parsed || {};
    res.json({
      patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
      triggers: Array.isArray(parsed.triggers) ? parsed.triggers : [],
      trends: parsed.trends || 'No clear trend available.',
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Incident patterns error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/assess-risk', async (req, res) => {
  try {
    const { youthId, assessmentData, historicalData } = req.body || {};
    const prompt = `Assess youth risk profile from assessment and historical context.
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
- historicalData: ${JSON.stringify(historicalData || {}, null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'assess-risk',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Provide a trauma-informed risk stratification and intervention priorities.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 1100,
      temperature: 0.15,
      json: true,
      cachePayload: { youthId, assessmentData, historicalData },
      cacheTtlMs: 5 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const parsed = result.parsed || {};
    res.json({
      overallRisk: parsed.overallRisk || 'moderate',
      domains: parsed.domains || {},
      protectiveFactors: Array.isArray(parsed.protectiveFactors) ? parsed.protectiveFactors : [],
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors : [],
      interventionPriorities: Array.isArray(parsed.interventionPriorities) ? parsed.interventionPriorities : [],
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Assess risk error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/suggest-interventions', async (req, res) => {
  try {
    const { assessmentData, youth } = req.body || {};
    const prompt = `Generate intervention suggestions from assessment profile.
Return JSON:
{"interventions":[{"intervention":"string","rationale":"string","expectedOutcome":"string","evidenceBase":"string","priority":"high|medium|low"}]}

Inputs:
- youth: ${JSON.stringify(youth || {}, null, 2)}
- assessmentData: ${JSON.stringify(assessmentData || {}, null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'suggest-interventions',
      tier: 'premium',
      systemPrompt: buildClinicalPrompt(
        'Recommend practical interventions with rationale and expected outcomes.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 900,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId: youth?.id, assessmentData },
      cacheTtlMs: 5 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const parsed = result.parsed || {};
    res.json({
      interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [],
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Suggest interventions error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/behavioral-warnings', async (req, res) => {
  try {
    const { youthId, recentData } = req.body || {};
    const prompt = `Evaluate early warning indicators from recent behavior data.
Return JSON:
{
  "warnings":[{"type":"string","severity":"low|medium|high","indicator":"string","recommendation":"string"}],
  "urgency":"routine|elevated|immediate"
}

Inputs:
- youthId: ${youthId || 'unknown'}
- recentData: ${JSON.stringify(recentData || {}, null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'behavioral-warnings',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Detect early warning signs and classify urgency for staff follow-up.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 750,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, recentData },
      cacheTtlMs: 2 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const parsed = result.parsed || {};
    res.json({
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      urgency: parsed.urgency || 'routine',
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Behavioral warnings error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/intervention-effectiveness', async (req, res) => {
  try {
    const { youthId, interventionHistory, outcomeData } = req.body || {};
    const prompt = `Assess intervention effectiveness.
Return JSON:
{
  "effectiveInterventions":[{"intervention":"string","effectiveness":0,"context":"string"}],
  "ineffectiveInterventions":["string"],
  "recommendations":["string"]
}

Inputs:
- youthId: ${youthId || 'unknown'}
- interventionHistory: ${JSON.stringify(interventionHistory || [], null, 2)}
- outcomeData: ${JSON.stringify(outcomeData || [], null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'intervention-effectiveness',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Rank intervention effectiveness using available outcome signals and explain uncertainty.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 850,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, interventionHistory, outcomeData },
      cacheTtlMs: 4 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const parsed = result.parsed || {};
    res.json({
      effectiveInterventions: Array.isArray(parsed.effectiveInterventions) ? parsed.effectiveInterventions : [],
      ineffectiveInterventions: Array.isArray(parsed.ineffectiveInterventions) ? parsed.ineffectiveInterventions : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Intervention effectiveness error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
  }
});

app.post('/api/ai/compare-progress', async (req, res) => {
  try {
    const { youthId, comparisonCriteria, cohortData } = req.body || {};
    const prompt = `Compare youth progress to available benchmarks.
Return JSON:
{
  "comparison":"string",
  "benchmarks":[{"metric":"string","youthScore":0,"averageScore":0,"percentile":0}],
  "insights":["string"]
}

Inputs:
- youthId: ${youthId || 'unknown'}
- comparisonCriteria: ${JSON.stringify(comparisonCriteria || {}, null, 2)}
- cohortData: ${JSON.stringify(cohortData || [], null, 2)}`;

    const result = await aiCompletion({
      req,
      endpoint: 'compare-progress',
      tier: 'standard',
      systemPrompt: buildClinicalPrompt(
        'Provide benchmark-oriented interpretation while clearly noting missing comparative data.',
        { json: true }
      ),
      userPrompt: prompt,
      maxTokens: 850,
      temperature: 0.2,
      json: true,
      cachePayload: { youthId, comparisonCriteria, cohortData },
      cacheTtlMs: 5 * 60 * 1000,
    });

    if (result.unavailable) {
      return res.status(503).json({ error: 'OpenAI not configured', fallback: true, requestId: result.requestId });
    }
    const parsed = result.parsed || {};
    res.json({
      comparison: parsed.comparison || '',
      benchmarks: Array.isArray(parsed.benchmarks) ? parsed.benchmarks : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      usage: result.usage,
      requestId: result.requestId,
      cached: result.cached,
    });
  } catch (error) {
    console.error('Compare progress error:', error);
    logAIUsage(false, 0, error);
    const mapped = mapOpenAIError(error);
    res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
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
  const progressNotes = data.progressNotes || [];
  const noteCount = progressNotes.length;

  // Extract readable text from case notes (supports multiple note formats)
  const caseNoteEntries = progressNotes.map((note, idx) => {
    const dateStr = note.date || note.createdAt || 'Unknown date';
    let text = '';
    if (typeof note.note === 'string') {
      try {
        const parsed = JSON.parse(note.note);
        if (parsed.sections) {
          text = [parsed.sections.summary, parsed.sections.strengthsChallenges, parsed.sections.interventionsResponse, parsed.sections.planNextSteps].filter(Boolean).join(' ');
        } else if (parsed.summary) {
          text = parsed.summary;
        } else if (parsed.content) {
          text = parsed.content;
        } else {
          text = note.note;
        }
      } catch {
        text = note.note;
      }
    } else if (note.summary) {
      text = note.summary;
    }
    const staff = note.staff ? ` (Staff: ${note.staff})` : '';
    return `[${dateStr}]${staff} ${text}`;
  }).filter(entry => entry.trim().length > 15);

  // Limit to most recent 20 notes to stay within token limits
  const recentNotes = caseNoteEntries.slice(-20);

  const basePrompt = `
Generate a professional ${reportType} report narrative for ${youth.firstName} ${youth.lastName}, a ${youth.age || 'N/A'} year old resident at Heartland Boys Home.

IMPORTANT: Do not use any markdown formatting. No ** for bold, no * for italics, no # for headers. Write in plain professional text only. Use section labels followed by a colon for structure (e.g., "BEHAVIORAL PROGRESS:").

YOUTH PROFILE:
- Admission Date: ${youth.admissionDate || 'Not provided'}
- Current Level: ${youth.level || 'Not specified'}
- Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || 'To be determined'}
- Legal Guardian: ${youth.legalGuardian || 'Not specified'}
- Has IEP: ${youth.hasIEP ? 'Yes' : 'No'}
- Strengths/Talents: ${youth.strengthsTalents || 'Not documented'}

REPORTING PERIOD: ${period?.startDate || 'Not specified'} to ${period?.endDate || 'Not specified'}

CASE NOTES (${noteCount} total entries, showing most recent ${recentNotes.length}):
${recentNotes.length > 0 ? recentNotes.join('\n\n') : 'No case notes documented during this period.'}

TREATMENT CONTEXT:
- Academic Strengths: ${youth.academicStrengths || 'To be assessed'}
- Academic Challenges: ${youth.academicChallenges || 'To be assessed'}
- Trauma History: ${youth.traumaHistory?.length ? 'Documented concerns requiring trauma-informed care' : 'No documented trauma history'}
- Current School: ${youth.currentSchool || 'Not specified'}
`;

  // Add specific instructions based on report type
  switch (reportType) {
    case 'court':
      return basePrompt + `
Please generate a comprehensive court report based on the case notes above. Include:
1. Current placement status and treatment progress as documented in case notes
2. Behavioral observations and staff-documented achievements or concerns
3. Educational progress and accommodations
4. Family engagement and discharge planning
5. Clinical recommendations for continued care
6. Risk assessment and safety considerations
7. Estimated timeline for treatment goals

Use formal language appropriate for court proceedings. Ground all statements in the documented case notes and staff observations. Do not invent details not found in the notes.`;

    case 'dpnWeekly':
    case 'dpnBiWeekly':
    case 'dpnMonthly':
      return basePrompt + `
Generate a comprehensive DPN (Discharge Planning Note) based on the case notes above. Cover:
1. Current clinical presentation based on staff observations
2. Progress toward treatment goals as documented in case notes
3. Behavioral patterns and intervention strategies noted by staff
4. Family therapy and support system engagement
5. Educational/vocational progress
6. Medication compliance and effectiveness (if mentioned in notes)
7. Risk factors and safety planning
8. Discharge planning activities and timeline
9. Recommendations for continued care

Format should be clinical and professional, suitable for treatment team review and insurance documentation. Base all observations on the documented case notes.`;

    case 'progress':
    case 'progressMonthly':
      return basePrompt + `
Create a detailed progress evaluation based on the case notes above. Address:
1. Treatment goal achievement as documented by staff
2. Behavioral observations and outcomes from case notes
3. Therapeutic intervention effectiveness
4. Educational and skill development progress
5. Family dynamics and engagement
6. Peer relationships and social skills as observed by staff
7. Level advancement criteria and timeline
8. Barrier identification and intervention strategies
9. Updated treatment plan recommendations

Ground all statements in the documented case notes. Do not fabricate observations not found in the notes.`;

    default:
      return basePrompt + `
Generate a comprehensive treatment summary based on the case notes above. Include progress across all domains of care, current functioning level as documented by staff, and recommendations for continued treatment. Use professional clinical language appropriate for interdisciplinary team review. Ground all statements in the documented case notes.`;
  }
}

function generateBehavioralInsightsPrompt(behaviorData, youth, period) {
  // behaviorData may contain case notes or legacy behavior points
  const noteEntries = (Array.isArray(behaviorData) ? behaviorData : []).map(d => {
    if (d.note || d.summary) {
      let text = '';
      if (typeof d.note === 'string') {
        try {
          const parsed = JSON.parse(d.note);
          text = parsed.summary || parsed.sections?.summary || d.note;
        } catch { text = d.note; }
      } else if (d.summary) {
        text = d.summary;
      }
      return `[${d.date || 'Unknown'}] ${text}`;
    }
    return null;
  }).filter(Boolean);

  const recentEntries = noteEntries.slice(-15);

  return `
Analyze the behavioral observations for ${youth.firstName} ${youth.lastName} based on documented case notes and staff observations.

IMPORTANT: Do not use any markdown formatting (no **, *, or #). Write in plain professional text only.

YOUTH CONTEXT:
- Current Level: ${youth.level || 'Not specified'}
- Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || 'Not specified'}
- Trauma History: ${youth.traumaHistory?.length ? 'Present' : 'None documented'}
- Total documented entries: ${behaviorData.length}

CASE NOTES AND OBSERVATIONS:
${recentEntries.length > 0 ? recentEntries.join('\n') : 'No documented observations available for this period.'}

Based on the documented case notes and staff observations, provide:
1. Behavioral pattern analysis based on what staff have documented
2. Trends in peer interactions, compliance, and engagement as noted by staff
3. Areas of strength and areas needing continued support
4. Evidence-based treatment recommendations grounded in the observations
5. Measurable goals based on documented progress

Focus on insights drawn directly from the case notes. Do not fabricate observations not found in the notes.`;
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
