import * as XLSX from 'xlsx'
import { format } from 'date-fns'

// ── CSV Line Parsing (RFC 4180) ──

export function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
    if (i === line.length) { fields.push(''); break }
    if (line[i] === '"') {
      i++
      let field = ''
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"') { i++; break }
        else { field += line[i++] }
      }
      fields.push(field.trim())
      if (line[i] === ',') i++
    } else {
      const end = line.indexOf(',', i)
      if (end === -1) { fields.push(line.slice(i).trim()); break }
      fields.push(line.slice(i, end).trim())
      i = end + 1
    }
  }
  return fields
}

// ── File → Rows (CSV + XLSX) ──

export async function parseFileToRows(file: File): Promise<string[][]> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' })
    return jsonData.map(row => row.map(cell => String(cell ?? '').trim()))
  }

  const text = await file.text()
  const lines = text.trim().split('\n')
  return lines.map(line => parseCsvLine(line))
}

// ── Date Normalization ──

export function normalizeDate(dateVal: string, allowFuture = false): { date: string; error: string } {
  if (!dateVal || !dateVal.trim()) return { date: '', error: 'Empty date' }
  const raw = dateVal.trim()

  // Excel serial number (5 digits like 45678)
  const asNum = Number(raw)
  if (!isNaN(asNum) && asNum > 10000 && asNum < 100000) {
    const excelEpoch = new Date(1899, 11, 30)
    const d = new Date(excelEpoch.getTime() + asNum * 86400000)
    const iso = format(d, 'yyyy-MM-dd')
    if (!allowFuture && iso > new Date().toISOString().split('T')[0]) {
      return { date: '', error: `Future date not allowed "${raw}"` }
    }
    return { date: iso, error: '' }
  }

  let date = ''

  // ISO format
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = raw
  }
  // MM/DD/YYYY
  else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [m, d, y] = raw.split('/')
    date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  } else {
    return { date: '', error: `Invalid date format "${raw}"` }
  }

  // Validate the calendar date
  const [year, month, day] = date.split('-').map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return { date: '', error: `Invalid calendar date "${raw}"` }
  }

  if (!allowFuture && date > new Date().toISOString().split('T')[0]) {
    return { date: '', error: `Future date not allowed "${raw}"` }
  }

  return { date, error: '' }
}

// ── Youth Matching ──

export interface MatchableYouth {
  id: string
  firstName: string
  lastName: string
}

export function matchYouth(nameVal: string, youths: MatchableYouth[]): MatchableYouth | undefined {
  const lower = nameVal.toLowerCase().trim()
  if (!lower) return undefined

  // 1. Try exact full-name match first
  const fullNameMatches = youths.filter(y =>
    `${y.firstName} ${y.lastName}`.toLowerCase() === lower
  )
  if (fullNameMatches.length === 1) return fullNameMatches[0]
  if (fullNameMatches.length > 1) return undefined

  // 2. Fall back to exact firstName or lastName match, only if unambiguous
  const partialMatches = youths.filter(y =>
    y.firstName.toLowerCase() === lower ||
    y.lastName.toLowerCase() === lower
  )
  return partialMatches.length === 1 ? partialMatches[0] : undefined
}

// ── Score Validation ──

export function clampScore(value: number, min: number, max: number): { score: number | null; clamped: boolean } {
  if (isNaN(value)) return { score: null, clamped: false }
  if (value < min || value > max) return { score: Math.max(min, Math.min(max, value)), clamped: true }
  return { score: value, clamped: false }
}

// ── Header Detection ──

export function findColumnIndex(headers: string[], ...patterns: string[]): number {
  return headers.findIndex(h => {
    const lower = h.toLowerCase()
    return patterns.some(p => lower.includes(p))
  })
}

export function detectHeaders(row: string[]): boolean {
  const joined = row.join(' ').toLowerCase()
  return joined.includes('date') || joined.includes('name') || joined.includes('youth') || joined.includes('peer') || joined.includes('point')
}

// ── CSV Template Types ──

export type CsvTemplateType = 'weekly_eval' | 'daily_shift' | 'behavior_points' | 'daily_ratings' | 'daily_ratings_youth'

interface CsvTemplate {
  label: string
  description: string
  headers: string
  sampleRows: string[]
  notes: string[]
}

