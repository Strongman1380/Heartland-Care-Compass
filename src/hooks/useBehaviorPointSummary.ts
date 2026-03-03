import { useMemo } from "react";
import { endOfMonth, format, startOfMonth, subDays } from "date-fns";
import { useBehaviorPoints } from "@/hooks/useSupabase";

const toIso = (value: Date) => format(value, "yyyy-MM-dd");

export const useBehaviorPointSummary = (youthId?: string) => {
  const { behaviorPoints, loading, error } = useBehaviorPoints(youthId);

  const summary = useMemo(() => {
    const todayIso = toIso(new Date());
    const rollingSevenDayStart = toIso(subDays(new Date(), 6));
    const monthStart = toIso(startOfMonth(new Date()));
    const monthEnd = toIso(endOfMonth(new Date()));

    const sortedHistory = [...behaviorPoints].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );

    const todayEntry = sortedHistory.find((entry) => entry.date === todayIso) || null;
    const latestEntry = sortedHistory[0] || null;

    const totalForRange = (start: string, end: string) =>
      sortedHistory.reduce((sum, entry) => {
        if (!entry.date || entry.date < start || entry.date > end) return sum;
        return sum + (entry.totalPoints || 0);
      }, 0);

    const lifetimeTotal = sortedHistory.reduce((sum, entry) => sum + (entry.totalPoints || 0), 0);

    return {
      todayIso,
      todayEntry,
      latestEntry,
      todayTotal: typeof todayEntry?.totalPoints === "number" ? todayEntry.totalPoints : 0,
      weekTotal: totalForRange(rollingSevenDayStart, todayIso),
      monthTotal: totalForRange(monthStart, monthEnd),
      lifetimeTotal,
      history: sortedHistory,
    };
  }, [behaviorPoints]);

  return {
    ...summary,
    loading,
    error,
  };
};
