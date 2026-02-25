import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import { schoolIncidentsService } from "@/integrations/firebase/schoolIncidentsService";
import { format, subDays, isAfter } from "date-fns";

interface RecentIncidentsAlertProps {
  youthId: string;
}

export const RecentIncidentsAlert = ({ youthId }: RecentIncidentsAlertProps) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setLoading(true);
        const fourteenDaysAgo = subDays(new Date(), 14);
        
        // Fetch facility incidents
        const facilityIncidents = await incidentReportsService.list();
        const youthFacilityIncidents = facilityIncidents.filter(
          (inc) => 
            inc.youthId === youthId && 
            inc.date && 
            isAfter(new Date(inc.date), fourteenDaysAgo)
        );

        // Fetch school incidents
        const schoolIncidents = await schoolIncidentsService.list();
        const youthSchoolIncidents = schoolIncidents.filter(
          (inc) => 
            inc.youthId === youthId && 
            inc.date && 
            isAfter(new Date(inc.date), fourteenDaysAgo)
        );

        const allIncidents = [
          ...youthFacilityIncidents.map(i => ({ ...i, type: 'Facility' })),
          ...youthSchoolIncidents.map(i => ({ ...i, type: 'School' }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setIncidents(allIncidents);
      } catch (error) {
        console.error("Error fetching recent incidents:", error);
      } finally {
        setLoading(false);
      }
    };

    if (youthId) {
      fetchIncidents();
    }
  }, [youthId]);

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
    i.severity === 'Major' || i.severity === 'Critical' || i.level === 'Major' || i.level === 'Critical'
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
                <span className="text-xs text-gray-500">{incident.category || incident.incidentType || 'General'}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-xs font-medium">{format(new Date(incident.date), 'MMM d, yyyy')}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  incident.severity === 'Critical' || incident.level === 'Critical' ? 'bg-red-100 text-red-800' :
                  incident.severity === 'Major' || incident.level === 'Major' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {incident.severity || incident.level || 'Minor'}
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
