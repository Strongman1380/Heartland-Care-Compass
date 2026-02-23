/**
 * Comprehensive AI Service
 * Provides AI-powered features for data navigation, analysis, and generation
 */

import { auth } from '@/lib/firebase';

// ============================================================================
// AI Configuration and Utilities
// ============================================================================

interface AIRequestConfig {
  maxRetries?: number;
  timeout?: number;
  fallbackEnabled?: boolean;
}

interface AIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  retryable?: boolean;
  requestId?: string;
  cached?: boolean;
  fallback?: boolean;
  usage?: {
    model?: string;
    tokens?: number;
  };
}

interface AIStreamHandlers {
  onMeta?: (meta: any) => void;
  onChunk?: (chunk: string) => void;
  onDone?: (result: { answer: string; usage?: any; requestId?: string; cached?: boolean }) => void;
  onError?: (error: { error: string; code?: string; retryable?: boolean; requestId?: string }) => void;
}

const formatAIErrorMessage = (status: number, payload: any): string => {
  if (payload?.error) return payload.error;
  if (status === 408) return 'AI request timed out. Try a shorter input.';
  if (status === 429) return 'AI rate limit reached. Try again shortly.';
  if (status === 402) return 'AI quota exceeded. Contact admin to update billing.';
  if (status === 401) return 'AI credentials are invalid. Contact admin.';
  if (status >= 500) return 'AI service is temporarily unavailable.';
  return `AI request failed with status ${status}`;
};

/**
 * Make an authenticated AI API request
 */
async function makeAIRequest<T>(
  endpoint: string,
  payload: any,
  config: AIRequestConfig = {}
): Promise<AIResponse<T>> {
  const { maxRetries = 2, timeout = 30000, fallbackEnabled = true } = config;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add Firebase auth token if available
      if (typeof window !== 'undefined' && auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        } catch (tokenError) {
          console.warn('Could not retrieve Firebase token:', tokenError);
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const rawBody = await response.text();
      let data: any = {};
      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = { error: rawBody };
        }
      }

      if (!response.ok) {
        const message = formatAIErrorMessage(response.status, data);
        if (data.fallback && fallbackEnabled) {
          return {
            success: false,
            error: message,
            code: data.code,
            retryable: data.retryable,
            requestId: data.requestId,
            fallback: true,
          };
        }
        const requestError: any = new Error(message);
        requestError.code = data.code;
        requestError.retryable = data.retryable;
        requestError.requestId = data.requestId;
        requestError.status = response.status;
        throw requestError;
      }

      return {
        success: true,
        data: data,
        requestId: data.requestId,
        cached: data.cached,
        usage: data.usage ? {
          model: data.model,
          tokens: data.usage?.total_tokens,
        } : undefined,
      };
    } catch (error: any) {
      console.warn(`AI request attempt ${attempt + 1} failed:`, error.message);
      const retryable = error?.retryable === true
        || error?.name === 'AbortError'
        || /network|failed to fetch/i.test(error?.message || '');
      const isFinalAttempt = attempt === maxRetries || !retryable;

      if (isFinalAttempt) {
        return {
          success: false,
          error: error.message || 'AI request failed',
          code: error.code,
          retryable,
          requestId: error.requestId,
          fallback: fallbackEnabled,
        };
      }

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded',
    fallback: fallbackEnabled,
  };
}

/**
 * Streaming natural-language query
 * Uses Server-Sent Events and emits chunks as they arrive.
 */
