
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Star, FileText, Bell, MoreHorizontal, BarChart3, BookOpen, Calendar, Gavel, GraduationCap, TrendingUp, Database, ClipboardList, ShieldAlert, ClipboardPaste, Clock, Upload } from "lucide-react";
import { useUnresolvedAlertCount } from "@/hooks/useUnresolvedAlertCount";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const primaryTabs = [
  { path: "/", label: "Home", icon: Home },
  { path: "/progress-notes", label: "Notes", icon: BookOpen },
  { path: "/referrals", label: "Referrals", icon: ClipboardPaste },
  { path: "/alerts", label: "Alerts", icon: Bell },
];

const secondaryRoutes = [
  { path: "/daily-points", label: "Points", icon: Star },
  { path: "/incident-reports", label: "Incidents", icon: ShieldAlert },
  { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/monthly-progress", label: "Monthly Progress", icon: Calendar },
  { path: "/court-report", label: "Court Report", icon: Gavel },
  { path: "/shift-scores", label: "Shift Scores", icon: Clock },
  { path: "/school/scores", label: "School", icon: GraduationCap },
  { path: "/behavior-analysis", label: "Behavior Analysis", icon: TrendingUp },
  { path: "/assessment-kpi", label: "KPI Dashboard", icon: ClipboardList },
  { path: "/data-upload", label: "Data Upload", icon: Upload },
  { path: "/migrate-data", label: "Data Migration", icon: Database },
];

export const BottomNav = () => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const unresolvedAlertCount = useUnresolvedAlertCount();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isSecondaryActive = secondaryRoutes.some((r) => isActive(r.path));

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-white/95 backdrop-blur-lg border-t border-border/60 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          const showBadge = tab.path === "/alerts" && unresolvedAlertCount > 0;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] pt-2 pb-1 transition-colors
                ${active
                  ? "text-[#823131]"
                  : "text-gray-400 active:text-gray-600"
                }
              `}
            >
              <span className="relative">
                <Icon className={`h-5 w-5 ${active ? "stroke-[2.5]" : ""}`} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                    {unresolvedAlertCount > 99 ? "99+" : unresolvedAlertCount}
                  </span>
                )}
              </span>
              <span className={`text-[10px] leading-tight hidden min-[321px]:block ${active ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#823131]" />
              )}
            </Link>
          );
        })}

        {/* More button */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] pt-2 pb-1 transition-colors
                ${isSecondaryActive
                  ? "text-[#823131]"
                  : "text-gray-400 active:text-gray-600"
                }
              `}
            >
              <MoreHorizontal className={`h-5 w-5 ${isSecondaryActive ? "stroke-[2.5]" : ""}`} />
              <span className={`text-[10px] leading-tight hidden min-[321px]:block ${isSecondaryActive ? "font-semibold" : "font-medium"}`}>
                More
              </span>
              {isSecondaryActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-[#823131]" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-[env(safe-area-inset-bottom)]">
            <SheetHeader>
              <SheetTitle className="text-left text-[#823131]">More</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 pt-4 pb-2">
              {secondaryRoutes.map((route) => {
                const Icon = route.icon;
                const active = isActive(route.path);

                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    onClick={() => setMoreOpen(false)}
                    className={`
                      flex flex-col items-center gap-2 rounded-xl p-3 min-h-[76px] justify-center transition-colors
                      ${active
                        ? "bg-red-50 text-[#823131] ring-1 ring-[#823131]/20"
                        : "bg-gray-50 text-gray-600 active:bg-gray-100"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[11px] font-medium leading-tight text-center">{route.label}</span>
                  </Link>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
