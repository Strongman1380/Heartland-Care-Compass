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
import { format, differenceInDays, subMonths, isValid } from "date-fns";
import * as aiService from "@/services/aiService";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { fetchAllProgressNotes } from "@/utils/local-storage-utils";
import { getWeeklyEvalsForYouthInRange, getDailyShiftsForYouthInRange } from "@/utils/shiftScores";
import { useAuth } from "@/contexts/AuthContext";
import { draftsService } from "@/integrations/firebase/draftsService";

interface DischargeReportProps {
  youth: Youth;
}

interface DischargeData {
  residentName: string;
  idNumber: string;
  dateOfBirth: string;
  dateOfAdmission: string;
  dateOfDischarge: string;
  lengthOfStay: string;
  currentLevel: string;
  dischargeLevel: string;
  caseManager: string;
  primaryStaff: string;
  probationOfficer: string;

  reasonForDischarge: "Successful Completion" | "Court Order" | "Family Request" | "Transfer" | "AWOL" | "Administrative" | "Other";
  reasonDetail: string;

  treatmentGoalsSummary: string;
  goal1: string;
  goal1Status: "Achieved" | "Partially Achieved" | "Not Achieved" | "Ongoing";
  goal2: string;
  goal2Status: "Achieved" | "Partially Achieved" | "Not Achieved" | "Ongoing";
  goal3: string;
  goal3Status: "Achieved" | "Partially Achieved" | "Not Achieved" | "Ongoing";

  behavioralProgress: string;
  peerInteractionSummary: string;
  adultInteractionSummary: string;
  programInvestmentSummary: string;
  authoritySummary: string;

  academicSummary: string;
  independentLivingSkills: string;

  familyEngagementSummary: string;
  aftercarePlan: string;
  communityResources: string;
  followUpAppointments: string;

  strengthsAtDischarge: string;
  ongoingConcerns: string;
  recommendations: string;

  dischargeDisposition: "Home" | "Foster Care" | "Another Facility" | "Independent Living" | "Detention" | "Other";
  dispositionDetail: string;
  receivingAgency: string;
  transportationPlan: string;

  medicationAtDischarge: string;
  propertyReturned: boolean;
  documentsProvided: string;
}

