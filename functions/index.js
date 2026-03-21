import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import { File } from 'node:buffer';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';

// Config params
const anthropicApiKey = defineString('ANTHROPIC_API_KEY', { default: '' });
const anthropicModel = defineString('ANTHROPIC_MODEL', { default: 'claude-haiku-4-5-20251001' });

// Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  if (req.url === '/api' || req.url.startsWith('/api/')) return next();
  if (req.url === '/' || req.url.startsWith('/ai/') || req.url === '/health') {
    req.url = req.url === '/' ? '/api' : `/api${req.url}`;
  }
  next();
});

// Lazy-init Anthropic
let anthropicClient = null;
function getAnthropic() {
  if (anthropicClient) return anthropicClient;
  const key = anthropicApiKey.value();
  if (!key) return null;
  anthropicClient = new Anthropic({ apiKey: key });
  return anthropicClient;
}

// Core Claude completion
async function completeClaudePrompt({ systemPrompt, userPrompt, maxTokens = 1000, temperature = 0.2 }) {
  const client = getAnthropic();
  if (!client) return { unavailable: true };

  const response = await client.messages.create({
    model: anthropicModel.value(),
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: maxTokens,
    temperature,
  });

  const content = response.content[0]?.text || '';
  const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
  logAIUsage(true, tokens);
  return {
    content,
    usage: { total_tokens: tokens },
    model: response.model,
  };
}

// Text completion (alias)
async function completeTextPrompt({ systemPrompt, userPrompt, maxTokens = 800, temperature = 0.2 }) {
  return completeClaudePrompt({ systemPrompt, userPrompt, maxTokens, temperature });
}

// JSON completion — runs Claude then parses JSON out of the response
async function completeJSONPrompt({ systemPrompt, userPrompt, maxTokens = 800, temperature = 0.2 }) {
  const result = await completeClaudePrompt({ systemPrompt, userPrompt, maxTokens, temperature });
  if (result.unavailable) return result;
  const parsed = parseJSONContent(result.content);
  return { ...result, parsed };
}

// ─── Utility helpers ───────────────────────────────────────────────────────

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
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
};

const splitPeople = (value) => {
  const text = normalizeImportScalar(value);
  if (!text) return [];
  return text.split(/\s*(?:&| and |\/|;|\|)\s*/i).map((item) => item.trim()).filter(Boolean);
};

