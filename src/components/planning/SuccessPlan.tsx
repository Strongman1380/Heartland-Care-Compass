import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveAssessment, fetchAssessment } from "@/utils/local-storage-utils";
import { findProfessional } from "@/utils/professionalUtils";
import { buildReportFilename } from "@/utils/reportFilenames";

interface SuccessPlanProps {
  youthId: string;
  youth: any;
}

interface ResidentInfo {
  residentName: string;
  dateOfAdmission: string;
  idNumber: string;
  dobAge: string;
  referringAgency: string;
  caseWorker: string;
  probationOfficer: string;
  levelStatus: string;
  primaryGuardian: string;
  contactInfo: string;
}

interface AssessmentSummary {
  presentingConcerns: string;
  identifiedStrengths: string;
  academicStatus: string;
  familyDynamics: string;
  riskFactors: string[];
  baselineFunctioning: {
    behavioralRegulation: string;
    socialSkills: string;
    academicEngagement: string;
    familyRelationships: string;
    independentLivingSkills: string;
    emotionalRegulation: string;
  };
}

interface PermanencyObjective {
  permanencyGoal: string;
  anticipatedLengthOfStay: string;
  transitionTimelineBenchmarks: string;
}

interface TreatmentObjectives {
  behavioralObjective1: string;
  behavioralObjective2: string;
  socialSkillsFocus: string;
  academicGoals: string;
  familyEngagementGoals: string;
  independentLivingSkills: string;
  emotionalRegulationStrategies: string;
}

interface LevelSystemIntegration {
  currentLevelStatus: string;
  requirementsForNextLevel: string;
  privilegesAtCurrentLevel: string;
  incentivesForAdvancement: string;
}

interface SpecializedServices {
  individualTherapy: boolean;
  groupInterventions: boolean;
  additionalServices: string[];
}

interface TransitionPlanning {
  communityIntegrationActivities: string;
  supportSystemDevelopment: string;
  postDischargeResources: string;
  relapsePreventionPlanning: string;
}

interface ProgressReviewSchedule {
  weeklyReviews: string;
  monthlyTeamMeetings: string;
  quarterlyComprehensiveReviews: string;
}

interface AgreementSignatures {
  residentAcknowledgement: string;
  staffCertification: string;
  teamMemberEndorsements: string[];
  guardianFamilyParticipation: string;
}

interface ReviewHistoryEntry {
  date: string;
  typeOfReview: string;
  participants: string;
  summaryOfChanges: string;
}

