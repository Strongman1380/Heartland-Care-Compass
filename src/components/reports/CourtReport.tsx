import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Youth } from "@/types/app-types";
import { Save, Printer, RotateCcw, Gavel, Eye, Sparkles } from "lucide-react";
import { format, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { draftsService } from '@/integrations/supabase/draftsService'
import { useAuth } from '@/contexts/SupabaseAuthContext'
import { getBehaviorPointsByYouth, getProgressNotesByYouth } from "@/lib/api";

interface CourtReportProps {
  youth?: Youth;
}

interface CourtReportData {
  // Header Information
  youthName: string;
  dateOfBirth: string;
  reportDate: string;
  reportingOfficer: string;

  // Current Status
  currentPlacement: string;
  
  // Treatment Goals & Progress
  treatmentGoals: string;
  goalProgress: string;
  therapeuticParticipation: string;
  medicationCompliance: string;
  
  // Behavioral Assessment
  behavioralProgress: string;
  significantIncidents: string;
  behavioralInterventions: string;
  
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

const getCourtHeaderDetail = (reportDate?: string) => {
  const formattedReport = formatDateForDisplay(reportDate);
  if (formattedReport) {
    return `Report Date: ${formattedReport}`;
  }

  return undefined;
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

  const sectionClass = 'bg-white/95 rounded-2xl border border-red-100 shadow-sm px-8 py-6 space-y-4 print:bg-white print:shadow-none print:border print:border-gray-300 print:rounded-lg print:px-6 print:py-4 print:mb-4';
  const sectionBreakStyle: CSSProperties = {
    breakInside: 'avoid',
    pageBreakInside: 'avoid',
    WebkitColumnBreakInside: 'avoid',
    WebkitPageBreakInside: 'avoid',
    MozPageBreakInside: 'avoid'
  };
  const sectionHeaderClass = 'border-b border-red-100 pb-3 print:border-b-2 print:border-gray-700 print:pb-2 print:mb-3';
  const fieldLabelClass = 'text-xs font-semibold uppercase tracking-wide text-red-700 print:text-gray-700 print:text-sm';
  const fieldValueClass = 'text-base text-slate-800 whitespace-pre-wrap leading-relaxed print:text-gray-900 print:text-sm print:leading-normal';

  const renderField = (field: { label: string; value?: string | null; isDate?: boolean }) => (
    <div key={field.label} className="space-y-1">
      <span className={fieldLabelClass}>{field.label}</span>
      <p className={fieldValueClass}>{resolveValue(field.value, field.isDate)}</p>
    </div>
  );

  const basicInfoFields = [
    { label: 'Youth Name', value: data.youthName },
    { label: 'Date of Birth', value: data.dateOfBirth },
    { label: 'Report Date', value: data.reportDate, isDate: true },
    { label: 'Reporting Officer', value: data.reportingOfficer },
  ];

  const sections = [
    {
      title: 'Current Placement',
      columns: 1,
      fields: [
        { label: 'Current Placement', value: data.currentPlacement },
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
    <div className="print-container space-y-6 text-slate-900 print:space-y-0">
      <div className="overflow-hidden rounded-3xl border border-red-200 bg-white shadow-xl print:shadow-none print:border-0 print:rounded-none">
        <div className="px-8 pt-8 print:px-0 print:pt-0">
          <ReportHeader
            subtitle="Court Report"
            detail={getCourtHeaderDetail(data.reportDate)}
            className="mb-0 print:mb-6"
          />
        </div>

        <div className="px-8 pb-10 space-y-8 text-base leading-relaxed print:px-0 print:pb-0 print:space-y-4">
          <section className={sectionClass} style={sectionBreakStyle}>
            <header className={sectionHeaderClass}>
              <h2 className="text-lg font-semibold text-red-800 print:text-gray-900 print:text-base">Basic Information</h2>
            </header>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 print:gap-y-2">
              {basicInfoFields.map(renderField)}
            </div>
          </section>

          {sections.map((section) => (
            <section key={section.title} className={sectionClass} style={sectionBreakStyle}>
              <header className={sectionHeaderClass}>
                <h3 className="text-lg font-semibold text-red-800 print:text-gray-900 print:text-base">{section.title}</h3>
                {section.description && (
                  <p className="text-sm text-slate-600 print:text-gray-600">{section.description}</p>
                )}
              </header>
              <div className={section.columns === 2 ? "grid grid-cols-2 gap-x-8 gap-y-3 print:gap-y-2" : "space-y-3 print:space-y-2"}>
                {section.fields.map(renderField)}
              </div>
            </section>
          ))}

          <section className={sectionClass} style={sectionBreakStyle}>
            <header className={sectionHeaderClass}>
              <h3 className="text-lg font-semibold text-red-800 print:text-gray-900 print:text-base">Summary & Recommendations</h3>
            </header>
            <div className="space-y-3 print:space-y-2">
              {summaryFields.map(renderField)}
            </div>
          </section>

          <section className={sectionClass} style={sectionBreakStyle}>
            <header className={sectionHeaderClass}>
              <h3 className="text-lg font-semibold text-red-800 print:text-gray-900 print:text-base">Signatures</h3>
            </header>
            <div className="grid gap-6 md:grid-cols-2 print:gap-4 print:mt-4">
              <div className="space-y-2">
                <span className={fieldLabelClass}>Reporting Officer</span>
                <div className="h-10 border-b-2 border-slate-400 print:border-gray-700" />
              </div>
              <div className="space-y-2">
                <span className={fieldLabelClass}>Date</span>
                <div className="h-10 border-b-2 border-slate-400 print:border-gray-700" />
              </div>
            </div>
          </section>

          <p className="text-sm text-slate-500 print:text-gray-600 print:text-xs print:mt-6 print:text-center">
            Prepared on {format(new Date(), 'MMMM d, yyyy')} • Heartland Boys Home Treatment Team
          </p>
        </div>
      </div>
    </div>
  );
};

export const CourtReport = ({ youth }: CourtReportProps) => {
  const [reportData, setReportData] = useState<CourtReportData>({
    youthName: youth ? `${youth.firstName} ${youth.lastName}` : '',
    dateOfBirth: youth?.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
    reportDate: format(new Date(), 'yyyy-MM-dd'),
    reportingOfficer: '',

    currentPlacement: 'Heartland Boys Home - Residential Treatment',
    
    treatmentGoals: '',
    goalProgress: '',
    therapeuticParticipation: '',
    medicationCompliance: '',
    
    behavioralProgress: '',
    significantIncidents: '',
    behavioralInterventions: '',
    
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
  const [showPreview, setShowPreview] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const autoSaveTimerRef = useRef<number | null>(null);
  const pendingYouthIdRef = useRef<string | null>(null);
  const pendingReportTypeRef = useRef<string>('court_report');
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Calculate length of stay
  const calculateLengthOfStay = (admissionDate?: Date | null): string => {
    if (!admissionDate) return '';
    const admission = new Date(admissionDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - admission.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    
    if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
    }
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Sync report data when youth changes or saved data exists
  useEffect(() => {
    if (!youth) {
      return;
    }

    // Auto-populate from youth profile - but only for empty fields
    const getBaseDataIfEmpty = (existingData: CourtReportData): Partial<CourtReportData> => {
      const result: Partial<CourtReportData> = {};

      // Always update basic info that should stay in sync with youth profile
      result.youthName = `${youth.firstName} ${youth.lastName}`;
      result.dateOfBirth = youth.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '';
      result.currentPlacement = existingData.currentPlacement || 'Heartland Boys Home - Residential Treatment';

      // Only populate these if they're currently empty
      if (!existingData.schoolPlacement && youth.currentSchool) {
        result.schoolPlacement = youth.currentSchool;
      }
      if (!existingData.academicProgress && youth.academicStrengths) {
        result.academicProgress = `Strengths: ${youth.academicStrengths}`;
      }
      if (!existingData.educationalChallenges && youth.academicChallenges) {
        result.educationalChallenges = youth.academicChallenges;
      }
      if (!existingData.vocationalGoals && youth.educationGoals) {
        result.vocationalGoals = youth.educationGoals;
      }
      if (!existingData.medicationCompliance && youth.currentMedications) {
        result.medicationCompliance = `Current medications: ${youth.currentMedications}`;
      }
      if (!existingData.treatmentGoals && youth.currentDiagnoses) {
        result.treatmentGoals = `Diagnoses: ${youth.currentDiagnoses}`;
      }
      if (!existingData.familyVisitation && (youth.mother?.name || youth.father?.name)) {
        result.familyVisitation = `Mother: ${youth.mother?.name || 'N/A'}, Father: ${youth.father?.name || 'N/A'}`;
      }
      if (!existingData.behavioralProgress && youth.strengthsTalents) {
        result.behavioralProgress = `Strengths: ${youth.strengthsTalents}`;
      }
      if (!existingData.dischargePlanning && (youth.dischargePlan?.parents || youth.dischargePlan?.relative?.name)) {
        result.dischargePlanning = `Planned discharge to: ${youth.dischargePlan.parents || youth.dischargePlan.relative?.name}`;
      }
      if (!existingData.dischargeTimeline && youth.dischargePlan?.estimatedLengthOfStayMonths) {
        result.dischargeTimeline = `Estimated ${youth.dischargePlan.estimatedLengthOfStayMonths} months`;
      }

      return result;
    };

    (async () => {
      // Try Supabase draft first
      try {
        const draft = await draftsService.get(youth.id, 'court_report', user?.id || null)
        if (draft?.data) {
          const savedData = draft.data as CourtReportData;
          const baseData = getBaseDataIfEmpty(savedData);
          // Saved data takes priority, baseData only fills empty fields
          setReportData(prev => ({ ...prev, ...baseData, ...savedData }));
          setAutoSaveStatus('saved');
          return;
        }
      } catch {}

      const savedDataStr = localStorage.getItem(`court-report-${youth.id}`);
      if (savedDataStr) {
        try {
          const savedData = JSON.parse(savedDataStr) as CourtReportData;
          const baseData = getBaseDataIfEmpty(savedData);
          // Saved data takes priority, baseData only fills empty fields
          setReportData(prev => ({ ...prev, ...baseData, ...savedData }));
          return;
        } catch (error) {
          console.error('Error loading saved court report data:', error);
        }
      }

      // No saved data, use base data for initial population
      const baseData = getBaseDataIfEmpty(reportData);
      setReportData(prev => ({ ...prev, ...baseData }));
    })();
  }, [youth, user?.id]);

  const handleInputChange = (field: keyof CourtReportData, value: string) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const persistDraft = useCallback(
    async (data: CourtReportData, youthId: string, authorId: string | null) => {
      if (!youthId) {
        // Supabase table requires youth context, so skip remote draft when missing
        localStorage.setItem('court-report-user-only', JSON.stringify(data));
        return;
      }

      // Save to localStorage first (always works)
      localStorage.setItem(`court-report-${youthId}`, JSON.stringify(data));

      // Try to save to Supabase (best effort)
      try {
        await draftsService.save(youthId, pendingReportTypeRef.current, authorId, data);
      } catch (error) {
        // Supabase save failed, but localStorage succeeded
        console.warn('Supabase save failed, data saved locally only:', error);
      }
    },
    []
  );

  useEffect(() => {
    if (!youth) {
      return;
    }

    // Identify context for any pending autosave operations
    pendingYouthIdRef.current = youth.id;
    pendingReportTypeRef.current = 'court_report';

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      if (!pendingYouthIdRef.current) {
        return;
      }

      setAutoSaveStatus('saving');
      try {
        await persistDraft(reportData, pendingYouthIdRef.current, user?.id || null);
        setAutoSaveStatus('saved');
      } catch (error) {
        console.error('Autosave failed:', error);
        setAutoSaveStatus('error');
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [reportData, youth, user?.id, persistDraft]);

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
    setAutoSaveStatus('saving');

    // persistDraft now handles errors internally and always saves to localStorage
    await persistDraft(reportData, youth.id, user?.id || null);

    setAutoSaveStatus('saved');
    setIsSaving(false);

    toast({
      title: "Report Saved",
      description: "Court report has been saved successfully",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAutoPopulate = async () => {
    if (!youth) {
      toast({
        title: "Error",
        description: "No youth selected",
        variant: "destructive"
      });
      return;
    }

    // Check if any behavioral fields already have data
    const hasExistingData = !!(
      reportData.behavioralProgress ||
      reportData.significantIncidents ||
      reportData.goalProgress ||
      reportData.programCompliance
    );

    if (hasExistingData) {
      const confirmed = confirm(
        'Some fields already contain data. Auto-populate will only update empty fields. Continue?'
      );
      if (!confirmed) return;
    }

    try {
      // Fetch recent behavior points and progress notes
      const [behaviorPoints, progressNotes] = await Promise.all([
        getBehaviorPointsByYouth(youth.id),
        getProgressNotesByYouth(youth.id)
      ]);

      // Filter to last 30 days
      const thirtyDaysAgo = subMonths(new Date(), 1);
      const recentBehavior = behaviorPoints.filter(bp =>
        bp.date && new Date(bp.date) >= thirtyDaysAgo
      );
      const recentNotes = progressNotes.filter(note =>
        note.date && new Date(note.date) >= thirtyDaysAgo
      );

      // Calculate average behavior points
      const avgPoints = recentBehavior.length > 0
        ? recentBehavior.reduce((sum, bp) => sum + (bp.totalPoints ?? 0), 0) / recentBehavior.length
        : 0;

      // Build behavioral progress summary
      let behavioralSummary = `Average daily points over last 30 days: ${avgPoints.toFixed(1)}/15. `;
      if (avgPoints >= 12) {
        behavioralSummary += "Demonstrates consistent positive behavior and engagement.";
      } else if (avgPoints >= 9) {
        behavioralSummary += "Shows moderate progress with some behavioral challenges.";
      } else {
        behavioralSummary += "Continues to work on behavioral goals with staff support.";
      }

      // Extract significant incidents from notes
      const incidentNotes = recentNotes.filter(note =>
        note.note?.toLowerCase().includes('incident') ||
        note.note?.toLowerCase().includes('altercation') ||
        note.note?.toLowerCase().includes('conflict')
      );
      const significantIncidents = incidentNotes.length > 0
        ? `${incidentNotes.length} incident(s) documented in the past 30 days. ` +
          incidentNotes.slice(0, 3).map(n => n.note).join(' ')
        : 'No significant behavioral incidents reported in the past 30 days.';

      // Extract positive progress from notes
      const positiveNotes = recentNotes.filter(note =>
        note.note?.toLowerCase().includes('progress') ||
        note.note?.toLowerCase().includes('improvement') ||
        note.note?.toLowerCase().includes('positive')
      );
      const goalProgress = positiveNotes.length > 0
        ? positiveNotes.slice(0, 3).map(n => n.note).join(' ')
        : 'Youth continues to work toward treatment goals.';

      const programCompliance = `Current level: ${youth.level}. ${avgPoints >= 10 ? 'Consistently meets program expectations.' : 'Working to improve program compliance.'}`;

      // Only update empty fields
      setReportData(prev => ({
        ...prev,
        behavioralProgress: prev.behavioralProgress || behavioralSummary,
        significantIncidents: prev.significantIncidents || significantIncidents,
        goalProgress: prev.goalProgress || goalProgress,
        programCompliance: prev.programCompliance || programCompliance,
      }));

      toast({
        title: "Data Auto-Populated",
        description: "Empty fields have been filled with recent behavioral and progress data",
      });
    } catch (error) {
      console.error('Error auto-populating data:', error);
      toast({
        title: "Error",
        description: "Failed to auto-populate data",
        variant: "destructive"
      });
    }
  };

  const handleReset = async () => {
    if (!youth) {
      toast({
        title: "Error",
        description: "No youth selected for report",
        variant: "destructive"
      });
      return;
    }

    if (confirm('Are you sure you want to reset all form data? This action cannot be undone.')) {
      const emptyData: CourtReportData = {
        youthName: youth ? `${youth.firstName} ${youth.lastName}` : '',
        dateOfBirth: youth?.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
        reportDate: format(new Date(), 'yyyy-MM-dd'),
        reportingOfficer: '',

        currentPlacement: 'Heartland Boys Home - Residential Treatment',
        
        treatmentGoals: '',
        goalProgress: '',
        therapeuticParticipation: '',
        medicationCompliance: '',
        
        behavioralProgress: '',
        significantIncidents: '',
        behavioralInterventions: '',
        
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
      };

      setReportData(emptyData);

      try {
        await draftsService.delete(youth.id, 'court_report', user?.id || null);
      } catch (error) {
        console.error('Failed to remove saved draft:', error);
      }

      localStorage.removeItem(`court-report-${youth.id}`);
      setAutoSaveStatus('idle');

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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5" />
                Court Report
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Use Auto-Populate to fill behavioral and progress data from the last 30 days
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${
                    autoSaveStatus === 'saving'
                      ? 'bg-amber-500 animate-pulse'
                      : autoSaveStatus === 'saved'
                        ? 'bg-emerald-500'
                        : autoSaveStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-slate-300'
                  }`} />
                  {autoSaveStatus === 'saving' && 'Autosaving…'}
                  {autoSaveStatus === 'saved' && 'All changes saved'}
                  {autoSaveStatus === 'error' && 'Autosave failed — last changes not saved'}
                  {autoSaveStatus === 'idle' && 'Waiting for changes'}
                </span>
                {autoSaveStatus === 'error' && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto px-0 text-xs"
                    onClick={async () => {
                      if (!youth) return;
                      setAutoSaveStatus('saving');
                      try {
                        await persistDraft(reportData, youth.id, user?.id || null);
                        setAutoSaveStatus('saved');
                        toast({
                          title: "Retry Successful",
                          description: "Draft was saved after retry",
                        });
                      } catch (retryError) {
                        console.error('Retry save failed:', retryError);
                        setAutoSaveStatus('error');
                        toast({
                          title: "Retry Failed",
                          description: "Could not save the draft. Please try again.",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    Retry now
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleAutoPopulate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-Populate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
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
                onClick={handlePrint}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Report
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
              @page {
                margin: 0.75in;
                size: letter;
              }

              body {
                background: #fff !important;
                margin: 0;
                padding: 0;
              }

              .no-print {
                display: none !important;
              }

              .print-root {
                display: block !important;
              }

              .print-container {
                padding: 0 !important;
                max-width: 100% !important;
              }

              .print-container * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
                break-after: avoid;
              }

              img {
                page-break-inside: avoid;
                break-inside: avoid;
              }
            }
          `,
        }}
      />

      {/* Report editing form */}
      <div className="max-w-5xl mx-auto">
        <div className="no-print rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
        {/* Header */}
        <ReportHeader
          subtitle="Court Report"
          detail={getCourtHeaderDetail(reportData.reportDate)}
          className="mb-6"
        />

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

        {/* Current Placement */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Current Placement</h3>
          <div>
            <Label htmlFor="currentPlacement">Current Placement</Label>
            <Input
              id="currentPlacement"
              value={reportData.currentPlacement}
              onChange={(e) => handleInputChange('currentPlacement', e.target.value)}
              className="mt-1"
            />
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
      
      {/* Preview section - shown when user clicks Preview button */}
      {showPreview && (
        <div className="max-w-5xl mx-auto mt-6">
          <CourtReportPreview data={reportData} />
        </div>
      )}
      
      {/* Hidden preview for printing/exporting only */}
      <div ref={printRef} className="hidden print:block">
        <CourtReportPreview data={reportData} />
      </div>
      </div>
    </div>
  );
};