const parseFieldValueCsvImport = (profileText) => {
  const parsed = {};
  const warnings = [];
  const lines = String(profileText || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

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
      case 'resident name': { const n = splitResidentName(value); if (n.firstName) parsed.firstName = n.firstName; if (n.lastName) parsed.lastName = n.lastName; break; }
      case 'age': { const n = Number(value); if (Number.isFinite(n) && n > 0) parsed.age = n; break; }
      case 'gender': case 'sex': parsed.sex = value; break;
      case 'dob': case 'date of birth': parsed.dob = normalizeImportDate(value) || parsed.dob || null; break;
      case 'address': parsed.address = value; break;
      case 'admission date': parsed.admissionDate = normalizeImportDate(value) || parsed.admissionDate || null; break;
      case 'placing agency': case 'placing agency county': case 'placement authority': parsed.placingAgencyCounty = value; parsed.placementAuthority = [value]; break;
      case 'legal guardian': case 'guardian': {
        parsed.legalGuardian = value;
        const names = splitPeople(value);
        if (names[0] && !parsed.motherName) parsed.motherName = names[0];
        if (names[1] && !parsed.fatherName) parsed.fatherName = names[1];
        break;
      }
      case 'guardian relationship': parsed.guardianRelationship = value; break;
      case 'guardian contact': parsed.guardianContact = value; break;
      case 'guardian phone': case 'legal guardian phone': parsed.guardianPhone = value; break;
      case 'guardian email': case 'legal guardian email': parsed.guardianEmail = value; break;
      case 'probation officer': parsed.probationOfficer = value; break;
      case "mother's name": case 'mother name': case 'mother': parsed.motherName = value; parsed.mother = { ...(parsed.mother || {}), name: value }; break;
      case "mother's phone": case 'mother phone': parsed.motherPhone = value; parsed.mother = { ...(parsed.mother || {}), phone: value }; break;
      case "father's name": case 'father name': case 'father': parsed.fatherName = value; parsed.father = { ...(parsed.father || {}), name: value }; break;
      case "father's phone": case 'father phone': parsed.fatherPhone = value; parsed.father = { ...(parsed.father || {}), phone: value }; break;
      case 'next of kin': case 'next of kin name': parsed.nextOfKinName = value; parsed.nextOfKin = { ...(parsed.nextOfKin || {}), name: value }; break;
      case 'next of kin relationship': parsed.nextOfKinRelationship = value; parsed.nextOfKin = { ...(parsed.nextOfKin || {}), relationship: value }; break;
      case 'next of kin phone': parsed.nextOfKinPhone = value; parsed.nextOfKin = { ...(parsed.nextOfKin || {}), phone: value }; break;
      case 'attorney': parsed.attorney = value; break;
      case 'judge': parsed.judge = value; break;
      case 'current medications': case 'medications': parsed.medicalRestrictions = value; warnings.push('Current medications mapped to medical restrictions.'); break;
      case 'health conditions': case 'medical conditions': parsed.medicalConditions = value; break;
      case 'last school attended': case 'current school': parsed.currentSchool = value; break;
      case 'grade': case 'current grade': parsed.grade = value; break;
      case 'iep': { const b = parseImportBool(value); if (b !== null) parsed.hasIEP = b; break; }
      case 'physical markers': case 'tattoos/scars': case 'tattoos and scars': parsed.tattoosScars = value; break;
      default: break;
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

// AI usage tracking
let aiUsageStats = { totalRequests: 0, successfulRequests: 0, failedRequests: 0, totalTokens: 0, lastUsed: null, errors: [] };

const logAIUsage = (success, tokens = 0, error = null) => {
  aiUsageStats.totalRequests++;
  if (success) { aiUsageStats.successfulRequests++; aiUsageStats.totalTokens += tokens; }
  else { aiUsageStats.failedRequests++; if (error) { aiUsageStats.errors.push({ timestamp: new Date().toISOString(), error: error.message || error, code: error.code || 'unknown' }); if (aiUsageStats.errors.length > 10) aiUsageStats.errors = aiUsageStats.errors.slice(-10); } }
  aiUsageStats.lastUsed = new Date().toISOString();
};

const audioUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

const parseJSONContent = (rawContent = '{}') => {
  const cleaned = String(rawContent || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
  if (!cleaned) return {};
  try { return JSON.parse(cleaned); }
  catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    throw new Error('AI returned an invalid JSON payload');
  }
};

const mapAIError = (error, fallbackMessage) => {
  const errorCode = error?.code || error?.error?.code;
  const statusCode = error?.status || error?.statusCode || error?.response?.status;
  if (statusCode === 429 || errorCode === 'rate_limit_error') return { status: 429, message: 'Rate limit exceeded. Try again shortly.', code: errorCode, retryable: true };
  if (statusCode === 401 || errorCode === 'authentication_error') return { status: 401, message: 'Invalid API key', code: errorCode, retryable: false };
  if (statusCode >= 500) return { status: 503, message: 'AI service temporarily unavailable', code: errorCode, retryable: true };
  return { status: statusCode && statusCode >= 400 ? statusCode : 500, message: error?.message || fallbackMessage, code: errorCode || 'ai_request_failed', retryable: false };
};

const handleAIError = (res, error, fallbackMessage) => {
  console.error(fallbackMessage, error);
  logAIUsage(false, 0, error);
  const mapped = mapAIError(error, fallbackMessage);
  return res.status(mapped.status).json({ error: mapped.message, code: mapped.code, retryable: mapped.retryable, fallback: true });
};

// ─── Routes ────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'firestore', timestamp: new Date().toISOString() });
});

// AI Status
app.get('/api/ai/status', async (req, res) => {
  try {
    const client = getAnthropic();
    if (!client) return res.json({ available: false, error: 'Anthropic API key not configured', configured: false });

    const test = await client.messages.create({
      model: anthropicModel.value(),
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 5,
    });

    res.json({ available: true, configured: true, model: test.model, status: 'operational', usage: aiUsageStats });
  } catch (error) {
    console.error('AI status check failed:', error);
    res.json({ available: false, configured: true, error: error.message, status: 'error', usage: aiUsageStats });
  }
});