export async function queryDataStream(
  question: string,
  context: any,
  handlers: AIStreamHandlers = {}
): Promise<AIResponse<{ answer: string }>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
  };

  if (typeof window !== 'undefined' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (tokenError) {
      console.warn('Could not retrieve Firebase token for stream:', tokenError);
    }
  }

  const response = await fetch('/api/ai/query-stream', {
    method: 'POST',
    headers,
    body: JSON.stringify({ question, context }),
  });

  // Some environments may return normal JSON when cached.
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: formatAIErrorMessage(response.status, data),
        code: data?.code,
        retryable: data?.retryable,
        requestId: data?.requestId,
      };
    }
    handlers.onDone?.({
      answer: data.answer || '',
      usage: data.usage,
      requestId: data.requestId,
      cached: data.cached,
    });
    return {
      success: true,
      data: { answer: data.answer || '' },
      usage: data.usage ? { model: data.model, tokens: data.usage?.total_tokens } : undefined,
      requestId: data.requestId,
      cached: data.cached,
    };
  }

  if (!response.ok || !response.body) {
    return {
      success: false,
      error: formatAIErrorMessage(response.status, null),
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullAnswer = '';
  let donePayload: any = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const eventBlock of events) {
      const lines = eventBlock.split('\n');
      const eventLine = lines.find((line) => line.startsWith('event:'));
      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      const eventType = eventLine ? eventLine.replace('event:', '').trim() : 'message';
      let payload: any = null;
      try {
        payload = JSON.parse(dataLine.replace('data:', '').trim());
      } catch {
        continue;
      }

      if (eventType === 'meta') {
        handlers.onMeta?.(payload);
      } else if (eventType === 'chunk') {
        const delta = payload?.delta || '';
        if (delta) {
          fullAnswer += delta;
          handlers.onChunk?.(delta);
        }
      } else if (eventType === 'done') {
        donePayload = payload;
      } else if (eventType === 'error') {
        handlers.onError?.(payload);
        return {
          success: false,
          error: payload?.error || 'Streaming query failed',
          code: payload?.code,
          retryable: payload?.retryable,
          requestId: payload?.requestId,
        };
      }
    }
  }

  const finalPayload = donePayload || { answer: fullAnswer };
  handlers.onDone?.(finalPayload);

  return {
    success: true,
    data: { answer: finalPayload.answer || fullAnswer },
    usage: finalPayload.usage ? { tokens: finalPayload.usage?.total_tokens } : undefined,
    requestId: finalPayload.requestId,
    cached: finalPayload.cached,
  };
}

// ============================================================================
// DATA NAVIGATION & SEMANTIC SEARCH
// ============================================================================

export interface SearchQuery {
  query: string;
  dataTypes?: Array<'youth' | 'notes' | 'incidents' | 'assessments' | 'reports' | 'behavior'>;
  youthId?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export interface SearchResult {
  type: 'youth' | 'note' | 'incident' | 'assessment' | 'report' | 'behavior';
  id: string;
  relevance: number;
  summary: string;
  data: any;
  highlights?: string[];
}

/**
 * AI-powered semantic search across all data
 * Example: "Show me youth with declining behavioral trends in the last month"
 */
export async function searchData(searchQuery: SearchQuery): Promise<AIResponse<SearchResult[]>> {
  return makeAIRequest('/api/ai/search', searchQuery);
}

/**
 * Natural language query interface
 * Example: "What interventions have been most effective for youth with trauma history?"
 */
export async function queryData(question: string, context?: any): Promise<AIResponse<{ answer: string }>> {
  return makeAIRequest('/api/ai/query', { question, context });
}

/**
 * Get AI-powered insights about a specific youth
 */
export async function getYouthInsights(youthId: string, analysisType?: string): Promise<AIResponse<{
  summary: string;
  strengths: string[];
  concerns: string[];
  recommendations: string[];
}>> {
  return makeAIRequest('/api/ai/youth-insights', { youthId, analysisType });
}

// ============================================================================
// CASE NOTES & PROGRESS NOTES
// ============================================================================

export interface CaseNoteSuggestion {
  summary: string;
  keyPoints: string[];
  suggestedInterventions: string[];
  followUpItems: string[];
}

/**
 * AI-assisted case note writing
 * Analyzes recent data and suggests content
 */
export async function suggestCaseNoteContent(
  youthId: string,
  noteType: string,
  recentData?: any
): Promise<AIResponse<CaseNoteSuggestion>> {
  return makeAIRequest('/api/ai/suggest-note', {
    youthId,
    noteType,
    recentData,
  });
}

/**
 * Summarize lengthy case notes
 */
export async function summarizeCaseNote(noteContent: string, maxLength?: number): Promise<AIResponse<{
  summary: string;
  keyPoints: string[];
  actionItems: string[];
}>> {
  return makeAIRequest('/api/ai/summarize-note', {
    noteContent,
    maxLength,
  });
}

/**
 * Analyze sentiment and risk indicators in case notes
 */
export async function analyzeNoteContent(noteContent: string, youth: any): Promise<AIResponse<{
  sentiment: 'positive' | 'neutral' | 'concerning' | 'critical';
  riskIndicators: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  suggestedActions: string[];
}>> {
  return makeAIRequest('/api/ai/analyze-note', {
    noteContent,
    youth,
  });
}

// ============================================================================
// INCIDENT REPORT INTELLIGENCE
// ============================================================================

export interface IncidentAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  patterns: string[];
  triggers: string[];
  recommendations: string[];
  similarIncidents?: Array<{
    id: string;
    date: string;
    similarity: number;
  }>;
}

