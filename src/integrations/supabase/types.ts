export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
