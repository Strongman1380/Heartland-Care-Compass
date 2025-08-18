
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { YouthProfilesTable } from "@/components/youth/YouthProfilesTable";
import { RapidPlacementAssessment } from "@/components/assessment/RapidPlacementAssessment";
import { fetchAllYouths } from "@/utils/local-storage-utils";
import { type Youth } from "@/types/app-types";
import { toast } from "sonner";

const Profiles = () => {
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  const loadYouths = () => {
    try {
      setLoading(true);
      const youthsData = fetchAllYouths();
      
      const validYouths = youthsData.filter(youth => {
        const hasValidId = youth.id && typeof youth.id === 'string' && youth.id.trim() !== "";
        const hasValidNames = youth.firstName && youth.lastName && 
                             youth.firstName.trim() !== "" && youth.lastName.trim() !== "";
        return hasValidId && hasValidNames;
      });
        
      setYouths(validYouths);
    } catch (err) {
      console.error("Error fetching youths:", err);
      toast.error("Failed to load youth profiles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYouths();
  }, []);

  const handleYouthSelect = (youth: Youth) => {
    setSelectedYouth(youth);
  };

  const handleBackToList = () => {
    setSelectedYouth(null);
  };

  const handleYouthUpdated = () => {
    loadYouths();
    setSelectedYouth(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header 
        showAdmin={showAdmin}
        onAdminToggle={() => {
          setShowAdmin(!showAdmin);
          setSelectedYouth(null);
        }}
      />
      <main className="container mx-auto px-4 py-8">
        {showAdmin ? (
          <RapidPlacementAssessment />
        ) : (
          <>
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
                Youth Profiles
              </h1>
              <p className="text-red-700 text-lg">Manage and view detailed youth profiles</p>
            </div>
            
            {selectedYouth ? (
              <YouthProfile 
                youth={selectedYouth} 
                onBack={handleBackToList}
                onYouthUpdated={handleYouthUpdated}
              />
            ) : (
              <YouthProfilesTable 
                youths={youths}
                loading={loading}
                onYouthSelect={handleYouthSelect}
                onYouthUpdated={handleYouthUpdated}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Profiles;
