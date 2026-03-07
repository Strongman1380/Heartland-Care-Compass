import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Save, RotateCcw, Download, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { format, subMonths, isValid } from "date-fns";
import { useAuth } from '@/contexts/AuthContext'
import { draftsService } from '@/integrations/firebase/draftsService'
import * as aiService from "@/services/aiService";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { fetchAllProgressNotes } from "@/utils/local-storage-utils";
import { getWeeklyEvalsForYouthInRange, getDailyShiftsForYouthInRange } from "@/utils/shiftScores";
import { logger } from '@/utils/logger';

interface HeartlandMonthlyProgressReportProps {
  youth: Youth;
}

interface MonthlyProgressData {
  // Header Information
  residentName: string;
  idNumber: string;
  monthYear: string;
  currentLevel: string;
  daysAtCurrentLevel: string;
  totalDaysInProgram: string;
  caseManager: string;
  primaryStaff: string;

  // I. BEHAVIORAL OVERVIEW
  behavioralIncidents: "None" | "Minor" | "Major" | "Critical";
  minorIncidentCount: string;
  majorIncidentCount: string;
  criticalIncidentCount: string;
  significantIncidentsDescription: string;

  // II. PERFORMANCE RATINGS
  peerInteraction: number; // 1-4
  adultInteraction: number; // 1-4
  programInvestment: number; // 1-4
  authorityResponse: number; // 1-4

  // III. TREATMENT GOAL PROGRESS
  goal1: string;
  goal1Progress: "No Progress" | "Minimal Progress" | "Moderate Progress" | "Significant Progress" | "Goal Achieved";
  goal1Notes: string;
  goal2: string;
  goal2Progress: "No Progress" | "Minimal Progress" | "Moderate Progress" | "Significant Progress" | "Goal Achieved";
  goal2Notes: string;
  goal3: string;
  goal3Progress: "No Progress" | "Minimal Progress" | "Moderate Progress" | "Significant Progress" | "Goal Achieved";
  goal3Notes: string;

  // IV. SKILLS DEVELOPMENT
  socialSkills: string;
  academicProgress: string;
  independentLivingSkills: string;
  areasOfGrowth: string;
  areasNeedingDevelopment: string;

  // V. FAMILY ENGAGEMENT
  phoneCalls: string;
  familyVisits: string;
  homePasses: string;
  qualityOfFamilyInteractions: "Poor" | "Fair" | "Good" | "Excellent" | "Not Applicable";
  familyParticipationInTreatment: "None" | "Minimal" | "Moderate" | "Active" | "Very Active";

  // V-b. FAMILY ENGAGEMENT NOTES
  familyEngagementNotes: string;

  // VI. SUMMARY & RECOMMENDATIONS
  overallProgress: "Regression" | "No Change" | "Minimal Progress" | "Moderate Progress" | "Significant Progress";
  strengthsDemonstrated: string;
  challengesConcerns: string;
  planAdjustmentsNeeded: string;
  levelSystemRecommendation: "Maintain Current Level" | "Advance to Next Level" | "Demote Level" | "On Probationary Status";
  projectedDischargeTimeline: "On Track" | "Ahead of Schedule" | "Behind Schedule" | "Needs Reassessment";
  estimatedDischargeDate: string;
}

