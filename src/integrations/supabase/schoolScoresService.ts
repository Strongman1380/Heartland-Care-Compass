import { supabase } from './client'

export type SchoolScoreRow = {
  id: string
  youth_id: string
  date: string
  weekday: number
  score: number
  created_at: string
  updated_at: string
}

export const schoolScoresService = {
  async upsert(youth_id: string, date: string, weekday: number, score: number): Promise<SchoolScoreRow> {
    const { data, error } = await supabase
      .from('school_scores')
      .upsert({ youth_id, date, weekday, score }, { onConflict: 'youth_id,date' })
      .select()
      .single()
    if (error) throw error
    return data as SchoolScoreRow
  },

  async get(youth_id: string, date: string): Promise<SchoolScoreRow | null> {
    const { data, error } = await supabase
      .from('school_scores')
      .select('*')
      .eq('youth_id', youth_id)
      .eq('date', date)
      .maybeSingle()
    if (error) throw error
    return data as SchoolScoreRow | null
  },

  async range(startISO: string, endISO: string): Promise<SchoolScoreRow[]> {
    const { data, error } = await supabase
      .from('school_scores')
      .select('*')
      .gte('date', startISO)
      .lte('date', endISO)
      .order('date', { ascending: true })
    if (error) throw error
    return (data || []) as SchoolScoreRow[]
  },

  async forYouth(youth_id: string): Promise<SchoolScoreRow[]> {
    const { data, error } = await supabase
      .from('school_scores')
      .select('*')
      .eq('youth_id', youth_id)
      .order('date', { ascending: false })
    if (error) throw error
    return (data || []) as SchoolScoreRow[]
  }
}

