import { useState, useEffect, useMemo, useCallback } from "react";
import { draftsService } from '@/integrations/firebase/draftsService'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { Youth, youthService } from "@/integrations/firebase/services";
import { fetchAssessment, saveAssessment } from "@/utils/local-storage-utils";
import { buildReportFilename } from "@/utils/reportFilenames";

interface RiskAssessmentProps {
  youthId: string;
  youth: Youth;
  onAssessmentUpdated?: () => void;
}

interface DomainScore {
  score: number;
  notes: string;
  maxScore: number;
}

interface RiskAssessment {
  id?: string;
  assessmentDate: Date;
  completedBy: string;
  domains: {
    priorOffending: DomainScore;
    familyCircumstances: DomainScore;
    education: DomainScore;
    peerRelations: DomainScore;
    substanceUse: DomainScore;
    recreation: DomainScore;
    personality: DomainScore;
    attitudes: DomainScore;
  };
  traumaHistory: string;
  strengths: string;
  recommendedLevel: number;
  overallRiskLevel: string;
  interventionTargets: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface RiskAssessmentData {
  id?: string;
  assessmentdate?: string;
  completedby?: string;
  domains?: {
    priorOffending: DomainScore;
    familyCircumstances: DomainScore;
    education: DomainScore;
    peerRelations: DomainScore;
    substanceUse: DomainScore;
    recreation: DomainScore;
    personality: DomainScore;
    attitudes: DomainScore;
  };
  traumahistory?: string;
  strengths?: string;
  recommendedlevel?: number;
  overallrisklevel?: string;
  interventiontargets?: string[];
  createdat?: string;
  updatedat?: string;
}

const DOMAIN_QUESTIONS = {
  priorOffending: [
    { id: "po1", text: "Three or more prior arrests", score: 2 },
    { id: "po2", text: "Previous incarceration in detention facility", score: 2 },
    { id: "po3", text: "Prior probation or community supervision", score: 1 },
    { id: "po4", text: "Previous failure to comply with court orders", score: 3 },
    { id: "po5", text: "Pattern of escalating severity in offenses", score: 2 }
  ],
  familyCircumstances: [
    { id: "fc1", text: "History of family disruption or separation", score: 2 },
    { id: "fc2", text: "Family members with criminal involvement", score: 2 },
    { id: "fc3", text: "Inconsistent parental supervision", score: 3 },
    { id: "fc4", text: "Parental difficulty controlling behavior", score: 2 },
    { id: "fc5", text: "Exposure to domestic violence", score: 1 }
  ],
  education: [
    { id: "ed1", text: "Poor academic achievement", score: 2 },
    { id: "ed2", text: "Truancy or dropping out", score: 3 },
    { id: "ed3", text: "Limited engagement in school activities", score: 1 },
    { id: "ed4", text: "Negative attitude toward education", score: 2 },
    { id: "ed5", text: "Disciplinary issues at school", score: 2 }
  ],
  peerRelations: [
    { id: "pr1", text: "Association with delinquent peers", score: 3 },
    { id: "pr2", text: "Limited positive peer relationships", score: 2 },
    { id: "pr3", text: "Gang involvement or affiliation", score: 3 },
    { id: "pr4", text: "Peer rejection or isolation", score: 1 },
    { id: "pr5", text: "Easily influenced by negative peers", score: 1 }
  ],
  substanceUse: [
    { id: "su1", text: "Regular substance use", score: 3 },
    { id: "su2", text: "Substance use linked to offending", score: 3 },
    { id: "su3", text: "Early onset of substance use", score: 2 },
    { id: "su4", text: "Substance use affects functioning", score: 1 },
    { id: "su5", text: "Family history of substance abuse", score: 1 }
  ],
  recreation: [
    { id: "rc1", text: "Limited structured leisure activities", score: 1 },
    { id: "rc2", text: "Excessive unstructured free time", score: 2 },
    { id: "rc3", text: "Lack of positive recreational interests", score: 2 },
    { id: "rc4", text: "Limited community involvement", score: 1 },
    { id: "rc5", text: "Recreational activities involve risk-taking", score: 4 }
  ],
  personality: [
    { id: "ps1", text: "Impulsivity and risk-taking", score: 2 },
    { id: "ps2", text: "Low empathy or remorse", score: 3 },
    { id: "ps3", text: "Poor frustration tolerance", score: 2 },
    { id: "ps4", text: "Inflated self-esteem", score: 1 },
    { id: "ps5", text: "Verbally aggressive or intimidating", score: 2 }
  ],
  attitudes: [
    { id: "at1", text: "Antisocial attitudes or beliefs", score: 3 },
    { id: "at2", text: "Defiance toward authority", score: 2 },
    { id: "at3", text: "Lack of concern for others", score: 2 },
    { id: "at4", text: "Minimizes harm caused to others", score: 1 },
    { id: "at5", text: "Negative attitude toward intervention", score: 2 }
  ]
};

const DOMAIN_LABELS = {
  priorOffending: "Prior & Current Offending",
  familyCircumstances: "Family Circumstances",
  education: "Education & Employment",
  peerRelations: "Peer Relations",
  substanceUse: "Substance Use",
  recreation: "Leisure & Recreation",
  personality: "Personality & Behavior",
  attitudes: "Attitudes & Orientation"
};

const INTERVENTION_TARGETS = [
  "Emotion Regulation",
  "Impulse Control",
  "Criminal Thinking",
  "Substance Abuse Treatment",
  "Family Counseling",
  "Academic Support",
  "Vocational Training",
  "Cognitive Behavioral Therapy",
  "Social Skills Training",
  "Mentoring",
  "Anger Management",
  "Trauma-Focused Therapy",
  "Individual Counseling",
  "Group Therapy",
  "Peer Association Management"
];

// Helper function to calculate risk level and recommended level from score percentage
const calculateRiskLevelFromPercentage = (scorePercentage: number) => {
  let riskLevel = "Very Low";
  let recommendedLevel = 4;
  
  // 7-level risk assessment with equal intervals (~14% each)
  if (scorePercentage >= 0.86) {
    riskLevel = "Very High";
    recommendedLevel = 1;
  } else if (scorePercentage >= 0.72) {
    riskLevel = "High";
    recommendedLevel = 1;
  } else if (scorePercentage >= 0.58) {
    riskLevel = "Medium High";
    recommendedLevel = 1;
  } else if (scorePercentage >= 0.44) {
    riskLevel = "Medium";
    recommendedLevel = 2;
  } else if (scorePercentage >= 0.30) {
    riskLevel = "Low Medium";
    recommendedLevel = 2;
  } else if (scorePercentage >= 0.16) {
    riskLevel = "Low";
    recommendedLevel = 3;
  } else {
    riskLevel = "Very Low";
    recommendedLevel = 4;
  }
  
  return { riskLevel, recommendedLevel };
};

export const RiskAssessment = ({ youthId, youth, onAssessmentUpdated }: RiskAssessmentProps) => {
  const [assessment, setAssessment] = useState<RiskAssessment>({
    assessmentDate: new Date(),
    completedBy: "",
    domains: {
      priorOffending: { score: 0, notes: "", maxScore: 10 },
      familyCircumstances: { score: 0, notes: "", maxScore: 10 },
      education: { score: 0, notes: "", maxScore: 10 },
      peerRelations: { score: 0, notes: "", maxScore: 10 },
      substanceUse: { score: 0, notes: "", maxScore: 10 },
      recreation: { score: 0, notes: "", maxScore: 10 },
      personality: { score: 0, notes: "", maxScore: 10 },
      attitudes: { score: 0, notes: "", maxScore: 10 }
    },
    traumaHistory: "",
    strengths: "",
    recommendedLevel: 1,
    overallRiskLevel: "Low",
    interventionTargets: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDomain, setActiveDomain] = useState<keyof typeof assessment.domains>("priorOffending");
  const [questionResponses, setQuestionResponses] = useState<Record<string, boolean>>({});
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  
  useEffect(() => {
    fetchAssessmentData();
  }, [youthId]);
  
  const fetchAssessmentData = useCallback(async () => {
    setIsLoading(true);

    try {
      // Fetch both data sources in parallel for better performance
      const [assessmentData, youthData] = await Promise.allSettled([
        Promise.resolve(fetchAssessment(youthId, 'riskassessments', 'riskNeeds')),
        youthService.getById(youthId)
      ]);

      const localAssessment = assessmentData.status === 'fulfilled' ? assessmentData.value as RiskAssessmentData | null : null;
      const supabaseYouth = youthData.status === 'fulfilled' ? youthData.value : null;

      // Prioritize Supabase youth data, fall back to localStorage
      if (supabaseYouth?.hyrnaRiskLevel) {
        // Use Hygiene Risk data from Supabase
        setAssessment({
          id: `youth-${youthId}`,
          assessmentDate: supabaseYouth.hyrnaAssessmentDate ? new Date(supabaseYouth.hyrnaAssessmentDate) : new Date(),
          completedBy: "",
          domains: {
            priorOffending: { score: 0, notes: "", maxScore: 10 },
            familyCircumstances: { score: 0, notes: "", maxScore: 10 },
            education: { score: 0, notes: "", maxScore: 10 },
            peerRelations: { score: 0, notes: "", maxScore: 10 },
            substanceUse: { score: 0, notes: "", maxScore: 10 },
            recreation: { score: 0, notes: "", maxScore: 10 },
            personality: { score: 0, notes: "", maxScore: 10 },
            attitudes: { score: 0, notes: "", maxScore: 10 }
          },
          traumaHistory: "",
          strengths: "",
          recommendedLevel: supabaseYouth.level || 1,
          overallRiskLevel: supabaseYouth.hyrnaRiskLevel || "Low",
          interventionTargets: [],
          createdAt: new Date(supabaseYouth.createdAt || new Date()),
          updatedAt: new Date(supabaseYouth.updatedAt || new Date())
        });
        setQuestionResponses({});
      } else if (localAssessment) {
        // Use data from localStorage
        setAssessment({
          id: localAssessment.id,
          assessmentDate: localAssessment.assessmentdate ? new Date(localAssessment.assessmentdate) : new Date(),
          completedBy: localAssessment.completedby || "",
          domains: localAssessment.domains || {
            priorOffending: { score: 0, notes: "", maxScore: 10 },
            familyCircumstances: { score: 0, notes: "", maxScore: 10 },
            education: { score: 0, notes: "", maxScore: 10 },
            peerRelations: { score: 0, notes: "", maxScore: 10 },
            substanceUse: { score: 0, notes: "", maxScore: 10 },
            recreation: { score: 0, notes: "", maxScore: 10 },
            personality: { score: 0, notes: "", maxScore: 10 },
            attitudes: { score: 0, notes: "", maxScore: 10 }
          },
          traumaHistory: localAssessment.traumahistory || "",
          strengths: localAssessment.strengths || "",
          recommendedLevel: localAssessment.recommendedlevel || 1,
          overallRiskLevel: localAssessment.overallrisklevel || "Low",
          interventionTargets: localAssessment.interventiontargets || [],
          createdAt: localAssessment.createdat ? new Date(localAssessment.createdat) : new Date(),
          updatedAt: localAssessment.updatedat ? new Date(localAssessment.updatedat) : new Date()
        });
        setQuestionResponses({});
      } else {
        // Initialize empty assessment
        const totalScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.score, 0);
        const maxPossibleScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);
        const scorePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) : 0;
        const { riskLevel, recommendedLevel } = calculateRiskLevelFromPercentage(scorePercentage);

        setAssessment(prev => ({
          ...prev,
          overallRiskLevel: riskLevel,
          recommendedLevel: recommendedLevel
        }));
      }
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      toast.error("Failed to load risk assessment");
    } finally {
      setIsLoading(false);
    }
  }, [youthId]);
  
  const handleQuestionChange = useCallback((questionId: string, domain: keyof typeof assessment.domains, value: boolean) => {
    const domainQuestions = DOMAIN_QUESTIONS[domain];

    setQuestionResponses(prev => {
      const newResponses = { ...prev, [questionId]: value };

      // Recalculate domain score immediately
      let newScore = 0;
      domainQuestions.forEach(question => {
        if (newResponses[question.id]) {
          newScore += question.score;
        }
      });

      // Update assessment with new domain score and calculate overall risk level
      setAssessment(currentAssessment => {
        const updatedAssessment = {
          ...currentAssessment,
          domains: {
            ...currentAssessment.domains,
            [domain]: {
              ...currentAssessment.domains[domain],
              score: newScore
            }
          }
        };

        // Calculate the new overall risk level based on updated scores
        const totalScore = Object.values(updatedAssessment.domains).reduce((sum, domain) => sum + domain.score, 0);
        const maxPossibleScore = Object.values(updatedAssessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);
        const scorePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) : 0;

        // Calculate risk level using the helper function
        const { riskLevel, recommendedLevel } = calculateRiskLevelFromPercentage(scorePercentage);

        return {
          ...updatedAssessment,
          overallRiskLevel: riskLevel,
          recommendedLevel: recommendedLevel
        };
      });

      // Mark as having unsaved changes and trigger auto-save
      setHasUnsavedChanges(true);
      triggerAutoSave();

      return newResponses;
    });
  }, [assessment]);
  
  const handleDomainNotesChange = (domain: keyof typeof assessment.domains, notes: string) => {
    setAssessment(prev => ({
      ...prev,
      domains: {
        ...prev.domains,
        [domain]: {
          ...prev.domains[domain],
          notes
        }
      }
    }));
    
    // Mark as having unsaved changes and trigger auto-save
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };
  
  const handleGeneralInputChange = (field: keyof RiskAssessment, value: string) => {
    setAssessment(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Mark as having unsaved changes and trigger auto-save
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  // Auto-save functionality - reduced frequency for better performance
  const triggerAutoSave = useCallback(() => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer for 30 seconds after user stops typing (increased from 10s for performance)
    const timer = setTimeout(() => {
      autoSave();
    }, 30000);

    setAutoSaveTimer(timer);
  }, [autoSaveTimer]);

  const { user } = useAuth()
  const autoSave = async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;
    
    try {
      setIsAutoSaving(true);
      
      // Save to Supabase draft and local
      const draftKey = `risk-assessment-draft-${youthId}`;
      try { await draftsService.save(youthId, 'risk_assessment', (user as any)?.id || null, { ...assessment, questionResponses, savedAt: new Date().toISOString() }) } catch {}
      localStorage.setItem(draftKey, JSON.stringify({ ...assessment, questionResponses, savedAt: new Date().toISOString() }));
      
      setHasUnsavedChanges(false);

      // Auto-save silently without toast notification
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      // Risk assessment auto-save is silent, but we still log errors
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Load draft on component mount (prefer Supabase)
  useEffect(() => {
    (async () => {
      try {
        const remote = await draftsService.get(youthId, 'risk_assessment', (user as any)?.id || null)
        if (remote?.data && !isLoading) {
          const draftData: any = remote.data
          setAssessment(prev => ({
            ...prev,
            ...draftData,
            assessmentDate: draftData.assessmentDate ? new Date(draftData.assessmentDate) : prev.assessmentDate,
            createdAt: draftData.createdAt ? new Date(draftData.createdAt) : prev.createdAt,
            updatedAt: draftData.updatedAt ? new Date(draftData.updatedAt) : prev.updatedAt
          }));
          setQuestionResponses(draftData.questionResponses || {});
          setHasUnsavedChanges(true);
          return;
        }
      } catch {}
      const draftKey = `risk-assessment-draft-${youthId}`;
      const draft = localStorage.getItem(draftKey);
      if (draft && !isLoading) {
        try {
          const draftData = JSON.parse(draft);
          setAssessment(prev => ({
            ...prev,
            ...draftData,
            assessmentDate: new Date(draftData.assessmentDate),
            createdAt: new Date(draftData.createdAt),
            updatedAt: new Date(draftData.updatedAt)
          }));
          setQuestionResponses(draftData.questionResponses || {});
          setHasUnsavedChanges(true);
          toast.info("Draft loaded from auto-save", { duration: 2000 });
        } catch (error) {
          console.error("Failed to load draft:", error);
        }
      }
    })();
  }, [youthId, isLoading, user]);

  // Auto-save on unmount or when leaving the component
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges) {
        autoSave();
      }
    };

    // Save when component unmounts or user navigates away
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Auto-save any unsaved changes when component unmounts
      if (hasUnsavedChanges) {
        autoSave();
      }
      
      // Cleanup timer
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, autoSaveTimer]);
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      // Fix timezone issue by creating date in local timezone
      const [year, month, day] = dateValue.split('-').map(Number);
      const localDate = new Date(year, month - 1, day); // month is 0-indexed
      setAssessment(prev => ({
        ...prev,
        assessmentDate: localDate
      }));
      
      // Mark as having unsaved changes and trigger auto-save
      setHasUnsavedChanges(true);
      triggerAutoSave();
    }
  };
  
  const handleInterventionToggle = (target: string) => {
    setAssessment(prev => {
      const targets = [...prev.interventionTargets];
      
      if (targets.includes(target)) {
        return {
          ...prev,
          interventionTargets: targets.filter(t => t !== target)
        };
      } else {
        return {
          ...prev,
          interventionTargets: [...targets, target]
        };
      }
    });
    
    // Mark as having unsaved changes and trigger auto-save
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };
  
  const handleSaveAssessment = async () => {
    try {
      setIsSaving(true);

      // Calculate total score and risk level
      const totalScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.score, 0);
      const maxPossibleScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);

      // Calculate percentage score
      const scorePercentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) : 0;

      // Calculate risk level using the helper function
      const { riskLevel, recommendedLevel } = calculateRiskLevelFromPercentage(scorePercentage);

      const updatedAssessment = {
        ...assessment,
        overallRiskLevel: riskLevel,
        recommendedLevel,
        updatedAt: new Date()
      };

      // Save to localStorage for local storage
      const formattedData = {
        assessmentdate: updatedAssessment.assessmentDate.toISOString(),
        completedby: updatedAssessment.completedBy,
        domains: updatedAssessment.domains,
        traumahistory: updatedAssessment.traumaHistory,
        strengths: updatedAssessment.strengths,
        recommendedlevel: updatedAssessment.recommendedLevel,
        overallrisklevel: updatedAssessment.overallRiskLevel,
        interventiontargets: updatedAssessment.interventionTargets,
        createdat: updatedAssessment.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };

      saveAssessment(
        youthId,
        'riskassessments',
        'riskNeeds',
        formattedData
      );

      // Save HYRNA data to youth record in Supabase
      try {
        await youthService.update(youthId, {
          hyrnaRiskLevel: riskLevel,
          hyrnaScore: totalScore,
          hyrnaAssessmentDate: updatedAssessment.assessmentDate.toISOString(),
          level: recommendedLevel,
          updatedAt: new Date().toISOString()
        });

        toast.success("Risk assessment saved successfully to database");
      } catch (supabaseError) {
        console.error("Error saving to Supabase:", supabaseError);
        toast.warning("Assessment saved locally, but failed to sync to database");
      }

      setAssessment(updatedAssessment);

      // Clear draft after successful save
      const draftKey = `risk-assessment-draft-${youthId}`;
      localStorage.removeItem(draftKey);
      setHasUnsavedChanges(false);

      // Trigger callback to refresh parent component
      onAssessmentUpdated?.();

    } catch (error) {
      console.error("Error saving risk assessment:", error);
      toast.error("Failed to save risk assessment");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrintAssessment = () => {
    window.print();
  };
  
  const handleExportPdf = async () => {
    try {
      const { exportHTMLToPDF } = await import('@/utils/export');

      // Calculate scores for export
      const calculatedTotalScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.score, 0);
      const calculatedMaxScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);

      const exportData = {
        youth: youth,
        assessment: assessment,
        exportDate: new Date().toLocaleDateString(),
        totalScore: calculatedTotalScore,
        maxPossibleScore: calculatedMaxScore
      };

      const html = generateRiskAssessmentHTML(exportData);
      const filename = `${buildReportFilename(youth, "HYRNA Risk Assessment")}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast.success("Risk assessment exported successfully!");
    } catch (error) {
      console.error("Error exporting risk assessment:", error);
      toast.error("Failed to export risk assessment");
    }
  };

  const generateRiskAssessmentHTML = (data: any) => {
    const getDomainName = (key: string) => {
      const names: any = {
        priorOffending: 'Prior Offending',
        familyCircumstances: 'Family Circumstances',
        education: 'Education',
        peerRelations: 'Peer Relations',
        substanceUse: 'Substance Use',
        recreation: 'Recreation',
        personality: 'Personality',
        attitudes: 'Attitudes'
      };
      return names[key] || key;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>HYRNA Risk Assessment Report - Heartland Boys Home</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #b91c1c;
              padding-bottom: 20px;
              background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #d97706 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .logo { height: 60px; margin-bottom: 15px; }
            .youth-info { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
            .score-summary { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
            .domain-section { margin-bottom: 20px; padding: 15px; border: 1px solid #dc2626; border-radius: 5px; }
            .domain-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #b91c1c; }
            .score-bar { background-color: #fee2e2; height: 20px; border-radius: 10px; margin: 5px 0; border: 1px solid #fecaca; }
            .score-fill { background: linear-gradient(90deg, #dc2626, #d97706); height: 100%; border-radius: 10px; }
            .field { margin-bottom: 10px; }
            .field-label { font-weight: bold; color: #b91c1c; }
            .field-value { margin-left: 10px; color: #374151; }
            .risk-level { padding: 5px 10px; border-radius: 15px; color: white; font-weight: bold; }
            .risk-low { background-color: #22c55e; }
            .risk-moderate { background-color: #f59e0b; }
            .risk-high { background-color: #ef4444; }
            .risk-very-high { background-color: #dc2626; }
            @media print {
              body { margin: 0; }
              .header { background: #b91c1c !important; color: white !important; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${import.meta.env.BASE_URL}files/BoysHomeLogo.png" alt="Heartland Boys Home Logo" class="logo" crossorigin="anonymous" />
            <h1>Heartland Boys Home</h1>
            <h2>HYRNA Risk Assessment Report</h2>
            <p>Generated on ${data.exportDate}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${data.youth.firstName} ${data.youth.lastName}</p>
            <p><strong>Date of Birth:</strong> ${data.youth.dateOfBirth || 'Not specified'}</p>
            <p><strong>Assessment Date:</strong> ${data.assessment.assessmentDate.toLocaleDateString()}</p>
            <p><strong>Completed By:</strong> ${data.assessment.completedBy}</p>
          </div>

          <div class="score-summary">
            <h3>Overall Assessment Summary</h3>
            <p><strong>Total Score:</strong> ${data.totalScore} / ${data.maxPossibleScore}</p>
            <p><strong>Overall Risk Level:</strong>
              <span class="risk-level risk-${data.assessment.overallRiskLevel.toLowerCase()}">${data.assessment.overallRiskLevel}</span>
            </p>
            <p><strong>Recommended Level:</strong> ${data.assessment.recommendedLevel}</p>
          </div>

          <h3>Domain Scores</h3>
          ${Object.entries(data.assessment.domains).map(([key, domain]: [string, any]) => `
            <div class="domain-section">
              <div class="domain-title">${getDomainName(key)}</div>
              <div class="field">
                <span class="field-label">Score:</span>
                <span class="field-value">${domain.score} / ${domain.maxScore}</span>
              </div>
              <div class="score-bar">
                <div class="score-fill" style="width: ${(domain.score / domain.maxScore) * 100}%"></div>
              </div>
              <div class="field">
                <span class="field-label">Notes:</span>
                <span class="field-value">${domain.notes || 'No notes provided'}</span>
              </div>
            </div>
          `).join('')}

          <div class="field">
            <div class="field-label">Trauma History:</div>
            <div class="field-value">${data.assessment.traumaHistory || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Strengths:</div>
            <div class="field-value">${data.assessment.strengths || 'Not specified'}</div>
          </div>

          <div class="field">
            <div class="field-label">Intervention Targets:</div>
            <div class="field-value">${data.assessment.interventionTargets.join(', ') || 'None specified'}</div>
          </div>
        </body>
      </html>
    `;
  };
  
  const totalScore = useMemo(() => {
    return Object.values(assessment.domains).reduce((sum, domain) => sum + domain.score, 0);
  }, [assessment.domains]);

  const maxPossibleScore = useMemo(() => {
    return Object.values(assessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);
  }, [assessment.domains]);

  const scorePercentage = useMemo(() => {
    return (totalScore / maxPossibleScore) * 100;
  }, [totalScore, maxPossibleScore]);


  const formattedDate = useMemo(() => {
    if (!assessment.assessmentDate) return "";

    try {
      return assessment.assessmentDate.toISOString().split('T')[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  }, [assessment.assessmentDate]);

  const riskColor = useMemo(() => {
    if (scorePercentage >= 70) return "bg-red-500";
    if (scorePercentage >= 50) return "bg-orange-500";
    if (scorePercentage >= 30) return "bg-yellow-500";
    if (scorePercentage >= 15) return "bg-blue-500";
    return "bg-green-500";
  }, [scorePercentage]);


  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading risk assessment...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Youth Risk & Needs Assessment</h2>
          <p className="text-gray-600 mb-4">
            Evaluate risk factors and needs across eight domains to inform treatment planning.
          </p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintAssessment}>
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSaveAssessment} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="bg-blue-50">
            <CardTitle>Assessment Overview</CardTitle>
            <CardDescription>Summary of risk factors and needs</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="assessmentDate">Assessment Date</Label>
                <Input
                  id="assessmentDate"
                  type="date"
                  value={formattedDate}
                  onChange={handleDateChange}
                  className="max-w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="completedBy">Completed By</Label>
                <Input
                  id="completedBy"
                  value={assessment.completedBy}
                  onChange={(e) => handleGeneralInputChange("completedBy", e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Overall Risk Score</h3>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {totalScore} out of {maxPossibleScore} points
                </span>
                <span className="text-sm font-medium">{assessment.overallRiskLevel} Risk</span>
              </div>
              <Progress value={scorePercentage} className={riskColor} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Domain Breakdown</h3>
              <div className="space-y-1">
                {Object.entries(assessment.domains).map(([domain, data]) => (
                  <div key={domain} className="grid grid-cols-3 text-sm">
                    <span className="col-span-2 truncate" title={DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}>
                      {DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}
                    </span>
                    <span className="text-right font-medium">
                      {data.score}/{data.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Risk Domain Assessment</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-2">
              Complete each domain to generate a comprehensive risk profile
              {hasUnsavedChanges && (
                <span className="text-orange-600 text-sm font-medium flex items-center gap-1">
                  • Unsaved changes
                  {isAutoSaving && <span className="text-xs">(saving...)</span>}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeDomain} onValueChange={(value) => setActiveDomain(value as keyof typeof assessment.domains)}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="priorOffending">Offending</TabsTrigger>
                <TabsTrigger value="familyCircumstances">Family</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="peerRelations">Peers</TabsTrigger>
              </TabsList>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="substanceUse">Substance</TabsTrigger>
                <TabsTrigger value="recreation">Leisure</TabsTrigger>
                <TabsTrigger value="personality">Personality</TabsTrigger>
                <TabsTrigger value="attitudes">Attitudes</TabsTrigger>
              </TabsList>
              
              {Object.keys(assessment.domains).map(domain => (
                <TabsContent key={domain} value={domain} className="pt-4 space-y-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}
                  </h3>
                  
                  <div className="space-y-4">
                    {DOMAIN_QUESTIONS[domain as keyof typeof DOMAIN_QUESTIONS].map((question) => (
                      <div key={question.id} className="p-3 border rounded-md hover:bg-gray-50">
                        <RadioGroup 
                          value={questionResponses[question.id] ? "yes" : "no"}
                          onValueChange={(value) => {
                            handleQuestionChange(
                              question.id, 
                              domain as keyof typeof assessment.domains, 
                              value === "yes"
                            );
                          }}
                          className="flex items-center"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{question.text}</p>
                            <p className="text-sm text-gray-500">Score weight: {question.score}</p>
                          </div>
                          <div className="space-x-4 flex items-center">
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                              <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="no" id={`${question.id}-no`} />
                              <Label htmlFor={`${question.id}-no`}>No</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor={`${domain}-notes`}>Domain Notes</Label>
                      <span className="text-sm font-medium">
                        Score: {assessment.domains[domain as keyof typeof assessment.domains].score} / 
                        {assessment.domains[domain as keyof typeof assessment.domains].maxScore}
                      </span>
                    </div>
                    <Textarea 
                      id={`${domain}-notes`} 
                      value={assessment.domains[domain as keyof typeof assessment.domains].notes}
                      onChange={(e) => handleDomainNotesChange(
                        domain as keyof typeof assessment.domains, 
                        e.target.value
                      )}
                      placeholder={`Additional notes about ${DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS].toLowerCase()}...`}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trauma History & Strengths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="traumaHistory">Trauma History</Label>
              <Textarea 
                id="traumaHistory" 
                value={assessment.traumaHistory}
                onChange={(e) => handleGeneralInputChange("traumaHistory", e.target.value)}
                placeholder="Document any known trauma history or adverse childhood experiences..."
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="strengths">Youth Strengths & Protective Factors</Label>
              <Textarea 
                id="strengths" 
                value={assessment.strengths}
                onChange={(e) => handleGeneralInputChange("strengths", e.target.value)}
                placeholder="Note positive attributes, skills, supports, and protective factors..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Intervention Targets</CardTitle>
            <CardDescription>Select primary treatment targets based on assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Select all that apply:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INTERVENTION_TARGETS.map((target) => (
                  <div key={target} className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id={`target-${target}`}
                      checked={assessment.interventionTargets.includes(target)}
                      onChange={() => handleInterventionToggle(target)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={`target-${target}`} className="text-sm cursor-pointer">
                      {target}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveAssessment} disabled={isSaving} className="w-full">
              {isSaving ? "Saving Assessment..." : "Save Complete Assessment"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