export const DischargeReport = ({ youth }: DischargeReportProps) => {
  const admissionDate = youth.admissionDate ? new Date(youth.admissionDate) : null;
  const today = new Date();

  const [reportData, setReportData] = useState<DischargeData>({
    residentName: `${youth.firstName} ${youth.lastName}`,
    idNumber: youth.idNumber || youth.id,
    dateOfBirth: youth.dateOfBirth || "",
    dateOfAdmission: youth.admissionDate || "",
    dateOfDischarge: format(today, "yyyy-MM-dd"),
    lengthOfStay: admissionDate ? `${differenceInDays(today, admissionDate)} days` : "",
    currentLevel: `Level ${youth.level}`,
    dischargeLevel: `Level ${youth.level}`,
    caseManager: "",
    primaryStaff: "",
    probationOfficer: "",

    reasonForDischarge: "Successful Completion",
    reasonDetail: "",

    treatmentGoalsSummary: "",
    goal1: "",
    goal1Status: "Partially Achieved",
    goal2: "",
    goal2Status: "Partially Achieved",
    goal3: "",
    goal3Status: "Partially Achieved",

    behavioralProgress: "",
    peerInteractionSummary: "",
    adultInteractionSummary: "",
    programInvestmentSummary: "",
    authoritySummary: "",

    academicSummary: "",
    independentLivingSkills: "",

    familyEngagementSummary: "",
    aftercarePlan: "",
    communityResources: "",
    followUpAppointments: "",

    strengthsAtDischarge: "",
    ongoingConcerns: "",
    recommendations: "",

    dischargeDisposition: "Home",
    dispositionDetail: "",
    receivingAgency: "",
    transportationPlan: "",

    medicationAtDischarge: "",
    propertyReturned: false,
    documentsProvided: "",
  });

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const draft = await draftsService.get(youth.id, "discharge_report", user?.uid || null);
        if (draft?.data) {
          setReportData((prev) => ({ ...prev, ...(draft.data as any) }));
          return;
        }
      } catch {}
      setReportData((prev) => ({
        ...prev,
        residentName: `${youth.firstName} ${youth.lastName}`,
        currentLevel: `Level ${youth.level}`,
        idNumber: youth.idNumber || youth.id,
      }));
    })();
  }, [youth.id, youth.firstName, youth.lastName, youth.level, user?.uid]);

  useEffect(() => {
    const autoSave = async () => {
      try {
        setIsAutoSaving(true);
        await draftsService.save(youth.id, "discharge_report", user?.uid || null, reportData);
      } catch {}
      setTimeout(() => setIsAutoSaving(false), 500);
    };
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [reportData, youth.id, user?.uid]);

  const handleChange = (field: keyof DischargeData, value: any) => {
    setReportData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await draftsService.save(youth.id, "discharge_report", user?.uid || null, reportData);
    toast({ title: "Report Saved", description: "Discharge Report has been saved." });
  };

  const [isAIPopulating, setIsAIPopulating] = useState(false);

  /** Extract readable text from a case note object */
  const extractNoteContent = (n: any): string => {
    if (typeof n.note === "string") {
      try {
        const parsed = JSON.parse(n.note);
        if (parsed?.sections) return [parsed.sections.summary, parsed.sections.strengthsChallenges, parsed.sections.interventionsResponse, parsed.sections.planNextSteps].filter(Boolean).join(" ");
        if (parsed?.summary) return parsed.summary;
        if (parsed?.content) return parsed.content;
        return n.note;
      } catch { return n.note; }
    }
    if (typeof n.summary === "string" && n.summary.trim()) return n.summary;
    return "";
  };

  const handleAIPopulate = async () => {
    const aiFields: (keyof DischargeData)[] = [
      "treatmentGoalsSummary", "behavioralProgress", "peerInteractionSummary",
      "adultInteractionSummary", "programInvestmentSummary", "authoritySummary",
      "academicSummary", "independentLivingSkills", "familyEngagementSummary",
      "aftercarePlan", "strengthsAtDischarge", "ongoingConcerns", "recommendations",
    ];
    const hasData = aiFields.some((f) => !!(reportData[f] as string));
    if (hasData && !confirm("This will overwrite text fields with generated content. Continue?")) return;

    setIsAIPopulating(true);
    try {
      toast({ title: "Populating Report", description: "Gathering full-stay data..." });

      const admDate = youth.admissionDate ? new Date(youth.admissionDate).toISOString().split("T")[0] : subMonths(new Date(), 6).toISOString().split("T")[0];
      const todayISO = new Date().toISOString().split("T")[0];
      const [behaviorPoints, progressNotes, dailyRatings, weeklyEvals, dailyShifts] = await Promise.all([
        getBehaviorPointsByYouth(youth.id),
        fetchAllProgressNotes(youth.id),
        getDailyRatingsByYouth(youth.id),
        getWeeklyEvalsForYouthInRange(youth.id, admDate, todayISO).catch(() => []),
        getDailyShiftsForYouthInRange(youth.id, admDate, todayISO).catch(() => []),
      ]);

      const caseNotesText = progressNotes
        .slice(0, 50)
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

      const rc = dailyRatings.length;
      const avgPeer = rc > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.peerInteraction ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgAdult = rc > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.adultInteraction ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgInvestment = rc > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.investmentLevel ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgAuthority = rc > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.dealAuthority ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgPointsRaw = behaviorPoints.length > 0 ? Math.round(behaviorPoints.reduce((s: number, bp: any) => s + (bp.totalPoints ?? 0), 0) / behaviorPoints.length) : 0;
      const avgPoints = avgPointsRaw > 0 ? avgPointsRaw.toLocaleString() : "N/A";

      const allEvals = [...weeklyEvals, ...dailyShifts];
      const ec = allEvals.length;
      const evalAvgPeer = ec > 0 ? (allEvals.reduce((s, e) => s + (e.peer ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgAdult = ec > 0 ? (allEvals.reduce((s, e) => s + (e.adult ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgInvestment = ec > 0 ? (allEvals.reduce((s, e) => s + (e.investment ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgAuthority = ec > 0 ? (allEvals.reduce((s, e) => s + (e.authority ?? 0), 0) / ec).toFixed(1) : "N/A";

      const los = reportData.lengthOfStay || "Unknown";
      const dataContext = `You are a clinical staff member at Heartland Boys Home writing a Discharge Report for ${youth.firstName} ${youth.lastName}.
Current Level: ${youth.level || "Not specified"}
Length of Stay: ${los}

POINT SYSTEM: Heartland uses a behavioral point system where daily totals are measured in thousands. A typical daily total ranges from 8,000 to 15,000. Above 12,000 is excellent; 10,000–12,000 is good; 8,000–10,000 is satisfactory.
Average Daily Behavior Points (full stay): ${avgPoints} (over ${behaviorPoints.length} days)

Daily Performance Ratings (0-5 scale, ${rc} entries):
- Peer Interaction: ${avgPeer}/5
- Adult Interaction: ${avgAdult}/5
- Program Investment: ${avgInvestment}/5
- Dealing with Authority: ${avgAuthority}/5
Weekly Eval / Shift Scores (0-4 scale, ${ec} entries):
- Peer: ${evalAvgPeer}/4, Adult: ${evalAvgAdult}/4, Investment: ${evalAvgInvestment}/4, Authority: ${evalAvgAuthority}/4
${youth.currentDiagnoses || youth.diagnoses ? `Diagnoses: ${youth.currentDiagnoses || youth.diagnoses}` : ""}
${youth.legalGuardian ? `Guardian: ${youth.legalGuardian}` : ""}

Staff Case Notes (most recent 50):
${caseNotesText || "No case notes available."}

CRITICAL OUTPUT RULES:
1. Output ONLY plain text. No headings, no titles, no labels, no "Summary:", no markdown, no bullet points with dashes.
2. Do NOT start your response with the field name or a heading. Just write the content directly.
3. Write in professional clinical language.
4. Do not include raw dates or staff names.
5. Do not fabricate incidents or data not in case notes.
6. When referencing points, use comma formatting (e.g., "averaging 12,500 daily points").`;

      const fields = [
        { key: "treatmentGoalsSummary", prompt: `${dataContext}\n\nThis text goes into the "Treatment Goals Summary" textarea. Write 2-3 paragraphs summarizing treatment progress over the entire stay. Cover primary treatment goals, therapeutic participation, and clinical milestones achieved.` },
        { key: "behavioralProgress", prompt: `${dataContext}\n\nThis text goes into the "Behavioral Progress" textarea. Write 2-3 paragraphs about overall behavioral progress during the stay: point trends, compliance patterns, response to redirection, and behavioral growth from admission to discharge.` },
        { key: "peerInteractionSummary", prompt: `${dataContext}\n\nThis text goes into the "Peer Interaction Summary" textarea. Write 2-3 sentences about how the youth's peer interactions developed over the stay. Reference peer interaction ratings.` },
        { key: "adultInteractionSummary", prompt: `${dataContext}\n\nThis text goes into the "Adult Interaction Summary" textarea. Write 2-3 sentences about how the youth's interactions with adults/staff developed. Reference adult interaction ratings.` },
        { key: "programInvestmentSummary", prompt: `${dataContext}\n\nThis text goes into the "Program Investment Summary" textarea. Write 2-3 sentences about the youth's overall investment and engagement in programming. Reference investment ratings.` },
        { key: "authoritySummary", prompt: `${dataContext}\n\nThis text goes into the "Authority Summary" textarea. Write 2-3 sentences about how the youth dealt with authority, rules, and structure. Reference authority ratings.` },
        { key: "academicSummary", prompt: `${dataContext}\n\n${youth.firstName} attended the Heartland Boys Home Independent School managed by Berniklau Education Solutions.${youth.hasIEP ? " Had an active IEP." : ""}\nThis text goes into the "Academic Summary" textarea. Write 2-3 sentences about academic engagement. Focus on behavioral observations in school — do not fabricate grades.` },
        { key: "independentLivingSkills", prompt: `${dataContext}\n\nThis text goes into the "Independent Living Skills" textarea. Write 2-3 sentences about independent living skills the youth developed: hygiene, room maintenance, cooking, personal organization.` },
        { key: "familyEngagementSummary", prompt: `${dataContext}\n\nThis text goes into the "Family Engagement Summary" textarea. Write 2-3 sentences about family engagement during the stay: visits, phone calls, home passes, family participation in treatment.` },
        { key: "aftercarePlan", prompt: `${dataContext}\n\nThis text goes into the "Aftercare Plan" textarea. Write 2-3 sentences about recommended aftercare: continued therapy, community resources, school transition, family support services.` },
        { key: "strengthsAtDischarge", prompt: `${dataContext}\n\nThis text goes into the "Strengths at Discharge" textarea. Write 2-3 sentences listing the youth's key strengths at discharge: behavioral skills, social abilities, coping strategies, personal growth.` },
        { key: "ongoingConcerns", prompt: `${dataContext}\n\nThis text goes into the "Ongoing Concerns" textarea. Write 2-3 sentences about any remaining concerns: behavioral patterns that need continued monitoring, risk factors, areas still needing support.` },
        { key: "recommendations", prompt: `${dataContext}\n\nThis text goes into the "Recommendations" textarea. Write 2-3 sentences of clinical recommendations for post-discharge: continued treatment needs, community supports, follow-up care.` },
      ];

      // Run all AI calls in PARALLEL with a 45-second global timeout
      const aiTimeout = 45000;
      const aiPromises = fields.map(async ({ key, prompt }) => {
        try {
          const response = await aiService.queryData(prompt, { youth, period: "Full stay", caseNotes: caseNotesText });
          if (response.success && response.data?.answer) return { key, value: response.data.answer };
          return { key, value: null };
        } catch { return { key, value: null }; }
      });

      const results = await Promise.race([
        Promise.allSettled(aiPromises),
        new Promise<PromiseSettledResult<{ key: string; value: string | null }>[]>((resolve) =>
          setTimeout(() => resolve(fields.map(() => ({ status: "rejected" as const, reason: "timeout" }))), aiTimeout)
        ),
      ]);

      // Local fallback content generator
      const name = youth.firstName;
      const allText = caseNotesText.toLowerCase();
      const hasPeerPos = /positive peer|cooperat|gets along/.test(allText);
      const hasAdultPos = /respectful|compliant|followed|responsive/.test(allText);
      const hasInvestPos = /engaged|participated|motivated/.test(allText);
      const localFallback: Record<string, string> = {
        treatmentGoalsSummary: `${name} participated in the Heartland Boys Home residential treatment program for ${los}. Over the course of placement, ${name} worked on treatment goals related to behavioral regulation, social skills development, and program investment. The care team provided consistent interventions and therapeutic support throughout the stay.`,
        behavioralProgress: `${name}'s behavioral trajectory during placement showed ${hasInvestPos ? "positive engagement" : "developing progress"} with the program. Average daily points were ${avgPoints}. ${hasAdultPos ? "He demonstrated growing responsiveness to staff direction." : "Behavioral consistency remained an area of focus throughout placement."}`,
        peerInteractionSummary: `${name}'s peer interactions ${hasPeerPos ? "showed positive development over the course of placement" : "were an area of ongoing focus during placement"}. Peer interaction ratings averaged ${avgPeer}/5.`,
        adultInteractionSummary: `${name}'s interactions with staff ${hasAdultPos ? "demonstrated growth in respectfulness and compliance" : "showed developing responsiveness to adult guidance"}. Adult interaction ratings averaged ${avgAdult}/5.`,
        programInvestmentSummary: `${name} ${hasInvestPos ? "demonstrated engagement in programming and daily activities" : "worked on developing consistent program investment"}. Investment ratings averaged ${avgInvestment}/5.`,
        authoritySummary: `${name} ${hasAdultPos ? "showed improvement in accepting authority and following program structure" : "continued to work on appropriate responses to rules and structure"}. Authority ratings averaged ${avgAuthority}/5.`,
        academicSummary: `${name} attended the Heartland Boys Home Independent School managed by Berniklau Education Solutions. ${youth.hasIEP ? "IEP goals were addressed through specialized instruction." : "Academic programming was provided throughout the stay."}`,
        independentLivingSkills: `${name} developed independent living skills including personal hygiene, room maintenance, and daily routine management during placement.`,
        familyEngagementSummary: `${name}'s family ${youth.legalGuardian ? `(guardian: ${youth.legalGuardian})` : ""} maintained contact through scheduled phone calls and visits during the stay. The care team facilitated family engagement and participation in the treatment process.`,
        aftercarePlan: `Recommended aftercare includes continued therapeutic support, family-based services, and connection to community resources to maintain gains achieved during placement.`,
        strengthsAtDischarge: `${name}'s strengths at discharge include ${hasPeerPos ? "positive peer engagement" : "developing social skills"}, ${hasAdultPos ? "appropriate adult interactions" : "growing responsiveness to guidance"}, and ${hasInvestPos ? "program investment" : "willingness to participate when motivated"}.`,
        ongoingConcerns: `Areas requiring continued monitoring include behavioral consistency, emotional regulation, and generalization of skills learned in the residential setting to community environments.`,
        recommendations: `Clinical recommendations include continued individual therapy, family counseling, and connection to school-based support services. Regular follow-up with the aftercare team is recommended to ensure continuity of care.`,
      };

      const updates: Partial<DischargeData> = {};
      let aiSuccessCount = 0;

      results.forEach((result, idx) => {
        const fieldKey = fields[idx].key;
        if (result.status === "fulfilled" && result.value?.value) {
          updates[fieldKey as keyof DischargeData] = result.value.value as any;
          aiSuccessCount++;
        } else {
          updates[fieldKey as keyof DischargeData] = (localFallback[fieldKey] || "") as any;
        }
      });

      setReportData((prev) => ({ ...prev, ...updates }));

      if (aiSuccessCount > 0) {
        toast({ title: "Report Populated", description: `${aiSuccessCount} sections from AI, ${fields.length - aiSuccessCount} from local data. Review and edit.` });
      } else {
        toast({ title: "Report Populated", description: "Sections filled from local data. AI was unavailable — review and edit as needed." });
      }
    } catch (error) {
      console.error("Populate error:", error);
      toast({ title: "Error", description: "Failed to populate report.", variant: "destructive" });
    } finally {
      setIsAIPopulating(false);
    }
  };

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        const filename = `${buildReportFilename(youth, "Discharge Report")}.pdf`;
        await exportElementToPDF(printRef.current, filename);
        toast({ title: "PDF Exported", description: "Discharge Report exported as PDF." });
      } catch {
        toast({ title: "Export Error", description: "Failed to export PDF.", variant: "destructive" });
      }
    }
  };

  const handleReset = async () => {
    if (confirm("Reset the discharge report? All data will be lost.")) {
      try { await draftsService.delete(youth.id, "discharge_report", user?.uid || null); } catch {}
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="discharge-print-hide">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Discharge Report
            {isAutoSaving && <span className="text-sm text-green-600">(Auto-saving...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Button onClick={handleAIPopulate} disabled={isAIPopulating} className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
            {isAIPopulating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {isAIPopulating ? "Populating..." : "Populate Report"}
          </Button>
          <Button onClick={handleSave} variant="outline"><Save className="h-4 w-4 mr-2" />Save</Button>
          <Button onClick={handleExportPDF} variant="outline"><Download className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button onClick={handleReset} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
        </CardContent>
      </Card>

      <div ref={printRef} className="bg-white p-8 rounded-lg border print-section">
        <ReportHeader subtitle="Discharge Summary Report" detail={reportData.dateOfDischarge ? format(new Date(reportData.dateOfDischarge + "T00:00:00"), "MMMM d, yyyy") : undefined} className="mb-8" />

        {/* Resident Information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {([
            ["residentName", "Resident Name"],
            ["idNumber", "ID #"],
            ["dateOfBirth", "Date of Birth"],
            ["dateOfAdmission", "Date of Admission"],
            ["dateOfDischarge", "Date of Discharge"],
            ["lengthOfStay", "Length of Stay"],
            ["currentLevel", "Level at Discharge"],
            ["caseManager", "Case Manager"],
            ["primaryStaff", "Primary Staff"],
            ["probationOfficer", "Probation Officer"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label>{label}:</Label>
              <Input
                type={key === "dateOfDischarge" || key === "dateOfBirth" || key === "dateOfAdmission" ? "date" : "text"}
                value={reportData[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
                className="border-b border-gray-300 rounded-none"
              />
            </div>
          ))}
        </div>

        {/* I. Reason for Discharge */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">I. REASON FOR DISCHARGE</h3>
          <div className="flex gap-4 flex-wrap mb-3">
            {(["Successful Completion", "Court Order", "Family Request", "Transfer", "AWOL", "Administrative", "Other"] as const).map((reason) => (
              <label key={reason} className="flex items-center gap-2">
                <Checkbox checked={reportData.reasonForDischarge === reason} onCheckedChange={() => handleChange("reasonForDischarge", reason)} />
                {reason}
              </label>
            ))}
          </div>
          <Label className="font-semibold">Details:</Label>
          <Textarea value={reportData.reasonDetail} onChange={(e) => handleChange("reasonDetail", e.target.value)} rows={3} className="mt-1" />
        </div>

        {/* II. Treatment Goal Status */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">II. TREATMENT GOAL STATUS</h3>
          <div className="mb-3">
            <Label className="font-semibold">Summary of Treatment Progress:</Label>
            <Textarea value={reportData.treatmentGoalsSummary} onChange={(e) => handleChange("treatmentGoalsSummary", e.target.value)} rows={3} className="mt-1" />
          </div>
          {([1, 2, 3] as const).map((n) => {
            const goalKey = `goal${n}` as keyof DischargeData;
            const statusKey = `goal${n}Status` as keyof DischargeData;
            return (
              <div key={n} className="mb-3 space-y-2">
                <Label className="font-semibold">Goal #{n}:</Label>
                <Input value={reportData[goalKey] as string} onChange={(e) => handleChange(goalKey, e.target.value)} />
                <div className="flex gap-4">
                  {(["Achieved", "Partially Achieved", "Not Achieved", "Ongoing"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2">
                      <Checkbox checked={reportData[statusKey] === s} onCheckedChange={() => handleChange(statusKey, s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* III. Behavioral Progress */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">III. BEHAVIORAL PROGRESS</h3>
          {([
            ["behavioralProgress", "Overall Behavioral Progress:"],
            ["peerInteractionSummary", "Peer Interaction:"],
            ["adultInteractionSummary", "Adult Interaction:"],
            ["programInvestmentSummary", "Program Investment:"],
            ["authoritySummary", "Dealing with Authority:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={2} className="mt-1" />
            </div>
          ))}
        </div>

        {/* IV. Academic & Skills */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">IV. ACADEMIC & INDEPENDENT LIVING SKILLS</h3>
          <div className="mb-3">
            <Label className="font-semibold">Academic Summary:</Label>
            <Textarea value={reportData.academicSummary} onChange={(e) => handleChange("academicSummary", e.target.value)} rows={3} className="mt-1" />
          </div>
          <div>
            <Label className="font-semibold">Independent Living Skills:</Label>
            <Textarea value={reportData.independentLivingSkills} onChange={(e) => handleChange("independentLivingSkills", e.target.value)} rows={3} className="mt-1" />
          </div>
        </div>

        {/* V. Family & Aftercare */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">V. FAMILY ENGAGEMENT & AFTERCARE</h3>
          {([
            ["familyEngagementSummary", "Family Engagement Summary:"],
            ["aftercarePlan", "Aftercare / Transition Plan:"],
            ["communityResources", "Community Resources / Referrals:"],
            ["followUpAppointments", "Follow-Up Appointments:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={3} className="mt-1" />
            </div>
          ))}
        </div>

        {/* VI. Summary & Recommendations */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VI. SUMMARY & RECOMMENDATIONS</h3>
          {([
            ["strengthsAtDischarge", "Strengths at Discharge:"],
            ["ongoingConcerns", "Ongoing Concerns:"],
            ["recommendations", "Recommendations:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={3} className="mt-1" />
            </div>
          ))}
        </div>

        {/* VII. Discharge Disposition */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VII. DISCHARGE DISPOSITION</h3>
          <div className="flex gap-4 flex-wrap mb-3">
            {(["Home", "Foster Care", "Another Facility", "Independent Living", "Detention", "Other"] as const).map((d) => (
              <label key={d} className="flex items-center gap-2">
                <Checkbox checked={reportData.dischargeDisposition === d} onCheckedChange={() => handleChange("dischargeDisposition", d)} />
                {d}
              </label>
            ))}
          </div>
          {([
            ["dispositionDetail", "Details:"],
            ["receivingAgency", "Receiving Agency / Contact:"],
            ["transportationPlan", "Transportation Plan:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={2} className="mt-1" />
            </div>
          ))}
        </div>

        {/* VIII. Administrative */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VIII. ADMINISTRATIVE</h3>
          <div className="mb-3">
            <Label className="font-semibold">Medication at Discharge:</Label>
            <Textarea value={reportData.medicationAtDischarge} onChange={(e) => handleChange("medicationAtDischarge", e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <Checkbox checked={reportData.propertyReturned} onCheckedChange={(v) => handleChange("propertyReturned", !!v)} />
            <Label className="font-semibold">All personal property returned to resident</Label>
          </div>
          <div>
            <Label className="font-semibold">Documents Provided to Resident/Guardian:</Label>
            <Textarea value={reportData.documentsProvided} onChange={(e) => handleChange("documentsProvided", e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .discharge-print-hide { display: none !important; }
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
