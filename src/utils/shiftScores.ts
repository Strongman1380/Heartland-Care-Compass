// Weekly Eval & Daily Shift scoring utility layer
// 4-domain model: Peer Interaction, Adult Interaction, Investment Level, Dealing w/ Authority

import {
  weeklyEvalService,
  dailyShiftService,
  type WeeklyEvalRow,
  type DailyShiftRow,
  type ShiftType
} from '@/integrations/firebase/shiftScoresService'

// ── Score normalization (0-4 display ↔ 0-40 storage) ──

const clamp = (v: number) => Math.min(Math.max(isNaN(v) ? 0 : v, 0), 4)
const toStorage = (score: number) => Math.round(clamp(score) * 10)
const fromStorage = (stored: number) => stored >= 5 ? parseFloat((stored / 10).toFixed(1)) : stored

export type DomainScores = {
  peer: number
  adult: number
  investment: number
  authority: number
}

export type NormalizedWeeklyEval = {
  id: string
  youth_id: string
  week_date: string
  peer: number
  adult: number
  investment: number
  authority: number
  overall: number
  source: 'manual' | 'uploaded'
}

export type NormalizedDailyShift = {
  id: string
  youth_id: string
  date: string
  shift: ShiftType
  peer: number
  adult: number
  investment: number
  authority: number
  overall: number
  staff?: string
}

const normalizeWeekly = (r: WeeklyEvalRow): NormalizedWeeklyEval => {
  const peer = fromStorage(r.peer)
  const adult = fromStorage(r.adult)
  const investment = fromStorage(r.investment)
  const authority = fromStorage(r.authority)
  return {
    id: r.id,
    youth_id: r.youth_id,
    week_date: r.week_date,
    peer, adult, investment, authority,
    overall: parseFloat(((peer + adult + investment + authority) / 4).toFixed(2)),
    source: r.source
  }
}

