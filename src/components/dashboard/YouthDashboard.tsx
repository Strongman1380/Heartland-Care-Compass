
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapYouthFromSupabase, type Youth } from "@/types/app-types";

import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { ProgressNotes } from "@/components/notes/ProgressNotes";
import { BehaviorAnalysis } from "@/components/analysis/BehaviorAnalysis";
import { RiskAssessment } from "@/components/assessment/RiskAssessment";
import { SuccessPlan } from "@/components/planning/SuccessPlan";
import { KpiDashboard } from "@/components/dashboard/KpiDashboard";
import { ReportCenter } from "@/components/reports/ReportCenter";

interface YouthDashboardProps {
  youthId: string;
}

export const YouthDashboard = ({ youthId }: YouthDashboardProps) => {
  const [youth, setYouth] = useState<Youth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchYouthData = async () => {
      try {
        console.log("Fetching youth data for ID:", youthId);
        setIsLoading(true);
        setError(null);
        
        const { data: youthData, error: youthError } = await supabase
          .from("youths")
          .select("*")
          .eq("id", youthId)
          .single();
        
        if (youthError) {
          throw youthError;
        }
        
        if (youthData) {
          const mappedYouth = mapYouthFromSupabase(youthData);
          console.log("Mapped youth data:", mappedYouth);
          setYouth(mappedYouth);
        } else {
          setError("Youth profile not found");
        }
      } catch (err) {
        console.error("Error fetching youth data:", err);
        setError("Failed to load youth data");
      } finally {
        setIsLoading(false);
      }
    };

    if (youthId) {
      fetchYouthData();
    }
  }, [youthId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading youth profile...</p>
        </div>
      </div>
    );
  }

  if (error || !youth) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-red-700">{error || "An error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Button variant="outline" className="mb-4" onClick={() => window.location.reload()}>
          <ArrowLeft size={16} className="mr-2" />
          Back to Youth Selection
        </Button>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-blue-800">{youth.firstName} {youth.lastName}</h2>
              <p className="text-gray-600">Age: {youth.age} • Level {youth.level} • Points: {youth.pointTotal || 0}</p>
            </div>
            
            <div className="mt-3 md:mt-0 flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Print Profile
              </Button>
              <Button variant="outline" size="sm" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800">
                Edit Profile
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm rounded-lg overflow-x-auto flex w-full justify-start md:justify-center">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="behavior">Daily Points</TabsTrigger>
          <TabsTrigger value="notes">Progress Notes</TabsTrigger>
          <TabsTrigger value="analysis">Behavior Analysis</TabsTrigger>
          <TabsTrigger value="assessment">Risk Assessment</TabsTrigger>
          <TabsTrigger value="success">Success Plan</TabsTrigger>
          <TabsTrigger value="kpi">Dashboard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          {(() => {
            console.log("Rendering YouthProfile tab");
            return <YouthProfile youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="behavior">
          {(() => {
            console.log("Rendering BehaviorCard tab");
            return <BehaviorCard youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="notes">
          {(() => {
            console.log("Rendering ProgressNotes tab");
            return <ProgressNotes youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="analysis">
          {(() => {
            console.log("Rendering BehaviorAnalysis tab");
            return <BehaviorAnalysis youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="assessment">
          {(() => {
            console.log("Rendering RiskAssessment tab");
            return <RiskAssessment youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="success">
          {(() => {
            console.log("Rendering SuccessPlan tab");
            return <SuccessPlan youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="kpi">
          {(() => {
            console.log("Rendering KpiDashboard tab");
            return <KpiDashboard youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
        
        <TabsContent value="reports">
          {(() => {
            console.log("Rendering ReportCenter tab");
            return <ReportCenter youthId={youth.id} youth={youth} />;
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};