// Summarize Report
app.post('/api/ai/summarize-report', async (req, res) => {
  try {
    if (!req.body || !req.body.youth || !req.body.reportType) {
      return res.status(400).json({ error: 'Missing required fields: youth, reportType' });
    }
    const { youth, reportType, period, data } = req.body;
    const prompt = generateAIPrompt(youth, reportType, period, data);

    const result = await completeTextPrompt({
      systemPrompt: `You are a professional clinical writer specializing in youth residential treatment reports. Generate comprehensive, evidence-based narratives appropriate for ${reportType} reports. Use clinical language while maintaining clarity. Focus on measurable outcomes, treatment progress, and professional recommendations.`,
      userPrompt: prompt,
      maxTokens: 2000,
      temperature: 0.3,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ summary: result.content || '', model: result.model, usage: result.usage });
  } catch (error) {
    console.error('AI summarization error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'AI service temporarily unavailable', fallback: true });
  }
});

// Behavioral Insights
app.post('/api/ai/behavioral-insights', async (req, res) => {
  try {
    const { behaviorData, youth, period } = req.body;
    const prompt = generateBehavioralInsightsPrompt(behaviorData, youth, period);

    const result = await completeTextPrompt({
      systemPrompt: 'You are a data analyst specializing in behavioral statistics for youth residential treatment.',
      userPrompt: prompt,
      maxTokens: 800,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ insights: result.content || '', usage: result.usage });
  } catch (error) {
    console.error('Behavioral insights error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to generate behavioral insights', fallback: true });
  }
});

// Enhance Report
app.post('/api/ai/enhance-report', async (req, res) => {
  try {
    const { reportContent, reportType, youth } = req.body;
    if (!reportContent) return res.status(400).json({ error: 'Report content is required' });

    const result = await completeTextPrompt({
      systemPrompt: 'You are a professional clinical writer specializing in enhancing youth treatment reports.',
      userPrompt: `Please enhance this ${reportType} report for ${youth.firstName} ${youth.lastName}. Improve clarity, professionalism, and clinical accuracy.\n\nOriginal:\n${reportContent}\n\nEnhanced:`,
      maxTokens: 2000,
      temperature: 0.3,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ enhancedContent: result.content || reportContent, usage: result.usage });
  } catch (error) {
    console.error('Report enhancement error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to enhance report', fallback: true });
  }
});

