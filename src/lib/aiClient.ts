export interface AISummaryRequest {
  youth: any;
  reportType: string;
  period: { startDate: string; endDate: string };
  data: any;
}

export interface DPNFieldComments {
  peerInteraction: string;
  adultInteraction: string;
  investmentLevel: string;
  dealWithAuthority: string;
  socialStrengths: string;
  socialDeficiencies: string;
  narrative: string;
}

// Generate AI comments for all DPN fields based on case notes
export function generateDPNFieldComments(payload: AISummaryRequest): DPNFieldComments {
  const { youth, data } = payload;

  // Extract readable case note text
  const caseNotes = (data.progressNotes || []).map((note: any) => {
    let text = '';
    let sections: any = {};
    if (typeof note.note === 'string') {
      try {
        const parsed = JSON.parse(note.note);
        if (parsed.sections) {
          sections = parsed.sections;
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
    return { text, sections, date: note.date || '', staff: note.staff || '' };
  }).filter((n: any) => n.text.trim().length > 0);

  const noteTexts = caseNotes.map((n: any) => n.text);
  const allText = noteTexts.join(' ').toLowerCase();

  // Keyword-based analysis from case notes
  const hasPeerPositive = allText.includes('positive peer') || allText.includes('gets along') || allText.includes('talked w/ peers') || allText.includes('played game') || allText.includes('cooperative');
  const hasPeerNegative = allText.includes('conflict with peer') || allText.includes('peer issue') || allText.includes('argument') || allText.includes('fight');
  const hasAdultPositive = allText.includes('respectful') || allText.includes('followed') || allText.includes('responsive') || allText.includes('compliant') || allText.includes('on time');
  const hasAdultNegative = allText.includes('defiant') || allText.includes('refused') || allText.includes('disrespectful') || allText.includes('non-compliant');
  const hasInvestPositive = allText.includes('engaged') || allText.includes('participated') || allText.includes('motivated') || allText.includes('completed chore') || allText.includes('went to school');
  const hasInvestNegative = allText.includes('refused to participate') || allText.includes('sleeping') || allText.includes('disengaged') || allText.includes('did not');
  const hasAuthPositive = allText.includes('accepted feedback') || allText.includes('followed schedule') || allText.includes('followed the schedule') || allText.includes('appropriate');
  const hasAuthNegative = allText.includes('power struggle') || allText.includes('challenged') || allText.includes('sagging') || allText.includes('saggi');

  const recentStaffObs = noteTexts.slice(-3).join(' ');
  const truncObs = recentStaffObs.length > 300 ? recentStaffObs.substring(0, 300) + '...' : recentStaffObs;

  return {
    peerInteraction: hasPeerPositive && !hasPeerNegative
      ? `${youth.firstName} has demonstrated positive peer interactions during this period. Case notes document him engaging cooperatively with other residents, participating in group activities, and maintaining respectful relationships. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : hasPeerNegative
      ? `Peer interactions remain an area of focus for ${youth.firstName}. Notes document some challenges with peer relationships including conflicts that required staff intervention. The treatment team continues to work with him on respectful communication and conflict de-escalation. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : `${youth.firstName}'s peer interactions are developing as documented in staff case notes. He is working on maintaining positive relationships and shows moments of cooperation with other residents. ${truncObs ? 'Recent observations: ' + truncObs : ''}`,

    adultInteraction: hasAdultPositive && !hasAdultNegative
      ? `Case notes document ${youth.firstName} maintaining respectful and responsive interactions with staff during this period. He has been compliant with directives and seeks appropriate support from adults. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : hasAdultNegative
      ? `Case notes indicate ${youth.firstName} continues to work on appropriate interactions with authority figures. Staff have documented instances of non-compliance or difficulty accepting redirection. Staff are providing consistent structure and modeling to support his growth in this area. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : `${youth.firstName}'s interactions with staff are progressing as documented in case notes. He is generally responsive to staff guidance and is working on consistent compliance with program expectations. ${truncObs ? 'Recent observations: ' + truncObs : ''}`,

    investmentLevel: hasInvestPositive && !hasInvestNegative
      ? `${youth.firstName} has shown strong investment in his treatment and daily programming. Case notes indicate he actively participates in scheduled activities, completes assigned tasks, and engages in the program. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : hasInvestNegative
      ? `Investment level remains an area needing development based on case note documentation. Staff have noted instances where ${youth.firstName} disengaged from activities or did not follow through on expectations. Staff continue to work with him on understanding the value of treatment participation. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : `${youth.firstName} demonstrates developing investment in his treatment goals as documented by staff. He participates in daily programming and is working on maintaining consistent effort in all program areas. ${truncObs ? 'Recent observations: ' + truncObs : ''}`,

    dealWithAuthority: hasAuthPositive && !hasAuthNegative
      ? `Case notes document ${youth.firstName} demonstrating appropriate skills in managing authority and structure. He has followed program expectations, accepted feedback appropriately, and shown maturity in navigating rules and limits. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : hasAuthNegative
      ? `Dealing with authority remains a focus area for ${youth.firstName} based on staff documentation. Case notes indicate some difficulty accepting limits and following through with expectations. The treatment team addresses this through consistent boundaries, natural consequences, and processing. ${truncObs ? 'Recent observations: ' + truncObs : ''}`
      : `${youth.firstName} is managing program structure as documented in case notes. He generally works within program expectations and is learning to accept limits and respond appropriately to authority. ${truncObs ? 'Recent observations: ' + truncObs : ''}`,

    socialStrengths: youth.strengthsTalents
      ? `${youth.firstName}'s social strengths include ${youth.strengthsTalents.toLowerCase()}. ${caseNotes.length > 0 && caseNotes[0].sections?.strengthsChallenges ? caseNotes[0].sections.strengthsChallenges.substring(0, 200) : 'Staff have observed his ability to connect with others positively when engaged and motivated.'}`
      : `${youth.firstName} shows emerging social strengths as documented in case notes, including ${hasPeerPositive ? 'the ability to form positive peer connections and cooperate in group settings' : 'moments of empathy and willingness to help others'}. ${caseNotes.length > 0 && caseNotes[0].sections?.strengthsChallenges ? caseNotes[0].sections.strengthsChallenges.substring(0, 200) : 'He is developing his capacity for healthy relationships and appropriate social engagement.'}`,

    socialDeficiencies: hasPeerNegative || hasAdultNegative
      ? `Areas for continued growth include ${hasPeerNegative ? 'peer conflict resolution and appropriate social boundaries' : ''}${hasPeerNegative && hasAdultNegative ? ', and ' : ''}${hasAdultNegative ? 'respectful communication with authority figures' : ''}. ${youth.firstName} benefits from coaching on emotional regulation, impulse control, and expressing needs appropriately. Staff provide consistent modeling and skill-building opportunities to address these areas.`
      : `While ${youth.firstName} has made progress in many areas, continued development is needed in generalizing positive social skills across all settings. ${caseNotes.length > 0 && caseNotes[0].sections?.interventionsResponse ? caseNotes[0].sections.interventionsResponse.substring(0, 200) : 'The treatment team continues to work on building his social awareness and self-regulation skills.'}`,

    narrative: `Based on ${caseNotes.length} documented case notes during this evaluation period, ${youth.firstName} has been ${hasInvestPositive && hasAdultPositive ? 'making positive progress' : hasInvestNegative || hasAdultNegative ? 'working through some challenges' : 'progressing steadily'} in his treatment.

${caseNotes.length > 0 ? 'Recent Observations: ' + noteTexts.slice(-2).join(' ') : ''}

Next Steps: ${caseNotes.length > 0 && caseNotes[caseNotes.length - 1].sections?.planNextSteps ? caseNotes[caseNotes.length - 1].sections.planNextSteps : `The treatment team will continue to monitor ${youth.firstName}'s progress, provide targeted interventions, and work with him on achieving his treatment goals.`}`
  };
}

// Strip markdown formatting from AI output
const stripMarkdown = (text: string): string =>
  text.replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1')          // *italic* → italic
    .replace(/^#{1,6}\s+/gm, '')            // # headers → plain text
    .replace(/^[-*]\s+/gm, '- ');           // normalize bullets

// Mock AI responses for when API is not available — based on case notes only, no markdown formatting
const generateMockAISummary = (payload: AISummaryRequest): string => {
  const { youth, reportType, period, data } = payload;

  const noteCount = data.progressNotes?.length || 0;

  // Extract readable text from case notes
  const caseNotesText = (data.progressNotes || [])
    .map((note: any) => {
      if (typeof note?.note === 'string') {
        try {
          const parsed = JSON.parse(note.note);
          if (parsed?.sections) {
            return [
              parsed.sections.summary,
              parsed.sections.strengthsChallenges,
              parsed.sections.interventionsResponse,
              parsed.sections.planNextSteps
            ].filter(Boolean).join(' ');
          }
          if (typeof parsed?.summary === 'string') return parsed.summary;
          if (typeof parsed?.content === 'string') return parsed.content;
          return note.note;
        } catch {
          return note.note;
        }
      }
      if (typeof note?.summary === 'string' && note.summary.trim().length > 0) {
        return note.summary;
      }
      return '';
    })
    .filter((entry: string) => entry && entry.trim().length > 0);

  const caseNotesSummary = caseNotesText.length > 0
    ? caseNotesText.slice(0, 3).join(' ')
    : 'Staff continue to document treatment interventions, family contacts, and daily activities.';

  const daysInTreatment = youth.admissionDate ? Math.floor((new Date().getTime() - new Date(youth.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) : null;

  // Generate text for form fields based on case notes — no report-type preamble, just content
  switch (reportType) {
    case 'court':
      return `${youth.firstName} ${youth.lastName} has been in residential placement at Heartland Boys Home${daysInTreatment ? ' for ' + daysInTreatment + ' days' : ''}, currently at Level ${youth.level || 'N/A'}. During the reporting period from ${period.startDate} to ${period.endDate}, ${noteCount} case notes were documented by staff.

${caseNotesText.length > 0 ? 'Staff observations during this period include: ' + caseNotesSummary : 'Case documentation is ongoing.'}

${youth.firstName}'s current diagnoses of ${youth.currentDiagnoses || youth.diagnoses || 'behavioral and emotional challenges'} are being addressed through evidence-based interventions. The treatment team continues to monitor progress and adjust interventions accordingly.

Academic performance in ${youth.currentSchool || 'the on-site education program'} shows ${youth.academicStrengths ? 'particular strength in ' + youth.academicStrengths : 'ongoing engagement'}. ${youth.hasIEP ? 'IEP goals are being addressed through specialized instruction and accommodations.' : ''}

Continued residential treatment is recommended to consolidate gains and address remaining treatment objectives. ${youth.firstName} would benefit from ongoing therapeutic support and structured programming to maintain progress and prepare for successful community reintegration.`;

    case 'dpnWeekly':
    case 'dpnBiWeekly':
    case 'dpnMonthly': {
      const periodLabel = reportType === 'dpnWeekly' ? 'this week' : reportType === 'dpnBiWeekly' ? 'the past two weeks' : 'this month';

      return `${youth.firstName} has been ${caseNotesText.length > 0 ? 'actively engaged in programming' : 'participating in treatment'} ${periodLabel}. ${noteCount} case notes were documented during this period.

Day-to-Day Observations:

${caseNotesText.length > 0 ? caseNotesText.slice(0, 3).join('\n\n') : 'Staff continue to document daily observations and interventions.'}

${youth.strengthsTalents ? 'Strengths We Are Building On: ' + youth.strengthsTalents : ''}

Next Steps: The treatment team will continue to monitor ${youth.firstName}'s progress, provide targeted interventions, and work with him on achieving his treatment goals and preparing for next steps.`;
    }

    case 'progress':
    case 'progressMonthly':
      return `${youth.firstName} ${youth.lastName} has been in residential treatment${daysInTreatment ? ' for ' + daysInTreatment + ' days' : ''}. Current treatment level: Level ${youth.level || 'N/A'}.

Staff Observations: During this period, ${noteCount} case notes were documented. ${caseNotesSummary}

Clinical Progress: Treatment addressing ${youth.currentDiagnoses || youth.diagnoses || 'behavioral and emotional challenges'} continues with evidence-based interventions. ${youth.firstName} demonstrates developing insight into triggers and is working on healthier response patterns.

Educational Progress: ${youth.currentSchool || 'On-site education program'} participation shows ${youth.academicStrengths ? 'strength in ' + youth.academicStrengths : 'ongoing engagement'}. ${youth.hasIEP ? 'IEP goals are being addressed through specialized instruction.' : ''}

Discharge Planning: ${youth.dischargePlan?.parents ? 'Plan involves return to parents.' : youth.dischargePlan?.relative ? 'Plan involves placement with relative (' + youth.dischargePlan.relative.name + ').' : 'Continued placement planning is underway.'} Estimated timeline: ${youth.estimatedStay || 'to be determined based on continued progress'}.`;

    default:
      return `${youth.firstName} ${youth.lastName} continues to participate in residential treatment programming during the reporting period. ${noteCount} case notes were documented by staff.

${caseNotesText.length > 0 ? 'Staff observations: ' + caseNotesSummary : 'Case documentation is ongoing.'}

Treatment interventions addressing ${youth.currentDiagnoses || youth.diagnoses || 'identified clinical needs'} continue with evidence-based approaches. ${youth.firstName} is working on developing insight into behavioral patterns and building healthier coping strategies.

Educational programming continues to address ${youth.hasIEP ? 'IEP goals and specialized learning needs' : 'academic objectives'} with noted strengths in ${youth.academicStrengths || 'various subject areas'}.

Family engagement includes regular contact with ${youth.legalGuardian || 'identified support system'} and participation in discharge planning activities. Treatment team recommends continued residential services to consolidate therapeutic gains.`;
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

    return stripMarkdown(data.summary || '');

  } catch (e) {
    console.warn('AI service unavailable, using enhanced mock AI summary:', e);

    // Return enhanced mock AI summary with improved quality
    return stripMarkdown(generateMockAISummary(payload));
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
      return stripMarkdown(data.insights || generateLocalBehavioralInsights(behaviorData, youth));
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
