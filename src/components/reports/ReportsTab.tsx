import { Youth } from "@/types/app-types";
import { ServicePlanReport } from "./ServicePlanReport";
import { ClipboardList } from "lucide-react";

interface ReportsTabProps {
  youth: Youth;
}

export const ReportsTab = ({ youth }: ReportsTabProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-8 h-8 text-red-700" />
        <div>
          <h2 className="text-2xl font-bold text-red-800">Service Plan Report</h2>
          <p className="text-gray-600">Generate service plan report for {youth.firstName} {youth.lastName}</p>
        </div>
      </div>

      <ServicePlanReport youth={youth} />
    </div>
  );
};
