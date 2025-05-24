import { useState } from "react";

export interface YouthFormData {
  // Personal Information
  firstName: string;
  lastName: string;
  dob: string;
  admissionDate: string;
  level: string;
  legalGuardian: string;
  guardianRelationship: string;
  guardianPhone: string;
  guardianEmail: string;
  probationOfficer: string;
  probationPhone: string;
  placementAuthority: string;
  estimatedStay: string;

  // Placement Background
  referralReason: string;
  priorPlacements: string[];
  numPriorPlacements: string;
  lengthRecentPlacement: string;
  courtInvolvement: string[];
  
  // Education
  currentSchool: string;
  grade: string;
  hasIEP: boolean;
  academicStrengths: string;
  academicChallenges: string;
  educationGoals: string;
  schoolContact: string;
  schoolPhone: string;
  
  // Medical
  physician: string;
  physicianPhone: string;
  insuranceProvider: string;
  policyNumber: string;
  allergies: string;
  medications: {name: string, dosage: string, frequency: string, purpose: string, startDate: string, prescriber: string}[];
  medicalConditions: string;
  medicalRestrictions: string;
  
  // Mental Health
  diagnoses: string;
  traumaHistory: string[];
  previousTreatment: string;
  currentCounseling: string[];
  therapistName: string;
  therapistContact: string;
  sessionFrequency: string;
  sessionTime: string;
  selfHarmHistory: string;
  selfHarmDate: string;
  safetyPlan: boolean;
  
  // Risk Assessment
  riskLevel: string;
  riskScore: string;
  criminogenicNeeds: string;
  
  // Strengths
  personalStrengths: string;
  talents: string;
  interests: string;
  careerInterests: string;
  spiritualPreferences: string;
  
  // Social Network
  familyVisitation: string;
  approvedVisitors: {name: string, relationship: string, contact: string, calls: boolean, visits: boolean}[];
  restrictedContacts: string;
  
  // Treatment Goals
  goals: {goal: string, objectives: string, measures: string}[];
  
  // Other fields
  referralSource: string;
  educationInfo: string;
  medicalInfo: string;
  mentalHealthInfo: string;
  legalStatus: string;
}

export const useYouthForm = () => {
  const [formData, setFormData] = useState<YouthFormData>({
    // Personal Information
    firstName: "",
    lastName: "",
    dob: "",
    admissionDate: new Date().toISOString().split('T')[0],
    level: "1",
    legalGuardian: "",
    guardianRelationship: "",
    guardianPhone: "",
    guardianEmail: "",
    probationOfficer: "",
    probationPhone: "",
    placementAuthority: "DHHS",
    estimatedStay: "3-6 months",

    // Placement Background
    referralReason: "",
    priorPlacements: [],
    numPriorPlacements: "",
    lengthRecentPlacement: "",
    courtInvolvement: [],
    
    // Education
    currentSchool: "",
    grade: "",
    hasIEP: false,
    academicStrengths: "",
    academicChallenges: "",
    educationGoals: "",
    schoolContact: "",
    schoolPhone: "",
    
    // Medical
    physician: "",
    physicianPhone: "",
    insuranceProvider: "",
    policyNumber: "",
    allergies: "",
    medications: [],
    medicalConditions: "",
    medicalRestrictions: "",
    
    // Mental Health
    diagnoses: "",
    traumaHistory: [],
    previousTreatment: "",
    currentCounseling: [],
    therapistName: "",
    therapistContact: "",
    sessionFrequency: "Weekly",
    sessionTime: "",
    selfHarmHistory: "None",
    selfHarmDate: "",
    safetyPlan: false,
    
    // Risk Assessment
    riskLevel: "Low",
    riskScore: "",
    criminogenicNeeds: "",
    
    // Strengths
    personalStrengths: "",
    talents: "",
    interests: "",
    careerInterests: "",
    spiritualPreferences: "",
    
    // Social Network
    familyVisitation: "Yes",
    approvedVisitors: [],
    restrictedContacts: "",
    
    // Treatment Goals
    goals: [],
    
    // Other fields
    referralSource: "",
    educationInfo: "",
    medicalInfo: "",
    mentalHealthInfo: "",
    legalStatus: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleArrayItemChange = (arrayName: string, index: number, field: string, value: any) => {
    setFormData(prev => {
      const array = [...prev[arrayName as keyof typeof prev] as any[]];
      array[index] = { ...array[index], [field]: value };
      return { ...prev, [arrayName]: array };
    });
  };

  const addArrayItem = (arrayName: string, item: any) => {
    setFormData(prev => {
      const array = [...(prev[arrayName as keyof typeof prev] as any[] || []), item];
      return { ...prev, [arrayName]: array };
    });
  };

  return {
    formData,
    setFormData,
    handleChange,
    handleSelectChange,
    handleCheckboxChange,
    handleArrayItemChange,
    addArrayItem,
  };
};
