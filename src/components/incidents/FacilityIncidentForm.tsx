import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Save, X } from 'lucide-react'
import type {
  FacilityIncidentFormData,
  FacilityIncidentReport,
  FacilityIncidentType,
  InvolvedYouth,
} from '@/types/facility-incident-types'

const INCIDENT_TYPES: FacilityIncidentType[] = [
  'Physical Aggression',
  'Verbal Aggression',
  'Property Destruction',
  'Self-Harm / Self-Injurious Behavior',
  'Elopement / Runaway',
  'Substance Use / Possession',
  'Sexual Misconduct',
  'Theft',
  'Non-Compliance / Refusal',
  'Medical Emergency',
  'Restraint / Seclusion',
  'Suicide Ideation / Attempt',
  'Bullying / Intimidation',
  'Other',
]

interface Props {
  incident?: FacilityIncidentReport
  onSave: (data: FacilityIncidentFormData) => void
  onCancel: () => void
}

export default function FacilityIncidentForm({ incident, onSave, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState('details')

  // Form state
  const [youthName, setYouthName] = useState(incident?.youthName ?? '')
  const [dateOfIncident, setDateOfIncident] = useState(incident?.dateOfIncident ?? '')
  const [timeOfIncident, setTimeOfIncident] = useState(incident?.timeOfIncident ?? '')
  const [staffCompletingReport, setStaffCompletingReport] = useState(incident?.staffCompletingReport ?? '')
  const [location, setLocation] = useState(incident?.location ?? '')
  const [youthInvolved, setYouthInvolved] = useState<InvolvedYouth[]>(
    incident?.youthInvolved ?? [{ name: '', age: '', role: 'primary' }]
  )
  const [incidentTypes, setIncidentTypes] = useState<FacilityIncidentType[]>(incident?.incidentTypes ?? [])
  const [otherIncidentType, setOtherIncidentType] = useState(incident?.otherIncidentType ?? '')
  const [narrativeSummary, setNarrativeSummary] = useState(incident?.narrativeSummary ?? '')
  const [policyViolations, setPolicyViolations] = useState<string[]>(
    incident?.policyViolations?.map(p => p.description) ?? ['']
  )
  const [staffActions, setStaffActions] = useState<string[]>(
    incident?.staffActions?.map(a => a.description) ?? ['']
  )
  const [followUpRecommendations, setFollowUpRecommendations] = useState<string[]>(
    incident?.followUpRecommendations?.map(f => f.description) ?? ['']
  )

  const toggleIncidentType = (type: FacilityIncidentType) => {
    setIncidentTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = () => {
    const data: FacilityIncidentFormData = {
      id: incident?.id,
      youthName,
      dateOfIncident,
      timeOfIncident,
      staffCompletingReport,
      location,
      youthInvolved: youthInvolved.filter(y => y.name.trim() !== ''),
      incidentTypes,
      otherIncidentType: incidentTypes.includes('Other') ? otherIncidentType : undefined,
      narrativeSummary,
      policyViolations: policyViolations.filter(p => p.trim() !== '').map(p => ({ description: p })),
      staffActions: staffActions.filter(a => a.trim() !== '').map(a => ({ description: a })),
      followUpRecommendations: followUpRecommendations.filter(f => f.trim() !== '').map(f => ({ description: f })),
    }
    onSave(data)
  }

  // Dynamic list helpers
  const addYouth = () => setYouthInvolved([...youthInvolved, { name: '', age: '', role: 'primary' }])
  const removeYouth = (i: number) => setYouthInvolved(youthInvolved.filter((_, idx) => idx !== i))
  const updateYouth = (i: number, field: keyof InvolvedYouth, value: string) => {
    const copy = [...youthInvolved]
    copy[i] = { ...copy[i], [field]: value }
    setYouthInvolved(copy)
  }

  const addListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, ''])
  const removeListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number) =>
    setter(prev => prev.filter((_, idx) => idx !== i))
  const updateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, i: number, val: string) =>
    setter(prev => prev.map((item, idx) => (idx === i ? val : item)))

  return (
    <Card>
      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="youth">Youth</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="narrative">Narrative</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Tab 1: Incident Details */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="youthName">Report Title / Youth's Name</Label>
                <Input
                  id="youthName"
                  placeholder="Enter the primary youth's name for the report title"
                  value={youthName}
                  onChange={e => setYouthName(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">This appears in the report header as "INCIDENT REPORT - [NAME]"</p>
              </div>
              <div>
                <Label htmlFor="dateOfIncident">Date of Incident</Label>
                <Input
                  id="dateOfIncident"
                  type="date"
                  value={dateOfIncident}
                  onChange={e => setDateOfIncident(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="timeOfIncident">Time of Incident</Label>
                <Input
                  id="timeOfIncident"
                  type="time"
                  value={timeOfIncident}
                  onChange={e => setTimeOfIncident(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="staffCompletingReport">Staff Completing Report</Label>
                <Input
                  id="staffCompletingReport"
                  placeholder="Full name of reporting staff"
                  value={staffCompletingReport}
                  onChange={e => setStaffCompletingReport(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="e.g., Common Room, Dorm B, Kitchen"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Youth Involved */}
          <TabsContent value="youth" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Youth Involved</Label>
              <Button type="button" variant="outline" size="sm" onClick={addYouth}>
                <Plus className="w-4 h-4 mr-1" /> Add Youth
              </Button>
            </div>
            {youthInvolved.map((y, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_100px_140px_40px] gap-3 items-end p-3 bg-slate-50 rounded-lg">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="Youth's full name"
                    value={y.name}
                    onChange={e => updateYouth(i, 'name', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    placeholder="Age"
                    value={y.age}
                    onChange={e => updateYouth(i, 'age', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select value={y.role} onValueChange={v => updateYouth(i, 'role', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary</SelectItem>
                      <SelectItem value="secondary">Secondary</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="victim">Victim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700 h-10"
                  onClick={() => removeYouth(i)}
                  disabled={youthInvolved.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* Tab 3: Type of Incident */}
          <TabsContent value="type" className="space-y-4">
            <Label className="text-base font-semibold">Type of Incident (select all that apply)</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {INCIDENT_TYPES.map(type => (
                <label
                  key={type}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    incidentTypes.includes(type)
                      ? 'bg-red-50 border-red-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Checkbox
                    checked={incidentTypes.includes(type)}
                    onCheckedChange={() => toggleIncidentType(type)}
                  />
                  <span className="text-sm">{type}</span>
                </label>
              ))}
            </div>
            {incidentTypes.includes('Other') && (
              <div className="mt-3">
                <Label htmlFor="otherType">Please specify other incident type</Label>
                <Input
                  id="otherType"
                  placeholder="Describe the incident type"
                  value={otherIncidentType}
                  onChange={e => setOtherIncidentType(e.target.value)}
                />
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Narrative Summary */}
          <TabsContent value="narrative" className="space-y-4">
            <div>
              <Label htmlFor="narrative" className="text-base font-semibold">
                Narrative Summary
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Provide a detailed, chronological description of the event. Include who was involved,
                what happened, when it happened, and any relevant context.
              </p>
              <Textarea
                id="narrative"
                rows={12}
                placeholder="On [date] at approximately [time], [youth name] was observed..."
                value={narrativeSummary}
                onChange={e => setNarrativeSummary(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </TabsContent>

          {/* Tab 5: Policy Violations */}
          <TabsContent value="violations" className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <Label className="text-base font-semibold">Policy Violations</Label>
                <p className="text-xs text-slate-500">List specific rules or policies violated.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setPolicyViolations)}>
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            {policyViolations.map((v, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-sm font-mono text-slate-400 min-w-[24px]">{i + 1}.</span>
                <Input
                  placeholder="Describe the policy violation"
                  value={v}
                  onChange={e => updateListItem(setPolicyViolations, i, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeListItem(setPolicyViolations, i)}
                  disabled={policyViolations.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </TabsContent>

          {/* Tab 6: Staff Actions & Follow-Up */}
          <TabsContent value="actions" className="space-y-6">
            {/* Staff Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-base font-semibold">Staff Action Taken</Label>
                  <p className="text-xs text-slate-500">List immediate actions and interventions by staff.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setStaffActions)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {staffActions.map((a, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <span className="text-sm font-mono text-slate-400 min-w-[24px]">{i + 1}.</span>
                  <Input
                    placeholder="Describe the action taken"
                    value={a}
                    onChange={e => updateListItem(setStaffActions, i, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeListItem(setStaffActions, i)}
                    disabled={staffActions.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-base font-semibold">Follow-Up / Recommendations</Label>
                  <p className="text-xs text-slate-500">Planned follow-up steps, review status, and recommendations.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => addListItem(setFollowUpRecommendations)}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
              {followUpRecommendations.map((f, i) => (
                <div key={i} className="flex gap-2 items-center mb-2">
                  <span className="text-sm font-mono text-slate-400 min-w-[24px]">{i + 1}.</span>
                  <Input
                    placeholder="Describe the follow-up or recommendation"
                    value={f}
                    onChange={e => updateListItem(setFollowUpRecommendations, i, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeListItem(setFollowUpRecommendations, i)}
                    disabled={followUpRecommendations.length <= 1}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-8 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 hover:bg-red-700"
            onClick={handleSubmit}
          >
            <Save className="w-4 h-4 mr-2" />
            {incident ? 'Update Report' : 'Save Report'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
