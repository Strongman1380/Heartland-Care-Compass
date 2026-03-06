import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { DashboardKPIStrip } from "@/components/dashboard/DashboardKPIStrip";
import { QuickEntryWidgets } from "@/components/dashboard/QuickEntryWidgets";
import { QuickAccessYouthList } from "@/components/dashboard/QuickAccessYouthList";
import { SchoolScoresSummary } from "@/components/dashboard/SchoolScoresSummary";
import { NavigationLinks } from "@/components/dashboard/NavigationLinks";
import { AwardsSection } from "@/components/common/AwardsSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useYouth } from "@/hooks/useSupabase";
import { levelEventService, type LevelEvent } from "@/integrations/firebase/services";
import { BottomNav } from "@/components/layout/BottomNav";

const CollapsibleSection = ({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 group">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{title}</h2>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1 pb-4">{children}</CollapsibleContent>
    </Collapsible>
  );
};

const MainDashboard = () => {
  const { youths, loading, loadYouths } = useYouth();
  const [levelEvents, setLevelEvents] = useState<LevelEvent[]>([]);

  useEffect(() => {
    loadYouths();
  }, [loadYouths]);

  useEffect(() => {
    levelEventService
      .getRecent(10)
      .then(setLevelEvents)
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm text-red-700 mt-1">Heartland Boys Home Overview</p>
        </div>

        <div className="space-y-2">
          {/* KPI Strip */}
          <CollapsibleSection title="Key Metrics">
            <DashboardKPIStrip youths={youths} />
          </CollapsibleSection>

          {/* Quick Entry */}
          <CollapsibleSection title="Quick Actions">
            <QuickEntryWidgets />
          </CollapsibleSection>

          {/* Youth List */}
          <CollapsibleSection title="Youth">
            {loading ? (
              <p className="text-sm text-muted-foreground py-4">Loading youth...</p>
            ) : (
              <QuickAccessYouthList youths={youths} />
            )}
          </CollapsibleSection>

          {/* Awards */}
          <CollapsibleSection title="Awards">
            <AwardsSection />
          </CollapsibleSection>

          {/* School Scores + Level Changes side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CollapsibleSection title="School Scores">
              <SchoolScoresSummary youths={youths} />
            </CollapsibleSection>

            <CollapsibleSection title="Recent Level Changes">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  {levelEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">No level changes recorded yet.</p>
                  ) : (
                    <div className="divide-y">
                      {levelEvents.map((event) => (
                        <div key={event.id} className="flex items-center gap-3 px-4 py-2">
                          {event.direction === "level_up" ? (
                            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm">{event.youthName}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              Level {event.fromLevel} → {event.toLevel}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex-shrink-0 text-right">
                            <div>{event.changedBy}</div>
                            <div>{format(new Date(event.timestamp), "MMM d, h:mm a")}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </CollapsibleSection>
          </div>

          {/* Navigation Links */}
          <CollapsibleSection title="Navigate">
            <NavigationLinks />
          </CollapsibleSection>
        </div>
      </main>

      <BottomNav />

      <footer className="heartland-gradient py-6 text-center text-yellow-100 text-sm mt-12 hidden lg:block">
        <div className="container mx-auto px-4">
          <p className="font-medium">Heartland Boys Home Platform &copy; {new Date().getFullYear()}</p>
          <p className="text-yellow-200 text-xs mt-1">Empowering Youth Through Structure and Support</p>
        </div>
      </footer>
    </div>
  );
};

export default MainDashboard;
