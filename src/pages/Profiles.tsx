
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { YouthProfilesTable } from "@/components/youth/YouthProfilesTable";
import { RapidPlacementAssessment } from "@/components/assessment/RapidPlacementAssessment";
import { type Youth } from "@/integrations/supabase/services";
import { toast } from "sonner";
import { PasteYouthProfileDialog } from "@/components/youth/PasteYouthProfileDialog";
import { useYouth } from "@/hooks/useSupabase";

const Profiles = () => {
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const { youths, loading, loadYouths } = useYouth();
  const [showAdmin, setShowAdmin] = useState(false);

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
      <Header />
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
              <div className="mt-4 flex justify-center">
                <PasteYouthProfileDialog onImported={() => loadYouths()} />
              </div>
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
