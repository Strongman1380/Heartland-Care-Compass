import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  listSchoolIncidents,
  saveSchoolIncident,
  deleteSchoolIncident,
} from "@/utils/academicStore";
import { SchoolIncidentReport, SchoolIncidentFormData } from "@/types/school-incident-types";
import SchoolIncidentForm from "@/components/school/SchoolIncidentForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Edit, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function SchoolIncidentReports() {
  const [showForm, setShowForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SchoolIncidentReport | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'view'>('list');
  const [refreshKey, setRefreshKey] = useState(0);
  const [incidents, setIncidents] = useState<SchoolIncidentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadIncidents = useCallback(async () => {
    try {
      const data = await listSchoolIncidents();
      // Ensure data is always an array
      setIncidents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading incidents:', error);
      toast.error('Failed to load incident reports');
      setIncidents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
  }, [loadIncidents, refreshKey]);

  const sortedIncidents = useMemo(() => {
    // Ensure incidents is always an array before sorting
    const safeIncidents = Array.isArray(incidents) ? incidents : [];
    return [...safeIncidents].sort((a, b) =>
      new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
    );
  }, [incidents]);

  const handleSave = useCallback(async (data: SchoolIncidentFormData) => {
    try {
      setIsRefreshing(true);
      await saveSchoolIncident(data);
      toast.success('Incident report saved successfully');
      setRefreshKey((k) => k + 1);
      setShowForm(false);
      setViewMode('list');
      setSelectedIncident(null);
    } catch (error) {
      console.error('Error saving incident:', error);
      toast.error('Failed to save incident report');
      setIsRefreshing(false);
    }
  }, []);

  const handleDelete = useCallback(async (incidentId: string) => {
    if (confirm('Are you sure you want to delete this incident report?')) {
      try {
        setIsRefreshing(true);
        await deleteSchoolIncident(incidentId);
        toast.success('Incident report deleted successfully');
        setRefreshKey((k) => k + 1);
      } catch (error) {
        console.error('Error deleting incident:', error);
        toast.error('Failed to delete incident report');
        setIsRefreshing(false);
      }
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadIncidents();
  }, [loadIncidents]);

  const handleView = (incident: SchoolIncidentReport) => {
    setSelectedIncident(incident);
    setViewMode('view');
  };

  const handleEdit = (incident: SchoolIncidentReport) => {
    setSelectedIncident(incident);
    setViewMode('form');
  };

  const handleCancel = () => {
    setShowForm(false);
    setViewMode('list');
    setSelectedIncident(null);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Low': return 'bg-green-100 text-green-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (viewMode === 'form' || showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            {selectedIncident ? 'Edit' : 'New'} School Incident Report
          </h1>
        </div>
        <SchoolIncidentForm
          incident={selectedIncident || undefined}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  if (viewMode === 'view' && selectedIncident) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            Incident Report: {selectedIncident.incident_id}
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => handleEdit(selectedIncident)} variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button 
              onClick={() => {
                handleDelete(selectedIncident.incident_id);
                handleCancel();
              }} 
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button onClick={handleCancel} variant="outline">
              Back to List
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{selectedIncident.summary}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">
                  {format(new Date(selectedIncident.date_time), 'PPpp')}
                </p>
              </div>
              <Badge className={getSeverityColor(selectedIncident.severity)}>
                {selectedIncident.severity}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Location</h3>
                <p className="text-sm">{selectedIncident.location}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Incident Type</h3>
                <p className="text-sm">{selectedIncident.incident_type}</p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Reported By</h3>
                <p className="text-sm">
                  {selectedIncident.reported_by.name} ({selectedIncident.reported_by.role})
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Medical Attention</h3>
                <p className="text-sm">{selectedIncident.medical_needed ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Involved Residents */}
            {selectedIncident.involved_residents.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Involved Residents</h3>
                <div className="space-y-2">
                  {selectedIncident.involved_residents.map((resident, idx) => (
                    <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                      <span className="font-medium">{resident.name}</span>
                      {' - '}
                      <span className="text-slate-600 capitalize">{resident.role_in_incident}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Witnesses */}
            {selectedIncident.witnesses.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Witnesses</h3>
                <div className="space-y-2">
                  {selectedIncident.witnesses.map((witness, idx) => (
                    <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                      <span className="font-medium">{witness.name}</span>
                      {' - '}
                      <span className="text-slate-600 capitalize">{witness.role}</span>
                      {witness.statement && (
                        <p className="mt-1 text-slate-600 italic">"{witness.statement}"</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {selectedIncident.timeline.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Timeline of Events</h3>
                <div className="space-y-2">
                  {selectedIncident.timeline.map((entry, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <span className="font-mono font-medium text-slate-600 min-w-[60px]">
                        {entry.time}
                      </span>
                      <span>{entry.entry}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions Taken */}
            <div>
              <h3 className="font-semibold text-sm text-slate-700 mb-2">Actions Taken</h3>
              <p className="text-sm whitespace-pre-wrap">{selectedIncident.actions_taken}</p>
            </div>

            {/* Medical Details */}
            {selectedIncident.medical_needed && selectedIncident.medical_details && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Medical Details</h3>
                <p className="text-sm whitespace-pre-wrap">{selectedIncident.medical_details}</p>
              </div>
            )}

            {/* Follow-up */}
            {selectedIncident.follow_up && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Follow-up</h3>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Assigned to:</span> {selectedIncident.follow_up.assigned_to}</p>
                  <p><span className="font-medium">Due date:</span> {format(new Date(selectedIncident.follow_up.due_date), 'PP')}</p>
                  {selectedIncident.follow_up.follow_up_notes && (
                    <p className="mt-2">{selectedIncident.follow_up.follow_up_notes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Staff Signatures */}
            {selectedIncident.staff_signatures.length > 0 && (
              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Staff Signatures</h3>
                <div className="space-y-2">
                  {selectedIncident.staff_signatures.map((sig, idx) => (
                    <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                      <span className="font-medium">{sig.name}</span>
                      {' - '}
                      <span className="text-slate-600">
                        {format(new Date(sig.signed_at), 'PPpp')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confidential Notes */}
            {selectedIncident.confidential_notes && (
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Confidential Notes
                </h3>
                <p className="text-sm whitespace-pre-wrap bg-amber-50 p-3 rounded">
                  {selectedIncident.confidential_notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
            School Incident Reports
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="ml-2 text-slate-600">Loading incident reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-800">
          School Incident Reports
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="w-4 h-4 mr-2" />
            )}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700"
            disabled={isRefreshing}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Incident Report
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold text-slate-700">
            Recent Incidents ({sortedIncidents.length})
          </h2>
        </div>
        <div className="divide-y">
          {sortedIncidents.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No incidents reported yet.</p>
              <p className="text-xs text-slate-400 mt-1">
                Click "New Incident Report" to create your first report.
              </p>
            </div>
          ) : (
            sortedIncidents.map((inc) => (
              <IncidentRow
                key={inc.incident_id}
                incident={inc}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                getSeverityColor={getSeverityColor}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function IncidentRow({
  incident,
  onView,
  onEdit,
  onDelete,
  getSeverityColor,
}: {
  incident: SchoolIncidentReport;
  onView: (incident: SchoolIncidentReport) => void;
  onEdit: (incident: SchoolIncidentReport) => void;
  onDelete: (id: string) => void;
  getSeverityColor: (severity: string) => string;
}) {
  const involvedCount = Array.isArray(incident.involved_residents)
    ? incident.involved_residents.length
    : 0;

  const reporterName = typeof incident.reported_by === 'object' && incident.reported_by !== null
    ? (incident.reported_by.name || 'Unknown reporter')
    : String(incident.reported_by || 'Unknown reporter');

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-medium text-slate-600">
              {incident.incident_id}
            </span>
            <Badge className={getSeverityColor(incident.severity)}>
              {incident.severity}
            </Badge>
            <span className="text-sm text-slate-500">
              {format(new Date(incident.date_time), 'PPp')}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-800">
            {incident.incident_type} • {incident.location}
          </div>
          <div className="text-sm text-slate-600">
            {incident.summary}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>Reported by: {reporterName}</span>
            {involvedCount > 0 && (
              <span>• {involvedCount} resident(s) involved</span>
            )}
            {incident.medical_needed && (
              <span className="text-red-600">• Medical attention required</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => onView(incident)}
            size="sm"
            variant="outline"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onEdit(incident)}
            size="sm"
            variant="outline"
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => onDelete(incident.incident_id)}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