// Summarize Note
app.post('/api/ai/summarize-note', async (req, res) => {
  try {
    const { noteContent, maxLength } = req.body;

    const result = await completeTextPrompt({
      systemPrompt: 'Summarize case notes concisely while preserving critical information.',
      userPrompt: `Summarize in ${maxLength || 150} words or less:\n\n${noteContent}`,
      maxTokens: 500,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    const summary = result.content || '';
    const keyPoints = summary.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'));
    res.json({ summary, keyPoints, usage: result.usage });
  } catch (error) {
    console.error('Note summarization error:', error);
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to summarize note', fallback: true });
  }
});

// Analyze Note
app.post('/api/ai/analyze-note', async (req, res) => {
  try {
    const { noteContent, youth } = req.body;

    const result = await completeJSONPrompt({
      systemPrompt: 'Analyze case notes for sentiment, risk indicators, and recommended actions. Return only valid JSON.',
      userPrompt: `Analyze for ${youth.firstName}:\n\n${noteContent}`,
      maxTokens: 800,
      temperature: 0.1,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ ...result.parsed, usage: result.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze note', fallback: true });
  }
});

// Categorize Incident
app.post('/api/ai/categorize-incident', async (req, res) => {
  try {
    const { description } = req.body;

    const result = await completeJSONPrompt({
      systemPrompt: 'Categorize incidents. Return only valid JSON with: category, subcategory, severity, tags, confidence.',
      userPrompt: `Categorize:\n\n${description}`,
      maxTokens: 300,
      temperature: 0.1,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ ...result.parsed, usage: result.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to categorize incident', fallback: true });
  }
});

// Analyze Incident
app.post('/api/ai/analyze-incident', async (req, res) => {
  try {
    const { incidentData, historicalIncidents } = req.body;

    const result = await completeJSONPrompt({
      systemPrompt: 'Analyze incidents for patterns and triggers. Return only valid JSON.',
      userPrompt: `Current: ${JSON.stringify(incidentData)}\nHistory: ${JSON.stringify(historicalIncidents?.slice(0, 10) || [])}`,
      maxTokens: 1000,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ ...result.parsed, usage: result.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze incident', fallback: true });
  }
});

// Analyze Behavior
app.post('/api/ai/analyze-behavior', async (req, res) => {
  try {
    const { behaviorData } = req.body;
    const recent = behaviorData.slice(-30);
    const points = recent.map(d => d.totalPoints || 0);
    const avg = points.reduce((s, p) => s + p, 0) / points.length;

    const result = await completeJSONPrompt({
      systemPrompt: 'Analyze behavioral trends. Return only valid JSON with: trends, predictions, recommendations.',
      userPrompt: `Points (${recent.length} days): ${points.join(', ')}\nAverage: ${avg.toFixed(1)}`,
      maxTokens: 800,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ ...result.parsed, usage: result.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to analyze behavior', fallback: true });
  }
});

// Query
app.post('/api/ai/query', async (req, res) => {
  try {
    const { question, context } = req.body;
    const isTextExpansion = context?.fieldType || context?.currentText;

    const result = await completeTextPrompt({
      systemPrompt: isTextExpansion ? 'Expand brief notes into professional clinical paragraphs.' : 'Help with clinical data analysis.',
      userPrompt: isTextExpansion ? question : `Question: "${question}"\nData: ${JSON.stringify(context)}`,
      maxTokens: isTextExpansion ? 300 : 1000,
      temperature: isTextExpansion ? 0.5 : 0.3,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ answer: result.content || '', usage: result.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to process query', fallback: true });
  }
});

// Treatment Recommendations
app.post('/api/ai/treatment-recommendations', async (req, res) => {
  try {
    const { youth, progressData, assessmentData } = req.body;

    const result = await completeJSONPrompt({
      systemPrompt: 'Provide evidence-based, trauma-informed treatment recommendations. Return only valid JSON.',
      userPrompt: `Youth: ${JSON.stringify(youth)}\nProgress: ${JSON.stringify(progressData)}\nAssessment: ${JSON.stringify(assessmentData)}`,
      maxTokens: 1500,
      temperature: 0.3,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ ...result.parsed, usage: result.usage });
  } catch (error) {
    logAIUsage(false, 0, error);
    res.status(500).json({ error: 'Failed to generate recommendations', fallback: true });
  }
});

// Parse Youth Profile
app.post('/api/ai/parse-youth-profile', async (req, res) => {
  try {
    const { profileText } = req.body;
    if (!profileText || !String(profileText).trim()) return res.status(400).json({ error: 'Profile text is required' });

    const deterministicParsed = parseFieldValueCsvImport(profileText);

    const extractionSchema = `{"firstName":string|null,"lastName":string|null,"dob":"YYYY-MM-DD"|null,"age":number|null,"sex":string|null,"race":string|null,"religion":string|null,"placeOfBirth":string|null,"socialSecurityNumber":string|null,"address":string|null,"height":string|null,"weight":string|null,"hairColor":string|null,"eyeColor":string|null,"tattoosScars":string|null,"admissionDate":"YYYY-MM-DD"|null,"level":number|null,"legalGuardian":string|null,"guardianRelationship":string|null,"guardianContact":string|null,"guardianPhone":string|null,"guardianEmail":string|null,"probationOfficer":string|null,"probationContact":string|null,"probationPhone":string|null,"mother":{"name":string|null,"phone":string|null}|null,"father":{"name":string|null,"phone":string|null}|null,"nextOfKin":{"name":string|null,"relationship":string|null,"phone":string|null}|null,"placingAgencyCounty":string|null,"caseworker":{"name":string|null,"phone":string|null}|null,"guardianAdLitem":{"name":string|null}|null,"attorney":string|null,"judge":string|null,"placementAuthority":string[]|null,"estimatedStay":string|null,"referralSource":string|null,"referralReason":string|null,"priorPlacements":string[]|null,"numPriorPlacements":string|null,"lengthRecentPlacement":string|null,"courtInvolvement":string[]|null,"currentSchool":string|null,"grade":string|null,"currentGrade":string|null,"hasIEP":boolean|null,"academicStrengths":string|null,"academicChallenges":string|null,"educationGoals":string|null,"schoolContact":string|null,"schoolPhone":string|null,"physician":string|null,"physicianPhone":string|null,"insuranceProvider":string|null,"policyNumber":string|null,"allergies":string|null,"medicalConditions":string|null,"medicalRestrictions":string|null,"currentDiagnoses":string|null,"diagnoses":string|null,"traumaHistory":string[]|null,"previousTreatment":string|null,"currentCounseling":string[]|null,"therapistName":string|null,"therapistContact":string|null,"sessionFrequency":string|null,"sessionTime":string|null,"selfHarmHistory":string[]|null,"lastIncidentDate":"YYYY-MM-DD"|null,"hasSafetyPlan":boolean|null,"onSubsystem":boolean|null,"pointsInCurrentLevel":number|null,"dailyPointsForPrivileges":number|null,"hyrnaRiskLevel":string|null,"hyrnaScore":number|string|null,"hyrnaAssessmentDate":"YYYY-MM-DD"|null,"warnings":string[],"confidence":number}`;

    const result = await completeJSONPrompt({
      systemPrompt: 'You are a clinical data extraction specialist for a youth treatment profile system. Map pasted profile text into the exact target fields with minimal mistakes. Do not invent values. Use null when unknown. Keep booleans as true/false, arrays as arrays, and dates as YYYY-MM-DD. If a value is ambiguous, leave it null and add a warning. Return ONLY a valid JSON object using this schema: ' + extractionSchema,
      userPrompt: `Extract all possible structured profile data from this text and map to the schema fields.\n\nProfile text:\n${profileText}`,
      maxTokens: 2000,
      temperature: 0.1,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });

    const mergedParsedData = mergeParsedProfileData(result.parsed, deterministicParsed);
    res.json({ parsedData: mergedParsedData, usage: result.usage });
  } catch (error) {
    console.error('Parse youth profile error:', error);
    logAIUsage(false, 0, error);
    return handleAIError(res, error, 'Failed to parse youth profile');
  }
});

// Query Stream (returns JSON, not a true stream)
app.post('/api/ai/query-stream', async (req, res) => {
  try {
    const { question, context } = req.body || {};
    if (!question || typeof question !== 'string') return res.status(400).json({ error: 'Question is required', code: 'question_required' });

    const isTextExpansion = context?.fieldType || context?.currentText;
    const result = await completeTextPrompt({
      systemPrompt: isTextExpansion ? 'Expand brief notes into professional clinical paragraphs.' : 'Help with clinical data analysis.',
      userPrompt: isTextExpansion ? question : `Question: "${question}"\nData: ${JSON.stringify(context || {})}`,
      maxTokens: isTextExpansion ? 420 : 1100,
      temperature: isTextExpansion ? 0.45 : 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ answer: result.content || '', usage: result.usage, model: result.model, cached: false });
  } catch (error) {
    return handleAIError(res, error, 'Failed to process query');
  }
});

// Suggest Note
app.post('/api/ai/suggest-note', async (req, res) => {
  try {
    const { youthId, noteType, recentData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Create clinically appropriate drafting suggestions for youth case notes. Return only valid JSON.',
      userPrompt: `Generate structured case note drafting support.
Return JSON:
{"summary":"string","keyPoints":["string"],"suggestedInterventions":["string"],"followUpItems":["string"]}

Context:
- youthId: ${youthId || 'unknown'}
- noteType: ${noteType || 'case-note'}
- recentData: ${JSON.stringify(recentData || {}, null, 2)}`,
      maxTokens: 700,
      temperature: 0.25,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
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

// Search
app.post('/api/ai/search', async (req, res) => {
  try {
    const { query, dataTypes, youthId, dateRange, limit = 10, contextData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Act as a clinical search planner and semantic matcher for treatment documentation. Return only valid JSON.',
      userPrompt: `Interpret and resolve this semantic search request.
Return JSON:
{"results":[{"type":"string","id":"string","relevance":0.0,"summary":"string","data":{}}],"queryPlan":{"intent":"string","suggestedFilters":["string"]},"notes":"string"}

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

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    const parsed = result.parsed || {};
    res.json({
      results: Array.isArray(parsed.results) ? parsed.results.slice(0, limit) : [],
      queryPlan: parsed.queryPlan || { intent: 'general-search', suggestedFilters: [] },
      notes: parsed.notes || '',
      usage: result.usage,
      model: result.model,
    });
  } catch (error) {
    return handleAIError(res, error, 'Failed to process semantic search');
  }
});

// Youth Insights
app.post('/api/ai/youth-insights', async (req, res) => {
  try {
    const { youthId, analysisType, youth, contextData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Summarize youth progress with balanced strengths, concerns, and pragmatic recommendations. Return only valid JSON.',
      userPrompt: `Generate concise youth insights.
Return JSON:
{"summary":"string","strengths":["string"],"concerns":["string"],"recommendations":["string"]}

Inputs:
- youthId: ${youthId || youth?.id || 'unknown'}
- analysisType: ${analysisType || 'general'}
- youth: ${JSON.stringify(youth || {}, null, 2)}
- contextData: ${JSON.stringify(contextData || {}, null, 2)}`,
      maxTokens: 900,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
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

// Incident Patterns
app.post('/api/ai/incident-patterns', async (req, res) => {
  try {
    const { youthId, timeframe, incidentHistory } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Identify repeat incident trends, trigger clusters, and prevention recommendations. Return only valid JSON.',
      userPrompt: `Analyze incident patterns from historical records.
Return JSON:
{"patterns":[{"pattern":"string","frequency":0,"severity":"low|medium|high|critical","recommendation":"string"}],"triggers":["string"],"trends":"string"}

Inputs:
- youthId: ${youthId || 'unknown'}
- timeframe: ${JSON.stringify(timeframe || null)}
- incidentHistory: ${JSON.stringify(incidentHistory || [], null, 2)}`,
      maxTokens: 900,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
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

// Assess Risk
app.post('/api/ai/assess-risk', async (req, res) => {
  try {
    const { youthId, assessmentData, historicalData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Provide a trauma-informed risk stratification and intervention priorities. Return only valid JSON.',
      userPrompt: `Assess youth risk profile from assessment and historical context.
Return JSON:
{"overallRisk":"low|moderate|high|very-high","domains":{"domainName":{"score":0,"trend":"improving|stable|declining","recommendation":"string"}},"protectiveFactors":["string"],"riskFactors":["string"],"interventionPriorities":[{"priority":1,"domain":"string","target":"string","rationale":"string"}]}

Inputs:
- youthId: ${youthId || 'unknown'}
- assessmentData: ${JSON.stringify(assessmentData || {}, null, 2)}
- historicalData: ${JSON.stringify(historicalData || {}, null, 2)}`,
      maxTokens: 1100,
      temperature: 0.15,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
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

// Suggest Interventions
app.post('/api/ai/suggest-interventions', async (req, res) => {
  try {
    const { assessmentData, youth } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Recommend practical interventions with rationale and expected outcomes. Return only valid JSON.',
      userPrompt: `Generate intervention suggestions from assessment profile.
Return JSON:
{"interventions":[{"intervention":"string","rationale":"string","expectedOutcome":"string","evidenceBase":"string","priority":"high|medium|low"}]}

Inputs:
- youth: ${JSON.stringify(youth || {}, null, 2)}
- assessmentData: ${JSON.stringify(assessmentData || {}, null, 2)}`,
      maxTokens: 900,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    const parsed = result.parsed || {};
    res.json({ interventions: Array.isArray(parsed.interventions) ? parsed.interventions : [], usage: result.usage, model: result.model });
  } catch (error) {
    return handleAIError(res, error, 'Failed to suggest interventions');
  }
});

// Behavioral Warnings
app.post('/api/ai/behavioral-warnings', async (req, res) => {
  try {
    const { youthId, recentData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Detect early warning signs and classify urgency for staff follow-up. Return only valid JSON.',
      userPrompt: `Evaluate early warning indicators from recent behavior data.
Return JSON:
{"warnings":[{"type":"string","severity":"low|medium|high","indicator":"string","recommendation":"string"}],"urgency":"routine|elevated|immediate"}

Inputs:
- youthId: ${youthId || 'unknown'}
- recentData: ${JSON.stringify(recentData || {}, null, 2)}`,
      maxTokens: 750,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    const parsed = result.parsed || {};
    res.json({ warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [], urgency: parsed.urgency || 'routine', usage: result.usage, model: result.model });
  } catch (error) {
    return handleAIError(res, error, 'Failed to evaluate behavioral warnings');
  }
});

// Intervention Effectiveness
app.post('/api/ai/intervention-effectiveness', async (req, res) => {
  try {
    const { youthId, interventionHistory, outcomeData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Rank intervention effectiveness using available outcome signals and explain uncertainty. Return only valid JSON.',
      userPrompt: `Assess intervention effectiveness.
Return JSON:
{"effectiveInterventions":[{"intervention":"string","effectiveness":0,"context":"string"}],"ineffectiveInterventions":["string"],"recommendations":["string"]}

Inputs:
- youthId: ${youthId || 'unknown'}
- interventionHistory: ${JSON.stringify(interventionHistory || [], null, 2)}
- outcomeData: ${JSON.stringify(outcomeData || [], null, 2)}`,
      maxTokens: 850,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
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

// Compare Progress
app.post('/api/ai/compare-progress', async (req, res) => {
  try {
    const { youthId, comparisonCriteria, cohortData } = req.body || {};
    const result = await completeJSONPrompt({
      systemPrompt: 'Provide benchmark-oriented interpretation while clearly noting missing comparative data. Return only valid JSON.',
      userPrompt: `Compare youth progress to available benchmarks.
Return JSON:
{"comparison":"string","benchmarks":[{"metric":"string","youthScore":0,"averageScore":0,"percentile":0}],"insights":["string"]}

Inputs:
- youthId: ${youthId || 'unknown'}
- comparisonCriteria: ${JSON.stringify(comparisonCriteria || {}, null, 2)}
- cohortData: ${JSON.stringify(cohortData || [], null, 2)}`,
      maxTokens: 850,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    const parsed = result.parsed || {};
    res.json({ comparison: parsed.comparison || '', benchmarks: Array.isArray(parsed.benchmarks) ? parsed.benchmarks : [], insights: Array.isArray(parsed.insights) ? parsed.insights : [], usage: result.usage, model: result.model });
  } catch (error) {
    return handleAIError(res, error, 'Failed to compare progress');
  }
});

// Referral Screener
app.post('/api/ai/screen-referral', async (req, res) => {
  try {
    const { referralText } = req.body || {};
    if (!referralText || !String(referralText).trim()) return res.status(400).json({ error: 'Referral text is required' });

    const result = await completeClaudePrompt({
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

STEP 4.5 - DOMAIN SCORING (Form 1 — Referral Screening Assessment)
Score each of the 10 domains 1–5 (1=Poor/High Concern, 5=Strong/Low Concern). Base scores strictly on what the referral explicitly states. For each domain provide: score (integer 1–5, or null if insufficient data), narrative (1–3 sentences citing specific referral data, or null), and is_flagged (true if this domain warrants a red flag — auto-flag safety_supervision_fit, sexual_behavior_risk, and program_fit_assessment when scored 1 or 2, or if explicit disqualifiers are documented for that domain).

Domain keys and prompts:
1. safety_supervision_fit — Can Heartland safely supervise this youth given current staffing and peer population?
2. behavioral_history_severity — Nature, frequency, and severity of behavioral concerns including aggression, self-harm, elopement, and property destruction.
3. sexual_behavior_risk — Any history of problematic sexual behavior, adjudications, contact restrictions, or treatment requirements.
4. mental_health_stability — Current diagnoses, psychiatric history, medication compliance, and whether clinical need exceeds group-home capacity.
5. substance_use — Current and historical substance use, UA history, and whether use patterns create contraband or supervision risk.
6. family_dynamics_support — Who is engaged, who is undermining, and whether family will support or sabotage placement stability.
7. educational_engagement — Current school status, IEP or 504, behavioral history at school, and compatibility with Heartland's school-day model.
8. treatment_history_engagement — Prior placements, why they ended, what worked, what failed, and current treatment engagement.
9. motivation_accountability — Does the youth demonstrate readiness for change? Can he identify goals? Does he accept responsibility?
10. program_fit_assessment — Overall compatibility with Heartland's model, peer population, and staffing capacity.

Also populate screening_flags (array of strings) with any specific red flag items warranting immediate attention (e.g. "Adjudicated sexual assault — victims are minors"). Set flags_present=true if any flags exist.

STEP 5 - DECISION
Set screening_decision to exactly one of these values:
- "RECOMMEND INTERVIEW": Hard screens pass, fit is MIXED or STRONG, services can meet needs
- "NEED MORE INFO": Critical records missing, risk severity unclear, cannot make defensible recommendation
- "CONDITIONAL": Hard screens pass but specific conditions must be met before interview — list conditions
- "DENY / REDIRECT": Hard screen triggered, fit is clearly unsafe, or needs exceed scope

Also set recommendation to: INTERVIEW (for RECOMMEND INTERVIEW), INTERVIEW_WITH_CONDITIONS (for CONDITIONAL or NEED MORE INFO), DECLINE (for DENY / REDIRECT).

Set overall_narrative to a concise paragraph (3–6 sentences) for the "Screening Recommendation" box: summarize primary strengths, primary concerns, unresolved questions, and whether this referral is a good fit, conditional fit, or poor fit for Heartland Boys Home.

OUTPUT: Return ONLY valid JSON - no preamble, no markdown fences, no text outside the JSON object.

{
  "youth_name": null,
  "date_of_birth": null,
  "date_of_referral": null,
  "referring_agency": null,
  "probation_officer": null,
  "probation_district": null,
  "current_placement": null,
  "program_level_requested": null,
  "overall_risk_level": null,
  "family_contacts": { "guardians": [], "primary_contact": null, "relationship": null, "phone": null, "alternate_phone": null, "address": null, "city_state_zip": null },
  "legal_team": { "po_phone": null, "judge": null, "attorney": null, "gal_casa": null },
  "current_placement_contact": { "facility_name": null, "address": null, "city_state": null, "phone": null, "contact_name": null },
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
  "flags_present": false,
  "screening_flags": [],
  "screening_domains": [
    { "domain_number": 1, "domain_key": "safety_supervision_fit", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 2, "domain_key": "behavioral_history_severity", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 3, "domain_key": "sexual_behavior_risk", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 4, "domain_key": "mental_health_stability", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 5, "domain_key": "substance_use", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 6, "domain_key": "family_dynamics_support", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 7, "domain_key": "educational_engagement", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 8, "domain_key": "treatment_history_engagement", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 9, "domain_key": "motivation_accountability", "score": null, "narrative": null, "is_flagged": false },
    { "domain_number": 10, "domain_key": "program_fit_assessment", "score": null, "narrative": null, "is_flagged": false }
  ],
  "screening_decision": "RECOMMEND INTERVIEW",
  "overall_narrative": null,
  "screening_followup_questions": []
}

RULES: Do not invent facts. Only use what is explicitly in the referral. If contact, address, demographic, or placement fields are present anywhere in the referral packet, extract them into the header fields above. If a hard-no item is explicitly present, recommendation MUST be DECLINE and screening_decision MUST be "DENY / REDIRECT". If suspected but not explicit, set screen_status=CONDITIONAL and ask targeted questions. Be blunt, operational, specific. No moralizing.`,
      userPrompt: String(referralText).trim(),
      maxTokens: 7000,
      temperature: 0.1,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    res.json({ screening: result.content || '', usage: result.usage, model: result.model });
  } catch (error) {
    return handleAIError(res, error, 'Failed to screen referral');
  }
});

// Audio transcription — not supported without OpenAI Whisper
app.post('/api/ai/transcribe-audio', audioUpload.single('audio'), (req, res) => {
  res.status(503).json({ error: 'Audio transcription is not available', fallback: true });
});

// Organize Meeting Notes
app.post('/api/ai/organize-meeting-notes', async (req, res) => {
  try {
    const { transcript, youthName } = req.body || {};
    if (!transcript || !String(transcript).trim()) return res.status(400).json({ error: 'No transcript provided' });

    const result = await completeJSONPrompt({
      systemPrompt: 'You organize Family Team Meeting transcripts into structured clinical documentation for a youth residential program. Return a JSON object with exactly these four keys: "attendees" (comma-separated list of names and roles mentioned), "objectives" (bullet points of stated meeting goals or purpose), "discussion" (clear paragraph summary of what was discussed), "actionItems" (numbered list of concrete next steps, responsibilities, or follow-ups). Be concise and professional. Do not use markdown formatting characters like ** or #. Plain prose only.',
      userPrompt: `Youth: ${youthName || 'Unknown'}\n\nMeeting transcript:\n${String(transcript).trim()}`,
      maxTokens: 1200,
      temperature: 0.2,
    });

    if (result.unavailable) return res.status(503).json({ error: 'AI service not configured', fallback: true });
    const parsed = result.parsed || {};
    res.json({ attendees: parsed.attendees || '', objectives: parsed.objectives || '', discussion: parsed.discussion || '', actionItems: parsed.actionItems || '', usage: result.usage, model: result.model });
  } catch (error) {
    return handleAIError(res, error, 'Failed to organize meeting notes');
  }
});

// Catch-all
app.all('/api/*', (req, res) => {
  res.json({ message: 'Data operations are handled by Firestore client in the frontend', timestamp: new Date().toISOString() });
});

// ─── Helper functions ───────────────────────────────────────────────────────

function generateAIPrompt(youth, reportType, period, data) {
  const behaviorPoints = data?.behaviorPoints || [];
  const progressNotes = data?.progressNotes || [];
  const dailyRatings = data?.dailyRatings || [];
  const totalPoints = behaviorPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
  const avgPoints = behaviorPoints.length ? Math.round(totalPoints / behaviorPoints.length) : 0;
  const recentTrend = behaviorPoints.length > 5
    ? (behaviorPoints.slice(-3).reduce((sum, p) => sum + (p.totalPoints || 0), 0) / 3) -
      (behaviorPoints.slice(0, 3).reduce((sum, p) => sum + (p.totalPoints || 0), 0) / 3)
    : 0;

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