export const HeartlandMonthlyProgressReport = ({ youth }: HeartlandMonthlyProgressReportProps) => {
  const [reportData, setReportData] = useState<MonthlyProgressData>({
    residentName: `${youth.firstName} ${youth.lastName}`,
    idNumber: youth.idNumber || youth.id,
    monthYear: format(new Date(), "MMMM yyyy"),
    currentLevel: `Level ${youth.level}`,
    daysAtCurrentLevel: "",
    totalDaysInProgram: "",
    caseManager: "",
    primaryStaff: "",

    behavioralIncidents: "None",
    minorIncidentCount: "",
    majorIncidentCount: "",
    criticalIncidentCount: "",
    significantIncidentsDescription: "",

    peerInteraction: 3,
    adultInteraction: 3,
    programInvestment: 3,
    authorityResponse: 3,

    goal1: "",
    goal1Progress: "Moderate Progress",
    goal1Notes: "",
    goal2: "",
    goal2Progress: "Moderate Progress",
    goal2Notes: "",
    goal3: "",
    goal3Progress: "Moderate Progress",
    goal3Notes: "",

    socialSkills: "",
    academicProgress: "",
    independentLivingSkills: "",
    areasOfGrowth: "",
    areasNeedingDevelopment: "",

    phoneCalls: "",
    familyVisits: "",
    homePasses: "",
    qualityOfFamilyInteractions: "Good",
    familyParticipationInTreatment: "Moderate",
    familyEngagementNotes: "",

    overallProgress: "Moderate Progress",
    strengthsDemonstrated: "",
    challengesConcerns: "",
    planAdjustmentsNeeded: "",
    levelSystemRecommendation: "Maintain Current Level",
    projectedDischargeTimeline: "On Track",
    estimatedDischargeDate: ""
  });

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Load saved report data FIRST, then auto-calculate
  useEffect(() => {
    let hasLoadedData = false;

    (async () => {
      try {
        const draft = await draftsService.get(youth.id, 'monthly_progress_heartland', user?.uid || null)
        if (draft?.data) {
          setReportData(prev => ({ ...prev, ...(draft.data as any) }));
          hasLoadedData = true;
        }
      } catch {}
      if (!hasLoadedData) {
        const savedData = localStorage.getItem(`monthlyProgressReport_${youth.id}`);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setReportData(prev => ({ ...prev, ...parsed }));
            hasLoadedData = true;
          } catch (error) {
            logger.error("Error loading saved report data:", error);
          }
        }
      }

      // Always sync live youth data (name, level, ID) so reports reflect current status
      setReportData(prev => ({
        ...prev,
        residentName: `${youth.firstName} ${youth.lastName}`,
        currentLevel: `Level ${youth.level}`,
        idNumber: youth.idNumber || youth.id,
      }));

      // Only auto-calculate if NO saved data exists
      if (!hasLoadedData && youth.admissionDate) {
        const admissionDate = new Date(youth.admissionDate);
        const now = new Date();
        const totalDays = Math.floor((now.getTime() - admissionDate.getTime()) / (1000 * 60 * 60 * 24));

        setReportData(prev => ({
          ...prev,
          totalDaysInProgram: prev.totalDaysInProgram || totalDays.toString(),
          daysAtCurrentLevel: prev.daysAtCurrentLevel || "30"
        }));
      }
    })();
  }, [youth.id, youth.firstName, youth.lastName, youth.level, youth.admissionDate, user?.uid]);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      try {
        setIsAutoSaving(true);
        await draftsService.save(youth.id, 'monthly_progress_heartland', user?.uid || null, reportData)
        localStorage.setItem(`monthlyProgressReport_${youth.id}`, JSON.stringify(reportData));
      } catch {}
      setTimeout(() => setIsAutoSaving(false), 500);
    };
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [reportData, youth.id, user?.uid]);

  const handleInputChange = (field: keyof MonthlyProgressData, value: any) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveReport = async () => {
    await draftsService.save(youth.id, 'monthly_progress_heartland', user?.uid || null, reportData)
    localStorage.setItem(`monthlyProgressReport_${youth.id}`, JSON.stringify(reportData));
    toast({
      title: "Report Saved",
      description: "Monthly Progress Report has been saved successfully."
    });
  };

  const handleResetForm = async () => {
    if (confirm("Are you sure you want to reset the form? All data will be lost.")) {
      try { await draftsService.delete(youth.id, 'monthly_progress_heartland', user?.uid || null) } catch {}
      localStorage.removeItem(`monthlyProgressReport_${youth.id}`);
      window.location.reload();
    }
  };

  const [isAIPopulating, setIsAIPopulating] = useState(false);

  /** Extract readable text from a case note object */
  const extractNoteContent = (n: any): string => {
    if (typeof n.note === "string") {
      try {
        const parsed = JSON.parse(n.note);
        if (parsed?.sections) {
          return [parsed.sections.summary, parsed.sections.strengthsChallenges, parsed.sections.interventionsResponse, parsed.sections.planNextSteps].filter(Boolean).join(" ");
        }
        if (parsed?.summary) return parsed.summary;
        if (parsed?.content) return parsed.content;
        return n.note;
      } catch { return n.note; }
    }
    if (typeof n.summary === "string" && n.summary.trim()) return n.summary;
    return "";
  };

  /** Generate local fallback content from data when AI is unavailable */
  const generateLocalFallback = (
    field: string,
    stats: { avgPoints: string; avgPeer: string; avgAdult: string; avgInvestment: string; avgAuthority: string; noteCount: number; allText: string }
  ): string => {
    const name = youth.firstName;
    const allText = stats.allText.toLowerCase();
    const hasPeerPos = /positive peer|cooperat|gets along|played game/.test(allText);
    const hasPeerNeg = /conflict|argument|fight|peer issue/.test(allText);
    const hasAdultPos = /respectful|compliant|followed|responsive/.test(allText);
    const hasAdultNeg = /defiant|refused|disrespect|non-compliant/.test(allText);
    const hasInvestPos = /engaged|participated|motivated|completed/.test(allText);
    const hasInvestNeg = /refused to participate|sleeping|disengaged/.test(allText);

    switch (field) {
      case "significantIncidentsDescription":
        return /incident|restraint|awol|fight|assault/.test(allText)
          ? `Staff documented behavioral incidents during this period. ${name} required staff intervention on occasion. The care team addressed each incident through processing and de-escalation.`
          : "No significant incidents reported during this period.";
      case "goal1Notes":
        return `${name} has been working on primary treatment goals this month. Staff documented ${stats.noteCount} case notes. Average daily points: ${stats.avgPoints}. ${hasInvestPos ? "He has shown engagement in programming." : "Continued focus on program investment is recommended."}`;
      case "goal2Notes":
        return `${name} continues to work on secondary treatment objectives. ${hasPeerPos ? "Positive peer interactions have been observed." : "Peer interaction skills remain an area of focus."} Staff continue to support his development in this area.`;
      case "goal3Notes":
        return `Progress on tertiary goals is ongoing. ${hasAdultPos ? `${name} has been responsive to staff guidance.` : `${name} is working on appropriate interactions with authority figures.`}`;
      case "socialSkills":
        return `${name}'s social skills ${hasPeerPos && !hasPeerNeg ? "have shown positive development" : "continue to develop"} this month. ${hasPeerPos ? "He demonstrates the ability to engage cooperatively with peers." : "He is working on building positive peer relationships."} Staff provide consistent coaching on social awareness.`;
      case "academicProgress":
        return `${name} ${hasInvestPos ? "has been engaged in educational programming" : "continues to participate in educational programming"} this month. ${youth.hasIEP ? "IEP goals are being addressed through specialized instruction." : "Academic progress is being monitored by education staff."} Behavioral observations in the school setting align with overall program trends.`;
      case "independentLivingSkills":
        return `${name} is developing independent living skills including daily hygiene, room maintenance, and personal organization. ${hasInvestPos ? "He has shown initiative in completing daily tasks." : "Continued support is provided to build consistency in daily routines."}`;
      case "areasOfGrowth":
        return [
          hasPeerPos ? "Positive peer relationship building" : "Developing peer interaction skills",
          hasAdultPos ? "Appropriate adult interactions and compliance" : "Growing responsiveness to staff direction",
          hasInvestPos ? "Consistent program engagement and investment" : "Increasing participation in programming",
          "Personal responsibility and daily routine adherence"
        ].join(". ") + ".";
      case "areasNeedingDevelopment":
        return [
          hasPeerNeg ? "Peer conflict resolution" : "Consistency in peer interactions across all settings",
          hasAdultNeg ? "Appropriate responses to authority and redirection" : "Accepting feedback without defensiveness",
          "Emotional regulation during stressful situations",
          "Generalizing positive behaviors across all program areas"
        ].join(". ") + ".";
      case "strengthsDemonstrated":
        return `${name}'s strengths include ${hasPeerPos ? "cooperative peer engagement" : "moments of positive social interaction"}, ${hasAdultPos ? "respectful interactions with staff" : "developing responsiveness to guidance"}, and ${hasInvestPos ? "active program participation" : "willingness to participate when motivated"}. ${youth.strengthsTalents ? `Additional strengths: ${youth.strengthsTalents}.` : ""}`;
      case "challengesConcerns":
        return `Areas of concern include ${hasPeerNeg ? "peer conflict and social boundaries" : "maintaining consistent positive peer interactions"}, ${hasAdultNeg ? "authority acceptance and compliance" : "consistency in following program expectations"}, and continued development of emotional regulation and impulse control.`;
      case "familyEngagementNotes":
        return `${name} has maintained contact with family through scheduled phone calls and visits. ${youth.legalGuardian ? `His guardian, ${youth.legalGuardian}, has been involved in communication with the care team.` : "The care team continues to facilitate family engagement."} Family participation in the treatment process is ongoing.`;
      case "planAdjustmentsNeeded":
        return `The care team recommends continued focus on ${hasPeerNeg ? "conflict resolution and peer skills training" : "social skills generalization"}. ${hasAdultNeg ? "Additional staff coaching on authority acceptance is recommended." : ""} ${parseFloat(stats.avgPoints.replace(/,/g, '')) >= 80000 ? "Current programming appears effective — maintain course." : "Consider adjusting behavioral intervention strategies to increase point achievement."} Family engagement activities should continue as scheduled.`;
      default:
        return "";
    }
  };

  const handleAIPopulate = async () => {
    const aiPopulatedFields: (keyof MonthlyProgressData)[] = [
      "significantIncidentsDescription", "goal1Notes", "goal2Notes", "goal3Notes",
      "socialSkills", "academicProgress", "independentLivingSkills",
      "areasOfGrowth", "areasNeedingDevelopment",
      "strengthsDemonstrated", "challengesConcerns", "planAdjustmentsNeeded",
    ];
    const hasData = aiPopulatedFields.some((f) => !!(reportData[f] as string));
    if (hasData && !confirm("This will overwrite text fields with generated summaries. Continue?")) return;

    setIsAIPopulating(true);
    try {
      toast({ title: "Populating Report", description: "Gathering data from the last 30 days..." });

      const thirtyDaysAgoISO = subMonths(new Date(), 1).toISOString().split("T")[0];
      const todayISO = new Date().toISOString().split("T")[0];
      const [behaviorPoints, progressNotes, dailyRatings, weeklyEvals, dailyShifts] = await Promise.all([
        getBehaviorPointsByYouth(youth.id),
        fetchAllProgressNotes(youth.id),
        getDailyRatingsByYouth(youth.id),
        getWeeklyEvalsForYouthInRange(youth.id, thirtyDaysAgoISO, todayISO).catch(() => []),
        getDailyShiftsForYouthInRange(youth.id, thirtyDaysAgoISO, todayISO).catch(() => []),
      ]);

      const thirtyDaysAgo = subMonths(new Date(), 1);
      const recentBehavior = behaviorPoints.filter((bp: any) => bp.date && new Date(bp.date) >= thirtyDaysAgo);
      const recentNotes = progressNotes.filter((n: any) => n.date && new Date(n.date) >= thirtyDaysAgo);
      const recentRatings = dailyRatings.filter((r: any) => r.date && new Date(r.date) >= thirtyDaysAgo);

      const caseNotesText = recentNotes
        .filter((n: any) => {
          const content = extractNoteContent(n);
          return content.trim().length > 0;
        })
        .map((n: any) => {
          const content = extractNoteContent(n);
          let dateStr = "No date";
          if (n.date) {
            const parsed = new Date(n.date);
            if (isValid(parsed)) dateStr = format(parsed, "MMM d, yyyy");
          }
          return `[${dateStr}] ${content}`;
        })
        .join("\n\n");

      const rc = recentRatings.length;
      const avgPeer = rc > 0 ? (recentRatings.reduce((s: number, r: any) => s + (r.peerInteraction ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgAdult = rc > 0 ? (recentRatings.reduce((s: number, r: any) => s + (r.adultInteraction ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgInvestment = rc > 0 ? (recentRatings.reduce((s: number, r: any) => s + (r.investmentLevel ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgAuthority = rc > 0 ? (recentRatings.reduce((s: number, r: any) => s + (r.dealAuthority ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgPointsRaw = recentBehavior.length > 0 ? Math.round(recentBehavior.reduce((s: number, bp: any) => s + (bp.totalPoints ?? 0), 0) / recentBehavior.length) : 0;
      const avgPoints = avgPointsRaw > 0 ? avgPointsRaw.toLocaleString() : "N/A";

      const allEvals = [...weeklyEvals, ...dailyShifts];
      const ec = allEvals.length;
      const evalAvgPeer = ec > 0 ? (allEvals.reduce((s, e) => s + (e.peer ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgAdult = ec > 0 ? (allEvals.reduce((s, e) => s + (e.adult ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgInvestment = ec > 0 ? (allEvals.reduce((s, e) => s + (e.investment ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgAuthority = ec > 0 ? (allEvals.reduce((s, e) => s + (e.authority ?? 0), 0) / ec).toFixed(1) : "N/A";

      // Build a shared data context block for all AI prompts
      const dataContext = `You are a clinical staff member at Heartland Boys Home writing a Monthly Progress Report for ${youth.firstName} ${youth.lastName}.
Current Level: ${youth.level || "Not specified"}
Reporting Period: Last 30 days

POINT SYSTEM: Heartland uses a behavioral point system where daily totals are measured in thousands. A typical daily total ranges from 8,000 to 15,000. Above 12,000 is excellent; 10,000–12,000 is good; 8,000–10,000 is satisfactory.
Average Daily Behavior Points this period: ${avgPoints} (over ${recentBehavior.length} days)

Daily Performance Ratings (0-5 scale, ${rc} entries):
- Peer Interaction: ${avgPeer}/5
- Adult Interaction: ${avgAdult}/5
- Program Investment: ${avgInvestment}/5
- Dealing with Authority: ${avgAuthority}/5
Weekly Eval / Shift Scores (0-4 scale, ${ec} entries):
- Peer: ${evalAvgPeer}/4, Adult: ${evalAvgAdult}/4, Investment: ${evalAvgInvestment}/4, Authority: ${evalAvgAuthority}/4
${youth.currentDiagnoses || youth.diagnoses ? `Diagnoses: ${youth.currentDiagnoses || youth.diagnoses}` : ""}
${youth.strengthsTalents ? `Known Strengths: ${youth.strengthsTalents}` : ""}
${youth.legalGuardian ? `Guardian: ${youth.legalGuardian}` : ""}

Staff Case Notes (last 30 days):
${caseNotesText || "No case notes documented for this period."}

CRITICAL OUTPUT RULES:
1. Output ONLY plain text. No headings, no titles, no labels, no "Summary:", no "Recommendations:", no markdown, no bullet points with dashes.
2. Do NOT start your response with the field name or a heading. Just write the content directly.
3. Write in professional clinical language.
4. Do not include raw dates or staff names.
5. Do not fabricate incidents or data not documented in case notes.
6. When referencing points, use the thousands format (e.g., "averaging 95,000 daily points").`;

      const fields = [
        { key: "significantIncidentsDescription", prompt: `${dataContext}\n\nThis text goes into the "Brief Description of Significant Incidents" textarea on the form. Write 2-4 sentences describing any significant behavioral incidents this month (restraints, AWOL, fights, property damage). If no incidents are documented in the case notes, simply write "No significant behavioral incidents were reported during this reporting period." Do not invent incidents.` },
        { key: "goal1Notes", prompt: `${dataContext}\n\nThis text goes into the "Goal #1 Notes" textarea on the form. Write 2-3 sentences describing progress on Goal 1 (typically behavioral regulation, compliance, or emotional management). Reference the youth's average daily points and relevant behavioral observations from case notes.` },
        { key: "goal2Notes", prompt: `${dataContext}\n\nThis text goes into the "Goal #2 Notes" textarea on the form. Write 2-3 sentences describing progress on Goal 2 (typically peer/social skills). Reference peer interaction ratings and case note observations about peer relationships.` },
        { key: "goal3Notes", prompt: `${dataContext}\n\nThis text goes into the "Goal #3 Notes" textarea on the form. Write 2-3 sentences describing progress on Goal 3 (typically adult interaction, authority acceptance, or program investment). Reference relevant rating data and case note observations.` },
        { key: "socialSkills", prompt: `${dataContext}\n\nThis text goes into the "Social Skills" textarea. Write 2-3 sentences about social skills development: peer communication, conflict resolution, empathy, group participation. Reference peer interaction scores.` },
        { key: "academicProgress", prompt: `${dataContext}\n\n${youth.firstName} attends the Heartland Boys Home Independent School managed by Berniklau Education Solutions.${youth.currentGrade ? ` Grade: ${youth.currentGrade}.` : ""}${youth.hasIEP ? " Has an active IEP." : ""}\nThis text goes into the "Academic Progress" textarea. Write 2-3 sentences about academic engagement based on behavioral observations in school. Do NOT fabricate grades or test scores.` },
        { key: "independentLivingSkills", prompt: `${dataContext}\n\nThis text goes into the "Independent Living Skills" textarea. Write 2-3 sentences about daily living skills: hygiene, room maintenance, laundry, personal organization, time management.` },
        { key: "areasOfGrowth", prompt: `${dataContext}\n\nThis text goes into the "Areas of Growth" textarea. Write 3-4 short statements about areas of growth this month, separated by periods. Example: "Improved peer interactions. Higher daily point averages. Better compliance with schedule. More engaged in group activities."` },
        { key: "areasNeedingDevelopment", prompt: `${dataContext}\n\nThis text goes into the "Areas Needing Development" textarea. Write 3-4 short statements about areas needing improvement, separated by periods.` },
        { key: "familyEngagementNotes", prompt: `${dataContext}\n\nThis text goes into the "Family Engagement Notes" textarea. Write 2-4 sentences giving a brief synopsis of the youth's family contact this month: visits with parents/guardians, phone calls, home passes, and general quality of family engagement. Keep it factual and based on case notes.` },
        { key: "strengthsDemonstrated", prompt: `${dataContext}\n\nThis text goes into the "Strengths Demonstrated" textarea. Write 2-3 sentences about the youth's key strengths this month: positive behaviors, skills, attitude, interests, talents.` },
        { key: "challengesConcerns", prompt: `${dataContext}\n\nThis text goes into the "Challenges/Concerns" textarea. Write 2-3 sentences about ongoing challenges and concerns: behavioral patterns, areas of regression, treatment barriers. Be honest but constructive.` },
        { key: "planAdjustmentsNeeded", prompt: `${dataContext}\n\nThis text goes into the "Plan Adjustments Needed" textarea. Write 2-3 sentences about any adjustments to the treatment plan for next month: intervention changes, goal modifications, level recommendations.` },
      ];

      const allText = caseNotesText;
      const localStats = { avgPoints, avgPeer, avgAdult, avgInvestment, avgAuthority, noteCount: recentNotes.length, allText };

      // Run all AI calls in PARALLEL with a 45-second global timeout
      const aiTimeout = 45000;
      const aiPromises = fields.map(async ({ key, prompt }) => {
        try {
          const response = await aiService.queryData(prompt, { youth, period: "Last 30 days", caseNotes: caseNotesText });
          if (response.success && response.data?.answer) {
            return { key, value: response.data.answer };
          }
          return { key, value: null };
        } catch {
          return { key, value: null };
        }
      });

      const results = await Promise.race([
        Promise.allSettled(aiPromises),
        new Promise<PromiseSettledResult<{ key: string; value: string | null }>[]>((resolve) =>
          setTimeout(() => resolve(fields.map(f => ({ status: "rejected" as const, reason: "timeout" }))), aiTimeout)
        ),
      ]);

      const updates: Partial<MonthlyProgressData> = {};
      let aiSuccessCount = 0;

      results.forEach((result, idx) => {
        const fieldKey = fields[idx].key;
        if (result.status === "fulfilled" && result.value?.value) {
          updates[fieldKey as keyof MonthlyProgressData] = result.value.value as any;
          aiSuccessCount++;
        } else {
          // Use local fallback for this field
          const fallback = generateLocalFallback(fieldKey, localStats);
          if (fallback) {
            updates[fieldKey as keyof MonthlyProgressData] = fallback as any;
          }
        }
      });

      setReportData((prev) => ({ ...prev, ...updates }));

      if (aiSuccessCount > 0) {
        toast({ title: "Report Populated", description: `${aiSuccessCount} sections generated from AI, ${fields.length - aiSuccessCount} from local data. Review and edit.` });
      } else {
        toast({ title: "Report Populated", description: "Sections filled from local case notes and behavioral data. AI was unavailable — review and edit as needed." });
      }
    } catch (error) {
      logger.error("Populate error:", error);
      toast({ title: "Error", description: "Failed to populate report. Please try again.", variant: "destructive" });
    } finally {
      setIsAIPopulating(false);
    }
  };

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        const filename = `${buildReportFilename(youth, "Monthly Progress Report")}.pdf`;
        await exportElementToPDF(printRef.current, filename);
        toast({
          title: "PDF Exported",
          description: "Monthly Progress Report has been exported as PDF."
        });
      } catch (error) {
        logger.error("Error exporting PDF:", error);
        toast({
          title: "Export Error",
          description: "Failed to export PDF. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="heartland-monthly-print-hide">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Progress Report
            {isAutoSaving && <span className="text-sm text-green-600">(Auto-saving...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Button onClick={handleAIPopulate} disabled={isAIPopulating} className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
            {isAIPopulating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {isAIPopulating ? "Populating..." : "Populate Report"}
          </Button>
          <Button onClick={handleSaveReport} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
          <Button onClick={handleExportPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleResetForm} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Form
          </Button>
        </CardContent>
      </Card>

      {/* Report Form */}
      <div ref={printRef} className="bg-white p-8 rounded-lg border print-section">
        {/* Header */}
        <ReportHeader
          subtitle="Monthly Progress Report"
          detail={reportData.monthYear || undefined}
          className="mb-8"
        />

        {/* Basic Information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Resident:</Label>
            <Input
              value={reportData.residentName}
              onChange={(e) => handleInputChange('residentName', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>ID #:</Label>
            <Input
              value={reportData.idNumber}
              onChange={(e) => handleInputChange('idNumber', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Month/Year:</Label>
            <Input
              value={reportData.monthYear}
              onChange={(e) => handleInputChange('monthYear', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Current Level:</Label>
            <Input
              value={reportData.currentLevel}
              onChange={(e) => handleInputChange('currentLevel', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Days at Current Level:</Label>
            <Input
              value={reportData.daysAtCurrentLevel}
              onChange={(e) => handleInputChange('daysAtCurrentLevel', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Total Days in Program:</Label>
            <Input
              value={reportData.totalDaysInProgram}
              onChange={(e) => handleInputChange('totalDaysInProgram', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Case Manager:</Label>
            <Input
              value={reportData.caseManager}
              onChange={(e) => handleInputChange('caseManager', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Primary Staff:</Label>
            <Input
              value={reportData.primaryStaff}
              onChange={(e) => handleInputChange('primaryStaff', e.target.value)}
              className="border-b border-gray-300 rounded-none"
            />
          </div>
        </div>

        {/* I. BEHAVIORAL OVERVIEW */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">I. BEHAVIORAL OVERVIEW</h3>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Behavioral Incidents:</Label>
              <div className="flex gap-4 mt-2">
                {["None", "Minor", "Major", "Critical"].map((incident) => (
                  <label key={incident} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportData.behavioralIncidents === incident}
                      onCheckedChange={() => handleInputChange('behavioralIncidents', incident)}
                    />
                    {incident}
                    {incident === "Minor" && reportData.behavioralIncidents === "Minor" && (
                      <Input
                        value={reportData.minorIncidentCount}
                        onChange={(e) => handleInputChange('minorIncidentCount', e.target.value)}
                        className="w-16 h-6"
                        placeholder="(#)"
                      />
                    )}
                    {incident === "Major" && reportData.behavioralIncidents === "Major" && (
                      <Input
                        value={reportData.majorIncidentCount}
                        onChange={(e) => handleInputChange('majorIncidentCount', e.target.value)}
                        className="w-16 h-6"
                        placeholder="(#)"
                      />
                    )}
                    {incident === "Critical" && reportData.behavioralIncidents === "Critical" && (
                      <Input
                        value={reportData.criticalIncidentCount}
                        onChange={(e) => handleInputChange('criticalIncidentCount', e.target.value)}
                        className="w-16 h-6"
                        placeholder="(#)"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label className="font-semibold">Brief Description of Significant Incidents:</Label>
              <Textarea
                value={reportData.significantIncidentsDescription}
                onChange={(e) => handleInputChange('significantIncidentsDescription', e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* II. PERFORMANCE RATINGS */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">II. PERFORMANCE RATINGS</h3>
          <p className="text-sm mb-4">Rate 1-4 (1=Poor, 2=Below Average, 3=Average, 4=Above Average)</p>
          <div className="space-y-4">
            <h4 className="font-semibold">CORE DOMAINS</h4>
            {[
              { key: 'peerInteraction', label: 'Peer Interaction' },
              { key: 'adultInteraction', label: 'Adult Interaction' },
              { key: 'programInvestment', label: 'Program Investment' },
              { key: 'authorityResponse', label: 'Authority Response' }
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center gap-4">
                <Label className="w-48">{label}:</Label>
                <Select
                  value={reportData[key as keyof MonthlyProgressData]?.toString()}
                  onValueChange={(value) => handleInputChange(key as keyof MonthlyProgressData, parseInt(value))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                  </SelectContent>
                </Select>
                <span>/4</span>
              </div>
            ))}
          </div>
        </div>

        {/* III. TREATMENT GOAL PROGRESS */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">III. TREATMENT GOAL PROGRESS</h3>
          {[1, 2, 3].map((goalNum) => (
            <div key={goalNum} className="mb-4 space-y-2">
              <div>
                <Label className="font-semibold">Goal #{goalNum}:</Label>
                <Input
                  value={reportData[`goal${goalNum}` as keyof MonthlyProgressData] as string}
                  onChange={(e) => handleInputChange(`goal${goalNum}` as keyof MonthlyProgressData, e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="font-semibold">Progress:</Label>
                <div className="flex gap-4 mt-2">
                  {["No Progress", "Minimal Progress", "Moderate Progress", "Significant Progress", "Goal Achieved"].map((progress) => (
                    <label key={progress} className="flex items-center gap-2">
                      <Checkbox
                        checked={reportData[`goal${goalNum}Progress` as keyof MonthlyProgressData] === progress}
                        onCheckedChange={() => handleInputChange(`goal${goalNum}Progress` as keyof MonthlyProgressData, progress)}
                      />
                      {progress}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label className="font-semibold">Notes:</Label>
                <Textarea
                  value={reportData[`goal${goalNum}Notes` as keyof MonthlyProgressData] as string}
                  onChange={(e) => handleInputChange(`goal${goalNum}Notes` as keyof MonthlyProgressData, e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            </div>
          ))}
        </div>

        {/* IV. SKILLS DEVELOPMENT */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">IV. SKILLS DEVELOPMENT</h3>
          <div className="space-y-4">
            {[
              { key: 'socialSkills', label: 'Social Skills:' },
              { key: 'academicProgress', label: 'Academic Progress:' },
              { key: 'independentLivingSkills', label: 'Independent Living Skills:' },
              { key: 'areasOfGrowth', label: 'Areas of Growth:' },
              { key: 'areasNeedingDevelopment', label: 'Areas Needing Development:' }
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="font-semibold">{label}</Label>
                <Textarea
                  value={reportData[key as keyof MonthlyProgressData] as string}
                  onChange={(e) => handleInputChange(key as keyof MonthlyProgressData, e.target.value)}
                  rows={2}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </div>

        {/* V. FAMILY ENGAGEMENT */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">V. FAMILY ENGAGEMENT</h3>
          <div className="space-y-4">
            <p className="font-semibold">Contact Maintained:</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Phone Calls: _____ (number completed)</Label>
                <Input
                  value={reportData.phoneCalls}
                  onChange={(e) => handleInputChange('phoneCalls', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Family Visits: _____ (number completed)</Label>
                <Input
                  value={reportData.familyVisits}
                  onChange={(e) => handleInputChange('familyVisits', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Home Passes: _____ (number completed)</Label>
                <Input
                  value={reportData.homePasses}
                  onChange={(e) => handleInputChange('homePasses', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="font-semibold">Quality of Family Interactions:</Label>
              <div className="flex gap-4 mt-2">
                {["Poor", "Fair", "Good", "Excellent", "Not Applicable"].map((quality) => (
                  <label key={quality} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportData.qualityOfFamilyInteractions === quality}
                      onCheckedChange={() => handleInputChange('qualityOfFamilyInteractions', quality)}
                    />
                    {quality}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold">Family Participation in Treatment:</Label>
              <div className="flex gap-4 mt-2">
                {["None", "Minimal", "Moderate", "Active", "Very Active"].map((participation) => (
                  <label key={participation} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportData.familyParticipationInTreatment === participation}
                      onCheckedChange={() => handleInputChange('familyParticipationInTreatment', participation)}
                    />
                    {participation}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold">Family Engagement Notes:</Label>
              <Textarea
                value={reportData.familyEngagementNotes}
                onChange={(e) => handleInputChange('familyEngagementNotes', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Brief synopsis of family contact, visits, home passes, and family engagement during this period..."
              />
            </div>
          </div>
        </div>

        {/* VI. SUMMARY & RECOMMENDATIONS */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VI. SUMMARY & RECOMMENDATIONS</h3>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold">Overall Progress This Month:</Label>
              <div className="flex gap-4 mt-2">
                {["Regression", "No Change", "Minimal Progress", "Moderate Progress", "Significant Progress"].map((progress) => (
                  <label key={progress} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportData.overallProgress === progress}
                      onCheckedChange={() => handleInputChange('overallProgress', progress)}
                    />
                    {progress}
                  </label>
                ))}
              </div>
            </div>

            {[
              { key: 'strengthsDemonstrated', label: 'Strengths Demonstrated:' },
              { key: 'challengesConcerns', label: 'Challenges/Concerns:' },
              { key: 'planAdjustmentsNeeded', label: 'Plan Adjustments Needed:' }
            ].map(({ key, label }) => (
              <div key={key}>
                <Label className="font-semibold">{label}</Label>
                <Textarea
                  value={reportData[key as keyof MonthlyProgressData] as string}
                  onChange={(e) => handleInputChange(key as keyof MonthlyProgressData, e.target.value)}
                  rows={3}
                  className="mt-1"
                />
              </div>
            ))}

            <div>
              <Label className="font-semibold">Level System Recommendation:</Label>
              <div className="flex gap-4 mt-2">
                {["Maintain Current Level", "Advance to Next Level", "Demote Level", "On Probationary Status"].map((recommendation) => (
                  <label key={recommendation} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportData.levelSystemRecommendation === recommendation}
                      onCheckedChange={() => handleInputChange('levelSystemRecommendation', recommendation)}
                    />
                    {recommendation}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold">Projected Discharge Timeline:</Label>
              <div className="flex gap-4 mt-2">
                {["On Track", "Ahead of Schedule", "Behind Schedule", "Needs Reassessment"].map((timeline) => (
                  <label key={timeline} className="flex items-center gap-2">
                    <Checkbox
                      checked={reportData.projectedDischargeTimeline === timeline}
                      onCheckedChange={() => handleInputChange('projectedDischargeTimeline', timeline)}
                    />
                    {timeline}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="font-semibold">Estimated Discharge Date:</Label>
              <Input
                type="date"
                value={reportData.estimatedDischargeDate}
                onChange={(e) => handleInputChange('estimatedDischargeDate', e.target.value)}
                className="mt-1 w-48"
              />
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .heartland-monthly-print-hide { display: none !important; }
            .print-section {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              padding: 20px !important;
              background: white !important;
              color: black !important;
              font-size: 12pt !important;
              line-height: 1.4 !important;
            }
            .print-section h1 {
              font-size: 16pt !important;
              margin-bottom: 8pt !important;
            }
            .print-section h2 {
              font-size: 14pt !important;
              margin-bottom: 12pt !important;
            }
            .print-section h3 {
              font-size: 12pt !important;
              margin-bottom: 8pt !important;
              margin-top: 16pt !important;
            }
            @page {
              margin: 0.75in !important;
              size: letter !important;
            }
          }
        `
      }} />
    </div>
  );
};
