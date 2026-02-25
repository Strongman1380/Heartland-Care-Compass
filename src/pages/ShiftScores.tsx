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
import { format, addDays, subDays } from 'date-fns'
import {
  TrendingUp, TrendingDown, Minus, Save, CheckCircle2,
  RefreshCw, Upload, Sun, Sunset, Moon, Calculator, Calendar,
  Users, ChevronLeft, ChevronRight, FileSpreadsheet
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Header } from '@/components/layout/Header'
import * as XLSX from 'xlsx'

const toISO = (d: Date) => format(d, 'yyyy-MM-dd')

const getMonday = (d: Date) => {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const res = new Date(d)
  res.setDate(d.getDate() + diff)
  res.setHours(0, 0, 0, 0)
  return res
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
  if (val >= 3.5) return 'text-green-600'
  if (val >= 3.0) return 'text-yellow-600'
  if (val >= 2.0) return 'text-orange-600'
  return 'text-red-600'
}

const ratingBgColor = (val: number) => {
  if (val >= 3.5) return 'bg-green-100'
  if (val >= 3.0) return 'bg-yellow-100'
  if (val >= 2.0) return 'bg-orange-100'
  return 'bg-red-100'
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
          if (grid[ev.youth_id] && grid[ev.youth_id][ev.week_date]) {
            grid[ev.youth_id][ev.week_date] = {
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
        console.error('Error loading weekly evals:', error)
      }
    }
    loadWeekly()
  }, [sortedYouths, weeklyDates.join('|')])

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
        console.error('Error loading daily shifts:', error)
      }
    }
    loadDaily()
  }, [sortedYouths, dailyDates.join('|')])

  // ── Weekly eval handlers ──
  const handleWeeklyChange = (youthId: string, weekDate: string, domain: keyof DomainScores, value: string) => {
    const num = value === '' ? NaN : Number(value)
    setWeeklyGrid(prev => {
      const youthRow = { ...(prev[youthId] || {}) }
      const cell = { ...(youthRow[weekDate] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }) }
      cell[domain] = num
      youthRow[weekDate] = cell
      return { ...prev, [youthId]: youthRow }
    })

    if (!isNaN(num) && autoSaveEnabled) {
      // Use functional updater to read latest state, avoiding stale closures
      setWeeklyGrid(current => {
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
          upsertWeeklyEval(youthId, weekDate, safeScores, 'manual').then(() => {
            setLastSaved(new Date())
          }).catch(err => {
            console.error('Auto-save weekly eval failed:', err)
            toast({ title: "Save Failed", description: String(err), variant: "destructive" })
          })
        }
        return current // no mutation, just reading
      })
    }
  }

  // ── Daily shift handlers ──
  const handleDailyChange = (youthId: string, dateISO: string, shift: ShiftType, domain: keyof DomainScores, value: string) => {
    const num = value === '' ? NaN : Number(value)
    const key = `${dateISO}_${shift}`
    setDailyGrid(prev => {
      const youthRow = { ...(prev[youthId] || {}) }
      const cell = { ...(youthRow[key] || { peer: NaN, adult: NaN, investment: NaN, authority: NaN }) }
      cell[domain] = num
      youthRow[key] = cell
      return { ...prev, [youthId]: youthRow }
    })

    if (!isNaN(num) && autoSaveEnabled) {
      // Use functional updater to read latest state, avoiding stale closures
      setDailyGrid(current => {
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
          upsertDailyShift(youthId, dateISO, shift, safeScores).then(() => {
            setLastSaved(new Date())
          }).catch(err => {
            console.error('Auto-save daily shift failed:', err)
            toast({ title: "Save Failed", description: String(err), variant: "destructive" })
          })
        }
        return current // no mutation, just reading
      })
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
      default: return <Minus className="w-4 h-4 text-gray-500" title={title} />
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
  const matchYouth = (nameVal: string) => {
    const lower = nameVal.toLowerCase().trim()
    return sortedYouths.find(y =>
      y.firstName.toLowerCase() === lower ||
      `${y.firstName} ${y.lastName}`.toLowerCase() === lower ||
      y.lastName.toLowerCase() === lower
    )
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
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i]
        if (cols.length < 3) continue

        const nameVal = cols[nameIdx]
        const dateVal = cols[dateIdx]
        const peer = clampDomain(peerIdx >= 0 ? parseFloat(cols[peerIdx]) : NaN)
        const adult = clampDomain(adultIdx >= 0 ? parseFloat(cols[adultIdx]) : NaN)
        const invest = clampDomain(investIdx >= 0 ? parseFloat(cols[investIdx]) : NaN)
        const auth = clampDomain(authIdx >= 0 ? parseFloat(cols[authIdx]) : NaN)

        if ([peer, adult, invest, auth].every(v => isNaN(v))) { skipped++; continue }

        const matched = matchYouth(nameVal)
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
          await upsertWeeklyEval(matched.id, isoDate, scores, 'uploaded')
        }
        uploaded++
      }

      const type = isDailyShift ? 'daily shift score' : 'weekly eval'
      toast({ title: "Upload Complete", description: `Imported ${uploaded} ${type}(s).${skipped ? ` ${skipped} row(s) skipped.` : ''}`, duration: 5000 })
    } catch (error) {
      console.error('Upload error:', error)
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
          <TabsList className="bg-white shadow border">
            <TabsTrigger value="weekly" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Weekly Evals
            </TabsTrigger>
            <TabsTrigger value="daily" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Daily Shift Entry
            </TabsTrigger>
            <TabsTrigger value="averages" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Averages
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-red-50 data-[state=active]:text-red-800">
              Upload
            </TabsTrigger>
          </TabsList>

          {/* ═══════ WEEKLY EVALS TAB ═══════ */}
          <TabsContent value="weekly">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <span>Weekly Evaluation Scores</span>
                    {lastSaved && (
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
                    <label className="text-sm text-gray-600 flex items-center gap-1 ml-2">
                      <input type="checkbox" checked={autoSaveEnabled} onChange={e => setAutoSaveEnabled(e.target.checked)} className="rounded" />
                      Auto-save
                    </label>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-2 text-xs text-gray-500">
                  4 Domains: Peer Interaction, Adult Interaction, Investment Level, Dealing w/ Authority. Scale 0-4.
                </div>

                {/* One card per youth with their weekly scores */}
                <div className="space-y-4">
                  {loading ? (
                    <p className="text-center text-gray-500 py-8">Loading youths...</p>
                  ) : sortedYouths.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No youths found.</p>
                  ) : (
                    sortedYouths.map(y => {
                      const stats = youthStats.get(y.id)
                      return (
                        <div key={y.id} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-3 py-2 flex items-center justify-between">
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
                            <table className="text-xs sm:text-sm w-full" style={{ minWidth: '600px' }}>
                              <thead className="bg-gray-50/50">
                                <tr>
                                  <th className="text-left px-2 py-1.5 w-20">Domain</th>
                                  {weeklyDates.map(wd => (
                                    <th key={wd} className="text-center px-1 py-1.5 min-w-[60px]">
                                      <div className="text-xs">{format(new Date(wd + 'T00:00:00'), 'M/d')}</div>
                                    </th>
                                  ))}
                                  <th className="text-center px-2 py-1.5 bg-blue-50 min-w-[50px]">Avg</th>
                                </tr>
                              </thead>
                              <tbody>
                                {DOMAINS.map(d => (
                                  <tr key={d.key} className="border-t">
                                    <td className="px-2 py-1 font-medium text-gray-700">{d.short}</td>
                                    {weeklyDates.map(wd => {
                                      const val = weeklyGrid[y.id]?.[wd]?.[d.key]
                                      return (
                                        <td key={wd} className="px-1 py-1">
                                          <Input
                                            type="number" min={0} max={4} step={0.1}
                                            value={val !== undefined && !isNaN(val) ? val : ''}
                                            onChange={e => handleWeeklyChange(y.id, wd, d.key, e.target.value)}
                                            className="text-center w-14 h-7 text-xs"
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
                                <tr className="border-t bg-gray-50/50">
                                  <td className="px-2 py-1 font-bold text-gray-800">Overall</td>
                                  {weeklyDates.map(wd => {
                                    const overall = getWeeklyCellOverall(y.id, wd)
                                    return (
                                      <td key={wd} className="px-1 py-1 text-center font-semibold">
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
                  <span>Daily Shift Scores</span>
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

                <div className="text-sm font-medium text-gray-700 mb-3">
                  Week: {format(dailyWeekStart, 'MMM dd')} - {format(addDays(dailyWeekStart, 6), 'MMM dd, yyyy')} | {SHIFTS.find(s => s.key === activeShift)?.label} Shift
                </div>

                {/* Per-youth daily grid */}
                <div className="space-y-4">
                  {sortedYouths.map(y => (
                    <div key={y.id} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 font-semibold text-sm">{y.firstName} {y.lastName}</div>
                      <div className="overflow-auto">
                        <table className="text-xs sm:text-sm w-full" style={{ minWidth: '500px' }}>
                          <thead className="bg-gray-50/50">
                            <tr>
                              <th className="text-left px-2 py-1.5 w-20">Domain</th>
                              {dailyDates.map((iso, idx) => (
                                <th key={iso} className={`text-center px-1 py-1.5 min-w-[54px] ${toISO(today) === iso ? 'bg-yellow-50' : ''}`}>
                                  <div className="font-semibold">{WEEKDAYS[idx]}</div>
                                  <div className="text-xs text-gray-500">{format(new Date(iso + 'T00:00:00'), 'M/d')}</div>
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
                                    <td key={iso} className={`px-1 py-1 ${toISO(today) === iso ? 'bg-yellow-50' : ''}`}>
                                      <Input
                                        type="number" min={0} max={4} step={0.1}
                                        value={val !== undefined && !isNaN(val) ? val : ''}
                                        onChange={e => handleDailyChange(y.id, iso, activeShift, d.key, e.target.value)}
                                        className="text-center w-14 h-7 text-xs"
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

                <div className="text-xs text-gray-500 mt-3">
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
                  <p className="text-sm text-gray-600">Averages from admission date to today. Defaults to last 90 days if no admission date.</p>
                )}

                {averageResults.size > 0 && (
                  <div className="overflow-auto border rounded-lg bg-white">
                    <table className="text-sm w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 min-w-[140px]">Youth</th>
                          <th className="text-center px-3 py-2">Peer</th>
                          <th className="text-center px-3 py-2">Adult</th>
                          <th className="text-center px-3 py-2">Investment</th>
                          <th className="text-center px-3 py-2">Authority</th>
                          <th className="text-center px-3 py-2 bg-blue-50 font-bold">Overall</th>
                          <th className="text-center px-3 py-2">Rating</th>
                          <th className="text-center px-3 py-2">Entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedYouths.map(y => {
                          const r = averageResults.get(y.id)
                          if (!r) return null
                          return (
                            <tr key={y.id} className="border-t hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{y.firstName} {y.lastName}</td>
                              <td className="px-3 py-2 text-center">{r.peer !== null ? <span className={ratingColor(r.peer)}>{r.peer.toFixed(1)}</span> : '-'}</td>
                              <td className="px-3 py-2 text-center">{r.adult !== null ? <span className={ratingColor(r.adult)}>{r.adult.toFixed(1)}</span> : '-'}</td>
                              <td className="px-3 py-2 text-center">{r.investment !== null ? <span className={ratingColor(r.investment)}>{r.investment.toFixed(1)}</span> : '-'}</td>
                              <td className="px-3 py-2 text-center">{r.authority !== null ? <span className={ratingColor(r.authority)}>{r.authority.toFixed(1)}</span> : '-'}</td>
                              <td className="px-3 py-2 text-center bg-blue-50 font-bold">
                                {r.overall !== null ? <span className={ratingColor(r.overall)}>{r.overall.toFixed(1)}</span> : '-'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {r.overall !== null && (
                                  <span className={`text-xs px-2 py-1 rounded-full ${ratingBgColor(r.overall)} ${ratingColor(r.overall)}`}>
                                    {ratingLabel(r.overall)}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center text-gray-500">{r.totalEntries}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {averageResults.size === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a time range and click Calculate to see domain averages.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════ UPLOAD TAB ═══════ */}
          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-red-600" />
                  Upload Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Button */}
                <div className="flex items-center gap-4">
                  <input ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-red-600 hover:bg-red-700" size="lg">
                    {uploading
                      ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                      : <><FileSpreadsheet className="w-4 h-4 mr-2" />Choose Excel or CSV File</>}
                  </Button>
                  <span className="text-sm text-gray-500">Accepts .xlsx, .xls, .csv</span>
                </div>

                {/* Weekly Eval Format */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-blue-800">Weekly Eval Format</h4>
                  <p className="text-sm text-blue-700">For weekly evaluations, use columns: Name, Date, and the 4 domain scores.</p>
                  <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 overflow-auto">
                    <div className="font-bold">Youth Name,Date,Peer Interaction,Adult Interaction,Investment Level,Dealing w/authority</div>
                    <div>Chance Thaller,2025-08-06,3.3,3,2.7,3.3</div>
                    <div>DAGEN DICKEY,2025-09-03,3.7,3.5,3.3,3.7</div>
                  </div>
                </div>

                {/* Daily Shift Format */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-amber-800">Daily Shift Score Format</h4>
                  <p className="text-sm text-amber-700">For daily shift scores, add a <strong>Shift</strong> column. The file will auto-detect as daily shift data.</p>
                  <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 overflow-auto">
                    <div className="font-bold">Youth Name,Date,Shift,Peer Interaction,Adult Interaction,Investment Level,Dealing w/authority</div>
                    <div>Chance Thaller,2025-08-06,Day,3.3,3,2.7,3.3</div>
                    <div>Chance Thaller,2025-08-06,Evening,3.0,2.8,2.5,3.0</div>
                    <div>DAGEN DICKEY,2025-09-03,Night,3.7,3.5,3.3,3.7</div>
                  </div>
                  <p className="text-xs text-amber-600">Shift values: Day, Evening, or Night</p>
                </div>

                {/* Shared notes */}
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Youth Name</strong>: First name, last name, or full name (case-insensitive)</li>
                  <li><strong>Date</strong>: YYYY-MM-DD, MM/DD/YYYY, or Excel date format</li>
                  <li><strong>Scores</strong>: 0-4 scale for each domain</li>
                  <li>Rows with non-numeric scores will be skipped</li>
                  <li>If no Shift column is found, rows are saved as weekly evals</li>
                </ul>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Manual Weekly Entry</h4>
                  <ManualWeeklyDomainEntry youths={sortedYouths} toast={toast} />
                </div>
              </CardContent>
            </Card>
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

      <div className="space-y-3">
        {youths.map(y => (
          <div key={y.id} className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="font-medium text-sm mb-2">{y.firstName} {y.lastName}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DOMAINS.map(d => (
                <div key={d.key} className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-600 w-12">{d.short}</span>
                  <Input
                    type="number" min={0} max={4} step={0.1} placeholder="0-4"
                    value={entries[y.id]?.[d.key] ?? ''}
                    onChange={e => updateEntry(y.id, d.key, e.target.value)}
                    className="w-16 h-7 text-center text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={saving} className="bg-red-600 hover:bg-red-700">
        {saving ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Weekly Evals</>}
      </Button>
    </div>
  )
}

export default ShiftScores
