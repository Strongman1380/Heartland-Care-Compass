export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      youth: {
        Row: {
          id: string
          firstName: string
          lastName: string
          dob: string | null
          age: number | null
          sex: string | null
          socialSecurityNumber: string | null
          placeOfBirth: string | null
          race: string | null
          address: Json | null
          physicalDescription: Json | null
          admissionDate: string | null
          admissionTime: string | null
          rcsIn: string | null
          dischargeDate: string | null
          dischargeTime: string | null
          rcsOut: string | null
          mother: Json | null
          father: Json | null
          legalGuardian: Json | null
          nextOfKin: Json | null
          placingAgencyCounty: string | null
          probationOfficer: Json | null
          caseworker: Json | null
          guardianAdLitem: Json | null
          attorney: string | null
          judge: string | null
          allergies: string | null
          currentMedications: string | null
          significantHealthConditions: string | null
          religion: string | null
          lastSchoolAttended: string | null
          hasIEP: boolean | null
          currentGrade: string | null
          getAlongWithOthers: string | null
          strengthsTalents: string | null
          interests: string | null
          behaviorProblems: string | null
          dislikesAboutSelf: string | null
          angerTriggers: string | null
          historyPhysicallyHurting: boolean | null
          historyVandalism: boolean | null
          gangInvolvement: boolean | null
          familyViolentCrimes: boolean | null
          tobaccoPast6To12Months: boolean | null
          alcoholPast6To12Months: boolean | null
          drugsVapingMarijuanaPast6To12Months: boolean | null
          drugTestingDates: string | null
          communityResources: Json | null
          treatmentFocus: Json | null
          dischargePlan: Json | null
          emergencyShelterCare: Json | null
          profilePhoto: string | null
          level: number
          pointTotal: number
          referralSource: string | null
          referralReason: string | null
          educationInfo: string | null
          medicalInfo: string | null
          mentalHealthInfo: string | null
          legalStatus: string | null
          peerInteraction: number | null
          adultInteraction: number | null
          investmentLevel: number | null
          dealAuthority: number | null
          hyrnaRiskLevel: string | null
          hyrnaScore: number | null
          hyrnaAssessmentDate: string | null
          createdAt: string | null
          updatedAt: string | null
          idNumber: string | null
          guardianRelationship: string | null
          guardianContact: string | null
          guardianPhone: string | null
          guardianEmail: string | null
          probationContact: string | null
          probationPhone: string | null
          placementAuthority: string | null
          estimatedStay: string | null
          priorPlacements: string[] | null
          numPriorPlacements: string | null
          lengthRecentPlacement: string | null
          courtInvolvement: string[] | null
          currentSchool: string | null
          grade: string | null
          academicStrengths: string | null
          academicChallenges: string | null
          educationGoals: string | null
          schoolContact: string | null
          schoolPhone: string | null
          physician: string | null
          physicianPhone: string | null
          insuranceProvider: string | null
          policyNumber: string | null
          medicalConditions: string | null
          medicalRestrictions: string | null
          currentDiagnoses: string | null
          diagnoses: string | null
          traumaHistory: string[] | null
          previousTreatment: string | null
          currentCounseling: string[] | null
          therapistName: string | null
          therapistContact: string | null
          sessionFrequency: string | null
          sessionTime: string | null
          selfHarmHistory: string[] | null
          lastIncidentDate: string | null
          hasSafetyPlan: boolean | null
          onSubsystem: boolean | null
          pointsInCurrentLevel: number | null
          dailyPointsForPrivileges: number | null
          realColorsResult: string | null
        }
        Insert: {
          id?: string
          firstName: string
          lastName: string
          dob?: string | null
          age?: number | null
          sex?: string | null
          socialSecurityNumber?: string | null
          placeOfBirth?: string | null
          race?: string | null
          address?: Json | null
          physicalDescription?: Json | null
          admissionDate?: string | null
          admissionTime?: string | null
          rcsIn?: string | null
          dischargeDate?: string | null
          dischargeTime?: string | null
          rcsOut?: string | null
          mother?: Json | null
          father?: Json | null
          legalGuardian?: Json | null
          nextOfKin?: Json | null
          placingAgencyCounty?: string | null
          probationOfficer?: Json | null
          caseworker?: Json | null
          guardianAdLitem?: Json | null
          attorney?: string | null
          judge?: string | null
          allergies?: string | null
          currentMedications?: string | null
          significantHealthConditions?: string | null
          religion?: string | null
          lastSchoolAttended?: string | null
          hasIEP?: boolean | null
          currentGrade?: string | null
          getAlongWithOthers?: string | null
          strengthsTalents?: string | null
          interests?: string | null
          behaviorProblems?: string | null
          dislikesAboutSelf?: string | null
          angerTriggers?: string | null
          historyPhysicallyHurting?: boolean | null
          historyVandalism?: boolean | null
          gangInvolvement?: boolean | null
          familyViolentCrimes?: boolean | null
          tobaccoPast6To12Months?: boolean | null
          alcoholPast6To12Months?: boolean | null
          drugsVapingMarijuanaPast6To12Months?: boolean | null
          drugTestingDates?: string | null
          communityResources?: Json | null
          treatmentFocus?: Json | null
          dischargePlan?: Json | null
          emergencyShelterCare?: Json | null
          profilePhoto?: string | null
          level?: number
          pointTotal?: number
          referralSource?: string | null
          referralReason?: string | null
          educationInfo?: string | null
          medicalInfo?: string | null
          mentalHealthInfo?: string | null
          legalStatus?: string | null
          peerInteraction?: number | null
          adultInteraction?: number | null
          investmentLevel?: number | null
          dealAuthority?: number | null
          hyrnaRiskLevel?: string | null
          hyrnaScore?: number | null
          hyrnaAssessmentDate?: string | null
          createdAt?: string | null
          updatedAt?: string | null
          idNumber?: string | null
          guardianRelationship?: string | null
          guardianContact?: string | null
          guardianPhone?: string | null
          guardianEmail?: string | null
          probationContact?: string | null
          probationPhone?: string | null
          placementAuthority?: string | null
          estimatedStay?: string | null
          priorPlacements?: string[] | null
          numPriorPlacements?: string | null
          lengthRecentPlacement?: string | null
          courtInvolvement?: string[] | null
          currentSchool?: string | null
          grade?: string | null
          academicStrengths?: string | null
          academicChallenges?: string | null
          educationGoals?: string | null
          schoolContact?: string | null
          schoolPhone?: string | null
          physician?: string | null
          physicianPhone?: string | null
          insuranceProvider?: string | null
          policyNumber?: string | null
          medicalConditions?: string | null
          medicalRestrictions?: string | null
          currentDiagnoses?: string | null
          diagnoses?: string | null
          traumaHistory?: string[] | null
          previousTreatment?: string | null
          currentCounseling?: string[] | null
          therapistName?: string | null
          therapistContact?: string | null
          sessionFrequency?: string | null
          sessionTime?: string | null
          selfHarmHistory?: string[] | null
          lastIncidentDate?: string | null
          hasSafetyPlan?: boolean | null
          onSubsystem?: boolean | null
          pointsInCurrentLevel?: number | null
          dailyPointsForPrivileges?: number | null
          realColorsResult?: string | null
        }
        Update: {
          id?: string
          firstName?: string
          lastName?: string
          dob?: string | null
          age?: number | null
          sex?: string | null
          socialSecurityNumber?: string | null
          placeOfBirth?: string | null
          race?: string | null
          address?: Json | null
          physicalDescription?: Json | null
          admissionDate?: string | null
          admissionTime?: string | null
          rcsIn?: string | null
          dischargeDate?: string | null
          dischargeTime?: string | null
          rcsOut?: string | null
          mother?: Json | null
          father?: Json | null
          legalGuardian?: Json | null
          nextOfKin?: Json | null
          placingAgencyCounty?: string | null
          probationOfficer?: Json | null
          caseworker?: Json | null
          guardianAdLitem?: Json | null
          attorney?: string | null
          judge?: string | null
          allergies?: string | null
          currentMedications?: string | null
          significantHealthConditions?: string | null
          religion?: string | null
          lastSchoolAttended?: string | null
          hasIEP?: boolean | null
          currentGrade?: string | null
          getAlongWithOthers?: string | null
          strengthsTalents?: string | null
          interests?: string | null
          behaviorProblems?: string | null
          dislikesAboutSelf?: string | null
          angerTriggers?: string | null
          historyPhysicallyHurting?: boolean | null
          historyVandalism?: boolean | null
          gangInvolvement?: boolean | null
          familyViolentCrimes?: boolean | null
          tobaccoPast6To12Months?: boolean | null
          alcoholPast6To12Months?: boolean | null
          drugsVapingMarijuanaPast6To12Months?: boolean | null
          drugTestingDates?: string | null
          communityResources?: Json | null
          treatmentFocus?: Json | null
          dischargePlan?: Json | null
          emergencyShelterCare?: Json | null
          profilePhoto?: string | null
          level?: number
          pointTotal?: number
          referralSource?: string | null
          referralReason?: string | null
          educationInfo?: string | null
          medicalInfo?: string | null
          mentalHealthInfo?: string | null
          legalStatus?: string | null
          peerInteraction?: number | null
          adultInteraction?: number | null
          investmentLevel?: number | null
          dealAuthority?: number | null
          hyrnaRiskLevel?: string | null
          hyrnaScore?: number | null
          hyrnaAssessmentDate?: string | null
          createdAt?: string | null
          updatedAt?: string | null
          idNumber?: string | null
          guardianRelationship?: string | null
          guardianContact?: string | null
          guardianPhone?: string | null
          guardianEmail?: string | null
          probationContact?: string | null
          probationPhone?: string | null
          placementAuthority?: string | null
          estimatedStay?: string | null
          priorPlacements?: string[] | null
          numPriorPlacements?: string | null
          lengthRecentPlacement?: string | null
          courtInvolvement?: string[] | null
          currentSchool?: string | null
          grade?: string | null
          academicStrengths?: string | null
          academicChallenges?: string | null
          educationGoals?: string | null
          schoolContact?: string | null
          schoolPhone?: string | null
          physician?: string | null
          physicianPhone?: string | null
          insuranceProvider?: string | null
          policyNumber?: string | null
          medicalConditions?: string | null
          medicalRestrictions?: string | null
          currentDiagnoses?: string | null
          diagnoses?: string | null
          traumaHistory?: string[] | null
          previousTreatment?: string | null
          currentCounseling?: string[] | null
          therapistName?: string | null
          therapistContact?: string | null
          sessionFrequency?: string | null
          sessionTime?: string | null
          selfHarmHistory?: string[] | null
          lastIncidentDate?: string | null
          hasSafetyPlan?: boolean | null
          onSubsystem?: boolean | null
          pointsInCurrentLevel?: number | null
          dailyPointsForPrivileges?: number | null
          realColorsResult?: string | null
        }
        Relationships: []
      }
      behavior_points: {
        Row: {
          id: string
          youth_id: string
          date: string | null
          morningPoints: number
          afternoonPoints: number
          eveningPoints: number
          totalPoints: number
          comments: string | null
          createdAt: string | null
        }
        Insert: {
          id?: string
          youth_id: string
          date?: string | null
          morningPoints: number
          afternoonPoints: number
          eveningPoints: number
          totalPoints: number
          comments?: string | null
          createdAt?: string | null
        }
        Update: {
          id?: string
          youth_id?: string
          date?: string | null
          morningPoints?: number
          afternoonPoints?: number
          eveningPoints?: number
          totalPoints?: number
          comments?: string | null
          createdAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_points_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          }
        ]
      }
      case_notes: {
        Row: {
          id: string
          youth_id: string
          date: string | null
          summary: string | null
          note: string | null
          staff: string | null
          createdAt: string | null
        }
        Insert: {
          id?: string
          youth_id: string
          date?: string | null
          summary?: string | null
          note?: string | null
          staff?: string | null
          createdAt?: string | null
        }
        Update: {
          id?: string
          youth_id?: string
          date?: string | null
          summary?: string | null
          note?: string | null
          staff?: string | null
          createdAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          }
        ]
      }
      daily_ratings: {
        Row: {
          id: string
          youth_id: string
          date: string | null
          peerInteraction: number | null
          adultInteraction: number | null
          investmentLevel: number | null
          dealAuthority: number | null
          staff: string | null
          comments: string | null
          createdAt: string | null
          updatedAt: string | null
        }
        Insert: {
          id?: string
          youth_id: string
          date?: string | null
          peerInteraction?: number | null
          adultInteraction?: number | null
          investmentLevel?: number | null
          dealAuthority?: number | null
          staff?: string | null
          comments?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Update: {
          id?: string
          youth_id?: string
          date?: string | null
          peerInteraction?: number | null
          adultInteraction?: number | null
          investmentLevel?: number | null
          dealAuthority?: number | null
          staff?: string | null
          comments?: string | null
          createdAt?: string | null
          updatedAt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_ratings_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}