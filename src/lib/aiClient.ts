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

// Generate AI comments for all DPN fields
export function generateDPNFieldComments(payload: AISummaryRequest): DPNFieldComments {
  const { youth, data } = payload;

  // Extract insights from daily ratings
  const ratings = data.dailyRatings || [];
  const avgPeer = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.peerInteraction || 0), 0) / ratings.length : 0;
  const avgAdult = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.adultInteraction || 0), 0) / ratings.length : 0;
  const avgInvest = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.investmentLevel || 0), 0) / ratings.length : 0;
  const avgAuth = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.dealAuthority || 0), 0) / ratings.length : 0;

  // Extract comments from ratings
  const peerComments = ratings.map((r: any) => r.peerInteractionComment).filter(Boolean);
  const adultComments = ratings.map((r: any) => r.adultInteractionComment).filter(Boolean);
  const investComments = ratings.map((r: any) => r.investmentLevelComment).filter(Boolean);
  const authComments = ratings.map((r: any) => r.dealAuthorityComment).filter(Boolean);

  // Extract case notes
  const caseNotes = (data.progressNotes || []).map((note: any) => {
    if (typeof note.note === 'string') {
      try {
        const parsed = JSON.parse(note.note);
        if (parsed.sections) {
          return {
            summary: parsed.sections.summary,
            strengths: parsed.sections.strengthsChallenges,
            interventions: parsed.sections.interventionsResponse,
            nextSteps: parsed.sections.planNextSteps
          };
        }
      } catch {}
    }
    return null;
  }).filter(Boolean);

  const totalPoints = data.behaviorPoints?.reduce((sum: number, p: any) => sum + (p.totalPoints || 0), 0) || 0;
  const avgPoints = data.behaviorPoints?.length ? Math.round(totalPoints / data.behaviorPoints.length) : 0;

  return {
    peerInteraction: avgPeer >= 3.5
      ? `${youth.firstName} has demonstrated excellent peer interactions during this period, averaging ${avgPeer.toFixed(1)}/4. He consistently shows respect, cooperation, and positive social engagement with other residents. ${peerComments.length > 0 ? 'Staff noted: "' + peerComments.slice(0, 2).join('" and "') + '"' : 'He handles conflicts appropriately and often helps newer residents adjust to the program.'}`
      : avgPeer >= 2.5
      ? `${youth.firstName} shows solid progress in peer interactions (${avgPeer.toFixed(1)}/4 average). He's working on maintaining positive relationships and has shown improvement in conflict resolution. ${peerComments.length > 0 ? 'Staff observations include: "' + peerComments.slice(0, 2).join('" and "') + '"' : 'He generally gets along well with peers but occasionally needs staff support to navigate disagreements.'}`
      : `Peer interactions remain an area of focus for ${youth.firstName} (averaging ${avgPeer.toFixed(1)}/4). ${peerComments.length > 0 ? 'Staff noted challenges: "' + peerComments.slice(0, 2).join('" and "') + '"' : 'He has experienced conflicts with other residents and benefits from staff coaching on appropriate social skills.'} The treatment team continues to work with him on respectful communication and conflict de-escalation.`,

    adultInteraction: avgAdult >= 3.5
      ? `${youth.firstName}'s interactions with staff have been exemplary this period (${avgAdult.toFixed(1)}/4). He is consistently respectful, responsive to redirection, and actively seeks appropriate support from staff. ${adultComments.length > 0 ? 'Staff commented: "' + adultComments.slice(0, 2).join('" and "') + '"' : 'He demonstrates maturity in how he communicates with adults and accepts feedback constructively.'}`
      : avgAdult >= 2.5
      ? `Staff interactions are generally positive (${avgAdult.toFixed(1)}/4 average). ${youth.firstName} is usually respectful and responsive, though he occasionally needs reminders about boundaries and expectations. ${adultComments.length > 0 ? 'Staff noted: "' + adultComments.slice(0, 2).join('" and "') + '"' : 'He is working on consistent compliance with directives and appropriate communication with adults.'}`
      : `${youth.firstName} continues to work on appropriate interactions with authority figures (${avgAdult.toFixed(1)}/4). ${adultComments.length > 0 ? 'Staff documented: "' + adultComments.slice(0, 2).join('" and "') + '"' : 'He sometimes struggles with accepting redirection and maintaining respectful communication.'} Staff are providing consistent structure and modeling to support his growth in this area.`,

    investmentLevel: avgInvest >= 3.5
      ? `${youth.firstName} has shown impressive investment in his treatment and personal growth (${avgInvest.toFixed(1)}/4). He actively participates in therapy, engages meaningfully in groups, and demonstrates genuine buy-in to program goals. ${investComments.length > 0 ? 'Staff observed: "' + investComments.slice(0, 2).join('" and "') + '"' : 'He asks thoughtful questions, applies learned skills, and shows insight into his behaviors and triggers.'}`
      : avgInvest >= 2.5
      ? `${youth.firstName} demonstrates developing investment in his treatment goals (${avgInvest.toFixed(1)}/4). He participates when encouraged and is starting to make connections between behaviors and consequences. ${investComments.length > 0 ? 'Staff noted: "' + investComments.slice(0, 2).join('" and "') + '"' : 'He shows moments of genuine engagement and is working on maintaining consistent effort in all program areas.'}`
      : `Investment level remains an area needing development (${avgInvest.toFixed(1)}/4). ${investComments.length > 0 ? 'Staff documented: "' + investComments.slice(0, 2).join('" and "') + '"' : `${youth.firstName} sometimes goes through the motions rather than fully engaging in treatment activities.`} Staff continue to work with him on understanding the value of treatment and connecting program participation to his personal goals.`,

    dealWithAuthority: avgAuth >= 3.5
      ? `${youth.firstName} has demonstrated strong skills in managing authority and structure (${avgAuth.toFixed(1)}/4). He follows program expectations consistently, accepts feedback appropriately, and shows maturity in how he navigates rules and limits. ${authComments.length > 0 ? 'Staff commented: "' + authComments.slice(0, 2).join('" and "') + '"' : 'He rarely challenges boundaries inappropriately and often helps model positive compliance for peers.'}`
      : avgAuth >= 2.5
      ? `${youth.firstName} is managing program structure reasonably well (${avgAuth.toFixed(1)}/4). While there are occasional power struggles, he generally works within the program expectations. ${authComments.length > 0 ? 'Staff noted: "' + authComments.slice(0, 2).join('" and "') + '"' : 'He is learning to accept limits more gracefully and is improving in his response to authority.'}`
      : `Dealing with authority remains a focus area for ${youth.firstName} (${avgAuth.toFixed(1)}/4). ${authComments.length > 0 ? 'Staff documented: "' + authComments.slice(0, 2).join('" and "') + '"' : 'He has difficulty accepting limits and following through with expectations.'} The treatment team addresses this through consistent boundaries, natural consequences, and processing to build his understanding of healthy responses to authority.`,

    socialStrengths: youth.strengthsTalents
      ? `${youth.firstName}'s social strengths include ${youth.strengthsTalents.toLowerCase()}. ${avgPeer >= 3 ? `He demonstrates natural leadership abilities and often serves as a positive role model for peers. ` : ''}${caseNotes.length > 0 && caseNotes[0].strengths ? caseNotes[0].strengths.substring(0, 200) + '...' : 'Staff have observed his ability to connect with others positively when engaged and motivated.'}`
      : `${youth.firstName} shows emerging social strengths including ${avgPeer >= 3 ? 'the ability to form positive peer connections and cooperate in group settings' : 'moments of empathy and willingness to help others'}. ${caseNotes.length > 0 && caseNotes[0].strengths ? caseNotes[0].strengths.substring(0, 200) + '...' : 'He is developing his capacity for healthy relationships and appropriate social engagement.'}`,

    socialDeficiencies: avgPeer < 2.5 || avgAdult < 2.5
      ? `Areas for continued growth include ${avgPeer < 2.5 ? 'peer conflict resolution and appropriate social boundaries' : ''}${avgPeer < 2.5 && avgAdult < 2.5 ? ', and ' : ''}${avgAdult < 2.5 ? 'respectful communication with authority figures' : ''}. ${youth.firstName} benefits from coaching on emotional regulation, impulse control, and expressing needs appropriately. Staff provide consistent modeling and skill-building opportunities to address these areas.`
      : `While ${youth.firstName} has made progress in many areas, continued development is needed in ${avgInvest < 3 ? 'maintaining consistent investment in treatment goals' : 'generalizing positive social skills across all settings'}. ${caseNotes.length > 0 && caseNotes[0].interventions ? caseNotes[0].interventions.substring(0, 200) + '...' : 'The treatment team continues to work on building his social awareness and self-regulation skills.'}`,

    narrative: `${youth.firstName}'s been doing ${avgPoints >= 15 ? 'really well' : avgPoints >= 12 ? 'pretty good' : 'alright, with some ups and downs'} during this evaluation period.

**Overall Progress:** With an average of ${avgPoints} points per day and behavioral scores averaging ${((avgPeer + avgAdult + avgInvest + avgAuth) / 4).toFixed(1)}/4 across all domains, ${avgPoints >= 12 ? `${youth.firstName} is making positive strides in his treatment.` : `${youth.firstName} continues to work on meeting program expectations.`}

${caseNotes.length > 0 && caseNotes[0].summary ? `**Recent Observations:** ${caseNotes[0].summary}` : ''}

**Next Steps:** ${caseNotes.length > 0 && caseNotes[0].nextSteps ? caseNotes[0].nextSteps : `The treatment team will continue to monitor ${youth.firstName}'s progress, provide targeted interventions, and work with him on achieving his treatment goals.`}`
  };
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
      // Extract insights from daily ratings
      const ratings = data.dailyRatings || [];
      const avgPeer = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.peerInteraction || 0), 0) / ratings.length : 0;
      const avgAdult = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.adultInteraction || 0), 0) / ratings.length : 0;
      const avgInvest = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.investmentLevel || 0), 0) / ratings.length : 0;
      const avgAuth = ratings.length ? ratings.reduce((sum: number, r: any) => sum + (r.dealAuthority || 0), 0) / ratings.length : 0;

      // Extract comments from ratings
      const allComments = ratings.flatMap((r: any) => [
        r.peerInteractionComment,
        r.adultInteractionComment,
        r.investmentLevelComment,
        r.dealAuthorityComment
      ]).filter(Boolean);

      // Extract case notes narratives
      const caseNotesText = (data.progressNotes || [])
        .map((note: any) => {
          if (typeof note.note === 'string') {
            try {
              const parsed = JSON.parse(note.note);
              if (parsed.sections) {
                return [
                  parsed.sections.summary,
                  parsed.sections.strengthsChallenges,
                  parsed.sections.interventionsResponse,
                  parsed.sections.planNextSteps
                ].filter(Boolean).join(' ');
              }
              return note.note;
            } catch {
              return note.note;
            }
          }
          return '';
        })
        .filter(Boolean);

      const periodLength = reportType === 'dpnWeekly' ? 'this week' : reportType === 'dpnBiWeekly' ? 'the past two weeks' : 'this month';

      return `${youth.firstName}'s been doing ${avgPoints >= 15 ? 'really well' : avgPoints >= 12 ? 'pretty good' : 'alright, with some ups and downs'} ${periodLength}. Here's what we've been seeing:

**Day-to-Day Observations:**

${avgPeer >= 3.5 ? `${youth.firstName} has been great with peers lately - consistently showing respect, cooperation, and even some leadership qualities. The peer interaction scores (averaging ${avgPeer.toFixed(1)}/4) show he's really figured out how to navigate social situations better.` : avgPeer >= 2.5 ? `We're seeing solid progress with peer interactions (averaging ${avgPeer.toFixed(1)}/4). ${youth.firstName}'s working on keeping things positive with the other guys, and we're noticing fewer conflicts than before.` : `Peer interactions have been a bit of a challenge this period (averaging ${avgPeer.toFixed(1)}/4). ${youth.firstName}'s had some rough patches with the other residents, but we're actively working with him on better conflict resolution.`}

${avgAdult >= 3.5 ? `His interactions with staff have been excellent (${avgAdult.toFixed(1)}/4 average). ${youth.firstName} is respectful, responsive to redirection, and actually seeks out staff support when he needs it.` : avgAdult >= 2.5 ? `Staff interactions are going well (${avgAdult.toFixed(1)}/4). ${youth.firstName} is generally respectful and responsive, though he still needs occasional reminders about boundaries and expectations.` : `We're seeing some struggles with staff interactions (${avgAdult.toFixed(1)}/4). ${youth.firstName}'s been a bit resistant to redirection at times, but we're working through it with consistent consequences and support.`}

