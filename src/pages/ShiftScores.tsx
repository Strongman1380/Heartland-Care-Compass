import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useYouth } from '@/hooks/useSupabase'
import {
  upsertWeeklyEval,
  getWeeklyEvalsForRange,
  getEvalStats,
  upsertDailyShift,
  getDailyShiftsForRange,
  calculateCombinedAveragesForRange,
  calculateMonthlyAverage,
  calculateDurationOfStayAverage,
  type NormalizedWeeklyEval,
  type NormalizedDailyShift,
  type EvalStats,
  type DomainAverages,
  type DomainScores,
} from '@/utils/shiftScores'
import type { ShiftType } from '@/integrations/firebase/shiftScoresService'
import { useAwards } from '@/contexts/AwardsContext'
import { format, addDays, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth } from 'date-fns'
import {
  TrendingUp, TrendingDown, Minus, Save, CheckCircle2,
  RefreshCw, Upload, Sun, Sunset, Moon, Calculator, Calendar,
  Users, ChevronLeft, ChevronRight, FileSpreadsheet, Trophy, Star
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Header } from '@/components/layout/Header'
import { CsvUploader, type ParsedRow, type ColumnDef, type ImportResult } from '@/components/common/CsvUploader'
import { normalizeDate, matchYouth, clampScore, findColumnIndex, detectHeaders, type MatchableYouth } from '@/utils/csvUtils'
import * as XLSX from 'xlsx'
import { logger } from '@/utils/logger';

const toISO = (d: Date) => format(d, 'yyyy-MM-dd')

const getMonday = (d: Date) => {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const res = new Date(d)
  res.setDate(d.getDate() + diff)
  res.setHours(0, 0, 0, 0)
  return res
}

const toWeekStartISO = (isoDate: string): string => {
  const parsed = new Date(`${isoDate}T00:00:00`)
  if (isNaN(parsed.getTime())) return isoDate
  return toISO(getMonday(parsed))
}

const DOMAINS = [
  { key: 'peer' as const, label: 'Peer', short: 'Peer' },
  { key: 'adult' as const, label: 'Adult', short: 'Adult' },
  { key: 'investment' as const, label: 'Investment', short: 'Invest' },
  { key: 'authority' as const, label: 'Authority', short: 'Auth' },
]

const SHIFTS: { key: ShiftType; label: string; icon: React.ReactNode }[] = [
  { key: 'day', label: 'Day', icon: <Sun className="w-4 h-4" /> },
  { key: 'evening', label: 'Evening', icon: <Sunset className="w-4 h-4" /> },
  { key: 'night', label: 'Night', icon: <Moon className="w-4 h-4" /> },
]

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ratingColor = (val: number) => {
  if (val >= 3.5) return 'score-high'
  if (val >= 3.0) return 'score-mid'
  if (val >= 2.0) return 'score-low'
  return 'score-critical'
}

const ratingBgColor = (val: number) => {
  if (val >= 3.5) return 'score-bg-high'
  if (val >= 3.0) return 'score-bg-mid'
  if (val >= 2.0) return 'score-bg-low'
  return 'score-bg-critical'
}

const ratingLabel = (val: number) => {
  if (val >= 3.5) return 'Exceeding'
  if (val >= 3.0) return 'Meeting'
  if (val >= 2.0) return 'Needs Improvement'
  return 'Unsatisfactory'
}

// Grid key helpers
type WeeklyGridValue = { [youthId: string]: { [weekDate: string]: DomainScores } }
type DailyGridValue = { [youthId: string]: { [dateShift: string]: DomainScores } }

