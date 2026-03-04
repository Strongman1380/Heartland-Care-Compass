import React, { useState, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Upload, Download, FileSpreadsheet, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Copy, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { parseCsvLine, parseFileToRows, CSV_TEMPLATES, getTemplateCsvString, downloadCsvTemplate, type CsvTemplateType } from '@/utils/csvUtils'

// ── Types ──

export interface ParsedRow<T> {
  data: T
  valid: boolean
  errors: string[]
  warnings: string[]
}

export interface ColumnDef {
  key: string
  label: string
  width?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export interface CsvUploaderProps<T> {
  templateType: CsvTemplateType
  title?: string
  description?: string
  parseRows: (rows: string[][]) => ParsedRow<T>[]
  columns: ColumnDef[]
  onImport: (validRows: T[]) => Promise<ImportResult>
  acceptExcel?: boolean
  compact?: boolean
}

// ── Component ──

export function CsvUploader<T>({
  templateType,
  title,
  description,
  parseRows,
  columns,
  onImport,
  acceptExcel = true,
  compact = false,
}: CsvUploaderProps<T>) {
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<ParsedRow<T>[]>([])
  const [importing, setImporting] = useState(false)
  const [copied, setCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const template = CSV_TEMPLATES[templateType]

  const processRows = useCallback((rows: string[][]) => {
    if (rows.length === 0) {
      setPreview([])
      return
    }
    const parsed = parseRows(rows)
    setPreview(parsed)
  }, [parseRows])

  const handleTextChange = useCallback((text: string) => {
    setCsvText(text)
    if (!text.trim()) {
      setPreview([])
      return
    }
    const lines = text.trim().split('\n')
    const rows = lines.map(line => parseCsvLine(line))
    processRows(rows)
  }, [processRows])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const rows = await parseFileToRows(file)
      if (rows.length === 0) {
        toast({ title: 'Empty File', description: 'No data found in file.', variant: 'destructive' })
        return
      }
      // Show the raw text in textarea for CSV files
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        const text = await file.text()
        setCsvText(text.trim())
      } else {
        setCsvText(`[Loaded from ${file.name} — ${rows.length} rows]`)
      }
      processRows(rows)
    } catch {
      toast({ title: 'File Error', description: 'Could not parse the file.', variant: 'destructive' })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [processRows, toast])

  const handleImport = useCallback(async () => {
    const validRows = preview.filter(r => r.valid).map(r => r.data)
    if (validRows.length === 0) return
    setImporting(true)
    try {
      const result = await onImport(validRows)
      const parts = [`Imported ${result.imported} row${result.imported === 1 ? '' : 's'}`]
      if (result.skipped > 0) parts.push(`${result.skipped} skipped`)
      if (result.errors.length > 0) parts.push(`${result.errors.length} error${result.errors.length === 1 ? '' : 's'}`)
      toast({ title: 'Import Complete', description: parts.join('. ') + '.', duration: 5000 })
      if (result.errors.length > 0) {
        console.warn('Import errors:\n' + result.errors.join('\n'))
      }
      setCsvText('')
      setPreview([])
    } catch (err) {
      toast({ title: 'Import Failed', description: String(err), variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }, [preview, onImport, toast])

  const handleCopyTemplate = useCallback(() => {
    navigator.clipboard.writeText(getTemplateCsvString(templateType))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [templateType])

  const validCount = preview.filter(r => r.valid).length
  const warningCount = preview.filter(r => r.warnings.length > 0).length
  const invalidCount = preview.filter(r => !r.valid).length

  const accept = acceptExcel ? '.csv,.txt,.xlsx,.xls' : '.csv,.txt'

  return (
    <div className="space-y-4">
      {/* Template Format */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className={compact ? 'pb-2 pt-3 px-4' : 'pb-3'}>
          <CardTitle className="text-sm font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            Expected CSV Format — {template.label}
          </CardTitle>
          {!compact && (
            <CardDescription className="text-blue-700 dark:text-blue-400 text-xs">
              {template.description} Copy this format or download the template.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className={compact ? 'px-4 pb-3' : 'pt-0'}>
          <div className="bg-white dark:bg-slate-900 rounded-lg p-3 font-mono text-xs text-gray-700 dark:text-slate-300 overflow-auto border">
            <div className="font-bold text-gray-900 dark:text-slate-100">{template.headers}</div>
            {template.sampleRows.map((row, i) => (
              <div key={i} className="text-gray-600 dark:text-slate-400">{row}</div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadCsvTemplate(templateType)}
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Download Template CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTemplate}
              className="text-xs"
            >
              {copied ? <Check className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy Format'}
            </Button>
          </div>
          {!compact && template.notes.length > 0 && (
            <ul className="mt-3 text-xs text-blue-700 dark:text-blue-400 space-y-0.5 list-disc list-inside">
              {template.notes.map((note, i) => <li key={i}>{note}</li>)}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Input Area */}
      <Card>
        <CardHeader className={compact ? 'pb-2 pt-3 px-4' : 'pb-3'}>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Upload className="w-4 h-4 text-gray-500" />
            {title || 'Upload or Paste CSV Data'}
          </CardTitle>
          {description && !compact && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className={compact ? 'px-4 pb-3 space-y-3' : 'pt-0 space-y-3'}>
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Choose File
            </Button>
            <span className="text-xs text-gray-500">
              {acceptExcel ? '.csv, .xlsx, .xls' : '.csv, .txt'} — or paste below
            </span>
          </div>
          <Textarea
            rows={compact ? 4 : 6}
            placeholder={`Paste your CSV data here...\n\n${template.headers}\n${template.sampleRows[0]}`}
            value={csvText}
            onChange={(e) => handleTextChange(e.target.value)}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader className={compact ? 'pb-2 pt-3 px-4' : 'pb-3'}>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Preview
              <span className="text-xs font-normal text-gray-500">
                {validCount} valid
                {warningCount > 0 && <span className="text-amber-600"> · {warningCount} warning{warningCount !== 1 ? 's' : ''}</span>}
                {invalidCount > 0 && <span className="text-red-600"> · {invalidCount} invalid</span>}
                {' '} / {preview.length} total
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className={compact ? 'px-4 pb-3' : 'pt-0'}>
            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-slate-800 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left w-8">#</th>
                    {columns.map(col => (
                      <th key={col.key} className="px-2 py-1.5 text-left" style={col.width ? { width: col.width } : undefined}>
                        {col.label}
                      </th>
                    ))}
                    <th className="px-2 py-1.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      className={
                        !row.valid ? 'bg-red-50 dark:bg-red-900/20' :
                        row.warnings.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20' :
                        'bg-white dark:bg-slate-900'
                      }
                    >
                      <td className="px-2 py-1.5 text-gray-400">{i + 1}</td>
                      {columns.map(col => (
                        <td key={col.key} className="px-2 py-1.5 font-mono">
                          {String((row.data as Record<string, unknown>)?.[col.key] ?? '—')}
                        </td>
                      ))}
                      <td className="px-2 py-1.5">
                        {row.valid && row.warnings.length === 0 && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 inline" />
                        )}
                        {row.valid && row.warnings.length > 0 && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5 inline" />
                            <span className="truncate max-w-[200px]">{row.warnings[0]}</span>
                          </span>
                        )}
                        {!row.valid && (
                          <span className="flex items-center gap-1 text-red-600">
                            <XCircle className="w-3.5 h-3.5 inline" />
                            <span className="truncate max-w-[200px]">{row.errors[0]}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {importing
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Importing...</>
                : `Import ${validCount} Row${validCount === 1 ? '' : 's'}`
              }
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
