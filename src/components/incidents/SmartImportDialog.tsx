import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { parseIncidentText, parseBulkIncidents } from '@/utils/incidentParser'
import type { FacilityIncidentFormData } from '@/types/facility-incident-types'
import { toast } from 'sonner'
import { FileText, Copy, Sparkles, Layers, CheckCircle2, Loader2 } from 'lucide-react'
import { incidentReportsService } from '@/integrations/firebase/incidentReportsService'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: Partial<FacilityIncidentFormData>) => void
  onBulkImportSuccess?: () => void
}

const TEMPLATE_EXAMPLE = `Subject Type: Resident
Last Name: Doe
First Name: John
Incident Date: ${new Date().toISOString().split('T')[0]}
Incident Type: Verbal Altercation
Incident Narrative: First incident details...
---
Subject Type: Resident
Last Name: Smith
First Name: Jane
Incident Date: ${new Date().toISOString().split('T')[0]}
Incident Type: Rule Violation
Incident Narrative: Second incident details...`

export function SmartImportDialog({ open, onOpenChange, onImport, onBulkImportSuccess }: Props) {
  const [text, setText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  
  const parsedCount = text.trim() ? parseBulkIncidents(text).length : 0

  const handleSingleParse = async () => {
    if (!text.trim()) {
      toast.error('Please paste some text first')
      return
    }
    try {
      const result = parseIncidentText(text)
      setIsImporting(true)
      const saved = await incidentReportsService.save(result as FacilityIncidentFormData)
      onImport(saved)
      onBulkImportSuccess?.()
      setText('')
      onOpenChange(false)
      toast.success('Incident imported successfully!')
    } catch (e) {
      console.error(e)
      toast.error('Error importing incident data')
    } finally {
      setIsImporting(false)
    }
  }

  const handleBulkImport = async () => {
    if (!text.trim()) return
    try {
      setIsImporting(true)
      const reports = parseBulkIncidents(text)
      if (reports.length === 0) {
        toast.error('No incidents found in the text')
        return
      }
      
      await incidentReportsService.saveBulk(reports as FacilityIncidentFormData[])
      toast.success(`Successfully imported ${reports.length} incidents!`)
      
      onBulkImportSuccess?.()
      
      setText('')
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error('Error during bulk import')
    } finally {
      setIsImporting(false)
    }
  }

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(TEMPLATE_EXAMPLE)
    toast.success('Template copied to clipboard')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Smart Import Report
          </DialogTitle>
          <DialogDescription>
            Paste an incident narrative or JSON data below. The system will save a draft to Firebase and open it for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea 
            placeholder="Paste text here... (Example: 'Last Name: Miller, Incident Date: 2023-11-20...')"
            className="min-h-[300px] font-mono text-sm p-3 border-2 focus-visible:ring-blue-500"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <FileText className="w-4 h-4" />
              <span>Need a format template?</span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 bg-white"
              onClick={handleCopyTemplate}
            >
              <Copy className="w-3 h-3 mr-2" />
              Copy Template
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex-1 text-sm text-slate-500 self-center">
            {parsedCount > 1 && (
              <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                <Layers className="w-4 h-4" />
                Detected {parsedCount} reports
              </span>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>Cancel</Button>
          
          {parsedCount > 1 ? (
            <Button 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={handleBulkImport}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Save {parsedCount} Reports to Database
            </Button>
          ) : (
              <Button 
                className="bg-blue-600 hover:bg-blue-700"
                onClick={handleSingleParse}
                disabled={!text.trim() || isImporting}
              >
              {isImporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Import Single Report to Firebase
              </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
