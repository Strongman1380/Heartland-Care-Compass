
import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { YouthSelector } from "@/components/common/YouthSelector";
import { EnhancedCaseNotes } from "@/components/notes/EnhancedCaseNotes";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";

const ProgressNotesPage = () => {
  const [selectedYouthId, setSelectedYouthId] = useState<string | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { youths, loadYouths } = useYouth();

  useEffect(() => {
    loadYouths();
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    };
  }, []);

  const handleYouthSelect = (youthId: string) => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    setIsLoading(true);
    setSelectedYouthId(youthId);
    const youth = youths.find((y) => y.id === youthId);
    setSelectedYouth(youth || null);
    loadingTimerRef.current = setTimeout(() => {
      loadingTimerRef.current = null;
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Case Notes
          </h1>
          <p className="text-red-700 text-base sm:text-lg">
            Session, shift, general, and team meeting notes
          </p>
        </div>

        {!selectedYouthId ? (
          <YouthSelector onSelectYouth={handleYouthSelect} showAwards={false} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <YouthSelector
                onSelectYouth={handleYouthSelect}
                selectedYouthId={selectedYouthId}
                showAwards={false}
              />
            </div>
            <div className="md:col-span-3">
              {isLoading ? (
                <div className="space-y-4 p-6 border rounded-lg bg-white">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <EnhancedCaseNotes youthId={selectedYouthId} youth={selectedYouth} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProgressNotesPage;
