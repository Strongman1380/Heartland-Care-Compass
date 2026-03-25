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
import { TrendingUp, TrendingDown, ChevronDown, NotebookPen, TriangleAlert, FileClock } from "lucide-react";
import { differenceInCalendarDays, format } from "date-fns";
import { useYouth } from "@/hooks/useSupabase";
import { caseNotesService, dailyRatingsService, levelEventService, type LevelEvent } from "@/integrations/firebase/services";
import { BottomNav } from "@/components/layout/BottomNav";
import { logger } from '@/utils/logger';
import { useGsapReveal } from "@/hooks/useGsap";

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
  const [prioritySnapshot, setPrioritySnapshot] = useState({
    missingDpn: 0,
    staleNotes: 0,
    loading: true,
  });

  useEffect(() => {
    loadYouths();
  }, [loadYouths]);

  useEffect(() => {
    levelEventService
      .getRecent(10)
      .then(setLevelEvents)
      .catch((error) => logger.error('Level event load failed:', error));
  }, []);

  useEffect(() => {
    let active = true;

    const loadPriorities = async () => {
      if (youths.length === 0) {
        if (active) {
          setPrioritySnapshot({ missingDpn: 0, staleNotes: 0, loading: false });
        }
        return;
      }

      if (active) {
        setPrioritySnapshot((prev) => ({ ...prev, loading: true }));
      }

      const today = format(new Date(), "yyyy-MM-dd");

      try {
        const snapshots = await Promise.all(
          youths.map(async (youth) => {
            const [todayRating, latestNote] = await Promise.all([
              dailyRatingsService.getByDate(youth.id, today),
              caseNotesService.getByYouthId(youth.id, 1),
            ]);

            const lastNoteDate = latestNote[0]?.date ? new Date(latestNote[0].date) : null;
            const noteAge = lastNoteDate ? differenceInCalendarDays(new Date(), lastNoteDate) : Number.POSITIVE_INFINITY;

            return {
              missingDpn: !todayRating,
              staleNote: !lastNoteDate || noteAge >= 3,
            };
          })
        );

        if (!active) return;

        setPrioritySnapshot({
          missingDpn: snapshots.filter((item) => item.missingDpn).length,
          staleNotes: snapshots.filter((item) => item.staleNote).length,
          loading: false,
        });
      } catch (error) {
        logger.error("Failed to load dashboard priorities:", error);
        if (active) {
          setPrioritySnapshot({ missingDpn: 0, staleNotes: 0, loading: false });
        }
      }
    };
    loadPriorities();

    return () => {
      active = false;
    };
  }, [youths]);

  const revealRef = useGsapReveal({ stagger: 0.15 });

  return (
    <div className="min-h-screen bg-background" ref={revealRef}>
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
        {/* Title */}
        <div className="mb-6 gsap-reveal">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-primary-dark to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm font-medium text-muted-foreground mt-1 px-1">Heartland Boys Home Overview</p>
        </div>

        <div className="space-y-4">
          {/* KPI Strip */}
          <div className="gsap-reveal">
            <CollapsibleSection title="Key Metrics">
              <DashboardKPIStrip youths={youths} />
            </CollapsibleSection>
          </div>

          {/* Quick Entry */}
          <div className="gsap-reveal">
            <CollapsibleSection title="Quick Actions">
              <QuickEntryWidgets />
            </CollapsibleSection>
          </div>

          <div className="gsap-reveal">
            <CollapsibleSection title="Today's Priorities">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="interactive-card border-l-4 border-l-primary/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                      <NotebookPen className="h-4 w-4 text-primary" />
                      DPN Coverage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-primary">
                      {prioritySnapshot.loading ? "..." : prioritySnapshot.missingDpn}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Youth still missing a DPN entry today.</p>
                  </CardContent>
                </Card>

                <Card className="interactive-card border-l-4 border-l-secondary/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                      <FileClock className="h-4 w-4 text-secondary/80" />
                      Case Note Follow-Up
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-primary">
                      {prioritySnapshot.loading ? "..." : prioritySnapshot.staleNotes}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Youth with no case note in the last 3 days.</p>
                  </CardContent>
                </Card>

                <Card className="interactive-card border-l-4 border-l-blue-500/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                      <TriangleAlert className="h-4 w-4 text-blue-500" />
                      Active Census
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-black text-primary">{youths.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">Active youth currently in the program.</p>
                  </CardContent>
                </Card>
              </div>
            </CollapsibleSection>
          </div>

          {/* Youth List */}
          <div className="gsap-reveal">
            <CollapsibleSection title="Youth">
              {loading ? (
                <p className="text-sm text-muted-foreground py-4">Loading youth...</p>
              ) : (
                <QuickAccessYouthList youths={youths} />
              )}
            </CollapsibleSection>
          </div>

          {/* Awards */}
          <div className="gsap-reveal">
            <CollapsibleSection title="Awards">
              <AwardsSection />
            </CollapsibleSection>
          </div>

          {/* School Scores + Level Changes side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 gsap-reveal">
            <CollapsibleSection title="School Scores">
              <div className="interactive-card p-0 overflow-hidden">
                <SchoolScoresSummary youths={youths} />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Recent Level Changes">
              <Card className="interactive-card overflow-hidden">
                <CardContent className="p-0">
                  {levelEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4">No level changes recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {levelEvents.map((event) => (
                        <div key={event.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                          {event.direction === "level_up" ? (
                            <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-sm text-primary">{event.youthName}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              Level {event.fromLevel} → {event.toLevel}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex-shrink-0 text-right">
                            <div className="font-medium">{event.changedBy}</div>
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
          <div className="gsap-reveal">
            <CollapsibleSection title="Navigate">
              <NavigationLinks />
            </CollapsibleSection>
          </div>
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
