import { useEffect, useMemo, useState } from "react";
import { Search, FileText, Users, BookOpen, ShieldAlert, Star, Clock, Building2, Database, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface SearchItem {
  id: string;
  title: string;
  description: string;
  category: string;
  path: string;
  icon: string;
  keywords: string[];
}

const searchItems: SearchItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    description: "Main dashboard and overview",
    category: "Navigation",
    path: "/",
    icon: "home",
    keywords: ["home", "overview", "main"]
  },
  {
    id: "youth-list",
    title: "Youth List",
    description: "View and manage all youth",
    category: "Youth",
    path: "/youth-list",
    icon: "users",
    keywords: ["youth", "children", "residents", "list"]
  },
  {
    id: "progress-notes",
    title: "Progress Notes",
    description: "Case notes and documentation",
    category: "Documentation",
    path: "/progress-notes",
    icon: "book",
    keywords: ["notes", "case", "documentation", "progress"]
  },
  {
    id: "incident-reports",
    title: "Incident Reports",
    description: "Record and view incidents",
    category: "Documentation",
    path: "/incident-reports",
    icon: "shield",
    keywords: ["incident", "accident", "behavior", "report"]
  },
  {
    id: "daily-points",
    title: "Daily Points",
    description: "Track daily behavior points",
    category: "Operations",
    path: "/daily-points",
    icon: "star",
    keywords: ["points", "behavior", "daily", "tracking"]
  },
  {
    id: "shift-scores",
    title: "Shift Scores",
    description: "Shift evaluations and scores",
    category: "Operations",
    path: "/shift-scores",
    icon: "clock",
    keywords: ["shift", "scores", "evaluation"]
  },
  {
    id: "assessment-kpi",
    title: "KPI Dashboard",
    description: "Assessment and KPI tracking",
    category: "Operations",
    path: "/assessment-kpi",
    icon: "clipboard",
    keywords: ["kpi", "assessment", "metrics", "dashboard"]
  },
  {
    id: "reports",
    title: "Reports",
    description: "Generate and view reports",
    category: "Documentation",
    path: "/reports",
    icon: "file",
    keywords: ["report", "monthly", "court", "document"]
  },
  {
    id: "referrals",
    title: "Referrals",
    description: "Manage referrals",
    category: "Documentation",
    path: "/referrals",
    icon: "clipboard",
    keywords: ["referral", "intake", "application"]
  },
  {
    id: "admin-facility",
    title: "Facility Ops",
    description: "Facility administration",
    category: "Admin",
    path: "/admin/facility",
    icon: "building",
    keywords: ["facility", "admin", "settings"]
  },
  {
    id: "data-upload",
    title: "Data Upload",
    description: "Upload and import data",
    category: "Operations",
    path: "/data-upload",
    icon: "upload",
    keywords: ["upload", "import", "data", "csv"]
  },
  {
    id: "alerts",
    title: "System Ops",
    description: "System alerts and operations",
    category: "Admin",
    path: "/alerts",
    icon: "database",
    keywords: ["alerts", "system", "ops", "admin"]
  },
];

const iconMap: Record<string, React.ElementType> = {
  home: FileText,
  users: Users,
  book: BookOpen,
  shield: ShieldAlert,
  star: Star,
  clock: Clock,
  clipboard: Building2,
  file: FileText,
  building: Building2,
  upload: Database,
  database: Database,
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const normalizedSearch = search.trim().toLowerCase();
  const results = useMemo(() => {
    if (!normalizedSearch) {
      return [];
    }

    return searchItems.filter((item) => {
      const haystacks = [
        item.title,
        item.description,
        item.category,
        ...item.keywords,
      ];

      return haystacks.some((value) => value.toLowerCase().includes(normalizedSearch));
    });
  }, [normalizedSearch]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onOpenChange]);

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setSearch("");
  };

  const groupedResults = results.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, SearchItem[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-muted-foreground" />
            Search Heartland Compass
          </DialogTitle>
          <DialogDescription className="sr-only">
            Search for pages, features, and documentation
          </DialogDescription>
        </DialogHeader>
        
        <div className="px-6 pb-4">
          <Input
            autoFocus
            placeholder="Type to search... (e.g., 'youth', 'reports', 'incidents')"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 text-lg"
          />
        </div>

        <ScrollArea className="max-h-[400px] px-6 pb-6">
          {results.length === 0 && search && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No results found for "{search}"</p>
            </div>
          )}

          {!search && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">
                Search for pages, features, or documentation
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <Badge variant="secondary">Ctrl+K</Badge>
                <span className="text-xs">to quick search</span>
              </div>
            </div>
          )}

          {Object.entries(groupedResults).map(([category, items]) => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = iconMap[item.icon] || FileText;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item.path)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors text-left group"
                    >
                      <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {item.description}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Hook to use command palette globally
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