export const CSV_TEMPLATES: Record<CsvTemplateType, CsvTemplate> = {
  weekly_eval: {
    label: 'Weekly Eval Shift Scores',
    description: 'Weekly evaluation scores for each youth across 4 behavioral domains.',
    headers: 'Youth Name,Date,Peer Interaction,Adult Interaction,Investment Level,Dealing w/Authority',
    sampleRows: [
      'Chance Thaller,2026-01-06,3.3,3.0,2.7,3.3',
      'Dagen Dickey,2026-01-06,3.7,3.5,3.3,3.7',
    ],
    notes: [
      'Youth Name: First name, last name, or full name (case-insensitive)',
      'Date: YYYY-MM-DD or MM/DD/YYYY — will be snapped to the Monday of that week',
      'Scores: 0-4 scale for each domain (decimals allowed)',
      'Rows with all empty scores will be skipped',
    ],
  },
  daily_shift: {
    label: 'Daily Shift Scores',
    description: 'Per-shift scores (Day/Evening/Night) for each youth across 4 behavioral domains.',
    headers: 'Youth Name,Date,Shift,Peer Interaction,Adult Interaction,Investment Level,Dealing w/Authority',
    sampleRows: [
      'Chance Thaller,2026-01-06,Day,3.3,3.0,2.7,3.3',
      'Chance Thaller,2026-01-06,Evening,3.0,2.8,2.5,3.0',
      'Dagen Dickey,2026-01-06,Night,3.7,3.5,3.3,3.7',
    ],
    notes: [
      'Youth Name: First name, last name, or full name (case-insensitive)',
      'Date: YYYY-MM-DD or MM/DD/YYYY',
      'Shift: Day, Evening, or Night',
      'Scores: 0-4 scale for each domain (decimals allowed)',
    ],
  },
  behavior_points: {
    label: 'Behavior Points',
    description: 'Daily behavior point totals for a specific youth.',
    headers: 'Date,Points,Notes',
    sampleRows: [
      '2026-01-15,2100,Good day overall',
      '2026-01-16,1850,Incident in afternoon',
      '2026-01-17,2200,',
    ],
    notes: [
      'Date: YYYY-MM-DD or MM/DD/YYYY (no future dates)',
      'Points: Non-negative integer',
      'Notes: Optional comments for the day',
      'Each row updates the total points for that date',
    ],
  },
  daily_ratings: {
    label: 'Daily Ratings',
    description: 'Daily behavioral ratings across 4 domains for each youth.',
    headers: 'Youth Name,Date,Peer Interaction,Adult Interaction,Investment Level,Deal Authority,Staff,Comments',
    sampleRows: [
      'Chance Thaller,2026-01-15,3,4,2,3,Staff Name,Optional comments here',
      'Dagen Dickey,2026-01-15,4,3,3,4,Staff Name,',
    ],
    notes: [
      'Youth Name: First name, last name, or full name (case-insensitive)',
      'Date: YYYY-MM-DD or MM/DD/YYYY (no future dates)',
      'Scores: 0-4 scale for each domain (integers or decimals)',
      'Staff: Optional staff member name',
      'Comments: Optional notes',
    ],
  },
  daily_ratings_youth: {
    label: 'Daily Ratings (Single Youth)',
    description: 'Daily behavioral ratings for the currently selected youth. No youth name column needed.',
    headers: 'Date,Peer Interaction,Adult Interaction,Investment Level,Deal Authority,Staff,Comments',
    sampleRows: [
      '2026-01-15,3,4,2,3,Staff Name,Optional comments here',
      '2026-01-16,4,3,3,4,Staff Name,',
    ],
    notes: [
      'Date: YYYY-MM-DD or MM/DD/YYYY (no future dates)',
      'Scores: 0-4 scale for each domain (integers or decimals)',
      'Staff: Optional staff member name',
      'Comments: Optional notes',
      'All rows are imported for the currently selected youth',
    ],
  },
}

export function getTemplateCsvString(type: CsvTemplateType): string {
  const t = CSV_TEMPLATES[type]
  return [t.headers, ...t.sampleRows].join('\n')
}

export function downloadCsvTemplate(type: CsvTemplateType): void {
  const csvString = getTemplateCsvString(type)
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${type}_template.csv`
  a.click()
  URL.revokeObjectURL(url)
}
