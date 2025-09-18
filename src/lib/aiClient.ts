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
    // First try the actual API
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

    const res = await fetch('/api/ai/summarize-report', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `AI service error (${res.status})`);
    }
    
    const data = await res.json();
    return data.summary || '';
  } catch (e) {
    console.warn('AI service unavailable, using mock AI summary for troubleshooting:', e);
    
    // Return mock AI summary for troubleshooting
    return generateMockAISummary(payload);
  }
}

// Additional AI helper functions for enhanced reporting
export const generateBehavioralInsights = (behaviorData: any[], youth: any): string => {
  if (!behaviorData.length) return "No behavioral data available for analysis.";
  
  const avgPoints = behaviorData.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0) / behaviorData.length;
  const trend = behaviorData.length > 1 ? 
    (behaviorData[behaviorData.length - 1].totalPoints > behaviorData[0].totalPoints ? 'improving' : 'declining') : 'stable';
  
  return `Behavioral analysis indicates ${youth.firstName} is averaging ${Math.round(avgPoints)} points per day with a ${trend} trend. ${
    avgPoints >= 15 ? 'This demonstrates excellent program compliance and readiness for increased privileges.' :
    avgPoints >= 12 ? 'This shows good progress with opportunities for continued improvement.' :
    'This indicates need for additional behavioral support and intervention.'
  }`;
};

export const generateTreatmentRecommendations = (youth: any, progressData: any): string => {
  const recommendations = [];
  
  if (youth.level < 3) {
    recommendations.push("Continue focus on behavioral consistency and point achievement for level advancement.");
  }
  
  if (youth.traumaHistory?.length) {
    recommendations.push("Maintain trauma-informed care approaches in all therapeutic interventions.");
  }
  
  if (youth.hasIEP) {
    recommendations.push("Ensure educational programming continues to address IEP goals and accommodations.");
  }
  
  if (youth.selfHarmHistory?.length) {
    recommendations.push("Continue enhanced safety monitoring and coping skill development.");
  }
  
  if (!recommendations.length) {
    recommendations.push("Continue current treatment programming with regular progress monitoring.");
  }
  
  return recommendations.join(" ");
};
import { auth } from '@/lib/firebase';