const toWeekStartISO = (isoDate: string): string => {
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return isoDate
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

const dedupeWeekly = (rows: WeeklyEvalRow[]): WeeklyEvalRow[] => {
  const byYouthWeek = new Map<string, WeeklyEvalRow>()
  for (const row of rows) {
    const weekStart = toWeekStartISO(row.week_date)
    const key = `${row.youth_id}_${weekStart}`
    const current = byYouthWeek.get(key)
    if (!current) {
      byYouthWeek.set(key, { ...row, week_date: weekStart })
      continue
    }
    const currentUpdated = current.updated_at || ''
    const nextUpdated = row.updated_at || ''
    if (nextUpdated >= currentUpdated) {
      byYouthWeek.set(key, { ...row, week_date: weekStart })
    }
  }
  return Array.from(byYouthWeek.values())
}

const normalizeDaily = (r: DailyShiftRow): NormalizedDailyShift => {
  const peer = fromStorage(r.peer)
  const adult = fromStorage(r.adult)
  const investment = fromStorage(r.investment)
  const authority = fromStorage(r.authority)
  return {
    id: r.id,
    youth_id: r.youth_id,
    date: r.date,
    shift: r.shift,
    peer, adult, investment, authority,
    overall: parseFloat(((peer + adult + investment + authority) / 4).toFixed(2)),
    staff: r.staff
  }
}

// ── Weekly Eval CRUD ──

export const upsertWeeklyEval = async (
  youthId: string,
  weekDate: string,
  scores: DomainScores,
  source: 'manual' | 'uploaded' = 'manual'
): Promise<NormalizedWeeklyEval> => {
  const result = await weeklyEvalService.upsert(
    youthId, weekDate,
    toStorage(scores.peer),
    toStorage(scores.adult),
    toStorage(scores.investment),
    toStorage(scores.authority),
    source
  )
  return normalizeWeekly(result)
}

export const getWeeklyEvalsForRange = async (startISO: string, endISO: string): Promise<NormalizedWeeklyEval[]> => {
  const results = await weeklyEvalService.range(startISO, endISO)
  return dedupeWeekly(results).map(normalizeWeekly)
}

export const getWeeklyEvalsForYouth = async (youthId: string): Promise<NormalizedWeeklyEval[]> => {
  const results = await weeklyEvalService.forYouth(youthId)
  return dedupeWeekly(results).map(normalizeWeekly)
}

export const getWeeklyEvalsForYouthInRange = async (youthId: string, startISO: string, endISO: string): Promise<NormalizedWeeklyEval[]> => {
  const results = await weeklyEvalService.forYouthInRange(youthId, startISO, endISO)
  return dedupeWeekly(results).map(normalizeWeekly)
}

// ── Daily Shift CRUD ──

export const upsertDailyShift = async (
  youthId: string,
  dateISO: string,
  shift: ShiftType,
  scores: DomainScores,
  staff?: string
): Promise<NormalizedDailyShift> => {
  const result = await dailyShiftService.upsert(
    youthId, dateISO, shift,
    toStorage(scores.peer),
    toStorage(scores.adult),
    toStorage(scores.investment),
    toStorage(scores.authority),
    staff
  )
  return normalizeDaily(result)
}

export const getDailyShiftsForRange = async (startISO: string, endISO: string): Promise<NormalizedDailyShift[]> => {
  const results = await dailyShiftService.range(startISO, endISO)
  return results.map(normalizeDaily)
}

export const getDailyShiftsForYouth = async (youthId: string): Promise<NormalizedDailyShift[]> => {
  const results = await dailyShiftService.forYouth(youthId)
  return results.map(normalizeDaily)
}

export const getDailyShiftsForYouthInRange = async (youthId: string, startISO: string, endISO: string): Promise<NormalizedDailyShift[]> => {
  const results = await dailyShiftService.forYouthInRange(youthId, startISO, endISO)
  return results.map(normalizeDaily)
}

// ── Averaging functions ──

export type DomainAverages = {
  peer: number | null
  adult: number | null
  investment: number | null
  authority: number | null
  overall: number | null
  totalEntries: number
}

const avgOf = (nums: number[]): number | null =>
  nums.length === 0 ? null : parseFloat((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2))

/**
 * Calculate domain averages from weekly eval data for a date range.
 */
export const calculateWeeklyAveragesForRange = async (
  youthId: string,
  startISO: string,
  endISO: string
): Promise<DomainAverages> => {
  const evals = await getWeeklyEvalsForYouthInRange(youthId, startISO, endISO)
  return {
    peer: avgOf(evals.map(e => e.peer)),
    adult: avgOf(evals.map(e => e.adult)),
    investment: avgOf(evals.map(e => e.investment)),
    authority: avgOf(evals.map(e => e.authority)),
    overall: avgOf(evals.map(e => e.overall)),
    totalEntries: evals.length
  }
}

/**
 * Calculate domain averages from daily shift data for a date range.
 */
export const calculateDailyAveragesForRange = async (
  youthId: string,
  startISO: string,
  endISO: string
): Promise<DomainAverages> => {
  const shifts = await getDailyShiftsForYouthInRange(youthId, startISO, endISO)
  return {
    peer: avgOf(shifts.map(s => s.peer)),
    adult: avgOf(shifts.map(s => s.adult)),
    investment: avgOf(shifts.map(s => s.investment)),
    authority: avgOf(shifts.map(s => s.authority)),
    overall: avgOf(shifts.map(s => s.overall)),
    totalEntries: shifts.length
  }
}

/**
 * Combined average of all data (weekly + daily) for a range.
 */
export const calculateCombinedAveragesForRange = async (
  youthId: string,
  startISO: string,
  endISO: string
): Promise<DomainAverages> => {
  const [evals, shifts] = await Promise.all([
    getWeeklyEvalsForYouthInRange(youthId, startISO, endISO),
    getDailyShiftsForYouthInRange(youthId, startISO, endISO)
  ])
  const allPeer = [...evals.map(e => e.peer), ...shifts.map(s => s.peer)]
  const allAdult = [...evals.map(e => e.adult), ...shifts.map(s => s.adult)]
  const allInvestment = [...evals.map(e => e.investment), ...shifts.map(s => s.investment)]
  const allAuthority = [...evals.map(e => e.authority), ...shifts.map(s => s.authority)]
  const allOverall = [...evals.map(e => e.overall), ...shifts.map(s => s.overall)]
  return {
    peer: avgOf(allPeer),
    adult: avgOf(allAdult),
    investment: avgOf(allInvestment),
    authority: avgOf(allAuthority),
    overall: avgOf(allOverall),
    totalEntries: evals.length + shifts.length
  }
}

/**
 * Duration of stay average (from admission date to today).
 */
export const calculateDurationOfStayAverage = async (
  youthId: string,
  admissionDateISO: string
): Promise<DomainAverages> => {
  const today = new Date().toISOString().split('T')[0]
  return calculateCombinedAveragesForRange(youthId, admissionDateISO, today)
}

/**
 * Monthly evaluation average.
 */
export const calculateMonthlyAverage = async (
  youthId: string,
  year: number,
  month: number
): Promise<DomainAverages> => {
  const startISO = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endISO = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return calculateCombinedAveragesForRange(youthId, startISO, endISO)
}

// ── Trend stats ──

export type EvalStats = {
  youthId: string
  totalEvals: number
  overallAverage: number
  trend: 'improving' | 'declining' | 'stable'
  recentAverage: number
  previousAverage: number
}

export const getEvalStats = async (youthId: string): Promise<EvalStats | null> => {
  const evals = await getWeeklyEvalsForYouth(youthId)
  if (evals.length === 0) return null

  const overalls = evals.map(e => e.overall)
  const avg = overalls.reduce((a, b) => a + b, 0) / overalls.length

  let trend: 'improving' | 'declining' | 'stable' = 'stable'
  let recentAverage = avg
  let previousAverage = avg

  if (evals.length >= 4) {
    // Sort newest-first to ensure correct windowing regardless of upstream order
    evals.sort((a, b) => (b.week_date > a.week_date ? 1 : b.week_date < a.week_date ? -1 : 0))
    const windowSize = Math.max(2, Math.min(Math.floor(evals.length / 3), 7))
    if (evals.length >= windowSize * 2) {
      const recent = evals.slice(0, windowSize)
      recentAverage = recent.reduce((a, b) => a + b.overall, 0) / recent.length
      const previous = evals.slice(windowSize, windowSize * 2)
      previousAverage = previous.reduce((a, b) => a + b.overall, 0) / previous.length
      const diff = recentAverage - previousAverage
      if (diff > 0.15) trend = 'improving'
      else if (diff < -0.15) trend = 'declining'
    }
  }

  return {
    youthId,
    totalEvals: evals.length,
    overallAverage: parseFloat(avg.toFixed(1)),
    trend,
    recentAverage: parseFloat(recentAverage.toFixed(1)),
    previousAverage: parseFloat(previousAverage.toFixed(1))
  }
}
