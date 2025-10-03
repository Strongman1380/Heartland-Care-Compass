import { supabase } from './client'

export type SchoolIncident = {
  incident_id: string
  date_time: string
  reported_by: any
  location: string
  incident_type: string
  severity: 'Low'|'Medium'|'High'|'Critical'
  summary: string
  timeline: any[]
  actions_taken?: string
  medical_needed: boolean
  medical_details?: string
  attachments: any[]
  staff_signatures: any[]
  follow_up?: any
  confidential_notes?: string
  created_at: string
  updated_at: string
}

export type Involved = { id: string; incident_id: string; resident_id: string; name?: string; role_in_incident: string }

export const schoolIncidentsService = {
  async list(): Promise<SchoolIncident[]> {
    const { data, error } = await supabase.from('school_incidents').select('*').order('date_time', { ascending: false })
    if (error) throw error
    return (data || []) as SchoolIncident[]
  },

  async get(incident_id: string): Promise<SchoolIncident | null> {
    const { data, error } = await supabase.from('school_incidents').select('*').eq('incident_id', incident_id).maybeSingle()
    if (error) throw error
    return data as SchoolIncident | null
  },

  async upsert(incident: Partial<SchoolIncident> & { incident_id?: string }): Promise<SchoolIncident> {
    // If no id, create a new incident_id client-side with year prefix
    let payload = { ...incident } as any
    if (!payload.incident_id) {
      const year = new Date().getFullYear()
      const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
      payload.incident_id = `HHH-${year}-${rand}`
    }
    const { data, error } = await supabase
      .from('school_incidents')
      .upsert(payload, { onConflict: 'incident_id' })
      .select()
      .single()
    if (error) throw error
    return data as SchoolIncident
  },

  async delete(incident_id: string): Promise<void> {
    const { error } = await supabase.from('school_incidents').delete().eq('incident_id', incident_id)
    if (error) throw error
  },

  async listInvolved(incident_id: string): Promise<Involved[]> {
    const { data, error } = await supabase.from('school_incident_involved').select('*').eq('incident_id', incident_id)
    if (error) throw error
    return (data || []) as Involved[]
  },

  async upsertInvolved(rows: Omit<Involved, 'id'>[]): Promise<Involved[]> {
    const { data, error } = await supabase.from('school_incident_involved').upsert(rows as any).select('*')
    if (error) throw error
    return (data || []) as Involved[]
  },

  async deleteInvolvedByIncident(incident_id: string): Promise<void> {
    const { error } = await supabase.from('school_incident_involved').delete().eq('incident_id', incident_id)
    if (error) throw error
  }
}

