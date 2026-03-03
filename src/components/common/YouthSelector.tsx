
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, User, ChevronRight, StickyNote, Award, TrendingUp } from "lucide-react";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { QuickNoteDialog } from "@/components/notes/QuickNoteDialog";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";
import { useAwards } from "@/contexts/AwardsContext";
import { PointSummaryInline } from "@/components/common/PointSummaryInline";

interface YouthSelectorProps {
  onSelectYouth: (youthId: string) => void;
  selectedYouthId?: string;
  showAwards?: boolean;
}

export const YouthSelector = ({ onSelectYouth, selectedYouthId, showAwards = true }: YouthSelectorProps) => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const [quickNoteYouth, setQuickNoteYouth] = useState<Youth | null>(null);

  // Use Supabase hook for youth operations
  const { youths, loading, error, loadYouths } = useYouth();

  // Use shared awards context — no more per-component calculation
  const { awards, loading: awardsLoading } = useAwards();

  useEffect(() => {
    loadYouths();
  }, []);

  // Check if a youth is Resident of the Week
  const isResidentOfWeek = (youthId: string): boolean => {
    return awards?.residentOfWeek?.youthId === youthId;
  };

  // Check if a youth is Resident of the Month
  const isResidentOfMonth = (youthId: string): boolean => {
    return awards?.residentOfMonth?.youthId === youthId;
  };

  // Check if a youth is Most Improved Resident (week)
  const isMostImprovedResident = (youthId: string): boolean => {
    return awards?.mostImprovedWeek?.youthId === youthId;
  };

  // Check if a youth is Most Improved Resident of the Month
  const isMostImprovedMonth = (youthId: string): boolean => {
    return awards?.mostImprovedMonth?.youthId === youthId;
  };

  // Sort youth alphabetically by last name, then first name
  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  // Handle youth selection
  const handleYouthSelect = (youthId: string) => {
    onSelectYouth(youthId);
  };

  const handleAddYouthDialogClose = () => {
    setIsAddYouthDialogOpen(false);
    loadYouths();
  };

  if (loading) {
    return (
      <div className="mb-4 p-2 border rounded bg-blue-50 animate-pulse">
        <div className="h-10 bg-slate-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 border border-red-300 rounded bg-red-50 text-red-700">
        <p>{error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={loadYouths}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Awards Summary */}
      {showAwards && (awardsLoading || awards) && (
        <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center text-amber-800">
              <Award className="mr-2 h-5 w-5" />
              Resident Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* Resident of the Week */}
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm overflow-hidden">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-white">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase line-clamp-1">Resident of the Week</p>
                  {awardsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">Calculating...</p>
                  ) : awards?.residentOfWeek ? (
                    <>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{awards.residentOfWeek.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                        {awards.residentOfWeek.evalAverage.toFixed(1)} avg • {awards.residentOfWeek.totalPoints} pts
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">No eligible resident</p>
                  )}
                </div>
              </div>

              {/* Resident of the Month */}
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-purple-200 dark:border-purple-800 shadow-sm overflow-hidden">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white">
                  <Award className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase line-clamp-1">Resident of the Month</p>
                  {awardsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">Calculating...</p>
                  ) : awards?.residentOfMonth ? (
                    <>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{awards.residentOfMonth.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                        {awards.residentOfMonth.totalPoints} pts • {awards.residentOfMonth.evalAverage.toFixed(1)} avg
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">No eligible resident</p>
                  )}
                </div>
              </div>

              {/* Most Improved Resident of the Week */}
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-sm overflow-hidden">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase line-clamp-1">Most Improved (Week)</p>
                  {awardsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">Calculating...</p>
                  ) : awards?.mostImprovedWeek ? (
                    <>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{awards.mostImprovedWeek.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                        +{(awards.mostImprovedWeek.improvement || 0).toFixed(2)} improvement
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">No eligible resident</p>
                  )}
                </div>
              </div>

              {/* Most Improved Resident of the Month */}
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-sky-200 dark:border-sky-800 shadow-sm overflow-hidden">
                <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-sky-600 dark:text-sky-400 font-bold uppercase line-clamp-1">Most Improved (Month)</p>
                  {awardsLoading ? (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">Calculating...</p>
                  ) : awards?.mostImprovedMonth ? (
                    <>
                      <p className="text-lg font-bold text-gray-900 dark:text-slate-100 truncate">{awards.mostImprovedMonth.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                        +{(awards.mostImprovedMonth.improvement || 0).toFixed(2)} improvement
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-slate-400 truncate">No eligible resident</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Select a Youth</h3>
        <Button 
          onClick={() => setIsAddYouthDialogOpen(true)} 
          variant="outline" 
          size="sm"
          className="whitespace-nowrap"
        >
          <PlusCircle size={16} className="mr-2" /> Add New Youth
        </Button>
      </div>

      {youths.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <User className="h-12 w-12 text-gray-400 dark:text-slate-500 mb-4" />
            <p className="text-gray-500 dark:text-slate-400 text-center">No youth profiles found</p>
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center mt-2">
              Click "Add New Youth" to create the first profile
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {sortedYouths.map((youth) => (
                <div
                  key={youth.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-slate-800 ${
                    selectedYouthId === youth.id
                      ? 'bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500'
                      : ''
                  }`}
                  onClick={() => handleYouthSelect(youth.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white font-semibold">
                        {youth.firstName.charAt(0)}{youth.lastName.charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900 dark:text-slate-100">
                        {youth.lastName}, {youth.firstName}
                      </h4>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Resident of the Week Badge */}
                        {isResidentOfWeek(youth.id) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            <Award size={12} className="mr-1" /> Resident of the Week
                          </span>
                        )}

                        {/* Resident of the Month Badge */}
                        {isResidentOfMonth(youth.id) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                            <Award size={12} className="mr-1" /> Resident of the Month
                          </span>
                        )}

                        {/* Most Improved Resident of the Week Badge */}
                        {isMostImprovedResident(youth.id) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <TrendingUp size={12} className="mr-1" /> Most Improved (Week)
                          </span>
                        )}

                        {/* Most Improved Resident of the Month Badge */}
                        {isMostImprovedMonth(youth.id) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-sky-100 text-sky-800 border border-sky-300">
                            <TrendingUp size={12} className="mr-1" /> Most Improved (Month)
                          </span>
                        )}

                        {/* Age Badge */}
                        {youth.age && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 border border-gray-300 dark:border-slate-600">
                            Age: {youth.age}
                          </span>
                        )}

                        {/* Level Badge */}
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          Level {youth.level}
                        </span>

                        {/* Points Badge */}
                        {/* Grade Badge */}
                        {(youth.currentGrade || youth.grade) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
                            Grade {youth.currentGrade || youth.grade}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <PointSummaryInline youthId={youth.id} compact />
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    title="Quick note"
                    className="p-2 rounded-md text-gray-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuickNoteYouth(youth);
                    }}
                  >
                    <StickyNote className="h-5 w-5" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {isAddYouthDialogOpen && (
        <AddYouthDialog onClose={handleAddYouthDialogClose} />
      )}

      {quickNoteYouth && (
        <QuickNoteDialog
          open={!!quickNoteYouth}
          onOpenChange={(open) => { if (!open) setQuickNoteYouth(null); }}
          youthId={quickNoteYouth.id}
          youthName={`${quickNoteYouth.firstName} ${quickNoteYouth.lastName}`}
        />
      )}
    </div>
  );
};
