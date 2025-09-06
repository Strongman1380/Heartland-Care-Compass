
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { ProgressNotes } from "@/components/notes/ProgressNotes";
import { BehaviorAnalysis } from "@/components/analysis/BehaviorAnalysis";
import { RiskAssessment } from "@/components/assessment/RiskAssessment";
import { ComprehensivePlacementAssessment } from "@/components/assessment/ComprehensivePlacementAssessment";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { User, CheckSquare, FileText, BarChart2, Shield, FileChartPie, ArrowLeft, ClipboardCheck } from "lucide-react";
import { Youth } from "@/types/app-types";

interface YouthDetailViewProps {
  selectedYouth: Youth;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToHome: () => void;
  onYouthUpdated: () => void;
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
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            onClick={onBackToHome}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Youth List
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
              {selectedYouth.firstName} {selectedYouth.lastName}
            </h1>
            <p className="text-red-600">Level {selectedYouth.level} • {selectedYouth.pointTotal || 0} Points</p>
          </div>
          <div className="w-32"></div> {/* Spacer for layout balance */}
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
            <span>Daily Points</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <FileText size={16} />
            <span>Progress Notes</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <BarChart2 size={16} />
            <span>Behavior Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <Shield size={16} />
            <span>Risk Assessment</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <FileChartPie size={16} />
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
          <BehaviorCard youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
        
        <TabsContent value="notes">
          <ProgressNotes youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
        
        <TabsContent value="analysis">
          <BehaviorAnalysis youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
        
        <TabsContent value="assessment">
          <RiskAssessment youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
        
        <TabsContent value="reports">
          <ReportCenter youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
      </Tabs>
    </>
  );
};