${avgInvest >= 3.5 ? `What's really impressive is how invested ${youth.firstName}'s been in his treatment (${avgInvest.toFixed(1)}/4). He's actively participating in therapy, engaging in groups, and showing real buy-in to the program.` : avgInvest >= 2.5 ? `${youth.firstName}'s showing decent investment in his treatment goals (${avgInvest.toFixed(1)}/4). He's participating when encouraged and starting to make connections between his behaviors and consequences.` : `Investment level has been lower than we'd like (${avgInvest.toFixed(1)}/4). ${youth.firstName} sometimes goes through the motions rather than really engaging, but we're working on helping him see the value in treatment.`}

${avgAuth >= 3.5 ? `Dealing with authority has been one of ${youth.firstName}'s strengths this period (${avgAuth.toFixed(1)}/4). He's following expectations, accepting feedback well, and showing maturity in how he handles structure.` : avgAuth >= 2.5 ? `He's managing authority and rules reasonably well (${avgAuth.toFixed(1)}/4). There are occasional power struggles, but overall ${youth.firstName}'s learning to work within the program structure.` : `Authority issues have been a focus area (${avgAuth.toFixed(1)}/4). ${youth.firstName}'s had some difficulty accepting limits and following through with expectations, which we're addressing through consistent boundaries and processing.`}

**What Staff Have Noticed:**

${allComments.length > 0 ? allComments.slice(0, 3).map(c => `• ${c}`).join('\n') : '• Staff continue to document daily observations and interventions'}

${caseNotesText.length > 0 ? `\n**From Recent Case Notes:**\n\n${caseNotesText.slice(0, 2).join('\n\n')}` : ''}

**Bottom Line:**

${avgPoints >= 15 ? `${youth.firstName}'s making excellent progress. His daily point average of ${avgPoints} shows consistent positive choices and engagement with the program. We're seeing real growth and maturity.` : avgPoints >= 12 ? `Overall, ${youth.firstName}'s trending in a positive direction with a ${avgPoints} point average. There's definitely room for continued growth, but we're pleased with his progress.` : `${youth.firstName}'s working through some challenges, averaging ${avgPoints} points daily. We're staying focused on supporting him, reinforcing positive behaviors, and addressing areas that need work. The treatment team remains committed to helping him succeed.`}

${youth.strengthsTalents ? `\n**Strengths We're Building On:** ${youth.strengthsTalents}` : ''}

**Next Steps:** We'll keep monitoring progress, adjusting interventions as needed, and working closely with ${youth.firstName} to help him meet his treatment goals and prepare for next steps.`;

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