const ShiftScores: React.FC = () => {
  const { youths, loadYouths, loading } = useYouth()
  const { toast } = useToast()
  const today = new Date()

  // Awards from shared context — no per-component recalculation
  const { awards: contextAwards, loading: calculatingAwards, refresh: refreshAwards } = useAwards()

  // Weekly eval state
  const [weeklyStart, setWeeklyStart] = useState<Date>(subDays(getMonday(today), 7 * 5)) // show last 6 weeks
  const [weeklyGrid, setWeeklyGrid] = useState<WeeklyGridValue>({})
  const [youthStats, setYouthStats] = useState<Map<string, EvalStats>>(new Map())

  // Daily shift entry state
  const [dailyWeekStart, setDailyWeekStart] = useState<Date>(getMonday(today))
  const [activeShift, setActiveShift] = useState<ShiftType>('day')
  const [dailyGrid, setDailyGrid] = useState<DailyGridValue>({})

  // Shared
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Averages state
  const [avgMode, setAvgMode] = useState<'weekly' | 'monthly' | 'duration' | 'custom'>('weekly')
  const [avgStartDate, setAvgStartDate] = useState(toISO(subDays(today, 30)))
  const [avgEndDate, setAvgEndDate] = useState(toISO(today))
  const [avgMonth, setAvgMonth] = useState(today.getMonth() + 1)
  const [avgYear, setAvgYear] = useState(today.getFullYear())
  const [averageResults, setAverageResults] = useState<Map<string, DomainAverages>>(new Map())
  const [calculatingAvg, setCalculatingAvg] = useState(false)

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // Debounce refs for auto-save (prevents spamming DB on every keystroke)
  const weeklyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dailyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadYouths() }, [])

  const sortedYouths = useMemo(() => {
    if (!youths || youths.length === 0) return []
    return [...youths].sort((a, b) => a.firstName.localeCompare(b.firstName))
  }, [youths])

  // ── Weekly eval dates (6 weeks of Mondays) ──
  const weeklyDates = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => toISO(addDays(weeklyStart, i * 7)))
  }, [weeklyStart])

  // ── Daily dates (Mon-Sun) ──
  const dailyDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => toISO(addDays(dailyWeekStart, i)))
  }, [dailyWeekStart])

  // ── Load weekly eval data ──
  useEffect(() => {
    if (!sortedYouths.length) return
    const loadWeekly = async () => {
      try {
        const startISO = weeklyDates[0]
        const endISO = weeklyDates[weeklyDates.length - 1]
        const allEvals = await getWeeklyEvalsForRange(startISO, endISO)

        const grid: WeeklyGridValue = {}
        for (const y of sortedYouths) {
          grid[y.id] = {}
          for (const wd of weeklyDates) {
            grid[y.id][wd] = { peer: NaN, adult: NaN, investment: NaN, authority: NaN }
          }
        }
        for (const ev of allEvals) {
          const weekKey = toWeekStartISO(ev.week_date)
          if (grid[ev.youth_id] && grid[ev.youth_id][weekKey]) {
            grid[ev.youth_id][weekKey] = {
              peer: ev.peer, adult: ev.adult, investment: ev.investment, authority: ev.authority
            }
          }
        }

        const statsMap = new Map<string, EvalStats>()
        for (const y of sortedYouths) {
          const stats = await getEvalStats(y.id)
          if (stats) statsMap.set(y.id, stats)
        }
        setWeeklyGrid(grid)
        setYouthStats(statsMap)
      } catch (error) {
        logger.error('Error loading weekly evals:', error)
      }
    }
    loadWeekly()
  }, [sortedYouths, weeklyDates.join('|'), refreshKey])

  // ── Load daily shift data ──
  useEffect(() => {
    if (!sortedYouths.length) return
    const loadDaily = async () => {
      try {
        const startISO = dailyDates[0]
        const endISO = dailyDates[dailyDates.length - 1]
        const allShifts = await getDailyShiftsForRange(startISO, endISO)

        const grid: DailyGridValue = {}
        for (const y of sortedYouths) {
          grid[y.id] = {}
          for (const d of dailyDates) {
            for (const s of SHIFTS) {
              grid[y.id][`${d}_${s.key}`] = { peer: NaN, adult: NaN, investment: NaN, authority: NaN }
            }
          }
        }
        for (const sh of allShifts) {
          const key = `${sh.date}_${sh.shift}`
          if (grid[sh.youth_id]) {
            grid[sh.youth_id][key] = {
              peer: sh.peer, adult: sh.adult, investment: sh.investment, authority: sh.authority
            }
          }
        }
        setDailyGrid(grid)
      } catch (error) {
        logger.error('Error loading daily shifts:', error)
      }
    }
    loadDaily()
  }, [sortedYouths, dailyDates.join('|'), refreshKey])

  // ── Weekly eval handlers ──
  const handleWeeklyChange = (youthId: string, weekDate: string, domain: keyof DomainScores, value: string) => {
    const raw = value === '' ? NaN : Number(value)
    // Clamp to valid 0–4 range
    const num = isNaN(raw) ? NaN : Math.min(4, Math.max(0, raw))
    if (!isNaN(raw) && (raw < 0 || raw > 4)) {
      toast({ title: "Invalid Score", description: "Scores must be between 0 and 4.", variant: "destructive" })
    }
    setWeeklyGrid(prev => {
      const youthRow = { ...(prev[youthId] || {}) }
      const cell = { ...(youthRow[weekDate] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }) }
      cell[domain] = num
      youthRow[weekDate] = cell
      return { ...prev, [youthId]: youthRow }
    })

    if (!isNaN(num) && autoSaveEnabled) {
      // Debounce: clear any pending save and schedule a new one 400ms out
      if (weeklyDebounceRef.current) clearTimeout(weeklyDebounceRef.current)
      weeklyDebounceRef.current = setTimeout(() => {
        setWeeklyGrid(current => {
          const snapshot = current[youthId]?.[weekDate] // previous state for rollback
          const currentCell = current[youthId]?.[weekDate] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }
          const scores: DomainScores = { ...currentCell, [domain]: num }
          const hasAny = Object.values(scores).some(v => !isNaN(v))
          if (hasAny) {
            const safeScores = {
              peer: isNaN(scores.peer) ? null as unknown as number : scores.peer,
              adult: isNaN(scores.adult) ? null as unknown as number : scores.adult,
              investment: isNaN(scores.investment) ? null as unknown as number : scores.investment,
              authority: isNaN(scores.authority) ? null as unknown as number : scores.authority,
            }
            setIsSaving(true)
            upsertWeeklyEval(youthId, weekDate, safeScores, 'manual').then(() => {
              setLastSaved(new Date())
              setIsSaving(false)
            }).catch(err => {
              logger.error('Auto-save weekly eval failed:', err)
              toast({ title: "Save Failed", description: String(err), variant: "destructive" })
              setIsSaving(false)
              // Rollback to previous cell value
              if (snapshot !== undefined) {
                setWeeklyGrid(prev => {
                  const youthRow = { ...(prev[youthId] || {}) }
                  youthRow[weekDate] = snapshot
                  return { ...prev, [youthId]: youthRow }
                })
              }
            })
          }
          return current // no mutation, just reading
        })
      }, 400)
    }
  }

  // ── Daily shift handlers ──
  const handleDailyChange = (youthId: string, dateISO: string, shift: ShiftType, domain: keyof DomainScores, value: string) => {
    const raw = value === '' ? NaN : Number(value)
    // Clamp to valid 0–4 range
    const num = isNaN(raw) ? NaN : Math.min(4, Math.max(0, raw))
    if (!isNaN(raw) && (raw < 0 || raw > 4)) {
      toast({ title: "Invalid Score", description: "Scores must be between 0 and 4.", variant: "destructive" })
    }
    const key = `${dateISO}_${shift}`
    setDailyGrid(prev => {
      const youthRow = { ...(prev[youthId] || {}) }
      const cell = { ...(youthRow[key] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }) }
      cell[domain] = num
      youthRow[key] = cell
      return { ...prev, [youthId]: youthRow }
    })

    if (!isNaN(num) && autoSaveEnabled) {
      // Debounce: clear any pending save and schedule a new one 400ms out
      if (dailyDebounceRef.current) clearTimeout(dailyDebounceRef.current)
      dailyDebounceRef.current = setTimeout(() => {
        setDailyGrid(current => {
          const snapshot = current[youthId]?.[key] // previous state for rollback
          const currentCell = current[youthId]?.[key] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }
          const scores: DomainScores = { ...currentCell, [domain]: num }
          const hasAny = Object.values(scores).some(v => !isNaN(v))
          if (hasAny) {
            const safeScores = {
              peer: isNaN(scores.peer) ? null as unknown as number : scores.peer,
              adult: isNaN(scores.adult) ? null as unknown as number : scores.adult,
              investment: isNaN(scores.investment) ? null as unknown as number : scores.investment,
              authority: isNaN(scores.authority) ? null as unknown as number : scores.authority,
            }
            setIsSaving(true)
            upsertDailyShift(youthId, dateISO, shift, safeScores).then(() => {
              setLastSaved(new Date())
              setIsSaving(false)
            }).catch(err => {
              logger.error('Auto-save daily shift failed:', err)
              toast({ title: "Save Failed", description: String(err), variant: "destructive" })
              setIsSaving(false)
              // Rollback to previous cell value
              if (snapshot !== undefined) {
                setDailyGrid(prev => {
                  const youthRow = { ...(prev[youthId] || {}) }
                  youthRow[key] = snapshot
                  return { ...prev, [youthId]: youthRow }
                })
              }
            })
          }
          return current // no mutation, just reading
        })
      }, 400)
    }
  }

  // ── Manual save all ──
  const handleManualSaveWeekly = async () => {
    try {
      let count = 0
      for (const y of sortedYouths) {
        for (const wd of weeklyDates) {
          const cell = weeklyGrid[y.id]?.[wd]
          if (!cell) continue
          const hasAny = Object.values(cell).some(v => !isNaN(v))
          if (hasAny) {
            await upsertWeeklyEval(y.id, wd, {
              peer: isNaN(cell.peer) ? null as unknown as number : cell.peer,
              adult: isNaN(cell.adult) ? null as unknown as number : cell.adult,
              investment: isNaN(cell.investment) ? null as unknown as number : cell.investment,
              authority: isNaN(cell.authority) ? null as unknown as number : cell.authority,
            }, 'manual')
            count++
          }
        }
      }
      setLastSaved(new Date())
      toast({ title: "Saved", description: `Saved ${count} weekly eval(s).`, duration: 3000 })
    } catch (error) {
      toast({ title: "Save Failed", variant: "destructive" })
    }
  }

  // ── Get weekly overall for a cell ──
  const getWeeklyCellOverall = (youthId: string, weekDate: string): number | null => {
    const cell = weeklyGrid[youthId]?.[weekDate]
    if (!cell) return null
    const vals = [cell.peer, cell.adult, cell.investment, cell.authority].filter(v => !isNaN(v))
    if (vals.length === 0) return null
    return parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1))
  }

  // ── Trend icon ──
  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable', stats?: EvalStats) => {
    const title = stats
      ? `${trend.charAt(0).toUpperCase() + trend.slice(1)} (Recent: ${stats.recentAverage}, Previous: ${stats.previousAverage})`
      : ''
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" title={title} />
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-600" title={title} />
      default: return <Minus className="w-4 h-4 text-gray-500 dark:text-slate-400" title={title} />
    }
  }

  // ── Calculate averages ──
  const calculateAverages = async () => {
    setCalculatingAvg(true)
    try {
      const results = new Map<string, DomainAverages>()
      for (const y of sortedYouths) {
        let result: DomainAverages
        switch (avgMode) {
          case 'weekly':
          case 'custom':
            result = await calculateCombinedAveragesForRange(y.id, avgStartDate, avgEndDate)
            break
          case 'monthly':
            result = await calculateMonthlyAverage(y.id, avgYear, avgMonth)
            break
          case 'duration': {
            const admDate = y.admissionDate
              ? toISO(new Date(y.admissionDate as any))
              : toISO(subDays(today, 90))
            result = await calculateDurationOfStayAverage(y.id, admDate)
            break
          }
          default:
            result = { peer: null, adult: null, investment: null, authority: null, overall: null, totalEntries: 0 }
        }
        results.set(y.id, result)
      }
      setAverageResults(results)
      toast({ title: "Averages Calculated", duration: 3000 })
    } catch (error) {
      toast({ title: "Error", description: "Failed to calculate.", variant: "destructive" })
    } finally {
      setCalculatingAvg(false)
    }
  }


  // Quote-aware CSV field splitter
  const splitCSVLine = (line: string): string[] => {
    const fields: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuotes = !inQuotes; continue }
      if (ch === ',' && !inQuotes) { fields.push(current.trim()); current = ''; continue }
      current += ch
    }
    fields.push(current.trim())
    return fields
  }

  // Clamp domain score to valid range, or NaN if out of bounds
  const clampDomain = (v: number): number => {
    if (isNaN(v)) return NaN
    if (v < 0 || v > 4) return NaN
    return v
  }

  // ── Parse rows from file (CSV or Excel) ──
  const parseFileToRows = async (file: File): Promise<string[][]> => {
    const ext = file.name.split('.').pop()?.toLowerCase()

    if (ext === 'xlsx' || ext === 'xls') {
      const buffer = await file.arrayBuffer()
      const wb = XLSX.read(buffer, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
      return jsonData.map(row => row.map(cell => String(cell ?? '').trim()))
    }

    // CSV/TXT fallback
    const text = await file.text()
    const lines = text.trim().split('\n')
    return lines.map(line => splitCSVLine(line))
  }

  // ── Normalize date strings (Excel serial numbers, MM/DD/YYYY, etc) ──
  const normalizeDate = (dateVal: string): string => {
    if (!dateVal) return ''

    // Excel serial number (pure digits, typically 5 digits like 45678)
    const asNum = Number(dateVal)
    if (!isNaN(asNum) && asNum > 10000 && asNum < 100000) {
      const excelEpoch = new Date(1899, 11, 30)
      const d = new Date(excelEpoch.getTime() + asNum * 86400000)
      return format(d, 'yyyy-MM-dd')
    }

    // Already ISO format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal

    // MM/DD/YYYY
    if (dateVal.includes('/')) {
      const parts = dateVal.split('/')
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`
      }
    }

    return dateVal
  }

  // ── Match youth by name ──
  const matchYouthLocal = (nameVal: string) => {
    const lower = nameVal.toLowerCase().trim()
    return sortedYouths.find(y => {
      const f = (y.firstName || '').toLowerCase().trim()
      const l = (y.lastName || '').toLowerCase().trim()
      const full = `${f} ${l}`.trim()
      return f === lower || l === lower || full === lower || full.includes(lower)
    })
  }

  // ── XLSX/CSV upload ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const rows = await parseFileToRows(file)
      if (rows.length < 2) {
        toast({ title: "Empty File", description: "No data rows found.", variant: "destructive" })
        return
      }

      const header = rows[0].map(h => h.toLowerCase())

      // Find column indices
      const nameIdx = header.findIndex(h => h.includes('name') || h.includes('youth'))
      const dateIdx = header.findIndex(h => h.includes('date'))
      const peerIdx = header.findIndex(h => h.includes('peer'))
      const adultIdx = header.findIndex(h => h.includes('adult'))
      const investIdx = header.findIndex(h => h.includes('invest'))
      const authIdx = header.findIndex(h => h.includes('auth') || h.includes('dealing'))
      const shiftIdx = header.findIndex(h => h.includes('shift'))

      if (nameIdx === -1 || dateIdx === -1) {
        toast({ title: "Invalid Format", description: "File must have columns for youth name and date.", variant: "destructive" })
        return
      }

      const isDailyShift = shiftIdx !== -1

      let uploaded = 0
      let skipped = 0
      const invalidRows: string[] = []

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i]
        if (cols.length < 3) continue

        const nameVal = cols[nameIdx]
        const dateVal = cols[dateIdx]

        // Parse raw values before clamping so we can detect out-of-range
        const rawPeer = peerIdx >= 0 ? parseFloat(cols[peerIdx]) : NaN
        const rawAdult = adultIdx >= 0 ? parseFloat(cols[adultIdx]) : NaN
        const rawInvest = investIdx >= 0 ? parseFloat(cols[investIdx]) : NaN
        const rawAuth = authIdx >= 0 ? parseFloat(cols[authIdx]) : NaN

        const peer = clampDomain(rawPeer)
        const adult = clampDomain(rawAdult)
        const invest = clampDomain(rawInvest)
        const auth = clampDomain(rawAuth)

        // Detect values that were provided but out of 0–4 range
        const outOfRange = [
          { label: 'Peer', raw: rawPeer },
          { label: 'Adult', raw: rawAdult },
          { label: 'Investment', raw: rawInvest },
          { label: 'Authority', raw: rawAuth },
        ].filter(d => !isNaN(d.raw) && (d.raw < 0 || d.raw > 4))

        if (outOfRange.length > 0) {
          invalidRows.push(`Row ${i + 1} (${nameVal}): ${outOfRange.map(d => `${d.label}=${d.raw}`).join(', ')} out of 0–4 range — clamped`)
        }

        if ([peer, adult, invest, auth].every(v => isNaN(v))) { skipped++; continue }
        
        const matched = matchYouthLocal(nameVal)
        if (!matched) { skipped++; continue }
        const isoDate = normalizeDate(dateVal)
        if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) { skipped++; continue }

        const scores: DomainScores = {
          peer: isNaN(peer) ? null as unknown as number : peer,
          adult: isNaN(adult) ? null as unknown as number : adult,
          investment: isNaN(invest) ? null as unknown as number : invest,
          authority: isNaN(auth) ? null as unknown as number : auth,
        }

        if (isDailyShift) {
          const shiftVal = (cols[shiftIdx] || 'day').toLowerCase().trim()
          const shift: ShiftType = shiftVal.startsWith('eve') ? 'evening'
            : shiftVal.startsWith('nig') || shiftVal.startsWith('ove') ? 'night'
            : 'day'
          await upsertDailyShift(matched.id, isoDate, shift, scores, 'uploaded')
        } else {
          await upsertWeeklyEval(matched.id, toWeekStartISO(isoDate), scores, 'uploaded')
        }
        uploaded++
      }

      const type = isDailyShift ? 'daily shift score' : 'weekly eval'
      const invalidSummary = invalidRows.length > 0
        ? ` ${invalidRows.length} row(s) had out-of-range values and were clamped to 0–4.`
        : ''
      toast({
        title: "Upload Complete",
        description: `Imported ${uploaded} ${type}(s).${skipped ? ` ${skipped} row(s) skipped.` : ''}${invalidSummary}`,
        duration: 7000,
      })
      if (invalidRows.length > 0) {
        logger.warn('Import rows with out-of-range values (clamped to 0–4):', invalidRows.join('\n'))
      }
      setRefreshKey(k => k + 1)
    } catch (error) {
      logger.error('Upload error:', error)
      toast({ title: "Upload Failed", description: "Could not parse the file.", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const refreshStats = async () => {
    const statsMap = new Map<string, EvalStats>()
    for (const y of sortedYouths) {
      const stats = await getEvalStats(y.id)
      if (stats) statsMap.set(y.id, stats)
    }
    setYouthStats(statsMap)
    toast({ title: "Refreshed", duration: 2000 })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 space-y-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-red-700" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
            Weekly Eval & Shift Scores
          </h2>
        </div>

        <Tabs defaultValue="weekly" className="space-y-4">
          <TabsList className="bg-white dark:bg-slate-800 shadow border dark:border-slate-700">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Weekly Evals
            </TabsTrigger>
            <TabsTrigger value="daily" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Daily Shift Entry
            </TabsTrigger>
            <TabsTrigger value="averages" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Averages
            </TabsTrigger>
            <TabsTrigger value="awards" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Awards
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Upload
            </TabsTrigger>
          </TabsList>

          {/* ═══════ AWARDS TAB ═══════ */}
          <TabsContent value="awards">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Resident Awards</span>
                  <Button onClick={refreshAwards} disabled={calculatingAwards}>
                    {calculatingAwards ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Refresh Awards
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Resident of the Week */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader>
                      <CardTitle className="text-blue-800 flex items-center gap-2">
                        <Trophy className="w-5 h-5" />
                        Resident of the Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contextAwards?.residentOfWeek ? (
                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-blue-900">{contextAwards.residentOfWeek.name}</p>
                          <p className="text-sm text-blue-700">Eval Average: {contextAwards.residentOfWeek.evalAverage.toFixed(2)}</p>
                          <p className="text-sm text-blue-700">Total Points: {contextAwards.residentOfWeek.totalPoints}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-blue-600 italic">Click calculate to determine winner</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Most Improved Resident */}
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Most Improved Resident
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contextAwards?.mostImprovedWeek ? (
                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-green-900">{contextAwards.mostImprovedWeek.name}</p>
                          <p className="text-sm text-green-700">Improvement: +{contextAwards.mostImprovedWeek.improvement?.toFixed(2)}</p>
                          <p className="text-sm text-green-700">Current Avg: {contextAwards.mostImprovedWeek.evalAverage.toFixed(2)}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-green-600 italic">Click calculate to determine winner</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Resident of the Month */}
                  <Card className="bg-purple-50 border-purple-200">
                    <CardHeader>
                      <CardTitle className="text-purple-800 flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Resident of the Month
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {contextAwards?.residentOfMonth ? (
                        <div className="space-y-2">
                          <p className="text-2xl font-bold text-purple-900">{contextAwards.residentOfMonth.name}</p>
                          <p className="text-sm text-purple-700">Total Points: {contextAwards.residentOfMonth.totalPoints}</p>
                          <p className="text-sm text-purple-700">Eval Average: {contextAwards.residentOfMonth.evalAverage.toFixed(2)}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-purple-600 italic">Click calculate to determine winner</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ WEEKLY EVALS TAB ═══════ */}
          <TabsContent value="weekly">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span>Weekly Evaluation Scores</span>
                    {isSaving ? (
                      <span className="text-sm font-normal text-blue-600 flex items-center gap-1">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : lastSaved && (
                      <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Saved {format(lastSaved, 'h:mm a')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setWeeklyStart(prev => addDays(prev, -7 * 6))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setWeeklyStart(subDays(getMonday(new Date()), 7 * 5))}>
                      Recent
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setWeeklyStart(prev => addDays(prev, 7 * 6))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={refreshStats}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={handleManualSaveWeekly} size="sm" className="bg-red-600 hover:bg-red-700">
                      <Save className="w-4 h-4 mr-1" /> Save All
                    </Button>
                    <label className="text-sm text-gray-600 dark:text-slate-400 flex items-center gap-1 ml-2">
                      <input type="checkbox" checked={autoSaveEnabled} onChange={e => setAutoSaveEnabled(e.target.checked)} className="rounded" />
                      Auto-save
                    </label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-xs text-gray-500 dark:text-slate-400">
                  4 Domains: Peer Interaction, Adult Interaction, Investment Level, Dealing w/ Authority. Scale 0-4.
                </div>

                {/* One card per youth with their weekly scores */}
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-center text-gray-500 dark:text-slate-400 py-8">Loading youths...</p>
                  ) : sortedYouths.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-slate-400 py-8">No youths found.</p>
                  ) : (
                    sortedYouths.map(y => {
                      const stats = youthStats.get(y.id)
                      return (
                        <div key={y.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 dark:bg-slate-800 px-3 py-2 flex items-center justify-between">
                            <span className="font-semibold text-sm">{y.firstName} {y.lastName}</span>
                            <div className="flex items-center gap-3 text-xs">
                              {stats && (
                                <>
                                  <span className={`font-bold ${ratingColor(stats.overallAverage)}`}>
                                    Avg: {stats.overallAverage}
                                  </span>
                                  {getTrendIcon(stats.trend, stats)}
                                </>
                              )}
                            </div>
                          </div>
                          <div className="overflow-auto">
                            <table className="text-xs sm:text-sm w-full table-fixed" style={{ minWidth: '600px' }}>
                              <colgroup>
                                <col style={{ width: '80px' }} />
                                {weeklyDates.map(wd => <col key={wd} style={{ width: '72px' }} />)}
                                <col style={{ width: '60px' }} />
                              </colgroup>
                              <thead className="bg-gray-50/50 dark:bg-slate-800/50">
                                <tr>
                                  <th className="text-left px-2 py-1.5">Domain</th>
                                  {weeklyDates.map(wd => (
                                    <th key={wd} className="text-center px-1 py-1.5">
                                      <div className="text-xs">{format(new Date(wd + 'T00:00:00'), 'M/d')}</div>
                                    </th>
                                  ))}
                                  <th className="text-center px-1 py-1.5 bg-blue-50">Avg</th>
                                </tr>
                              </thead>
                              <tbody>
                                {DOMAINS.map(d => (
                                  <tr key={d.key} className="border-t">
                                    <td className="px-2 py-1 font-medium text-gray-700 dark:text-slate-300">{d.short}</td>
                                    {weeklyDates.map(wd => {
                                      const val = weeklyGrid[y.id]?.[wd]?.[d.key]
                                      return (
                                        <td key={wd} className="p-1">
                                          <Input
                                            type="number" min={0} max={4} step={0.1}
                                            value={val !== undefined && !isNaN(val) ? val : ''}
                                            onChange={e => handleWeeklyChange(y.id, wd, d.key, e.target.value)}
                                            className="text-center w-full h-7 text-xs px-1"
                                          />
                                        </td>
                                      )
                                    })}
                                    <td className="px-2 py-1 text-center bg-blue-50 font-semibold">
                                      {(() => {
                                        const vals = weeklyDates
                                          .map(wd => weeklyGrid[y.id]?.[wd]?.[d.key])
                                          .filter(v => v !== undefined && !isNaN(v)) as number[]
                                        if (vals.length === 0) return '-'
                                        const avg = vals.reduce((a, b) => a + b, 0) / vals.length
                                        return <span className={ratingColor(avg)}>{avg.toFixed(1)}</span>
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                                {/* Overall row */}
                                <tr className="border-t bg-gray-50/50 dark:bg-slate-800/50">
                                  <td className="px-2 py-1 font-bold text-gray-800 dark:text-slate-200">Overall</td>
                                  {weeklyDates.map(wd => {
                                    const overall = getWeeklyCellOverall(y.id, wd)
                                    return (
                                      <td key={wd} className="p-1 text-center font-semibold">
                                        {overall !== null ? (
                                          <span className={ratingColor(overall)}>{overall.toFixed(1)}</span>
                                        ) : '-'}
                                      </td>
                                    )
                                  })}
                                  <td className="px-2 py-1 text-center bg-blue-50 font-bold">
                                    {stats ? (
                                      <span className={ratingColor(stats.overallAverage)}>{stats.overallAverage}</span>
                                    ) : '-'}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ DAILY SHIFT ENTRY TAB ═══════ */}
          <TabsContent value="daily">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span>Daily Shift Scores</span>
                    {isSaving ? (
                      <span className="text-sm font-normal text-blue-600 flex items-center gap-1">
                        <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                      </span>
                    ) : lastSaved && (
                      <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Saved {format(lastSaved, 'h:mm a')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setDailyWeekStart(prev => addDays(prev, -7))}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDailyWeekStart(getMonday(new Date()))}>
                      This Week
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDailyWeekStart(prev => addDays(prev, 7))}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Shift selector */}
                <div className="mb-4 flex items-center gap-3 flex-wrap">
                  <Label className="text-sm font-medium">Shift:</Label>
                  {SHIFTS.map(s => (
                    <Button
                      key={s.key}
                      variant={activeShift === s.key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveShift(s.key)}
                      className={activeShift === s.key ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                      {s.icon}<span className="ml-1">{s.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-3">
                  Week: {format(dailyWeekStart, 'MMM dd')} - {format(addDays(dailyWeekStart, 6), 'MMM dd, yyyy')} | {SHIFTS.find(s => s.key === activeShift)?.label} Shift
                </div>

                {/* Per-youth daily grid */}
                <div className="space-y-4">
                  {sortedYouths.map(y => (
                    <div key={y.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 dark:bg-slate-800 px-3 py-2 font-semibold text-sm">{y.firstName} {y.lastName}</div>
                      <div className="overflow-auto">
                        <table className="text-xs sm:text-sm w-full table-fixed" style={{ minWidth: '500px' }}>
                          <colgroup>
                            <col style={{ width: '80px' }} />
                            {dailyDates.map(iso => <col key={iso} style={{ width: '72px' }} />)}
                          </colgroup>
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th className="text-left px-2 py-1.5">Domain</th>
                              {dailyDates.map((iso, idx) => (
                                <th key={iso} className={`text-center px-1 py-1.5 ${toISO(today) === iso ? 'bg-yellow-50' : ''}`}>
                                  <div className="font-semibold">{WEEKDAYS[idx]}</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-400">{format(new Date(iso + 'T00:00:00'), 'M/d')}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {DOMAINS.map(d => (
                              <tr key={d.key} className="border-t">
                                <td className="px-2 py-1 font-medium text-gray-700">{d.short}</td>
                                {dailyDates.map(iso => {
                                  const key = `${iso}_${activeShift}`
                                  const val = dailyGrid[y.id]?.[key]?.[d.key]
                                  return (
                                    <td key={iso} className={`p-1 ${toISO(today) === iso ? 'bg-yellow-50' : ''}`}>
                                      <Input
                                        type="number" min={0} max={4} step={0.1}
                                        value={val !== undefined && !isNaN(val) ? val : ''}
                                        onChange={e => handleDailyChange(y.id, iso, activeShift, d.key, e.target.value)}
                                        className="text-center w-full h-7 text-xs px-1"
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-500 dark:text-slate-400 mt-3">
                  Enter 0-4 scores per domain, per day, per shift. Scores auto-save and feed into weekly/monthly/duration averages.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ AVERAGES TAB ═══════ */}
          <TabsContent value="averages">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-red-600" />
                  Score Averages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">Type</Label>
                    <Select value={avgMode} onValueChange={v => setAvgMode(v as any)}>
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly (Date Range)</SelectItem>
                        <SelectItem value="monthly">Monthly Evaluation</SelectItem>
                        <SelectItem value="duration">Duration of Stay</SelectItem>
                        <SelectItem value="custom">Custom Date Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(avgMode === 'weekly' || avgMode === 'custom') && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-sm">Start</Label>
                        <Input type="date" value={avgStartDate} onChange={e => setAvgStartDate(e.target.value)} className="w-40" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">End</Label>
                        <Input type="date" value={avgEndDate} onChange={e => setAvgEndDate(e.target.value)} className="w-40" />
                      </div>
                    </>
                  )}

                  {avgMode === 'monthly' && (
                    <>
                      <div className="space-y-1">
                        <Label className="text-sm">Month</Label>
                        <Select value={String(avgMonth)} onValueChange={v => setAvgMonth(Number(v))}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                              <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm">Year</Label>
                        <Input type="number" value={avgYear} onChange={e => setAvgYear(Number(e.target.value))} className="w-24" />
                      </div>
                    </>
                  )}

                  <Button onClick={calculateAverages} disabled={calculatingAvg} className="bg-red-600 hover:bg-red-700">
                    {calculatingAvg ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : <><Calculator className="w-4 h-4 mr-2" />Calculate</>}
                  </Button>
                </div>

                {avgMode === 'duration' && (
                  <p className="text-sm text-gray-600 dark:text-slate-400">Averages from admission date to today. Defaults to last 90 days if no admission date.</p>
                )}

                {averageResults.size > 0 && (
                  <div className="overflow-auto border rounded-lg bg-white dark:bg-slate-900">
                    <table className="text-sm w-full table-fixed">
                      <colgroup>
                        <col style={{ minWidth: '140px' }} />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '90px' }} />
                        <col style={{ width: '72px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '72px' }} />
                      </colgroup>
                      <thead className="bg-gray-50 dark:bg-slate-800">
                        <tr>
                          <th className="text-left px-3 py-2">Youth</th>
                          <th className="text-center px-2 py-2">Peer</th>
                          <th className="text-center px-2 py-2">Adult</th>
                          <th className="text-center px-2 py-2">Investment</th>
                          <th className="text-center px-2 py-2">Authority</th>
                          <th className="text-center px-2 py-2 bg-blue-50 font-bold">Overall</th>
                          <th className="text-center px-2 py-2">Rating</th>
                          <th className="text-center px-2 py-2">Entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedYouths.map(y => {
                          const r = averageResults.get(y.id)
                          if (!r) return null
                          return (
                            <tr key={y.id} className="border-t hover:bg-gray-50 dark:hover:bg-slate-800">
                              <td className="px-3 py-2 font-medium">{y.firstName} {y.lastName}</td>
                              <td className="px-2 py-2 text-center">{r.peer !== null ? <span className={ratingColor(r.peer)}>{r.peer.toFixed(1)}</span> : '-'}</td>
                              <td className="px-2 py-2 text-center">{r.adult !== null ? <span className={ratingColor(r.adult)}>{r.adult.toFixed(1)}</span> : '-'}</td>
                              <td className="px-2 py-2 text-center">{r.investment !== null ? <span className={ratingColor(r.investment)}>{r.investment.toFixed(1)}</span> : '-'}</td>
                              <td className="px-2 py-2 text-center">{r.authority !== null ? <span className={ratingColor(r.authority)}>{r.authority.toFixed(1)}</span> : '-'}</td>
                              <td className="px-2 py-2 text-center bg-blue-50 font-bold">
                                {r.overall !== null ? <span className={ratingColor(r.overall)}>{r.overall.toFixed(1)}</span> : '-'}
                              </td>
                              <td className="px-2 py-2 text-center">
                                {r.overall !== null && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${ratingBgColor(r.overall)} ${ratingColor(r.overall)}`}>
                                    {ratingLabel(r.overall)}
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-center text-gray-500 dark:text-slate-400">{r.totalEntries}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {averageResults.size === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
                    <p>Select a time range and click Calculate to see domain averages.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ UPLOAD TAB ═══════ */}
          <TabsContent value="upload">
            <Tabs defaultValue="weekly_upload">
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="weekly_upload" className="text-xs">Weekly Evals</TabsTrigger>
                <TabsTrigger value="daily_upload" className="text-xs">Daily Shifts</TabsTrigger>
              </TabsList>
              <TabsContent value="weekly_upload">
                <ShiftScoresCsvUploader type="weekly" youths={sortedYouths} onComplete={() => setRefreshKey(k => k + 1)} />
              </TabsContent>
              <TabsContent value="daily_upload">
                <ShiftScoresCsvUploader type="daily" youths={sortedYouths} onComplete={() => setRefreshKey(k => k + 1)} />
              </TabsContent>
            </Tabs>

            <div className="border-t pt-4 mt-6">
              <h4 className="font-medium mb-3">Manual Weekly Entry</h4>
              <ManualWeeklyDomainEntry youths={sortedYouths} toast={toast} />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

// ── Manual Weekly Entry Sub-component ──
const ManualWeeklyDomainEntry: React.FC<{ youths: any[]; toast: any }> = ({ youths, toast }) => {
  const [weekDate, setWeekDate] = useState(toISO(getMonday(new Date())))
  const [entries, setEntries] = useState<{ [youthId: string]: DomainScores }>({})
  const [saving, setSaving] = useState(false)

  const updateEntry = (youthId: string, domain: keyof DomainScores, value: string) => {
    const num = value === '' ? NaN : Number(value)
    setEntries(prev => ({
      ...prev,
      [youthId]: { ...(prev[youthId] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }), [domain]: num }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let count = 0
      for (const y of youths) {
        const e = entries[y.id]
        if (!e) continue
        const hasAny = Object.values(e).some(v => !isNaN(v))
        if (hasAny) {
          await upsertWeeklyEval(y.id, weekDate, e, 'manual')
          count++
        }
      }
      toast({ title: "Saved", description: `Saved ${count} weekly eval(s).`, duration: 3000 })
      setEntries({})
    } catch {
      toast({ title: "Error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="space-y-1">
          <Label className="text-sm">Week Date</Label>
          <Input type="date" value={weekDate} onChange={e => setWeekDate(e.target.value)} className="w-44" />
        </div>
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="text-xs sm:text-sm w-full table-fixed" style={{ minWidth: '360px' }}>
          <colgroup>
            <col style={{ width: '140px' }} />
            {DOMAINS.map(d => <col key={d.key} style={{ width: '80px' }} />)}
          </colgroup>
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-slate-300">Youth</th>
              {DOMAINS.map(d => (
                <th key={d.key} className="text-center px-1 py-2 font-medium text-gray-700 dark:text-slate-300">{d.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {youths.map(y => (
              <tr key={y.id} className="border-t">
                <td className="px-3 py-1.5 font-medium text-sm">{y.firstName} {y.lastName}</td>
                {DOMAINS.map(d => (
                  <td key={d.key} className="p-1">
                    <Input
                      type="number" min={0} max={4} step={0.1} placeholder="—"
                      value={entries[y.id]?.[d.key] ?? ''}
                      onChange={e => updateEntry(y.id, d.key, e.target.value)}
                      className="w-full h-7 text-center text-xs px-1"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
        {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Weekly Evals</>}
      </Button>
    </div>
  )
}

// ── Shift Scores CSV Uploader Sub-component ──

type UploadScoreRow = { youthName: string; youthId: string; date: string; shift: string; peer: number; adult: number; investment: number; authority: number }

const weeklyUploadColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'date', label: 'Week Date' },
  { key: 'peer', label: 'Peer' },
  { key: 'adult', label: 'Adult' },
  { key: 'investment', label: 'Invest' },
  { key: 'authority', label: 'Auth' },
]

const dailyUploadColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'date', label: 'Date' },
  { key: 'shift', label: 'Shift' },
  { key: 'peer', label: 'Peer' },
  { key: 'adult', label: 'Adult' },
  { key: 'investment', label: 'Invest' },
  { key: 'authority', label: 'Auth' },
]

const ShiftScoresCsvUploader: React.FC<{ type: 'weekly' | 'daily'; youths: any[]; onComplete: () => void }> = ({ type, youths, onComplete }) => {
  const youthList: MatchableYouth[] = youths.map((y: any) => ({ id: y.id, firstName: y.firstName || '', lastName: y.lastName || '' }))

  const parseRows = useCallback((rows: string[][]): ParsedRow<UploadScoreRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'name', 'youth') : 0
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 1

    let shiftIdx = -1, peerIdx: number, adultIdx: number, investIdx: number, authIdx: number

    if (type === 'daily') {
      shiftIdx = hasHeader ? findColumnIndex(header, 'shift') : 2
      peerIdx = hasHeader ? findColumnIndex(header, 'peer') : 3
      adultIdx = hasHeader ? findColumnIndex(header, 'adult') : 4
      investIdx = hasHeader ? findColumnIndex(header, 'invest') : 5
      authIdx = hasHeader ? findColumnIndex(header, 'auth', 'dealing') : 6
    } else {
      peerIdx = hasHeader ? findColumnIndex(header, 'peer') : 2
      adultIdx = hasHeader ? findColumnIndex(header, 'adult') : 3
      investIdx = hasHeader ? findColumnIndex(header, 'invest') : 4
      authIdx = hasHeader ? findColumnIndex(header, 'auth', 'dealing') : 5
    }

    return dataRows.map(cols => {
      const errors: string[] = []
      const warnings: string[] = []
      const nameVal = cols[nameIdx] || ''
      const matched = matchYouth(nameVal, youthList)
      if (!matched) errors.push(`Youth "${nameVal}" not found`)
      const { date, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (dateErr) errors.push(dateErr)

      const parseDomain = (idx: number, label: string) => {
        if (idx < 0 || !cols[idx]) return 0
        const raw = parseFloat(cols[idx])
        const { score, clamped } = clampScore(raw, 0, 4)
        if (clamped) warnings.push(`${label} ${raw} clamped to ${score}`)
        return score ?? 0
      }

      const peer = parseDomain(peerIdx, 'Peer')
      const adult = parseDomain(adultIdx, 'Adult')
      const investment = parseDomain(investIdx, 'Investment')
      const authority = parseDomain(authIdx, 'Authority')

      let shift = ''
      if (type === 'daily') {
        const shiftRaw = (cols[shiftIdx] || 'day').toLowerCase().trim()
        shift = shiftRaw.startsWith('eve') ? 'Evening' : shiftRaw.startsWith('nig') || shiftRaw.startsWith('ove') ? 'Night' : 'Day'
      }

      const finalDate = type === 'weekly' && date ? toWeekStartISO(date) : date

      return {
        data: { youthName: matched ? `${matched.firstName} ${matched.lastName}` : nameVal, youthId: matched?.id || '', date: finalDate, shift, peer, adult, investment, authority },
        valid: errors.length === 0,
        errors,
        warnings,
      }
    })
  }, [youthList, type])

  const handleImport = useCallback(async (rows: UploadScoreRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        const scores: DomainScores = { peer: row.peer, adult: row.adult, investment: row.investment, authority: row.authority }
        if (type === 'daily') {
          const shift: ShiftType = row.shift.toLowerCase().startsWith('eve') ? 'evening' : row.shift.toLowerCase().startsWith('nig') ? 'night' : 'day'
          await upsertDailyShift(row.youthId, row.date, shift, scores)
        } else {
          await upsertWeeklyEval(row.youthId, row.date, scores, 'uploaded')
        }
        imported++
      } catch (e) {
        errors.push(`${row.youthName} ${row.date}: ${e}`)
        skipped++
      }
    }
    onComplete()
    return { imported, skipped, errors }
  }, [type, onComplete])

  return (
    <CsvUploader<UploadScoreRow>
      templateType={type === 'weekly' ? 'weekly_eval' : 'daily_shift'}
      parseRows={parseRows}
      columns={type === 'weekly' ? weeklyUploadColumns : dailyUploadColumns}
      onImport={handleImport}
    />
  )
}

export default ShiftScores
