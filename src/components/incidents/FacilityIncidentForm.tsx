import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Plus, Trash2, Save, X } from 'lucide-react'
import type {
  FacilityIncidentFormData,
  FacilityIncidentReport,
  FacilityIncidentType,
  SubjectType,
  NotificationType,
  DocumentationType,
  InvolvedYouth,
  Witness,
} from '@/types/facility-incident-types'
import { useYouth } from '@/hooks/useSupabase'

const INCIDENT_TYPES: FacilityIncidentType[] = [
  'Theft',
  'Trespasser',
  'Property Damage',
  'Injury',
  'Fighting',
  'Medication Refusal',
  'Physical Altercation',
  'Fire/Alarm',
  'Runaway',
  'Arrest',
  'Other',
]

const NOTIFICATION_TYPES: NotificationType[] = [
  'Home Director',
  'Business Manager',
  'Supervisor',
  'Case Worker',
  'Physician',
  'Service Coordinator',
  'Psychiatrist',
  'Family',
  'Probation Officer',
  'Sheriff',
  'Other',
]

const DOCUMENTATION_TYPES: DocumentationType[] = [
  'Photographs',
  'Physical Inspection',
  'Property Inspection',
  'Statement of Witness',
  'Property Damage Report',
  'Police Report',
  'Missing Person Report',
  'Other',
]

interface Props {
  incident?: FacilityIncidentReport
  onSave: (data: FacilityIncidentFormData) => void
  onCancel: () => void
}

