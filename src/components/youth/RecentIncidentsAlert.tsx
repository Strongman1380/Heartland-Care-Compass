import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import { schoolIncidentsService } from "@/integrations/firebase/schoolIncidentsService";
import { format, subDays, isAfter, isValid } from "date-fns";

interface NormalizedIncident {
  id: string;
  type: 'Facility' | 'School';
  date: string;
  category: string;
  severity: string;
}

interface RecentIncidentsAlertProps {
  youthId: string;
  youthName: string;
}

const normalizeSeverity = (value: string | null | undefined): string => {
  if (!value) return '';
  const v = value.trim().toLowerCase();
  if (v === 'critical') return 'Critical';
  if (v === 'major' || v === 'high') return 'Major';
  if (v === 'minor' || v === 'low') return 'Minor';
  if (v === 'moderate' || v === 'medium') return 'Moderate';
  return value.trim();
};

export const RecentIncidentsAlert = ({ youthId, youthName }: RecentIncidentsAlertProps) => {
  const [incidents, setIncidents] = useState<NormalizedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!youthId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchIncidents = async () => {
      try {
        setLoading(true);
        setError(null);
        const fourteenDaysAgo = subDays(new Date(), 14);
        const nameLower = youthName.trim().toLowerCase();

        // Fetch and normalize facility incidents — match by youthName field
        const facilityIncidents = await incidentReportsService.list();
        const youthFacilityIncidents: NormalizedIncident[] = facilityIncidents
          .filter((inc) =>
            inc.dateOfIncident &&
            isAfter(new Date(inc.dateOfIncident), fourteenDaysAgo) &&
            (inc.youthName?.toLowerCase().includes(nameLower) ||
              inc.youthInvolved?.some((y) => y.name?.toLowerCase().includes(nameLower)))
          )
          .map((inc) => ({
            id: inc.id,
            type: 'Facility' as const,
            date: inc.dateOfIncident,
            category: inc.incidentTypes?.[0] ?? 'General',
            severity: normalizeSeverity((inc as any).severity),
          }));

        // Fetch and normalize school incidents — no direct youth link, show all recent
        const schoolIncidents = await schoolIncidentsService.list();
        const recentSchoolIncidents: NormalizedIncident[] = schoolIncidents
          .filter((inc) => inc.date_time && isAfter(new Date(inc.date_time), fourteenDaysAgo))
          .map((inc) => ({
            id: inc.incident_id,
            type: 'School' as const,
            date: inc.date_time,
            category: inc.incident_type ?? 'General',
            severity: normalizeSeverity(inc.severity),
          }));

        const allIncidents = [...youthFacilityIncidents, ...recentSchoolIncidents].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        if (!cancelled) {
          setIncidents(allIncidents);
        }
      } catch (err) {
        console.error("Error fetching recent incidents:", err);
        if (!cancelled) {
          setError("Failed to load recent incidents.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchIncidents();

    return () => {
      cancelled = true;
    };
  }, [youthId, youthName]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recent Incidents (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-10 bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recent Incidents (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (incidents.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-green-500" />
            Recent Incidents (Last 14 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No incidents reported in the last 14 days.</p>
        </CardContent>
      </Card>
    );
  }

  const majorIncidents = incidents.filter(i =>
    i.severity === 'Major' || i.severity === 'Critical'
  );

  return (
    <Card className={majorIncidents.length > 0 ? "border-red-200 bg-red-50" : "border-orange-200 bg-orange-50"}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium flex items-center gap-2 ${majorIncidents.length > 0 ? "text-red-700" : "text-orange-700"}`}>
          <AlertTriangle className="h-4 w-4" />
          Recent Incidents (Last 14 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {incidents.slice(0, 3).map((incident, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-white/50">
              <div className="flex flex-col">
                <span className="font-medium">{incident.type} Incident</span>
                <span className="text-xs text-gray-500">{incident.category || 'General'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium">{(() => { const d = new Date(incident.date); return isValid(d) ? format(d, 'MMM d, yyyy') : 'Unknown date'; })()}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  incident.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                  incident.severity === 'Major' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {incident.severity || 'Minor'}
                </span>
              </div>
            </div>
          ))}
          {incidents.length > 3 && (
            <p className="text-xs text-center text-gray-500 pt-1">
              +{incidents.length - 3} more incidents
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
