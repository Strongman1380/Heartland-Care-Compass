import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Youth } from "@/types/app-types";
import { Save, FileDown, Printer, RotateCcw, Gavel } from "lucide-react";
import { format } from "date-fns";
import { exportElementToPDF, exportElementToDocx } from "@/utils/export";
import { useToast } from "@/hooks/use-toast";

interface CourtReportProps {
  youth?: Youth;
}

interface CourtReportData {
  // Header Information
  youthName: string;
  dateOfBirth: string;
  caseNumber: string;
  courtDate: string;
  reportDate: string;
  reportingOfficer: string;
  
  // Current Status
  currentPlacement: string;
  admissionDate: string;
  lengthOfStay: string;
  currentLevel: string;
  legalStatus: string;
  
  // Treatment Goals & Progress
  treatmentGoals: string;
  goalProgress: string;
  therapeuticParticipation: string;
  medicationCompliance: string;
  
  // Behavioral Assessment
  behavioralProgress: string;
  significantIncidents: string;
  behavioralInterventions: string;
  riskAssessment: string;
  
  // Educational Progress
  schoolPlacement: string;
  academicProgress: string;
  educationalChallenges: string;
  vocationalGoals: string;
  
  // Family & Social Relationships
  familyVisitation: string;
  familyTherapy: string;
  peerRelationships: string;
  communityContacts: string;
  
  // Program Participation
  dailyStructure: string;
  programCompliance: string;
  skillsDevelopment: string;
  incentivesEarned: string;
  
  // Future Planning
  dischargeTimeline: string;
  dischargePlanning: string;
  aftercareRecommendations: string;
  transitionPlan: string;
  
  // Summary & Recommendations
  overallAssessment: string;
  courtRecommendations: string;
  additionalComments: string;
}

const formatDateForDisplay = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return format(date, 'MMMM d, yyyy');
};

const getDisplayValue = (value?: string | null) => {
  if (!value) return 'Not provided';
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'Not provided';
};

interface CourtReportPreviewProps {
  data: CourtReportData;
}

