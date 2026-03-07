import { ClipboardList } from "lucide-react";
import type { Youth } from "@/integrations/firebase/services";
import { YouthReportWorkspace } from "./YouthReportWorkspace";

interface ReportsTabProps {
  youth: Youth;
}

export const ReportsTab = ({ youth }: ReportsTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <ClipboardList className="w-8 h-8 text-red-700" />
        <div>
          <h2 className="text-2xl font-bold text-red-800">Reports</h2>
          <p className="text-gray-600">Generate reports for {youth.firstName} {youth.lastName}</p>
        </div>
      </div>
      <YouthReportWorkspace
        youth={youth}
        selectedYouthId={youth.id}
        title="Unified Report Center"
        description="Use the same report workflow here as in the full reports page."
      />
    </div>
  );
};
