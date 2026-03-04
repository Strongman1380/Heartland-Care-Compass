import React, { useCallback, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Header } from '@/components/layout/Header'
import { CsvUploader, type ParsedRow, type ColumnDef, type ImportResult } from '@/components/common/CsvUploader'
import { useYouth } from '@/hooks/useSupabase'
import { normalizeDate, matchYouth, clampScore, findColumnIndex, detectHeaders, type MatchableYouth } from '@/utils/csvUtils'
import { upsertWeeklyEval, upsertDailyShift, type DomainScores } from '@/utils/shiftScores'
import type { ShiftType } from '@/integrations/firebase/shiftScoresService'
import { behaviorPointsService, dailyRatingsService } from '@/integrations/firebase/services'
import { Upload } from 'lucide-react'

// ── Parsed Row Types ──

type WeeklyRow = { youthName: string; youthId: string; weekDate: string; peer: number; adult: number; investment: number; authority: number }
type DailyShiftRow = { youthName: string; youthId: string; date: string; shift: string; peer: number; adult: number; investment: number; authority: number }
type PointsRow = { date: string; points: number; notes: string }
type RatingsRow = { youthName: string; youthId: string; date: string; peer: number; adult: number; investment: number; authority: number; staff: string; comments: string }

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
  { key: 'date', label: 'Date' },
  { key: 'points', label: 'Points' },
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

const DataUpload: React.FC = () => {
  const { youths } = useYouth()
  const [selectedYouthId, setSelectedYouthId] = useState<string>('')

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
    const dataRows = hasHeader ? rows.slice(1) : rows

    return dataRows.map(cols => {
      const errors: string[] = []
      const { date, error: dateErr } = normalizeDate(cols[0] || '')
      if (dateErr) errors.push(dateErr)
      const pts = parseInt(cols[1] || '', 10)
      if (isNaN(pts) || pts < 0) errors.push(`Invalid points "${cols[1]}"`)
      const notes = cols[2] || ''

      return {
        data: { date, points: isNaN(pts) ? 0 : pts, notes },
        valid: errors.length === 0,
        errors,
        warnings: [],
      }
    })
  }, [])

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
    if (!selectedYouthId) return { imported: 0, skipped: 0, errors: ['No youth selected'] }
    let imported = 0, skipped = 0
    const errors: string[] = []
    for (const row of rows) {
      try {
        await behaviorPointsService.upsert({
          youth_id: selectedYouthId,
          date: row.date,
          morningPoints: null,
          afternoonPoints: null,
          eveningPoints: null,
          totalPoints: row.points,
          comments: row.notes || null,
          createdAt: new Date().toISOString(),
        })
        imported++
      } catch (e) {
        errors.push(`${row.date}: ${e}`)
        skipped++
      }
    }
    return { imported, skipped, errors }
  }, [selectedYouthId])

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
            Upload or paste CSV data for shift scores, behavior points, and daily ratings.
            Copy the template format below and provide it to your AI tool so it can format the extracted data correctly.
          </p>
        </div>

        <Tabs defaultValue="weekly_eval">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="weekly_eval" className="text-xs">Weekly Evals</TabsTrigger>
            <TabsTrigger value="daily_shift" className="text-xs">Daily Shifts</TabsTrigger>
            <TabsTrigger value="behavior_points" className="text-xs">Behavior Points</TabsTrigger>
            <TabsTrigger value="daily_ratings" className="text-xs">Daily Ratings</TabsTrigger>
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
              <div className="mb-4">
                <Label className="text-sm font-medium">Select Youth for Point Import</Label>
                <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choose a youth..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedYouths.map((y: any) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.lastName}, {y.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedYouthId ? (
                <CsvUploader<PointsRow>
                  templateType="behavior_points"
                  parseRows={parsePointsRows}
                  columns={pointsColumns}
                  onImport={importPoints}
                  acceptExcel={false}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Select a youth above to upload behavior points.
                </div>
              )}
            </TabsContent>

            <TabsContent value="daily_ratings">
              <CsvUploader<RatingsRow>
                templateType="daily_ratings"
                parseRows={parseRatingsRows}
                columns={ratingsColumns}
                onImport={importRatings}
              />
            </TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}

export default DataUpload
