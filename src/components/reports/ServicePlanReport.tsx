import { useState, useRef, useEffect } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { FormattedText } from "@/components/ui/formatted-text";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDown, RotateCcw, Sparkles, Save, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";
import { getProgressNotesByYouth, getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { getScoresByYouth, type SchoolDailyScore } from "@/utils/schoolScores";
import { getWeeklyEvalsForYouthInRange, getDailyShiftsForYouthInRange } from "@/utils/shiftScores";
import * as aiService from "@/services/aiService";

interface ServicePlanReportProps {
  youth: Youth;
}

interface ServicePlanData {
  // Resident Info
  fullName: string;
  dateOfBirth: string;
  dateOfAdmission: string;
  currentLevel: string;
  placementType: string;
  referralSource: string;
  guardianInfo: string;

  // Assessment Summary
  assessmentSummary: string;

  // Treatment Objectives
  treatmentObjectives: string;

  // Permanency Planning
  permanencyPlanning: string;

  // Service Interventions
  serviceInterventions: string;

  // Progress Indicators
  progressIndicators: string;

  // Recommendations
  recommendations: string;

  // Metadata
  preparedBy: string;
  reportDate: string;
}

export const ServicePlanReport = ({ youth }: ServicePlanReportProps) => {
  const [activeTab, setActiveTab] = useState("resident-info");
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [isAutoPopulating, setIsAutoPopulating] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [reportData, setReportData] = useState<ServicePlanData>(() => {
    const dob = youth.dob ? format(new Date(youth.dob), "MMMM d, yyyy") : "";
    const admissionDate = youth.admissionDate ? format(new Date(youth.admissionDate), "MMMM d, yyyy") : "";
    const guardianName = youth.legalGuardian?.name || "";
    const guardianRelationship = youth.legalGuardian?.relationship || "Guardian";
    const guardianPhone = youth.legalGuardian?.phone || "";
    const guardianInfo = guardianName
      ? `${guardianName} (${guardianRelationship})${guardianPhone ? ` - ${guardianPhone}` : ""}`
      : "";

    return {
      fullName: `${youth.firstName} ${youth.lastName}`,
      dateOfBirth: dob,
      dateOfAdmission: admissionDate,
      currentLevel: `Level ${youth.level}`,
      placementType: "Group Home",
      referralSource: youth.placingAgencyCounty || "",
      guardianInfo,
      assessmentSummary: "",
      treatmentObjectives: "",
      permanencyPlanning: "",
      serviceInterventions: "",
      progressIndicators: "",
      recommendations: "",
      preparedBy: "",
      reportDate: format(new Date(), "yyyy-MM-dd"),
    };
  });

  const isSectionComplete = (section: string): boolean => {
    switch (section) {
      case "resident-info":
        return !!(reportData.fullName && reportData.dateOfBirth);
      case "assessment":
        return reportData.assessmentSummary.length > 50;
      case "objectives":
        return reportData.treatmentObjectives.length > 50;
      case "permanency":
        return reportData.permanencyPlanning.length > 50;
      case "interventions":
        return reportData.serviceInterventions.length > 50;
      case "progress":
        return reportData.progressIndicators.length > 50;
      case "recommendations":
        return reportData.recommendations.length > 20;
      default:
        return false;
    }
  };

  const handleInputChange = (field: keyof ServicePlanData, value: string) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const extractCaseNoteContent = (note: any): string => {
    if (!note) return "";
    if (typeof note.summary === 'string' && note.summary.trim().length > 0) return note.summary.trim();
    const rawNote = typeof note.note === 'string' ? note.note : "";
    if (!rawNote) return "";
    try {
      const parsed = JSON.parse(rawNote);
      if (parsed?.sections) {
        return Object.values(parsed.sections)
          .filter((v) => typeof v === 'string' && (v as string).trim().length > 0)
          .join(' ');
      }
      if (parsed?.content && typeof parsed.content === 'string') return parsed.content;
    } catch {}
    return rawNote;
  };

  const autoPopulateForm = async (skipConfirm = false) => {
    if (!youth?.id) return;

    setIsAutoPopulating(true);
    try {
      const progressNotes = await getProgressNotesByYouth(youth.id).catch(() => []);

      const admissionDate = youth.admissionDate
        ? format(new Date(youth.admissionDate), "MMMM d, yyyy")
        : "Not specified";

      const guardianName = youth.legalGuardian?.name || "";
      const guardianRelationship = youth.legalGuardian?.relationship || "Guardian";
      const guardianPhone = youth.legalGuardian?.phone || "No phone";
      const guardianInfo = guardianName
        ? `${guardianName} (${guardianRelationship}) - ${guardianPhone}`
        : "";

      const dob = youth.dob
        ? format(new Date(youth.dob), "MMMM d, yyyy")
        : "";

      // Always populate demographics
      setReportData(prev => ({
        ...prev,
        fullName: `${youth.firstName} ${youth.lastName}`,
        dateOfBirth: dob,
        dateOfAdmission: admissionDate,
        currentLevel: `Level ${youth.level}`,
        placementType: "Group Home",
        referralSource: youth.placingAgencyCounty || "",
        guardianInfo,
      }));

      // Build case notes context for AI
      const caseNotesText = progressNotes
        .sort((a: any, b: any) => {
          const dateA = a.date ? new Date(a.date).getTime() : 0;
          const dateB = b.date ? new Date(b.date).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 50)
        .map((note: any) => {
          const content = extractCaseNoteContent(note);
          const date = note.date ? format(new Date(note.date), 'MMM d, yyyy') : 'No date';
          return `[${date}] ${content}`;
        })
        .join('\n\n');

      if (!caseNotesText.trim()) {
        toast({ title: "Form populated", description: "Youth data loaded. No case notes available for AI summaries." });
        return;
      }

      toast({ title: "AI Processing", description: "Generating service plan sections from case notes and documentation..." });

      // Fetch additional data: behavior points, daily ratings, school scores, weekly evals
      const todayISO = format(new Date(), 'yyyy-MM-dd');
      const admissionISO = youth.admissionDate ? format(new Date(youth.admissionDate), 'yyyy-MM-dd') : todayISO;
      const [behaviorPoints, dailyRatings, schoolScores, weeklyEvals, dailyShifts] = await Promise.all([
        getBehaviorPointsByYouth(youth.id).catch(() => []),
        getDailyRatingsByYouth(youth.id).catch(() => []),
        getScoresByYouth(youth.id).catch(() => []),
        getWeeklyEvalsForYouthInRange(youth.id, admissionISO, todayISO).catch(() => []),
        getDailyShiftsForYouthInRange(youth.id, admissionISO, todayISO).catch(() => [])
      ]);

      // Calculate behavior point averages
      const bpCount = behaviorPoints.length;
      const avgPoints = bpCount > 0 ? (behaviorPoints.reduce((s: number, p: any) => s + (p.totalPoints || 0), 0) / bpCount).toFixed(1) : 'N/A';

      // Calculate daily rating averages
      const ratingCount = dailyRatings.length;
      const avgPeer = ratingCount > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.peerInteraction ?? 0), 0) / ratingCount).toFixed(1) : 'N/A';
      const avgAdult = ratingCount > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.adultInteraction ?? 0), 0) / ratingCount).toFixed(1) : 'N/A';
      const avgInvestment = ratingCount > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.investmentLevel ?? 0), 0) / ratingCount).toFixed(1) : 'N/A';
      const avgAuthority = ratingCount > 0 ? (dailyRatings.reduce((s: number, r: any) => s + (r.dealAuthority ?? 0), 0) / ratingCount).toFixed(1) : 'N/A';

      // Calculate school score average
      const schoolAvg = (schoolScores as SchoolDailyScore[]).length > 0
        ? ((schoolScores as SchoolDailyScore[]).reduce((s, sc) => s + Number(sc.score ?? 0), 0) / (schoolScores as SchoolDailyScore[]).length).toFixed(1)
        : 'N/A';

      // Calculate weekly eval / shift score averages
      const allEvalEntries = [...weeklyEvals, ...dailyShifts];
      const evalCount = allEvalEntries.length;
      const evalAvgPeer = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + e.peer, 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgAdult = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + e.adult, 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgInvestment = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + e.investment, 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgAuthority = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + e.authority, 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgOverall = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + e.overall, 0) / evalCount).toFixed(1) : 'N/A';

      const baseInstruction = `You are a clinical professional writing a service plan for ${youth.firstName} ${youth.lastName} at Heartland Boys Home, a group home.

CRITICAL RULES:
- Do NOT include raw case note excerpts, dates in brackets, or staff names
- SYNTHESIZE information into cohesive professional narrative
- Write in third person professional clinical language
- Do not use markdown formatting. Write plain professional text.

Youth Information:
- Current Level: ${youth.level}
- Current Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || 'Not documented'}
- Current Counseling: ${youth.currentCounseling?.join(', ') || 'Not specified'}
- Therapist: ${youth.therapistName || 'Not specified'}
- Placing Agency: ${youth.placingAgencyCounty || 'Not specified'}
- Average Daily Points: ${avgPoints}/15 (${bpCount} days tracked)

Daily Ratings (0-5 scale, ${ratingCount} entries):
- Peer Interaction: ${avgPeer}/5
- Adult Interaction: ${avgAdult}/5
- Investment Level: ${avgInvestment}/5
- Dealing w/ Authority: ${avgAuthority}/5

Weekly Eval / Shift Scores (0-4 scale, ${evalCount} entries):
- Peer Interaction: ${evalAvgPeer}/4
- Adult Interaction: ${evalAvgAdult}/4
- Investment Level: ${evalAvgInvestment}/4
- Dealing w/ Authority: ${evalAvgAuthority}/4
- Overall Average: ${evalAvgOverall}/4

School Score Average: ${schoolAvg}/4

Case Notes:
${caseNotesText}`;

      const aiPrompts: Record<string, string> = {
        assessmentSummary: `${baseInstruction}\n\nWrite a 2-3 paragraph assessment summary covering: presenting problems, clinical observations, strengths, areas of need, and current functioning level. This should provide context for the treatment plan.`,

        treatmentObjectives: `${baseInstruction}\n\nWrite 2-3 paragraphs outlining treatment objectives based on the youth's documented needs. Include specific, measurable goals across behavioral, social, emotional, and educational domains. Reference treatment goals if documented.`,

        permanencyPlanning: `${baseInstruction}\n\nWrite 2-3 paragraphs about permanency planning: family reunification efforts, family engagement, discharge planning considerations, and the long-term plan for stable placement after residential care.`,

        serviceInterventions: `${baseInstruction}\n\nWrite 2-3 paragraphs describing service interventions currently in place or recommended: individual therapy, group counseling, behavioral modification program, educational supports, life skills training, family therapy, and any specialized interventions.`,

        progressIndicators: `${baseInstruction}\n\nWrite 2-3 paragraphs about progress indicators: what measurable improvements have been observed, behavioral trends, level advancement progress, academic engagement, social skill development, and areas still requiring intervention.`,

        recommendations: `${baseInstruction}\n\nWrite 2-3 paragraphs of clinical recommendations: continued treatment needs, suggested modifications to the service plan, referrals, discharge readiness assessment, and next steps for the treatment team.`,
      };

      const updates: Partial<ServicePlanData> = {};

      for (const [field, prompt] of Object.entries(aiPrompts)) {
        try {
          const response = await aiService.default.queryData(prompt, {
            youth,
            caseNotes: caseNotesText,
          });

          if (response.success && response.data?.answer) {
            updates[field as keyof ServicePlanData] = response.data.answer as any;
          }
        } catch (error) {
          console.error(`Error generating ${field}:`, error);
        }
      }

      setReportData(prev => ({ ...prev, ...updates }));

      toast({ title: "Success", description: "Service plan populated with AI-generated summaries from case notes. Review and edit as needed." });
    } catch (error) {
      console.error("Error auto-populating:", error);
      toast({ title: "Error", description: "Failed to auto-populate form data", variant: "destructive" });
    } finally {
      setIsAutoPopulating(false);
    }
  };

  // Auto-trigger AI population on mount
  useEffect(() => {
    if (youth?.id) {
      autoPopulateForm(true);
    }
  }, [youth?.id]);

  const enhanceField = async (field: keyof ServicePlanData) => {
    const currentValue = reportData[field];
    if (!currentValue.trim()) {
      toast({ title: "No content", description: "Please enter some text first before enhancing" });
      return;
    }

    setIsEnhancing(field);
    try {
      const prompt = `You are writing a service plan for a youth at a group home named ${youth.firstName} ${youth.lastName}. Take the following notes and expand them into a clear, professional paragraph suitable for a formal service plan document. Keep the original facts and meaning, add appropriate clinical detail and structure:\n\n"${currentValue}"\n\nExpand this into 2-4 well-structured sentences in professional clinical tone.`;

      const response = await aiService.default.queryData(prompt, {
        youth,
        currentText: currentValue,
        fieldType: field,
      });

      if (response.success && response.data?.answer) {
        setReportData(prev => ({ ...prev, [field]: response.data.answer }));
        toast({ title: "Enhanced", description: "Text enhanced with AI" });
      } else {
        throw new Error(response.error || "Failed to enhance text");
      }
    } catch (error: any) {
      console.error("AI enhancement error:", error);
      toast({ title: "Error", description: `Enhancement failed: ${error.message}`, variant: "destructive" });
    } finally {
      setIsEnhancing(null);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;

    try {
      const filename = `${buildReportFilename(youth, "Service Plan Report")}.pdf`;
      await exportElementToPDF(printRef.current, filename);
      toast({ title: "Success", description: "Service Plan PDF has been generated and downloaded" });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setReportData({
      fullName: "",
      dateOfBirth: "",
      dateOfAdmission: "",
      currentLevel: "",
      placementType: "",
      referralSource: "",
      guardianInfo: "",
      assessmentSummary: "",
      treatmentObjectives: "",
      permanencyPlanning: "",
      serviceInterventions: "",
      progressIndicators: "",
      recommendations: "",
      preparedBy: "",
      reportDate: format(new Date(), "yyyy-MM-dd"),
    });
    setActiveTab("resident-info");
  };

  const SectionIndicator = ({ section }: { section: string }) => {
    return isSectionComplete(section) ? (
      <CheckCircle2 className="w-4 h-4 text-green-500" />
    ) : (
      <Circle className="w-4 h-4 text-gray-300" />
    );
  };

  const EnhanceButton = ({ field }: { field: keyof ServicePlanData }) => (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => enhanceField(field)}
      disabled={isEnhancing === field || !reportData[field].trim()}
    >
      <Sparkles className="w-4 h-4 mr-1" />
      {isEnhancing === field ? "Enhancing..." : "Enhance"}
    </Button>
  );

  const sections = [
    { id: "resident-info", label: "Resident Info" },
    { id: "assessment", label: "Assessment" },
    { id: "objectives", label: "Objectives" },
    { id: "permanency", label: "Permanency" },
    { id: "interventions", label: "Interventions" },
    { id: "progress", label: "Progress" },
    { id: "recommendations", label: "Recommendations" },
  ];

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={autoPopulateForm} disabled={isAutoPopulating} className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
          <Sparkles className="w-4 h-4 mr-2" />
          {isAutoPopulating ? "Loading..." : "Auto-Populate from Youth Data"}
        </Button>
        <Button onClick={handleExportPDF} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
          <FileDown className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
        <Button onClick={handleReset} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-7">
              {sections.map((section) => (
                <TabsTrigger key={section.id} value={section.id} className="flex items-center gap-1 text-xs">
                  <SectionIndicator section={section.id} />
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Resident Info */}
            <TabsContent value="resident-info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Full Name</Label>
                  <Input value={reportData.fullName} onChange={(e) => handleInputChange("fullName", e.target.value)} placeholder="Full legal name" />
                </div>
                <div>
                  <Label>Date of Birth</Label>
                  <Input value={reportData.dateOfBirth} onChange={(e) => handleInputChange("dateOfBirth", e.target.value)} placeholder="Date of birth" />
                </div>
                <div>
                  <Label>Date of Admission</Label>
                  <Input value={reportData.dateOfAdmission} onChange={(e) => handleInputChange("dateOfAdmission", e.target.value)} placeholder="Admission date" />
                </div>
                <div>
                  <Label>Current Level</Label>
                  <Input value={reportData.currentLevel} onChange={(e) => handleInputChange("currentLevel", e.target.value)} placeholder="Current level" />
                </div>
                <div>
                  <Label>Placement Type</Label>
                  <Input value={reportData.placementType} onChange={(e) => handleInputChange("placementType", e.target.value)} placeholder="e.g., Group Home" />
                </div>
                <div>
                  <Label>Referral Source</Label>
                  <Input value={reportData.referralSource} onChange={(e) => handleInputChange("referralSource", e.target.value)} placeholder="Referral source" />
                </div>
              </div>
              <div>
                <Label>Guardian Information</Label>
                <Textarea value={reportData.guardianInfo} onChange={(e) => handleInputChange("guardianInfo", e.target.value)} placeholder="Guardian name, relationship, contact info..." rows={3} />
              </div>
            </TabsContent>

            {/* Assessment Summary */}
            <TabsContent value="assessment" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Assessment Summary</Label>
                  <EnhanceButton field="assessmentSummary" />
                </div>
                <Textarea value={reportData.assessmentSummary} onChange={(e) => handleInputChange("assessmentSummary", e.target.value)} placeholder="Summary of clinical assessments, presenting concerns, diagnostic impressions, risk factors..." rows={8} />
              </div>
            </TabsContent>

            {/* Treatment Objectives */}
            <TabsContent value="objectives" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Treatment Objectives</Label>
                  <EnhanceButton field="treatmentObjectives" />
                </div>
                <Textarea value={reportData.treatmentObjectives} onChange={(e) => handleInputChange("treatmentObjectives", e.target.value)} placeholder="List treatment goals and measurable objectives. Include target dates and success criteria..." rows={8} />
              </div>
            </TabsContent>

            {/* Permanency Planning */}
            <TabsContent value="permanency" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Permanency Planning</Label>
                  <EnhanceButton field="permanencyPlanning" />
                </div>
                <Textarea value={reportData.permanencyPlanning} onChange={(e) => handleInputChange("permanencyPlanning", e.target.value)} placeholder="Discharge planning, family reunification goals, transition steps, post-placement support..." rows={8} />
              </div>
            </TabsContent>

            {/* Service Interventions */}
            <TabsContent value="interventions" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Service Interventions</Label>
                  <EnhanceButton field="serviceInterventions" />
                </div>
                <Textarea value={reportData.serviceInterventions} onChange={(e) => handleInputChange("serviceInterventions", e.target.value)} placeholder="Therapeutic modalities, individual/group therapy, skill-building activities, mentoring, educational supports..." rows={8} />
              </div>
            </TabsContent>

            {/* Progress Indicators */}
            <TabsContent value="progress" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Progress Indicators</Label>
                  <EnhanceButton field="progressIndicators" />
                </div>
                <Textarea value={reportData.progressIndicators} onChange={(e) => handleInputChange("progressIndicators", e.target.value)} placeholder="Behavioral improvements, level progression, academic gains, social skill development, treatment milestone achievements..." rows={8} />
              </div>
            </TabsContent>

            {/* Recommendations */}
            <TabsContent value="recommendations" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Recommendations</Label>
                  <EnhanceButton field="recommendations" />
                </div>
                <Textarea value={reportData.recommendations} onChange={(e) => handleInputChange("recommendations", e.target.value)} placeholder="Clinical recommendations, continued treatment needs, referrals, family engagement suggestions..." rows={8} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prepared By</Label>
                  <Input value={reportData.preparedBy} onChange={(e) => handleInputChange("preparedBy", e.target.value)} placeholder="Your name and title" />
                </div>
                <div>
                  <Label>Report Date</Label>
                  <Input type="date" value={reportData.reportDate} onChange={(e) => handleInputChange("reportDate", e.target.value)} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview / Print Section */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={printRef} className="print-section bg-white text-black p-8 space-y-6">
            <ReportHeader subtitle="Service Plan Report" detail={reportData.fullName || `${youth.firstName} ${youth.lastName}`} />

            {/* Resident Info */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">1. Resident Information</h3>
              <div className="grid grid-cols-2 gap-4 ml-4">
                <div><strong>Full Name:</strong> {reportData.fullName}</div>
                <div><strong>Date of Birth:</strong> {reportData.dateOfBirth}</div>
                <div><strong>Date of Admission:</strong> {reportData.dateOfAdmission}</div>
                <div><strong>Current Level:</strong> {reportData.currentLevel}</div>
                <div><strong>Placement Type:</strong> {reportData.placementType}</div>
                <div><strong>Referral Source:</strong> {reportData.referralSource}</div>
              </div>
              {reportData.guardianInfo && (
                <div className="ml-4 mt-2">
                  <strong>Guardian:</strong> {reportData.guardianInfo}
                </div>
              )}
            </div>

            {/* Assessment Summary */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">2. Assessment Summary</h3>
              <FormattedText text={reportData.assessmentSummary} as="div" className="ml-4 text-black" />
            </div>

            {/* Treatment Objectives */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">3. Treatment Objectives</h3>
              <FormattedText text={reportData.treatmentObjectives} as="div" className="ml-4 text-black" />
            </div>

            {/* Permanency Planning */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">4. Permanency Planning</h3>
              <FormattedText text={reportData.permanencyPlanning} as="div" className="ml-4 text-black" />
            </div>

            {/* Service Interventions */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">5. Service Interventions</h3>
              <FormattedText text={reportData.serviceInterventions} as="div" className="ml-4 text-black" />
            </div>

            {/* Progress Indicators */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">6. Progress Indicators</h3>
              <FormattedText text={reportData.progressIndicators} as="div" className="ml-4 text-black" />
            </div>

            {/* Recommendations */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-4 border-b border-black pb-1 text-black">7. Recommendations</h3>
              <FormattedText text={reportData.recommendations} as="div" className="ml-4 text-black" />
            </div>

            {/* Footer */}
            <div className="border-t border-black pt-4 mt-8">
              <div className="text-center text-sm text-black">
                <p className="text-black">Report generated on {reportData.reportDate}</p>
                <p className="text-black">Prepared by: {reportData.preparedBy}</p>
                <p className="text-black">Heartland Boys Home - Service Plan Report</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
