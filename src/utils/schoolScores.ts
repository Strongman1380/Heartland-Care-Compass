// Lightweight localStorage-based persistence for School daily scores
// This can be migrated to Supabase later without changing the page’s UI logic.

import { v4 as uuidv4 } from '@/utils/uuid'
import { schoolScoresService } from '@/integrations/supabase/schoolScoresService'

export type SchoolDailyScore = {
  id: string
  youth_id: string
  date: string // ISO date yyyy-mm-dd
  weekday: number // 1=Mon ... 5=Fri
  score: number
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'heartland_school_scores'

type PlainScore = Omit<SchoolDailyScore, 'id' | 'createdAt' | 'updatedAt'>

const readAll = (): SchoolDailyScore[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const writeAll = (items: SchoolDailyScore[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    console.error('Failed saving school scores', e)
  }
}

export const upsertScore = (youthId: string, dateISO: string, weekday: number, score: number): SchoolDailyScore => {
  const now = new Date().toISOString()
  // Try Supabase first; if it throws (env/offline), fallback to local
  try {
    // Fire and forget with optimistic local update; async persist to Supabase
    void schoolScoresService.upsert(youthId, dateISO, weekday, score)
  } catch {}

  const all = readAll()
  const idx = all.findIndex(s => s.youth_id === youthId && s.date === dateISO)
  if (idx !== -1) {
    const updated: SchoolDailyScore = { ...all[idx], weekday, score, updatedAt: now }
    all[idx] = updated
    writeAll(all)
    return updated
  }
  const created: SchoolDailyScore = { id: uuidv4(), youth_id: youthId, date: dateISO, weekday, score, createdAt: now, updatedAt: now }
  writeAll([created, ...all])
  return created
}

export const getScore = (youthId: string, dateISO: string): SchoolDailyScore | null => {
  // Prefer cached local for speed; remote can hydrate elsewhere
  const all = readAll()
  return all.find(s => s.youth_id === youthId && s.date === dateISO) || null
}

// Cache to prevent infinite API calls
const syncCache = new Map<string, number>();
const SYNC_COOLDOWN = 10000; // 10 seconds between syncs for same range to prevent resource exhaustion

export const getScoresForRange = (startISO: string, endISO: string, forceSync: boolean = false): SchoolDailyScore[] => {
  // Attempt to refresh from Supabase in the background (with cooldown)
  const cacheKey = `${startISO}|${endISO}`;
  const lastSync = syncCache.get(cacheKey) || 0;
  const now = Date.now();

  if (forceSync || now - lastSync > SYNC_COOLDOWN) {
    syncCache.set(cacheKey, now);

    // Fire and forget with proper error handling
    (async () => {
      try {
        const remote = await schoolScoresService.range(startISO, endISO)
        if (remote && remote.length) {
          // Merge into local cache, preferring remote data (it's the source of truth)
          const map = new Map<string, SchoolDailyScore>()

          // First add all local scores
          const all = readAll()
          for (const l of all) map.set(`${l.youth_id}|${l.date}`, l)

          // Then overwrite with remote scores (remote is source of truth)
          for (const r of remote) {
            map.set(`${r.youth_id}|${r.date}`, {
              id: r.id,
              youth_id: r.youth_id,
              date: r.date,
              weekday: r.weekday,
              score: r.score,
              createdAt: r.created_at,
              updatedAt: r.updated_at,
            })
          }

          writeAll(Array.from(map.values()))
        }
      } catch (error) {
        // Silently fail - we'll use local cache
        console.warn('School scores sync failed, using local cache:', error);
      }
    })()
  }

  const all = readAll()
  const start = new Date(startISO).getTime()
  const end = new Date(endISO).getTime()
  return all.filter(s => {
    const t = new Date(s.date).getTime()
    return t >= start && t <= end
  })
}

export const bulkUpsert = (items: PlainScore[]) => {
  const all = readAll()
  const now = new Date().toISOString()
  const map = new Map<string, SchoolDailyScore>()

  // seed existing
  for (const s of all) map.set(`${s.youth_id}|${s.date}`, s)

  for (const it of items) {
    const key = `${it.youth_id}|${it.date}`
    const existing = map.get(key)
    if (existing) {
      map.set(key, { ...existing, weekday: it.weekday, score: it.score, updatedAt: now })
    } else {
      map.set(key, { id: uuidv4(), youth_id: it.youth_id, date: it.date, weekday: it.weekday, score: it.score, createdAt: now, updatedAt: now })
    }
  }

  writeAll(Array.from(map.values()))
}

export const getAllScores = (): SchoolDailyScore[] => {
  return readAll()
}

export const getScoresByYouth = (youthId: string): SchoolDailyScore[] => {
  const all = readAll()
  return all.filter(s => s.youth_id === youthId).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

export const calculateYouthAverage = (youthId: string, days: number = 30): number | null => {
  const scores = getScoresByYouth(youthId)
  if (scores.length === 0) return null
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const recentScores = scores.filter(s => new Date(s.date) >= cutoffDate)
  if (recentScores.length === 0) return null
  
  const sum = recentScores.reduce((acc, s) => acc + s.score, 0)
  return sum / recentScores.length
}

export const calculateOverallAverage = (days: number = 30): number | null => {
  const all = readAll()
  if (all.length === 0) return null
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  const recentScores = all.filter(s => new Date(s.date) >= cutoffDate)
  if (recentScores.length === 0) return null
  
  const sum = recentScores.reduce((acc, s) => acc + s.score, 0)
  return sum / recentScores.length
}

export type YouthScoreStats = {
  youthId: string
  totalScores: number
  average: number
  highest: number
  lowest: number
  trend: 'improving' | 'declining' | 'stable'
  recentAverage: number // Last 7 days
  previousAverage: number // Previous 7 days before that
}

export const getYouthStats = (youthId: string): YouthScoreStats | null => {
  const scores = getScoresByYouth(youthId)
  if (scores.length === 0) return null
  
  const allScoresValues = scores.map(s => s.score)
  const average = allScoresValues.reduce((a, b) => a + b, 0) / allScoresValues.length
  const highest = Math.max(...allScoresValues)
  const lowest = Math.min(...allScoresValues)
  
  // Calculate recent vs previous average for trend
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  const recentScores = scores.filter(s => new Date(s.date) >= sevenDaysAgo)
  const previousScores = scores.filter(s => {
    const date = new Date(s.date)
    return date >= fourteenDaysAgo && date < sevenDaysAgo
  })
  
  const recentAverage = recentScores.length > 0
    ? recentScores.reduce((a, b) => a + b.score, 0) / recentScores.length
    : average
  
  const previousAverage = previousScores.length > 0
    ? previousScores.reduce((a, b) => a + b.score, 0) / previousScores.length
    : average
  
  // Trend thresholds adjusted for 0–4 rating scale
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  const diff = recentAverage - previousAverage
  if (diff > 0.2) trend = 'improving'
  else if (diff < -0.2) trend = 'declining'
  
  return {
    youthId,
    totalScores: scores.length,
    average: parseFloat(average.toFixed(1)),
    highest,
    lowest,
    trend,
    recentAverage: parseFloat(recentAverage.toFixed(1)),
    previousAverage: parseFloat(previousAverage.toFixed(1))
  }
}
