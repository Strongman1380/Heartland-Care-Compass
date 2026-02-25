
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle, BarChart3, LogOut, LogIn, Calendar, Gavel, BookOpen,
  ClipboardPaste, ShieldAlert, Home, Star, Bell, FileText,
  GraduationCap, TrendingUp, Database, ClipboardList, Clock,
  Menu, ChevronDown, LayoutDashboard,
  Building2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AddYouthDialog } from "@/components/youth/AddYouthDialog";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: { path: string; label: string; icon: React.ElementType }[];
}

const navGroups: NavGroup[] = [
  {
    label: "Daily",
    icon: Star,
    items: [
      { path: "/daily-points", label: "Daily Points", icon: Star },
      { path: "/shift-scores", label: "Shift Scores", icon: Clock },
      { path: "/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    label: "Documentation",
    icon: BookOpen,
    items: [
      { path: "/progress-notes", label: "Case Notes", icon: BookOpen },
      { path: "/incident-reports", label: "Incident Reports", icon: ShieldAlert },
      { path: "/referrals", label: "Referrals", icon: ClipboardPaste },
    ],
  },
  {
    label: "Reports",
    icon: FileText,
    items: [
      { path: "/monthly-progress", label: "Monthly Progress", icon: Calendar },
      { path: "/court-report", label: "Court Report", icon: Gavel },
      { path: "/reports", label: "Report Center", icon: FileText },
      { path: "/behavior-analysis", label: "Behavior Analysis", icon: TrendingUp },
    ],
  },
  {
    label: "School",
    icon: GraduationCap,
    items: [
      { path: "/school/scores", label: "School Scores", icon: GraduationCap },
      { path: "/school/dashboard", label: "Academic Dashboard", icon: LayoutDashboard },
      { path: "/school/incidents", label: "School Incidents", icon: ShieldAlert },
    ],
  },
  {
    label: "Admin",
    icon: BarChart3,
    items: [
      { path: "/dashboard", label: "Dashboard", icon: BarChart3 },
      { path: "/assessment-kpi", label: "KPI Dashboard", icon: ClipboardList },
      { path: "/admin/facility", label: "Facility Ops", icon: Building2 },
      { path: "/migrate-data", label: "Data Migration", icon: Database },
    ],
  },
];

export const Header = () => {
  const [isAddYouthDialogOpen, setIsAddYouthDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOutUser } = useAuth();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const isGroupActive = (group: NavGroup) =>
    group.items.some((item) => isActive(item.path));

  const handleAddYouthDialogClose = () => setIsAddYouthDialogOpen(false);

  const handleSignOut = async () => {
    await signOutUser();
    toast({ title: "Signed out" });
    navigate("/auth");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/80 shadow-sm">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between gap-2">

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group flex-shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`}
                alt="Heartland Boys Home Logo"
                className="h-8 w-auto rounded-lg shadow-sm group-hover:shadow-md transition-shadow duration-200"
              />
              <div className="flex flex-col">
                <h1 className="text-lg font-bold bg-gradient-to-r from-red-800 via-red-700 to-amber-600 bg-clip-text text-transparent leading-tight">
                  Heartland Youth Compass
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Care Management System</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
              {/* Home direct link */}
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                  ${isActive("/") ? "bg-red-50 text-red-700" : "text-gray-600 hover:text-red-700 hover:bg-red-50"}`}
              >
                <Home className="h-4 w-4" />
                <span>Home</span>
              </Link>

              {/* Dropdown groups */}
              {navGroups.map((group) => {
                const GroupIcon = group.icon;
                const active = isGroupActive(group);
                return (
                  <DropdownMenu key={group.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                          ${active ? "bg-red-50 text-red-700" : "text-gray-600 hover:text-red-700 hover:bg-red-50"}`}
                      >
                        <GroupIcon className="h-4 w-4" />
                        <span>{group.label}</span>
                        <ChevronDown className="h-3 w-3 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-xs text-muted-foreground">{group.label}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {group.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <DropdownMenuItem key={item.path} asChild>
                            <Link
                              to={item.path}
                              className={`flex items-center gap-2 cursor-pointer
                                ${isActive(item.path) ? "text-red-700 font-medium" : ""}`}
                            >
                              <ItemIcon className="h-4 w-4" />
                              {item.label}
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
            </nav>

            {/* Desktop Right Actions */}
            <div className="hidden lg:flex items-center gap-1 flex-shrink-0">
              {user ? (
                <Badge variant="outline" className="text-green-700 border-green-200 bg-green-50 text-xs">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1" />
                  Online
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-200 text-xs">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1" />
                  Offline
                </Badge>
              )}

              {!user ? (
                <Button onClick={() => navigate("/auth")} variant="ghost" size="sm" className="text-xs h-8 px-2">
                  <LogIn className="h-3.5 w-3.5 mr-1" />
                  Sign In
                </Button>
              ) : (
                <Button onClick={handleSignOut} variant="ghost" size="sm" className="text-xs h-8 px-2">
                  <LogOut className="h-3.5 w-3.5 mr-1" />
                  Sign Out
                </Button>
              )}

              <Button
                onClick={() => setIsAddYouthDialogOpen(true)}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-sm px-3 text-xs h-8"
                size="sm"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1" />
                Add Youth
              </Button>
            </div>

            {/* Mobile Right Actions */}
            <div className="flex items-center gap-1 lg:hidden">
              {user && (
                <Button
                  onClick={() => setIsAddYouthDialogOpen(true)}
                  size="sm"
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-9 w-9 p-0"
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              )}

              {/* Hamburger Menu */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 overflow-y-auto">
                  <SheetHeader className="pb-4 border-b">
                    <SheetTitle className="text-left text-red-800">Navigation</SheetTitle>
                  </SheetHeader>

                  <div className="py-4 space-y-4">
                    {/* Home */}
                    <Link
                      to="/"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive("/") ? "bg-red-50 text-red-700" : "text-gray-700 hover:bg-gray-50"}`}
                    >
                      <Home className="h-4 w-4" />
                      Home
                    </Link>

                    {/* Groups */}
                    {navGroups.map((group) => {
                      const GroupIcon = group.icon;
                      return (
                        <div key={group.label}>
                          <p className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            <GroupIcon className="h-3.5 w-3.5" />
                            {group.label}
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {group.items.map((item) => {
                              const ItemIcon = item.icon;
                              return (
                                <Link
                                  key={item.path}
                                  to={item.path}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ml-2
                                    ${isActive(item.path) ? "bg-red-50 text-red-700 font-medium" : "text-gray-700 hover:bg-gray-50"}`}
                                >
                                  <ItemIcon className="h-4 w-4" />
                                  {item.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {/* Auth / Sign out */}
                    <div className="border-t pt-4">
                      {!user ? (
                        <button
                          onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <LogIn className="h-4 w-4" />
                          Sign In
                        </button>
                      ) : (
                        <button
                          onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 w-full"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

          </div>
        </div>
      </header>

      {isAddYouthDialogOpen && (
        <AddYouthDialog
          onClose={handleAddYouthDialogClose}
          onSuccess={() => {
            handleAddYouthDialogClose();
            window.location.reload();
          }}
        />
      )}
    </>
  );
};