/**
 * Analyze incident report and identify patterns
 */
export async function analyzeIncident(
  incidentData: any,
  youthId: string,
  historicalIncidents?: any[]
): Promise<AIResponse<IncidentAnalysis>> {
  return makeAIRequest('/api/ai/analyze-incident', {
    incidentData,
    youthId,
    historicalIncidents,
  });
}

/**
 * Auto-categorize incident type and severity
 */
export async function categorizeIncident(incidentDescription: string): Promise<AIResponse<{
  category: string;
  subcategory: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  confidence: number;
}>> {
  return makeAIRequest('/api/ai/categorize-incident', {
    description: incidentDescription,
  });
}

/**
 * Identify behavioral patterns across multiple incidents
 */
export async function identifyIncidentPatterns(
  youthId: string,
  timeframe?: { start: string; end: string }
): Promise<AIResponse<{
  patterns: Array<{
    pattern: string;
    frequency: number;
    severity: string;
    recommendation: string;
  }>;
  triggers: string[];
  trends: string;
}>> {
  return makeAIRequest('/api/ai/incident-patterns', {
    youthId,
    timeframe,
  });
}

// ============================================================================
// RISK ASSESSMENT ENHANCEMENT
// ============================================================================

export interface RiskPrediction {
  overallRisk: 'low' | 'moderate' | 'high' | 'very-high';
  domains: Record<string, {
    score: number;
    trend: 'improving' | 'stable' | 'declining';
    recommendation: string;
  }>;
  protectiveFactors: string[];
  riskFactors: string[];
  interventionPriorities: Array<{
    priority: number;
    domain: string;
    target: string;
    rationale: string;
  }>;
}

/**
 * AI-enhanced risk assessment prediction
 */
export async function assessRisk(
  youthId: string,
  assessmentData: any,
  historicalData?: any
): Promise<AIResponse<RiskPrediction>> {
  return makeAIRequest('/api/ai/assess-risk', {
    youthId,
    assessmentData,
    historicalData,
  });
}

/**
 * Suggest intervention targets based on assessment
 */
export async function suggestInterventions(
  assessmentData: any,
  youth: any
): Promise<AIResponse<Array<{
  intervention: string;
  rationale: string;
  expectedOutcome: string;
  evidenceBase: string;
  priority: 'high' | 'medium' | 'low';
}>>> {
  return makeAIRequest('/api/ai/suggest-interventions', {
    assessmentData,
    youth,
  });
}

// ============================================================================
// BEHAVIORAL ANALYSIS & PREDICTIONS
// ============================================================================

export interface BehaviorPrediction {
  trends: {
    overall: 'improving' | 'stable' | 'declining';
    shortTerm: string;
    longTerm: string;
  };
  predictions: {
    nextWeekAverage: number;
    levelAdvancementLikelihood: number;
    concernAreas: string[];
  };
  recommendations: string[];
  interventionEffectiveness: Record<string, number>;
}

/**
 * Analyze behavioral trends and predict outcomes
 */
