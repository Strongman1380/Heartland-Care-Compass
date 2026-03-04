
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { EnhancedCaseNotes } from "@/components/notes/EnhancedCaseNotes";
import { ReportsTab } from "@/components/reports/ReportsTab";
import { ProgressEvaluationReport } from "@/components/reports/ProgressEvaluationReport";
import { Badge } from "@/components/ui/badge";
import { User, CheckSquare, FileText, BarChart3, ClipboardList, ArrowLeft, ArrowRightLeft } from "lucide-react";
import { Youth } from "@/integrations/firebase/services";

interface YouthDetailViewProps {
  youths: Youth[];
  selectedYouth: Youth;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToHome: () => void;
  onYouthSelect: (youth: Youth) => void;
  onYouthUpdated: (updated?: Youth) => void;
}

export const YouthDetailView = ({
  youths,
  selectedYouth,
  activeTab,
  onTabChange,
  onBackToHome,
  onYouthSelect,
  onYouthUpdated
}: YouthDetailViewProps) => {
  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
          <Button
            variant="outline"
            onClick={onBackToHome}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Youth List
          </Button>
          <div className="text-left sm:text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
              {selectedYouth.firstName} {selectedYouth.lastName}
            </h1>
            <p className="text-red-600 mt-1 sm:mt-2">Level {selectedYouth.level}</p>
          </div>
          <div className="hidden sm:block w-32"></div>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-red-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="border-b border-red-100 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <ArrowRightLeft className="h-4 w-4" />
                Quick Switch Youth
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Stay on this screen and switch directly to another youth without backing out.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50">
                Current: {selectedYouth.lastName}, {selectedYouth.firstName}
              </Badge>
              <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">
                Level {selectedYouth.level}
              </Badge>
            </div>
          </div>
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {sortedYouths.map((youth) => {
              const isCurrent = youth.id === selectedYouth.id;
              return (
                <button
                  key={youth.id}
                  type="button"
                  onClick={() => onYouthSelect(youth)}
                  className={`min-w-[220px] shrink-0 rounded-xl border p-3 text-left transition-all ${
                    isCurrent
                      ? "border-red-300 bg-red-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">
                        {youth.lastName}, {youth.firstName}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
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

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="bg-white p-1 shadow-lg rounded-lg overflow-x-auto flex w-full justify-around sm:justify-center border-2 border-yellow-300">
          <TabsTrigger value="profile" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2 sm:px-3.5 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <User size={18} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2 sm:px-3.5 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <CheckSquare size={18} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Level Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2 sm:px-3.5 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <FileText size={18} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Case Notes</span>
          </TabsTrigger>
          <TabsTrigger value="evaluations" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2 sm:px-3.5 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <ClipboardList size={18} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Evaluations</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5 sm:gap-2 min-h-[44px] px-2 sm:px-3.5 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <BarChart3 size={18} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <YouthProfile
            youth={selectedYouth}
            onBack={onBackToHome}
            onYouthUpdated={onYouthUpdated}
          />
        </TabsContent>

        <TabsContent value="behavior">
          <BehaviorCard youthId={selectedYouth.id} youth={selectedYouth} onYouthUpdated={onYouthUpdated} />
        </TabsContent>

        <TabsContent value="notes">
          <EnhancedCaseNotes youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>

        <TabsContent value="evaluations">
          <ProgressEvaluationReport youth={selectedYouth} />
        </TabsContent>

        <TabsContent value="reports">
          <ReportsTab youth={selectedYouth} />
        </TabsContent>
      </Tabs>
    </>
  );
};