export default function FacilityIncidentForm({ incident, onSave, onCancel }: Props) {
  const [activeTab, setActiveTab] = useState('details')
  const { youths, loadYouths } = useYouth()

  // Subject info
  const [subjectType, setSubjectType] = useState<SubjectType>(incident?.subjectType ?? 'Resident')
  const [lastName, setLastName] = useState(incident?.lastName ?? '')
  const [firstName, setFirstName] = useState(incident?.firstName ?? '')
  const [initial, setInitial] = useState(incident?.initial ?? '')

  // Incident details
  const [incidentDescription, setIncidentDescription] = useState(incident?.incidentDescription ?? '')
  const [dateOfIncident, setDateOfIncident] = useState(incident?.dateOfIncident ?? '')
  const [timeOfIncident, setTimeOfIncident] = useState(incident?.timeOfIncident ?? '')
  const [reportDate, setReportDate] = useState(incident?.reportDate ?? '')
  const [reportTime, setReportTime] = useState(incident?.reportTime ?? '')
  const [staffCompletingReport, setStaffCompletingReport] = useState(incident?.staffCompletingReport ?? '')
  const [location, setLocation] = useState(incident?.location ?? '')

  // Youth involved
  const [youthInvolved, setYouthInvolved] = useState<InvolvedYouth[]>(
    incident?.youthInvolved ?? [{ name: '', age: '', role: 'primary' }]
  )
  const [selectedRosterYouthId, setSelectedRosterYouthId] = useState('')
  const [selectedRosterRole, setSelectedRosterRole] = useState<InvolvedYouth['role']>('secondary')

  // Incident types
  const [incidentTypes, setIncidentTypes] = useState<FacilityIncidentType[]>(incident?.incidentTypes ?? [])
  const [otherIncidentType, setOtherIncidentType] = useState(incident?.otherIncidentType ?? '')

  // Narrative
  const [narrativeSummary, setNarrativeSummary] = useState(incident?.narrativeSummary ?? '')

  // Witnesses
  const [witnesses, setWitnesses] = useState<Witness[]>(
    incident?.witnesses ?? [{ name: '', address: '', cityState: '', phone: '' }]
  )

  // Notifications
  const [notifications, setNotifications] = useState<NotificationType[]>(incident?.notifications ?? [])
  const [otherNotification, setOtherNotification] = useState(incident?.otherNotification ?? '')

  // Supplementary
  const [supplementaryInfo, setSupplementaryInfo] = useState(incident?.supplementaryInfo ?? '')

  // Subject address (non-resident)
  const [subjectAddress, setSubjectAddress] = useState(incident?.subjectAddress ?? '')
  const [subjectPhone, setSubjectPhone] = useState(incident?.subjectPhone ?? '')

  // Documentation
  const [documentation, setDocumentation] = useState<DocumentationType[]>(incident?.documentation ?? [])
  const [otherDocumentation, setOtherDocumentation] = useState(incident?.otherDocumentation ?? '')

  // Policy violations / Staff actions / Follow-up
  const [policyViolations, setPolicyViolations] = useState<string[]>(
    incident?.policyViolations?.map(p => p.description) ?? ['']
  )
  const [staffActions, setStaffActions] = useState<string[]>(
    incident?.staffActions?.map(a => a.description) ?? ['']
  )
  const [followUpRecommendations, setFollowUpRecommendations] = useState<string[]>(
    incident?.followUpRecommendations?.map(f => f.description) ?? ['']
  )

  // Signatures
  const [submittedBy, setSubmittedBy] = useState(incident?.submittedBy ?? '')
  const [reviewedBy, setReviewedBy] = useState(incident?.reviewedBy ?? '')
  const [signatureDate, setSignatureDate] = useState(incident?.signatureDate ?? '')

  const sortedYouths = [...youths].sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName)
    if (lastNameCompare !== 0) return lastNameCompare
    return a.firstName.localeCompare(b.firstName)
  })

  useEffect(() => {
    loadYouths()
  }, [])

  const toggleIncidentType = (type: FacilityIncidentType) => {
    setIncidentTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleNotification = (type: NotificationType) => {
    setNotifications(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const toggleDocumentation = (type: DocumentationType) => {
    setDocumentation(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const handleSubmit = () => {
    const youthName = `${lastName}, ${firstName}${initial ? ' ' + initial : ''}`.trim()
    const data: FacilityIncidentFormData = {
      id: incident?.id,
      subjectType,
      lastName,
      firstName,
      initial,
      youthName,
      incidentDescription,
      dateOfIncident,
      timeOfIncident,
      reportDate,
      reportTime,
      staffCompletingReport,
      location,
      youthInvolved: youthInvolved.filter(y => y.name.trim() !== ''),
      incidentTypes,
      otherIncidentType: incidentTypes.includes('Other') ? otherIncidentType : undefined,
      narrativeSummary,
      witnesses: witnesses.filter(w => w.name.trim() !== ''),
      notifications,
      otherNotification: notifications.includes('Other') ? otherNotification : undefined,
      supplementaryInfo,
      subjectAddress,
      subjectPhone,
      documentation,
      otherDocumentation: documentation.includes('Other') ? otherDocumentation : undefined,
      policyViolations: policyViolations.filter(p => p.trim() !== '').map(p => ({ description: p })),
      staffActions: staffActions.filter(a => a.trim() !== '').map(a => ({ description: a })),
      followUpRecommendations: followUpRecommendations.filter(f => f.trim() !== '').map(f => ({ description: f })),
      submittedBy,
      reviewedBy,
      signatureDate,
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

  const addYouthFromRoster = () => {
    if (!selectedRosterYouthId) return
    const youth = youths.find(y => y.id === selectedRosterYouthId)
    if (!youth) return

    const displayName = `${youth.firstName} ${youth.lastName}`.trim()
    if (youthInvolved.some(y => y.name.toLowerCase() === displayName.toLowerCase())) {
      setSelectedRosterYouthId('')
      return
    }

    const nextYouth = {
      name: displayName,
      age: youth.age ? String(youth.age) : '',
      role: selectedRosterRole,
    } as InvolvedYouth

    setYouthInvolved(prev => {
      const hasPlaceholder = prev.length === 1 && !prev[0].name.trim()
      if (hasPlaceholder) return [nextYouth]
      return [...prev, nextYouth]
    })

    if (!lastName.trim() && !firstName.trim()) {
      setLastName(youth.lastName)
      setFirstName(youth.firstName)
    }
    setSelectedRosterYouthId('')
  }

  const addWitness = () => setWitnesses([...witnesses, { name: '', address: '', cityState: '', phone: '' }])
  const removeWitness = (i: number) => setWitnesses(witnesses.filter((_, idx) => idx !== i))
  const updateWitness = (i: number, field: keyof Witness, value: string) => {
    const copy = [...witnesses]
    copy[i] = { ...copy[i], [field]: value }
    setWitnesses(copy)
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
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7 mb-6">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="youth">Youth</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="narrative">Narrative</TabsTrigger>
            <TabsTrigger value="witnesses">Witnesses</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Tab 1: Incident Details */}
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-semibold mb-2 block">Subject Type</Label>
                <RadioGroup
                  value={subjectType}
                  onValueChange={(v) => setSubjectType(v as SubjectType)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Resident" id="resident" />
                    <Label htmlFor="resident" className="font-bold">Resident</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Non-Resident" id="non-resident" />
                    <Label htmlFor="non-resident">Non-Resident</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Employee" id="employee" />
                    <Label htmlFor="employee">Employee</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Last name"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="First name"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="initial">Initial</Label>
                  <Input
                    id="initial"
                    placeholder="MI"
                    value={initial}
                    onChange={e => setInitial(e.target.value)}
                    maxLength={1}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="incidentDescription">Incident Description</Label>
                <Input
                  id="incidentDescription"
                  placeholder='e.g., "Confiscated Vape"'
                  value={incidentDescription}
                  onChange={e => setIncidentDescription(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">Brief description shown in the report header</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dateOfIncident">Incident Date</Label>
                  <Input
                    id="dateOfIncident"
                    type="date"
                    value={dateOfIncident}
                    onChange={e => setDateOfIncident(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="timeOfIncident">Incident Time</Label>
                  <Input
                    id="timeOfIncident"
                    type="time"
                    value={timeOfIncident}
                    onChange={e => setTimeOfIncident(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reportDate">Report Date</Label>
                  <Input
                    id="reportDate"
                    type="date"
                    value={reportDate}
                    onChange={e => setReportDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reportTime">Report Time</Label>
                  <Input
                    id="reportTime"
                    type="time"
                    value={reportTime}
                    onChange={e => setReportTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
          </TabsContent>

          {/* Tab 2: Youth Involved */}
          <TabsContent value="youth" className="space-y-4">
            <Card className="border-dashed">
              <CardContent className="pt-4">
                <Label className="text-sm font-semibold mb-2 block">Add Youth from Roster</Label>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_140px] gap-3 items-end">
                  <div>
                    <Label>Select Youth</Label>
                    <Select value={selectedRosterYouthId} onValueChange={setSelectedRosterYouthId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose youth from active roster" />
                      </SelectTrigger>
                      <SelectContent>
                        {sortedYouths.length === 0 && (
                          <SelectItem value="__no_youths__" disabled>
                            No youth profiles available
                          </SelectItem>
                        )}
                        {sortedYouths.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.lastName}, {y.firstName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Role</Label>
                    <Select value={selectedRosterRole} onValueChange={(v) => setSelectedRosterRole(v as InvolvedYouth['role'])}>
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
                  <Button type="button" variant="outline" onClick={addYouthFromRoster} disabled={!selectedRosterYouthId}>
                    Add Youth
                  </Button>
                </div>
              </CardContent>
            </Card>

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
                Incident Narrative
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Provide a detailed, chronological description of the event.
              </p>
              <Textarea
                id="narrative"
                rows={12}
                placeholder="Describe the incident in detail..."
                value={narrativeSummary}
                onChange={e => setNarrativeSummary(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </TabsContent>

          {/* Tab 5: Witnesses & Notifications */}
          <TabsContent value="witnesses" className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-base font-semibold">Witnesses</Label>
                <Button type="button" variant="outline" size="sm" onClick={addWitness}>
                  <Plus className="w-4 h-4 mr-1" /> Add Witness
                </Button>
              </div>
              {witnesses.map((w, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg mb-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_40px] gap-3 items-end">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <Label>Name</Label>
                        <Input
                          placeholder="Full name"
                          value={w.name}
                          onChange={e => updateWitness(i, 'name', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Address</Label>
                        <Input
                          placeholder="Street address"
                          value={w.address}
                          onChange={e => updateWitness(i, 'address', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>City, State</Label>
                        <Input
                          placeholder="City, ST"
                          value={w.cityState}
                          onChange={e => updateWitness(i, 'cityState', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          placeholder="(000) 000-0000"
                          value={w.phone}
                          onChange={e => updateWitness(i, 'phone', e.target.value)}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 h-10"
                      onClick={() => removeWitness(i)}
                      disabled={witnesses.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-2 block">Subject Address &amp; Phone (if non-resident)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subjectAddress">Address</Label>
                  <Input
                    id="subjectAddress"
                    placeholder="Full address"
                    value={subjectAddress}
                    onChange={e => setSubjectAddress(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subjectPhone">Phone</Label>
                  <Input
                    id="subjectPhone"
                    placeholder="(000) 000-0000"
                    value={subjectPhone}
                    onChange={e => setSubjectPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Notifications & Documentation */}
          <TabsContent value="notifications" className="space-y-6">
            <div>
              <Label className="text-base font-semibold mb-3 block">Notifications (select all that apply)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {NOTIFICATION_TYPES.map(type => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      notifications.includes(type)
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={notifications.includes(type)}
                      onCheckedChange={() => toggleNotification(type)}
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
              {notifications.includes('Other') && (
                <div className="mt-3">
                  <Label>Specify other notification</Label>
                  <Input
                    placeholder="Other notification recipient"
                    value={otherNotification}
                    onChange={e => setOtherNotification(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-2 block">Supplementary Information</Label>
              <Textarea
                rows={4}
                placeholder="Any additional information..."
                value={supplementaryInfo}
                onChange={e => setSupplementaryInfo(e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Documentation (select all that apply)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {DOCUMENTATION_TYPES.map(type => (
                  <label
                    key={type}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      documentation.includes(type)
                        ? 'bg-green-50 border-green-300'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Checkbox
                      checked={documentation.includes(type)}
                      onCheckedChange={() => toggleDocumentation(type)}
                    />
                    <span className="text-sm">{type}</span>
                  </label>
                ))}
              </div>
              {documentation.includes('Other') && (
                <div className="mt-3">
                  <Label>Specify other documentation</Label>
                  <Input
                    placeholder="Other documentation type"
                    value={otherDocumentation}
                    onChange={e => setOtherDocumentation(e.target.value)}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 7: Actions & Signatures */}
          <TabsContent value="actions" className="space-y-6">
            {/* Policy Violations */}
            <div>
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
                <div key={i} className="flex gap-2 items-center mb-2">
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
            </div>

            {/* Staff Actions */}
            <div className="border-t pt-4">
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

            {/* Follow-Up */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Label className="text-base font-semibold">Follow-Up / Recommendations</Label>
                  <p className="text-xs text-slate-500">Planned follow-up steps and recommendations.</p>
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

            {/* Signatures */}
            <div className="border-t pt-4">
              <Label className="text-base font-semibold mb-3 block">Signatures</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="submittedBy">Submitted By</Label>
                  <Input
                    id="submittedBy"
                    placeholder="Name of person submitting"
                    value={submittedBy}
                    onChange={e => setSubmittedBy(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="reviewedBy">Reviewed By</Label>
                  <Input
                    id="reviewedBy"
                    placeholder="Name of reviewer"
                    value={reviewedBy}
                    onChange={e => setReviewedBy(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="signatureDate">Date</Label>
                  <Input
                    id="signatureDate"
                    type="date"
                    value={signatureDate}
                    onChange={e => setSignatureDate(e.target.value)}
                  />
                </div>
              </div>
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
