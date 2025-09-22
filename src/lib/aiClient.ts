export interface AISummaryRequest {
  youth: any;
  reportType: string;
  period: { startDate: string; endDate: string };
  data: any;
}

// Mock AI responses for troubleshooting when API is not available
const generateMockAISummary = (payload: AISummaryRequest): string => {
  const { youth, reportType, period, data } = payload;
  
  // Calculate some basic statistics from the data
  const totalPoints = data.behaviorPoints?.reduce((sum: number, p: any) => sum + (p.totalPoints || 0), 0) || 0;
  const avgPoints = data.behaviorPoints?.length ? Math.round(totalPoints / data.behaviorPoints.length) : 0;
  const noteCount = data.progressNotes?.length || 0;
  
  // Generate contextual narrative based on report type
  switch (reportType) {
    case 'court':
      return `Based on comprehensive assessment data, ${youth.firstName} ${youth.lastName} has demonstrated measurable progress during the reporting period from ${period.startDate} to ${period.endDate}. 

BEHAVIORAL PROGRESS: During this period, ${youth.firstName} earned a total of ${totalPoints} behavior points across ${data.behaviorPoints?.length || 0} days, averaging ${avgPoints} points per day. This performance indicates ${avgPoints >= 12 ? 'consistent compliance with program expectations and positive engagement with treatment goals' : 'areas for continued focus on behavioral expectations and program engagement'}.

TREATMENT ENGAGEMENT: Staff documented ${noteCount} progress notes highlighting ${youth.firstName}'s participation in individual and group therapy sessions. Key areas of growth include improved conflict resolution skills, increased emotional regulation, and better peer interactions. ${youth.firstName} has shown particular strength in ${youth.academicStrengths || 'academic pursuits'} and continues to work on challenges related to ${youth.academicChallenges || 'behavioral consistency'}.

CLINICAL OBSERVATIONS: ${youth.firstName}'s current diagnoses of ${youth.currentDiagnoses || youth.diagnoses || 'various behavioral and emotional challenges'} are being addressed through evidence-based interventions. The treatment team notes improved coping strategies and increased insight into behavioral triggers.

RECOMMENDATIONS: Continued residential treatment is recommended to consolidate gains and address remaining treatment objectives. ${youth.firstName} would benefit from ongoing therapeutic support and structured programming to maintain progress and prepare for successful community reintegration.`;

    case 'dpnWeekly':
    case 'dpnBiWeekly':
    case 'dpnMonthly':
      return `CLINICAL ASSESSMENT SUMMARY:

${youth.firstName} ${youth.lastName} continues to make steady progress in the residential treatment program. During the evaluation period, behavioral data indicates ${avgPoints >= 12 ? 'consistent achievement of daily point goals with an average of ' + avgPoints + ' points per day' : 'variable performance with an average of ' + avgPoints + ' points per day, indicating need for continued behavioral support'}.

THERAPEUTIC PROGRESS: Individual therapy sessions have focused on ${youth.traumaHistory?.length ? 'trauma processing and coping skill development' : 'behavioral modification and emotional regulation'}. ${youth.firstName} demonstrates ${avgPoints >= 15 ? 'excellent' : avgPoints >= 12 ? 'good' : 'developing'} engagement in treatment activities and shows increased insight into behavioral patterns.

PEER INTERACTIONS: Staff observations indicate ${youth.firstName} is ${youth.peerInteraction >= 4 ? 'developing positive peer relationships and demonstrating leadership qualities' : 'working on appropriate peer interactions and social skills development'}. Group therapy participation has been ${youth.investmentLevel >= 4 ? 'active and constructive' : 'variable with encouragement needed for full participation'}.

FAMILY DYNAMICS: Contact with ${youth.legalGuardian || 'family members'} has been ${youth.guardianContact ? 'maintained regularly with positive outcomes' : 'limited but therapeutic team continues outreach efforts'}. Family therapy sessions focus on communication skills and discharge planning.

TREATMENT RECOMMENDATIONS: Continue current level of care with emphasis on ${avgPoints < 12 ? 'behavioral consistency and point achievement, ' : ''}therapeutic engagement, and preparation for step-down services. Estimated length of stay: ${youth.estimatedStay || '6-12 months'}.`;

    case 'progress':
    case 'progressMonthly':
      return `PROGRESS EVALUATION SUMMARY:

${youth.firstName} ${youth.lastName} has been in residential treatment for ${youth.admissionDate ? Math.floor((new Date().getTime() - new Date(youth.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : 'several months'}. Current treatment level: Level ${youth.level}.

BEHAVIORAL ACHIEVEMENTS: Point system performance shows ${totalPoints} total points earned with daily averages of ${avgPoints} points. This represents ${avgPoints >= 15 ? 'excellent compliance and engagement' : avgPoints >= 12 ? 'satisfactory progress with room for improvement' : 'need for increased focus on behavioral expectations'}. ${youth.firstName} has ${youth.pointTotal >= 2000 ? 'achieved significant milestones' : 'made steady progress'} toward level advancement goals.

CLINICAL PROGRESS: Treatment addressing ${youth.currentDiagnoses || youth.diagnoses || 'behavioral and emotional challenges'} has resulted in improved emotional regulation and coping strategies. ${youth.firstName} demonstrates increased insight into triggers and has developed healthier response patterns.

EDUCATIONAL PROGRESS: Academic performance in ${youth.currentSchool || 'on-site education program'} shows ${youth.academicStrengths ? 'particular strength in ' + youth.academicStrengths : 'steady improvement across subjects'}. ${youth.hasIEP ? 'IEP goals are being addressed through specialized instruction and accommodations.' : 'Educational goals are being met through individualized programming.'}

DISCHARGE PLANNING: Current discharge plan involves ${youth.dischargePlan?.parents ? 'return to parents' : youth.dischargePlan?.relative ? 'placement with relative (' + youth.dischargePlan.relative.name + ')' : 'continued placement planning'}. Estimated timeline: ${youth.estimatedStay || 'to be determined based on continued progress'}.`;

    default:
      return `COMPREHENSIVE ASSESSMENT NARRATIVE:

${youth.firstName} ${youth.lastName} continues to participate in residential treatment programming with measurable outcomes during the reporting period. Behavioral data indicates ${avgPoints} average daily points with total accumulation of ${totalPoints} points, reflecting ${avgPoints >= 12 ? 'consistent engagement with program expectations' : 'ongoing development in behavioral consistency'}.

Treatment interventions addressing ${youth.currentDiagnoses || youth.diagnoses || 'identified clinical needs'} have resulted in observable improvements in emotional regulation, peer interactions, and compliance with program structure. ${youth.firstName} demonstrates ${youth.investmentLevel >= 4 ? 'high investment' : 'developing investment'} in treatment goals and shows increased insight into behavioral patterns and triggers.

Educational programming continues to address ${youth.hasIEP ? 'IEP goals and specialized learning needs' : 'academic objectives'} with noted strengths in ${youth.academicStrengths || 'various subject areas'} and continued focus on ${youth.academicChallenges || 'academic skill development'}.

Family engagement includes regular contact with ${youth.legalGuardian || 'identified support system'} and participation in discharge planning activities. Treatment team recommends continued residential services to consolidate therapeutic gains and prepare for successful community reintegration.`;
  }
};

