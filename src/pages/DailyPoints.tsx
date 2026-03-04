
import { useState, useEffect, useMemo, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { YouthSelector } from "@/components/common/YouthSelector";
import { AwardsSection } from "@/components/common/AwardsSection";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";
import { ArrowRightLeft } from "lucide-react";

const DailyPoints = () => {
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

  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName);
      return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  const handleYouthSelect = (youthId: string) => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
    setIsLoading(true);
    setSelectedYouthId(youthId);
    setSelectedYouth(youths.find(y => y.id === youthId) || null);
    loadingTimerRef.current = setTimeout(() => {
      loadingTimerRef.current = null;
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent mb-4">
            Daily Points Management
          </h1>
          <p className="text-red-700 text-base sm:text-lg">Track and manage daily behavior points</p>
        </div>

        {!selectedYouthId ? (
          /* No youth selected — full-width: awards → selector list */
          <div className="space-y-6">
            <AwardsSection />
            <YouthSelector
              onSelectYouth={handleYouthSelect}
              showAwards={false}
            />
          </div>
        ) : (
          /* Youth selected — horizontal switcher at top, full-width BehaviorCard below */
          <div className="space-y-6">
            {/* Horizontal youth switcher */}
            <div className="rounded-2xl border border-red-100 bg-white/95 shadow-sm">
              <div className="border-b border-red-100 px-4 py-3 sm:px-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                      <ArrowRightLeft className="h-4 w-4" />
                      Quick Switch Youth
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Stay on this screen and switch directly to another youth without backing out.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50">
                      Current: {selectedYouth?.lastName}, {selectedYouth?.firstName}
                    </Badge>
                    <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">
                      Level {selectedYouth?.level}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 sm:px-5">
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {sortedYouths.map((youth) => {
                    const isCurrent = youth.id === selectedYouthId;
                    return (
                      <button
                        key={youth.id}
                        type="button"
                        onClick={() => !isCurrent && handleYouthSelect(youth.id)}
                        className={`min-w-[200px] shrink-0 rounded-xl border p-3 text-left transition-all ${
                          isCurrent
                            ? "border-red-300 bg-red-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate">
                              {youth.lastName}, {youth.firstName}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                                Age {youth.age || "N/A"}
                              </span>
                              <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                                Level {youth.level}
                              </span>
                              {(youth.currentGrade || youth.grade) && (
                                <span className="inline-flex items-center rounded-md border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-xs text-yellow-800">
                                  Grade {youth.currentGrade || youth.grade}
                                </span>
                              )}
                            </div>
                          </div>
                          {isCurrent && (
                            <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              Open
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Behavior card — full width */}
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
            ) : (
              <BehaviorCard youthId={selectedYouthId} youth={selectedYouth} />
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default DailyPoints;
