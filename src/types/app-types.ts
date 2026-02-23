
// Application types for the local storage version

export type ProfessionalType =
  | 'caseworker'
  | 'probationOfficer'
  | 'attorney'
  | 'judge'
  | 'guardianAdLitem';

export interface Professional {
  type: ProfessionalType;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface Youth {
  id: string;
  
  // Basic Information
  firstName: string;
  lastName: string;
  dob?: Date | null;
  age?: number | null;
  sex?: 'M' | 'F' | null;
  socialSecurityNumber?: string | null;
  placeOfBirth?: string | null;
  race?: string | null;
  
  // Address Information
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;
  
  // Physical Description
  physicalDescription?: {
    height?: string | null;
    weight?: string | null;
    hairColor?: string | null;
    eyeColor?: string | null;
    tattoosScars?: string | null;
  } | null;
  
  // Admission/Discharge Information
  admissionDate?: Date | null;
  admissionTime?: string | null;
  rcsIn?: string | null;
  dischargeDate?: Date | null;
  dischargeTime?: string | null;
  rcsOut?: string | null;
  
  // Family/Guardianship Information
  mother?: {
    name?: string | null;
    phone?: string | null;
    contact?: string | null; // Added for CourtReport compatibility
  } | null;
  father?: {
    name?: string | null;
    phone?: string | null;
    contact?: string | null; // Added for CourtReport compatibility
  } | null;
  legalGuardian?: {
    name?: string | null;
    phone?: string | null;
    contact?: string | null; // Added for CourtReport compatibility
    relationship?: string | null; // Added for CourtReport compatibility
  } | null;
  nextOfKin?: {
    name?: string | null;
    relationship?: string | null;
    phone?: string | null;
  } | null;
  
  // Placement Information
  placingAgencyCounty?: string | null;
  probationOfficer?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    contact?: string | null; // Added for CourtReport compatibility
  } | null;
  caseworker?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  guardianAdLitem?: {
    name?: string | null;
    phone?: string | null;
  } | null;
  attorney?: string | null;
  judge?: string | null;
  professionals?: Professional[] | null;

  // Health, Religion, School Information
  allergies?: string | null;
  currentMedications?: string | null;
  significantHealthConditions?: string | null;
  religion?: string | null;
  lastSchoolAttended?: string | null;
  hasIEP?: boolean | null;
  currentGrade?: string | null;
  
  // Behavioral Information
  getAlongWithOthers?: string | null;
  strengthsTalents?: string | null;
  interests?: string | null;
  behaviorProblems?: string | null;
  dislikesAboutSelf?: string | null;
  angerTriggers?: string | null;
  historyPhysicallyHurting?: boolean | null;
  historyVandalism?: boolean | null;
  gangInvolvement?: boolean | null;
  familyViolentCrimes?: boolean | null;
  socialStrengths?: string | null; // Added for CourtReport compatibility
  socialDeficiencies?: string | null; // Added for CourtReport compatibility
  treatmentGoals?: Array<{ goal: string; [key: string]: any }> | string[] | null; // Added for CourtReport compatibility
  
  // Substance Use
  tobaccoPast6To12Months?: boolean | null;
  alcoholPast6To12Months?: boolean | null;
  drugsVapingMarijuanaPast6To12Months?: boolean | null;
  drugTestingDates?: string | null;
  
  // Community Resources Used
  communityResources?: {
    dayTreatmentServices?: boolean | null;
    intensiveInHomeServices?: boolean | null;
    daySchoolPlacement?: boolean | null;
    oneOnOneSchoolCounselor?: boolean | null;
    mentalHealthSupportServices?: boolean | null;
    other?: string | null;
  } | null;
  
  // Desired Focus of Treatment
  treatmentFocus?: {
    excessiveDependency?: boolean | null;
    withdrawalIsolation?: boolean | null;
    parentChildRelationship?: boolean | null;
    peerRelationship?: boolean | null;
    acceptanceOfAuthority?: boolean | null;
    lying?: boolean | null;
    poorAcademicAchievement?: boolean | null;
    poorSelfEsteem?: boolean | null;
    manipulative?: boolean | null;
    propertyDestruction?: boolean | null;
    hyperactivity?: boolean | null;
    anxiety?: boolean | null;
    verbalAggression?: boolean | null;
    assaultive?: boolean | null;
    depression?: boolean | null;
    stealing?: boolean | null;
  } | null;
  
  // Discharge Plan
  dischargePlan?: {
    parents?: string | null;
    relative?: {
      name?: string | null;
      relationship?: string | null;
    } | null;
    regularFosterCare?: boolean | null;
    estimatedLengthOfStayMonths?: number | null;
    groupHome?: string | null; // Added for CourtReport compatibility
    independentLiving?: string | null; // Added for CourtReport compatibility
    aftercareServices?: string[] | null; // Added for CourtReport compatibility
  } | null;
  