export async function analyzeBehaviorTrends(
  youthId: string,
  behaviorData: any[],
  timeframe?: number
): Promise<AIResponse<BehaviorPrediction>> {
  return makeAIRequest('/api/ai/analyze-behavior', {
    youthId,
    behaviorData,
    timeframe,
  });
}

/**
 * Early warning system for behavioral concerns
 */
export async function checkBehavioralWarnings(
  youthId: string,
  recentData: any
): Promise<AIResponse<{
  warnings: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    indicator: string;
    recommendation: string;
  }>;
  urgency: 'routine' | 'elevated' | 'immediate';
}>> {
  return makeAIRequest('/api/ai/behavioral-warnings', {
    youthId,
    recentData,
  });
}

/**
 * Identify what interventions work best for a youth
 */
export async function analyzeInterventionEffectiveness(
  youthId: string,
  interventionHistory: any[],
  outcomeData: any[]
): Promise<AIResponse<{
  effectiveInterventions: Array<{
    intervention: string;
    effectiveness: number;
    context: string;
  }>;
  ineffectiveInterventions: string[];
  recommendations: string[];
}>> {
  return makeAIRequest('/api/ai/intervention-effectiveness', {
    youthId,
    interventionHistory,
    outcomeData,
  });
}

// ============================================================================
// REPORT GENERATION & ENHANCEMENT
// ============================================================================

export interface ReportGenerationRequest {
  youth: any;
  reportType: string;
  period: { startDate: string; endDate: string };
  data: any;
  sections?: string[];
}

/**
 * Generate comprehensive AI-powered report narratives
 * (Enhanced version of existing summarizeReport)
 */
export async function generateReport(request: ReportGenerationRequest): Promise<AIResponse<{
  summary: string;
  sections?: Record<string, string>;
  recommendations?: string[];
}>> {
  return makeAIRequest('/api/ai/summarize-report', request);
}

/**
 * Enhance existing report content
 */
export async function enhanceReport(
  reportContent: string,
  reportType: string,
  youth: any
): Promise<AIResponse<{
  enhancedContent: string;
  improvements: string[];
  originalLength: number;
  enhancedLength: number;
}>> {
  return makeAIRequest('/api/ai/enhance-report', {
    reportContent,
    reportType,
    youth,
  });
}

/**
 * Generate behavioral insights for reports
 */
export async function generateBehavioralInsights(
  behaviorData: any[],
  youth: any,
  period?: any
): Promise<AIResponse<string>> {
  const response = await makeAIRequest('/api/ai/behavioral-insights', {
    behaviorData,
    youth,
    period,
  });

  return {
    ...response,
    data: response.data?.insights || response.data,
  };
}

/**
 * Generate treatment recommendations
 */
export async function generateTreatmentRecommendations(
  youth: any,
  progressData: any,
  assessmentData?: any
): Promise<AIResponse<{
  recommendations: string[];
  priorities: Array<{
    area: string;
    priority: 'high' | 'medium' | 'low';
    rationale: string;
  }>;
  narrative: string;
}>> {
  return makeAIRequest('/api/ai/treatment-recommendations', {
    youth,
    progressData,
    assessmentData,
  });
}

// ============================================================================
// AI SERVICE MONITORING
// ============================================================================

export interface AIServiceStatus {
  available: boolean;
  configured: boolean;
  model?: string;
  models?: {
    standard?: string;
    premium?: string;
  };
  status?: string;
  error?: string;
  usage?: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    totalTokens: number;
    lastUsed: string | null;
    errors?: Array<{
      timestamp: string;
      error: string;
      code: string;
    }>;
  };
  limits?: {
    global: {
      requests: number;
      tokens: number;
    };
    perClient: {
      requests: number;
      tokens: number;
    };
  };
  dailyUsage?: {
    day: string;
    requests: number;
    tokens: number;
  };
  cache?: {
    items: number;
    maxItems: number;
    ttlSeconds: number;
  };
}

/**
 * Check AI service availability and health
 */
