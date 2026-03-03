import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { BehaviorAnalysis } from "@/components/analysis/BehaviorAnalysis";
import { YouthSelector } from "@/components/common/YouthSelector";
import { AwardsSection } from "@/components/common/AwardsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";

const BehaviorAnalysisPage = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { youths, loadYouths } = useYouth();
  const didLoad = useRef(false);

  useEffect(() => {
    if (!didLoad.current) {
      didLoad.current = true;
      loadYouths();
    }
  }, []);

  useEffect(() => {
    if (!selectedYouthId) {
      setSelectedYouth(null);
      return;
    }
    const youth = youths.find(y => y.id === selectedYouthId);
    if (youth) {
      setSelectedYouth(youth);
    }
  }, [selectedYouthId, youths]);

  const handleYouthSelect = (youthId: string) => {
    setIsLoading(true);
    setSelectedYouthId(youthId);
    setTimeout(() => setIsLoading(false), 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Behavior Analysis
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Document and analyze behavioral patterns and triggers</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <YouthSelector onSelectYouth={handleYouthSelect} selectedYouthId={selectedYouthId || undefined} showAwards={false} />
          </div>

          <div className="md:col-span-3">
            {isLoading ? (
              <div className="space-y-4 p-6 border rounded-lg bg-white">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
                <Skeleton className="h-40 w-full" />
              </div>
            ) : selectedYouthId && selectedYouth ? (
              <BehaviorAnalysis youthId={selectedYouthId} youth={selectedYouth} />
            ) : (
              <div className="space-y-4">
                <div className="p-6 border rounded-lg bg-white text-center">
                  <p className="text-gray-500 text-lg font-medium">Select a youth from the list to begin behavior analysis</p>
                </div>
                <AwardsSection />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BehaviorAnalysisPage;
