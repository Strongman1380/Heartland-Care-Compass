import { useState, useEffect } from 'react'
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
} from '@/integrations/supabase/services'
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
      const updatedYouth = await youthService.update(id, updates)
      setYouths(prev => prev.map(y => y.id === id ? updatedYouth : y))
      toast({
        title: "Success",
        description: `${updatedYouth.firstName} ${updatedYouth.lastName}'s profile has been updated.`,
      })
      return updatedYouth
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update youth profile'
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
    getBehaviorPointsForDate
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

  const loadDailyRatings = async (id: string, limit?: number) => {
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
  }

  const saveDailyRating = async (ratingData: DailyRatingsInsert) => {
    try {
      setLoading(true)
      const saved = await dailyRatingsService.upsert(ratingData)
      setDailyRatings(prev => {
        const existing = prev.find(r => r.youth_id === saved.youth_id && r.date === saved.date)
        if (existing) {
          return prev.map(r => r.id === saved.id ? saved : r)
        } else {
          return [saved, ...prev]
        }
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
  }

  const getDailyRatingForDate = async (id: string, date: string) => {
    try {
      return await dailyRatingsService.getByDate(id, date)
    } catch (err) {
      console.error('Failed to get daily rating for date:', err)
      return null
    }
  }

  useEffect(() => {
    if (youthId) {
      loadDailyRatings(youthId)
    }
  }, [youthId])

  return {
    dailyRatings,
    loading,
    error,
    loadDailyRatings,
    saveDailyRating,
    getDailyRatingForDate
  }
}