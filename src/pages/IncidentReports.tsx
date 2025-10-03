/**
 * Incident Reports Page
 * Main page for viewing and managing incident reports
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  AlertCircle,
  FileText,
  Calendar,
  User,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { IncidentReport, IncidentListFilters } from '@/types/incident-types';

export default function IncidentReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<IncidentListFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, [filters, page]);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...filters,
        search: searchTerm
      });

      const response = await fetch(`/api/incidents?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load incidents');
      }

      const data = await response.json();
      setIncidents(data.incidents);
      setTotalPages(Math.ceil(data.total / 20));
    } catch (error: any) {
      toast({
        title: 'Error loading incidents',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadIncidents();
  };

  const handleFilterChange = (key: keyof IncidentListFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setPage(1);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'serious': return 'bg-orange-600 text-white';
      case 'moderate': return 'bg-yellow-600 text-white';
      case 'minor': return 'bg-blue-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-200 text-slate-700';
      case 'submitted': return 'bg-blue-200 text-blue-700';
      case 'under_review': return 'bg-yellow-200 text-yellow-700';
      case 'resolved': return 'bg-green-200 text-green-700';
      case 'archived': return 'bg-slate-300 text-slate-600';
      default: return 'bg-slate-200 text-slate-700';
    }
  };

  const getIncidentTypeLabel = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-red-600" />
            Incident Reports
          </h1>
          <p className="text-slate-600 mt-1">
            Document and manage incident reports for Heartland Boys Home
          </p>
        </div>
        <Button
          onClick={() => navigate('/incidents/new')}
          className="bg-red-600 hover:bg-red-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Incident Report
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Search incidents by description, location, or youth name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                Search
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={filters.status?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('status', value ? [value] : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Incident Type</label>
                  <Select
                    value={filters.incidentType?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('incidentType', value ? [value] : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All types</SelectItem>
                      <SelectItem value="behavioral">Behavioral</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="property_damage">Property Damage</SelectItem>
                      <SelectItem value="runaway">Runaway</SelectItem>
                      <SelectItem value="self_harm">Self-Harm</SelectItem>
                      <SelectItem value="aggression">Aggression</SelectItem>
                      <SelectItem value="substance_use">Substance Use</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Severity</label>
                  <Select
                    value={filters.severity?.[0] || ''}
                    onValueChange={(value) => handleFilterChange('severity', value ? [value] : undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All severities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All severities</SelectItem>
                      <SelectItem value="minor">Minor</SelectItem>
                      <SelectItem value="moderate">Moderate</SelectItem>
                      <SelectItem value="serious">Serious</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                      placeholder="From"
                    />
                    <Input
                      type="date"
                      value={filters.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                      placeholder="To"
                    />
                  </div>
                </div>

                <div className="md:col-span-4 flex justify-end">
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Incidents List */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-slate-600">Loading incidents...</p>
            </div>
          </CardContent>
        </Card>
      ) : incidents.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No incidents found</h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || Object.keys(filters).length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first incident report'}
              </p>
              <Button
                onClick={() => navigate('/incidents/new')}
                className="bg-red-600 hover:bg-red-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Incident Report
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <Card key={incident.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900">
                            {incident.incidentNumber}
                          </h3>
                          <Badge className={getStatusColor(incident.status)}>
                            {incident.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getSeverityColor(incident.severity)}>
                            {incident.severity}
                          </Badge>
                        </div>
                        <p className="text-slate-700 font-medium">
                          {incident.summary}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {format(new Date(incident.incidentDate), 'MMM d, yyyy')} at {incident.incidentTime}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4" />
                        <span>{incident.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <FileText className="w-4 h-4" />
                        <span>{getIncidentTypeLabel(incident.incidentType)}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Created by {incident.createdBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(incident.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                      {incident.attachments.length > 0 && (
                        <span>
                          📎 {incident.attachments.length} attachment{incident.attachments.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {incident.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/incidents/${incident.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/incidents/${incident.id}/export`)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && incidents.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}