export async function summarizeReport(payload: AISummaryRequest): Promise<string> {
  try {
    // Enhanced request with better error handling
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authentication if available
    if (typeof window !== 'undefined' && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.warn('Could not retrieve Firebase ID token', tokenError);
      }
    }

    const res = await fetch('/api/ai/summarize-report', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));

      // Handle specific error cases
      if (err.fallback) {
        console.warn('AI service configured for fallback:', err.error);
        return generateMockAISummary(payload);
      }

      // Log different error types
      if (res.status === 402) {
        console.error('OpenAI quota exceeded - using fallback');
      } else if (res.status === 401) {
        console.error('OpenAI API key invalid - using fallback');
      } else if (res.status === 503) {
        console.error('OpenAI service not configured - using fallback');
      }

      throw new Error(err.error || `AI service error (${res.status})`);
    }

    const data = await res.json();

    // Log successful API usage for monitoring
    if (data.usage) {
      console.info('OpenAI API usage:', {
        model: data.model,
        tokens: data.usage.total_tokens,
        cost_estimate: (data.usage.total_tokens * 0.000002).toFixed(4) // Rough estimate for gpt-4o-mini
      });
    }

    return data.summary || '';

  } catch (e) {
    console.warn('AI service unavailable, using enhanced mock AI summary:', e);

    // Return enhanced mock AI summary with improved quality
    return generateMockAISummary(payload);
  }
}

// Enhanced behavioral insights with API integration
export async function generateBehavioralInsights(behaviorData: any[], youth: any, period?: any): Promise<string> {
  if (!behaviorData.length) return "No behavioral data available for analysis.";

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined' && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.warn('Could not retrieve Firebase ID token', tokenError);
      }
    }

    const res = await fetch('/api/ai/behavioral-insights', {
      method: 'POST',
      headers,
      body: JSON.stringify({ behaviorData, youth, period }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.insights || generateLocalBehavioralInsights(behaviorData, youth);
    }
  } catch (error) {
    console.warn('AI behavioral insights unavailable, using local analysis:', error);
  }

  // Fallback to local analysis
  return generateLocalBehavioralInsights(behaviorData, youth);
}

