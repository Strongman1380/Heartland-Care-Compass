import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Youth } from "@/integrations/firebase/services";
import { getYouthStats, type YouthScoreStats } from "@/utils/schoolScores";

interface SchoolScoresSummaryProps {
  youths: Youth[];
}

export const SchoolScoresSummary = ({ youths }: SchoolScoresSummaryProps) => {
  const [stats, setStats] = useState<Record<string, YouthScoreStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      const results: Record<string, YouthScoreStats> = {};
      await Promise.all(
        youths.map(async (youth) => {
          try {
            const stat = await getYouthStats(youth.id);
            if (stat && !cancelled) {
              results[youth.id] = stat;
            }
          } catch {
            // skip
          }
        })
      );
      if (!cancelled) {
        setStats(results);
        setLoading(false);
      }
    };

    loadStats();
    return () => { cancelled = true; };
  }, [youths]);

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            School Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const youthsWithScores = youths
    .filter((y) => stats[y.id])
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  if (youthsWithScores.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            School Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No school scores recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-blue-600" />
          School Scores — This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {youthsWithScores.map((youth) => {
            const s = stats[youth.id];
            const avg = s.recentAverage;
            const trend = s.trend;

            return (
              <div key={youth.id} className="flex items-center justify-between px-4 py-2">
                <span className="text-sm font-medium truncate">
                  {youth.lastName}, {youth.firstName}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tabular-nums">
                    {avg !== null ? avg.toFixed(1) : "—"}
                  </span>
                  {trend === "improving" && <TrendingUp className="h-3.5 w-3.5 text-green-600" />}
                  {trend === "declining" && <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                  {trend === "stable" && <Minus className="h-3.5 w-3.5 text-gray-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
