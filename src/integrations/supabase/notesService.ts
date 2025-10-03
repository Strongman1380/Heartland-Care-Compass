import { supabase } from './client'

export type NoteRow = { id: string; youth_id: string; author_id?: string | null; category?: string | null; text: string; created_at: string; updated_at: string }

export const notesService = {
  async listForYouth(youth_id: string): Promise<NoteRow[]> {
    const { data, error } = await supabase.from('notes').select('*').eq('youth_id', youth_id).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as NoteRow[]
  },
  async save(row: Partial<NoteRow> & { youth_id: string; text: string }): Promise<NoteRow> {
    const payload: any = { ...row }
    const { data, error } = await supabase.from('notes').upsert(payload, { onConflict: 'id' }).select().single()
    if (error) throw error
    return data as NoteRow
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) throw error
  }
}

