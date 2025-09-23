import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Printer, Save, FileDown, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF, exportElementToDocx } from "@/utils/export";

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

  // Program Participation & Daily Points
  avgWeeklyPoints: string;
  highPointAreas: string;
  lowPointAreas: string;
  trendsOverTime: string;
  incentivesEarned: string;

  // Behavioral Summary
  behavioralSummary: string;

  // Academic Progress
  academicProgress: string;
  schoolPerformance: string;
  educationalGoals: string;

  // Social/Emotional Development
  socialProgress: string;
  emotionalRegulation: string;
  peerRelationships: string;

  // Treatment Progress
  treatmentGoals: string;
  treatmentProgress: string;
  therapyParticipation: string;

  // Risk Assessment
  riskLevel: string;
  riskFactors: string;

  // Real Colors Profile
  primaryColor: string;
  secondaryColor: string;
  colorProfile: string;

  // Placement Recommendation
  placementRecommendation: string;
  recommendationReason: string;
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
    avgWeeklyPoints: "",
    highPointAreas: "",
    lowPointAreas: "",
    trendsOverTime: "",
    incentivesEarned: "",
    behavioralSummary: "",
    academicProgress: "",
    schoolPerformance: "",
    educationalGoals: "",
    socialProgress: "",
    emotionalRegulation: "",
    peerRelationships: "",
    treatmentGoals: "",
    treatmentProgress: "",
    therapyParticipation: "",
    riskLevel: "",
    riskFactors: "",
    primaryColor: "",
    secondaryColor: "",
    colorProfile: "",
    placementRecommendation: "",
    recommendationReason: "",
    futureGoals: "",
    preparedBy: "",
    reportDate: format(new Date(), "yyyy-MM-dd"),
    month: format(new Date(), "MMMM"),
    year: format(new Date(), "yyyy")
  });

  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // Load saved data on component mount
  useEffect(() => {
    const loadSavedData = () => {
      const saveKey = `monthly-progress-${youth?.id}-${selectedMonth}`;
      const saved = localStorage.getItem(saveKey);
      if (saved) {
        try {
          const savedData = JSON.parse(saved);
          setReportData({ ...reportData, ...savedData });
        } catch (error) {
          console.error("Error loading saved data:", error);
        }
      }
    };

    if (youth?.id) {
      loadSavedData();
    }
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

  const handleFieldChange = (field: keyof MonthlyReportData, value: string) => {
    setReportData(prev => ({ ...prev, [field]: value }));
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

  const handlePrint = async () => {
    if (printRef.current) {
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
    }
  };

  const handleExportDOCX = async () => {
    if (printRef.current) {
      try {
        const selectedDate = new Date(selectedMonth + "-01");
        const filename = `Monthly_Progress_${youth.lastName}_${youth.firstName}_${format(selectedDate, "MMMM_yyyy")}.docx`;
        await exportElementToDocx(printRef.current, filename);
        toast({
          title: "Success",
          description: "Monthly progress report DOCX has been generated and downloaded",
        });
      } catch (error) {
        console.error("Error exporting DOCX:", error);
        toast({
          title: "Error",
          description: "Failed to generate DOCX. Please try again.",
          variant: "destructive"
        });
      }
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
      avgWeeklyPoints: "",
      highPointAreas: "",
      lowPointAreas: "",
      trendsOverTime: "",
      incentivesEarned: "",
      behavioralSummary: "",
      academicProgress: "",
      schoolPerformance: "",
      educationalGoals: "",
      socialProgress: "",
      emotionalRegulation: "",
      peerRelationships: "",
      treatmentGoals: "",
      treatmentProgress: "",
      therapyParticipation: "",
      riskLevel: "",
      riskFactors: "",
      primaryColor: "",
      secondaryColor: "",
      colorProfile: "",
      placementRecommendation: "",
      recommendationReason: "",
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
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Progress Report - {youth.firstName} {youth.lastName}
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
                  onChange={(e) => handleFieldChange('lengthOfStay', e.target.value)}
                  placeholder="e.g., 6 months"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Average Weekly Points</Label>
                <Input
                  value={reportData.avgWeeklyPoints}
                  onChange={(e) => handleFieldChange('avgWeeklyPoints', e.target.value)}
                  placeholder="Average weekly point totals"
                />
              </div>
              <div className="space-y-2">
                <Label>Incentives Earned</Label>
                <Input
                  value={reportData.incentivesEarned}
                  onChange={(e) => handleFieldChange('incentivesEarned', e.target.value)}
                  placeholder="Incentives earned/lost"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>High Point Areas (Strengths)</Label>
              <Textarea
                value={reportData.highPointAreas}
                onChange={(e) => handleFieldChange('highPointAreas', e.target.value)}
                placeholder="Areas where youth performs well"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Low Point Areas (Struggles)</Label>
              <Textarea
                value={reportData.lowPointAreas}
                onChange={(e) => handleFieldChange('lowPointAreas', e.target.value)}
                placeholder="Areas where youth struggles"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Trends Over Time</Label>
              <Textarea
                value={reportData.trendsOverTime}
                onChange={(e) => handleFieldChange('trendsOverTime', e.target.value)}
                placeholder="Progress trends and patterns"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Academic Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Academic Progress</h3>
            <div className="space-y-2">
              <Label>Academic Progress</Label>
              <Textarea
                value={reportData.academicProgress}
                onChange={(e) => handleFieldChange('academicProgress', e.target.value)}
                placeholder="Overall academic progress and achievements"
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>School Performance</Label>
              <Textarea
                value={reportData.schoolPerformance}
                onChange={(e) => handleFieldChange('schoolPerformance', e.target.value)}
                placeholder="Specific school performance details"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Educational Goals</Label>
              <Textarea
                value={reportData.educationalGoals}
                onChange={(e) => handleFieldChange('educationalGoals', e.target.value)}
                placeholder="Educational goals and objectives"
                className="min-h-[80px]"
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
              <Label>Social Progress</Label>
              <Textarea
                value={reportData.socialProgress}
                onChange={(e) => handleFieldChange('socialProgress', e.target.value)}
                placeholder="Social development and skills progress"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Emotional Regulation</Label>
              <Textarea
                value={reportData.emotionalRegulation}
                onChange={(e) => handleFieldChange('emotionalRegulation', e.target.value)}
                placeholder="Emotional regulation progress and strategies"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Peer Relationships</Label>
              <Textarea
                value={reportData.peerRelationships}
                onChange={(e) => handleFieldChange('peerRelationships', e.target.value)}
                placeholder="Peer relationships and social interactions"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Treatment Progress */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Treatment Progress</h3>
            <div className="space-y-2">
              <Label>Treatment Goals</Label>
              <Textarea
                value={reportData.treatmentGoals}
                onChange={(e) => handleFieldChange('treatmentGoals', e.target.value)}
                placeholder="Current treatment goals and objectives"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Treatment Progress</Label>
              <Textarea
                value={reportData.treatmentProgress}
                onChange={(e) => handleFieldChange('treatmentProgress', e.target.value)}
                placeholder="Progress toward treatment goals"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Therapy Participation</Label>
              <Textarea
                value={reportData.therapyParticipation}
                onChange={(e) => handleFieldChange('therapyParticipation', e.target.value)}
                placeholder="Participation in therapy and counseling sessions"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Risk Assessment</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={reportData.riskLevel} onValueChange={(value) => handleFieldChange('riskLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select risk level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Moderate">Moderate</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Very High">Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Risk Factors</Label>
              <Textarea
                value={reportData.riskFactors}
                onChange={(e) => handleFieldChange('riskFactors', e.target.value)}
                placeholder="Identified risk factors and mitigation strategies"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Real Colors Profile */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Real Colors Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <Select value={reportData.primaryColor} onValueChange={(value) => handleFieldChange('primaryColor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <Select value={reportData.secondaryColor} onValueChange={(value) => handleFieldChange('secondaryColor', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select secondary color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orange">Orange</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="Green">Green</SelectItem>
                    <SelectItem value="Blue">Blue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color Profile Analysis</Label>
              <Textarea
                value={reportData.colorProfile}
                onChange={(e) => handleFieldChange('colorProfile', e.target.value)}
                placeholder="Real Colors profile analysis and implications"
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Placement Recommendation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Placement Recommendation</h3>
            <div className="space-y-2">
              <Label>Placement Recommendation</Label>
              <Textarea
                value={reportData.placementRecommendation}
                onChange={(e) => handleFieldChange('placementRecommendation', e.target.value)}
                placeholder="Recommended placement or next steps"
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Recommendation Rationale</Label>
              <Textarea
                value={reportData.recommendationReason}
                onChange={(e) => handleFieldChange('recommendationReason', e.target.value)}
                placeholder="Rationale for placement recommendation"
                className="min-h-[80px]"
              />
            </div>
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
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6">
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
              onClick={handlePrint}
            >
              <FileDown className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportDOCX}
            >
              <FileDown className="h-4 w-4" />
              Export DOCX
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
              Print
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
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="print-section bg-white text-black p-8 rounded-lg border">
        <div className="text-center mb-6 bg-gradient-to-r from-red-800 via-red-700 to-amber-600 text-white p-6 rounded-lg">
          <img src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`} alt="Heartland Boys Home Logo" className="h-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold mb-2">Heartland Boys Home</h1>
          <h2 className="text-xl font-semibold mb-2">Monthly Progress Report</h2>
          <div className="text-lg mt-2">
            {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div><strong>Report Date:</strong> {reportData.reportDate}</div>
          <div><strong>Prepared By:</strong> {reportData.preparedBy}</div>
        </div>

        {/* Youth Information */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">1. Youth Profile Information</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Full Legal Name:</strong> {reportData.fullLegalName || `${youth.firstName} ${youth.lastName}`}</div>
            <div><strong>Preferred Name:</strong> {reportData.preferredName}</div>
            <div><strong>Date of Birth:</strong> {reportData.dateOfBirth}</div>
            <div><strong>Age:</strong> {reportData.age}</div>
            <div><strong>Date of Admission:</strong> {reportData.dateOfAdmission}</div>
            <div><strong>Length of Stay:</strong> {reportData.lengthOfStay}</div>
            <div><strong>Current Level:</strong> {reportData.currentLevel}</div>
            <div><strong>Current Placement:</strong> {reportData.currentPlacement}</div>
            <div><strong>Probation Officer:</strong> {reportData.probationOfficer}</div>
            <div><strong>School Placement:</strong> {reportData.schoolPlacement}</div>
            <div><strong>Guardians Information:</strong> {reportData.guardiansInfo}</div>
            <div><strong>Current Diagnoses:</strong> {reportData.currentDiagnoses}</div>
          </div>
        </div>

        {/* Program Participation */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">2. Program Participation & Daily Points</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Average Weekly Points:</strong> {reportData.avgWeeklyPoints}</div>
            <div><strong>High Point Areas (Strengths):</strong> {reportData.highPointAreas}</div>
            <div><strong>Low Point Areas (Struggles):</strong> {reportData.lowPointAreas}</div>
            <div><strong>Trends Over Time:</strong> {reportData.trendsOverTime}</div>
            <div><strong>Incentives Earned:</strong> {reportData.incentivesEarned}</div>
          </div>
        </div>

        {/* Academic Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">3. Academic Progress</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Academic Progress:</strong> {reportData.academicProgress}</div>
            <div><strong>School Performance:</strong> {reportData.schoolPerformance}</div>
            <div><strong>Educational Goals:</strong> {reportData.educationalGoals}</div>
          </div>
        </div>

        {/* Behavioral Summary */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">4. Behavioral Summary</h3>
          <div className="space-y-2 ml-4">
            <div>{reportData.behavioralSummary}</div>
          </div>
        </div>

        {/* Social/Emotional Development */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">5. Social/Emotional Development</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Social Progress:</strong> {reportData.socialProgress}</div>
            <div><strong>Emotional Regulation:</strong> {reportData.emotionalRegulation}</div>
            <div><strong>Peer Relationships:</strong> {reportData.peerRelationships}</div>
          </div>
        </div>

        {/* Treatment Progress */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">6. Treatment Progress</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Treatment Goals:</strong> {reportData.treatmentGoals}</div>
            <div><strong>Treatment Progress:</strong> {reportData.treatmentProgress}</div>
            <div><strong>Therapy Participation:</strong> {reportData.therapyParticipation}</div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">7. Risk Assessment</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Risk Level:</strong> {reportData.riskLevel}</div>
            <div><strong>Risk Factors:</strong> {reportData.riskFactors}</div>
          </div>
        </div>

        {/* Real Colors Profile */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">8. Real Colors Profile</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Primary Color:</strong> {reportData.primaryColor}</div>
            <div><strong>Secondary Color:</strong> {reportData.secondaryColor}</div>
            <div><strong>Color Profile Analysis:</strong> {reportData.colorProfile}</div>
          </div>
        </div>

        {/* Placement Recommendation */}
        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">9. Placement Recommendation</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Placement Recommendation:</strong> {reportData.placementRecommendation}</div>
            <div><strong>Recommendation Rationale:</strong> {reportData.recommendationReason}</div>
            <div><strong>Future Goals:</strong> {reportData.futureGoals}</div>
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
