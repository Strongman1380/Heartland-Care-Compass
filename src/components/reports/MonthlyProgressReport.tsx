import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormattedText } from "@/components/ui/formatted-text";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Save, FileDown, RotateCcw, Sparkles } from "lucide-react";
import { format, differenceInDays, differenceInWeeks, differenceInMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "@/utils/local-storage-utils";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth, getProgressNotesByYouth } from "@/lib/api";
import { calculateTotalPoints, calculatePointsForPeriod } from "@/utils/pointCalculations";
import { getScoresByYouth, type SchoolDailyScore } from "@/utils/schoolScores";
import * as aiService from "@/services/aiService";

// API fetch functions with fallback to localStorage
const fetchBehaviorPointsAPI = async (youthId: string) => {
  try {
    return await getBehaviorPointsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for behavior-points; falling back to localStorage:', e);
    return fetchBehaviorPoints(youthId);
  }
};

const fetchProgressNotesAPI = async (youthId: string) => {
  try {
    return await getProgressNotesByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for progress-notes; falling back to localStorage:', e);
    return fetchProgressNotes(youthId);
  }
};

const fetchDailyRatingsAPI = async (youthId: string) => {
  try {
    return await getDailyRatingsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for daily-ratings; falling back to localStorage:', e);
    return fetchDailyRatings(youthId);
  }
};

interface MonthlyProgressReportProps {
  youth: Youth;
}

interface MonthlyReportData {
  // Youth Profile Information
  fullLegalName: string;
  preferredName: string;
  dateOfBirth: string;
  age: string;
  dateOfAdmission: string;
  lengthOfStay: string;
  currentLevel: string;
  currentPlacement: string;
  probationOfficer: string;
  guardiansInfo: string;
  schoolPlacement: string;
  currentDiagnoses: string;

  // Program Participation & Daily Points (consolidated)
  programParticipationSummary: string;

  // Behavioral Summary
  behavioralSummary: string;

  // Academic Progress (consolidated)
  academicProgressSummary: string;

  // Social/Emotional Development (consolidated)
  socialEmotionalSummary: string;

  // Treatment Progress (consolidated)
  treatmentProgressSummary: string;

  // Future Goals
  futureGoals: string;

  // Report metadata
  preparedBy: string;
  reportDate: string;
  month: string;
  year: string;
}