export async function checkAIStatus(): Promise<AIServiceStatus> {
  try {
    const response = await fetch('/api/ai/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      return await response.json();
    }

    return {
      available: false,
      configured: false,
      error: 'AI service unreachable',
    };
  } catch (error: any) {
    return {
      available: false,
      configured: false,
      error: error.message || 'Network error',
    };
  }
}

// ============================================================================
// COMPARISON & BENCHMARKING
// ============================================================================

/**
 * Compare youth progress with similar profiles
 */
export async function compareYouthProgress(
  youthId: string,
  comparisonCriteria?: any
): Promise<AIResponse<{
  comparison: string;
  benchmarks: Array<{
    metric: string;
    youthScore: number;
    averageScore: number;
    percentile: number;
  }>;
  insights: string[];
}>> {
  return makeAIRequest('/api/ai/compare-progress', {
    youthId,
    comparisonCriteria,
  });
}

// ============================================================================
// YOUTH PROFILE IMPORT
// ============================================================================

export interface YouthProfileImportResult {
  firstName?: string;
  lastName?: string;
  dob?: string;
  age?: number;
  sex?: string;
  race?: string;
  religion?: string;
  placeOfBirth?: string;
  socialSecurityNumber?: string;
  address?: string;
  height?: string;
  weight?: string;
  hairColor?: string;
  eyeColor?: string;
  tattoosScars?: string;
  admissionDate?: string;
  level?: number;
  legalGuardian?: string;
  guardianRelationship?: string;
  guardianContact?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  probationOfficer?: string;
  probationContact?: string;
  probationPhone?: string;
  placementAuthority?: string[];
  estimatedStay?: string;
  referralSource?: string;
  referralReason?: string;
  priorPlacements?: string[];
  numPriorPlacements?: string;
  lengthRecentPlacement?: string;
  courtInvolvement?: string[];
  currentSchool?: string;
  grade?: string;
  hasIEP?: boolean;
  academicStrengths?: string;
  academicChallenges?: string;
  educationGoals?: string;
  schoolContact?: string;
  schoolPhone?: string;
  physician?: string;
  physicianPhone?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  allergies?: string;
  medicalConditions?: string;
  medicalRestrictions?: string;
  currentDiagnoses?: string;
  diagnoses?: string;
  traumaHistory?: string[];
  previousTreatment?: string;
  currentCounseling?: string[];
  therapistName?: string;
  therapistContact?: string;
  sessionFrequency?: string;
  sessionTime?: string;
  selfHarmHistory?: string[];
  lastIncidentDate?: string;
  hasSafetyPlan?: boolean;
  onSubsystem?: boolean;
  pointsInCurrentLevel?: number;
  dailyPointsForPrivileges?: number;
  hyrnaRiskLevel?: string;
  hyrnaScore?: string;
  hyrnaAssessmentDate?: string;
  confidence?: number;
  warnings?: string[];
}

/**
 * Parse unstructured youth profile text using AI
 * Extracts and maps data to the correct fields
 */
export async function parseYouthProfileText(
  profileText: string
): Promise<AIResponse<YouthProfileImportResult>> {
  return makeAIRequest('/api/ai/parse-youth-profile', {
    profileText,
  });
}

// ============================================================================
// EXPORT ALL SERVICES
// ============================================================================

export const aiService = {
  // Data Navigation
  searchData,
  queryData,
  queryDataStream,
  getYouthInsights,

  // Case Notes
  suggestCaseNoteContent,
  summarizeCaseNote,
  analyzeNoteContent,

  // Incidents
  analyzeIncident,
  categorizeIncident,
  identifyIncidentPatterns,

  // Risk Assessment
  assessRisk,
  suggestInterventions,

  // Behavioral Analysis
  analyzeBehaviorTrends,
  checkBehavioralWarnings,
  analyzeInterventionEffectiveness,

  // Reports
  generateReport,
  enhanceReport,
  generateBehavioralInsights,
  generateTreatmentRecommendations,

  // Youth Profile Import
  parseYouthProfileText,

  // Utilities
  checkAIStatus,
  compareYouthProgress,
};

export default aiService;
