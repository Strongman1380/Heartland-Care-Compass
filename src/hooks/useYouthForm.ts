
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Professional } from "@/types/app-types";

export interface TreatmentFocus {
  excessiveDependency: boolean;
  withdrawalIsolation: boolean;
  parentChildRelationship: boolean;
  peerRelationship: boolean;
  acceptanceOfAuthority: boolean;
  lying: boolean;
  poorAcademicAchievement: boolean;
  poorSelfEsteem: boolean;
  manipulative: boolean;
  propertyDestruction: boolean;
  hyperactivity: boolean;
  anxiety: boolean;
  verbalAggression: boolean;
  assaultive: boolean;
  depression: boolean;
  stealing: boolean;
}

export interface CommunityResources {
  dayTreatmentServices: boolean;
  intensiveInHomeServices: boolean;
  daySchoolPlacement: boolean;
  oneOnOneSchoolCounselor: boolean;
  mentalHealthSupportServices: boolean;
  other: string;
}

export interface YouthFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dob: string;
  age: string;
  idNumber: string;
  admissionDate: string;
  admissionTime: string;
  rcsIn: string;
  rcsOut: string;
  currentLevel: number;
  level: string;
  legalGuardian: string;
  guardianRelationship: string;
  guardianContact: string;
  guardianPhone: string;
  guardianEmail: string;
  probationOfficer: string;
  probationContact: string;
  probationPhone: string;
  placementAuthority: string[];
  estimatedStay: string;
  referralSource: string;

  // Additional personal details
  sex: string;
  race: string;
  religion: string;
  placeOfBirth: string;
  socialSecurityNumber: string;
  address: string;
  height: string;
  weight: string;
  hairColor: string;
  eyeColor: string;
  tattoosScars: string;

  // Family & Legal Contact Information
  motherName: string;
  motherPhone: string;
  fatherName: string;
  fatherPhone: string;
  nextOfKinName: string;
  nextOfKinRelationship: string;
  nextOfKinPhone: string;
  placingAgencyCounty: string;
  caseworkerName: string;
  caseworkerPhone: string;
  guardianAdLitemName: string;
  attorney: string;
  judge: string;
  professionals: Professional[];

  // Background Information
  referralReason: string;
  priorPlacements: string[];
  numPriorPlacements: string;
  lengthRecentPlacement: string;
  courtInvolvement: string[];

  // Education Information
  currentSchool: string;
  lastSchoolAttended: string;
  grade: string;
  hasIEP: boolean;
  academicStrengths: string;
  academicChallenges: string;
  educationGoals: string;
  schoolContact: string;
  schoolPhone: string;

  // Medical Information
  physician: string;
  physicianPhone: string;
  insuranceProvider: string;
  policyNumber: string;
  allergies: string;
  currentMedications: string;
  significantHealthConditions: string;
  medicalConditions: string;
  medicalRestrictions: string;

  // Mental Health Information
  currentDiagnoses: string;
  diagnoses: string;
  traumaHistory: string[];
  previousTreatment: string;
  currentCounseling: string[];
  therapistName: string;
  therapistContact: string;
  sessionFrequency: string;
  sessionTime: string;
  selfHarmHistory: string[];
  lastIncidentDate: string;
  hasSafetyPlan: boolean;

  // Behavioral / Psychosocial
  getAlongWithOthers: string;
  strengthsTalents: string;
  interests: string;
  dislikesAboutSelf: string;
  angerTriggers: string;
  behaviorProblems: string;
  socialStrengths: string;
  socialDeficiencies: string;

  // Risk & Recovery
  tobaccoPast6To12Months: boolean;
  alcoholPast6To12Months: boolean;
  drugsVapingMarijuanaPast6To12Months: boolean;
  gangInvolvement: boolean;
  historyPhysicallyHurting: boolean;
  historyVandalism: boolean;
  familyViolentCrimes: boolean;
  drugTestingDates: string;

  // Treatment Focus & Goals
  treatmentFocus: TreatmentFocus;
  treatmentGoals: string;

  // Community Resources
  communityResources: CommunityResources;

  // Behavior tracking
  onSubsystem: boolean;
  pointsInCurrentLevel: number;
  dailyPointsForPrivileges: number;

  // HYRNA Risk Assessment
  hyrnaRiskLevel: string;
  hyrnaScore: string;
  hyrnaAssessmentDate: string;
  realColorsResult: string;

  // Discharge Planning
  dischargeDate: string;
  dischargeTime: string;
  dischargeCategory: string;
  dischargeReason: string;
  dischargeNotes: string;
  dischargedBy: string;
  estimatedLengthOfStayMonths: string;
}

