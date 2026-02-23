import type { CaseNotes } from '@/integrations/firebase/services';

type Sentiment = 'positive' | 'neutral' | 'concerning' | 'critical';

export interface CaseNoteAnalysis {
  id: string;
  text: string;
  sentiment: Sentiment;
  sentimentScore: number;
  categories: string[];
  incidentMentions: number;
  levelUpMentions: number;
  levelDownMentions: number;
  domainScores: {
    peer: number;
    adult: number;
    investment: number;
    authority: number;
  };
}

export interface CaseNoteKPIAggregate {
  noteCount: number;
  sentimentCounts: Record<Sentiment, number>;
  categoryCounts: Record<string, number>;
  incidentMentions: number;
  levelUpMentions: number;
  levelDownMentions: number;
  concernCount: number;
  engagementScore: number;
  trendDelta: number;
  domainAverages: {
    peer: number;
    adult: number;
    investment: number;
    authority: number;
  };
  insights: string[];
}

const POSITIVE_KEYWORDS = [
  'improved', 'progress', 'cooperative', 'respectful', 'engaged', 'motivated',
  'compliant', 'calm', 'participated', 'stable', 'successful', 'positive',
  'goal met', 'earned privilege', 'accountable', 'self-regulated'
];

const CONCERNING_KEYWORDS = [
  'struggle', 'resistant', 'defiant', 'argument', 'agitated', 'noncompliant',
  'refused', 'verbal conflict', 'disruptive', 'impulsive', 'regression',
  'inappropriate', 'boundary issue', 'power struggle'
];

const CRITICAL_KEYWORDS = [
  'assault', 'fight', 'violent', 'self-harm', 'suicidal', 'runaway',
  'elopement', 'restraint', 'threat', 'weapon', 'injury', 'overdose'
];

const INCIDENT_KEYWORDS = [
  'incident', 'behavior report', 'crisis', 'escalation', 'safety concern',
  'major violation'
];

const LEVEL_UP_KEYWORDS = [
  'level up', 'promoted', 'advanced to level', 'moved up a level',
  'earned level'
];

const LEVEL_DOWN_KEYWORDS = [
  'level down', 'demoted', 'dropped a level', 'moved down a level',
  'lost level'
];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  behavior: ['behavior', 'conduct', 'expectation', 'rule', 'compliance'],
  therapy: ['therapy', 'counseling', 'session', 'intervention', 'coping'],
  academics: ['school', 'academic', 'class', 'teacher', 'homework', 'grade'],
  family: ['family', 'parent', 'guardian', 'visit', 'phone call'],
  medical: ['medical', 'medication', 'nurse', 'health'],
  incident: ['incident', 'crisis', 'escalation', 'safety']
};

const DOMAIN_KEYWORDS = {
  peer: {
    positive: ['peer support', 'got along', 'cooperative with peers', 'respectful to peers', 'positive peer'],
    negative: ['peer conflict', 'argument with peer', 'bullying', 'peer altercation', 'peer issue']
  },
  adult: {
    positive: ['respectful to staff', 'accepted redirection', 'appropriate with staff', 'followed staff direction'],
    negative: ['staff conflict', 'argued with staff', 'refused staff direction', 'disrespectful to staff']
  },
  investment: {
    positive: ['engaged in treatment', 'participated in group', 'motivated', 'goal-focused', 'invested in program'],
    negative: ['minimal effort', 'unengaged', 'refused participation', 'avoidant', 'did not participate']
  },
  authority: {
    positive: ['followed rules', 'accepted limits', 'compliant with structure', 'accepted consequences'],
    negative: ['defiant', 'rule violation', 'challenged authority', 'power struggle', 'noncompliant']
  }
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeText = (value: string): string => value.toLowerCase().replace(/\s+/g, ' ').trim();

const countKeywordHits = (text: string, keywords: string[]): number => {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      hits += 1;
    }
  }
  return hits;
};

const parseNotePayload = (note?: string | null): any | null => {
  if (!note || typeof note !== 'string') return null;
  try {
    return JSON.parse(note);
  } catch {
    return null;
  }
};

export const extractCaseNoteText = (note: CaseNotes): string => {
  const parts: string[] = [];
  if (typeof note.summary === 'string' && note.summary.trim()) {
    parts.push(note.summary.trim());
  }

  const parsed = parseNotePayload(note.note);
  if (parsed?.sections && typeof parsed.sections === 'object') {
    Object.values(parsed.sections).forEach((value) => {
      if (typeof value === 'string' && value.trim()) {
        parts.push(value.trim());
      }
    });
  } else if (parsed?.summary && typeof parsed.summary === 'string') {
    parts.push(parsed.summary.trim());
  } else if (typeof note.note === 'string' && note.note.trim()) {
    parts.push(note.note.trim());
  }

  return parts.join(' ');
};

const scoreDomain = (text: string, domain: keyof typeof DOMAIN_KEYWORDS): number => {
  const { positive, negative } = DOMAIN_KEYWORDS[domain];
  const positiveHits = countKeywordHits(text, positive);
  const negativeHits = countKeywordHits(text, negative);
  const score = 2.5 + (positiveHits * 0.45) - (negativeHits * 0.5);
  return clamp(Number(score.toFixed(2)), 0, 4);
};

