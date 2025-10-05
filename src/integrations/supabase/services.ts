import { supabase } from './client'
import type { Database } from './types'

// Type aliases for easier use
type Youth = Database['public']['Tables']['youth']['Row']
type YouthInsert = Database['public']['Tables']['youth']['Insert']
type YouthUpdate = Database['public']['Tables']['youth']['Update']

type BehaviorPoints = Database['public']['Tables']['behavior_points']['Row']
type BehaviorPointsInsert = Database['public']['Tables']['behavior_points']['Insert']
type BehaviorPointsUpdate = Database['public']['Tables']['behavior_points']['Update']

type CaseNotes = Database['public']['Tables']['case_notes']['Row']
type CaseNotesInsert = Database['public']['Tables']['case_notes']['Insert']
type CaseNotesUpdate = Database['public']['Tables']['case_notes']['Update']

type DailyRatings = Database['public']['Tables']['daily_ratings']['Row']
type DailyRatingsInsert = Database['public']['Tables']['daily_ratings']['Insert']
type DailyRatingsUpdate = Database['public']['Tables']['daily_ratings']['Update']

// Youth Services
export const youthService = {
  // Get all youth
  async getAll(): Promise<Youth[]> {
    const { data, error } = await supabase
      .from('youth')
      .select('*')
      .order('createdAt', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get youth by ID
  async getById(id: string): Promise<Youth | null> {
    const { data, error } = await supabase
      .from('youth')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Create new youth
  async create(youth: YouthInsert): Promise<Youth> {
    const { data, error } = await supabase
      .from('youth')
      .insert(youth)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update youth
  async update(id: string, updates: YouthUpdate): Promise<Youth> {
    console.log('Attempting to update youth:', { id, updates })
    
    const { data, error } = await supabase
      .from('youth')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }
    
    console.log('Youth updated successfully:', data)
    return data
  },

  // Delete youth
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('youth')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Search youth by name
  async searchByName(searchTerm: string): Promise<Youth[]> {
    const { data, error } = await supabase
      .from('youth')
      .select('*')
      .or(`firstName.ilike.%${searchTerm}%,lastName.ilike.%${searchTerm}%`)
      .order('createdAt', { ascending: false })
    
    if (error) throw error
    return data || []
  }
}

// Behavior Points Services
export const behaviorPointsService = {
  // Get all behavior points across all youth
  async getAll(): Promise<BehaviorPoints[]> {
    const { data, error } = await supabase
      .from('behavior_points')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get behavior points for a youth
  async getByYouthId(youthId: string, limit?: number): Promise<BehaviorPoints[]> {
    let query = supabase
      .from('behavior_points')
      .select('*')
      .eq('youth_id', youthId)
      .order('date', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  },

  // Get behavior points for a specific date
  async getByDate(youthId: string, date: string): Promise<BehaviorPoints | null> {
    const { data, error } = await supabase
      .from('behavior_points')
      .select('*')
      .eq('youth_id', youthId)
      .eq('date', date)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Create or update behavior points
  async upsert(behaviorPoints: BehaviorPointsInsert): Promise<BehaviorPoints> {
    const { data, error } = await supabase
      .from('behavior_points')
      .upsert(behaviorPoints, { onConflict: 'youth_id,date' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete behavior points
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('behavior_points')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Delete all behavior points for a youth
  async deleteAllForYouth(youthId: string): Promise<void> {
    const { error } = await supabase
      .from('behavior_points')
      .delete()
      .eq('youth_id', youthId)

    if (error) throw error
  }
}

// Case Notes Services
export const caseNotesService = {
  // Get all case notes across all youth
  async getAll(): Promise<CaseNotes[]> {
    const { data, error } = await supabase
      .from('case_notes')
      .select('*')
      .order('date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Get case notes for a youth
  async getByYouthId(youthId: string, limit?: number): Promise<CaseNotes[]> {
    let query = supabase
      .from('case_notes')
      .select('*')
      .eq('youth_id', youthId)
      .order('date', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  },

  // Create case note
  async create(caseNote: CaseNotesInsert): Promise<CaseNotes> {
    const { data, error } = await supabase
      .from('case_notes')
      .insert(caseNote)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Update case note
  async update(id: string, updates: CaseNotesUpdate): Promise<CaseNotes> {
    const { data, error } = await supabase
      .from('case_notes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete case note
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('case_notes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

// Daily Ratings Services
export const dailyRatingsService = {
  // Get daily ratings for a youth
  async getByYouthId(youthId: string, limit?: number): Promise<DailyRatings[]> {
    let query = supabase
      .from('daily_ratings')
      .select('*')
      .eq('youth_id', youthId)
      .order('date', { ascending: false })
    
    if (limit) {
      query = query.limit(limit)
    }
    
    const { data, error } = await query
    
    if (error) throw error
    return data || []
  },

  // Get daily rating for a specific date
  async getByDate(youthId: string, date: string, timeOfDay?: 'morning' | 'day' | 'evening'): Promise<DailyRatings | null> {
    const { data, error } = await supabase
      .from('daily_ratings')
      .select('*')
      .eq('youth_id', youthId)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  },

  // Create or update daily rating
  async upsert(dailyRating: DailyRatingsInsert & { time_of_day?: 'morning' | 'day' | 'evening' }): Promise<DailyRatings> {
    // Remove time_of_day from payload as it doesn't exist in the database schema
    const { time_of_day, ...cleanPayload } = dailyRating as any;

    const { data, error } = await supabase
      .from('daily_ratings')
      // Use youth_id and date as unique constraint (one rating per day per youth)
      .upsert(cleanPayload, { onConflict: 'youth_id,date' })
      .select()
      .single()

    if (error) {
      console.error('Daily rating upsert error:', error);
      throw error;
    }
    return data
  },

  // Delete daily rating
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('daily_ratings')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Delete daily ratings for a youth within a date range (for monthly reset)
  async deleteByDateRange(youthId: string, startDate: Date, endDate: Date): Promise<void> {
    const { error } = await supabase
      .from('daily_ratings')
      .delete()
      .eq('youth_id', youthId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])

    if (error) throw error
  },

  // Delete all daily ratings for a youth
  async deleteAllForYouth(youthId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_ratings')
      .delete()
      .eq('youth_id', youthId)

    if (error) throw error
  }
}

// Utility functions
export const supabaseUtils = {
  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('youth')
        .select('count')
        .limit(1)
      
      return !error
    } catch {
      return false
    }
  },

  // Test if realColorsResult field exists
  async testRealColorsField(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('youth')
        .select('realColorsResult')
        .limit(1)
      
      console.log('Real Colors field test:', { data, error })
      return !error
    } catch (err) {
      console.error('Real Colors field test failed:', err)
      return false
    }
  },

  // Get table schema information
  async getTableInfo(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('youth')
        .select('*')
        .limit(1)
      
      if (error) {
        console.error('Table info error:', error)
        return null
      }
      
      console.log('Sample youth record structure:', data?.[0] ? Object.keys(data[0]) : 'No records found')
      return data?.[0] || null
    } catch (err) {
      console.error('Failed to get table info:', err)
      return null
    }
  },

  // Get database stats
  async getStats() {
    const [youthCount, behaviorPointsCount, caseNotesCount, dailyRatingsCount] = await Promise.all([
      supabase.from('youth').select('count').single(),
      supabase.from('behavior_points').select('count').single(),
      supabase.from('case_notes').select('count').single(),
      supabase.from('daily_ratings').select('count').single()
    ])

    return {
      youth: youthCount.data?.count || 0,
      behaviorPoints: behaviorPointsCount.data?.count || 0,
      caseNotes: caseNotesCount.data?.count || 0,
      dailyRatings: dailyRatingsCount.data?.count || 0
    }
  }
}

// Export types for use in components
export type {
  Youth,
  YouthInsert,
  YouthUpdate,
  BehaviorPoints,
  BehaviorPointsInsert,
  BehaviorPointsUpdate,
  CaseNotes,
  CaseNotesInsert,
  CaseNotesUpdate,
  DailyRatings,
  DailyRatingsInsert,
  DailyRatingsUpdate
}
