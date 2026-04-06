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
import { parseIncidentText } from '@/utils/incidentParser'
import type { FacilityIncidentFormData } from '@/types/facility-incident-types'
import { toast } from 'sonner'
import { FileText, Copy, Sparkles } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: Partial<FacilityIncidentFormData>) => void
}

const TEMPLATE_EXAMPLE = `Subject Type: Resident
Last Name: Doe
First Name: John
Incident Date: ${new Date().toISOString().split('T')[0]}
Incident Time: 14:00
Location: Common Room
Incident Type: Physical Altercation
Narrative: Youth began yelling at staff...
Notifications: Home Director, Supervisor
Staff: Staff Jane`

export function SmartImportDialog({ open, onOpenChange, onImport }: Props) {
  const [text, setText] = useState('')

  const handleParse = () => {
    if (!text.trim()) {
      toast.error('Please paste some text first')
      return
    }
    try {
      const result = parseIncidentText(text)
      onImport(result)
      setText('')
      onOpenChange(false)
      toast.success('Incidents parsed successfully!')
    } catch (e) {
      toast.error('Error parsing incident data')
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
            Paste an incident narrative or JSON data below. The system will pre-fill the form for you.
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            className="bg-blue-600 hover:bg-blue-700"
            onClick={handleParse}
            disabled={!text.trim()}
          >
            Run Smart Parser
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