interface HeartlandSuccessPlan {
  id?: string;
  residentInfo: ResidentInfo;
  assessmentSummary: AssessmentSummary;
  permanencyObjective: PermanencyObjective;
  treatmentObjectives: TreatmentObjectives;
  levelSystemIntegration: LevelSystemIntegration;
  specializedServices: SpecializedServices;
  transitionPlanning: TransitionPlanning;
  progressReviewSchedule: ProgressReviewSchedule;
  agreementSignatures: AgreementSignatures;
  reviewHistory: ReviewHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

interface SuccessPlanData {
  id?: string;
  residentinfo?: ResidentInfo;
  assessmentsummary?: AssessmentSummary;
  permanencyobjective?: PermanencyObjective;
  treatmentobjectives?: TreatmentObjectives;
  levelsystemintegration?: LevelSystemIntegration;
  specializedservices?: SpecializedServices;
  transitionplanning?: TransitionPlanning;
  progressreviewschedule?: ProgressReviewSchedule;
  agreementsignatures?: AgreementSignatures;
  reviewhistory?: ReviewHistoryEntry[];
  createdat: string;
  updatedat: string;
}

const RISK_FACTORS = [
  "Elopement Risk",
  "Self-Harm Risk", 
  "Aggression Risk",
  "Substance Use Risk",
  "Other"
];

const FUNCTIONING_LEVELS = [
  "Poor",
  "Fair", 
  "Moderate",
  "Good",
  "Excellent"
];

const FUNCTIONING_AREAS = [
  "behavioralRegulation",
  "socialSkills",
  "academicEngagement",
  "familyRelationships",
  "independentLivingSkills",
  "emotionalRegulation"
];

const FUNCTIONING_AREA_LABELS: Record<string, string> = {
  behavioralRegulation: "Behavioral Regulation",
  socialSkills: "Social Skills",
  academicEngagement: "Academic Engagement",
  familyRelationships: "Family Relationships",
  independentLivingSkills: "Independent Living Skills",
  emotionalRegulation: "Emotional Regulation"
};

const PERMANENCY_GOALS = [
  "Family Reunification",
  "Independent Living",
  "Foster Care/Adoption",
  "Other"
];

const LEVEL_STATUSES = [
  "Level 0 - Orientation",
  "Level 1",
  "Level 2",
  "Level 3",
  "Level 4",
  "Level 5",
  "Level 6",
  "Level 7",
  "Level 8",
  "Level 9",
  "Level 10"
];

const ADDITIONAL_SERVICES = [
  "Medication Management",
  "Substance Abuse Treatment",
  "Educational Support",
  "Vocational Training",
  "Cultural/Spiritual Support",
  "Other"
];

const EMPTY_RESIDENT_INFO: ResidentInfo = {
  residentName: "Sample Resident",
  dateOfAdmission: new Date().toISOString().split('T')[0],
  idNumber: "HR-001",
  dobAge: "01/01/2008 (Age: 16)",
  referringAgency: "Department of Children Services",
  caseWorker: "[Case Worker Name]",
  probationOfficer: "[Probation Officer Name]",
  levelStatus: "Level 1",
  primaryGuardian: "[Guardian Name]",
  contactInfo: "Phone: [Phone Number]\nEmail: [Email Address]"
};

const EMPTY_ASSESSMENT_SUMMARY: AssessmentSummary = {
  presentingConcerns: "Initial assessment indicates need for structured residential care and behavioral support.",
  identifiedStrengths: "Shows potential for growth, responds well to positive reinforcement, and demonstrates leadership qualities among peers.",
  academicStatus: "Currently enrolled in grade-appropriate coursework with some remedial support needs.",
  familyDynamics: "Working on improving family communication and relationships through therapeutic interventions.",
  riskFactors: [],
  baselineFunctioning: {
    behavioralRegulation: "Fair",
    socialSkills: "Fair",
    academicEngagement: "Moderate",
    familyRelationships: "Poor",
    independentLivingSkills: "Fair",
    emotionalRegulation: "Fair"
  }
};

const EMPTY_REVIEW_ENTRY: ReviewHistoryEntry = {
  date: "",
  typeOfReview: "",
  participants: "",
  summaryOfChanges: ""
};

export const SuccessPlan = ({ youthId, youth }: SuccessPlanProps) => {
  const [plan, setPlan] = useState<HeartlandSuccessPlan>({
    residentInfo: { ...EMPTY_RESIDENT_INFO },
    assessmentSummary: { ...EMPTY_ASSESSMENT_SUMMARY },
    permanencyObjective: {
      permanencyGoal: "Independent Living",
      anticipatedLengthOfStay: "12-18 months",
      transitionTimelineBenchmarks: "Month 3: Initial treatment goals assessment\nMonth 6: Mid-program review\nMonth 9: Transition planning begins\nMonth 12-18: Gradual community integration"
    },
    treatmentObjectives: {
      behavioralObjective1: "Resident will demonstrate appropriate conflict resolution skills in 4 out of 5 observed interactions with peers.",
      behavioralObjective2: "Resident will follow facility rules and expectations with minimal redirection for 7 consecutive days.",
      socialSkillsFocus: "Develop healthy peer relationships and practice appropriate social communication skills.",
      academicGoals: "Maintain passing grades in all courses and complete assignments on time.",
      familyEngagementGoals: "Participate in weekly family therapy sessions and improve communication with family members.",
      independentLivingSkills: "Learn basic life skills including budgeting, meal planning, and job readiness.",
      emotionalRegulationStrategies: "Utilize coping strategies for managing anger and frustration, including deep breathing and requesting breaks."
    },
    levelSystemIntegration: {
      currentLevelStatus: "Level 1 - Orientation Phase",
      requirementsForNextLevel: "Complete 30 days with no major incidents, participate in all required programming, demonstrate progress on treatment goals.",
      privilegesAtCurrentLevel: "Basic recreation time, supervised outings, phone calls twice per week.",
      incentivesForAdvancement: "Increased privileges, leadership opportunities, extended home visits."
    },
    specializedServices: {
      individualTherapy: true,
      groupInterventions: true,
      additionalServices: ["Educational Support", "Substance Abuse Treatment"]
    },
    transitionPlanning: {
      communityIntegrationActivities: "Volunteer work, community service projects, supervised employment opportunities.",
      supportSystemDevelopment: "Connection with mentors, peer support groups, and community organizations.",
      postDischargeResources: "Ongoing therapy services, educational support, housing assistance, and job placement services.",
      relapsePreventionPlanning: "Identification of triggers, development of coping strategies, and establishment of emergency contacts and procedures."
    },
    progressReviewSchedule: {
      weeklyReviews: "Every Tuesday at 10:00 AM - Review weekly goals and progress with assigned counselor.",
      monthlyTeamMeetings: "First Wednesday of each month - Full treatment team including therapist, case manager, and educational coordinator.",
      quarterlyComprehensiveReviews: "Comprehensive assessment every 3 months with family participation and discharge planning updates."
    },
    agreementSignatures: {
      residentAcknowledgement: "[Resident signature and date]",
      staffCertification: "[Primary counselor signature and date]",
      teamMemberEndorsements: ["[Treatment team signatures and dates]"],
      guardianFamilyParticipation: "[Guardian/family member signature and date]"
    },
    reviewHistory: [{ ...EMPTY_REVIEW_ENTRY }],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("resident-info");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  useEffect(() => {
    fetchPlan();
  }, [youthId]);

  // Re-sync resident info when youth profile data changes
  useEffect(() => {
    if (!isLoading && youth) {
      const formatDOBAge = () => {
        if (youth.dob) {
          const dobDate = new Date(youth.dob);
          const formattedDOB = dobDate.toLocaleDateString('en-US');
          const today = new Date();
          let age = today.getFullYear() - dobDate.getFullYear();
          const monthDiff = today.getMonth() - dobDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) age--;
          return `${formattedDOB} (Age: ${youth.age || age})`;
        } else if (youth.age) {
          return `Age: ${youth.age}`;
        }
        return "N/A";
      };

      const getContactInfo = () => {
        const contacts: string[] = [];
        if (youth.legalGuardian?.phone) contacts.push(`Guardian: ${youth.legalGuardian.phone}`);
        if (youth.mother?.phone) contacts.push(`Mother: ${youth.mother.phone}`);
        if (youth.father?.phone) contacts.push(`Father: ${youth.father.phone}`);
        if (findProfessional(youth, 'probationOfficer')?.phone) contacts.push(`PO: ${youth.probationOfficer.phone}`);
        return contacts.length > 0 ? contacts.join('\n') : "N/A";
      };

      setPlan(prev => ({
        ...prev,
        residentInfo: {
          ...prev.residentInfo,
          residentName: `${youth.firstName} ${youth.lastName}`,
          dateOfAdmission: youth.admissionDate
            ? new Date(youth.admissionDate).toISOString().split('T')[0]
            : prev.residentInfo.dateOfAdmission,
          idNumber: youth.idNumber || youth.id || prev.residentInfo.idNumber,
          dobAge: formatDOBAge(),
          referringAgency: youth.placingAgencyCounty || prev.residentInfo.referringAgency,
          caseWorker: findProfessional(youth, 'caseworker')?.name || prev.residentInfo.caseWorker,
          probationOfficer: findProfessional(youth, 'probationOfficer')?.name || prev.residentInfo.probationOfficer,
          levelStatus: youth.level != null ? `Level ${youth.level}` : prev.residentInfo.levelStatus,
          primaryGuardian: youth.legalGuardian?.name || prev.residentInfo.primaryGuardian,
          contactInfo: getContactInfo()
        }
      }));
    }
  }, [youth?.firstName, youth?.lastName, youth?.level, youth?.admissionDate, youth?.dob, youth?.idNumber, youth?.placingAgencyCounty, youth?.caseworker?.name, youth?.probationOfficer?.name, youth?.legalGuardian?.name, isLoading]);

  // Auto-save functionality
  const autoSave = useCallback(async (planData: HeartlandSuccessPlan) => {
    try {
      setIsSaving(true);
      
      const formattedData = {
        residentinfo: planData.residentInfo,
        assessmentsummary: planData.assessmentSummary,
        permanencyobjective: planData.permanencyObjective,
        treatmentobjectives: planData.treatmentObjectives,
        levelsystemintegration: planData.levelSystemIntegration,
        specializedservices: planData.specializedServices,
        transitionplanning: planData.transitionPlanning,
        progressreviewschedule: planData.progressReviewSchedule,
        agreementsignatures: planData.agreementSignatures,
        reviewhistory: planData.reviewHistory,
        createdat: planData.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };
      
      await saveAssessment(
        youthId,
        'successplans',
        'heartlandSuccessPlan',
        formattedData
      );
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error auto-saving service plan:", error);
    } finally {
      setIsSaving(false);
    }
  }, [youthId]);

  // Auto-save when plan changes (except during initial load)
  useEffect(() => {
    if (!isLoading && hasUnsavedChanges) {
      autoSave(plan);
    }
  }, [plan, autoSave, isLoading, hasUnsavedChanges]);
  
  const fetchPlan = async () => {
    try {
      setIsLoading(true);

      const planData = await fetchAssessment(youthId, 'successplans', 'heartlandSuccessPlan') as SuccessPlanData | null;

      // Helper functions for data enrichment
      const formatDOBAge = () => {
        if (youth?.dob) {
          const dobDate = new Date(youth.dob);
          const formattedDOB = dobDate.toLocaleDateString('en-US');
          const age = youth.age || calculateAge(dobDate);
          return `${formattedDOB} (Age: ${age})`;
        } else if (youth?.age) {
          return `Age: ${youth.age}`;
        }
        return "N/A";
      };

      const calculateAge = (birthDate: Date) => {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age;
      };

      const getContactInfo = () => {
        const contacts = [];
        if (youth?.legalGuardian?.phone) contacts.push(`Guardian: ${youth.legalGuardian.phone}`);
        if (youth?.mother?.phone) contacts.push(`Mother: ${youth.mother.phone}`);
        if (youth?.father?.phone) contacts.push(`Father: ${youth.father.phone}`);
        if (youth?.probationOfficer?.phone) contacts.push(`PO: ${youth.probationOfficer.phone}`);
        return contacts.length > 0 ? contacts.join('\n') : "N/A";
      };

      // Always sync resident info from youth profile so data stays consistent
      const enrichResidentInfo = (existingInfo: ResidentInfo | undefined) => {
        const existing = existingInfo || { ...EMPTY_RESIDENT_INFO };

        // Key fields always sync from the youth profile to stay consistent
        return {
          residentName: youth ? `${youth.firstName} ${youth.lastName}` : existing.residentName,
          dateOfAdmission: youth?.admissionDate
            ? new Date(youth.admissionDate).toISOString().split('T')[0]
            : existing.dateOfAdmission,
          idNumber: youth?.idNumber || youth?.id || existing.idNumber,
          dobAge: youth ? formatDOBAge() : existing.dobAge,
          referringAgency: youth?.placingAgencyCounty || existing.referringAgency,
          caseWorker: youth?.caseworker?.name || existing.caseWorker,
          probationOfficer: youth?.probationOfficer?.name || existing.probationOfficer,
          levelStatus: youth?.level != null ? `Level ${youth.level}` : existing.levelStatus,
          primaryGuardian: youth?.legalGuardian?.name || existing.primaryGuardian,
          contactInfo: youth ? getContactInfo() : existing.contactInfo
        };
      };

      if (planData) {
        setPlan({
          id: planData.id,
          residentInfo: enrichResidentInfo(planData.residentinfo),
          assessmentSummary: planData.assessmentsummary || { ...EMPTY_ASSESSMENT_SUMMARY },
          permanencyObjective: planData.permanencyobjective || {
            permanencyGoal: "",
            anticipatedLengthOfStay: "",
            transitionTimelineBenchmarks: ""
          },
          treatmentObjectives: planData.treatmentobjectives || {
            behavioralObjective1: "",
            behavioralObjective2: "",
            socialSkillsFocus: "",
            academicGoals: "",
            familyEngagementGoals: "",
            independentLivingSkills: "",
            emotionalRegulationStrategies: ""
          },
          levelSystemIntegration: planData.levelsystemintegration || {
            currentLevelStatus: "",
            requirementsForNextLevel: "",
            privilegesAtCurrentLevel: "",
            incentivesForAdvancement: ""
          },
          specializedServices: planData.specializedservices || {
            individualTherapy: false,
            groupInterventions: false,
            additionalServices: []
          },
          transitionPlanning: planData.transitionplanning || {
            communityIntegrationActivities: "",
            supportSystemDevelopment: "",
            postDischargeResources: "",
            relapsePreventionPlanning: ""
          },
          progressReviewSchedule: planData.progressreviewschedule || {
            weeklyReviews: "",
            monthlyTeamMeetings: "",
            quarterlyComprehensiveReviews: ""
          },
          agreementSignatures: planData.agreementsignatures || {
            residentAcknowledgement: "",
            staffCertification: "",
            teamMemberEndorsements: [],
            guardianFamilyParticipation: ""
          },
          reviewHistory: planData.reviewhistory || [{ ...EMPTY_REVIEW_ENTRY }],
          createdAt: planData.createdat ? new Date(planData.createdat) : new Date(),
          updatedAt: planData.updatedat ? new Date(planData.updatedat) : new Date()
        });
      } else {
        // Initialize with default plan and populate with youth information
        setPlan(prev => ({
          ...prev,
          residentInfo: enrichResidentInfo(undefined)
        }));
      }
    } catch (error) {
      console.error("Error fetching service plan:", error);
      toast.error("Failed to load service plan");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSavePlan = async () => {
    try {
      setIsSaving(true);
      
      const formattedData = {
        residentinfo: plan.residentInfo,
        assessmentsummary: plan.assessmentSummary,
        permanencyobjective: plan.permanencyObjective,
        treatmentobjectives: plan.treatmentObjectives,
        levelsystemintegration: plan.levelSystemIntegration,
        specializedservices: plan.specializedServices,
        transitionplanning: plan.transitionPlanning,
        progressreviewschedule: plan.progressReviewSchedule,
        agreementsignatures: plan.agreementSignatures,
        reviewhistory: plan.reviewHistory,
        createdat: plan.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };
      
      await saveAssessment(
        youthId,
        'successplans',
        'heartlandSuccessPlan',
        formattedData
      );
      
      toast.success("Heartland Service Plan saved successfully");
    } catch (error) {
      console.error("Error saving service plan:", error);
      toast.error("Failed to save service plan");
    } finally {
      setIsSaving(false);
    }
  };

  // Handler functions for different sections
  const handleResidentInfoChange = (field: keyof ResidentInfo, value: string) => {
    setPlan(prev => ({
      ...prev,
      residentInfo: {
        ...prev.residentInfo,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleAssessmentSummaryChange = (field: keyof AssessmentSummary, value: string | string[]) => {
    setPlan(prev => ({
      ...prev,
      assessmentSummary: {
        ...prev.assessmentSummary,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleBaselineFunctioningChange = (field: keyof AssessmentSummary['baselineFunctioning'], value: string) => {
    setPlan(prev => ({
      ...prev,
      assessmentSummary: {
        ...prev.assessmentSummary,
        baselineFunctioning: {
          ...prev.assessmentSummary.baselineFunctioning,
          [field]: value
        }
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleRiskFactorChange = (factor: string, checked: boolean) => {
    setPlan(prev => {
      const currentFactors = prev.assessmentSummary.riskFactors;
      const updatedFactors = checked 
        ? [...currentFactors, factor]
        : currentFactors.filter(f => f !== factor);
      
      return {
        ...prev,
        assessmentSummary: {
          ...prev.assessmentSummary,
          riskFactors: updatedFactors
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handlePermanencyObjectiveChange = (field: keyof PermanencyObjective, value: string) => {
    setPlan(prev => ({
      ...prev,
      permanencyObjective: {
        ...prev.permanencyObjective,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleTreatmentObjectivesChange = (field: keyof TreatmentObjectives, value: string) => {
    setPlan(prev => ({
      ...prev,
      treatmentObjectives: {
        ...prev.treatmentObjectives,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleLevelSystemChange = (field: keyof LevelSystemIntegration, value: string) => {
    setPlan(prev => ({
      ...prev,
      levelSystemIntegration: {
        ...prev.levelSystemIntegration,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSpecializedServicesChange = (field: keyof SpecializedServices, value: boolean | string[]) => {
    setPlan(prev => ({
      ...prev,
      specializedServices: {
        ...prev.specializedServices,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleAdditionalServiceChange = (service: string, checked: boolean) => {
    setPlan(prev => {
      const currentServices = prev.specializedServices.additionalServices;
      const updatedServices = checked 
        ? [...currentServices, service]
        : currentServices.filter(s => s !== service);
      
      return {
        ...prev,
        specializedServices: {
          ...prev.specializedServices,
          additionalServices: updatedServices
        }
      };
    });
    setHasUnsavedChanges(true);
  };

  const handleTransitionPlanningChange = (field: keyof TransitionPlanning, value: string) => {
    setPlan(prev => ({
      ...prev,
      transitionPlanning: {
        ...prev.transitionPlanning,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleProgressReviewChange = (field: keyof ProgressReviewSchedule, value: string) => {
    setPlan(prev => ({
      ...prev,
      progressReviewSchedule: {
        ...prev.progressReviewSchedule,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleSignatureChange = (field: keyof AgreementSignatures, value: string | string[]) => {
    setPlan(prev => ({
      ...prev,
      agreementSignatures: {
        ...prev.agreementSignatures,
        [field]: value
      }
    }));
    setHasUnsavedChanges(true);
  };

  const handleReviewHistoryChange = (index: number, field: keyof ReviewHistoryEntry, value: string) => {
    const updatedHistory = [...plan.reviewHistory];
    updatedHistory[index] = {
      ...updatedHistory[index],
      [field]: value
    };
    setPlan(prev => ({
      ...prev,
      reviewHistory: updatedHistory
    }));
    setHasUnsavedChanges(true);
  };

  const addReviewEntry = () => {
    setPlan(prev => ({
      ...prev,
      reviewHistory: [...prev.reviewHistory, { ...EMPTY_REVIEW_ENTRY }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeReviewEntry = (index: number) => {
    const updatedHistory = [...plan.reviewHistory];
    updatedHistory.splice(index, 1);
    setPlan(prev => ({
      ...prev,
      reviewHistory: updatedHistory
    }));
    setHasUnsavedChanges(true);
  };
  
  const handlePrintPlan = () => {
    try {
      if (typeof window === 'undefined') {
        toast.error("Printing is only available in the browser");
        return;
      }

      // Ensure we have basic resident info populated from youth data if empty
      const formatDOBAge = () => {
        if (youth?.dob) {
          const dobDate = new Date(youth.dob);
          const formattedDOB = dobDate.toLocaleDateString('en-US');
          const age = youth.age || (() => {
            const today = new Date();
            let calcAge = today.getFullYear() - dobDate.getFullYear();
            const monthDiff = today.getMonth() - dobDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
              calcAge--;
            }
            return calcAge;
          })();
          return `${formattedDOB} (Age: ${age})`;
        } else if (youth?.age) {
          return `Age: ${youth.age}`;
        }
        return 'N/A';
      };

      const enrichedPlan = {
        ...plan,
        residentInfo: {
          ...plan.residentInfo,
          residentName: plan.residentInfo.residentName || `${youth?.firstName || ''} ${youth?.lastName || ''}`.trim() || 'N/A',
          dateOfAdmission: plan.residentInfo.dateOfAdmission || (youth?.admissionDate ? new Date(youth.admissionDate).toISOString().split('T')[0] : 'N/A'),
          idNumber: plan.residentInfo.idNumber || youth?.id || 'N/A',
          dobAge: plan.residentInfo.dobAge || formatDOBAge(),
          referringAgency: plan.residentInfo.referringAgency || youth?.placingAgencyCounty || 'N/A',
          caseWorker: plan.residentInfo.caseWorker || youth?.caseworker?.name || 'N/A',
          probationOfficer: plan.residentInfo.probationOfficer || youth?.probationOfficer?.name || 'N/A',
          levelStatus: plan.residentInfo.levelStatus || (youth?.level ? `Level ${youth.level}` : 'N/A'),
          primaryGuardian: plan.residentInfo.primaryGuardian || youth?.legalGuardian?.name || 'N/A',
          contactInfo: plan.residentInfo.contactInfo || (() => {
            const contacts = [];
            if (youth?.legalGuardian?.phone) contacts.push(`Guardian: ${youth.legalGuardian.phone}`);
            if (youth?.mother?.phone) contacts.push(`Mother: ${youth.mother.phone}`);
            if (youth?.father?.phone) contacts.push(`Father: ${youth.father.phone}`);
            if (youth?.probationOfficer?.phone) contacts.push(`PO: ${youth.probationOfficer.phone}`);
            return contacts.length > 0 ? contacts.join('\n') : 'N/A';
          })()
        },
        assessmentSummary: {
          ...plan.assessmentSummary,
          identifiedStrengths: plan.assessmentSummary.identifiedStrengths || youth?.strengthsTalents || 'N/A',
          presentingConcerns: plan.assessmentSummary.presentingConcerns || youth?.behaviorProblems || youth?.referralReason || 'N/A',
          academicStatus: plan.assessmentSummary.academicStatus || (() => {
            const parts = [];
            if (youth?.currentGrade) parts.push(`Grade: ${youth.currentGrade}`);
            if (youth?.lastSchoolAttended) parts.push(`School: ${youth.lastSchoolAttended}`);
            if (youth?.hasIEP) parts.push('Has IEP');
            return parts.length > 0 ? parts.join(', ') : 'N/A';
          })(),
          familyDynamics: plan.assessmentSummary.familyDynamics || (() => {
            const parts = [];
            if (youth?.mother?.name) parts.push(`Mother: ${youth.mother.name}`);
            if (youth?.father?.name) parts.push(`Father: ${youth.father.name}`);
            if (youth?.legalGuardian?.name && youth.legalGuardian.relationship) parts.push(`Guardian: ${youth.legalGuardian.name} (${youth.legalGuardian.relationship})`);
            return parts.length > 0 ? parts.join(', ') : 'N/A';
          })()
        }
      };

      const printHtml = generateHeartlandSuccessPlanHTML({
        youth,
        plan: enrichedPlan,
        exportDate: new Date().toLocaleDateString()
      });

      // Create a secure popup window
      const printWindow = window.open('about:blank', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      if (!printWindow) {
        toast.error("Please allow pop-ups to print the service plan");
        return;
      }

      // Set up the document with proper security headers
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();

      // Wait for images and styles to load before printing
      const triggerPrint = () => {
        try {
          printWindow.focus();
          printWindow.print();
          setTimeout(() => {
            printWindow.close();
          }, 1000);
        } catch (printError) {
          console.warn('Print error:', printError);
          printWindow.close();
        }
      };

      // Enhanced loading detection
      if (printWindow.document.readyState === 'complete') {
        setTimeout(triggerPrint, 500);
      } else {
        printWindow.addEventListener('load', () => {
          setTimeout(triggerPrint, 500);
        }, { once: true });
      }
    } catch (error) {
      console.error("Error printing service plan:", error);
      toast.error("Failed to print service plan");
    }
  };
  
  const handleExportPdf = async () => {
    try {
      const { exportHTMLToPDF } = await import('@/utils/export');

      // Use the same enrichment logic as print for consistency
      const formatDOBAge = () => {
        if (youth?.dob) {
          const dobDate = new Date(youth.dob);
          const formattedDOB = dobDate.toLocaleDateString('en-US');
          const age = youth.age || (() => {
            const today = new Date();
            let calcAge = today.getFullYear() - dobDate.getFullYear();
            const monthDiff = today.getMonth() - dobDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
              calcAge--;
            }
            return calcAge;
          })();
          return `${formattedDOB} (Age: ${age})`;
        } else if (youth?.age) {
          return `Age: ${youth.age}`;
        }
        return 'N/A';
      };

      const enrichedPlan = {
        ...plan,
        residentInfo: {
          ...plan.residentInfo,
          residentName: plan.residentInfo.residentName || `${youth?.firstName || ''} ${youth?.lastName || ''}`.trim() || 'N/A',
          dateOfAdmission: plan.residentInfo.dateOfAdmission || (youth?.admissionDate ? new Date(youth.admissionDate).toISOString().split('T')[0] : 'N/A'),
          idNumber: plan.residentInfo.idNumber || youth?.id || 'N/A',
          dobAge: plan.residentInfo.dobAge || formatDOBAge(),
          referringAgency: plan.residentInfo.referringAgency || youth?.placingAgencyCounty || 'N/A',
          caseWorker: plan.residentInfo.caseWorker || youth?.caseworker?.name || 'N/A',
          probationOfficer: plan.residentInfo.probationOfficer || youth?.probationOfficer?.name || 'N/A',
          levelStatus: plan.residentInfo.levelStatus || (youth?.level ? `Level ${youth.level}` : 'N/A'),
          primaryGuardian: plan.residentInfo.primaryGuardian || youth?.legalGuardian?.name || 'N/A',
          contactInfo: plan.residentInfo.contactInfo || (() => {
            const contacts = [];
            if (youth?.legalGuardian?.phone) contacts.push(`Guardian: ${youth.legalGuardian.phone}`);
            if (youth?.mother?.phone) contacts.push(`Mother: ${youth.mother.phone}`);
            if (youth?.father?.phone) contacts.push(`Father: ${youth.father.phone}`);
            if (youth?.probationOfficer?.phone) contacts.push(`PO: ${youth.probationOfficer.phone}`);
            return contacts.length > 0 ? contacts.join('\n') : 'N/A';
          })()
        },
        assessmentSummary: {
          ...plan.assessmentSummary,
          identifiedStrengths: plan.assessmentSummary.identifiedStrengths || youth?.strengthsTalents || 'N/A',
          presentingConcerns: plan.assessmentSummary.presentingConcerns || youth?.behaviorProblems || youth?.referralReason || 'N/A',
          academicStatus: plan.assessmentSummary.academicStatus || (() => {
            const parts = [];
            if (youth?.currentGrade) parts.push(`Grade: ${youth.currentGrade}`);
            if (youth?.lastSchoolAttended) parts.push(`School: ${youth.lastSchoolAttended}`);
            if (youth?.hasIEP) parts.push('Has IEP');
            return parts.length > 0 ? parts.join(', ') : 'N/A';
          })(),
          familyDynamics: plan.assessmentSummary.familyDynamics || (() => {
            const parts = [];
            if (youth?.mother?.name) parts.push(`Mother: ${youth.mother.name}`);
            if (youth?.father?.name) parts.push(`Father: ${youth.father.name}`);
            if (youth?.legalGuardian?.name && youth.legalGuardian.relationship) parts.push(`Guardian: ${youth.legalGuardian.name} (${youth.legalGuardian.relationship})`);
            return parts.length > 0 ? parts.join(', ') : 'N/A';
          })()
        }
      };

      // Use the same HTML generation function as print
      const html = generateHeartlandSuccessPlanHTML({
        youth: youth || {},
        plan: enrichedPlan,
        exportDate: new Date().toLocaleDateString()
      });

      const filename = `${buildReportFilename(youth || {}, "Service Plan")}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast.success("Service plan exported successfully!");
    } catch (error) {
      console.error("Error exporting service plan:", error);
      toast.error("Failed to export service plan");
    }
  };

  const generateHeartlandSuccessPlanHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Heartland Boys Home - Resident Success Plan</title>
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
            .resident-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .section { margin-bottom: 30px; page-break-inside: avoid; }
            .section-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .field { margin-bottom: 8px; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; white-space: pre-wrap; word-break: break-word; }
            .checkbox-group { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0; }
            .checkbox-item { margin-right: 15px; }
            .rating-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr; gap: 10px; margin: 10px 0; }
            .rating-header { font-weight: bold; text-align: center; padding: 5px; background-color: #e5e7eb; }
            .rating-cell { text-align: center; padding: 5px; border: 1px solid #d1d5db; }
            .signature-section { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; }
            .signature-line { border-bottom: 1px solid #000; width: 300px; display: inline-block; margin: 0 10px; }
            @media print { body { margin: 0; } .section { page-break-inside: avoid; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${import.meta.env.BASE_URL}files/BoysHomeLogo.png" alt="Heartland Boys Home Logo" class="logo" crossorigin="anonymous" />
            <h1>Heartland Boys Home</h1>
            <h2>Resident Service Plan</h2>
            <p>Generated on ${data.exportDate || new Date().toLocaleDateString()}</p>
          </div>

          <div class="resident-info">
            <h3>Resident Information</h3>
            <div class="field">
              <span class="field-label">Resident Name:</span>
              <span class="field-value">${data.plan.residentInfo?.residentName || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Date of Admission:</span>
              <span class="field-value">${data.plan.residentInfo?.dateOfAdmission || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">ID Number:</span>
              <span class="field-value">${data.plan.residentInfo?.idNumber || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">DOB/Age:</span>
              <span class="field-value">${data.plan.residentInfo?.dobAge || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Referring Agency:</span>
              <span class="field-value">${data.plan.residentInfo?.referringAgency || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Case Worker:</span>
              <span class="field-value">${data.plan.residentInfo?.caseWorker || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Probation Officer:</span>
              <span class="field-value">${data.plan.residentInfo?.probationOfficer || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Level Status:</span>
              <span class="field-value">${data.plan.residentInfo?.levelStatus || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Primary Guardian:</span>
              <span class="field-value">${data.plan.residentInfo?.primaryGuardian || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Contact Info:</span>
              <span class="field-value">${data.plan.residentInfo?.contactInfo || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Assessment Summary</div>
            <div class="field">
              <span class="field-label">Presenting Concerns:</span>
              <span class="field-value">${data.plan.assessmentSummary?.presentingConcerns || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Identified Strengths:</span>
              <span class="field-value">${data.plan.assessmentSummary?.identifiedStrengths || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Academic Status:</span>
              <span class="field-value">${data.plan.assessmentSummary?.academicStatus || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Family Dynamics:</span>
              <span class="field-value">${data.plan.assessmentSummary?.familyDynamics || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Risk Factors:</span>
              <span class="field-value">${data.plan.assessmentSummary?.riskFactors?.join(', ') || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Permanency Objective</div>
            <div class="field">
              <span class="field-label">Permanency Goal:</span>
              <span class="field-value">${data.plan.permanencyObjective?.permanencyGoal || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Anticipated Length of Stay:</span>
              <span class="field-value">${data.plan.permanencyObjective?.anticipatedLengthOfStay || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Transition Timeline Benchmarks:</span>
              <span class="field-value">${data.plan.permanencyObjective?.transitionTimelineBenchmarks || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Treatment Objectives</div>
            <div class="field">
              <span class="field-label">Behavioral Objective 1:</span>
              <span class="field-value">${data.plan.treatmentObjectives?.behavioralObjective1 || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Behavioral Objective 2:</span>
              <span class="field-value">${data.plan.treatmentObjectives?.behavioralObjective2 || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Social Skills Focus:</span>
              <span class="field-value">${data.plan.treatmentObjectives?.socialSkillsFocus || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Academic Goals:</span>
              <span class="field-value">${data.plan.treatmentObjectives?.academicGoals || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Family Engagement Goals:</span>
              <span class="field-value">${data.plan.treatmentObjectives?.familyEngagementGoals || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Level System Integration</div>
            <div class="field">
              <span class="field-label">Current Level Status:</span>
              <span class="field-value">${data.plan.levelSystemIntegration?.currentLevelStatus || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Requirements for Next Level:</span>
              <span class="field-value">${data.plan.levelSystemIntegration?.requirementsForNextLevel || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Specialized Services & Supports</div>
            <div class="field">
              <span class="field-label">Individual Therapy:</span>
              <span class="field-value">${data.plan.specializedServices?.individualTherapy ? 'Yes' : 'No'}</span>
            </div>
            <div class="field">
              <span class="field-label">Group Interventions:</span>
              <span class="field-value">${data.plan.specializedServices?.groupInterventions ? 'Yes' : 'No'}</span>
            </div>
            <div class="field">
              <span class="field-label">Additional Services:</span>
              <span class="field-value">${data.plan.specializedServices?.additionalServices?.join(', ') || 'N/A'}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Transition & Discharge Planning</div>
            <div class="field">
              <span class="field-label">Community Integration Activities:</span>
              <span class="field-value">${data.plan.transitionPlanning?.communityIntegrationActivities || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Support System Development:</span>
              <span class="field-value">${data.plan.transitionPlanning?.supportSystemDevelopment || 'N/A'}</span>
            </div>
            <div class="field">
              <span class="field-label">Post-Discharge Resources:</span>
              <span class="field-value">${data.plan.transitionPlanning?.postDischargeResources || 'N/A'}</span>
            </div>
          </div>

          <div class="signature-section">
            <div class="section-title">Agreement & Signatures</div>
            <div class="field">
              <span class="field-label">Resident Acknowledgement:</span>
              <span class="signature-line">${data.plan.agreementSignatures?.residentAcknowledgement || ''}</span>
              <span>Date: ___________</span>
            </div>
            <div class="field">
              <span class="field-label">Staff Certification:</span>
              <span class="signature-line">${data.plan.agreementSignatures?.staffCertification || ''}</span>
              <span>Date: ___________</span>
            </div>
            <div class="field">
              <span class="field-label">Guardian/Family Participation:</span>
              <span class="signature-line">${data.plan.agreementSignatures?.guardianFamilyParticipation || ''}</span>
              <span>Date: ___________</span>
            </div>
          </div>
        </body>
      </html>
    `;
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service plan...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Heartland Boys Home - Resident Service Plan</h2>
          <p className="text-gray-600 mb-4">
            Comprehensive service plan for residential facility residents.
          </p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintPlan}>
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSavePlan} disabled={isSaving} variant={hasUnsavedChanges ? "default" : "outline"}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Auto-saving..." : hasUnsavedChanges ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heartland Boys Home - Resident Service Plan</CardTitle>
          <CardDescription>
            Comprehensive service plan documenting all aspects of residential care and treatment objectives.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-10">
              <TabsTrigger value="resident-info">Resident Info</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
              <TabsTrigger value="permanency">Permanency</TabsTrigger>
              <TabsTrigger value="treatment">Treatment</TabsTrigger>
              <TabsTrigger value="level-system">Level System</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="transition">Transition</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="signatures">Signatures</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            {/* Resident Information Tab */}
            <TabsContent value="resident-info">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resident-name">Resident Name</Label>
                    <Input
                      id="resident-name"
                      value={plan.residentInfo.residentName}
                      onChange={(e) => handleResidentInfoChange("residentName", e.target.value)}
                      placeholder="Enter resident name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="admission-date">Date of Admission</Label>
                    <Input
                      id="admission-date"
                      type="date"
                      value={plan.residentInfo.dateOfAdmission}
                      onChange={(e) => handleResidentInfoChange("dateOfAdmission", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="id-number">ID Number</Label>
                    <Input
                      id="id-number"
                      value={plan.residentInfo.idNumber}
                      onChange={(e) => handleResidentInfoChange("idNumber", e.target.value)}
                      placeholder="Enter ID number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dob-age">DOB/Age</Label>
                    <Input
                      id="dob-age"
                      value={plan.residentInfo.dobAge}
                      onChange={(e) => handleResidentInfoChange("dobAge", e.target.value)}
                      placeholder="MM/DD/YYYY (Age)"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="referring-agency">Referring Agency</Label>
                    <Input
                      id="referring-agency"
                      value={plan.residentInfo.referringAgency}
                      onChange={(e) => handleResidentInfoChange("referringAgency", e.target.value)}
                      placeholder="Enter referring agency"
                    />
                  </div>
                  <div>
                    <Label htmlFor="case-worker">Case Worker</Label>
                    <Input
                      id="case-worker"
                      value={plan.residentInfo.caseWorker}
                      onChange={(e) => handleResidentInfoChange("caseWorker", e.target.value)}
                      placeholder="Enter case worker name"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="probation-officer">Probation Officer</Label>
                    <Input
                      id="probation-officer"
                      value={plan.residentInfo.probationOfficer}
                      onChange={(e) => handleResidentInfoChange("probationOfficer", e.target.value)}
                      placeholder="Enter probation officer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="level-status">Level Status</Label>
                    <Select value={plan.residentInfo.levelStatus} onValueChange={(value) => handleResidentInfoChange("levelStatus", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level status" />
                      </SelectTrigger>
                      <SelectContent>
                        {LEVEL_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-guardian">Primary Guardian</Label>
                    <Input
                      id="primary-guardian"
                      value={plan.residentInfo.primaryGuardian}
                      onChange={(e) => handleResidentInfoChange("primaryGuardian", e.target.value)}
                      placeholder="Enter primary guardian name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact-info">Contact Info</Label>
                    <Textarea
                      id="contact-info"
                      value={plan.residentInfo.contactInfo}
                      onChange={(e) => handleResidentInfoChange("contactInfo", e.target.value)}
                      placeholder="Enter contact information"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Assessment Summary Tab */}
            <TabsContent value="assessment">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="presenting-concerns">Presenting Concerns</Label>
                  <Textarea
                    id="presenting-concerns"
                    value={plan.assessmentSummary.presentingConcerns}
                    onChange={(e) => handleAssessmentSummaryChange("presentingConcerns", e.target.value)}
                    placeholder="Describe the primary concerns that led to placement..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="identified-strengths">Identified Strengths</Label>
                  <Textarea
                    id="identified-strengths"
                    value={plan.assessmentSummary.identifiedStrengths}
                    onChange={(e) => handleAssessmentSummaryChange("identifiedStrengths", e.target.value)}
                    placeholder="List the resident's strengths and positive attributes..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="academic-status">Academic Status</Label>
                  <Textarea
                    id="academic-status"
                    value={plan.assessmentSummary.academicStatus}
                    onChange={(e) => handleAssessmentSummaryChange("academicStatus", e.target.value)}
                    placeholder="Current academic performance, grade level, special needs..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="family-dynamics">Family Dynamics</Label>
                  <Textarea
                    id="family-dynamics"
                    value={plan.assessmentSummary.familyDynamics}
                    onChange={(e) => handleAssessmentSummaryChange("familyDynamics", e.target.value)}
                    placeholder="Family structure, relationships, support systems..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label className="text-base font-medium">Risk Factors</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                    {RISK_FACTORS.map(factor => (
                      <div key={factor} className="flex items-center space-x-2">
                        <Checkbox
                          id={`risk-${factor}`}
                          checked={plan.assessmentSummary.riskFactors.includes(factor)}
                          onCheckedChange={(checked) => handleRiskFactorChange(factor, checked as boolean)}
                        />
                        <Label htmlFor={`risk-${factor}`} className="text-sm">{factor}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Baseline Functioning</Label>
                  <div className="space-y-3 mt-2">
                    {FUNCTIONING_AREAS.map(area => (
                      <div key={area} className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{FUNCTIONING_AREA_LABELS[area]}</Label>
                        <RadioGroup
                          value={plan.assessmentSummary.baselineFunctioning[area] || ""}
                          onValueChange={(value) => handleBaselineFunctioningChange(area, value)}
                          className="flex space-x-2"
                        >
                          {FUNCTIONING_LEVELS.map(level => (
                            <div key={level} className="flex items-center space-x-1">
                              <RadioGroupItem value={level} id={`${area}-${level}`} />
                              <Label htmlFor={`${area}-${level}`} className="text-xs">{level}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Permanency Objective Tab */}
            <TabsContent value="permanency">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">Identified Permanency Goal</Label>
                  <RadioGroup
                    value={plan.permanencyObjective.permanencyGoal}
                    onValueChange={(value) => handlePermanencyObjectiveChange("permanencyGoal", value)}
                    className="mt-2"
                  >
                    {PERMANENCY_GOALS.map(goal => (
                      <div key={goal} className="flex items-center space-x-2">
                        <RadioGroupItem value={goal} id={`perm-${goal.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`} />
                        <Label htmlFor={`perm-${goal.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`}>{goal}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                
                <div>
                  <Label htmlFor="length-of-stay">Anticipated Length of Stay</Label>
                  <Input
                    id="length-of-stay"
                    value={plan.permanencyObjective.anticipatedLengthOfStay}
                    onChange={(e) => handlePermanencyObjectiveChange("anticipatedLengthOfStay", e.target.value)}
                    placeholder="e.g., 6-12 months"
                  />
                </div>
                
                <div>
                  <Label htmlFor="transition-timeline">Transition Timeline Benchmarks</Label>
                  <Textarea
                    id="transition-timeline"
                    value={plan.permanencyObjective.transitionTimelineBenchmarks}
                    onChange={(e) => handlePermanencyObjectiveChange("transitionTimelineBenchmarks", e.target.value)}
                    placeholder="List key milestones and target dates for transition planning..."
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>
            
            {/* Treatment Objectives Tab */}
            <TabsContent value="treatment">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="behavioral-objective-1">Behavioral Objective 1</Label>
                  <Textarea
                    id="behavioral-objective-1"
                    value={plan.treatmentObjectives.behavioralObjective1}
                    onChange={(e) => handleTreatmentObjectivesChange("behavioralObjective1", e.target.value)}
                    placeholder="Specific behavioral goal with measurable outcomes..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="behavioral-objective-2">Behavioral Objective 2</Label>
                  <Textarea
                    id="behavioral-objective-2"
                    value={plan.treatmentObjectives.behavioralObjective2}
                    onChange={(e) => handleTreatmentObjectivesChange("behavioralObjective2", e.target.value)}
                    placeholder="Additional behavioral goal with measurable outcomes..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="social-skills-focus">Social Skills Focus</Label>
                  <Textarea
                    id="social-skills-focus"
                    value={plan.treatmentObjectives.socialSkillsFocus}
                    onChange={(e) => handleTreatmentObjectivesChange("socialSkillsFocus", e.target.value)}
                    placeholder="Social skills development goals and strategies..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="academic-goals">Academic Goals</Label>
                  <Textarea
                    id="academic-goals"
                    value={plan.treatmentObjectives.academicGoals}
                    onChange={(e) => handleTreatmentObjectivesChange("academicGoals", e.target.value)}
                    placeholder="Educational objectives and support needs..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="family-engagement">Family Engagement Goals</Label>
                  <Textarea
                    id="family-engagement"
                    value={plan.treatmentObjectives.familyEngagementGoals}
                    onChange={(e) => handleTreatmentObjectivesChange("familyEngagementGoals", e.target.value)}
                    placeholder="Family involvement and relationship building goals..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="independent-living">Independent Living Skills</Label>
                  <Textarea
                    id="independent-living"
                    value={plan.treatmentObjectives.independentLivingSkills}
                    onChange={(e) => handleTreatmentObjectivesChange("independentLivingSkills", e.target.value)}
                    placeholder="Life skills development and self-sufficiency goals..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="emotional-regulation">Emotional Regulation Strategies</Label>
                  <Textarea
                    id="emotional-regulation"
                    value={plan.treatmentObjectives.emotionalRegulationStrategies}
                    onChange={(e) => handleTreatmentObjectivesChange("emotionalRegulationStrategies", e.target.value)}
                    placeholder="Coping strategies and emotional management techniques..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Level System Integration Tab */}
            <TabsContent value="level-system">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current-level">Current Level Status</Label>
                  <Input
                    id="current-level"
                    value={plan.levelSystemIntegration.currentLevelStatus}
                    onChange={(e) => handleLevelSystemChange("currentLevelStatus", e.target.value)}
                    placeholder="e.g., Level 2"
                  />
                </div>
                
                <div>
                  <Label htmlFor="next-level-requirements">Requirements for Next Level</Label>
                  <Textarea
                    id="next-level-requirements"
                    value={plan.levelSystemIntegration.requirementsForNextLevel}
                    onChange={(e) => handleLevelSystemChange("requirementsForNextLevel", e.target.value)}
                    placeholder="Specific criteria and behaviors needed for advancement..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="current-privileges">Privileges at Current Level</Label>
                  <Textarea
                    id="current-privileges"
                    value={plan.levelSystemIntegration.privilegesAtCurrentLevel}
                    onChange={(e) => handleLevelSystemChange("privilegesAtCurrentLevel", e.target.value)}
                    placeholder="Current privileges and freedoms available..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="advancement-incentives">Incentives for Advancement</Label>
                  <Textarea
                    id="advancement-incentives"
                    value={plan.levelSystemIntegration.incentivesForAdvancement}
                    onChange={(e) => handleLevelSystemChange("incentivesForAdvancement", e.target.value)}
                    placeholder="Motivational rewards and recognition for progress..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Specialized Services Tab */}
            <TabsContent value="services">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="individual-therapy"
                    checked={plan.specializedServices.individualTherapy}
                    onCheckedChange={(checked) => handleSpecializedServicesChange("individualTherapy", checked as boolean)}
                  />
                  <Label htmlFor="individual-therapy">Individual Therapy</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="group-interventions"
                    checked={plan.specializedServices.groupInterventions}
                    onCheckedChange={(checked) => handleSpecializedServicesChange("groupInterventions", checked as boolean)}
                  />
                  <Label htmlFor="group-interventions">Group Interventions</Label>
                </div>
                
                <div>
                  <Label className="text-base font-medium">Additional Services</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {ADDITIONAL_SERVICES.map(service => (
                      <div key={service} className="flex items-center space-x-2">
                        <Checkbox
                          id={`service-${service}`}
                          checked={plan.specializedServices.additionalServices.includes(service)}
                          onCheckedChange={(checked) => {
                            const currentServices = plan.specializedServices.additionalServices;
                            const updatedServices = checked 
                              ? [...currentServices, service]
                              : currentServices.filter(s => s !== service);
                            handleSpecializedServicesChange("additionalServices", updatedServices);
                          }}
                        />
                        <Label htmlFor={`service-${service}`} className="text-sm">{service}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Transition Planning Tab */}
            <TabsContent value="transition">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="community-integration">Community Integration Activities</Label>
                  <Textarea
                    id="community-integration"
                    value={plan.transitionPlanning.communityIntegrationActivities}
                    onChange={(e) => handleTransitionPlanningChange("communityIntegrationActivities", e.target.value)}
                    placeholder="Activities to help integrate into the community..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="support-system-development">Support System Development</Label>
                  <Textarea
                    id="support-system-development"
                    value={plan.transitionPlanning.supportSystemDevelopment}
                    onChange={(e) => handleTransitionPlanningChange("supportSystemDevelopment", e.target.value)}
                    placeholder="Building ongoing support networks..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="post-discharge-resources">Post-Discharge Resources</Label>
                  <Textarea
                    id="post-discharge-resources"
                    value={plan.transitionPlanning.postDischargeResources}
                    onChange={(e) => handleTransitionPlanningChange("postDischargeResources", e.target.value)}
                    placeholder="Resources and services available after discharge..."
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="relapse-prevention">Relapse Prevention Planning</Label>
                  <Textarea
                    id="relapse-prevention"
                    value={plan.transitionPlanning.relapsePreventionPlanning}
                    onChange={(e) => handleTransitionPlanningChange("relapsePreventionPlanning", e.target.value)}
                    placeholder="Strategies to prevent setbacks and maintain progress..."
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Progress Review Tab */}
            <TabsContent value="reviews">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="weekly-reviews">Weekly Reviews</Label>
                  <Textarea
                    id="weekly-reviews"
                    value={plan.progressReviewSchedule.weeklyReviews}
                    onChange={(e) => handleProgressReviewChange("weeklyReviews", e.target.value)}
                    placeholder="Weekly review schedule and focus areas..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="monthly-meetings">Monthly Team Meetings</Label>
                  <Textarea
                    id="monthly-meetings"
                    value={plan.progressReviewSchedule.monthlyTeamMeetings}
                    onChange={(e) => handleProgressReviewChange("monthlyTeamMeetings", e.target.value)}
                    placeholder="Monthly team meeting schedule and participants..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="quarterly-reviews">Quarterly Comprehensive Reviews</Label>
                  <Textarea
                    id="quarterly-reviews"
                    value={plan.progressReviewSchedule.quarterlyComprehensiveReviews}
                    onChange={(e) => handleProgressReviewChange("quarterlyComprehensiveReviews", e.target.value)}
                    placeholder="Quarterly comprehensive review process..."
                    rows={3}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Signatures Tab */}
            <TabsContent value="signatures">
              <div className="space-y-6">
                <div className="border rounded-lg p-4">
                  <Label className="text-base font-medium">Resident Acknowledgement</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Resident signature"
                      value={plan.agreementSignatures.residentAcknowledgement}
                      onChange={(e) => handleSignatureChange("residentAcknowledgement", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Label className="text-base font-medium">Staff Certification</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Staff member name and signature"
                      value={plan.agreementSignatures.staffCertification}
                      onChange={(e) => handleSignatureChange("staffCertification", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Label className="text-base font-medium">Team Member Endorsements</Label>
                  <div className="mt-2 space-y-2">
                    <Textarea
                      placeholder="Team member names and signatures"
                      value={plan.agreementSignatures.teamMemberEndorsements.join('\n')}
                      onChange={(e) => handleSignatureChange("teamMemberEndorsements", e.target.value.split('\n').filter(line => line.trim()))}
                      rows={3}
                    />
                  </div>
                </div>
                
                <div className="border rounded-lg p-4">
                  <Label className="text-base font-medium">Guardian/Family Participation</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      placeholder="Guardian/family member signature"
                      value={plan.agreementSignatures.guardianFamilyParticipation}
                      onChange={(e) => handleSignatureChange("guardianFamilyParticipation", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Review History Tab */}
            <TabsContent value="history">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Review History Log</Label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newEntry = {
                        date: new Date().toISOString().split('T')[0],
                        reviewType: "",
                        participants: "",
                        summaryOfChanges: ""
                      };
                      handleReviewHistoryChange([...plan.reviewHistory, newEntry]);
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    Add Review Entry
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">Date</th>
                        <th className="px-4 py-2 text-left">Type of Review</th>
                        <th className="px-4 py-2 text-left">Participants</th>
                        <th className="px-4 py-2 text-left">Summary of Changes</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.reviewHistory.map((entry, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            <Input
                              type="date"
                              value={entry.date}
                              onChange={(e) => handleReviewHistoryChange(index, "date", e.target.value)}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={entry.typeOfReview}
                              onChange={(e) => handleReviewHistoryChange(index, "typeOfReview", e.target.value)}
                              placeholder="Weekly/Monthly/Quarterly"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              value={entry.participants}
                              onChange={(e) => handleReviewHistoryChange(index, "participants", e.target.value)}
                              placeholder="Team members present"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Textarea
                              value={entry.summaryOfChanges}
                              onChange={(e) => handleReviewHistoryChange(index, "summaryOfChanges", e.target.value)}
                              placeholder="Summary of changes made"
                              rows={2}
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeReviewEntry(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {plan.reviewHistory.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No review entries yet. Click "Add Review Entry" to get started.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Reset Form</Button>
          <Button onClick={handleSavePlan} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Plan"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
