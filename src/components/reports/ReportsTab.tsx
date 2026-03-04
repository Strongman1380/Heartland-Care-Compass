import { Youth } from "@/types/app-types";
import { ServicePlanReport } from "./ServicePlanReport";
import { MonthlyProgressReport } from "./MonthlyProgressReport";
import { CourtReport } from "./CourtReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, FileText, Gavel } from "lucide-react";

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

      <Tabs defaultValue="service-plan" className="space-y-4">
        <TabsList className="bg-white border border-gray-200 shadow-sm">
          <TabsTrigger value="service-plan" className="flex items-center gap-1.5 data-[state=active]:bg-red-700 data-[state=active]:text-white">
            <ClipboardList className="h-4 w-4" />
            Service Plan
          </TabsTrigger>
          <TabsTrigger value="monthly-progress" className="flex items-center gap-1.5 data-[state=active]:bg-red-700 data-[state=active]:text-white">
            <FileText className="h-4 w-4" />
            Monthly Progress
          </TabsTrigger>
          <TabsTrigger value="court-report" className="flex items-center gap-1.5 data-[state=active]:bg-red-700 data-[state=active]:text-white">
            <Gavel className="h-4 w-4" />
            Court Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="service-plan">
          <ServicePlanReport youth={youth} />
        </TabsContent>

        <TabsContent value="monthly-progress">
          <MonthlyProgressReport youth={youth} />
        </TabsContent>

        <TabsContent value="court-report">
          <CourtReport youth={youth} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