  // Emergency Shelter Care
  emergencyShelterCare?: {
    legalGuardianInfo?: string | null;
    parentsNotified?: boolean | null;
    immediateNeeds?: string | null;
    placingAgencyIndividual?: string | null;
    placementDate?: Date | null;
    placementTime?: string | null;
    reasonForPlacement?: string | null;
    intakeWorkerObservation?: string | null;
    orientationCompletedBy?: string | null;
    orientationDate?: Date | null;
    orientationTime?: string | null;
  } | null;
  
  // Photo
  profilePhoto?: string | null; // Base64 encoded image or file path
  
  // System fields (existing)
  level: number;
  pointTotal: number;
  referralSource?: string | null;
  referralReason?: string | null;
  educationInfo?: string | null;
  medicalInfo?: string | null;
  mentalHealthInfo?: string | null;
  legalStatus?: string | null;
  peerInteraction?: number | null; // 0-5 rating
  adultInteraction?: number | null; // 0-5 rating
  investmentLevel?: number | null; // 0-5 rating
  dealAuthority?: number | null; // 0-5 rating
  hyrnaRiskLevel?: string | null; // Low, Medium, High
  hyrnaScore?: number | null; // Risk assessment score
  hyrnaAssessmentDate?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;

  // Restriction tracking
  restrictionLevel?: number | null; // 1 or 2
  restrictionPointsRequired?: number | null;
  restrictionStartDate?: Date | null;
  restrictionPointsEarned?: number | null;
  restrictionReason?: string | null;

  // Subsystem tracking
  subsystemActive?: boolean | null;
  subsystemPointsRequired?: number | null;
  subsystemStartDate?: Date | null;
  subsystemPointsEarned?: number | null;
  subsystemReason?: string | null;

  // Additional fields from form data
  idNumber?: string | null;
  // Note: legalGuardian and probationOfficer are objects defined above, removed duplicate string types
  guardianRelationship?: string | null;
  guardianContact?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
  probationContact?: string | null;
  probationPhone?: string | null;
  placementAuthority?: string | null;
  estimatedStay?: string | null;
  
  // Background Information
  priorPlacements?: string[] | null;
  numPriorPlacements?: string | null;
  lengthRecentPlacement?: string | null;
  courtInvolvement?: string[] | null;
  
  // Education Information (detailed)
  currentSchool?: string | null;
  grade?: string | null;
  academicStrengths?: string | null;
  academicChallenges?: string | null;
  educationGoals?: string | null;
  schoolContact?: string | null;
  schoolPhone?: string | null;
  
  // Medical Information (detailed)
  physician?: string | null;
  physicianPhone?: string | null;
  insuranceProvider?: string | null;
  policyNumber?: string | null;
  medicalConditions?: string | null;
  medicalRestrictions?: string | null;
  
  // Mental Health Information (detailed)
  currentDiagnoses?: string | null;
  diagnoses?: string | null;
  traumaHistory?: string[] | null;
  previousTreatment?: string | null;
  currentCounseling?: string[] | null;
  therapistName?: string | null;
  therapistContact?: string | null;
  sessionFrequency?: string | null;
  sessionTime?: string | null;
  selfHarmHistory?: string[] | null;
  lastIncidentDate?: string | null;
  hasSafetyPlan?: boolean | null;
  
  // Behavior tracking fields
  onSubsystem?: boolean | null;
  pointsInCurrentLevel?: number | null;
  dailyPointsForPrivileges?: number | null;
}

export interface BehaviorPoints {
  id: string;
  youth_id: string;
  date?: Date | null;
  morningPoints: number;
  afternoonPoints: number;
  eveningPoints: number;
  totalPoints: number;
  comments?: string | null;
  createdAt?: Date | null;
}

export interface CaseNote {
  id: string;
  youth_id: string;
  date?: Date | null;
  summary?: string | null;
  note?: string | null;
  staff?: string | null;
  createdAt?: Date | null;
}

// Keep ProgressNote for backward compatibility during transition
export interface ProgressNote {
  id: string;
  youth_id: string;
  date?: Date | null;
  category?: string | null;
  note?: string | null;
  rating?: number | null;
  staff?: string | null;
  createdAt?: Date | null;
}

export interface DailyRating {
  id: string;
  youth_id: string;
  date?: Date | null;
  peerInteraction?: number | null; // 0-5 rating
  adultInteraction?: number | null; // 0-5 rating
  investmentLevel?: number | null; // 0-5 rating
  dealAuthority?: number | null; // 0-5 rating
  staff?: string | null;
  comments?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}