const CourtReportPreview = ({ data }: CourtReportPreviewProps) => {
  const resolveValue = (value?: string | null, isDate = false) => {
    if (isDate) {
      const formatted = formatDateForDisplay(value);
      return formatted ? formatted : 'Not provided';
    }
    return getDisplayValue(value);
  };

  const sectionClass = 'rounded-2xl border border-red-100 shadow-sm overflow-hidden bg-white';
  const fieldValueClass = 'min-h-[48px] whitespace-pre-wrap rounded-md border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed text-slate-800';
  const fieldLabelClass = 'text-xs font-semibold uppercase tracking-wide text-red-600';

  const basicInfoFields = [
    { label: 'Youth Name', value: data.youthName },
    { label: 'Date of Birth', value: data.dateOfBirth },
    { label: 'Case Number', value: data.caseNumber },
    { label: 'Court Date', value: data.courtDate, isDate: true },
    { label: 'Report Date', value: data.reportDate, isDate: true },
    { label: 'Reporting Officer', value: data.reportingOfficer },
  ];

  const sections = [
    {
      title: 'Current Status',
      columns: 2,
      fields: [
        { label: 'Current Placement', value: data.currentPlacement },
        { label: 'Admission Date', value: data.admissionDate, isDate: true },
        { label: 'Length of Stay', value: data.lengthOfStay },
        { label: 'Current Level', value: data.currentLevel },
        { label: 'Legal Status', value: data.legalStatus },
      ],
    },
    {
      title: 'Treatment Goals & Progress',
      columns: 2,
      fields: [
        { label: 'Primary Treatment Goals', value: data.treatmentGoals },
        { label: 'Progress Toward Goals', value: data.goalProgress },
        { label: 'Therapeutic Participation', value: data.therapeuticParticipation },
        { label: 'Medication Compliance', value: data.medicationCompliance },
      ],
    },
    {
      title: 'Behavioral Assessment',
      columns: 2,
      fields: [
        { label: 'Behavioral Progress', value: data.behavioralProgress },
        { label: 'Significant Incidents', value: data.significantIncidents },
        { label: 'Behavioral Interventions', value: data.behavioralInterventions },
        { label: 'Risk Assessment', value: data.riskAssessment },
      ],
    },
    {
      title: 'Educational Progress',
      columns: 2,
      fields: [
        { label: 'School Placement', value: data.schoolPlacement },
        { label: 'Academic Progress', value: data.academicProgress },
        { label: 'Educational Challenges', value: data.educationalChallenges },
        { label: 'Vocational Goals', value: data.vocationalGoals },
      ],
    },
    {
      title: 'Family & Social Relationships',
      columns: 1,
      fields: [
        { label: 'Family Visitation', value: data.familyVisitation },
        { label: 'Family Therapy', value: data.familyTherapy },
        { label: 'Peer Relationships', value: data.peerRelationships },
        { label: 'Community Contacts', value: data.communityContacts },
      ],
    },
    {
      title: 'Program Participation',
      columns: 1,
      fields: [
        { label: 'Daily Structure Compliance', value: data.dailyStructure },
        { label: 'Program Compliance', value: data.programCompliance },
        { label: 'Skills Development', value: data.skillsDevelopment },
        { label: 'Incentives and Consequences', value: data.incentivesEarned },
      ],
    },
    {
      title: 'Future Planning',
      columns: 1,
      fields: [
        { label: 'Discharge Timeline', value: data.dischargeTimeline },
        { label: 'Discharge Planning', value: data.dischargePlanning },
        { label: 'Aftercare Recommendations', value: data.aftercareRecommendations },
        { label: 'Transition Plan', value: data.transitionPlan },
      ],
    },
  ];

  const summaryFields = [
    { label: 'Overall Assessment', value: data.overallAssessment },
    { label: 'Court Recommendations', value: data.courtRecommendations },
    { label: 'Additional Comments', value: data.additionalComments },
  ];

  return (
    <div className="print-container space-y-6">
      <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-xl print:shadow-none">
        <div className="bg-gradient-to-r from-red-900 via-red-700 to-amber-600 px-8 py-10 text-center text-white">
          <img
            src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`}
            alt="Heartland Boys Home Logo"
            className="mx-auto mb-6 h-20 w-auto object-contain"
          />
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Heartland Boys Home</p>
          <h1 className="mt-3 text-4xl font-black tracking-wide">Court Report</h1>
          <p className="mt-2 text-sm font-medium text-amber-100/90">
            Comprehensive status update for court review
          </p>
        </div>

        <div className="space-y-8 px-8 py-8">
          <section className={sectionClass}>
            <div className="bg-red-50 px-6 py-4">
              <h2 className="text-lg font-semibold text-red-800">Basic Information</h2>
            </div>
            <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
              {basicInfoFields.map((field) => (
                <div key={field.label} className="space-y-2">
                  <span className={fieldLabelClass}>{field.label}</span>
                  <p className={fieldValueClass}>{resolveValue(field.value, field.isDate)}</p>
                </div>
              ))}
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.title} className={sectionClass}>
              <div className="bg-red-50 px-6 py-4">
                <h3 className="text-lg font-semibold text-red-800">{section.title}</h3>
              </div>
              <div
                className={`px-6 py-6 grid gap-4 ${
                  section.columns === 2 ? 'md:grid-cols-2' : 'grid-cols-1'
                }`}
              >
                {section.fields.map((field) => (
                  <div key={field.label} className="space-y-2">
                    <span className={fieldLabelClass}>{field.label}</span>
                    <p className={fieldValueClass}>{resolveValue(field.value, field.isDate)}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section className={sectionClass}>
            <div className="bg-red-50 px-6 py-4">
              <h3 className="text-lg font-semibold text-red-800">Summary & Recommendations</h3>
            </div>
            <div className="space-y-4 px-6 py-6">
              {summaryFields.map((field) => (
                <div key={field.label} className="space-y-2">
                  <span className={fieldLabelClass}>{field.label}</span>
                  <p className={fieldValueClass}>{resolveValue(field.value)}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col items-start gap-1 border-t border-red-100 pt-6 text-xs text-slate-500">
            <span>Court report generated on {format(new Date(), 'MMMM d, yyyy')}.</span>
            <span>
              For questions regarding this report, please contact Heartland Boys Home Treatment Team.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CourtReport = ({ youth }: CourtReportProps) => {
  const [reportData, setReportData] = useState<CourtReportData>({
    youthName: youth ? `${youth.firstName} ${youth.lastName}` : '',
    dateOfBirth: youth?.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
    caseNumber: '',
    courtDate: '',
    reportDate: format(new Date(), 'yyyy-MM-dd'),
    reportingOfficer: '',
    
    currentPlacement: 'Heartland Boys Home - Residential Treatment',
    admissionDate: youth?.admissionDate ? format(new Date(youth.admissionDate), 'MM/dd/yyyy') : '',
    lengthOfStay: '',
    currentLevel: youth?.level ? `Level ${youth.level}` : '',
    legalStatus: '',
    
    treatmentGoals: '',
    goalProgress: '',
    therapeuticParticipation: '',
    medicationCompliance: '',
    
    behavioralProgress: '',
    significantIncidents: '',
    behavioralInterventions: '',
    riskAssessment: '',
    
    schoolPlacement: youth?.currentSchool || '',
    academicProgress: '',
    educationalChallenges: '',
    vocationalGoals: '',
    
    familyVisitation: '',
    familyTherapy: '',
    peerRelationships: '',
    communityContacts: '',
    
    dailyStructure: '',
    programCompliance: '',
    skillsDevelopment: '',
    incentivesEarned: '',
    
    dischargeTimeline: '',
    dischargePlanning: '',
    aftercareRecommendations: '',
    transitionPlan: '',
    
    overallAssessment: '',
    courtRecommendations: '',
    additionalComments: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Sync report data when youth changes or saved data exists
  useEffect(() => {
    if (!youth) {
      return;
    }

    const baseData: Partial<CourtReportData> = {
      youthName: `${youth.firstName} ${youth.lastName}`,
      dateOfBirth: youth.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
      admissionDate: youth.admissionDate ? format(new Date(youth.admissionDate), 'MM/dd/yyyy') : '',
      currentLevel: youth.level ? `Level ${youth.level}` : '',
      schoolPlacement: youth.currentSchool || '',
    };

    const savedData = localStorage.getItem(`court-report-${youth.id}`);

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setReportData(prev => ({ ...prev, ...baseData, ...parsed }));
        return;
      } catch (error) {
        console.error('Error loading saved court report data:', error);
      }
    }

    setReportData(prev => ({ ...prev, ...baseData }));
  }, [youth]);

  const handleInputChange = (field: keyof CourtReportData, value: string) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!youth) {
      toast({
        title: "Error",
        description: "No youth selected for report",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      localStorage.setItem(`court-report-${youth.id}`, JSON.stringify(reportData));
      
      toast({
        title: "Report Saved",
        description: "Court report has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Save Error",
        description: "Failed to save the report",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    
    setIsExporting(true);
    try {
      const filename = `${reportData.youthName.replace(/\s+/g, '_')}_Court_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      await exportElementToPDF(printRef.current, filename);
      
      toast({
        title: "Export Successful",
        description: "Court Report PDF has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export PDF",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    if (!printRef.current) return;
    
    setIsExporting(true);
    try {
      const filename = `${reportData.youthName.replace(/\s+/g, '_')}_Court_Report_${format(new Date(), 'yyyy-MM-dd')}.docx`;
      await exportElementToDocx(printRef.current, filename);
      
      toast({
        title: "Export Successful",
        description: "Court Report DOCX has been downloaded",
      });
    } catch (error) {
      toast({
        title: "Export Error",
        description: "Failed to export DOCX",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all form data? This action cannot be undone.')) {
      setReportData({
        youthName: youth ? `${youth.firstName} ${youth.lastName}` : '',
        dateOfBirth: youth?.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
        caseNumber: '',
        courtDate: '',
        reportDate: format(new Date(), 'yyyy-MM-dd'),
        reportingOfficer: '',
        
        currentPlacement: 'Heartland Boys Home - Residential Treatment',
        admissionDate: youth?.admissionDate ? format(new Date(youth.admissionDate), 'MM/dd/yyyy') : '',
        lengthOfStay: '',
        currentLevel: youth?.level ? `Level ${youth.level}` : '',
        legalStatus: '',
        
        treatmentGoals: '',
        goalProgress: '',
        therapeuticParticipation: '',
        medicationCompliance: '',
        
        behavioralProgress: '',
        significantIncidents: '',
        behavioralInterventions: '',
        riskAssessment: '',
        
        schoolPlacement: youth?.currentSchool || '',
        academicProgress: '',
        educationalChallenges: '',
        vocationalGoals: '',
        
        familyVisitation: '',
        familyTherapy: '',
        peerRelationships: '',
        communityContacts: '',
        
        dailyStructure: '',
        programCompliance: '',
        skillsDevelopment: '',
        incentivesEarned: '',
        
        dischargeTimeline: '',
        dischargePlanning: '',
        aftercareRecommendations: '',
        transitionPlan: '',
        
        overallAssessment: '',
        courtRecommendations: '',
        additionalComments: ''
      });
      
      if (youth) {
        localStorage.removeItem(`court-report-${youth.id}`);
      }
      
      toast({
        title: "Form Reset",
        description: "All form data has been cleared",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="no-print">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Gavel className="h-5 w-5" />
              Court Report
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDOCX}
                disabled={isExporting}
              >
                <FileDown className="mr-2 h-4 w-4" />
                Export DOCX
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="text-red-600 hover:text-red-700"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Print adjustments */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body { background: #fff !important; }
              .no-print { display: none !important; }
              .print-root { display: block !important; }
              .print-container { padding: 0 !important; }
              .print-container * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `,
        }}
      />

      {/* Report editing form and printable preview */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start">
        <div className="no-print rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-6 bg-gradient-to-r from-red-800 via-red-700 to-amber-600 text-white p-6 rounded-lg">
          <img 
            src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`} 
            alt="Heartland Boys Home Logo" 
            className="h-16 mx-auto mb-4 object-contain" 
          />
          <h1 className="text-3xl font-bold mb-2">Heartland Boys Home</h1>
          <h2 className="text-xl font-semibold">Court Report</h2>
        </div>

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="youthName">Youth Name</Label>
            <Input
              id="youthName"
              value={reportData.youthName}
              onChange={(e) => handleInputChange('youthName', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              value={reportData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="caseNumber">Case Number</Label>
            <Input
              id="caseNumber"
              value={reportData.caseNumber}
              onChange={(e) => handleInputChange('caseNumber', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="courtDate">Court Date</Label>
            <Input
              id="courtDate"
              type="date"
              value={reportData.courtDate}
              onChange={(e) => handleInputChange('courtDate', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="reportDate">Report Date</Label>
            <Input
              id="reportDate"
              type="date"
              value={reportData.reportDate}
              onChange={(e) => handleInputChange('reportDate', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="reportingOfficer">Reporting Officer</Label>
            <Input
              id="reportingOfficer"
              value={reportData.reportingOfficer}
              onChange={(e) => handleInputChange('reportingOfficer', e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        {/* Current Status */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Current Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currentPlacement">Current Placement</Label>
              <Input
                id="currentPlacement"
                value={reportData.currentPlacement}
                onChange={(e) => handleInputChange('currentPlacement', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="admissionDate">Admission Date</Label>
              <Input
                id="admissionDate"
                value={reportData.admissionDate}
                onChange={(e) => handleInputChange('admissionDate', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lengthOfStay">Length of Stay</Label>
              <Input
                id="lengthOfStay"
                value={reportData.lengthOfStay}
                onChange={(e) => handleInputChange('lengthOfStay', e.target.value)}
                className="mt-1"
                placeholder="e.g., 6 months"
              />
            </div>
            <div>
              <Label htmlFor="currentLevel">Current Level</Label>
              <Select value={reportData.currentLevel} onValueChange={(value) => handleInputChange('currentLevel', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Level 1">Level 1</SelectItem>
                  <SelectItem value="Level 2">Level 2</SelectItem>
                  <SelectItem value="Level 3">Level 3</SelectItem>
                  <SelectItem value="Level 4">Level 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="legalStatus">Legal Status</Label>
              <Input
                id="legalStatus"
                value={reportData.legalStatus}
                onChange={(e) => handleInputChange('legalStatus', e.target.value)}
                className="mt-1"
                placeholder="e.g., Court-ordered placement, Voluntary admission"
              />
            </div>
          </div>
        </div>

        {/* Treatment Goals & Progress */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Treatment Goals & Progress</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="treatmentGoals">Treatment Goals</Label>
              <Textarea
                id="treatmentGoals"
                value={reportData.treatmentGoals}
                onChange={(e) => handleInputChange('treatmentGoals', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="List current treatment goals and objectives..."
              />
            </div>
            <div>
              <Label htmlFor="goalProgress">Progress Toward Goals</Label>
              <Textarea
                id="goalProgress"
                value={reportData.goalProgress}
                onChange={(e) => handleInputChange('goalProgress', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe progress made toward treatment goals..."
              />
            </div>
            <div>
              <Label htmlFor="therapeuticParticipation">Therapeutic Participation</Label>
              <Textarea
                id="therapeuticParticipation"
                value={reportData.therapeuticParticipation}
                onChange={(e) => handleInputChange('therapeuticParticipation', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe participation in individual and group therapy..."
              />
            </div>
            <div>
              <Label htmlFor="medicationCompliance">Medication Compliance</Label>
              <Textarea
                id="medicationCompliance"
                value={reportData.medicationCompliance}
                onChange={(e) => handleInputChange('medicationCompliance', e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Describe medication compliance and any issues..."
              />
            </div>
          </div>
        </div>

        {/* Behavioral Assessment */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Behavioral Assessment</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="behavioralProgress">Behavioral Progress</Label>
              <Textarea
                id="behavioralProgress"
                value={reportData.behavioralProgress}
                onChange={(e) => handleInputChange('behavioralProgress', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe behavioral improvements and challenges..."
              />
            </div>
            <div>
              <Label htmlFor="significantIncidents">Significant Incidents</Label>
              <Textarea
                id="significantIncidents"
                value={reportData.significantIncidents}
                onChange={(e) => handleInputChange('significantIncidents', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Document any significant behavioral incidents..."
              />
            </div>
            <div>
              <Label htmlFor="behavioralInterventions">Behavioral Interventions</Label>
              <Textarea
                id="behavioralInterventions"
                value={reportData.behavioralInterventions}
                onChange={(e) => handleInputChange('behavioralInterventions', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe interventions and strategies used..."
              />
            </div>
            <div>
              <Label htmlFor="riskAssessment">Risk Assessment</Label>
              <Textarea
                id="riskAssessment"
                value={reportData.riskAssessment}
                onChange={(e) => handleInputChange('riskAssessment', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Assess current risk level and safety concerns..."
              />
            </div>
          </div>
        </div>

        {/* Educational Progress */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Educational Progress</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="schoolPlacement">School Placement</Label>
              <Input
                id="schoolPlacement"
                value={reportData.schoolPlacement}
                onChange={(e) => handleInputChange('schoolPlacement', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="academicProgress">Academic Progress</Label>
              <Textarea
                id="academicProgress"
                value={reportData.academicProgress}
                onChange={(e) => handleInputChange('academicProgress', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe academic achievements and progress..."
              />
            </div>
            <div>
              <Label htmlFor="educationalChallenges">Educational Challenges</Label>
              <Textarea
                id="educationalChallenges"
                value={reportData.educationalChallenges}
                onChange={(e) => handleInputChange('educationalChallenges', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe any educational challenges or needs..."
              />
            </div>
            <div>
              <Label htmlFor="vocationalGoals">Vocational Goals</Label>
              <Textarea
                id="vocationalGoals"
                value={reportData.vocationalGoals}
                onChange={(e) => handleInputChange('vocationalGoals', e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Describe vocational training and career goals..."
              />
            </div>
          </div>
        </div>

        {/* Family & Social Relationships */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Family & Social Relationships</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="familyVisitation">Family Visitation</Label>
              <Textarea
                id="familyVisitation"
                value={reportData.familyVisitation}
                onChange={(e) => handleInputChange('familyVisitation', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe family visits and contact..."
              />
            </div>
            <div>
              <Label htmlFor="familyTherapy">Family Therapy</Label>
              <Textarea
                id="familyTherapy"
                value={reportData.familyTherapy}
                onChange={(e) => handleInputChange('familyTherapy', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe family therapy participation and progress..."
              />
            </div>
            <div>
              <Label htmlFor="peerRelationships">Peer Relationships</Label>
              <Textarea
                id="peerRelationships"
                value={reportData.peerRelationships}
                onChange={(e) => handleInputChange('peerRelationships', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe relationships with peers..."
              />
            </div>
            <div>
              <Label htmlFor="communityContacts">Community Contacts</Label>
              <Textarea
                id="communityContacts"
                value={reportData.communityContacts}
                onChange={(e) => handleInputChange('communityContacts', e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Describe community involvement and contacts..."
              />
            </div>
          </div>
        </div>

        {/* Program Participation */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Program Participation</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dailyStructure">Daily Structure Compliance</Label>
              <Textarea
                id="dailyStructure"
                value={reportData.dailyStructure}
                onChange={(e) => handleInputChange('dailyStructure', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe adherence to daily schedule and structure..."
              />
            </div>
            <div>
              <Label htmlFor="programCompliance">Program Compliance</Label>
              <Textarea
                id="programCompliance"
                value={reportData.programCompliance}
                onChange={(e) => handleInputChange('programCompliance', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe overall program compliance and participation..."
              />
            </div>
            <div>
              <Label htmlFor="skillsDevelopment">Skills Development</Label>
              <Textarea
                id="skillsDevelopment"
                value={reportData.skillsDevelopment}
                onChange={(e) => handleInputChange('skillsDevelopment', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe life skills and social skills development..."
              />
            </div>
            <div>
              <Label htmlFor="incentivesEarned">Incentives and Consequences</Label>
              <Textarea
                id="incentivesEarned"
                value={reportData.incentivesEarned}
                onChange={(e) => handleInputChange('incentivesEarned', e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Describe incentives earned and consequences received..."
              />
            </div>
          </div>
        </div>

        {/* Future Planning */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Future Planning</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="dischargeTimeline">Discharge Timeline</Label>
              <Textarea
                id="dischargeTimeline"
                value={reportData.dischargeTimeline}
                onChange={(e) => handleInputChange('dischargeTimeline', e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Projected discharge timeline and criteria..."
              />
            </div>
            <div>
              <Label htmlFor="dischargePlanning">Discharge Planning</Label>
              <Textarea
                id="dischargePlanning"
                value={reportData.dischargePlanning}
                onChange={(e) => handleInputChange('dischargePlanning', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe discharge planning activities..."
              />
            </div>
            <div>
              <Label htmlFor="aftercareRecommendations">Aftercare Recommendations</Label>
              <Textarea
                id="aftercareRecommendations"
                value={reportData.aftercareRecommendations}
                onChange={(e) => handleInputChange('aftercareRecommendations', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Recommend aftercare services and supports..."
              />
            </div>
            <div>
              <Label htmlFor="transitionPlan">Transition Plan</Label>
              <Textarea
                id="transitionPlan"
                value={reportData.transitionPlan}
                onChange={(e) => handleInputChange('transitionPlan', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Describe transition plan to next level of care..."
              />
            </div>
          </div>
        </div>

        {/* Summary & Recommendations */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Summary & Recommendations</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="overallAssessment">Overall Assessment</Label>
              <Textarea
                id="overallAssessment"
                value={reportData.overallAssessment}
                onChange={(e) => handleInputChange('overallAssessment', e.target.value)}
                rows={4}
                className="mt-1"
                placeholder="Provide an overall assessment of progress and current status..."
              />
            </div>
            <div>
              <Label htmlFor="courtRecommendations">Recommendations to the Court</Label>
              <Textarea
                id="courtRecommendations"
                value={reportData.courtRecommendations}
                onChange={(e) => handleInputChange('courtRecommendations', e.target.value)}
                rows={4}
                className="mt-1"
                placeholder="Provide specific recommendations to the court..."
              />
            </div>
            <div>
              <Label htmlFor="additionalComments">Additional Comments</Label>
              <Textarea
                id="additionalComments"
                value={reportData.additionalComments}
                onChange={(e) => handleInputChange('additionalComments', e.target.value)}
                rows={3}
                className="mt-1"
                placeholder="Any additional comments or information..."
              />
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-8 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="border-b border-gray-400 mb-2 h-8"></div>
              <p className="text-sm">Reporting Officer Signature</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-2 h-8"></div>
              <p className="text-sm">Date</p>
            </div>
          </div>
        </div>
      </div>
      <div ref={printRef} className="print-root print-container">
        <CourtReportPreview data={reportData} />
      </div>
      </div>
    </div>
  );
};