const DEFAULT_TREATMENT_FOCUS: TreatmentFocus = {
  excessiveDependency: false,
  withdrawalIsolation: false,
  parentChildRelationship: false,
  peerRelationship: false,
  acceptanceOfAuthority: false,
  lying: false,
  poorAcademicAchievement: false,
  poorSelfEsteem: false,
  manipulative: false,
  propertyDestruction: false,
  hyperactivity: false,
  anxiety: false,
  verbalAggression: false,
  assaultive: false,
  depression: false,
  stealing: false,
};

const DEFAULT_COMMUNITY_RESOURCES: CommunityResources = {
  dayTreatmentServices: false,
  intensiveInHomeServices: false,
  daySchoolPlacement: false,
  oneOnOneSchoolCounselor: false,
  mentalHealthSupportServices: false,
  other: "",
};

const INITIAL_FORM_DATA: YouthFormData = {
  // Personal Information
  firstName: "",
  lastName: "",
  dob: "",
  age: "",
  idNumber: "",
  admissionDate: "",
  admissionTime: "",
  rcsIn: "",
  rcsOut: "",
  currentLevel: 0,
  level: "1",
  legalGuardian: "",
  guardianRelationship: "",
  guardianContact: "",
  guardianPhone: "",
  guardianEmail: "",
  probationOfficer: "",
  probationContact: "",
  probationPhone: "",
  placementAuthority: [],
  estimatedStay: "",
  referralSource: "",

  // Additional personal details
  sex: "",
  race: "",
  religion: "",
  placeOfBirth: "",
  socialSecurityNumber: "",
  address: "",
  height: "",
  weight: "",
  hairColor: "",
  eyeColor: "",
  tattoosScars: "",

  // Family & Legal Contact Information
  motherName: "",
  motherPhone: "",
  fatherName: "",
  fatherPhone: "",
  nextOfKinName: "",
  nextOfKinRelationship: "",
  nextOfKinPhone: "",
  placingAgencyCounty: "",
  caseworkerName: "",
  caseworkerPhone: "",
  guardianAdLitemName: "",
  attorney: "",
  judge: "",
  professionals: [],

  // Background Information
  referralReason: "",
  priorPlacements: [],
  numPriorPlacements: "",
  lengthRecentPlacement: "",
  courtInvolvement: [],

  // Education Information
  currentSchool: "",
  lastSchoolAttended: "",
  grade: "",
  hasIEP: false,
  academicStrengths: "",
  academicChallenges: "",
  educationGoals: "",
  schoolContact: "",
  schoolPhone: "",

  // Medical Information
  physician: "",
  physicianPhone: "",
  insuranceProvider: "",
  policyNumber: "",
  allergies: "",
  currentMedications: "",
  significantHealthConditions: "",
  medicalConditions: "",
  medicalRestrictions: "",

  // Mental Health Information
  currentDiagnoses: "",
  diagnoses: "",
  traumaHistory: [],
  previousTreatment: "",
  currentCounseling: [],
  therapistName: "",
  therapistContact: "",
  sessionFrequency: "",
  sessionTime: "",
  selfHarmHistory: [],
  lastIncidentDate: "",
  hasSafetyPlan: false,

  // Behavioral / Psychosocial
  getAlongWithOthers: "",
  strengthsTalents: "",
  interests: "",
  dislikesAboutSelf: "",
  angerTriggers: "",
  behaviorProblems: "",
  socialStrengths: "",
  socialDeficiencies: "",

  // Risk & Recovery
  tobaccoPast6To12Months: false,
  alcoholPast6To12Months: false,
  drugsVapingMarijuanaPast6To12Months: false,
  gangInvolvement: false,
  historyPhysicallyHurting: false,
  historyVandalism: false,
  familyViolentCrimes: false,
  drugTestingDates: "",

  // Treatment Focus & Goals
  treatmentFocus: { ...DEFAULT_TREATMENT_FOCUS },
  treatmentGoals: "",

  // Community Resources
  communityResources: { ...DEFAULT_COMMUNITY_RESOURCES },

  // Behavior tracking
  onSubsystem: false,
  pointsInCurrentLevel: 0,
  dailyPointsForPrivileges: 10,

  // HYRNA Risk Assessment
  hyrnaRiskLevel: "",
  hyrnaScore: "",
  hyrnaAssessmentDate: "",
  realColorsResult: "",

  // Discharge Planning
  dischargeDate: "",
  dischargeTime: "",
  dischargeCategory: "",
  dischargeReason: "",
  dischargeNotes: "",
  dischargedBy: "",
  estimatedLengthOfStayMonths: "",
};

