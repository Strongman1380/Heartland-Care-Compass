export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      behavior_points: {
        Row: {
          afternoonPoints: number | null
          comments: string | null
          createdAt: string | null
          date: string | null
          eveningPoints: number | null
          id: string
          morningPoints: number | null
          totalPoints: number | null
          youth_id: string
        }
        Insert: {
          afternoonPoints?: number | null
          comments?: string | null
          createdAt?: string | null
          date?: string | null
          eveningPoints?: number | null
          id?: string
          morningPoints?: number | null
          totalPoints?: number | null
          youth_id: string
        }
        Update: {
          afternoonPoints?: number | null
          comments?: string | null
          createdAt?: string | null
          date?: string | null
          eveningPoints?: number | null
          id?: string
          morningPoints?: number | null
          totalPoints?: number | null
          youth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_points_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          createdAt: string | null
          date: string | null
          id: string
          note: string | null
          staff: string | null
          summary: string | null
          youth_id: string
        }
        Insert: {
          createdAt?: string | null
          date?: string | null
          id?: string
          note?: string | null
          staff?: string | null
          summary?: string | null
          youth_id: string
        }
        Update: {
          createdAt?: string | null
          date?: string | null
          id?: string
          note?: string | null
          staff?: string | null
          summary?: string | null
          youth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          },
        ]
      }
      court_reports: {
        Row: {
          academic_progress: string | null
          additional_comments: string | null
          aftercare_recommendations: string | null
          author_user_id: string | null
          behavioral_interventions: string | null
          behavioral_progress: string | null
          community_contacts: string | null
          court_recommendations: string | null
          created_at: string
          created_by: string | null
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
          id: string
          incentives_earned: string | null
          medication_compliance: string | null
          overall_assessment: string | null
          peer_relationships: string | null
          program_compliance: string | null
          report_date: string
          reporting_officer: string | null
          risk_assessment: string | null
          school_placement: string | null
          significant_incidents: string | null
          skills_development: string | null
          therapeutic_participation: string | null
          transition_plan: string | null
          treatment_goals: string | null
          updated_at: string
          updated_by: string | null
          vocational_goals: string | null
          youth_id: string
          youth_name: string
        }
        Insert: {
          academic_progress?: string | null
          additional_comments?: string | null
          aftercare_recommendations?: string | null
          author_user_id?: string | null
          behavioral_interventions?: string | null
          behavioral_progress?: string | null
          community_contacts?: string | null
          court_recommendations?: string | null
          created_at?: string
          created_by?: string | null
          current_placement?: string | null
          daily_structure?: string | null
          date_of_birth?: string | null
          discharge_planning?: string | null
          discharge_timeline?: string | null
          draft_payload?: Json | null
          educational_challenges?: string | null
          family_therapy?: string | null
          family_visitation?: string | null
          goal_progress?: string | null
          id?: string
          incentives_earned?: string | null
          medication_compliance?: string | null
          overall_assessment?: string | null
          peer_relationships?: string | null
          program_compliance?: string | null
          report_date: string
          reporting_officer?: string | null
          risk_assessment?: string | null
          school_placement?: string | null
          significant_incidents?: string | null
          skills_development?: string | null
          therapeutic_participation?: string | null
          transition_plan?: string | null
          treatment_goals?: string | null
          updated_at?: string
          updated_by?: string | null
          vocational_goals?: string | null
          youth_id: string
          youth_name: string
        }
        Update: {
          academic_progress?: string | null
          additional_comments?: string | null
          aftercare_recommendations?: string | null
          author_user_id?: string | null
          behavioral_interventions?: string | null
          behavioral_progress?: string | null
          community_contacts?: string | null
          court_recommendations?: string | null
          created_at?: string
          created_by?: string | null
          current_placement?: string | null
          daily_structure?: string | null
          date_of_birth?: string | null
          discharge_planning?: string | null
          discharge_timeline?: string | null
          draft_payload?: Json | null
          educational_challenges?: string | null
          family_therapy?: string | null
          family_visitation?: string | null
          goal_progress?: string | null
          id?: string
          incentives_earned?: string | null
          medication_compliance?: string | null
          overall_assessment?: string | null
          peer_relationships?: string | null
          program_compliance?: string | null
          report_date?: string
          reporting_officer?: string | null
          risk_assessment?: string | null
          school_placement?: string | null
          significant_incidents?: string | null
          skills_development?: string | null
          therapeutic_participation?: string | null
          transition_plan?: string | null
          treatment_goals?: string | null
          updated_at?: string
          updated_by?: string | null
          vocational_goals?: string | null
          youth_id?: string
          youth_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_reports_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_ratings: {
        Row: {
          adultInteraction: number | null
          adultInteractionComment: string | null
          comments: string | null
          createdAt: string | null
          date: string | null
          dealAuthority: number | null
          dealAuthorityComment: string | null
          id: string
          investmentLevel: number | null
          investmentLevelComment: string | null
          peerInteraction: number | null
          peerInteractionComment: string | null
          staff: string | null
          updatedAt: string | null
          youth_id: string
        }
        Insert: {
          adultInteraction?: number | null
          adultInteractionComment?: string | null
          comments?: string | null
          createdAt?: string | null
          date?: string | null
          dealAuthority?: number | null
          dealAuthorityComment?: string | null
          id?: string
          investmentLevel?: number | null
          investmentLevelComment?: string | null
          peerInteraction?: number | null
          peerInteractionComment?: string | null
          staff?: string | null
          updatedAt?: string | null
          youth_id: string
        }
        Update: {
          adultInteraction?: number | null
          adultInteractionComment?: string | null
          comments?: string | null
          createdAt?: string | null
          date?: string | null
          dealAuthority?: number | null
          dealAuthorityComment?: string | null
          id?: string
          investmentLevel?: number | null
          investmentLevelComment?: string | null
          peerInteraction?: number | null
          peerInteractionComment?: string | null
          staff?: string | null
          updatedAt?: string | null
          youth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_ratings_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_notes: {
        Row: {
          category: string | null
          createdat: string | null
          date: string | null
          id: string
          note: string | null
          rating: number | null
          staff: string | null
          youth_id: string
        }
        Insert: {
          category?: string | null
          createdat?: string | null
          date?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          staff?: string | null
          youth_id: string
        }
        Update: {
          category?: string | null
          createdat?: string | null
          date?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          staff?: string | null
          youth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progress_notes_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          },
        ]
      }
      report_drafts: {
        Row: {
          author_user_id: string | null
          created_at: string
          data: Json
          id: string
          report_type: string
          updated_at: string
          youth_id: string
        }
        Insert: {
          author_user_id?: string | null
          created_at?: string
          data: Json
          id?: string
          report_type: string
          updated_at?: string
          youth_id: string
        }
        Update: {
          author_user_id?: string | null
          created_at?: string
          data?: Json
          id?: string
          report_type?: string
          updated_at?: string
          youth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_drafts_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youth"
            referencedColumns: ["id"]
          },
        ]
      }
      youth: {
        Row: {
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
          firstName: string
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
          id: string
          idNumber: string | null
          insuranceProvider: string | null
          interests: string | null
          investmentLevel: number | null
          judge: string | null
          lastIncidentDate: string | null
          lastName: string
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
        }
        Insert: {
          academicChallenges?: string | null
          academicStrengths?: string | null
          address?: Json | null
          admissionDate?: string | null
          admissionTime?: string | null
          adultInteraction?: number | null
          age?: number | null
          alcoholPast6To12Months?: boolean | null
          allergies?: string | null
          angerTriggers?: string | null
          attorney?: string | null
          behaviorProblems?: string | null
          caseworker?: Json | null
          communityResources?: Json | null
          courtInvolvement?: string[] | null
          createdAt?: string | null
          currentCounseling?: string[] | null
          currentDiagnoses?: string | null
          currentGrade?: string | null
          currentMedications?: string | null
          currentSchool?: string | null
          dailyPointsForPrivileges?: number | null
          dealAuthority?: number | null
          diagnoses?: string | null
          dischargeDate?: string | null
          dischargePlan?: Json | null
          dischargeTime?: string | null
          dislikesAboutSelf?: string | null
          dob?: string | null
          drugsVapingMarijuanaPast6To12Months?: boolean | null
          drugTestingDates?: string | null
          educationGoals?: string | null
          educationInfo?: string | null
          emergencyShelterCare?: Json | null
          estimatedStay?: string | null
          familyViolentCrimes?: boolean | null
          father?: Json | null
          firstName: string
          gangInvolvement?: boolean | null
          getAlongWithOthers?: string | null
          grade?: string | null
          guardianAdLitem?: Json | null
          guardianContact?: string | null
          guardianEmail?: string | null
          guardianPhone?: string | null
          guardianRelationship?: string | null
          hasIEP?: boolean | null
          hasSafetyPlan?: boolean | null
          historyPhysicallyHurting?: boolean | null
          historyVandalism?: boolean | null
          hyrnaAssessmentDate?: string | null
          hyrnaRiskLevel?: string | null
          hyrnaScore?: number | null
          id?: string
          idNumber?: string | null
          insuranceProvider?: string | null
          interests?: string | null
          investmentLevel?: number | null
          judge?: string | null
          lastIncidentDate?: string | null
          lastName: string
          lastSchoolAttended?: string | null
          legalGuardian?: Json | null
          legalStatus?: string | null
          lengthRecentPlacement?: string | null
          level?: number | null
          medicalConditions?: string | null
          medicalInfo?: string | null
          medicalRestrictions?: string | null
          mentalHealthInfo?: string | null
          mother?: Json | null
          nextOfKin?: Json | null
          numPriorPlacements?: string | null
          onSubsystem?: boolean | null
          peerInteraction?: number | null
          physicalDescription?: Json | null
          physician?: string | null
          physicianPhone?: string | null
          placementAuthority?: string | null
          placeOfBirth?: string | null
          placingAgencyCounty?: string | null
          pointsInCurrentLevel?: number | null
          pointTotal?: number | null
          policyNumber?: string | null
          previousTreatment?: string | null
          priorPlacements?: string[] | null
          probationContact?: string | null
          probationOfficer?: Json | null
          probationPhone?: string | null
          profilePhoto?: string | null
          race?: string | null
          rcsIn?: string | null
          rcsOut?: string | null
          realColorsResult?: string | null
          referralReason?: string | null
          referralSource?: string | null
          religion?: string | null
          schoolContact?: string | null
          schoolPhone?: string | null
          selfHarmHistory?: string[] | null
          sessionFrequency?: string | null
          sessionTime?: string | null
          sex?: string | null
          significantHealthConditions?: string | null
          socialSecurityNumber?: string | null
          strengthsTalents?: string | null
          therapistContact?: string | null
          therapistName?: string | null
          tobaccoPast6To12Months?: boolean | null
          traumaHistory?: string[] | null
          treatmentFocus?: Json | null
          updatedAt?: string | null
          restrictionLevel?: number | null
          restrictionPointsRequired?: number | null
          restrictionStartDate?: string | null
          restrictionPointsEarned?: number | null
          restrictionReason?: string | null
          subsystemActive?: boolean | null
          subsystemPointsRequired?: number | null
          subsystemStartDate?: string | null
          subsystemPointsEarned?: number | null
          subsystemReason?: string | null
        }
        Update: {
          academicChallenges?: string | null
          academicStrengths?: string | null
          address?: Json | null
          admissionDate?: string | null
          admissionTime?: string | null
          adultInteraction?: number | null
          age?: number | null
          alcoholPast6To12Months?: boolean | null
          allergies?: string | null
          angerTriggers?: string | null
          attorney?: string | null
          behaviorProblems?: string | null
          caseworker?: Json | null
          communityResources?: Json | null
          courtInvolvement?: string[] | null
          createdAt?: string | null
          currentCounseling?: string[] | null
          currentDiagnoses?: string | null
          currentGrade?: string | null
          currentMedications?: string | null
          currentSchool?: string | null
          dailyPointsForPrivileges?: number | null
          dealAuthority?: number | null
          diagnoses?: string | null
          dischargeDate?: string | null
          dischargePlan?: Json | null
          dischargeTime?: string | null
          dislikesAboutSelf?: string | null
          dob?: string | null
          drugsVapingMarijuanaPast6To12Months?: boolean | null
          drugTestingDates?: string | null
          educationGoals?: string | null
          educationInfo?: string | null
          emergencyShelterCare?: Json | null
          estimatedStay?: string | null
          familyViolentCrimes?: boolean | null
          father?: Json | null
          firstName?: string
          gangInvolvement?: boolean | null
          getAlongWithOthers?: string | null
          grade?: string | null
          guardianAdLitem?: Json | null
          guardianContact?: string | null
          guardianEmail?: string | null
          guardianPhone?: string | null
          guardianRelationship?: string | null
          hasIEP?: boolean | null
          hasSafetyPlan?: boolean | null
          historyPhysicallyHurting?: boolean | null
          historyVandalism?: boolean | null
          hyrnaAssessmentDate?: string | null
          hyrnaRiskLevel?: string | null
          hyrnaScore?: number | null
          id?: string
          idNumber?: string | null
          insuranceProvider?: string | null
          interests?: string | null
          investmentLevel?: number | null
          judge?: string | null
          lastIncidentDate?: string | null
          lastName?: string
          lastSchoolAttended?: string | null
          legalGuardian?: Json | null
          legalStatus?: string | null
          lengthRecentPlacement?: string | null
          level?: number | null
          medicalConditions?: string | null
          medicalInfo?: string | null
          medicalRestrictions?: string | null
          mentalHealthInfo?: string | null
          mother?: Json | null
          nextOfKin?: Json | null
          numPriorPlacements?: string | null
          onSubsystem?: boolean | null
          peerInteraction?: number | null
          physicalDescription?: Json | null
          physician?: string | null
          physicianPhone?: string | null
          placementAuthority?: string | null
          placeOfBirth?: string | null
          placingAgencyCounty?: string | null
          pointsInCurrentLevel?: number | null
          pointTotal?: number | null
          policyNumber?: string | null
          previousTreatment?: string | null
          priorPlacements?: string[] | null
          probationContact?: string | null
          probationOfficer?: Json | null
          probationPhone?: string | null
          profilePhoto?: string | null
          race?: string | null
          rcsIn?: string | null
          rcsOut?: string | null
          realColorsResult?: string | null
          referralReason?: string | null
          referralSource?: string | null
          religion?: string | null
          schoolContact?: string | null
          schoolPhone?: string | null
          selfHarmHistory?: string[] | null
          sessionFrequency?: string | null
          sessionTime?: string | null
          sex?: string | null
          significantHealthConditions?: string | null
          socialSecurityNumber?: string | null
          strengthsTalents?: string | null
          therapistContact?: string | null
          therapistName?: string | null
          tobaccoPast6To12Months?: boolean | null
          traumaHistory?: string[] | null
          treatmentFocus?: Json | null
          updatedAt?: string | null
          restrictionLevel?: number | null
          restrictionPointsRequired?: number | null
          restrictionStartDate?: string | null
          restrictionPointsEarned?: number | null
          restrictionReason?: string | null
          subsystemActive?: boolean | null
          subsystemPointsRequired?: number | null
          subsystemStartDate?: string | null
          subsystemPointsEarned?: number | null
          subsystemReason?: string | null
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