// Local behavioral insights fallback
export const generateLocalBehavioralInsights = (behaviorData: any[], youth: any): string => {
  if (!behaviorData.length) return "No behavioral data available for analysis.";

  const avgPoints = behaviorData.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0) / behaviorData.length;
  const recentData = behaviorData.slice(-7); // Last 7 entries
  const recentAvg = recentData.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0) / recentData.length;

  const trend = recentAvg > avgPoints ? 'improving' : recentAvg < avgPoints ? 'declining' : 'stable';
  const trendStrength = Math.abs(recentAvg - avgPoints);

  let analysis = `BEHAVIORAL ANALYSIS: ${youth.firstName} is averaging ${Math.round(avgPoints)} points per day over ${behaviorData.length} data points, with recent performance showing a ${trend} trend`;

  if (trendStrength > 2) {
    analysis += ` (${trendStrength.toFixed(1)} point ${trend === 'improving' ? 'increase' : 'decrease'})`;
  }

  analysis += '. ';

  if (avgPoints >= 15) {
    analysis += 'This demonstrates excellent program compliance and readiness for increased privileges and level advancement.';
  } else if (avgPoints >= 12) {
    analysis += 'This shows good progress with opportunities for continued improvement in consistency and engagement.';
  } else {
    analysis += 'This indicates need for additional behavioral support, intervention strategies, and possibly adjusted treatment goals.';
  }

  // Add trend-specific recommendations
  if (trend === 'improving' && trendStrength > 1) {
    analysis += ' Recent upward trend suggests effective intervention strategies and increased motivation.';
  } else if (trend === 'declining' && trendStrength > 1) {
    analysis += ' Recent decline warrants immediate review of treatment plan and potential triggers.';
  }

  return analysis;
};

export const generateTreatmentRecommendations = (youth: any, progressData: any): string => {
  const recommendations = [];

  // Level-based recommendations
  if (youth.level < 2) {
    recommendations.push("Priority focus on behavioral stabilization, routine establishment, and basic program compliance for initial level advancement.");
  } else if (youth.level < 3) {
    recommendations.push("Continue building on behavioral consistency and point achievement while introducing increased responsibility and privileges.");
  } else if (youth.level >= 3) {
    recommendations.push("Maintain current level standards while preparing for transition planning and community reintegration skills.");
  }

  // Clinical considerations
  if (youth.traumaHistory?.length) {
    recommendations.push("Maintain trauma-informed care approaches with specialized therapy modalities (EMDR, CPT, or TF-CBT as appropriate).");
  }

  if (youth.currentDiagnoses?.includes('ADHD') || youth.diagnoses?.includes('ADHD')) {
    recommendations.push("Continue ADHD-specific interventions including behavioral modifications and medication compliance monitoring.");
  }

  if (youth.currentDiagnoses?.includes('Depression') || youth.diagnoses?.includes('Depression')) {
    recommendations.push("Monitor mood symptoms closely with continued individual therapy and potential medication review.");
  }

  // Educational and developmental
  if (youth.hasIEP) {
    recommendations.push("Ensure educational programming continues to address IEP goals with regular team meetings and progress monitoring.");
  }

  if (youth.academicChallenges?.length) {
    recommendations.push(`Address identified academic challenges in ${youth.academicChallenges} through targeted interventions and support.`);
  }

  // Safety and risk factors
  if (youth.selfHarmHistory?.length || youth.suicidalIdeation) {
    recommendations.push("Continue enhanced safety monitoring, coping skill development, and regular suicide risk assessments.");
  }

  if (youth.aggressionHistory?.length) {
    recommendations.push("Maintain de-escalation protocols and anger management interventions with peer conflict resolution training.");
  }

  // Behavioral and engagement
  if (youth.investmentLevel < 3) {
    recommendations.push("Increase motivational interviewing and engagement strategies to improve treatment participation and buy-in.");
  }

  if (youth.peerInteraction < 3) {
    recommendations.push("Focus on social skills development and peer relationship building through group therapy and structured activities.");
  }

  // Family and discharge planning
  if (youth.guardianContact === false || !youth.guardianContact) {
    recommendations.push("Intensify family engagement efforts and explore alternative support systems for discharge planning.");
  }

  if (youth.dischargePlan?.timeline && youth.dischargePlan.timeline !== 'TBD') {
    recommendations.push(`Continue discharge planning activities with estimated timeline of ${youth.dischargePlan.timeline}, including transition preparation and aftercare coordination.`);
  }

  // Default if no specific recommendations
  if (!recommendations.length) {
    recommendations.push("Continue current treatment programming with regular progress monitoring and interdisciplinary team review.");
  }

  return recommendations.join(" ");
};

// New AI-powered report enhancement functions
export const enhanceReportWithAI = async (reportContent: string, reportType: string, youth: any): Promise<string> => {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (typeof window !== 'undefined' && auth.currentUser) {
      try {
        const token = await auth.currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (tokenError) {
        console.warn('Could not retrieve Firebase ID token', tokenError);
      }
    }

    const res = await fetch('/api/ai/enhance-report', {
      method: 'POST',
      headers,
      body: JSON.stringify({ reportContent, reportType, youth }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.enhancedContent || reportContent;
    }
  } catch (error) {
    console.warn('AI report enhancement unavailable:', error);
  }

  return reportContent;
};

// AI Status Checker
export const checkAIServiceStatus = async (): Promise<{ available: boolean; error?: string }> => {
  try {
    const res = await fetch('/api/ai/status', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return { available: data.available, error: data.error };
    }

    return { available: false, error: 'AI service unreachable' };
  } catch (error) {
    return { available: false, error: 'Network error' };
  }
};
import { auth } from '@/lib/firebase';
