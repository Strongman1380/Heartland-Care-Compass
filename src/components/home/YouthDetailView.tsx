
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { EnhancedCaseNotes } from "@/components/notes/EnhancedCaseNotes";
import { ReportsTab } from "@/components/reports/ReportsTab";
import { User, CheckSquare, FileText, BarChart3, ArrowLeft } from "lucide-react";
import { Youth } from "@/integrations/firebase/services";

interface YouthDetailViewProps {
  selectedYouth: Youth;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToHome: () => void;
  onYouthUpdated: (updated?: Youth) => void;
}

export const YouthDetailView = ({
  selectedYouth,
  activeTab,
  onTabChange,
  onBackToHome,
  onYouthUpdated
}: YouthDetailViewProps) => {
  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <Button
            variant="outline"
            onClick={onBackToHome}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Youth List
          </Button>
          <div className="text-left sm:text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
              {selectedYouth.firstName} {selectedYouth.lastName}
            </h1>
            <p className="text-red-600 mt-1 sm:mt-2">Level {selectedYouth.level}</p>
          </div>
          <div className="hidden sm:block w-32"></div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="bg-white p-1 shadow-lg rounded-lg overflow-x-auto flex w-full justify-start md:justify-center border-2 border-yellow-300">
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <User size={16} />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <CheckSquare size={16} />
            <span>Level Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <FileText size={16} />
            <span>Case Notes</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <BarChart3 size={16} />
            <span>Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <YouthProfile
            youth={selectedYouth}
            onBack={onBackToHome}
            onYouthUpdated={onYouthUpdated}
          />
        </TabsContent>

        <TabsContent value="behavior">
          <BehaviorCard youthId={selectedYouth.id} youth={selectedYouth} onYouthUpdated={onYouthUpdated} />
        </TabsContent>

        <TabsContent value="notes">
          <EnhancedCaseNotes youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab youth={selectedYouth} />
        </TabsContent>
      </Tabs>
    </>
  );
};
