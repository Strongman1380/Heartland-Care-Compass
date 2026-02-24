import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Eye, Edit, Trash2, AlertTriangle, Loader2,
  FileDown, Printer, ArrowLeft,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { incidentReportsService } from '@/integrations/firebase/incidentReportsService'
import FacilityIncidentForm from '@/components/incidents/FacilityIncidentForm'
import FacilityIncidentPrintView from '@/components/incidents/FacilityIncidentPrintView'
import { exportElementToPDF } from '@/utils/export'
import type { FacilityIncidentReport, FacilityIncidentFormData } from '@/types/facility-incident-types'
import { Header } from '@/components/layout/Header'

type ViewMode = 'list' | 'form' | 'view'

export default function IncidentReports() {
  const [incidents, setIncidents] = useState<FacilityIncidentReport[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedIncident, setSelectedIncident] = useState<FacilityIncidentReport | null>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  const loadIncidents = useCallback(async () => {
    try {
      const data = await incidentReportsService.list()
      setIncidents(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error loading incidents:', error)
      toast.error('Failed to load incident reports')
      setIncidents([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  const handleSave = useCallback(async (data: FacilityIncidentFormData) => {
    try {
      setIsSaving(true)
      await incidentReportsService.save(data)
      toast.success('Incident report saved successfully')
      await loadIncidents()
      setViewMode('list')
      setSelectedIncident(null)
    } catch (error) {
      console.error('Error saving incident:', error)
      toast.error('Failed to save incident report')
    } finally {
      setIsSaving(false)
    }
  }, [loadIncidents])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident report?')) return
    try {
      await incidentReportsService.delete(id)
      toast.success('Incident report deleted')
      await loadIncidents()
      if (selectedIncident?.id === id) {
        setViewMode('list')
        setSelectedIncident(null)
      }
    } catch (error) {
      console.error('Error deleting incident:', error)
      toast.error('Failed to delete incident report')
    }
  }, [loadIncidents, selectedIncident])

  const handleExportPDF = useCallback(async () => {
    if (!printRef.current || !selectedIncident) return
    try {
      setIsExporting(true)
      const filename = `Incident-Report-${selectedIncident.id}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      await exportElementToPDF(printRef.current, filename)
      toast.success('PDF exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export PDF')
    } finally {
      setIsExporting(false)
    }
  }, [selectedIncident])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const goBack = () => {
    setViewMode('list')
    setSelectedIncident(null)
  }

  // Form view
  if (viewMode === 'form') {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-24 lg:pb-6 max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              {selectedIncident ? 'Edit' : 'New'} Incident Report
            </h1>
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>
          <FacilityIncidentForm
            incident={selectedIncident ?? undefined}
            onSave={handleSave}
            onCancel={goBack}
          />
        </main>
      </div>
    )
  }

  // Detail / print view
  if (viewMode === 'view' && selectedIncident) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="container mx-auto px-4 py-6 pb-24 lg:pb-6 max-w-5xl">
          <div className="flex items-center justify-between mb-6 print:hidden">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
              Incident Report: {selectedIncident.id}
            </h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setViewMode('form')
                }}
              >
                <Edit className="w-4 h-4 mr-2" /> Edit
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(selectedIncident.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </div>
          </div>

          {/* Print-ready view */}
          <div className="bg-white rounded-lg shadow-sm border print:shadow-none print:border-none">
            <FacilityIncidentPrintView ref={printRef} report={selectedIncident} />
          </div>
        </main>
      </div>
    )
  }

  // List view
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Incident Reports
          </h1>
          <Button
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              setSelectedIncident(null)
              setViewMode('form')
            }}
          >
            <Plus className="w-4 h-4 mr-2" /> New Incident Report
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-600">Loading incident reports...</span>
          </div>
        ) : incidents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <AlertTriangle className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500 mb-1">No incident reports yet.</p>
              <p className="text-xs text-slate-400">
                Click "New Incident Report" to create your first report.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white border rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-slate-700">
                All Reports ({incidents.length})
              </h2>
            </div>
            <div className="divide-y">
              {incidents.map(inc => (
                <div key={inc.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-medium text-slate-600">
                          {inc.id}
                        </span>
                        {inc.incidentTypes?.slice(0, 2).map((t, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {t}
                          </Badge>
                        ))}
                        {(inc.incidentTypes?.length ?? 0) > 2 && (
                          <Badge variant="outline" className="text-xs text-slate-400">
                            +{inc.incidentTypes!.length - 2} more
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium text-slate-800">
                        {inc.youthName || 'Unnamed Report'}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        {inc.dateOfIncident && (
                          <span>{format(new Date(inc.dateOfIncident + 'T00:00:00'), 'MMM d, yyyy')}</span>
                        )}
                        {inc.timeOfIncident && <span>{inc.timeOfIncident}</span>}
                        {inc.location && <span>&bull; {inc.location}</span>}
                        {inc.staffCompletingReport && (
                          <span>&bull; Staff: {inc.staffCompletingReport}</span>
                        )}
                      </div>
                      {inc.narrativeSummary && (
                        <p className="text-xs text-slate-500 line-clamp-2 max-w-2xl">
                          {inc.narrativeSummary}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIncident(inc)
                          setViewMode('view')
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedIncident(inc)
                          setViewMode('form')
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(inc.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
