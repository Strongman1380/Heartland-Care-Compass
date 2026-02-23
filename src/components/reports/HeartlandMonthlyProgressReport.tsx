import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Save, RotateCcw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { format } from "date-fns";
import { useAuth } from '@/contexts/AuthContext'
import { draftsService } from '@/integrations/firebase/draftsService'

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
            console.error("Error loading saved report data:", error);
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
        console.error("Error exporting PDF:", error);
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
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Progress Report
            {isAutoSaving && <span className="text-sm text-green-600">(Auto-saving...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleSaveReport} variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
          <Button onClick={handleExportPDF} className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
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
            .no-print { display: none !important; }
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
