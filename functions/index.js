import { onRequest } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import express from 'express';
import cors from 'cors';
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
