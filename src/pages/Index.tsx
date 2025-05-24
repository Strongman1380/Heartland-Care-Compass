
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
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Heartland Boys Home Platform
          </h1>
          <p className="text-red-700 text-lg">Empowering Youth Through Structure and Support</p>
        </div>
        
        <div className="mb-6">
          <YouthSelector onSelectYouth={setSelectedYouthId} />
        </div>
        
        {selectedYouthId ? (
          <div>
            <div className="bg-white rounded-lg shadow-lg border-2 border-yellow-300 p-6 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-red-800">Selected Youth</h2>
                  <p className="text-red-600">ID: {selectedYouthId}</p>
                </div>
              </div>
            </div>
            
            <Tabs 
              value={selectedTab} 
              onValueChange={setSelectedTab}
              className="space-y-6"
            >
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
          <div className="bg-white p-8 rounded-lg shadow-lg text-center border-2 border-yellow-300">
            <div className="mb-6">
              <img 
                src="/lovable-uploads/983078ec-ca85-495c-8d9a-65acb6523081.png" 
                alt="Heartland Boys Home Logo" 
                className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-100 to-yellow-100 p-2"
              />
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">Welcome to the Heartland Boys Home Platform</h2>
            <p className="text-red-600 text-lg">Please select a youth from the dropdown above to begin managing their profile, tracking behavior, adding progress notes, and generating reports.</p>
            <div className="mt-6 p-4 bg-gradient-to-r from-red-100 to-yellow-100 rounded-lg border border-yellow-300">
              <p className="text-red-700 font-medium">Building character, one day at a time.</p>
            </div>
          </div>
        )}
      </main>
      <footer className="heartland-gradient py-6 text-center text-yellow-100 text-sm mt-12">
        <div className="container mx-auto px-4">
          <p className="font-medium">Heartland Boys Home Platform &copy; {new Date().getFullYear()}</p>
          <p className="text-yellow-200 text-xs mt-1">Empowering Youth Through Structure and Support</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
