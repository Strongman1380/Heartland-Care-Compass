/**
 * School Incident Report Form Component
 * Comprehensive structured form for documenting school incidents
 */

import React, { useState } from 'react';
import { SchoolIncidentFormData, InvolvedResident, Witness, TimelineEntry, StaffSignature } from '@/types/school-incident-types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  X, 
  Clock, 
  User, 
  MapPin, 
  AlertTriangle,
  FileText,
  Users,
  CheckCircle2,
  Save
} from 'lucide-react';
import { format } from 'date-fns';

interface SchoolIncidentFormProps {
  incident?: SchoolIncidentFormData;
  onSave: (data: SchoolIncidentFormData) => void;
  onCancel: () => void;
}

export default function SchoolIncidentForm({ incident, onSave, onCancel }: SchoolIncidentFormProps) {
  const [currentTab, setCurrentTab] = useState('basic');
  
  // Basic Information
  const [dateTime, setDateTime] = useState(incident?.date_time || new Date().toISOString());
  const [reportedByStaffId, setReportedByStaffId] = useState(incident?.reported_by?.staff_id || '');
  const [reportedByName, setReportedByName] = useState(incident?.reported_by?.name || '');
  const [reportedByRole, setReportedByRole] = useState(incident?.reported_by?.role || '');
  const [location, setLocation] = useState(incident?.location || '');
  const [incidentType, setIncidentType] = useState(incident?.incident_type || 'Disruption');
  const [severity, setSeverity] = useState(incident?.severity || 'Medium');
  
  // People Involved
  const [involvedResidents, setInvolvedResidents] = useState<InvolvedResident[]>(
    incident?.involved_residents || []
  );
  const [witnesses, setWitnesses] = useState<Witness[]>(incident?.witnesses || []);
  
  // Incident Details
  const [summary, setSummary] = useState(incident?.summary || '');
  const [timeline, setTimeline] = useState<TimelineEntry[]>(incident?.timeline || []);
  const [actionsTaken, setActionsTaken] = useState(incident?.actions_taken || '');
  
  // Medical & Safety
  const [medicalNeeded, setMedicalNeeded] = useState(incident?.medical_needed || false);
  const [medicalDetails, setMedicalDetails] = useState(incident?.medical_details || '');
  
  // Signatures
  const [staffSignatures, setStaffSignatures] = useState<StaffSignature[]>(
    incident?.staff_signatures || []
  );
  
  // Follow-up
  const [followUpAssignedTo, setFollowUpAssignedTo] = useState(incident?.follow_up?.assigned_to || '');
  const [followUpDueDate, setFollowUpDueDate] = useState(incident?.follow_up?.due_date || '');
  const [followUpNotes, setFollowUpNotes] = useState(incident?.follow_up?.follow_up_notes || '');
  
  // Confidential Notes
  const [confidentialNotes, setConfidentialNotes] = useState(incident?.confidential_notes || '');

  // Handlers for Involved Residents
  const addInvolvedResident = () => {
    setInvolvedResidents([...involvedResidents, { resident_id: '', name: '', role_in_incident: 'bystander' }]);
  };

  const removeInvolvedResident = (index: number) => {
    setInvolvedResidents(involvedResidents.filter((_, i) => i !== index));
  };

  const updateInvolvedResident = (index: number, field: keyof InvolvedResident, value: string) => {
    const updated = [...involvedResidents];
    updated[index] = { ...updated[index], [field]: value };
    setInvolvedResidents(updated);
  };

  // Handlers for Witnesses
  const addWitness = () => {
    setWitnesses([...witnesses, { name: '', role: 'peer' }]);
  };

  const removeWitness = (index: number) => {
    setWitnesses(witnesses.filter((_, i) => i !== index));
  };

  const updateWitness = (index: number, field: keyof Witness, value: string) => {
    const updated = [...witnesses];
    updated[index] = { ...updated[index], [field]: value };
    setWitnesses(updated);
  };

  // Handlers for Timeline
  const addTimelineEntry = () => {
    const now = new Date();
    const timeStr = format(now, 'HH:mm');
    setTimeline([...timeline, { time: timeStr, entry: '' }]);
  };

  const removeTimelineEntry = (index: number) => {
    setTimeline(timeline.filter((_, i) => i !== index));
  };

  const updateTimelineEntry = (index: number, field: keyof TimelineEntry, value: string) => {
    const updated = [...timeline];
    updated[index] = { ...updated[index], [field]: value };
    setTimeline(updated);
  };

  // Handlers for Signatures
  const addSignature = () => {
    setStaffSignatures([
      ...staffSignatures,
      { staff_id: '', name: '', signed_at: new Date().toISOString() }
    ]);
  };

  const removeSignature = (index: number) => {
    setStaffSignatures(staffSignatures.filter((_, i) => i !== index));
  };

  const updateSignature = (index: number, field: keyof StaffSignature, value: string) => {
    const updated = [...staffSignatures];
    updated[index] = { ...updated[index], [field]: value };
    setStaffSignatures(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData: SchoolIncidentFormData = {
      date_time: dateTime,
      reported_by: {
        staff_id: reportedByStaffId,
        name: reportedByName,
        role: reportedByRole
      },
      location,
      incident_type: incidentType as any,
      severity: severity as any,
      involved_residents: involvedResidents,
      witnesses,
      summary,
      timeline,
      actions_taken: actionsTaken,
      medical_needed: medicalNeeded,
      medical_details: medicalDetails || undefined,
      attachments: [],
      staff_signatures: staffSignatures,
      follow_up: followUpAssignedTo ? {
        assigned_to: followUpAssignedTo,
        due_date: followUpDueDate,
        follow_up_notes: followUpNotes || undefined
      } : undefined,
      confidential_notes: confidentialNotes || undefined
    };

    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="basic">
            <FileText className="w-4 h-4 mr-2" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="people">
            <Users className="w-4 h-4 mr-2" />
            People
          </TabsTrigger>
          <TabsTrigger value="details">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Details
          </TabsTrigger>
          <TabsTrigger value="followup">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Follow-up
          </TabsTrigger>
          <TabsTrigger value="signatures">
            <User className="w-4 h-4 mr-2" />
            Signatures
          </TabsTrigger>
        </TabsList>

        {/* Basic Information Tab */}
        <TabsContent value="basic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                When & Where
              </CardTitle>
              <CardDescription>
                Document when and where this incident occurred
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dateTime">
                    Date & Time <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateTime"
                    type="datetime-local"
                    value={format(new Date(dateTime), "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => setDateTime(new Date(e.target.value).toISOString())}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Location <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., B.E.S.T. classroom, Cafeteria"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="incidentType">
                    Incident Type <span className="text-red-500">*</span>
                  </Label>
                  <Select value={incidentType} onValueChange={setIncidentType}>
                    <SelectTrigger id="incidentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aggression">Aggression</SelectItem>
                      <SelectItem value="Disruption">Disruption</SelectItem>
                      <SelectItem value="Property Damage">Property Damage</SelectItem>
                      <SelectItem value="Verbal Altercation">Verbal Altercation</SelectItem>
                      <SelectItem value="Physical Altercation">Physical Altercation</SelectItem>
                      <SelectItem value="Refusal to Follow Directions">Refusal to Follow Directions</SelectItem>
                      <SelectItem value="Inappropriate Language">Inappropriate Language</SelectItem>
                      <SelectItem value="Tardy/Absence">Tardy/Absence</SelectItem>
                      <SelectItem value="Academic Dishonesty">Academic Dishonesty</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severity">
                    Severity <span className="text-red-500">*</span>
                  </Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger id="severity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium text-sm">Reported By</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reportedByStaffId">Staff ID</Label>
                    <Input
                      id="reportedByStaffId"
                      placeholder="e.g., stf-003"
                      value={reportedByStaffId}
                      onChange={(e) => setReportedByStaffId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportedByName">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="reportedByName"
                      placeholder="Staff name"
                      value={reportedByName}
                      onChange={(e) => setReportedByName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportedByRole">Role</Label>
                    <Input
                      id="reportedByRole"
                      placeholder="e.g., Resident Advisor"
                      value={reportedByRole}
                      onChange={(e) => setReportedByRole(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* People Involved Tab */}
        <TabsContent value="people" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-red-600" />
                  Involved Residents
                </span>
                <Button type="button" onClick={addInvolvedResident} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Resident
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {involvedResidents.length === 0 ? (
                <p className="text-sm text-slate-500">No residents added yet.</p>
              ) : (
                involvedResidents.map((resident, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Resident {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeInvolvedResident(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Resident ID</Label>
                        <Input
                          placeholder="e.g., res-001"
                          value={resident.resident_id}
                          onChange={(e) => updateInvolvedResident(index, 'resident_id', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="Resident name"
                          value={resident.name}
                          onChange={(e) => updateInvolvedResident(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role in Incident</Label>
                        <Select
                          value={resident.role_in_incident}
                          onValueChange={(value) => updateInvolvedResident(index, 'role_in_incident', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="aggressor">Aggressor</SelectItem>
                            <SelectItem value="victim">Victim</SelectItem>
                            <SelectItem value="witness">Witness</SelectItem>
                            <SelectItem value="bystander">Bystander</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Witnesses</span>
                <Button type="button" onClick={addWitness} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Witness
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {witnesses.length === 0 ? (
                <p className="text-sm text-slate-500">No witnesses added yet.</p>
              ) : (
                witnesses.map((witness, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Witness {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeWitness(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="Witness name"
                          value={witness.name}
                          onChange={(e) => updateWitness(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={witness.role}
                          onValueChange={(value) => updateWitness(index, 'role', value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="peer">Peer</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Statement (Optional)</Label>
                      <Textarea
                        placeholder="Witness statement..."
                        value={witness.statement || ''}
                        onChange={(e) => updateWitness(index, 'statement', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Summary</CardTitle>
              <CardDescription>Provide a brief one-line summary</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Brief summary of the incident..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  Timeline of Events
                </span>
                <Button type="button" onClick={addTimelineEntry} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Entry
                </Button>
              </CardTitle>
              <CardDescription>
                Document the chronological sequence of events
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {timeline.length === 0 ? (
                <p className="text-sm text-slate-500">No timeline entries yet.</p>
              ) : (
                timeline.map((entry, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Entry {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeTimelineEntry(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label>Time</Label>
                        <Input
                          type="time"
                          value={entry.time}
                          onChange={(e) => updateTimelineEntry(index, 'time', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-3">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="What happened at this time..."
                          value={entry.entry}
                          onChange={(e) => updateTimelineEntry(index, 'entry', e.target.value)}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions Taken</CardTitle>
              <CardDescription>
                Describe the interventions and actions taken by staff
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Detail all actions taken, interventions used, notifications made..."
                value={actionsTaken}
                onChange={(e) => setActionsTaken(e.target.value)}
                rows={4}
                required
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Medical & Safety</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="medicalNeeded"
                  checked={medicalNeeded}
                  onCheckedChange={(checked) => setMedicalNeeded(checked as boolean)}
                />
                <Label htmlFor="medicalNeeded" className="cursor-pointer">
                  Medical attention required
                </Label>
              </div>
              {medicalNeeded && (
                <div className="space-y-2">
                  <Label htmlFor="medicalDetails">Medical Details</Label>
                  <Textarea
                    id="medicalDetails"
                    placeholder="Describe medical attention provided..."
                    value={medicalDetails}
                    onChange={(e) => setMedicalDetails(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Confidential Notes</CardTitle>
              <CardDescription>
                Internal notes (encrypted in production)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Confidential observations, concerns, or additional context..."
                value={confidentialNotes}
                onChange={(e) => setConfidentialNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Follow-up Tab */}
        <TabsContent value="followup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Follow-up Actions</CardTitle>
              <CardDescription>
                Assign follow-up tasks and set due dates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="followUpAssignedTo">Assigned To</Label>
                  <Input
                    id="followUpAssignedTo"
                    placeholder="e.g., program_clinician, supervisor"
                    value={followUpAssignedTo}
                    onChange={(e) => setFollowUpAssignedTo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpDueDate">Due Date</Label>
                  <Input
                    id="followUpDueDate"
                    type="date"
                    value={followUpDueDate}
                    onChange={(e) => setFollowUpDueDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpNotes">Follow-up Notes</Label>
                <Textarea
                  id="followUpNotes"
                  placeholder="Describe required follow-up actions..."
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Staff Signatures</span>
                <Button type="button" onClick={addSignature} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Signature
                </Button>
              </CardTitle>
              <CardDescription>
                Document staff who reviewed and signed this report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {staffSignatures.length === 0 ? (
                <p className="text-sm text-slate-500">No signatures yet.</p>
              ) : (
                staffSignatures.map((signature, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Signature {index + 1}</h4>
                      <Button
                        type="button"
                        onClick={() => removeSignature(index)}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Staff ID</Label>
                        <Input
                          placeholder="e.g., stf-003"
                          value={signature.staff_id}
                          onChange={(e) => updateSignature(index, 'staff_id', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          placeholder="Staff name"
                          value={signature.name}
                          onChange={(e) => updateSignature(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Signed At</Label>
                        <Input
                          type="datetime-local"
                          value={signature.signed_at.slice(0, 16)}
                          onChange={(e) => updateSignature(index, 'signed_at', new Date(e.target.value).toISOString())}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          <Save className="w-4 h-4 mr-2" />
          Save Incident Report
        </Button>
      </div>
    </form>
  );
}