export const MonthlyProgressReport = ({ youth }: MonthlyProgressReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState<MonthlyReportData>({
    fullLegalName: "",
    preferredName: "",
    dateOfBirth: "",
    age: "",
    dateOfAdmission: "",
    lengthOfStay: "",
    currentLevel: "",
    currentPlacement: "",
    probationOfficer: "",
    guardiansInfo: "",
    schoolPlacement: "",
    currentDiagnoses: "",
    programParticipationSummary: "",
    behavioralSummary: "",
    academicProgressSummary: "",
    socialEmotionalSummary: "",
    treatmentProgressSummary: "",
    futureGoals: "",
    preparedBy: "",
    reportDate: format(new Date(), "yyyy-MM-dd"),
    month: format(new Date(), "MMMM"),
    year: format(new Date(), "yyyy")
  });

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  // AI enhancement state
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);

  // Auto-populate form with youth data
  const autoPopulateForm = async () => {
    if (!youth?.id) {
      console.log('No youth ID provided');
      return;
    }

    console.log('Auto-populating form for youth:', youth.firstName, youth.lastName, 'ID:', youth.id);

    try {
      // Calculate date range for the selected month
      const monthStart = new Date(selectedMonth + "-01");
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

      console.log('Selected month range:', format(monthStart, 'yyyy-MM-dd'), 'to', format(monthEnd, 'yyyy-MM-dd'));

      // Fetch data for the selected month
      const [behaviorPoints, progressNotes, dailyRatings, schoolScores] = await Promise.all([
        fetchBehaviorPointsAPI(youth.id).catch(() => fetchBehaviorPoints(youth.id)),
        fetchProgressNotesAPI(youth.id).catch(() => fetchProgressNotes(youth.id)),
        fetchDailyRatingsAPI(youth.id).catch(() => fetchDailyRatings(youth.id)),
        getScoresByYouth(youth.id).catch((error) => {
          console.warn('Failed to load school scores, continuing without them:', error);
          return [];
        })
      ]);

      console.log('Fetched data:', {
        behaviorPoints: behaviorPoints.length,
        progressNotes: progressNotes.length,
        dailyRatings: dailyRatings.length
      });

      // Filter data for the selected month
      const monthBehaviorPoints = behaviorPoints.filter(point => {
        if (!point.date) return false;
        const pointDate = new Date(point.date);
        return pointDate >= monthStart && pointDate <= monthEnd;
      });

      const monthProgressNotes = progressNotes.filter(note => {
        if (!note.date) return false;
        const noteDate = new Date(note.date);
        return noteDate >= monthStart && noteDate <= monthEnd;
      });

      const monthDailyRatings = dailyRatings.filter(rating => {
        if (!rating.date) return false;
        const ratingDate = new Date(rating.date);
        return ratingDate >= monthStart && ratingDate <= monthEnd;
      });

      const monthSchoolScores = (schoolScores as SchoolDailyScore[]).filter(score => {
        if (!score?.date) return false;
        const scoreDate = new Date(score.date);
        return scoreDate >= monthStart && scoreDate <= monthEnd;
      });
      // Calculate statistics
      const totalPoints = monthBehaviorPoints.reduce((sum, point) => sum + (point.totalPoints || 0), 0);
      const avgPoints = monthBehaviorPoints.length > 0 ? Math.round(totalPoints / monthBehaviorPoints.length) : 0;

      const avgPeerInteraction = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.peerInteraction || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;
      const avgAdultInteraction = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.adultInteraction || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;
      const avgInvestmentLevel = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.investmentLevel || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;
      const avgAuthorityRating = monthDailyRatings.length > 0
        ? Math.round((monthDailyRatings.reduce((sum, r) => sum + (r.dealAuthority || 0), 0) / monthDailyRatings.length) * 10) / 10
        : 0;

      // Calculate length of stay
      let lengthOfStay = "";
      if (youth.admissionDate) {
        const admissionDate = new Date(youth.admissionDate);
        // Set to start of day for date-only comparison
        admissionDate.setHours(0, 0, 0, 0);
        
        const now = new Date();
        // Set to start of day for date-only comparison
        now.setHours(0, 0, 0, 0);
        
        // Check if admission date is in the future
        if (admissionDate > now) {
          lengthOfStay = "Not yet admitted";
        } else {
          // Calculate years, months, and days
          let years = now.getFullYear() - admissionDate.getFullYear();
          let months = now.getMonth() - admissionDate.getMonth();
          let days = now.getDate() - admissionDate.getDate();
          
          // Adjust for negative days
          if (days < 0) {
            months -= 1;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
          }
          
          // Adjust for negative months
          if (months < 0) {
            years -= 1;
            months += 12;
          }
          
          // Build the length of stay string
          const parts = [];
          if (years > 0) {
            parts.push(`${years} year${years > 1 ? 's' : ''}`);
          }
          if (months > 0) {
            parts.push(`${months} month${months > 1 ? 's' : ''}`);
          }
          if (days > 0 || parts.length === 0) {
            parts.push(`${days} day${days > 1 ? 's' : ''}`);
          }
          
          lengthOfStay = parts.join(', ');
        }
      }

      // Calculate age
      let age = "";
      if (youth.dob) {
        const dob = new Date(youth.dob as any);
        const today = new Date();
        age = Math.floor(differenceInDays(today, dob) / 365.25).toString();
      }

      // Map youth data to form fields
      const autoPopulatedData = {
        // Youth Profile Information
        fullLegalName: `${youth.firstName} ${youth.lastName}`,
        preferredName: youth.firstName,
        dateOfBirth: youth.dob ? format(new Date(youth.dob as any), "yyyy-MM-dd") : "",
        age,
        dateOfAdmission: youth.admissionDate ? format(new Date(youth.admissionDate as any), "yyyy-MM-dd") : "",
        lengthOfStay,
        currentLevel: typeof youth.level === 'number' ? `Level ${youth.level}` : `Level ${youth.level}`,
        currentPlacement: "Heartland Boys Home",
        probationOfficer: typeof youth.probationOfficer === 'object'
          ? youth.probationOfficer?.name || ""
          : youth.probationOfficer || "",
        guardiansInfo: formatGuardiansInfo(youth),
        schoolPlacement: youth.currentSchool || youth.lastSchoolAttended || "",
        currentDiagnoses: youth.currentDiagnoses || youth.diagnoses || "",

        // Program Participation & Daily Points (consolidated)
        programParticipationSummary: generateProgramParticipationSummary(
          totalPoints, 
          avgPoints, 
          monthBehaviorPoints.length,
          avgPeerInteraction, 
          avgAdultInteraction, 
          avgInvestmentLevel, 
          avgAuthorityRating,
          monthBehaviorPoints,
          monthDailyRatings
        ),

        // Academic Progress (consolidated)
        academicProgressSummary: generateAcademicProgressSummary(
          youth,
          monthSchoolScores,
          format(monthStart, "MMMM yyyy"),
          monthProgressNotes
        ),

        // Behavioral Summary
        behavioralSummary: generateBehavioralSummary(monthBehaviorPoints, monthProgressNotes),

        // Social/Emotional Development (consolidated)
        socialEmotionalSummary: generateSocialEmotionalSummary(avgPeerInteraction, avgAdultInteraction, avgAuthorityRating),

        // Treatment Progress (consolidated)
        treatmentProgressSummary: generateTreatmentProgressSummary(youth, monthProgressNotes),

        // Future Goals
        futureGoals: generateFutureGoals(youth)
      };

      // Update fields intelligently:
      // - Always update demographic fields (they should stay in sync with youth profile)
      // - Only update narrative/summary fields if empty (preserve user edits)
      setReportData(prev => {
        const updates: Partial<typeof reportData> = {};

        // Fields that should always sync with youth profile
        const alwaysUpdateFields = [
          'fullLegalName', 'preferredName', 'dateOfBirth', 'age',
          'dateOfAdmission', 'lengthOfStay', 'currentLevel', 'currentPlacement',
          'probationOfficer', 'guardiansInfo', 'schoolPlacement', 'currentDiagnoses'
        ];

        // Update each field based on its type
        Object.entries(autoPopulatedData).forEach(([key, value]) => {
          if (alwaysUpdateFields.includes(key)) {
            // Always update demographic fields with latest youth profile data
            if (value) {
              updates[key as keyof typeof reportData] = value as any;
            }
          } else {
            // Only update narrative/summary fields if they're currently empty
            if (!prev[key as keyof typeof reportData] && value) {
              updates[key as keyof typeof reportData] = value as any;
            }
          }
        });

        return { ...prev, ...updates };
      });

    } catch (error) {
      console.error("Error auto-populating form:", error);
    }
  };

  // Helper functions for generating content
  const formatGuardiansInfo = (youth: Youth): string => {
    const guardians = [];
    if (youth.legalGuardian) {
      if (typeof youth.legalGuardian === 'object') {
        guardians.push(`${youth.legalGuardian.name || 'Legal Guardian'} (Relationship: ${youth.guardianRelationship || 'Unknown'})`);
      } else {
        guardians.push(`${youth.legalGuardian} (Legal Guardian)`);
      }
    }
    if (youth.mother?.name) guardians.push(`${youth.mother.name} (Mother)`);
    if (youth.father?.name) guardians.push(`${youth.father.name} (Father)`);
    if (youth.nextOfKin?.name) guardians.push(`${youth.nextOfKin.name} (Next of Kin: ${youth.nextOfKin.relationship || 'Unknown'})`);

    return guardians.length > 0 ? guardians.join('; ') : "No guardian information available";
  };

  const generateHighPointAreas = (peer: number, adult: number, investment: number, authority: number): string => {
    const strengths = [];
    if (peer >= 4) strengths.push("peer relationships");
    if (adult >= 4) strengths.push("staff relationships");
    if (investment >= 4) strengths.push("program engagement");
    if (authority >= 4) strengths.push("rule compliance");
    return strengths.length > 0 ? `Strong in: ${strengths.join(', ')}` : "Areas of strength to be identified";
  };

  const generateLowPointAreas = (peer: number, adult: number, investment: number, authority: number): string => {
    const struggles = [];
    if (peer < 3) struggles.push("peer relationships");
    if (adult < 3) struggles.push("staff relationships");
    if (investment < 3) struggles.push("program engagement");
    if (authority < 3) struggles.push("rule compliance");
    return struggles.length > 0 ? `Areas needing improvement: ${struggles.join(', ')}` : "No significant struggle areas identified";
  };

  const generateTrendsAnalysis = (behaviorPoints: any[], dailyRatings: any[]): string => {
    if (behaviorPoints.length < 2) return "Insufficient data for trend analysis";

    const recentAvg = behaviorPoints.slice(-7).reduce((sum, p) => sum + (p.totalPoints || 0), 0) /
                      Math.max(1, behaviorPoints.slice(-7).length);
    const earlierAvg = behaviorPoints.slice(0, -7).reduce((sum, p) => sum + (p.totalPoints || 0), 0) /
                       Math.max(1, behaviorPoints.slice(0, -7).length);

    if (earlierAvg === 0) return "Positive trend established this reporting period";

    const trend = recentAvg > earlierAvg ? "improving" : recentAvg < earlierAvg ? "needs improvement" : "stable";
    return `Point earning trending ${trend} (Recent avg: ${Math.round(recentAvg)}, Overall avg: ${Math.round(earlierAvg)})`;
  };

  const generateAcademicProgress = (youth: Youth): string => {
    if (youth.academicStrengths || youth.academicChallenges) {
      return `${youth.academicStrengths ? `Strengths: ${youth.academicStrengths}. ` : ''}${youth.academicChallenges ? `Areas for growth: ${youth.academicChallenges}.` : ''}`;
    }
    return `${youth.firstName} is enrolled in ${youth.currentGrade || 'education program'}. Academic progress monitoring ongoing.`;
  };

  const generateSchoolPerformance = (youth: Youth): string => {
    return `Current school: ${youth.currentSchool || youth.lastSchoolAttended || 'Not specified'}. ${youth.schoolContact ? `Contact: ${youth.schoolContact}` : ''} ${youth.schoolPhone ? `Phone: ${youth.schoolPhone}` : ''}`.trim();
  };

  const generateBehavioralSummary = (behaviorPoints: any[], progressNotes: any[]): string => {
    const totalPoints = behaviorPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const avgPoints = behaviorPoints.length > 0 ? Math.round(totalPoints / behaviorPoints.length) : 0;

    let summary = `${behaviorPoints.length} days tracked with ${totalPoints} total points earned (average: ${avgPoints} points/day). `;

    const highlights = collectCaseNoteHighlights(progressNotes, 3);
    if (highlights.length > 0) {
      summary += `Recent case notes highlight: ${highlights.join(' | ')}.`;
    } else {
      summary += "Recent case notes emphasize consistent program engagement without notable incidents.";
    }

    return summary;
  };

  const generateSocialProgress = (peerAvg: number, adultAvg: number): string => {
    const peerDesc = peerAvg >= 4 ? "excellent" : peerAvg >= 3 ? "good" : peerAvg >= 2 ? "developing" : "needs improvement";
    const adultDesc = adultAvg >= 4 ? "excellent" : adultAvg >= 3 ? "good" : adultAvg >= 2 ? "developing" : "needs improvement";
    return `Peer interactions rated ${peerDesc} (avg: ${peerAvg}/5). Staff relationships rated ${adultDesc} (avg: ${adultAvg}/5).`;
  };

  const generateEmotionalRegulation = (authorityAvg: number): string => {
    const level = authorityAvg >= 4 ? "high" : authorityAvg >= 3 ? "moderate" : "developing";
    return `${level} level of emotional regulation and rule compliance observed (avg rating: ${authorityAvg}/5).`;
  };

  const generatePeerRelationships = (peerAvg: number): string => {
    const desc = peerAvg >= 4 ? "strong positive relationships" : peerAvg >= 3 ? "generally positive" : "areas for development";
    return `Demonstrates ${desc} with peers (avg rating: ${peerAvg}/5).`;
  };

  const generateTreatmentGoals = (youth: Youth): string => {
    if (youth.treatmentFocus) {
      const goals = [];
      if (youth.treatmentFocus.excessiveDependency) goals.push("Reduce excessive dependency");
      if (youth.treatmentFocus.withdrawalIsolation) goals.push("Increase social engagement");
      if (youth.treatmentFocus.parentChildRelationship) goals.push("Improve parent-child relationships");
      if (youth.treatmentFocus.peerRelationship) goals.push("Develop positive peer relationships");
      if (youth.treatmentFocus.acceptanceOfAuthority) goals.push("Accept authority figures");
      if (youth.treatmentFocus.lying) goals.push("Address dishonest behavior");
      if (youth.treatmentFocus.poorAcademicAchievement) goals.push("Improve academic performance");
      if (youth.treatmentFocus.poorSelfEsteem) goals.push("Build self-esteem");
      if (youth.treatmentFocus.manipulative) goals.push("Address manipulative behaviors");
      return goals.length > 0 ? `Treatment focuses on: ${goals.join(', ')}` : "Individualized treatment plan in development";
    }
    return "Treatment goals focused on behavioral modification, skill development, and emotional regulation";
  };

  const generateTreatmentProgress = (progressNotes: any[]): string => {
    if (progressNotes.length === 0) return "Progress notes documenting treatment engagement and goal achievement";
    const recentProgress = progressNotes.slice(-5);
    return `${recentProgress.length} recent progress notes documenting treatment progress and skill building`;
  };

  const generateTherapyParticipation = (youth: Youth): string => {
    if (youth.currentCounseling && youth.currentCounseling.length > 0) {
      return `Participating in: ${youth.currentCounseling.join(', ')}. ${youth.therapistName ? `Therapist: ${youth.therapistName}` : ''}`;
    }
    return "Regular therapy participation as scheduled by treatment team";
  };

  const generateRiskFactors = (youth: Youth): string => {
    const factors = [];
    if (youth.gangInvolvement) factors.push("gang involvement");
    if (youth.historyVandalism) factors.push("history of vandalism");
    if (youth.familyViolentCrimes) factors.push("family history of violent crimes");
    if (youth.selfHarmHistory?.length > 0) factors.push("self-harm history");
    if (youth.historyPhysicallyHurting) factors.push("history of physical harm to others");

    if (factors.length > 0) {
      return `Identified risk factors: ${factors.join(', ')}. Risk mitigation strategies include close supervision, skill-building activities, and therapeutic interventions.`;
    }
    return "Regular risk assessment with no elevated risk factors identified";
  };

  const generateFutureGoals = (youth: Youth): string => {
    return "Continue skill development, academic progress, and positive relationships to prepare for next phase of care";
  };

  const extractCaseNoteContent = (note: any): string => {
    if (!note) return "";
    if (typeof note.summary === 'string' && note.summary.trim().length > 0) {
      return note.summary.trim();
    }
    const rawNote = typeof note.note === 'string' ? note.note : "";
    if (!rawNote) return "";
    try {
      const parsed = JSON.parse(rawNote);
      if (parsed?.sections) {
        return Object.values(parsed.sections)
          .filter((value) => typeof value === 'string' && value.trim().length > 0)
          .join(' ');
      }
      if (parsed?.content && typeof parsed.content === 'string') {
        return parsed.content;
      }
    } catch {
      // Not JSON - return raw text
    }
    return rawNote;
  };

  const formatCaseNoteHighlight = (note: any): string => {
    const content = extractCaseNoteContent(note);
    if (!content) return "";

    let noteDate = "";
    if (note?.date) {
      const parsedDate = new Date(note.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        noteDate = format(parsedDate, "MMM d");
      }
    }

    const staff = note?.staff ? ` (${note.staff})` : "";
    const snippet = content.length > 180 ? `${content.slice(0, 177)}...` : content;
    return `${noteDate ? `${noteDate}: ` : ""}${snippet}${staff}`;
  };

  const collectCaseNoteHighlights = (notes: any[], limit = 3): string[] => {
    if (!notes || notes.length === 0) return [];
    const sorted = [...notes].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });
    return sorted
      .slice(-limit)
      .map(formatCaseNoteHighlight)
      .filter(Boolean);
  };

  // New consolidated generator functions
  const generateProgramParticipationSummary = (
    totalPoints: number,
    avgPoints: number,
    daysTracked: number,
    peerAvg: number,
    adultAvg: number,
    investmentAvg: number,
    authorityAvg: number,
    behaviorPoints: any[],
    dailyRatings: any[]
  ): string => {
    let summary = `During this reporting period, ${youth.firstName} earned ${totalPoints} total points over ${daysTracked} days, averaging ${avgPoints} points per day. `;

    // Strengths
    const strengths = [];
    if (peerAvg >= 4) strengths.push("peer relationships");
    if (adultAvg >= 4) strengths.push("staff relationships");
    if (investmentAvg >= 4) strengths.push("program engagement");
    if (authorityAvg >= 4) strengths.push("rule compliance");
    
    if (strengths.length > 0) {
      summary += `Areas of strength include: ${strengths.join(', ')}. `;
    }

    // Struggles
    const struggles = [];
    if (peerAvg < 3) struggles.push("peer relationships");
    if (adultAvg < 3) struggles.push("staff relationships");
    if (investmentAvg < 3) struggles.push("program engagement");
    if (authorityAvg < 3) struggles.push("rule compliance");
    
    if (struggles.length > 0) {
      summary += `Areas needing improvement: ${struggles.join(', ')}. `;
    }

    // Trends
    if (behaviorPoints.length >= 2) {
      const recentAvg = behaviorPoints.slice(-7).reduce((sum, p) => sum + (p.totalPoints || 0), 0) / Math.max(1, behaviorPoints.slice(-7).length);
      const earlierAvg = behaviorPoints.slice(0, -7).reduce((sum, p) => sum + (p.totalPoints || 0), 0) / Math.max(1, behaviorPoints.slice(0, -7).length);
      
      if (earlierAvg > 0) {
        const trend = recentAvg > earlierAvg ? "improving" : recentAvg < earlierAvg ? "declining" : "stable";
        summary += `Overall trend is ${trend} (recent average: ${Math.round(recentAvg)} points, earlier average: ${Math.round(earlierAvg)} points).`;
      }
    }

    if (dailyRatings.length > 0) {
      summary += ` Quick scoring snapshot (${dailyRatings.length} entries): peer ${peerAvg.toFixed(1)}/5, staff ${adultAvg.toFixed(1)}/5, investment ${investmentAvg.toFixed(1)}/5, authority ${authorityAvg.toFixed(1)}/5.`;
    } else {
      summary += " No quick scoring entries were recorded during this period.";
    }

    return summary;
  };

  const generateAcademicProgressSummary = (
    youth: Youth,
    schoolScores: SchoolDailyScore[],
    periodLabel: string,
    progressNotes: any[]
  ): string => {
    let summary = `${youth.firstName} is currently enrolled in ${youth.currentGrade || 'education program'}`;
    
    if (youth.currentSchool || youth.lastSchoolAttended) {
      summary += ` at ${youth.currentSchool || youth.lastSchoolAttended}`;
    }
    summary += `. `;

    if (youth.academicStrengths) {
      summary += `Academic strengths include: ${youth.academicStrengths}. `;
    }

    if (youth.academicChallenges) {
      summary += `Areas for academic growth: ${youth.academicChallenges}. `;
    }

    if (youth.educationGoals) {
      summary += `Educational goals: ${youth.educationGoals}. `;
    }

    if (youth.schoolContact) {
      summary += `School contact: ${youth.schoolContact}${youth.schoolPhone ? ` (${youth.schoolPhone})` : ''}.`;
    }

    if (schoolScores.length > 0) {
      const total = schoolScores.reduce((acc, score) => acc + Number(score.score ?? 0), 0);
      const average = (total / schoolScores.length).toFixed(1);
      const highest = Math.max(...schoolScores.map(score => Number(score.score ?? 0))).toFixed(1);
      const lowest = Math.min(...schoolScores.map(score => Number(score.score ?? 0))).toFixed(1);
      summary += ` During ${periodLabel}, ${schoolScores.length} school daily scores were recorded with an average of ${average}/4 (range ${lowest}–${highest}). `;
    } else {
      summary += ` No school daily scores were recorded for ${periodLabel}. `;
    }

    const academicNotes = collectCaseNoteHighlights(
      progressNotes.filter(note => {
        const content = extractCaseNoteContent(note).toLowerCase();
        return content.includes('school') || content.includes('academic') || content.includes('class') || content.includes('grade');
      }),
      2
    );

    if (academicNotes.length > 0) {
      summary += `Recent academic case notes highlight: ${academicNotes.join(' | ')}. `;
    }

    if (!youth.academicStrengths && !youth.academicChallenges && !youth.educationGoals) {
      summary += `Academic progress is being monitored regularly with ongoing support from educational staff.`;
    }

    return summary;
  };

  const generateTreatmentProgressSummary = (youth: Youth, progressNotes: any[]): string => {
    let summary = "";

    // Treatment goals
    if (youth.treatmentFocus) {
      const goals = [];
      if (youth.treatmentFocus.excessiveDependency) goals.push("reducing excessive dependency");
      if (youth.treatmentFocus.withdrawalIsolation) goals.push("increasing social engagement");
      if (youth.treatmentFocus.parentChildRelationship) goals.push("improving parent-child relationships");
      if (youth.treatmentFocus.peerRelationship) goals.push("developing positive peer relationships");
      if (youth.treatmentFocus.acceptanceOfAuthority) goals.push("accepting authority figures");
      if (youth.treatmentFocus.lying) goals.push("addressing dishonest behavior");
      if (youth.treatmentFocus.poorAcademicAchievement) goals.push("improving academic performance");
      if (youth.treatmentFocus.poorSelfEsteem) goals.push("building self-esteem");
      if (youth.treatmentFocus.manipulative) goals.push("addressing manipulative behaviors");
      
      if (goals.length > 0) {
        summary += `${youth.firstName}'s treatment focuses on: ${goals.join(', ')}. `;
      }
    } else {
      summary += `${youth.firstName} is engaged in an individualized treatment plan focused on behavioral modification, skill development, and emotional regulation. `;
    }

    // Therapy participation
    if (youth.currentCounseling && youth.currentCounseling.length > 0) {
      summary += `${youth.firstName} is participating in: ${youth.currentCounseling.join(', ')}. `;
      if (youth.therapistName) {
        summary += `Therapist: ${youth.therapistName}. `;
      }
    } else {
      summary += `Regular therapy participation continues as scheduled by the treatment team. `;
    }

    if (progressNotes.length > 0) {
      const treatmentFocusedNotes = collectCaseNoteHighlights(
        progressNotes.filter(note => {
          const content = extractCaseNoteContent(note).toLowerCase();
          return content.includes('therapy') ||
            content.includes('session') ||
            content.includes('coping') ||
            content.includes('intervention') ||
            content.includes('goal');
        }),
        3
      );

      if (treatmentFocusedNotes.length > 0) {
        summary += `Recent case notes emphasize: ${treatmentFocusedNotes.join(' | ')}. `;
      } else {
        summary += `During this period, ${progressNotes.length} progress notes were documented, capturing therapeutic interventions and team observations. `;
      }
    }

    if (!youth.treatmentFocus && progressNotes.length === 0 && (!youth.currentCounseling || youth.currentCounseling.length === 0)) {
      summary = `${youth.firstName} continues to participate in treatment programming with ongoing assessment and goal development.`;
    }

    return summary;
  };

  const generateSocialEmotionalSummary = (
    peerAvg: number,
    adultAvg: number,
    authorityAvg: number
  ): string => {
    let summary = "";

    // Social Progress
    const peerDesc = peerAvg >= 4 ? "excellent" : peerAvg >= 3 ? "good" : peerAvg >= 2 ? "developing" : "needs improvement";
    const adultDesc = adultAvg >= 4 ? "excellent" : adultAvg >= 3 ? "good" : adultAvg >= 2 ? "developing" : "needs improvement";
    
    summary += `${youth.firstName}'s social development shows ${peerDesc} peer interactions (avg: ${peerAvg}/5) and ${adultDesc} relationships with staff (avg: ${adultAvg}/5). `;

    // Emotional Regulation
    const emotionalLevel = authorityAvg >= 4 ? "high" : authorityAvg >= 3 ? "moderate" : "developing";
    summary += `Emotional regulation is at a ${emotionalLevel} level with an average authority/rule compliance rating of ${authorityAvg}/5. `;

    // Peer Relationships
    const relationshipDesc = peerAvg >= 4 ? "strong positive relationships" : peerAvg >= 3 ? "generally positive interactions" : "areas for development in peer relationships";
    summary += `${youth.firstName} demonstrates ${relationshipDesc}. `;

    // Overall assessment
    if (peerAvg >= 3.5 && adultAvg >= 3.5 && authorityAvg >= 3.5) {
      summary += `Overall, ${youth.firstName} is demonstrating positive social-emotional growth and healthy relationship patterns.`;
    } else if (peerAvg < 2.5 || adultAvg < 2.5 || authorityAvg < 2.5) {
      summary += `Continued focus on social-emotional skill development and relationship building is recommended.`;
    } else {
      summary += `${youth.firstName} continues to work on social-emotional skills with ongoing support from staff.`;
    }

    return summary;
  };

  // Load saved data or auto-populate on component mount
  useEffect(() => {
    const loadData = async () => {
      if (!youth?.id) return;

      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      const saved = localStorage.getItem(saveKey);

      if (saved) {
        // If we have saved data, load it and DON'T auto-populate (preserve manual edits)
        try {
          const savedData = JSON.parse(saved) as MonthlyReportData;
          setReportData(savedData);
          console.log('Loaded saved report data from localStorage');
        } catch (error) {
          console.error("Error loading saved data:", error);
          // Only auto-populate if there's an error loading saved data
          await autoPopulateForm();
        }
      } else {
        // No saved data exists, auto-populate form with youth profile data
        console.log('No saved data found, auto-populating form');
        await autoPopulateForm();
      }
    };

    loadData();
  }, [youth?.id, selectedMonth]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = () => {
      if (youth?.id) {
        const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
        localStorage.setItem(saveKey, JSON.stringify(reportData));
      }
    };

    const timeoutId = setTimeout(autoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [reportData, youth?.id, selectedMonth]);

  // Helper function to calculate length of stay from admission date
  const calculateLengthOfStayFromDate = (admissionDateStr: string): string => {
    if (!admissionDateStr) return "";
    
    const admissionDate = new Date(admissionDateStr);
    // Set to start of day for date-only comparison
    admissionDate.setHours(0, 0, 0, 0);
    
    const now = new Date();
    // Set to start of day for date-only comparison
    now.setHours(0, 0, 0, 0);
    
    // Check if admission date is in the future
    if (admissionDate > now) {
      return "Not yet admitted";
    }
    
    // Calculate years, months, and days
    let years = now.getFullYear() - admissionDate.getFullYear();
    let months = now.getMonth() - admissionDate.getMonth();
    let days = now.getDate() - admissionDate.getDate();
    
    // Adjust for negative days
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      days += prevMonth.getDate();
    }
    
    // Adjust for negative months
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    // Build the length of stay string
    const parts = [];
    if (years > 0) {
      parts.push(`${years} year${years > 1 ? 's' : ''}`);
    }
    if (months > 0) {
      parts.push(`${months} month${months > 1 ? 's' : ''}`);
    }
    if (days > 0 || parts.length === 0) {
      parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ');
  };

  const handleFieldChange = (field: keyof MonthlyReportData, value: string) => {
    setReportData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate length of stay when admission date changes
      if (field === 'dateOfAdmission') {
        updated.lengthOfStay = calculateLengthOfStayFromDate(value);
      }
      
      return updated;
    });
  };

  // AI Enhancement Function
  const enhanceTextField = async (fieldName: keyof MonthlyReportData) => {
    const currentValue = reportData[fieldName] as string;
    
    if (!currentValue || !currentValue.trim()) {
      toast({
        title: "No Content",
        description: "Please enter some text first before enhancing",
        variant: "destructive"
      });
      return;
    }

    setIsEnhancing(fieldName);

    try {
      const prompt = getEnhancementPrompt(fieldName, currentValue);
      const response = await aiService.queryData(prompt, {
        youth,
        currentText: currentValue,
        fieldType: fieldName
      });

      if (response.success && response.data?.answer) {
        const enhancedText = response.data.answer;
        handleFieldChange(fieldName, enhancedText);
        toast({
          title: "Success",
          description: "Text enhanced with AI!",
        });
      } else {
        throw new Error(response.error || 'Failed to enhance text');
      }
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance text. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(null);
    }
  };

  const getEnhancementPrompt = (fieldName: keyof MonthlyReportData, currentValue: string): string => {
    const prompts: Record<string, string> = {
      programParticipationSummary: `Take these brief notes about ${youth.firstName}'s program participation, daily points, incentives, strengths, struggles, and trends, and expand them into a comprehensive, professional summary. Include details about their engagement, behavioral patterns, and progress over time:\n\n"${currentValue}"\n\nExpand this into 3-4 well-written paragraphs with clinical language appropriate for a monthly progress report.`,
      
      academicProgressSummary: `Take these brief notes about ${youth.firstName}'s academic progress and expand them into a comprehensive summary covering their school performance, achievements, challenges, and educational goals:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with professional educational language.`,
      
      socialEmotionalSummary: `Take these brief notes about ${youth.firstName}'s social and emotional development and expand them into a comprehensive summary covering their social progress, emotional regulation, peer relationships, and interactions with adults:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with clinical language appropriate for social-emotional assessment.`,
      
      treatmentProgressSummary: `Take these brief notes about ${youth.firstName}'s treatment progress and expand them into a comprehensive summary covering their treatment goals, progress toward those goals, therapy participation, and clinical observations:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written paragraphs with clinical therapeutic language.`,
    };

    return prompts[fieldName] || `Enhance and expand the following text for ${youth.firstName}'s monthly progress report:\n\n"${currentValue}"\n\nExpand this into clear, professional paragraphs.`;
  };

  const handleSave = () => {
    try {
      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      localStorage.setItem(saveKey, JSON.stringify(reportData));
      toast({
        title: "Report Saved",
        description: "Monthly progress report has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save the report",
        variant: "destructive"
      });
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const selectedDate = new Date(selectedMonth + "-01");
      const filename = `Monthly_Progress_${youth.lastName}_${youth.firstName}_${format(selectedDate, "MMMM_yyyy")}.pdf`;
      await exportElementToPDF(printRef.current, filename);
      toast({
        title: "Success",
        description: "Monthly progress report PDF has been generated and downloaded",
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    setReportData({
      fullLegalName: "",
      preferredName: "",
      dateOfBirth: "",
      age: "",
      dateOfAdmission: "",
      lengthOfStay: "",
      currentLevel: "",
      currentPlacement: "",
      probationOfficer: "",
      guardiansInfo: "",
      schoolPlacement: "",
      currentDiagnoses: "",
      programParticipationSummary: "",
      behavioralSummary: "",
      academicProgressSummary: "",
      socialEmotionalSummary: "",
      treatmentProgressSummary: "",
      futureGoals: "",
      preparedBy: "",
      reportDate: format(new Date(), "yyyy-MM-dd"),
      month: format(new Date(), "MMMM"),
      year: format(new Date(), "yyyy")
    });
    
    // Clear saved data
    if (youth?.id) {
      const saveKey = `monthly-progress-${youth.id}-${selectedMonth}`;
      localStorage.removeItem(saveKey);
    }
    
    toast({
      title: "Form Reset",
      description: "All form data has been cleared",
    });
  };

  if (!youth) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            Please select a youth to generate a monthly progress report.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Progress Report - {youth.firstName} {youth.lastName}
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
              >
                <FileDown className="h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Form
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Settings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prepared By</Label>
              <Input
                value={reportData.preparedBy}
                onChange={(e) => handleFieldChange('preparedBy', e.target.value)}
                placeholder="Staff name"
              />
            </div>
            <div className="space-y-2">
              <Label>Report Date</Label>
              <Input
                type="date"
                value={reportData.reportDate}
                onChange={(e) => handleFieldChange('reportDate', e.target.value)}
              />
            </div>
          </div>

          {/* Youth Profile Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Youth Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Legal Name</Label>
                <Input
                  value={reportData.fullLegalName}
                  onChange={(e) => handleFieldChange('fullLegalName', e.target.value)}
                  placeholder="Full legal name"
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Name</Label>
                <Input
                  value={reportData.preferredName}
                  onChange={(e) => handleFieldChange('preferredName', e.target.value)}
                  placeholder="Preferred name"
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={reportData.dateOfBirth}
                  onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input
                  value={reportData.age}
                  onChange={(e) => handleFieldChange('age', e.target.value)}
                  placeholder="Age"
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Admission</Label>
                <Input
                  type="date"
                  value={reportData.dateOfAdmission}
                  onChange={(e) => handleFieldChange('dateOfAdmission', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Length of Stay</Label>
                <Input
                  value={reportData.lengthOfStay}
                  readOnly
                  className="bg-gray-50 cursor-not-allowed"
                  placeholder="Auto-calculated from admission date"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Level</Label>
                <Select value={reportData.currentLevel} onValueChange={(value) => handleFieldChange('currentLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Intake">Intake</SelectItem>
                    <SelectItem value="Level 1">Level 1</SelectItem>
                    <SelectItem value="Level 2">Level 2</SelectItem>
                    <SelectItem value="Level 3">Level 3</SelectItem>
                    <SelectItem value="Level 4">Level 4</SelectItem>
                    <SelectItem value="Level 5">Level 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Current Placement</Label>
                <Input
                  value={reportData.currentPlacement}
                  onChange={(e) => handleFieldChange('currentPlacement', e.target.value)}
                  placeholder="Current placement"
                />
              </div>
              <div className="space-y-2">
                <Label>Probation Officer</Label>
                <Input
                  value={reportData.probationOfficer}
                  onChange={(e) => handleFieldChange('probationOfficer', e.target.value)}
                  placeholder="Probation officer name"
                />
              </div>
              <div className="space-y-2">
                <Label>School Placement</Label>
                <Input
                  value={reportData.schoolPlacement}
                  onChange={(e) => handleFieldChange('schoolPlacement', e.target.value)}
                  placeholder="School placement"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Guardians Information</Label>
              <Textarea
                value={reportData.guardiansInfo}
                onChange={(e) => handleFieldChange('guardiansInfo', e.target.value)}
                placeholder="Guardian/parent information"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Diagnoses</Label>
              <Textarea
                value={reportData.currentDiagnoses}
                onChange={(e) => handleFieldChange('currentDiagnoses', e.target.value)}
                placeholder="Current diagnoses and treatment needs"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Program Participation & Daily Points */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Program Participation & Daily Points</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => enhanceTextField('programParticipationSummary')}
                  disabled={isEnhancing === 'programParticipationSummary'}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isEnhancing === 'programParticipationSummary' ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
              <Textarea
                value={reportData.programParticipationSummary}
                onChange={(e) => handleFieldChange('programParticipationSummary', e.target.value)}
                placeholder="Overall summary of program participation, daily points, incentives earned, strengths, struggles, and trends over time..."
                className="min-h-[150px]"
              />
            </div>
          </div>

          {/* Academic Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Academic Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => enhanceTextField('academicProgressSummary')}
                  disabled={isEnhancing === 'academicProgressSummary'}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isEnhancing === 'academicProgressSummary' ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
              <Textarea
                value={reportData.academicProgressSummary}
                onChange={(e) => handleFieldChange('academicProgressSummary', e.target.value)}
                placeholder="Overall summary of academic progress, school performance, achievements, challenges, and educational goals..."
                className="min-h-[150px]"
              />
            </div>
          </div>

          {/* Behavioral Summary */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Behavioral Summary</h3>
            <div className="space-y-2">
              <Label>Behavioral Summary</Label>
              <Textarea
                value={reportData.behavioralSummary}
                onChange={(e) => handleFieldChange('behavioralSummary', e.target.value)}
                placeholder="Summary of behavioral progress and incidents"
                className="min-h-[120px]"
              />
            </div>
          </div>

          {/* Social/Emotional Development */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Social/Emotional Development</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => enhanceTextField('socialEmotionalSummary')}
                  disabled={isEnhancing === 'socialEmotionalSummary'}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isEnhancing === 'socialEmotionalSummary' ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
              <Textarea
                value={reportData.socialEmotionalSummary}
                onChange={(e) => handleFieldChange('socialEmotionalSummary', e.target.value)}
                placeholder="Overall summary of social progress, emotional regulation, peer relationships, and interactions with adults..."
                className="min-h-[150px]"
              />
            </div>
          </div>

          {/* Treatment Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Treatment Progress</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Summary</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => enhanceTextField('treatmentProgressSummary')}
                  disabled={isEnhancing === 'treatmentProgressSummary'}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {isEnhancing === 'treatmentProgressSummary' ? 'Enhancing...' : 'Enhance with AI'}
                </Button>
              </div>
              <Textarea
                value={reportData.treatmentProgressSummary}
                onChange={(e) => handleFieldChange('treatmentProgressSummary', e.target.value)}
                placeholder="Overall summary of treatment goals, progress toward goals, therapy participation, and clinical observations..."
                className="min-h-[150px]"
              />
            </div>
          </div>

          {/* Future Goals */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Future Goals</h3>
            <div className="space-y-2">
              <Label>Future Goals</Label>
              <Textarea
                value={reportData.futureGoals}
                onChange={(e) => handleFieldChange('futureGoals', e.target.value)}
                placeholder="Future goals and objectives"
                className="min-h-[80px]"
              />
            </div>
          </div>
          
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="print-section bg-white text-black p-8 rounded-lg border">
        <ReportHeader
          subtitle="Monthly Progress Report"
          detail={format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
        />

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <strong>Report Date:</strong>{" "}
            <FormattedText text={reportData.reportDate} />
          </div>
          <div>
            <strong>Prepared By:</strong>{" "}
            <FormattedText text={reportData.preparedBy} />
          </div>
        </div>

        {/* Youth Information */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">1. Youth Profile Information</h3>
          <div className="space-y-2 ml-4">
            <div>
              <strong>Full Legal Name:</strong>{" "}
              <FormattedText text={reportData.fullLegalName || `${youth.firstName} ${youth.lastName}`} />
            </div>
            <div>
              <strong>Preferred Name:</strong>{" "}
              <FormattedText text={reportData.preferredName} />
            </div>
            <div>
              <strong>Date of Birth:</strong>{" "}
              <FormattedText text={reportData.dateOfBirth} />
            </div>
            <div>
              <strong>Age:</strong>{" "}
              <FormattedText text={reportData.age} />
            </div>
            <div>
              <strong>Date of Admission:</strong>{" "}
              <FormattedText text={reportData.dateOfAdmission} />
            </div>
            <div>
              <strong>Length of Stay:</strong>{" "}
              <FormattedText text={reportData.lengthOfStay} />
            </div>
            <div>
              <strong>Current Level:</strong>{" "}
              <FormattedText text={reportData.currentLevel} />
            </div>
            <div>
              <strong>Current Placement:</strong>{" "}
              <FormattedText text={reportData.currentPlacement} />
            </div>
            <div>
              <strong>Probation Officer:</strong>{" "}
              <FormattedText text={reportData.probationOfficer} />
            </div>
            <div>
              <strong>School Placement:</strong>{" "}
              <FormattedText text={reportData.schoolPlacement} />
            </div>
            <div>
              <strong>Guardians Information:</strong>{" "}
              <FormattedText text={reportData.guardiansInfo} />
            </div>
            <div>
              <strong>Current Diagnoses:</strong>{" "}
              <FormattedText text={reportData.currentDiagnoses} />
            </div>
          </div>
        </div>

        {/* Program Participation */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">2. Program Participation & Daily Points</h3>
          <FormattedText text={reportData.programParticipationSummary} as="div" className="ml-4" />
        </div>

        {/* Academic Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">3. Academic Progress</h3>
          <FormattedText text={reportData.academicProgressSummary} as="div" className="ml-4" />
        </div>

        {/* Behavioral Summary */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">4. Behavioral Summary</h3>
          <FormattedText text={reportData.behavioralSummary} as="div" className="ml-4" />
        </div>

        {/* Social/Emotional Development */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">5. Social/Emotional Development</h3>
          <FormattedText text={reportData.socialEmotionalSummary} as="div" className="ml-4" />
        </div>

        {/* Treatment Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">6. Treatment Progress</h3>
          <FormattedText text={reportData.treatmentProgressSummary} as="div" className="ml-4" />
        </div>

        {/* Future Goals */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">7. Future Goals</h3>
          <div className="space-y-2 ml-4">
            <div>
              <FormattedText text={reportData.futureGoals} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-8">
          <div className="text-center text-sm text-gray-600">
            <p>Report generated on {reportData.reportDate}</p>
            <p>Prepared by: {reportData.preparedBy}</p>
            <p>Heartland Boys Home - Monthly Progress Report</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            
            .print-section,
            .print-section * {
              visibility: visible;
            }
            
            .print-section {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 20pt !important;
              margin: 0 !important;
              background: white !important;
              color: black !important;
              font-size: 12pt !important;
              line-height: 1.4 !important;
              box-shadow: none !important;
              border: none !important;
            }
            
            .print-section h1 {
              font-size: 20pt !important;
              margin-bottom: 12pt !important;
              color: black !important;
            }
            
            .print-section h2 {
              font-size: 16pt !important;
              margin-bottom: 10pt !important;
              color: black !important;
            }
            
            .print-section h3 {
              font-size: 14pt !important;
              margin-bottom: 6pt !important;
              margin-top: 12pt !important;
              color: black !important;
            }
            
            .print-section p, .print-section div {
              font-size: 11pt !important;
              margin-bottom: 6pt !important;
              color: black !important;
            }
            
            .print-section .grid {
              display: block !important;
            }
            
            .print-section .grid-cols-2 > div {
              display: inline-block !important;
              width: 48% !important;
              margin-right: 4% !important;
              vertical-align: top !important;
            }
            
            .print-section .grid-cols-2 > div:nth-child(2n) {
              margin-right: 0 !important;
            }
            
            .print-section .space-y-2 > * + * {
              margin-top: 6pt !important;
            }
            
            .print-section .space-y-4 > * + * {
              margin-top: 12pt !important;
            }
            
            .print-section .space-y-6 > * + * {
              margin-top: 18pt !important;
            }
            
            .print-section .border-b {
              border-bottom: 1pt solid black !important;
              padding-bottom: 6pt !important;
              margin-bottom: 12pt !important;
            }
            
            .print-section .border-t {
              border-top: 1pt solid black !important;
              padding-top: 12pt !important;
              margin-top: 18pt !important;
            }
            
            .print-section strong {
              font-weight: bold !important;
              color: black !important;
            }
            
            .print-section .ml-4 {
              margin-left: 24pt !important;
            }
            
            @page {
              margin: 0.75in !important;
              size: letter !important;
            }
            
            .print-section > div {
              page-break-inside: avoid !important;
            }
          }
        `
      }} />
    </div>
  );
};
