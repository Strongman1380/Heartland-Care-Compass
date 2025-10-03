import { supabase } from './client'

export type AlertRow = { id: string; title: string; body?: string; level: string; status: string; created_at: string; updated_at: string }

export const alertsService = {
  async list(): Promise<AlertRow[]> {
    const { data, error } = await supabase.from('alerts').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as AlertRow[]
  },
  async save(row: Partial<AlertRow> & { title: string; level?: string; status?: string }): Promise<AlertRow> {
    const payload: any = { level: 'info', status: 'open', ...row }
    const { data, error } = await supabase.from('alerts').upsert(payload, { onConflict: 'id' }).select().single()
    if (error) throw error
    return data as AlertRow
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('alerts').delete().eq('id', id)
    if (error) throw error
  }
}

