import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import type { Youth } from "@/integrations/firebase/services";
import { PointSummaryInline } from "@/components/common/PointSummaryInline";

interface QuickAccessYouthListProps {
  youths: Youth[];
}

export const QuickAccessYouthList = ({ youths }: QuickAccessYouthListProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const cmp = a.lastName.localeCompare(b.lastName);
      return cmp !== 0 ? cmp : a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedYouths;
    const q = search.toLowerCase();
    return sortedYouths.filter(
      (y) =>
        y.firstName.toLowerCase().includes(q) ||
        y.lastName.toLowerCase().includes(q)
    );
  }, [sortedYouths, search]);

  const getInitials = (y: Youth) =>
    `${y.firstName.charAt(0)}${y.lastName.charAt(0)}`.toUpperCase();

  const getLevelColor = (level: number | null | undefined) => {
    if (!level) return "bg-gray-100 text-gray-600";
    if (level >= 8) return "bg-green-100 text-green-800";
    if (level >= 5) return "bg-blue-100 text-blue-800";
    if (level >= 3) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search youth..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {filtered.map((youth) => (
          <Card
            key={youth.id}
            className="cursor-pointer hover:shadow-md hover:border-red-200 transition-all duration-200 border-0 shadow-sm"
            onClick={() => navigate(`/youth/${youth.id}`)}
          >
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(youth)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {youth.lastName}, {youth.firstName}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${getLevelColor(youth.level)}`}>
                    Lvl {youth.level || "—"}
                  </Badge>
                  <PointSummaryInline youthId={youth.id} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          {search ? "No youth match your search." : "No active youth."}
        </p>
      )}
    </div>
  );
};
