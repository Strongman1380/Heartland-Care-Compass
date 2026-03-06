import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Star, TrendingUp, ShieldAlert, Bell } from "lucide-react";
import type { Youth } from "@/integrations/firebase/services";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import { alertService } from "@/utils/alertService";

interface DashboardKPIStripProps {
  youths: Youth[];
}

export const DashboardKPIStrip = ({ youths }: DashboardKPIStripProps) => {
  const [incidentsThisWeek, setIncidentsThisWeek] = useState(0);
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    incidentReportsService.list().then((incidents) => {
      const recent = incidents.filter((i) => {
        const d = i.dateOfIncident ? new Date(i.dateOfIncident) : null;
        return d && d >= weekAgo;
      });
      setIncidentsThisWeek(recent.length);
    }).catch(console.error);

    alertService.getUnresolvedAlerts().then((alerts) => {
      setOpenAlerts(alerts.length);
    }).catch(console.error);
  }, []);

  const avgPoints = youths.length > 0
    ? Math.round(youths.reduce((sum, y) => sum + (y.pointTotal || 0), 0) / youths.length)
    : 0;

  const avgDomainScore = youths.length > 0
    ? (
        youths.reduce((sum, y) => {
          const domains = [y.peerInteraction, y.adultInteraction, y.investmentLevel, y.dealAuthority].filter((v) => typeof v === "number") as number[];
          return sum + (domains.length > 0 ? domains.reduce((a, b) => a + b, 0) / domains.length : 0);
        }, 0) / youths.length
      ).toFixed(1)
    : "0";

  const kpis = [
    { label: "Active Youth", value: youths.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Avg Points", value: avgPoints.toLocaleString(), icon: Star, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Avg Domain Score", value: avgDomainScore, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
    { label: "Incidents (7d)", value: incidentsThisWeek, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
    { label: "Open Alerts", value: openAlerts, icon: Bell, color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
