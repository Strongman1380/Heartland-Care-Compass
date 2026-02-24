
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { YouthDashboard } from "@/components/dashboard/YouthDashboard";
import { YouthSelector } from "@/components/common/YouthSelector";
import { RapidPlacementAssessment } from "@/components/assessment/RapidPlacementAssessment";

const Dashboard = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | undefined>(undefined);
  const [showAdmin, setShowAdmin] = useState(false);

  const handleYouthSelect = (youthId: string) => {
    setSelectedYouthId(youthId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header 
        showAdmin={showAdmin}
        onAdminToggle={() => {
          setShowAdmin(!showAdmin);
          setSelectedYouthId(undefined);
        }}
      />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        {showAdmin ? (
          <RapidPlacementAssessment />
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
                Dashboard
              </h1>
              <p className="text-red-700 text-base sm:text-lg">Overview of youth performance and analytics</p>
            </div>
            
            {!selectedYouthId ? (
              <YouthSelector 
                onSelectYouth={handleYouthSelect}
                selectedYouthId={selectedYouthId}
              />
            ) : (
              <YouthDashboard youthId={selectedYouthId} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
