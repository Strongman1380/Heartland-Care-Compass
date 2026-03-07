import React, { useCallback, useState, useRef } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Header } from '@/components/layout/Header'
import { CsvUploader, type ParsedRow, type ColumnDef, type ImportResult } from '@/components/common/CsvUploader'
import { useYouth } from '@/hooks/useSupabase'
import { normalizeDate, matchYouth, clampScore, findColumnIndex, detectHeaders, type MatchableYouth } from '@/utils/csvUtils'
import { upsertWeeklyEval, upsertDailyShift, type DomainScores } from '@/utils/shiftScores'
import type { ShiftType } from '@/integrations/firebase/shiftScoresService'
import { behaviorPointsService, dailyRatingsService, caseNotesService } from '@/integrations/firebase/services'
import { referralNotesService } from '@/integrations/firebase/referralNotesService'
import { parseDpnText, type DpnShiftEntry } from '@/utils/dpnParser'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Upload, FileText, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ── Parsed Row Types ──

type WeeklyRow = { youthName: string; youthId: string; weekDate: string; peer: number; adult: number; investment: number; authority: number }
type DailyShiftRow = { youthName: string; youthId: string; date: string; shift: string; peer: number; adult: number; investment: number; authority: number }
type PointsRow = { youthName: string; youthId: string; date: string; morningPoints: number | null; afternoonPoints: number | null; eveningPoints: number | null; totalPoints: number; notes: string }
type RatingsRow = { youthName: string; youthId: string; date: string; peer: number; adult: number; investment: number; authority: number; staff: string; comments: string }
type ReferralRow = { referralName: string; referralSource: string; referralDate: string; staffName: string; status: string; priority: string; summary: string }
type CaseNoteRow = { youthName: string; youthId: string; date: string; summary: string; note: string; staff: string }

// ── Column Definitions ──

const weeklyColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'weekDate', label: 'Week Date' },
  { key: 'peer', label: 'Peer' },
  { key: 'adult', label: 'Adult' },
  { key: 'investment', label: 'Invest' },
  { key: 'authority', label: 'Auth' },
]

const dailyShiftColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'date', label: 'Date' },
  { key: 'shift', label: 'Shift' },
  { key: 'peer', label: 'Peer' },
  { key: 'adult', label: 'Adult' },
  { key: 'investment', label: 'Invest' },
  { key: 'authority', label: 'Auth' },
]

const pointsColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'date', label: 'Date' },
  { key: 'morningPoints', label: 'Morning' },
  { key: 'afternoonPoints', label: 'Afternoon' },
  { key: 'eveningPoints', label: 'Evening' },
  { key: 'totalPoints', label: 'Total' },
  { key: 'notes', label: 'Notes' },
]

const ratingsColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'date', label: 'Date' },
  { key: 'peer', label: 'Peer' },
  { key: 'adult', label: 'Adult' },
  { key: 'investment', label: 'Invest' },
  { key: 'authority', label: 'Auth' },
  { key: 'staff', label: 'Staff' },
]

const referralColumns: ColumnDef[] = [
  { key: 'referralName', label: 'Name' },
  { key: 'referralSource', label: 'Source' },
  { key: 'referralDate', label: 'Date' },
  { key: 'staffName', label: 'Staff' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'summary', label: 'Summary' },
]

const caseNoteColumns: ColumnDef[] = [
  { key: 'youthName', label: 'Youth' },
  { key: 'date', label: 'Date' },
  { key: 'summary', label: 'Summary' },
  { key: 'note', label: 'Note', width: '200px' },
  { key: 'staff', label: 'Staff' },
]

// ── Helper to parse 4-domain scores ──

