import { supabase } from './client'

export type CreditRow = { id: string; student_id: string; date_earned: string; credit_value: number; created_at: string; updated_at: string }
export type GradeRow = { id: string; student_id: string; date_entered: string; grade_value: number; created_at: string; updated_at: string }
export type StepRow = { id: string; student_id: string; date_completed: string; steps_count: number; created_at: string; updated_at: string }

export const academicsService = {
  credits: {
    async list(): Promise<CreditRow[]> {
      const { data, error } = await supabase.from('academic_credits').select('*').order('date_earned', { ascending: false })
      if (error) throw error
      return (data || []) as CreditRow[]
    },
    async save(row: Partial<CreditRow> & { student_id: string; date_earned: string; credit_value: number }): Promise<CreditRow> {
      const payload: any = { ...row }
      const { data, error } = await supabase
        .from('academic_credits')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as CreditRow
    },
    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('academic_credits').delete().eq('id', id)
      if (error) throw error
    }
  },
  grades: {
    async list(): Promise<GradeRow[]> {
      const { data, error } = await supabase.from('academic_grades').select('*').order('date_entered', { ascending: false })
      if (error) throw error
      return (data || []) as GradeRow[]
    },
    async save(row: Partial<GradeRow> & { student_id: string; date_entered: string; grade_value: number }): Promise<GradeRow> {
      const payload: any = { ...row }
      const { data, error } = await supabase
        .from('academic_grades')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as GradeRow
    },
    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('academic_grades').delete().eq('id', id)
      if (error) throw error
    }
  },
  steps: {
    async list(): Promise<StepRow[]> {
      const { data, error } = await supabase.from('academic_steps').select('*').order('date_completed', { ascending: false })
      if (error) throw error
      return (data || []) as StepRow[]
    },
    async save(row: Partial<StepRow> & { student_id: string; date_completed: string; steps_count: number }): Promise<StepRow> {
      const payload: any = { ...row }
      const { data, error } = await supabase
        .from('academic_steps')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single()
      if (error) throw error
      return data as StepRow
    },
    async delete(id: string): Promise<void> {
      const { error } = await supabase.from('academic_steps').delete().eq('id', id)
      if (error) throw error
    }
  }
}

