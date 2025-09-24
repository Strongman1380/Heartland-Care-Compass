
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export interface YouthFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dob: string;
  age: string;
  idNumber: string;
  admissionDate: string;
  currentLevel: number;
  level: string; // Added for form compatibility
  legalGuardian: string;
  guardianRelationship: string;
  guardianContact: string;
  guardianPhone: string; // Added missing property
  guardianEmail: string;
  probationOfficer: string;
  probationContact: string;
  probationPhone: string; // Added missing property
  placementAuthority: string[]; // Keep as array
  estimatedStay: string;
  referralSource: string; // Added missing property
  
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
  
  // Background Information
  referralReason: string;
  priorPlacements: string[];
  numPriorPlacements: string;
  lengthRecentPlacement: string;
  courtInvolvement: string[];
  
  // Education Information
  currentSchool: string;
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
  medicalConditions: string;
  medicalRestrictions: string;
  
  // Mental Health Information
  currentDiagnoses: string;
  diagnoses: string; // Added for compatibility
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

  // New fields for behavior tracking
  onSubsystem: boolean;
  pointsInCurrentLevel: number;
  dailyPointsForPrivileges: number;

  // HYRNA Risk Assessment
  hyrnaRiskLevel: string;
  hyrnaScore: string;
  hyrnaAssessmentDate: string;
}

export const useYouthForm = () => {
  const [formData, setFormData] = useState<YouthFormData>({
    // Personal Information
    firstName: "",
    lastName: "",
    dob: "",
    age: "",
    idNumber: "",
    admissionDate: "",
    currentLevel: 0,
    level: "1", // Default to Level 1
    legalGuardian: "",
    guardianRelationship: "",
    guardianContact: "",
    guardianPhone: "", // Added
    guardianEmail: "",
    probationOfficer: "",
    probationContact: "",
    probationPhone: "", // Added
    placementAuthority: [],
    estimatedStay: "",
    referralSource: "", // Added
    
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
    
    // Background Information
    referralReason: "",
    priorPlacements: [],
    numPriorPlacements: "",
    lengthRecentPlacement: "",
    courtInvolvement: [],
    
    // Education Information
    currentSchool: "",
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
    medicalConditions: "",
    medicalRestrictions: "",
    
    // Mental Health Information
    currentDiagnoses: "",
    diagnoses: "", // Added
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

    // New behavior tracking fields
    onSubsystem: false,
    pointsInCurrentLevel: 0,
    dailyPointsForPrivileges: 10,

    // HYRNA Risk Assessment
    hyrnaRiskLevel: "",
    hyrnaScore: "",
    hyrnaAssessmentDate: "",
  });

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
      // Personal Information
      firstName: "",
      lastName: "",
      dob: "",
      age: "",
      idNumber: "",
      admissionDate: "",
      currentLevel: 0,
      level: "1", // Default to Level 1
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

      // Background Information
      referralReason: "",
      priorPlacements: [],
      numPriorPlacements: "",
      lengthRecentPlacement: "",
      courtInvolvement: [],

      // Education Information
      currentSchool: "",
      grade: "",
      hasIEP: false,
      academicStrengths: "",
      academicChallenges: "",
      behavioralConcerns: "",

      // Medical Information
      primaryPhysician: "",
      allergies: "",
      medications: "",
      chronicConditions: "",
      lastPhysicalExam: "",

      // Mental Health Information
      previousCounseling: false,
      currentTherapist: "",
      psychiatrist: "",
      mentalHealthDiagnosis: "",
      riskFactors: "",
      copingStrategies: "",
      triggerWarnings: "",
      selfHarmHistory: false,
      suicidalIdeation: false,

      // Substance Use
      substanceUse: false,
      substanceDetails: "",
      treatmentHistory: "",

      // Family Information
      familyStructure: "",
      contactInfo: "",
      emergencyContact: "",
      familyDynamics: "",

      // Behavioral Information
      strengths: "",
      interests: "",
      goals: "",
      concerns: "",

      // Risk Assessment
      riskLevel: "",
      safetyPlan: "",

      // New fields for behavior tracking
      onSubsystem: false,
      pointsInCurrentLevel: 0,
      dailyPointsForPrivileges: 10,

      // HYRNA Risk Assessment
      hyrnaRiskLevel: "",
      hyrnaScore: "",
      hyrnaAssessmentDate: "",
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

  return {
    formData,
    setFormData,
    handleChange,
    handleSelectChange,
    handleCheckboxChange,
    handleArrayItemChange,
    addArrayItem,
    hasUnsavedChanges,
    isAutoSaving,
    clearDraft,
    resetForm,
  };
};