export const useYouthForm = () => {
  const [formData, setFormData] = useState<YouthFormData>({ ...INITIAL_FORM_DATA });

  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const isInitialMount = useRef(true);

  // Load draft on mount
  useEffect(() => {
    loadDraft();
    isInitialMount.current = false;
  }, []);

  // Auto-save when form data changes
  useEffect(() => {
    if (isInitialMount.current) return;

    setHasUnsavedChanges(true);
    triggerAutoSave();
  }, [formData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const triggerAutoSave = () => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer for 10 seconds after user stops typing
    const timer = setTimeout(() => {
      autoSave();
    }, 10000);

    setAutoSaveTimer(timer);
  };

  const autoSave = async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;

    // Don't auto-save if required fields are empty
    if (!formData.firstName.trim() && !formData.lastName.trim()) return;

    try {
      setIsAutoSaving(true);

      // Save to localStorage as draft
      const draftData = {
        ...formData,
        timestamp: Date.now()
      };

      localStorage.setItem('youth-form-draft', JSON.stringify(draftData));
      setHasUnsavedChanges(false);

      // Show subtle success indicator
      toast.success("Form auto-saved", { duration: 1500 });
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const loadDraft = () => {
    try {
      const draftData = localStorage.getItem('youth-form-draft');

      if (draftData) {
        const parsed = JSON.parse(draftData);

        // Only load draft if it's less than 24 hours old
        const dayInMs = 24 * 60 * 60 * 1000;
        if (parsed.timestamp && (Date.now() - parsed.timestamp < dayInMs)) {
          const { timestamp, ...formDataWithoutTimestamp } = parsed;
          setFormData(formDataWithoutTimestamp);
          setHasUnsavedChanges(true);

          toast.info("Previous draft loaded", { duration: 2000 });
        }
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('youth-form-draft');
    setHasUnsavedChanges(false);
  };

  const resetForm = () => {
    setFormData({
      ...INITIAL_FORM_DATA,
      treatmentFocus: { ...DEFAULT_TREATMENT_FOCUS },
      communityResources: { ...DEFAULT_COMMUNITY_RESOURCES },
    });
    clearDraft();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    // Handle array fields that should store single values as arrays
    if (name === 'placementAuthority') {
      setFormData(prev => ({ ...prev, [name]: value ? [value] : [] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleArrayItemChange = (name: string, items: string[]) => {
    setFormData(prev => ({ ...prev, [name]: items }));
  };

  const addArrayItem = (name: string, item: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: [...(prev[name as keyof YouthFormData] as string[]), item]
    }));
  };

  const handleProfessionalsChange = (professionals: Professional[]) => {
    setFormData(prev => ({ ...prev, professionals }));
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleSelectChange,
    handleCheckboxChange,
    handleArrayItemChange,
    addArrayItem,
    handleProfessionalsChange,
    hasUnsavedChanges,
    isAutoSaving,
    clearDraft,
    resetForm,
  };
};
