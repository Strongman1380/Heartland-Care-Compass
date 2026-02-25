export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Youth types
export interface Youth {
  id: string
  firstName: string
  lastName: string
  academicChallenges: string | null
  academicStrengths: string | null
  address: Json | null
  admissionDate: string | null
  admissionTime: string | null
  adultInteraction: number | null
  age: number | null
  alcoholPast6To12Months: boolean | null
  allergies: string | null
  angerTriggers: string | null
  attorney: string | null
  behaviorProblems: string | null
  caseworker: Json | null
  communityResources: Json | null
  courtInvolvement: string[] | null
  createdAt: string | null
  currentCounseling: string[] | null
  currentDiagnoses: string | null
  currentGrade: string | null
  currentMedications: string | null
  currentSchool: string | null
  dailyPointsForPrivileges: number | null
  dealAuthority: number | null
  diagnoses: string | null
  dischargeDate: string | null
  dischargePlan: Json | null
  dischargeTime: string | null
  dislikesAboutSelf: string | null
  dob: string | null
  drugsVapingMarijuanaPast6To12Months: boolean | null
  drugTestingDates: string | null
  educationGoals: string | null
  educationInfo: string | null
  emergencyShelterCare: Json | null
  estimatedStay: string | null
  familyViolentCrimes: boolean | null
  father: Json | null
  gangInvolvement: boolean | null
  getAlongWithOthers: string | null
  grade: string | null
  guardianAdLitem: Json | null
  guardianContact: string | null
  guardianEmail: string | null
  guardianPhone: string | null
  guardianRelationship: string | null
  hasIEP: boolean | null
  hasSafetyPlan: boolean | null
  historyPhysicallyHurting: boolean | null
  historyVandalism: boolean | null
  hyrnaAssessmentDate: string | null
  hyrnaRiskLevel: string | null
  hyrnaScore: number | null
  idNumber: string | null
  insuranceProvider: string | null
  interests: string | null
  investmentLevel: number | null
  judge: string | null
  professionals: Json | null
  lastIncidentDate: string | null
  lastSchoolAttended: string | null
  legalGuardian: Json | null
  legalStatus: string | null
  lengthRecentPlacement: string | null
  level: number | null
  medicalConditions: string | null
  medicalInfo: string | null
  medicalRestrictions: string | null
  mentalHealthInfo: string | null
  mother: Json | null
  nextOfKin: Json | null
  numPriorPlacements: string | null
  onSubsystem: boolean | null
  peerInteraction: number | null
  physicalDescription: Json | null
  physician: string | null
  physicianPhone: string | null
  placementAuthority: string | null
  placeOfBirth: string | null
  placingAgencyCounty: string | null
  pointsInCurrentLevel: number | null
  pointTotal: number | null
  policyNumber: string | null
  previousTreatment: string | null
  priorPlacements: string[] | null
  probationContact: string | null
  probationOfficer: Json | null
  probationPhone: string | null
  profilePhoto: string | null
  race: string | null
  rcsIn: string | null
  rcsOut: string | null
  realColorsResult: string | null
  referralReason: string | null
  referralSource: string | null
  religion: string | null
  schoolContact: string | null
  schoolPhone: string | null
  selfHarmHistory: string[] | null
  sessionFrequency: string | null
  sessionTime: string | null
  sex: string | null
  significantHealthConditions: string | null
  socialSecurityNumber: string | null
  strengthsTalents: string | null
  therapistContact: string | null
  therapistName: string | null
  tobaccoPast6To12Months: boolean | null
  traumaHistory: string[] | null
  treatmentFocus: Json | null
  treatmentGoals: string | null
  updatedAt: string | null
  restrictionLevel: number | null
  restrictionPointsRequired: number | null
  restrictionStartDate: string | null
  restrictionPointsEarned: number | null
  restrictionReason: string | null
  subsystemActive: boolean | null
  subsystemPointsRequired: number | null
  subsystemStartDate: string | null
  subsystemPointsEarned: number | null
  subsystemReason: string | null
  status: string | null
  dischargeCategory: string | null
  dischargeReason: string | null
  dischargeNotes: string | null
  dischargedBy: string | null
}

export type YouthInsert = Omit<Youth, 'id'> & { id?: string }
export type YouthUpdate = Partial<Youth>

// Behavior Points types
export interface BehaviorPoints {
  id: string
  youth_id: string
  date: string | null
  morningPoints: number | null
  afternoonPoints: number | null
  eveningPoints: number | null
  totalPoints: number | null
  comments: string | null
  createdAt: string | null
}

export type BehaviorPointsInsert = Omit<BehaviorPoints, 'id'> & { id?: string }
export type BehaviorPointsUpdate = Partial<BehaviorPoints>

// Case Notes types
export interface CaseNotes {
  id: string
  youth_id: string
  date: string | null
  summary: string | null
  note: string | null
  staff: string | null
  createdAt: string | null
}

export type CaseNotesInsert = Omit<CaseNotes, 'id'> & { id?: string }
export type CaseNotesUpdate = Partial<CaseNotes>

// Daily Ratings types
export interface DailyRatings {
  id: string
  youth_id: string
  date: string | null
  peerInteraction: number | null
  peerInteractionComment: string | null
  adultInteraction: number | null
  adultInteractionComment: string | null
  investmentLevel: number | null
  investmentLevelComment: string | null
  dealAuthority: number | null
  dealAuthorityComment: string | null
  comments: string | null
  staff: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type DailyRatingsInsert = Omit<DailyRatings, 'id'> & { id?: string }
export type DailyRatingsUpdate = Partial<DailyRatings>

// Court Reports types
export interface CourtReport {
  id: string
  youth_id: string
  youth_name: string
  report_date: string
  academic_progress: string | null
  additional_comments: string | null
  aftercare_recommendations: string | null
  author_user_id: string | null
  behavioral_interventions: string | null
  behavioral_progress: string | null
  community_contacts: string | null
  court_recommendations: string | null
  current_placement: string | null
  daily_structure: string | null
  date_of_birth: string | null
  discharge_planning: string | null
  discharge_timeline: string | null
  draft_payload: Json | null
  educational_challenges: string | null
  family_therapy: string | null
  family_visitation: string | null
  goal_progress: string | null
  incentives_earned: string | null
  medication_compliance: string | null
  overall_assessment: string | null
  peer_relationships: string | null
  program_compliance: string | null
  reporting_officer: string | null
  risk_assessment: string | null
  school_placement: string | null
  significant_incidents: string | null
  skills_development: string | null
  therapeutic_participation: string | null
  transition_plan: string | null
  treatment_goals: string | null
  vocational_goals: string | null
  created_at: string
  created_by: string | null
  updated_at: string
  updated_by: string | null
}

// Progress Notes types
export interface ProgressNote {
  id: string
  youth_id: string
  date: string | null
  category: string | null
  note: string | null
  rating: number | null
  staff: string | null
  createdat: string | null
}

// Report Drafts types
export interface ReportDraft {
  id: string
  youth_id: string
  report_type: string
  author_user_id: string | null
  data: Json
  created_at: string
  updated_at: string
}
