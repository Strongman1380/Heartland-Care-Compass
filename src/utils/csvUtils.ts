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

function normalizeNameForMatch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenizeName(value: string): string[] {
  return normalizeNameForMatch(value).split(' ').filter(Boolean)
}

export function matchYouth(nameVal: string, youths: MatchableYouth[]): MatchableYouth | undefined {
  const normalizedInput = normalizeNameForMatch(nameVal)
  const inputTokens = tokenizeName(nameVal)
  if (!normalizedInput) return undefined

  const candidateNames = youths.map((youth) => {
    const first = (youth.firstName || '').trim()
    const last = (youth.lastName || '').trim()
    const full = `${first} ${last}`.trim()
    const reversed = `${last} ${first}`.trim()

    return {
      youth,
      first: normalizeNameForMatch(first),
      last: normalizeNameForMatch(last),
      full: normalizeNameForMatch(full),
      reversed: normalizeNameForMatch(reversed),
      tokens: tokenizeName(full),
    }
  })

  // 1. Exact full-name or reversed-name match.
  const exactMatches = candidateNames.filter(({ full, reversed }) => (
    full === normalizedInput || reversed === normalizedInput
  ))
  if (exactMatches.length > 0) return exactMatches[0].youth

  // 2. Exact first-name or last-name match.
  const partialMatches = candidateNames.filter(({ first, last }) => (
    first === normalizedInput || last === normalizedInput
  ))
  if (partialMatches.length === 1) return partialMatches[0].youth
  if (partialMatches.length > 1) {
    console.warn(`Ambiguous match for "${nameVal}"`)
    return undefined
  }

  // 3. Same name tokens in a different order, e.g. "Thaller Chance".
  const tokenSetMatches = candidateNames.filter(({ tokens }) => {
    if (tokens.length !== inputTokens.length || tokens.length === 0) return false
    const sortedCandidate = [...tokens].sort().join(' ')
    const sortedInput = [...inputTokens].sort().join(' ')
    return sortedCandidate === sortedInput
  })
  if (tokenSetMatches.length === 1) return tokenSetMatches[0].youth
  if (tokenSetMatches.length > 1) {
    console.warn(`Ambiguous match for "${nameVal}"`)
    return undefined
  }

  // 4. Fallback to substring matching against both full-name orders.
  const subMatches = candidateNames.filter(({ full, reversed }) => (
    full.includes(normalizedInput) || reversed.includes(normalizedInput)
  ))
  if (subMatches.length === 1) return subMatches[0].youth
  if (subMatches.length > 1) {
    console.warn(`Ambiguous match for "${nameVal}"`)
    return undefined
  }

  return undefined
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

export type CsvTemplateType = 'weekly_eval' | 'daily_shift' | 'behavior_points' | 'daily_ratings' | 'daily_ratings_youth' | 'referral_upload' | 'bulk_case_notes'

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
    description: 'Daily behavior point totals for each youth.',
    headers: 'Youth Name,Date,Points,Notes',
    sampleRows: [
      'Chance Thaller,2026-01-15,58000,',
      'Dagen Dickey,2026-01-15,195000,L6',
      'Chance Thaller,2026-01-16,,RI',
      'Dagen Dickey,2026-01-16,,Pass',
    ],
    notes: [
      'Youth Name: First name, last name, or full name (case-insensitive)',
      'Date: YYYY-MM-DD or MM/DD/YYYY',
      'Points: Daily total point count (leave empty if no card was earned)',
      'Notes: Optional status or comments (e.g. RI, RII, SS, Pass, No Card, L1, L2 Pass)',
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
  referral_upload: {
    label: 'Referral Upload',
    description: 'Bulk upload referrals with name, source, date, status, and priority.',
    headers: 'Referral Name,Referral Source,Referral Date,Staff Name,Status,Priority,Summary',
    sampleRows: [
      'John Doe,Juvenile Court,2026-02-15,Jane Smith,pending,high,Court-ordered placement referral',
      'Mike Jones,DCS,2026-02-16,Bob Wilson,screening,medium,DCS referral for placement',
    ],
    notes: [
      'Referral Name: Full name of the referred youth (required)',
      'Referral Source: Where the referral came from (e.g. Juvenile Court, DCS, PO)',
      'Referral Date: YYYY-MM-DD or MM/DD/YYYY',
      'Staff Name: Staff member handling the referral',
      'Status: pending, screening, interviewed, accepted, denied, waitlisted',
      'Priority: low, medium, high, urgent',
      'Summary: Brief description of the referral',
    ],
  },
  bulk_case_notes: {
    label: 'Bulk Case Notes',
    description: 'Upload case notes for multiple youth at once.',
    headers: 'Youth Name,Date,Summary,Note,Staff',
    sampleRows: [
      'Chance Thaller,2026-02-15,Weekly check-in,Youth discussed goals and progress,Jane Smith',
      'Dagen Dickey,2026-02-15,Behavioral review,Reviewed recent incidents and coping strategies,Bob Wilson',
    ],
    notes: [
      'Youth Name: First name, last name, or full name (case-insensitive)',
      'Date: YYYY-MM-DD or MM/DD/YYYY',
      'Summary: Brief summary/title of the note',
      'Note: Full case note content',
      'Staff: Staff member who created the note',
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
