import { useState, useEffect, useCallback } from 'react'
import { 
  youthService, 
  behaviorPointsService, 
  caseNotesService, 
  dailyRatingsService,
  type Youth,
  type YouthInsert,
  type YouthUpdate,
  type BehaviorPoints,
  type BehaviorPointsInsert,
  type CaseNotes,
  type CaseNotesInsert,
  type DailyRatings,
  type DailyRatingsInsert
} from '@/integrations/firebase/services'
import { useToast } from '@/hooks/use-toast'

// Custom hook for youth operations
export const useYouth = () => {
  const [youths, setYouths] = useState<Youth[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadYouths = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await youthService.getAll()
      setYouths(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load youth profiles'
      setError(errorMessage)
      toast({
        title: "Error Loading Data",
        description: errorMessage,
        variant: "destructive",
      })
      return []
    } finally {
      setLoading(false)
    }
  }

  const createYouth = async (youthData: YouthInsert) => {
    try {
      setLoading(true)
      const newYouth = await youthService.create(youthData)
      setYouths(prev => [newYouth, ...prev])
      toast({
        title: "Success",
        description: `${newYouth.firstName} ${newYouth.lastName}'s profile has been created.`,
      })
      return newYouth
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create youth profile'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateYouth = async (id: string, updates: YouthUpdate) => {
    try {
      setLoading(true)
      console.log('Updating youth with ID:', id, 'Updates:', updates)
      
      // Validate that the youth exists first
      const existingYouth = youths.find(y => y.id === id)
      if (!existingYouth) {
        console.warn('Youth not found in local state, attempting update anyway')
      }
      
      const updatedYouth = await youthService.update(id, updates)
      setYouths(prev => prev.map(y => y.id === id ? updatedYouth : y))
      console.log('Youth updated successfully:', updatedYouth)
      return updatedYouth
    } catch (err) {
      console.error('Update youth error:', err)
      
      // Provide more detailed error information
      if (err && typeof err === 'object' && 'message' in err) {
        const supabaseError = err as { message?: string; details?: string; hint?: string; code?: string }
        console.error('Detailed error info:', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code
        })
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to update youth profile'
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const deleteYouth = async (id: string) => {
    try {
      setLoading(true)
      const youthToDelete = youths.find(y => y.id === id)
      await youthService.delete(id)
      setYouths(prev => prev.filter(y => y.id !== id))
      if (youthToDelete) {
        toast({
          title: "Success",
          description: `${youthToDelete.firstName} ${youthToDelete.lastName}'s profile has been deleted.`,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete youth profile'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const dischargeYouth = async (id: string, data: {
    dischargeCategory: string
    dischargeReason: string
    dischargeNotes?: string
    dischargedBy?: string
  }) => {
    try {
      setLoading(true)
      const youth = youths.find(y => y.id === id)
      await youthService.discharge(id, data)
      setYouths(prev => prev.filter(y => y.id !== id))
      if (youth) {
        toast({
          title: "Youth Discharged",
          description: `${youth.firstName} ${youth.lastName} has been discharged.`,
        })
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to discharge youth'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const searchYouths = async (searchTerm: string) => {
    try {
      setLoading(true)
      const results = await youthService.searchByName(searchTerm)
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search youth profiles'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    youths,
    loading,
    error,
    loadYouths,
    createYouth,
    updateYouth,
    deleteYouth,
    dischargeYouth,
    searchYouths
  }
}

// Custom hook for behavior points operations
export const useBehaviorPoints = (youthId?: string) => {
  const [behaviorPoints, setBehaviorPoints] = useState<BehaviorPoints[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadBehaviorPoints = async (id: string, limit?: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await behaviorPointsService.getByYouthId(id, limit)
      setBehaviorPoints(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load behavior points'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const saveBehaviorPoints = async (pointsData: BehaviorPointsInsert) => {
    try {
      setLoading(true)
      const saved = await behaviorPointsService.upsert(pointsData)
      setBehaviorPoints(prev => {
        const existing = prev.find(p => p.youth_id === saved.youth_id && p.date === saved.date)
        if (existing) {
          return prev.map(p => p.id === saved.id ? saved : p)
        } else {
          return [saved, ...prev]
        }
      })
      toast({
        title: "Success",
        description: "Behavior points have been saved.",
      })
      return saved
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save behavior points'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getBehaviorPointsForDate = async (id: string, date: string) => {
    try {
      return await behaviorPointsService.getByDate(id, date)
    } catch (err) {
      console.error('Failed to get behavior points for date:', err)
      return null
    }
  }

  const deleteAllBehaviorPoints = async (id: string) => {
    try {
      setLoading(true)
      await behaviorPointsService.deleteAllForYouth(id)
      setBehaviorPoints([])
      toast({
        title: "Success",
        description: "All behavior points have been deleted.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete behavior points'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (youthId) {
      loadBehaviorPoints(youthId)
    }
  }, [youthId])

  return {
    behaviorPoints,
    loading,
    error,
    loadBehaviorPoints,
    saveBehaviorPoints,
    getBehaviorPointsForDate,
    deleteAllBehaviorPoints
  }
}

// Custom hook for case notes operations
export const useCaseNotes = (youthId?: string) => {
  const [caseNotes, setCaseNotes] = useState<CaseNotes[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadCaseNotes = async (id: string, limit?: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await caseNotesService.getByYouthId(id, limit)
      setCaseNotes(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load case notes'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }

  const createCaseNote = async (noteData: CaseNotesInsert) => {
    try {
      setLoading(true)
      const newNote = await caseNotesService.create(noteData)
      setCaseNotes(prev => [newNote, ...prev])
      toast({
        title: "Success",
        description: "Case note has been created.",
      })
      return newNote
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create case note'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateCaseNote = async (id: string, updates: Partial<CaseNotes>) => {
    try {
      setLoading(true)
      const updated = await caseNotesService.update(id, updates)
      setCaseNotes(prev => prev.map(n => n.id === id ? updated : n))
      toast({
        title: "Success",
        description: "Case note has been updated.",
      })
      return updated
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update case note'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  const deleteCaseNote = async (id: string) => {
    try {
      setLoading(true)
      await caseNotesService.delete(id)
      setCaseNotes(prev => prev.filter(n => n.id !== id))
      toast({
        title: "Success",
        description: "Case note has been deleted.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete case note'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (youthId) {
      loadCaseNotes(youthId)
    }
  }, [youthId])

  return {
    caseNotes,
    loading,
    error,
    loadCaseNotes,
    createCaseNote,
    updateCaseNote,
    deleteCaseNote
  }
}

// Custom hook for daily ratings operations
export const useDailyRatings = (youthId?: string) => {
  const [dailyRatings, setDailyRatings] = useState<DailyRatings[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const loadDailyRatings = useCallback(async (id: string, limit?: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await dailyRatingsService.getByYouthId(id, limit)
      setDailyRatings(data)
      return data
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load daily ratings'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const saveDailyRating = useCallback(async (ratingData: DailyRatingsInsert & { time_of_day?: 'morning' | 'day' | 'evening' }) => {
    try {
      setLoading(true)
      const saved = await dailyRatingsService.upsert(ratingData)
      setDailyRatings(prev => {
        // Add new rating to the list (allowing multiple entries per day)
        return [saved, ...prev]
      })
      toast({
        title: "Success",
        description: "Daily rating has been saved.",
      })
      return saved
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save daily rating'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  const getDailyRatingForDate = useCallback(async (id: string, date: string, timeOfDay?: 'morning' | 'day' | 'evening') => {
    try {
      return await dailyRatingsService.getByDate(id, date, timeOfDay)
    } catch (err) {
      console.error('Failed to get daily rating for date:', err)
      return null
    }
  }, [])

  const clearDailyRatings = useCallback(async (id: string, startDate: Date, endDate: Date) => {
    try {
      setLoading(true)
      await dailyRatingsService.deleteByDateRange(id, startDate, endDate)

      // Update local state by filtering out deleted ratings
      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      setDailyRatings(prev =>
        prev.filter(rating => {
          const ratingDate = new Date(rating.date).toISOString().split('T')[0]
          return ratingDate < startDateStr || ratingDate > endDateStr
        })
      )

      toast({
        title: "Success",
        description: "Daily ratings have been cleared for the specified period.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear daily ratings'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  const deleteDailyRating = useCallback(async (id: string) => {
    try {
      setLoading(true)
      await dailyRatingsService.delete(id)

      // Update local state by removing the deleted rating
      setDailyRatings(prev => prev.filter(rating => rating.id !== id))

      toast({
        title: "Success",
        description: "Daily rating has been deleted.",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete daily rating'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
      throw err
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (youthId) {
      loadDailyRatings(youthId)
    }
  }, [youthId, loadDailyRatings])

  return {
    dailyRatings,
    loading,
    error,
    loadDailyRatings,
    saveDailyRating,
    getDailyRatingForDate,
    clearDailyRatings,
    deleteDailyRating
  }
}