const analyzeCaseNote = (note: CaseNotes): CaseNoteAnalysis => {
  const text = normalizeText(extractCaseNoteText(note));

  const positiveHits = countKeywordHits(text, POSITIVE_KEYWORDS);
  const concerningHits = countKeywordHits(text, CONCERNING_KEYWORDS);
  const criticalHits = countKeywordHits(text, CRITICAL_KEYWORDS);
  const incidentHits = countKeywordHits(text, INCIDENT_KEYWORDS);
  const levelUpHits = countKeywordHits(text, LEVEL_UP_KEYWORDS);
  const levelDownHits = countKeywordHits(text, LEVEL_DOWN_KEYWORDS);

  const sentimentScore = (positiveHits * 1.2) - (concerningHits * 1.3) - (criticalHits * 2.5);

  let sentiment: Sentiment = 'neutral';
  if (criticalHits > 0 || sentimentScore <= -3) {
    sentiment = 'critical';
  } else if (concerningHits > 0 || incidentHits > 0 || sentimentScore < -0.5) {
    sentiment = 'concerning';
  } else if (positiveHits > 0 || sentimentScore > 0.75) {
    sentiment = 'positive';
  }

  const categories = Object.entries(CATEGORY_KEYWORDS)
    .filter(([, keywords]) => countKeywordHits(text, keywords) > 0)
    .map(([category]) => category);

  return {
    id: note.id,
    text,
    sentiment,
    sentimentScore,
    categories: categories.length > 0 ? categories : ['general'],
    incidentMentions: incidentHits + criticalHits,
    levelUpMentions: levelUpHits,
    levelDownMentions: levelDownHits,
    domainScores: {
      peer: scoreDomain(text, 'peer'),
      adult: scoreDomain(text, 'adult'),
      investment: scoreDomain(text, 'investment'),
      authority: scoreDomain(text, 'authority'),
    },
  };
};

export const aggregateCaseNoteKpis = (notes: CaseNotes[]): CaseNoteKPIAggregate => {
  const analyses = notes.map(analyzeCaseNote);
  const count = analyses.length;

  const sentimentCounts: Record<Sentiment, number> = {
    positive: 0,
    neutral: 0,
    concerning: 0,
    critical: 0,
  };
  const categoryCounts: Record<string, number> = {};

  let incidentMentions = 0;
  let levelUpMentions = 0;
  let levelDownMentions = 0;
  let peerTotal = 0;
  let adultTotal = 0;
  let investmentTotal = 0;
  let authorityTotal = 0;

  analyses.forEach((analysis) => {
    sentimentCounts[analysis.sentiment] += 1;
    incidentMentions += analysis.incidentMentions;
    levelUpMentions += analysis.levelUpMentions;
    levelDownMentions += analysis.levelDownMentions;

    peerTotal += analysis.domainScores.peer;
    adultTotal += analysis.domainScores.adult;
    investmentTotal += analysis.domainScores.investment;
    authorityTotal += analysis.domainScores.authority;

    analysis.categories.forEach((category) => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
  });

  const firstHalf = analyses.slice(0, Math.floor(count / 2));
  const secondHalf = analyses.slice(Math.floor(count / 2));
  const firstHalfAvg = firstHalf.length
    ? firstHalf.reduce((sum, entry) => sum + entry.sentimentScore, 0) / firstHalf.length
    : 0;
  const secondHalfAvg = secondHalf.length
    ? secondHalf.reduce((sum, entry) => sum + entry.sentimentScore, 0) / secondHalf.length
    : 0;
  const trendDelta = Number((secondHalfAvg - firstHalfAvg).toFixed(2));

  const avgSentiment = count
    ? analyses.reduce((sum, entry) => sum + entry.sentimentScore, 0) / count
    : 0;

  const concernCount = sentimentCounts.concerning + sentimentCounts.critical;
  const engagementScore = count
    ? clamp(Math.round(55 + (avgSentiment * 12) + ((levelUpMentions - levelDownMentions) * 4) - (sentimentCounts.critical * 4)), 0, 100)
    : 0;

  const domainAverages = {
    peer: count ? Number((peerTotal / count).toFixed(1)) : 0,
    adult: count ? Number((adultTotal / count).toFixed(1)) : 0,
    investment: count ? Number((investmentTotal / count).toFixed(1)) : 0,
    authority: count ? Number((authorityTotal / count).toFixed(1)) : 0,
  };

  const insights: string[] = [];
  if (sentimentCounts.critical > 0) {
    insights.push(`${sentimentCounts.critical} case note(s) include critical language requiring priority review.`);
  }
  if (incidentMentions > 0) {
    insights.push(`${incidentMentions} incident-related mention(s) were detected in notes for this period.`);
  }
  if (levelUpMentions > levelDownMentions) {
    insights.push(`Case notes suggest stronger progress momentum (${levelUpMentions} level-up mentions vs ${levelDownMentions} level-down mentions).`);
  } else if (levelDownMentions > levelUpMentions) {
    insights.push(`Case notes indicate possible regression risk (${levelDownMentions} level-down mentions vs ${levelUpMentions} level-up mentions).`);
  }
  if (domainAverages.investment < 2.5) {
    insights.push('Investment/engagement language in notes is below target and may need focused interventions.');
  }
  if (trendDelta > 0.6) {
    insights.push('Case note sentiment trend is improving across the selected timeframe.');
  } else if (trendDelta < -0.6) {
    insights.push('Case note sentiment trend is declining across the selected timeframe.');
  }
  if (insights.length === 0 && count > 0) {
    insights.push('Case note patterns are stable with no high-severity changes detected.');
  }

  return {
    noteCount: count,
    sentimentCounts,
    categoryCounts,
    incidentMentions,
    levelUpMentions,
    levelDownMentions,
    concernCount,
    engagementScore,
    trendDelta,
    domainAverages,
    insights,
  };
};
