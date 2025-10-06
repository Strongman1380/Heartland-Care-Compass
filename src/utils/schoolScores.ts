// Supabase-only persistence for School daily scores
// All data is fetched directly from Supabase with no localStorage caching

import { schoolScoresService, type SchoolScoreRow } from '@/integrations/supabase/schoolScoresService'

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

// Convert Supabase row to our internal format
const convertRow = (row: SchoolScoreRow): SchoolDailyScore => ({
  id: row.id,
  youth_id: row.youth_id,
  date: row.date,
  weekday: row.weekday,
  score: row.score,
  createdAt: row.created_at,
  updatedAt: row.updated_at
})

export const upsertScore = async (youthId: string, dateISO: string, weekday: number, score: number): Promise<SchoolDailyScore> => {
  const result = await schoolScoresService.upsert(youthId, dateISO, weekday, score)
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
    await schoolScoresService.upsert(item.youth_id, item.date, item.weekday, item.score)
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

  // Calculate trend by comparing most recent 5 scores vs previous 5 scores
  // This approach works better for sparse data than fixed date ranges
  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  let recentAverage = average
  let previousAverage = average

  if (scores.length >= 2) {
    // Sort scores by date descending (most recent first)
    const sortedScores = [...scores].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Use flexible sliding window based on available data
    const windowSize = Math.min(5, Math.floor(scores.length / 2))

    if (windowSize >= 1 && scores.length >= windowSize * 2) {
      // Recent: Most recent windowSize scores
      const recentScores = sortedScores.slice(0, windowSize)
      recentAverage = recentScores.reduce((a, b) => a + b.score, 0) / recentScores.length

      // Previous: Next windowSize scores (older)
      const previousScores = sortedScores.slice(windowSize, windowSize * 2)
      previousAverage = previousScores.reduce((a, b) => a + b.score, 0) / previousScores.length

      // Calculate trend with 0.2 threshold for 0-4 scale
      const diff = recentAverage - previousAverage
      if (diff > 0.2) {
        trend = 'improving'
      } else if (diff < -0.2) {
        trend = 'declining'
      }

      console.log(`[Trend] ${youthId}: Recent ${windowSize} avg=${recentAverage.toFixed(1)}, Previous ${windowSize} avg=${previousAverage.toFixed(1)}, Diff=${diff.toFixed(2)}, Trend=${trend}`)
    } else {
      // Not enough data for trend comparison
      console.log(`[Trend] ${youthId}: Insufficient data for trend (${scores.length} scores, need at least ${windowSize * 2})`)
    }
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
