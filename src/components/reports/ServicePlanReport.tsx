import { useState, useRef } from "react";
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
import { getProgressNotesByYouth } from "@/lib/api";
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
      placementType: "Residential Treatment",
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

  const autoPopulateForm = async () => {
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

      setReportData(prev => ({
        ...prev,
        fullName: `${youth.firstName} ${youth.lastName}`,
        dateOfBirth: dob,
        dateOfAdmission: admissionDate,
        currentLevel: `Level ${youth.level}`,
        placementType: "Residential Treatment",
        referralSource: youth.placingAgencyCounty || "",
        guardianInfo,
      }));

      toast({ title: "Form populated", description: "Youth data loaded into the form" });
    } catch (error) {
      console.error("Error auto-populating:", error);
      toast({ title: "Error", description: "Failed to auto-populate form data", variant: "destructive" });
    } finally {
      setIsAutoPopulating(false);
    }
  };

  const enhanceField = async (field: keyof ServicePlanData) => {
    const currentValue = reportData[field];
    if (!currentValue.trim()) {
      toast({ title: "No content", description: "Please enter some text first before enhancing" });
      return;
    }

    setIsEnhancing(field);
    try {
      const prompt = `You are writing a service plan for a youth in residential treatment named ${youth.firstName} ${youth.lastName}. Take the following notes and expand them into a clear, professional paragraph suitable for a formal service plan document. Keep the original facts and meaning, add appropriate clinical detail and structure:\n\n"${currentValue}"\n\nExpand this into 2-4 well-structured sentences in professional clinical tone.`;

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
                  <Input value={reportData.placementType} onChange={(e) => handleInputChange("placementType", e.target.value)} placeholder="e.g., Residential Treatment" />
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
