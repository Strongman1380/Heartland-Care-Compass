export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      daily_ratings: {
        Row: {
          adult_interaction: number | null
          comments: string | null
          created_at: string
          date: string
          deal_authority: number | null
          id: string
          investment_level: number | null
          peer_interaction: number | null
          staff: string | null
          updated_at: string
          youth_id: string
        }
        Insert: {
          adult_interaction?: number | null
          comments?: string | null
          created_at?: string
          date?: string
          deal_authority?: number | null
          id?: string
          investment_level?: number | null
          peer_interaction?: number | null
          staff?: string | null
          updated_at?: string
          youth_id: string
        }
        Update: {
          adult_interaction?: number | null
          comments?: string | null
          created_at?: string
          date?: string
          deal_authority?: number | null
          id?: string
          investment_level?: number | null
          peer_interaction?: number | null
          staff?: string | null
          updated_at?: string
          youth_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          category: string | null
          createdat: string | null
          date: string | null
          id: string
          note: string | null
          rating: number | null
          staff: string | null
          youth_id: string | null
        }
        Insert: {
          category?: string | null
          createdat?: string | null
          date?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          staff?: string | null
          youth_id?: string | null
        }
        Update: {
          category?: string | null
          createdat?: string | null
          date?: string | null
          id?: string
          note?: string | null
          rating?: number | null
          staff?: string | null
          youth_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youths"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          afternoonpoints: number | null
          comments: string | null
          createdat: string | null
          date: string | null
          eveningpoints: number | null
          id: string
          morningpoints: number | null
          totalpoints: number | null
          youth_id: string | null
        }
        Insert: {
          afternoonpoints?: number | null
          comments?: string | null
          createdat?: string | null
          date?: string | null
          eveningpoints?: number | null
          id?: string
          morningpoints?: number | null
          totalpoints?: number | null
          youth_id?: string | null
        }
        Update: {
          afternoonpoints?: number | null
          comments?: string | null
          createdat?: string | null
          date?: string | null
          eveningpoints?: number | null
          id?: string
          morningpoints?: number | null
          totalpoints?: number | null
          youth_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youths"
            referencedColumns: ["id"]
          },
        ]
      }
      real_colors_assessments: {
        Row: {
          assessment_date: string
          comments: string | null
          completed_by: string | null
          created_at: string
          id: string
          insights: string | null
          is_screening: boolean | null
          observations: string | null
          primary_color: string
          secondary_color: string | null
          updated_at: string
          youth_id: string
        }
        Insert: {
          assessment_date?: string
          comments?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          insights?: string | null
          is_screening?: boolean | null
          observations?: string | null
          primary_color: string
          secondary_color?: string | null
          updated_at?: string
          youth_id: string
        }
        Update: {
          assessment_date?: string
          comments?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          insights?: string | null
          is_screening?: boolean | null
          observations?: string | null
          primary_color?: string
          secondary_color?: string | null
          updated_at?: string
          youth_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "real_colors_assessments_youth_id_fkey"
            columns: ["youth_id"]
            isOneToOne: false
            referencedRelation: "youths"
            referencedColumns: ["id"]
          },
        ]
      }
      riskassessments: {
        Row: {
          assessmentdate: string
          completedby: string | null
          createdat: string
          domains: Json | null
          id: string
          interventiontargets: string | null
          overallrisklevel: string | null
          recommendedlevel: string | null
          strengths: string | null
          traumahistory: string | null
          updatedat: string
          youth_id: string
        }
        Insert: {
          assessmentdate?: string
          completedby?: string | null
          createdat?: string
          domains?: Json | null
          id: string
          interventiontargets?: string | null
          overallrisklevel?: string | null
          recommendedlevel?: string | null
          strengths?: string | null
          traumahistory?: string | null
          updatedat?: string
          youth_id: string
        }
        Update: {
          assessmentdate?: string
          completedby?: string | null
          createdat?: string
          domains?: Json | null
          id?: string
          interventiontargets?: string | null
          overallrisklevel?: string | null
          recommendedlevel?: string | null
          strengths?: string | null
          traumahistory?: string | null
          updatedat?: string
          youth_id?: string
        }
        Relationships: []
      }
      worksheets: {
        Row: {
          createdat: string
          events: Json | null
          id: string
          skillstoimprove: string[] | null
          summary: string | null
          updatedat: string
          youth_id: string
        }
        Insert: {
          createdat?: string
          events?: Json | null
          id: string
          skillstoimprove?: string[] | null
          summary?: string | null
          updatedat?: string
          youth_id: string
        }
        Update: {
          createdat?: string
          events?: Json | null
          id?: string
          skillstoimprove?: string[] | null
          summary?: string | null
          updatedat?: string
          youth_id?: string
        }
        Relationships: []
      }
      youths: {
        Row: {
          admissiondate: string | null
          age: number | null
          createdat: string | null
          dob: string | null
          educationinfo: string | null
          firstname: string
          id: string
          lastname: string
          legalstatus: string | null
          level: number | null
          medicalinfo: string | null
          mentalhealthinfo: string | null
          pointtotal: number | null
          referralreason: string | null
          referralsource: string | null
          updatedat: string | null
        }
        Insert: {
          admissiondate?: string | null
          age?: number | null
          createdat?: string | null
          dob?: string | null
          educationinfo?: string | null
          firstname: string
          id?: string
          lastname: string
          legalstatus?: string | null
          level?: number | null
          medicalinfo?: string | null
          mentalhealthinfo?: string | null
          pointtotal?: number | null
          referralreason?: string | null
          referralsource?: string | null
          updatedat?: string | null
        }
        Update: {
          admissiondate?: string | null
          age?: number | null
          createdat?: string | null
          dob?: string | null
          educationinfo?: string | null
          firstname?: string
          id?: string
          lastname?: string
          legalstatus?: string | null
          level?: number | null
          medicalinfo?: string | null
          mentalhealthinfo?: string | null
          pointtotal?: number | null
          referralreason?: string | null
          referralsource?: string | null
          updatedat?: string | null
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
