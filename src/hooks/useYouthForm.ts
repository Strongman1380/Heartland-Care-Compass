
import { useState } from "react";

export interface YouthFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dob: string;
  age: string;
  idNumber: string;
  admissionDate: string;
  currentLevel: number;
  legalGuardian: string;
  guardianRelationship: string;
  guardianContact: string;
  guardianEmail: string;
  probationOfficer: string;
  probationContact: string;
  placementAuthority: string[];
  estimatedStay: string;
  
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
    currentLevel: 0, // Start at Orientation
    legalGuardian: "",
    guardianRelationship: "",
    guardianContact: "",
    guardianEmail: "",
    probationOfficer: "",
    probationContact: "",
    placementAuthority: [],
    estimatedStay: "",
    
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
    dailyPointsForPrivileges: 10, // Default for Orientation level
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleCheckboxChange,
  };
};
