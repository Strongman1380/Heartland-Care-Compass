import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Gavel, FileText, ClipboardList, Star, BookOpen, FileCheck, LogOut,
} from "lucide-react";

export type ReportTypeKey =
  | "progressMonthly"
  | "court"
  | "dpnBiWeekly"
  | "dpnMonthly"
  | "evalWeekly"
  | "evalMonthly"
  | "servicePlan"
  | "discharge";

interface ReportTypeDef {
  key: ReportTypeKey;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  autoExport: boolean;
}

const reportTypes: ReportTypeDef[] = [
  {
    key: "progressMonthly",
    label: "Monthly Progress",
    description: "Comprehensive monthly progress report",
    icon: Calendar,
    color: "text-blue-600",
    bg: "bg-blue-50",
    autoExport: false,
  },
  {
    key: "court",
    label: "Court Report",
    description: "Legal documentation for court proceedings",
    icon: Gavel,
    color: "text-red-600",
    bg: "bg-red-50",
    autoExport: true,
  },
  {
    key: "dpnBiWeekly",
    label: "DPN Bi-Weekly",
    description: "Bi-weekly Daily Performance Notes",
    icon: FileText,
    color: "text-purple-600",
    bg: "bg-purple-50",
    autoExport: true,
  },
  {
    key: "dpnMonthly",
    label: "DPN Monthly",
    description: "Monthly Daily Performance Notes",
    icon: FileText,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    autoExport: true,
  },
  {
    key: "evalWeekly",
    label: "Weekly Progress Eval",
    description: "Resident weekly progress evaluation",
    icon: ClipboardList,
    color: "text-green-600",
    bg: "bg-green-50",
    autoExport: true,
  },
  {
    key: "evalMonthly",
    label: "Monthly Progress Eval",
    description: "Resident monthly progress evaluation",
    icon: Star,
    color: "text-amber-600",
    bg: "bg-amber-50",
    autoExport: true,
  },
  {
    key: "servicePlan",
    label: "Service Plan",
    description: "Clinical service plan documentation",
    icon: FileCheck,
    color: "text-teal-600",
    bg: "bg-teal-50",
    autoExport: false,
  },
  {
    key: "discharge",
    label: "Discharge Report",
    description: "Discharge summary and transition plan",
    icon: LogOut,
    color: "text-slate-600",
    bg: "bg-slate-50",
    autoExport: false,
  },
];

interface ReportTypeSelectorProps {
  selected: ReportTypeKey | null;
  onSelect: (type: ReportTypeKey) => void;
}

export const ReportTypeSelector = ({ selected, onSelect }: ReportTypeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {reportTypes.map((rt) => {
        const Icon = rt.icon;
        const isSelected = selected === rt.key;
        return (
          <Card
            key={rt.key}
            className={`cursor-pointer transition-all duration-200 border-2 ${
              isSelected
                ? "border-red-500 shadow-md ring-1 ring-red-200"
                : "border-transparent shadow-sm hover:shadow-md hover:border-gray-200"
            }`}
            onClick={() => onSelect(rt.key)}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
              <div className={`p-2.5 rounded-xl ${rt.bg}`}>
                <Icon className={`h-5 w-5 ${rt.color}`} />
              </div>
              <span className="text-xs font-semibold text-gray-800">{rt.label}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{rt.description}</span>
              {rt.autoExport && (
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  Auto PDF
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
