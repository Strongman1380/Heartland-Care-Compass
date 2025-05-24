
import { useState } from "react";
import { YouthDashboard } from "@/components/dashboard/YouthDashboard";
import { YouthSelector } from "@/components/common/YouthSelector";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { ProgressNotes } from "@/components/notes/ProgressNotes";
import { BehaviorAnalysis } from "@/components/analysis/BehaviorAnalysis";
import { RiskAssessment } from "@/components/assessment/RiskAssessment";
import { ReportCenter } from "@/components/reports/ReportCenter";
import { User, CheckSquare, FileText, BarChart2, Shield, FileChartPie } from "lucide-react";

const Index = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("profile");

  // This is a placeholder for youth data until actual youth is selected
  const placeholderYouth = selectedYouthId ? { id: selectedYouthId } : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Heartland Boys Home Platform</h1>
        
        <div className="mb-6">
          <YouthSelector onSelectYouth={setSelectedYouthId} />
        </div>
        
        {selectedYouthId ? (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">Selected Youth</h2>
                  <p className="text-gray-600">ID: {selectedYouthId}</p>
                </div>
              </div>
            </div>
            
            <Tabs 
              value={selectedTab} 
              onValueChange={setSelectedTab}
              className="space-y-6"
            >
              <TabsList className="bg-white p-1 shadow-sm rounded-lg overflow-x-auto flex w-full justify-start md:justify-center">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User size={16} />
                  <span>Profile</span>
                </TabsTrigger>
                <TabsTrigger value="behavior" className="flex items-center gap-2">
                  <CheckSquare size={16} />
                  <span>Daily Points</span>
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex items-center gap-2">
                  <FileText size={16} />
                  <span>Progress Notes</span>
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-2">
                  <BarChart2 size={16} />
                  <span>Behavior Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="assessment" className="flex items-center gap-2">
                  <Shield size={16} />
                  <span>Risk Assessment</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <FileChartPie size={16} />
                  <span>Reports</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <YouthProfile youth={placeholderYouth} />
              </TabsContent>
              
              <TabsContent value="behavior">
                <BehaviorCard youthId={selectedYouthId} youth={placeholderYouth} />
              </TabsContent>
              
              <TabsContent value="notes">
                <ProgressNotes youthId={selectedYouthId} youth={placeholderYouth} />
              </TabsContent>
              
              <TabsContent value="analysis">
                <BehaviorAnalysis youthId={selectedYouthId} youth={placeholderYouth} />
              </TabsContent>
              
              <TabsContent value="assessment">
                <RiskAssessment youthId={selectedYouthId} youth={placeholderYouth} />
              </TabsContent>
              
              <TabsContent value="reports">
                <ReportCenter youthId={selectedYouthId} youth={placeholderYouth} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Welcome to the Heartland Boys Home Platform</h2>
            <p className="text-gray-600">Please select a youth from the dropdown above to begin managing their profile, tracking behavior, adding progress notes, and generating reports.</p>
          </div>
        )}
      </main>
      <footer className="bg-gray-100 py-4 text-center text-gray-600 text-sm">
        <p>Heartland Boys Home Platform &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
