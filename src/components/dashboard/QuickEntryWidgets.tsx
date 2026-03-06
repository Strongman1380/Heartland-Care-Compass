import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, ClipboardPaste, BookOpen } from "lucide-react";

const widgets = [
  { label: "Daily Points", path: "/daily-points", icon: Star, color: "text-amber-600", bg: "bg-amber-50", border: "hover:border-amber-200" },
  { label: "Shift Scores", path: "/shift-scores", icon: Clock, color: "text-blue-600", bg: "bg-blue-50", border: "hover:border-blue-200" },
  { label: "New Referral", path: "/referrals", icon: ClipboardPaste, color: "text-purple-600", bg: "bg-purple-50", border: "hover:border-purple-200" },
  { label: "Case Notes", path: "/progress-notes", icon: BookOpen, color: "text-green-600", bg: "bg-green-50", border: "hover:border-green-200" },
];

export const QuickEntryWidgets = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {widgets.map((w) => {
        const Icon = w.icon;
        return (
          <Card
            key={w.path}
            className={`cursor-pointer transition-all duration-200 border-0 shadow-sm ${w.border} hover:shadow-md`}
            onClick={() => navigate(w.path)}
          >
            <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
              <div className={`p-2.5 rounded-xl ${w.bg}`}>
                <Icon className={`h-5 w-5 ${w.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-700">{w.label}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
