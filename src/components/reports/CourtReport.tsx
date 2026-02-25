import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Youth } from "@/types/app-types";
import { Save, Printer, RotateCcw, Gavel, Eye, Sparkles, CheckCircle2, Circle } from "lucide-react";
import { format, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { draftsService } from '@/integrations/firebase/draftsService'
import { findProfessional } from '@/utils/professionalUtils'
import { useAuth } from '@/contexts/AuthContext'
import { getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { fetchAllProgressNotes } from "@/utils/local-storage-utils";
import { getScoresByYouth, type SchoolDailyScore } from "@/utils/schoolScores";
import { getWeeklyEvalsForYouthInRange, getDailyShiftsForYouthInRange } from "@/utils/shiftScores";
import * as aiService from "@/services/aiService";

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
  
  // Treatment Goals & Progress (consolidated)
  treatmentProgressSummary: string;
  
  // Behavioral Assessment (consolidated)
  behavioralAssessmentSummary: string;
  
  // Educational Progress (consolidated)
  educationalProgressSummary: string;
  
  // Family & Social Relationships (consolidated)
  familySocialSummary: string;
  
  // Program Participation (consolidated)
  programParticipationSummary: string;
  
  // Future Planning (consolidated)
  futurePlanningSummary: string;
  
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
    // @ts-ignore - Vendor prefixes not in standard CSSProperties type
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
      columns: 1,
      fields: [
        { label: 'Treatment Progress Summary', value: data.treatmentProgressSummary },
      ],
    },
    {
      title: 'Behavioral Assessment',
      columns: 1,
      fields: [
        { label: 'Behavioral Assessment Summary', value: data.behavioralAssessmentSummary },
      ],
    },
    {
      title: 'Educational Progress',
      columns: 1,
      fields: [
        { label: 'Educational Progress Summary', value: data.educationalProgressSummary },
      ],
    },
    {
      title: 'Family & Social Relationships',
      columns: 1,
      fields: [
        { label: 'Family & Social Summary', value: data.familySocialSummary },
      ],
    },
    {
      title: 'Program Participation',
      columns: 1,
      fields: [
        { label: 'Program Participation Summary', value: data.programParticipationSummary },
      ],
    },
    {
      title: 'Future Planning',
      columns: 1,
      fields: [
        { label: 'Future Planning Summary', value: data.futurePlanningSummary },
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
  const [activeTab, setActiveTab] = useState<string>("basic-info");
  const [reportData, setReportData] = useState<CourtReportData>({
    youthName: youth ? `${youth.firstName} ${youth.lastName}` : '',
    dateOfBirth: youth?.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
    reportDate: format(new Date(), 'yyyy-MM-dd'),
    reportingOfficer: '',

    currentPlacement: 'Heartland Boys Home - Group Home',

    treatmentProgressSummary: '',
    behavioralAssessmentSummary: '',
    educationalProgressSummary: '',
    familySocialSummary: '',
    programParticipationSummary: '',
    futurePlanningSummary: '',

    overallAssessment: '',
    courtRecommendations: '',
    additionalComments: ''
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shouldAutoPopulate, setShouldAutoPopulate] = useState(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const pendingYouthIdRef = useRef<string | null>(null);
  const pendingReportTypeRef = useRef<string>('court_report');
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Helper function to check if a section is complete
  const isSectionComplete = (section: string): boolean => {
    switch (section) {
      case "basic-info":
        return !!(reportData.youthName && reportData.dateOfBirth && reportData.reportingOfficer);
      case "current-placement":
        return reportData.currentPlacement.length > 20;
      case "treatment":
        return reportData.treatmentProgressSummary.length > 50;
      case "behavioral":
        return reportData.behavioralAssessmentSummary.length > 50;
      case "educational":
        return reportData.educationalProgressSummary.length > 50;
      case "family-social":
        return reportData.familySocialSummary.length > 50;
      case "program":
        return reportData.programParticipationSummary.length > 50;
      case "future":
        return reportData.futurePlanningSummary.length > 50;
      case "summary":
        return !!(reportData.overallAssessment && reportData.courtRecommendations);
      default:
        return false;
    }
  };

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

  const parseCaseNoteJson = (note: any): any | null => {
    if (!note?.note || typeof note.note !== 'string') {
      return null;
    }
    try {
      return JSON.parse(note.note);
    } catch {
      return null;
    }
  };

  const isSchoolCaseNote = (note: any): boolean => {
    const parsed = parseCaseNoteJson(note);
    return parsed?.noteType === 'school';
  };

  const extractCaseNoteContent = (note: any): string => {
    if (!note) return '';
    if (typeof note.summary === 'string' && note.summary.trim().length > 0) {
      return note.summary.trim();
    }
    const raw = typeof note.note === 'string' ? note.note : '';
    if (!raw) return '';
    const parsed = parseCaseNoteJson(note);
    if (parsed?.noteType === 'school' && parsed.sections) {
      const { overview, behavior, academics, interventions, followUp } = parsed.sections;
      const parts: string[] = [];
      if (typeof overview === 'string' && overview.trim()) {
        parts.push(overview.trim());
      }
      if (typeof behavior === 'string' && behavior.trim()) {
        parts.push(`Behavior: ${behavior.trim()}`);
      }
      if (typeof academics === 'string' && academics.trim()) {
        parts.push(`Academics: ${academics.trim()}`);
      }
      if (typeof interventions === 'string' && interventions.trim()) {
        parts.push(`Supports: ${interventions.trim()}`);
      }
      if (typeof followUp === 'string' && followUp.trim()) {
        parts.push(`Follow-up: ${followUp.trim()}`);
      }
      if (parts.length > 0) {
        return parts.join(' ');
      }
    }
    if (parsed?.sections) {
      return Object.values(parsed.sections)
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .join(' ');
    }
    if (typeof parsed?.content === 'string') {
      return parsed.content;
    }
    return raw;
  };

  const buildCaseNoteHighlights = (
    notes: any[],
    limit = 3,
    filter?: (content: string) => boolean
  ): string[] => {
    if (!notes || notes.length === 0) return [];
    const mapped = notes
      .map(note => {
        const content = extractCaseNoteContent(note)?.trim();
        if (!content) return null;
        return { note, content, parsed: parseCaseNoteJson(note) };
      })
      .filter(Boolean) as { note: any; content: string; parsed: any }[];

    const filtered = filter
      ? mapped.filter(item => filter(item.content.toLowerCase()))
      : mapped;

    if (filtered.length === 0) return [];

    const sorted = filtered.sort((a, b) => {
      const dateA = a.note?.date ? new Date(a.note.date).getTime() : 0;
      const dateB = b.note?.date ? new Date(b.note.date).getTime() : 0;
      return dateA - dateB;
    });

    return sorted.slice(-limit).map(item => {
      let snippet = item.content;
      if (item.parsed?.noteType === 'school' && item.parsed?.sections) {
        const { overview, behavior, academics, interventions, followUp } = item.parsed.sections;
        const parts: string[] = [];
        if (typeof overview === 'string' && overview.trim()) {
          parts.push(overview.trim());
        }
        if (typeof behavior === 'string' && behavior.trim()) {
          parts.push(`Behavior: ${behavior.trim()}`);
        }
        if (typeof academics === 'string' && academics.trim()) {
          parts.push(`Academics: ${academics.trim()}`);
        }
        if (typeof interventions === 'string' && interventions.trim()) {
          parts.push(`Supports: ${interventions.trim()}`);
        }
        if (typeof followUp === 'string' && followUp.trim()) {
          parts.push(`Follow-up: ${followUp.trim()}`);
        }
        if (parts.length > 0) {
          snippet = parts.join(' | ');
        }
      }

      if (snippet.length > 180) {
        snippet = `${snippet.slice(0, 177)}...`;
      }

      let dateStr = '';
      if (item.note?.date) {
        const parsedDate = new Date(item.note.date);
        if (!Number.isNaN(parsedDate.getTime())) {
          dateStr = format(parsedDate, 'MMM d');
        }
      }

      const staff = item.note?.staff ? ` (${item.note.staff})` : '';
      return `${dateStr ? `${dateStr}: ` : ''}${snippet}${staff}`;
    });
  };

  // Sync report data when youth changes or saved data exists
  useEffect(() => {
    if (!youth) {
      return;
    }

    // Auto-populate from youth profile - comprehensive demographic and clinical data
    const getBaseDataIfEmpty = (existingData: CourtReportData): Partial<CourtReportData> => {
      const result: Partial<CourtReportData> = {};

      // Always update basic info that should stay in sync with youth profile
      result.youthName = `${youth.firstName} ${youth.lastName}`;
      result.dateOfBirth = youth.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '';

      // Construct comprehensive placement info
      const placementParts = ['Heartland Boys Home - Group Home'];
      if (youth.admissionDate) {
        const lengthOfStay = calculateLengthOfStay(youth.admissionDate);
        placementParts.push(`Length of Stay: ${lengthOfStay}`);
      }
      if (youth.level) {
        placementParts.push(`Current Level: ${youth.level}`);
      }
      result.currentPlacement = existingData.currentPlacement || placementParts.join('\n');

      // Build consolidated educational summary from all available data
      if (!existingData.educationalProgressSummary) {
        const eduParts = [];

        // School placement
        if (youth.currentSchool) {
          eduParts.push(`School Placement: ${youth.currentSchool}`);
        }

        // Academic strengths
        if (youth.academicStrengths) {
          eduParts.push(`Academic Strengths: ${youth.academicStrengths}`);
        }

        // Academic challenges
        if (youth.academicChallenges) {
          eduParts.push(`Academic Challenges: ${youth.academicChallenges}`);
        }

        // Education goals
        if (youth.educationGoals) {
          eduParts.push(`Educational Goals: ${youth.educationGoals}`);
        }

        if (eduParts.length > 0) {
          result.educationalProgressSummary = eduParts.join('\n\n');
        }
      }

      // Build comprehensive treatment summary
      if (!existingData.treatmentProgressSummary) {
        const treatmentParts = [];

        // Diagnoses
        if (youth.currentDiagnoses) {
          treatmentParts.push(`Current Diagnoses: ${youth.currentDiagnoses}`);
        }

        // Medications
        if (youth.currentMedications) {
          treatmentParts.push(`Current Medications: ${youth.currentMedications}`);
        }

        // Treatment goals
        if (youth.treatmentGoals && youth.treatmentGoals.length > 0) {
          const goalsList = youth.treatmentGoals
            .map((goal: any, idx: number) => `${idx + 1}. ${goal.goal || goal}`)
            .join('\n');
          treatmentParts.push(`Treatment Goals:\n${goalsList}`);
        }

        if (treatmentParts.length > 0) {
          result.treatmentProgressSummary = treatmentParts.join('\n\n');
        }
      }

      // Build comprehensive family & social summary
      if (!existingData.familySocialSummary) {
        const familyParts = [];

        // Parent information
        const parentInfo = [];
        if (youth.mother?.name) {
          const motherDetails = [`Mother: ${youth.mother.name}`];
          if (youth.mother.contact) motherDetails.push(`Contact: ${youth.mother.contact}`);
          parentInfo.push(motherDetails.join(', '));
        }
        if (youth.father?.name) {
          const fatherDetails = [`Father: ${youth.father.name}`];
          if (youth.father.contact) fatherDetails.push(`Contact: ${youth.father.contact}`);
          parentInfo.push(fatherDetails.join(', '));
        }
        if (parentInfo.length > 0) {
          familyParts.push(`Family Members:\n${parentInfo.join('\n')}`);
        }

        // Guardian information
        if (youth.legalGuardian?.name || youth.legalGuardian?.relationship) {
          const guardianDetails = [`Legal Guardian: ${youth.legalGuardian.name || 'Not specified'}`];
          if (youth.legalGuardian.relationship) {
            guardianDetails.push(`Relationship: ${youth.legalGuardian.relationship}`);
          }
          if (youth.legalGuardian.contact) {
            guardianDetails.push(`Contact: ${youth.legalGuardian.contact}`);
          }
          familyParts.push(guardianDetails.join(', '));
        }

        // Probation officer
        const po = findProfessional(youth, 'probationOfficer');
        if (po?.name) {
          const poDetails = [`Probation Officer: ${po.name}`];
          if (po.phone) poDetails.push(`Contact: ${po.phone}`);
          familyParts.push(poDetails.join(', '));
        }

        // Social strengths
        if (youth.socialStrengths) {
          familyParts.push(`Social Strengths: ${youth.socialStrengths}`);
        }

        if (familyParts.length > 0) {
          result.familySocialSummary = familyParts.join('\n\n');
        }
      }

      // Build behavioral assessment from profile data
      if (!existingData.behavioralAssessmentSummary) {
        const behaviorParts = [];

        // Strengths and talents
        if (youth.strengthsTalents) {
          behaviorParts.push(`Strengths & Talents: ${youth.strengthsTalents}`);
        }

        // Social strengths
        if (youth.socialStrengths) {
          behaviorParts.push(`Social Strengths: ${youth.socialStrengths}`);
        }

        // Social deficiencies
        if (youth.socialDeficiencies) {
          behaviorParts.push(`Areas for Growth: ${youth.socialDeficiencies}`);
        }

        // Current level as behavioral indicator
        if (youth.level && youth.pointTotal) {
          behaviorParts.push(`Current Level: ${youth.level} (${youth.pointTotal.toLocaleString()} total points)`);
        }

        if (behaviorParts.length > 0) {
          result.behavioralAssessmentSummary = behaviorParts.join('\n\n');
        }
      }

      // Build future planning summary from discharge plan
      if (!existingData.futurePlanningSummary) {
        const dischargeParts = [];

        // Estimated length of stay
        if (youth.dischargePlan?.estimatedLengthOfStayMonths) {
          dischargeParts.push(`Estimated Length of Stay: ${youth.dischargePlan.estimatedLengthOfStayMonths} months`);
        }

        // Discharge destination
        const dischargeDestination = [];
        if (youth.dischargePlan?.parents) {
          dischargeDestination.push(`Parents: ${youth.dischargePlan.parents}`);
        }
        if (youth.dischargePlan?.relative?.name) {
          const relDetails = [`Relative: ${youth.dischargePlan.relative.name}`];
          if (youth.dischargePlan.relative.relationship) {
            relDetails.push(`(${youth.dischargePlan.relative.relationship})`);
          }
          dischargeDestination.push(relDetails.join(' '));
        }
        if (youth.dischargePlan?.groupHome) {
          dischargeDestination.push(`Group Home: ${youth.dischargePlan.groupHome}`);
        }
        if (youth.dischargePlan?.independentLiving) {
          dischargeDestination.push(`Independent Living: ${youth.dischargePlan.independentLiving}`);
        }
        if (dischargeDestination.length > 0) {
          dischargeParts.push(`Planned Discharge Destination:\n${dischargeDestination.join('\n')}`);
        }

        // Aftercare services
        if (youth.dischargePlan?.aftercareServices && youth.dischargePlan.aftercareServices.length > 0) {
          const servicesList = youth.dischargePlan.aftercareServices
            .map((service: string, idx: number) => `${idx + 1}. ${service}`)
            .join('\n');
          dischargeParts.push(`Aftercare Services Recommended:\n${servicesList}`);
        }

        if (dischargeParts.length > 0) {
          result.futurePlanningSummary = dischargeParts.join('\n\n');
        }
      }

      return result;
    };

    (async () => {
      let loaded = false;

      // Try Supabase draft first
      try {
        const draft = await draftsService.get(youth.id, 'court_report', user?.uid || null)
        if (draft?.data) {
          const savedData = draft.data as CourtReportData;
          setReportData(savedData);
          setAutoSaveStatus('saved');
          loaded = true;
        }
      } catch {}

      // Try localStorage
      if (!loaded) {
        const savedDataStr = localStorage.getItem(`court-report-${youth.id}`);
        if (savedDataStr) {
          try {
            const savedData = JSON.parse(savedDataStr) as CourtReportData;
            setReportData(savedData);
            loaded = true;
          } catch (error) {
            console.error('Error loading saved court report data:', error);
          }
        }
      }

      // Always sync live youth data (name, DOB, level) so reports reflect current status
      const placementParts = ['Heartland Boys Home - Group Home'];
      if (youth.admissionDate) {
        const lengthOfStay = calculateLengthOfStay(youth.admissionDate);
        placementParts.push(`Length of Stay: ${lengthOfStay}`);
      }
      if (youth.level) {
        placementParts.push(`Current Level: ${youth.level}`);
      }
      setReportData(prev => ({
        ...prev,
        youthName: `${youth.firstName} ${youth.lastName}`,
        dateOfBirth: youth.dob ? format(new Date(youth.dob), 'MM/dd/yyyy') : '',
        currentPlacement: placementParts.join('\n'),
      }));

      // No saved data — populate with base data and auto-trigger AI population
      if (!loaded) {
        setReportData(prev => ({ ...prev, ...getBaseDataIfEmpty(prev) }));
        setShouldAutoPopulate(true);
      }
    })();
  }, [youth, user?.uid]);

  const handleInputChange = (field: keyof CourtReportData, value: string) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const handleEnhanceWithAI = async (field: keyof CourtReportData) => {
    const currentValue = reportData[field] as string;
    
    if (!currentValue || currentValue.trim().length === 0) {
      toast({
        title: "No Content",
        description: "Please enter some text before using AI enhancement.",
        variant: "destructive"
      });
      return;
    }

    const prompts: Record<string, string> = {
      treatmentProgressSummary: "You are a clinical professional writing a court report. Expand the following brief notes about treatment goals and progress into a comprehensive 2-3 paragraph summary. Include details about primary treatment goals, progress toward those goals, therapeutic participation, and medication compliance. Use professional clinical language appropriate for court documentation.",
      behavioralAssessmentSummary: "You are a clinical professional writing a court report. Expand the following brief notes about behavioral assessment into a comprehensive 2-3 paragraph summary. Include details about behavioral progress, significant incidents, and behavioral interventions used. Use professional clinical language appropriate for court documentation.",
      educationalProgressSummary: "You are a clinical professional writing a court report. Expand the following brief notes about educational progress into a comprehensive 2-3 paragraph summary. Note that the youth attends the Heartland Boys Home Independent School, managed by Berniklau Education Solutions. Focus on behavioral observations from Daily Progress Notes that relate to school — classroom behavior, compliance, engagement, and interactions with teachers. Emphasize what the youth is doing well and areas needing improvement. Do not fabricate specific grades or test scores. Use professional clinical language appropriate for court documentation.",
      familySocialSummary: "You are a clinical professional writing a court report. Expand the following brief notes about family and social relationships into a comprehensive 2-3 paragraph summary. Include details about family visitation, family therapy, peer relationships, and community contacts. Use professional clinical language appropriate for court documentation.",
      programParticipationSummary: "You are a clinical professional writing a court report. Expand the following brief notes about program participation into a comprehensive 2-3 paragraph summary. Include details about daily structure compliance, program compliance, skills development, and incentives/consequences. Use professional clinical language appropriate for court documentation.",
      futurePlanningSummary: "You are a clinical professional writing a court report. Expand the following brief notes about future planning into a comprehensive 2-3 paragraph summary. Include details about discharge timeline, discharge planning, aftercare recommendations, and transition plan. Use professional clinical language appropriate for court documentation.",
      overallAssessment: "You are a clinical professional writing a court report. Expand the following brief notes about the youth's overall assessment into a comprehensive 2-3 paragraph summary. Synthesize information about the youth's progress, current status, strengths, challenges, and overall trajectory. Use professional clinical language appropriate for court documentation.",
      courtRecommendations: "You are a clinical professional writing a court report. Expand the following brief notes into specific, actionable recommendations for the court. Include recommendations about continued placement, treatment needs, family involvement, educational planning, and any other relevant considerations. Use professional clinical language appropriate for court documentation.",
      additionalComments: "You are a clinical professional writing a court report. Expand the following brief notes into a well-structured additional comments section. Include any relevant information not covered in other sections, special considerations, or contextual details that would be helpful for the court. Use professional clinical language appropriate for court documentation."
    };

    const prompt = prompts[field];
    if (!prompt) {
      toast({
        title: "Enhancement Not Available",
        description: "AI enhancement is not available for this field.",
        variant: "destructive"
      });
      return;
    }

    try {
      toast({
        title: "Enhancing...",
        description: "AI is expanding your notes. This may take a moment.",
      });

      const response = await aiService.queryData(prompt, {
        youth,
        currentText: currentValue,
        fieldType: field
      });

      if (response.success && response.data?.answer) {
        const enhanced = response.data.answer;
        handleInputChange(field, enhanced);

        toast({
          title: "Enhanced Successfully",
          description: "Your text has been professionally expanded.",
        });
      } else {
        throw new Error(response.error || 'Failed to enhance text');
      }
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Could not enhance text. Please try again.",
        variant: "destructive"
      });
    }
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
        await persistDraft(reportData, pendingYouthIdRef.current, user?.uid || null);
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
  }, [reportData, youth, user?.uid, persistDraft]);

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
    await persistDraft(reportData, youth.id, user?.uid || null);

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

  const handleAutoPopulate = async (skipConfirm = false) => {
    if (!youth) {
      toast({
        title: "Error",
        description: "No youth selected",
        variant: "destructive"
      });
      return;
    }

    // Check if any consolidated fields already have data
    const hasExistingData = !!(
      reportData.behavioralAssessmentSummary ||
      reportData.programParticipationSummary ||
      reportData.treatmentProgressSummary ||
      reportData.educationalProgressSummary ||
      reportData.familySocialSummary ||
      reportData.futurePlanningSummary
    );

    if (hasExistingData && !skipConfirm) {
      const confirmed = confirm(
        'Some fields already contain data. AI will generate comprehensive summaries for ALL sections based on case notes and documentation. Continue?'
      );
      if (!confirmed) return;
    }

    setIsSaving(true);

    try {
      toast({
        title: "AI Processing",
        description: "Analyzing case notes and data from the last 30 days to generate comprehensive summaries...",
      });

      // Fetch recent behavior points, case notes, daily ratings, school scores, and weekly evals
      const thirtyDaysAgoISO = subMonths(new Date(), 1).toISOString().split('T')[0];
      const todayISO = new Date().toISOString().split('T')[0];
      const [behaviorPoints, progressNotes, dailyRatings, schoolScores, weeklyEvals, dailyShifts] = await Promise.all([
        getBehaviorPointsByYouth(youth.id),
        fetchAllProgressNotes(youth.id),
        getDailyRatingsByYouth(youth.id),
        getScoresByYouth(youth.id).catch((error) => {
          console.warn('Failed to load school scores for court report auto-populate:', error);
          return [];
        }),
        getWeeklyEvalsForYouthInRange(youth.id, thirtyDaysAgoISO, todayISO).catch(() => []),
        getDailyShiftsForYouthInRange(youth.id, thirtyDaysAgoISO, todayISO).catch(() => [])
      ]);

      // Filter to last 30 days
      const thirtyDaysAgo = subMonths(new Date(), 1);
      const recentBehavior = behaviorPoints.filter(bp =>
        bp.date && new Date(bp.date) >= thirtyDaysAgo
      );
      const recentNotes = progressNotes.filter(note =>
        note.date && new Date(note.date) >= thirtyDaysAgo
      );
      const recentRatings = dailyRatings.filter(rating =>
        rating.date && new Date(rating.date) >= thirtyDaysAgo
      );
      const recentSchoolScores = (schoolScores as SchoolDailyScore[]).filter(score =>
        score.date && new Date(score.date) >= thirtyDaysAgo
      );

      // Prepare case notes summary for AI
      const caseNotesText = recentNotes.map(note => {
        const content = extractCaseNoteContent(note);
        const date = note.date ? format(new Date(note.date), 'MMM d, yyyy') : 'No date';
        return `[${date}] ${content}`;
      }).join('\n\n');

      // Calculate statistics for context
      const ratingCount = recentRatings.length;
      const avgPeer = ratingCount > 0
        ? (recentRatings.reduce((sum, rating) => sum + (rating.peerInteraction ?? 0), 0) / ratingCount).toFixed(1)
        : '0';
      const avgAdult = ratingCount > 0
        ? (recentRatings.reduce((sum, rating) => sum + (rating.adultInteraction ?? 0), 0) / ratingCount).toFixed(1)
        : '0';
      const avgInvestment = ratingCount > 0
        ? (recentRatings.reduce((sum, rating) => sum + (rating.investmentLevel ?? 0), 0) / ratingCount).toFixed(1)
        : '0';
      const avgAuthority = ratingCount > 0
        ? (recentRatings.reduce((sum, rating) => sum + (rating.dealAuthority ?? 0), 0) / ratingCount).toFixed(1)
        : '0';

      const avgPoints = recentBehavior.length > 0
        ? (recentBehavior.reduce((sum, bp) => sum + (bp.totalPoints ?? 0), 0) / recentBehavior.length).toFixed(1)
        : '0';

      const schoolScoreCount = recentSchoolScores.length;
      const schoolAverage = schoolScoreCount > 0
        ? (recentSchoolScores.reduce((sum, score) => sum + Number(score.score ?? 0), 0) / schoolScoreCount).toFixed(1)
        : 'N/A';

      // Calculate weekly eval averages (4-domain behavioral scoring)
      const allEvalEntries = [...weeklyEvals, ...dailyShifts];
      const evalCount = allEvalEntries.length;
      const evalAvgPeer = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + (e.peer ?? 0), 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgAdult = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + (e.adult ?? 0), 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgInvestment = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + (e.investment ?? 0), 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgAuthority = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + (e.authority ?? 0), 0) / evalCount).toFixed(1) : 'N/A';
      const evalAvgOverall = evalCount > 0 ? (allEvalEntries.reduce((s, e) => s + (e.overall ?? 0), 0) / evalCount).toFixed(1) : 'N/A';

      // Calculate length of stay
      const lengthOfStay = youth.admissionDate
        ? calculateLengthOfStay(youth.admissionDate)
        : 'Not available';

      // Use AI to generate each section based on case notes
      const aiPrompts = {
        treatmentProgressSummary: `You are a clinical professional writing a court report. Based on the following case notes and data for ${youth.firstName} ${youth.lastName}, write a comprehensive 3-4 paragraph summary about their treatment goals, progress toward goals, therapeutic participation, and clinical observations.

Treatment Information:
- Current Diagnoses: ${youth.currentDiagnoses || youth.diagnoses || 'Not documented'}
- Current Counseling: ${youth.currentCounseling?.join(', ') || 'Not specified'}
- Therapist: ${youth.therapistName || 'Not specified'}
- Length of Stay: ${lengthOfStay}

Case Notes:
${caseNotesText || 'No case notes available for this period.'}

Write a professional, clinical summary suitable for a court report.`,

        behavioralAssessmentSummary: `You are a clinical professional writing a court report. Based on the following case notes and data for ${youth.firstName} ${youth.lastName}, write a comprehensive 3-4 paragraph summary about their behavioral progress, significant incidents, and behavioral interventions.

Behavioral Data:
- Average Daily Points: ${avgPoints}/15 over ${recentBehavior.length} days
- Peer Interaction (daily ratings): ${avgPeer}/5
- Adult Interaction (daily ratings): ${avgAdult}/5
- Authority/Compliance (daily ratings): ${avgAuthority}/5
- Current Level: ${youth.level || 'Not specified'}

Weekly Eval / Shift Scores (4-domain behavioral assessment, 0-4 scale, ${evalCount} entries):
- Peer Interaction: ${evalAvgPeer}/4
- Adult Interaction: ${evalAvgAdult}/4
- Investment Level: ${evalAvgInvestment}/4
- Dealing w/ Authority: ${evalAvgAuthority}/4
- Overall Average: ${evalAvgOverall}/4

Case Notes:
${caseNotesText || 'No case notes available for this period.'}

Write a professional, clinical summary suitable for a court report focusing on behavioral assessment.`,

        educationalProgressSummary: `You are a clinical professional writing a court report. Based on the following case notes and data for ${youth.firstName} ${youth.lastName}, write a comprehensive 2-3 paragraph summary about their educational progress.

Important context: ${youth.firstName} attends the Heartland Boys Home Independent School, which is managed by Berniklau Education Solutions.${youth.currentGrade ? ` ${youth.firstName} is currently enrolled in grade ${youth.currentGrade}.` : ''}

Focus your summary on:
1. The youth's educational placement through Berniklau Education Solutions
2. Behavioral observations from the Daily Progress Notes (DPNs) that relate to school performance — classroom behavior, compliance with school expectations, engagement, and interactions with teachers and peers during school hours
3. What the youth is doing well academically and specific areas that need improvement

Do NOT fabricate specific grades, test scores, or credit counts unless they appear in the case notes. Base your observations on behavioral progress noted in the DPNs, since DPNs typically include school-related behaviors.

Case Notes / DPN Observations:
${caseNotesText || 'No case notes available for this period.'}

Write a professional, educational summary suitable for a court report. Do not include raw case note excerpts or staff names.`,

        familySocialSummary: `You are a clinical professional writing a court report. Based on the following case notes and data for ${youth.firstName} ${youth.lastName}, write a comprehensive 2-3 paragraph summary about their family relationships, social development, peer relationships, and community involvement.

Social-Emotional Data:
- Peer Interaction Rating (daily): ${avgPeer}/5
- Adult Interaction Rating (daily): ${avgAdult}/5
- Peer Interaction (weekly eval): ${evalAvgPeer}/4
- Adult Interaction (weekly eval): ${evalAvgAdult}/4
- Family Members: ${youth.familyMembers?.map((fm: any) => `${fm.firstName} ${fm.lastName} (${fm.relation})`).join(', ') || 'Not documented'}

Case Notes:
${caseNotesText || 'No case notes available for this period.'}

Write a professional, clinical summary suitable for a court report focusing on family and social relationships.`,

        programParticipationSummary: `You are a clinical professional writing a court report. Based on the following case notes and data for ${youth.firstName} ${youth.lastName}, write a comprehensive 2-3 paragraph summary about their program participation, daily structure compliance, life skills development, and overall engagement.

Program Data:
- Current Level: ${youth.level || 'Not specified'}
- Average Points: ${avgPoints}/15
- Investment Level (daily): ${avgInvestment}/5
- Investment Level (weekly eval): ${evalAvgInvestment}/4
- Overall Eval Average: ${evalAvgOverall}/4
- School Score Average: ${schoolAverage}
- Number of Case Notes: ${recentNotes.length}

Case Notes:
${caseNotesText || 'No case notes available for this period.'}

Write a professional summary suitable for a court report focusing on program participation.`,

        futurePlanningSummary: `You are a clinical professional writing a court report. Based on the following case notes and data for ${youth.firstName} ${youth.lastName}, write a comprehensive 2-3 paragraph summary about discharge planning, transition timeline, aftercare recommendations, and future goals.

Planning Information:
- Length of Stay: ${lengthOfStay}
- Current Level: ${youth.level || 'Not specified'}
- Placement Status: ${youth.placementStatus || 'Not specified'}

Case Notes:
${caseNotesText || 'No case notes available for this period.'}

Write a professional summary suitable for a court report focusing on future planning and discharge recommendations.`
      };

      // Generate AI summaries for each section
      const updates: Partial<CourtReportData> = {};

      for (const [field, prompt] of Object.entries(aiPrompts)) {
        try {
          const response = await aiService.queryData(prompt, {
            youth,
            period: 'Last 30 days',
            caseNotes: caseNotesText
          });

          if (response.success && response.data?.answer) {
            updates[field as keyof CourtReportData] = response.data.answer as any;
          }
        } catch (error) {
          console.error(`Error generating ${field}:`, error);
        }
      }

      // Update all fields with AI-generated summaries
      setReportData(prev => ({ ...prev, ...updates }));

      toast({
        title: "Success",
        description: "All sections have been populated with AI-generated summaries from case notes and documentation. Review and edit as needed.",
      });
    } catch (error) {
      console.error('Error auto-populating data:', error);
      toast({
        title: "Error",
        description: "Failed to auto-populate data",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Keep a ref to the latest handleAutoPopulate to avoid stale closures
  const handleAutoPopulateRef = useRef(handleAutoPopulate);
  handleAutoPopulateRef.current = handleAutoPopulate;

  // Auto-trigger AI population when no saved draft exists
  useEffect(() => {
    if (shouldAutoPopulate && youth?.id && !isSaving) {
      setShouldAutoPopulate(false);
      handleAutoPopulateRef.current(true);
    }
  }, [shouldAutoPopulate, youth?.id, isSaving]);

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

        currentPlacement: 'Heartland Boys Home - Group Home',
        
        treatmentProgressSummary: '',
        behavioralAssessmentSummary: '',
        educationalProgressSummary: '',
        familySocialSummary: '',
        programParticipationSummary: '',
        futurePlanningSummary: '',
        
        overallAssessment: '',
        courtRecommendations: '',
        additionalComments: ''
      };

      setReportData(emptyData);

      try {
        await draftsService.delete(youth.id, 'court_report', user?.uid || null);
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
                        await persistDraft(reportData, youth.id, user?.uid || null);
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
                onClick={() => handleAutoPopulate()}
                className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-Populate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Eye className="mr-2 h-4 w-4" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="border-red-300 text-red-700 hover:bg-red-50"
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

        {/* Tabbed Form Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-9 mb-6">
            <TabsTrigger value="basic-info" className="flex items-center gap-1 text-xs">
              {isSectionComplete("basic-info") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Basic</span>
            </TabsTrigger>
            <TabsTrigger value="current-placement" className="flex items-center gap-1 text-xs">
              {isSectionComplete("current-placement") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Placement</span>
            </TabsTrigger>
            <TabsTrigger value="treatment" className="flex items-center gap-1 text-xs">
              {isSectionComplete("treatment") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Treatment</span>
            </TabsTrigger>
            <TabsTrigger value="behavioral" className="flex items-center gap-1 text-xs">
              {isSectionComplete("behavioral") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Behavioral</span>
            </TabsTrigger>
            <TabsTrigger value="educational" className="flex items-center gap-1 text-xs">
              {isSectionComplete("educational") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Education</span>
            </TabsTrigger>
            <TabsTrigger value="family-social" className="flex items-center gap-1 text-xs">
              {isSectionComplete("family-social") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Family</span>
            </TabsTrigger>
            <TabsTrigger value="program" className="flex items-center gap-1 text-xs">
              {isSectionComplete("program") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Program</span>
            </TabsTrigger>
            <TabsTrigger value="future" className="flex items-center gap-1 text-xs">
              {isSectionComplete("future") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Future</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-1 text-xs">
              {isSectionComplete("summary") ? (
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              <span>Summary</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Information */}
          <TabsContent value="basic-info" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </TabsContent>

          {/* Tab 2: Current Placement */}
          <TabsContent value="current-placement" className="space-y-4">
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
          </TabsContent>

          {/* Tab 3: Treatment Goals & Progress */}
          <TabsContent value="treatment" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Treatment Goals & Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="treatmentProgressSummary">Treatment Progress Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnhanceWithAI('treatmentProgressSummary')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="treatmentProgressSummary"
                  value={reportData.treatmentProgressSummary}
                  onChange={(e) => handleInputChange('treatmentProgressSummary', e.target.value)}
                  rows={8}
                  className="mt-1"
                  placeholder="Provide a comprehensive summary including: treatment goals and objectives, progress toward goals, therapeutic participation (individual and group therapy), and medication compliance..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Behavioral Assessment */}
          <TabsContent value="behavioral" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Behavioral Assessment</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="behavioralAssessmentSummary">Behavioral Assessment Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnhanceWithAI('behavioralAssessmentSummary')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="behavioralAssessmentSummary"
                  value={reportData.behavioralAssessmentSummary}
                  onChange={(e) => handleInputChange('behavioralAssessmentSummary', e.target.value)}
                  rows={8}
                  className="mt-1"
                  placeholder="Provide a comprehensive summary including: behavioral progress and improvements, significant behavioral incidents, and behavioral interventions and strategies used..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Educational Progress */}
          <TabsContent value="educational" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Educational Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="educationalProgressSummary">Educational Progress Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnhanceWithAI('educationalProgressSummary')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="educationalProgressSummary"
                  value={reportData.educationalProgressSummary}
                  onChange={(e) => handleInputChange('educationalProgressSummary', e.target.value)}
                  rows={8}
                  className="mt-1"
                  placeholder="Provide a comprehensive summary including: school placement, academic achievements and progress, educational challenges or needs, and vocational training/career goals..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Family & Social Relationships */}
          <TabsContent value="family-social" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Family & Social Relationships</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="familySocialSummary">Family & Social Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnhanceWithAI('familySocialSummary')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="familySocialSummary"
                  value={reportData.familySocialSummary}
                  onChange={(e) => handleInputChange('familySocialSummary', e.target.value)}
                  rows={8}
                  className="mt-1"
                  placeholder="Provide a comprehensive summary including: family visitation and contact, family therapy participation and progress, peer relationships, and community involvement/contacts..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 7: Program Participation */}
          <TabsContent value="program" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Program Participation</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="programParticipationSummary">Program Participation Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnhanceWithAI('programParticipationSummary')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="programParticipationSummary"
                  value={reportData.programParticipationSummary}
                  onChange={(e) => handleInputChange('programParticipationSummary', e.target.value)}
                  rows={8}
                  className="mt-1"
                  placeholder="Provide a comprehensive summary including: daily structure compliance, overall program compliance and participation, life skills and social skills development, and incentives earned/consequences received..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 8: Future Planning */}
          <TabsContent value="future" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Future Planning</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="futurePlanningSummary">Future Planning Summary</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleEnhanceWithAI('futurePlanningSummary')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enhance with AI
                  </Button>
                </div>
                <Textarea
                  id="futurePlanningSummary"
                  value={reportData.futurePlanningSummary}
                  onChange={(e) => handleInputChange('futurePlanningSummary', e.target.value)}
                  rows={8}
                  className="mt-1"
                  placeholder="Provide a comprehensive summary including: projected discharge timeline and criteria, discharge planning activities, aftercare recommendations and supports, and transition plan to next level of care..."
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 9: Summary & Recommendations */}
          <TabsContent value="summary" className="space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-red-700 border-b border-red-200 pb-2">Summary & Recommendations</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                <Label htmlFor="overallAssessment">Overall Assessment</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhanceWithAI('overallAssessment')}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance with AI
                </Button>
              </div>
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
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="courtRecommendations">Recommendations to the Court</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhanceWithAI('courtRecommendations')}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance with AI
                </Button>
              </div>
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
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="additionalComments">Additional Comments</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnhanceWithAI('additionalComments')}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance with AI
                </Button>
              </div>
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
          </TabsContent>
        </Tabs>

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
