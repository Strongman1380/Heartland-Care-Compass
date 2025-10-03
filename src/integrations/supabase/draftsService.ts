import { supabase } from './client'

export type DraftRow = {
  id: string
  youth_id: string | null
  draft_type: string
  author_id: string | null
  data: any
  updated_at: string
}

export const draftsService = {
  async get(youth_id: string | null, draft_type: string, author_id: string | null): Promise<DraftRow | null> {
    let query = supabase.from('report_drafts').select('*').eq('draft_type', draft_type)
    if (youth_id) query = query.eq('youth_id', youth_id)
    if (author_id) query = query.eq('author_id', author_id)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data as DraftRow | null
  },
  async save(youth_id: string | null, draft_type: string, author_id: string | null, dataJson: any): Promise<DraftRow> {
    const payload: any = {
      youth_id,
      draft_type,
      author_id,
      data: dataJson
    }
    const { data, error } = await supabase
      .from('report_drafts')
      .upsert(payload)
      .select()
      .single()
    if (error) throw error
    return data as DraftRow
  },
  async delete(youth_id: string | null, draft_type: string, author_id: string | null): Promise<void> {
    let query = supabase.from('report_drafts').delete().eq('draft_type', draft_type)
    if (youth_id) query = query.eq('youth_id', youth_id)
    if (author_id) query = query.eq('author_id', author_id)
    const { error } = await query
    if (error) throw error
  }
}

