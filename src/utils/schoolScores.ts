// Firebase persistence for School daily scores
// All data is fetched directly from Firestore with no localStorage caching

import { schoolScoresService, type SchoolScoreRow } from '@/integrations/firebase/schoolScoresService'

export type SchoolDailyScore = {
  id: string
  youth_id: string
  date: string // ISO date yyyy-mm-dd
  weekday: number // 1=Mon ... 5=Fri
  score: number
  createdAt: string
  updatedAt: string
}

type PlainScore = Omit<SchoolDailyScore, 'id' | 'createdAt' | 'updatedAt'>

const clampScore = (value: number): number => {
  if (Number.isNaN(value)) return 0
  return Math.min(Math.max(value, 0), 4)
}

const prepareScoreForStorage = (score: number): number => {
  const clamped = clampScore(score)
  if (clamped > 4) {
    return Math.round(clamped)
  }
  // store tenth increments (0-40) to keep decimals while satisfying integer constraint
  return Math.round(clamped * 10)
}

const normalizeStoredScore = (storedScore: number): number => {
  if (storedScore > 40) {
    return parseFloat((storedScore / 25).toFixed(1))
  }
  if (storedScore > 4) {
    return parseFloat((storedScore / 10).toFixed(1))
  }
  return storedScore
}

// Convert Supabase row to our internal format
const convertRow = (row: SchoolScoreRow): SchoolDailyScore => ({
  id: row.id,
  youth_id: row.youth_id,
  date: row.date,
  weekday: row.weekday,
  score: normalizeStoredScore(row.score),
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const upsertScore = async (youthId: string, dateISO: string, weekday: number, score: number): Promise<SchoolDailyScore> => {
  const result = await schoolScoresService.upsert(
    youthId,
    dateISO,
    weekday,
    prepareScoreForStorage(score)
  )
  return convertRow(result)
}

export const getScore = async (youthId: string, dateISO: string): Promise<SchoolDailyScore | null> => {
  const result = await schoolScoresService.get(youthId, dateISO)
  return result ? convertRow(result) : null
}

export const getScoresForRange = async (startISO: string, endISO: string): Promise<SchoolDailyScore[]> => {
  const results = await schoolScoresService.range(startISO, endISO)
  return results.map(convertRow)
}

// No-op for compatibility - sync is immediate with Supabase
export const waitForSync = async (_startISO: string, _endISO: string): Promise<void> => {
  // No-op: direct Supabase queries don't need sync waiting
}

export const bulkUpsert = async (items: PlainScore[]): Promise<void> => {
  // Upsert each item sequentially
  // Could be optimized with batch operations if needed
  for (const item of items) {
    await schoolScoresService.upsert(
      item.youth_id,
      item.date,
      item.weekday,
      prepareScoreForStorage(item.score)
    )
  }
}

export const getAllScores = async (): Promise<SchoolDailyScore[]> => {
  // Fetch all scores from Supabase
  // Using a very wide date range to get all records
  const farPast = '2000-01-01'
  const farFuture = '2099-12-31'
  const results = await schoolScoresService.range(farPast, farFuture)
  return results.map(convertRow)
}

export const getScoresByYouth = async (youthId: string): Promise<SchoolDailyScore[]> => {
  const results = await schoolScoresService.forYouth(youthId)
  return results.map(convertRow)
}

export const calculateYouthAverage = async (youthId: string, days: number = 30): Promise<number | null> => {
  const scores = await getScoresByYouth(youthId)
  if (scores.length === 0) return null

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)

  const recentScores = scores.filter(s => new Date(s.date) >= cutoffDate)
  if (recentScores.length === 0) return null

  const sum = recentScores.reduce((acc, s) => acc + s.score, 0)
  return sum / recentScores.length
}

export const calculateOverallAverage = async (days: number = 30): Promise<number | null> => {
  const all = await getAllScores()
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

export const getYouthStats = async (youthId: string): Promise<YouthScoreStats | null> => {
  const scores = await getScoresByYouth(youthId)
  if (scores.length === 0) return null

  const allScoresValues = scores.map(s => s.score)
  const average = allScoresValues.reduce((a, b) => a + b, 0) / allScoresValues.length
  const highest = Math.max(...allScoresValues)
  const lowest = Math.min(...allScoresValues)

  // Calculate trend by comparing recent scores vs older scores
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  let recentAverage = average
  let previousAverage = average

  if (scores.length >= 4) { // Need at least 4 scores for meaningful trend analysis
    // Sort scores by date descending (most recent first)
    const sortedScores = [...scores].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Use a more aggressive window size for better trend detection
    // Take at least 2 scores per window, up to 1/3 of total scores
    const windowSize = Math.max(2, Math.min(Math.floor(scores.length / 3), 7))

    if (scores.length >= windowSize * 2) {
      // Recent: Most recent windowSize scores
      const recentScores = sortedScores.slice(0, windowSize)
      recentAverage = recentScores.reduce((a, b) => a + b.score, 0) / recentScores.length

      // Previous: Next windowSize scores (older)
      const previousScores = sortedScores.slice(windowSize, windowSize * 2)
      previousAverage = previousScores.reduce((a, b) => a + b.score, 0) / previousScores.length

      // Calculate trend with more sensitive threshold (0.15 instead of 0.2)
      const diff = recentAverage - previousAverage
      if (diff > 0.15) {
        trend = 'improving'
      } else if (diff < -0.15) {
        trend = 'declining'
      }

      console.log(`[Trend] ${youthId}: Recent ${windowSize} scores avg=${recentAverage.toFixed(2)}, Previous ${windowSize} scores avg=${previousAverage.toFixed(2)}, Diff=${diff.toFixed(2)}, Trend=${trend}`)
    } else {
      console.log(`[Trend] ${youthId}: Insufficient data for trend (${scores.length} scores, need at least ${windowSize * 2})`)
    }
  } else if (scores.length >= 2) {
    // For very limited data, use simple comparison of most recent vs oldest
    const sortedScores = [...scores].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    
    const mostRecent = sortedScores[0].score
    const oldest = sortedScores[sortedScores.length - 1].score
    const diff = mostRecent - oldest
    
    if (diff > 0.1) {
      trend = 'improving'
    } else if (diff < -0.1) {
      trend = 'declining'
    }
    
    recentAverage = mostRecent
    previousAverage = oldest
    
    console.log(`[Trend] ${youthId}: Limited data - Most recent=${mostRecent}, Oldest=${oldest}, Diff=${diff.toFixed(2)}, Trend=${trend}`)
  }

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
