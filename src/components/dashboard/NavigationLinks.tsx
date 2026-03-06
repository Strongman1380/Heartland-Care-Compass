import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText, BookOpen, ShieldAlert, ClipboardPaste,
  ClipboardList, Building2, Upload, Bell,
} from "lucide-react";

const links = [
  { label: "Reports", path: "/reports", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Case Notes", path: "/progress-notes", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Incidents", path: "/incident-reports", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
  { label: "Referrals", path: "/referrals", icon: ClipboardPaste, color: "text-purple-600", bg: "bg-purple-50" },
  { label: "KPI Dashboard", path: "/assessment-kpi", icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50" },
  { label: "Facility Ops", path: "/admin/facility", icon: Building2, color: "text-slate-600", bg: "bg-slate-50" },
  { label: "Data Upload", path: "/data-upload", icon: Upload, color: "text-teal-600", bg: "bg-teal-50" },
  { label: "Alerts", path: "/alerts", icon: Bell, color: "text-orange-600", bg: "bg-orange-50" },
];

export const NavigationLinks = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Card
            key={link.path}
            className="cursor-pointer hover:shadow-md transition-all duration-200 border-0 shadow-sm"
            onClick={() => navigate(link.path)}
          >
            <CardContent className="p-3 flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg ${link.bg}`}>
                <Icon className={`h-4 w-4 ${link.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-700">{link.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