function parseDomainScores(
  cols: string[],
  peerIdx: number, adultIdx: number, investIdx: number, authIdx: number
): { scores: { peer: number; adult: number; investment: number; authority: number }; warnings: string[] } {
  const warnings: string[] = []
  const parse = (idx: number, label: string) => {
    if (idx < 0 || !cols[idx]) return 0
    const raw = parseFloat(cols[idx])
    const { score, clamped } = clampScore(raw, 0, 4)
    if (clamped) warnings.push(`${label} ${raw} clamped to ${score}`)
    return score ?? 0
  }
  return {
    scores: {
      peer: parse(peerIdx, 'Peer'),
      adult: parse(adultIdx, 'Adult'),
      investment: parse(investIdx, 'Investment'),
      authority: parse(authIdx, 'Authority'),
    },
    warnings,
  }
}

// ── Week start snapping ──

function toWeekStartISO(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return isoDate
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// ── Component ──

const VALID_STATUSES = ['pending', 'screening', 'interviewed', 'accepted', 'denied', 'waitlisted']
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent']

const DataUpload: React.FC = () => {
  const { youths } = useYouth()
  const { toast } = useToast()
  const [dpnText, setDpnText] = useState('')
  const [dpnEntries, setDpnEntries] = useState<DpnShiftEntry[]>([])
  const [dpnWarnings, setDpnWarnings] = useState<string[]>([])
  const [dpnImporting, setDpnImporting] = useState(false)
  const [dpnResult, setDpnResult] = useState<ImportResult | null>(null)
  const dpnFileRef = useRef<HTMLInputElement>(null)

  const sortedYouths = (youths || [])
    .filter((y: any) => !y.archived)
    .sort((a: any, b: any) => (a.lastName || '').localeCompare(b.lastName || '') || (a.firstName || '').localeCompare(b.firstName || ''))

  const youthList: MatchableYouth[] = sortedYouths.map((y: any) => ({
    id: y.id,
    firstName: y.firstName || '',
    lastName: y.lastName || '',
  }))

  // ── Weekly Eval Parser ──
  const parseWeeklyRows = useCallback((rows: string[][]): ParsedRow<WeeklyRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'name', 'youth') : 0
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 1
    const peerIdx = hasHeader ? findColumnIndex(header, 'peer') : 2
    const adultIdx = hasHeader ? findColumnIndex(header, 'adult') : 3
    const investIdx = hasHeader ? findColumnIndex(header, 'invest') : 4
    const authIdx = hasHeader ? findColumnIndex(header, 'auth', 'dealing') : 5

    return dataRows.map(cols => {
      const errors: string[] = []
      const nameVal = cols[nameIdx] || ''
      const matched = matchYouth(nameVal, youthList)
      if (!matched) errors.push(`Youth "${nameVal}" not found`)
      const { date, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (dateErr) errors.push(dateErr)
      const weekDate = date ? toWeekStartISO(date) : ''
      const { scores, warnings } = parseDomainScores(cols, peerIdx, adultIdx, investIdx, authIdx)

      return {
        data: { youthName: matched ? `${matched.firstName} ${matched.lastName}` : nameVal, youthId: matched?.id || '', weekDate, ...scores },
        valid: errors.length === 0,
        errors,
        warnings,
      }
    })
  }, [youthList])

  // ── Daily Shift Parser ──
  const parseDailyShiftRows = useCallback((rows: string[][]): ParsedRow<DailyShiftRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'name', 'youth') : 0
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 1
    const shiftIdx = hasHeader ? findColumnIndex(header, 'shift') : 2
    const peerIdx = hasHeader ? findColumnIndex(header, 'peer') : 3
    const adultIdx = hasHeader ? findColumnIndex(header, 'adult') : 4
    const investIdx = hasHeader ? findColumnIndex(header, 'invest') : 5
    const authIdx = hasHeader ? findColumnIndex(header, 'auth', 'dealing') : 6

    return dataRows.map(cols => {
      const errors: string[] = []
      const nameVal = cols[nameIdx] || ''
      const matched = matchYouth(nameVal, youthList)
      if (!matched) errors.push(`Youth "${nameVal}" not found`)
      const { date, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (dateErr) errors.push(dateErr)
      const shiftRaw = (cols[shiftIdx] || 'day').toLowerCase().trim()
      const shift = shiftRaw.startsWith('eve') ? 'Evening' : shiftRaw.startsWith('nig') || shiftRaw.startsWith('ove') ? 'Night' : 'Day'
      const { scores, warnings } = parseDomainScores(cols, peerIdx, adultIdx, investIdx, authIdx)

      return {
        data: { youthName: matched ? `${matched.firstName} ${matched.lastName}` : nameVal, youthId: matched?.id || '', date, shift, ...scores },
        valid: errors.length === 0,
        errors,
        warnings,
      }
    })
  }, [youthList])

  // ── Behavior Points Parser ──
  const parsePointsRows = useCallback((rows: string[][]): ParsedRow<PointsRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'name', 'youth') : 0
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 1
    const morningIdx = hasHeader ? findColumnIndex(header, 'morning') : 2
    const afternoonIdx = hasHeader ? findColumnIndex(header, 'afternoon') : 3
    const eveningIdx = hasHeader ? findColumnIndex(header, 'evening') : 4
    const totalIdx = hasHeader ? findColumnIndex(header, 'total', 'points') : -1
    const notesIdx = hasHeader ? findColumnIndex(header, 'note') : 5

    const parseNullableInt = (cols: string[], idx: number): number | null => {
      if (idx < 0 || !cols[idx]?.trim()) return null
      const v = parseInt(cols[idx], 10)
      return isNaN(v) ? null : Math.max(0, v)
    }

    return dataRows.map(cols => {
      const errors: string[] = []
      const nameVal = cols[nameIdx] || ''
      const matched = matchYouth(nameVal, youthList)
      if (!matched) errors.push(`Youth "${nameVal}" not found`)
      const { date, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (dateErr) errors.push(dateErr)

      const morning = parseNullableInt(cols, morningIdx)
      const afternoon = parseNullableInt(cols, afternoonIdx)
      const evening = parseNullableInt(cols, eveningIdx)
      const explicitTotal = parseNullableInt(cols, totalIdx)

      const hasShifts = morning !== null || afternoon !== null || evening !== null
      const total = hasShifts
        ? (morning ?? 0) + (afternoon ?? 0) + (evening ?? 0)
        : (explicitTotal ?? 0)

      const notesCol = notesIdx >= 0 ? notesIdx : 5
      const notes = cols[notesCol] || ''

      return {
        data: {
          youthName: matched ? `${matched.firstName} ${matched.lastName}` : nameVal,
          youthId: matched?.id || '',
          date,
          morningPoints: morning,
          afternoonPoints: afternoon,
          eveningPoints: evening,
          totalPoints: total,
          notes,
        },
        valid: errors.length === 0,
        errors,
        warnings: [],
      }
    })
  }, [youthList])

  // ── Daily Ratings Parser ──
  const parseRatingsRows = useCallback((rows: string[][]): ParsedRow<RatingsRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'name', 'youth') : 0
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 1
    const peerIdx = hasHeader ? findColumnIndex(header, 'peer') : 2
    const adultIdx = hasHeader ? findColumnIndex(header, 'adult') : 3
    const investIdx = hasHeader ? findColumnIndex(header, 'invest') : 4
    const authIdx = hasHeader ? findColumnIndex(header, 'auth', 'deal') : 5
    const staffIdx = hasHeader ? findColumnIndex(header, 'staff') : 6
    const commentsIdx = hasHeader ? findColumnIndex(header, 'comment', 'note') : 7

    return dataRows.map(cols => {
      const errors: string[] = []
      const nameVal = cols[nameIdx] || ''
      const matched = matchYouth(nameVal, youthList)
      if (!matched) errors.push(`Youth "${nameVal}" not found`)
      const { date, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (dateErr) errors.push(dateErr)
      const { scores, warnings } = parseDomainScores(cols, peerIdx, adultIdx, investIdx, authIdx)
      const staff = cols[staffIdx] || ''
      const comments = cols[commentsIdx] || ''

      return {
        data: { youthName: matched ? `${matched.firstName} ${matched.lastName}` : nameVal, youthId: matched?.id || '', date, ...scores, staff, comments },
        valid: errors.length === 0,
        errors,
        warnings,
      }
    })
  }, [youthList])

  // ── Import Handlers ──

  const importWeekly = useCallback(async (rows: WeeklyRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await upsertWeeklyEval(row.youthId, row.weekDate, { peer: row.peer, adult: row.adult, investment: row.investment, authority: row.authority }, 'uploaded')
        imported++
      } catch (e) {
        errors.push(`${row.youthName} ${row.weekDate}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [])

  const importDailyShift = useCallback(async (rows: DailyShiftRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        const shift: ShiftType = row.shift.toLowerCase().startsWith('eve') ? 'evening' : row.shift.toLowerCase().startsWith('nig') ? 'night' : 'day'
        await upsertDailyShift(row.youthId, row.date, shift, { peer: row.peer, adult: row.adult, investment: row.investment, authority: row.authority })
        imported++
      } catch (e) {
        errors.push(`${row.youthName} ${row.date} ${row.shift}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [])

  const importPoints = useCallback(async (rows: PointsRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await behaviorPointsService.upsert({
          youth_id: row.youthId,
          date: row.date,
          morningPoints: row.morningPoints,
          afternoonPoints: row.afternoonPoints,
          eveningPoints: row.eveningPoints,
          totalPoints: row.totalPoints,
          comments: row.notes || null,
          createdAt: new Date().toISOString(),
        })
        imported++
      } catch (e) {
        errors.push(`${row.youthName} ${row.date}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [])

  const importRatings = useCallback(async (rows: RatingsRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await dailyRatingsService.upsert({
          youth_id: row.youthId,
          date: row.date,
          peerInteraction: row.peer,
          peerInteractionComment: null,
          adultInteraction: row.adult,
          adultInteractionComment: null,
          investmentLevel: row.investment,
          investmentLevelComment: null,
          dealAuthority: row.authority,
          dealAuthorityComment: null,
          comments: row.comments || null,
          staff: row.staff || null,
          createdAt: null,
          updatedAt: null,
        })
        imported++
      } catch (e) {
        errors.push(`${row.youthName} ${row.date}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [])

  // ── Referral Upload Parser ──
  const parseReferralRows = useCallback((rows: string[][]): ParsedRow<ReferralRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'referral', 'name') : 0
    const sourceIdx = hasHeader ? findColumnIndex(header, 'source') : 1
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 2
    const staffIdx = hasHeader ? findColumnIndex(header, 'staff') : 3
    const statusIdx = hasHeader ? findColumnIndex(header, 'status') : 4
    const priorityIdx = hasHeader ? findColumnIndex(header, 'priority') : 5
    const summaryIdx = hasHeader ? findColumnIndex(header, 'summary') : 6

    return dataRows.map(cols => {
      const errors: string[] = []
      const warnings: string[] = []
      const referralName = (cols[nameIdx] || '').trim()
      if (!referralName) errors.push('Missing referral name')
      const { date: referralDate, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (cols[dateIdx] && dateErr) warnings.push(dateErr)
      const status = (cols[statusIdx] || 'pending').toLowerCase().trim()
      if (status && !VALID_STATUSES.includes(status)) warnings.push(`Unknown status "${status}"`)
      const priority = (cols[priorityIdx] || 'medium').toLowerCase().trim()
      if (priority && !VALID_PRIORITIES.includes(priority)) warnings.push(`Unknown priority "${priority}"`)

      return {
        data: {
          referralName,
          referralSource: (cols[sourceIdx] || '').trim(),
          referralDate: referralDate || '',
          staffName: (cols[staffIdx] || '').trim(),
          status,
          priority,
          summary: (cols[summaryIdx] || '').trim(),
        },
        valid: errors.length === 0,
        errors,
        warnings,
      }
    })
  }, [])

  const importReferrals = useCallback(async (rows: ReferralRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await referralNotesService.save({
          referral_name: row.referralName,
          referral_source: row.referralSource || null,
          referral_date: row.referralDate || null,
          staff_name: row.staffName || null,
          status: row.status || 'pending',
          priority: row.priority || 'medium',
          summary: row.summary || null,
        })
        imported++
      } catch (e) {
        errors.push(`${row.referralName}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [])

  // ── Bulk Case Notes Parser ──
  const parseCaseNoteRows = useCallback((rows: string[][]): ParsedRow<CaseNoteRow>[] => {
    if (rows.length === 0) return []
    const hasHeader = detectHeaders(rows[0])
    const header = hasHeader ? rows[0].map(h => h.toLowerCase()) : []
    const dataRows = hasHeader ? rows.slice(1) : rows

    const nameIdx = hasHeader ? findColumnIndex(header, 'name', 'youth') : 0
    const dateIdx = hasHeader ? findColumnIndex(header, 'date') : 1
    const summaryIdx = hasHeader ? findColumnIndex(header, 'summary', 'title') : 2
    const noteIdx = hasHeader ? findColumnIndex(header, 'note', 'content') : 3
    const staffIdx = hasHeader ? findColumnIndex(header, 'staff') : 4

    return dataRows.map(cols => {
      const errors: string[] = []
      const nameVal = cols[nameIdx] || ''
      const matched = matchYouth(nameVal, youthList)
      if (!matched) errors.push(`Youth "${nameVal}" not found`)
      const { date, error: dateErr } = normalizeDate(cols[dateIdx] || '')
      if (dateErr) errors.push(dateErr)
      const summary = (cols[summaryIdx] || '').trim()
      const note = (cols[noteIdx] || '').trim()
      if (!summary && !note) errors.push('Missing both summary and note')

      return {
        data: {
          youthName: matched ? `${matched.firstName} ${matched.lastName}` : nameVal,
          youthId: matched?.id || '',
          date,
          summary,
          note,
          staff: (cols[staffIdx] || '').trim(),
        },
        valid: errors.length === 0,
        errors,
        warnings: [],
      }
    })
  }, [youthList])

  const importCaseNotes = useCallback(async (rows: CaseNoteRow[]): Promise<ImportResult> => {
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await caseNotesService.create({
          youth_id: row.youthId,
          date: row.date,
          summary: row.summary || null,
          note: row.note || null,
          staff: row.staff || null,
          createdAt: new Date().toISOString(),
        })
        imported++
      } catch (e) {
        errors.push(`${row.youthName} ${row.date}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [])

  // ── DPN Parsing Handlers ──
  const handleDpnParse = useCallback(() => {
    const result = parseDpnText(dpnText)
    setDpnEntries(result.entries)
    setDpnWarnings(result.warnings)
    setDpnResult(null)
    if (result.entries.length === 0 && result.warnings.length === 0) {
      setDpnWarnings(['No shift entries could be extracted from the text.'])
    }
  }, [dpnText])

  const handleDpnFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setDpnText(text)
      const result = parseDpnText(text)
      setDpnEntries(result.entries)
      setDpnWarnings(result.warnings)
      setDpnResult(null)
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  const handleDpnImport = useCallback(async () => {
    if (dpnEntries.length === 0) return
    setDpnImporting(true)
    let imported = 0, skipped = 0
    const errors: string[] = []

    for (const entry of dpnEntries) {
      // Match youth by name
      const matched = matchYouth(entry.youthName, youthList)
      if (!matched) {
        errors.push(`${entry.youthName}: Youth not found`)
        skipped++
        continue
      }
      try {
        await upsertDailyShift(matched.id, entry.date, entry.shift, {
          peer: entry.peer,
          adult: entry.adult,
          investment: entry.investment,
          authority: entry.authority,
        })
        imported++
      } catch (e) {
        errors.push(`${entry.youthName} ${entry.date} ${entry.shift}: ${e}`)
        skipped++
      }
    }

    setDpnResult({ imported, skipped, errors })
    setDpnImporting(false)
    if (imported > 0) {
      toast({ title: 'DPN Import Complete', description: `${imported} shift entries imported.` })
    }
  }, [dpnEntries, youthList, toast])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Upload className="w-6 h-6 text-red-600" />
            Data Upload Center
          </h1>
          <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
            Upload or paste CSV data for shift scores, behavior points, daily ratings, referrals, case notes, and DPN files.
            Copy the template format below and provide it to your AI tool so it can format the extracted data correctly.
          </p>
        </div>

        <Tabs defaultValue="weekly_eval">
          <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
            <TabsTrigger value="weekly_eval" className="text-xs flex-1 min-w-[80px]">Weekly Evals</TabsTrigger>
            <TabsTrigger value="daily_shift" className="text-xs flex-1 min-w-[80px]">Daily Shifts</TabsTrigger>
            <TabsTrigger value="behavior_points" className="text-xs flex-1 min-w-[80px]">Points</TabsTrigger>
            <TabsTrigger value="daily_ratings" className="text-xs flex-1 min-w-[80px]">Ratings</TabsTrigger>
            <TabsTrigger value="referral_upload" className="text-xs flex-1 min-w-[80px]">Referrals</TabsTrigger>
            <TabsTrigger value="bulk_case_notes" className="text-xs flex-1 min-w-[80px]">Case Notes</TabsTrigger>
            <TabsTrigger value="dpn_parse" className="text-xs flex-1 min-w-[80px]">DPN Parse</TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="weekly_eval">
              <CsvUploader<WeeklyRow>
                templateType="weekly_eval"
                parseRows={parseWeeklyRows}
                columns={weeklyColumns}
                onImport={importWeekly}
              />
            </TabsContent>

            <TabsContent value="daily_shift">
              <CsvUploader<DailyShiftRow>
                templateType="daily_shift"
                parseRows={parseDailyShiftRows}
                columns={dailyShiftColumns}
                onImport={importDailyShift}
              />
            </TabsContent>

            <TabsContent value="behavior_points">
              <CsvUploader<PointsRow>
                templateType="behavior_points"
                parseRows={parsePointsRows}
                columns={pointsColumns}
                onImport={importPoints}
              />
            </TabsContent>

            <TabsContent value="daily_ratings">
              <CsvUploader<RatingsRow>
                templateType="daily_ratings"
                parseRows={parseRatingsRows}
                columns={ratingsColumns}
                onImport={importRatings}
              />
            </TabsContent>

            <TabsContent value="referral_upload">
              <CsvUploader<ReferralRow>
                templateType="referral_upload"
                parseRows={parseReferralRows}
                columns={referralColumns}
                onImport={importReferrals}
              />
            </TabsContent>

            <TabsContent value="bulk_case_notes">
              <CsvUploader<CaseNoteRow>
                templateType="bulk_case_notes"
                parseRows={parseCaseNoteRows}
                columns={caseNoteColumns}
                onImport={importCaseNotes}
              />
            </TabsContent>

            <TabsContent value="dpn_parse">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="w-5 h-5 text-red-600" />
                    DPN File Parser
                  </CardTitle>
                  <CardDescription>
                    Paste DPN text or upload a .txt file to extract shift scores. Supports both tabular (CSV) and free-form DPN formats.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dpnFileRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload .txt File
                    </Button>
                    <input
                      ref={dpnFileRef}
                      type="file"
                      accept=".txt,.csv,.tsv"
                      className="hidden"
                      onChange={handleDpnFileUpload}
                    />
                  </div>

                  <Textarea
                    placeholder="Paste DPN text here...&#10;&#10;Example formats:&#10;&#10;Tabular: Youth Name, Date, Shift, Peer, Adult, Investment, Authority&#10;Chance Thaller, 2026-01-15, Day, 3.0, 3.5, 2.8, 3.2&#10;&#10;Free-form:&#10;Youth: Chance Thaller&#10;Date: 01/15/2026&#10;Day Shift&#10;Peer Interaction: 3.0&#10;Adult Interaction: 3.5&#10;Investment: 2.8&#10;Authority: 3.2"
                    value={dpnText}
                    onChange={(e) => setDpnText(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />

                  <Button onClick={handleDpnParse} disabled={!dpnText.trim()}>
                    Parse DPN Text
                  </Button>

                  {dpnWarnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-1">
                      {dpnWarnings.map((w, i) => (
                        <p key={i} className="text-sm text-yellow-700 flex items-start gap-1.5">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {dpnEntries.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-700">
                        Parsed {dpnEntries.length} shift {dpnEntries.length === 1 ? 'entry' : 'entries'}
                      </h3>
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-1.5 text-left">Youth</th>
                              <th className="px-2 py-1.5 text-left">Date</th>
                              <th className="px-2 py-1.5 text-left">Shift</th>
                              <th className="px-2 py-1.5 text-right">Peer</th>
                              <th className="px-2 py-1.5 text-right">Adult</th>
                              <th className="px-2 py-1.5 text-right">Invest</th>
                              <th className="px-2 py-1.5 text-right">Auth</th>
                              <th className="px-2 py-1.5 text-left">Staff</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dpnEntries.map((entry, i) => {
                              const matched = matchYouth(entry.youthName, youthList)
                              return (
                                <tr key={i} className={`border-t ${!matched ? 'bg-red-50' : ''}`}>
                                  <td className="px-2 py-1.5">
                                    {entry.youthName}
                                    {!matched && <span className="text-red-500 ml-1">(not found)</span>}
                                  </td>
                                  <td className="px-2 py-1.5">{entry.date || <span className="text-red-500">missing</span>}</td>
                                  <td className="px-2 py-1.5 capitalize">{entry.shift}</td>
                                  <td className="px-2 py-1.5 text-right">{entry.peer.toFixed(1)}</td>
                                  <td className="px-2 py-1.5 text-right">{entry.adult.toFixed(1)}</td>
                                  <td className="px-2 py-1.5 text-right">{entry.investment.toFixed(1)}</td>
                                  <td className="px-2 py-1.5 text-right">{entry.authority.toFixed(1)}</td>
                                  <td className="px-2 py-1.5">{entry.staff}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={handleDpnImport}
                          disabled={dpnImporting}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          {dpnImporting ? 'Importing...' : `Import ${dpnEntries.length} Entries`}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => { setDpnEntries([]); setDpnWarnings([]); setDpnResult(null); setDpnText('') }}
                        >
                          Clear
                        </Button>
                      </div>

                      {dpnResult && (
                        <div className={`rounded-lg p-3 ${dpnResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'} border`}>
                          <p className="text-sm font-medium flex items-center gap-1.5">
                            {dpnResult.errors.length === 0 ? (
                              <><CheckCircle2 className="w-4 h-4 text-green-600" /> All {dpnResult.imported} entries imported successfully</>
                            ) : (
                              <><AlertTriangle className="w-4 h-4 text-yellow-600" /> {dpnResult.imported} imported, {dpnResult.skipped} skipped</>
                            )}
                          </p>
                          {dpnResult.errors.map((err, i) => (
                            <p key={i} className="text-xs text-red-600 mt-1 flex items-start gap-1">
                              <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              {err}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}

export default DataUpload
