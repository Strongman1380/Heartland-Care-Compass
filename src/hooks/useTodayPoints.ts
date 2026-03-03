import { useEffect, useState } from "react";
import { behaviorPointsService, type BehaviorPoints } from "@/integrations/firebase/services";

const getTodayIso = () => new Date().toISOString().split("T")[0];

export const useTodayPoints = (youthId?: string) => {
  const [todayEntry, setTodayEntry] = useState<BehaviorPoints | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadTodayPoints = async () => {
      if (!youthId) {
        setTodayEntry(null);
        return;
      }

      try {
        setLoading(true);
        const entry = await behaviorPointsService.getByDate(youthId, getTodayIso());
        if (!cancelled) {
          setTodayEntry(entry);
        }
      } catch (error) {
        console.error("Failed to load today's behavior points:", error);
        if (!cancelled) {
          setTodayEntry(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadTodayPoints();

    return () => {
      cancelled = true;
    };
  }, [youthId]);

  return {
    todayEntry,
    todayPoints: typeof todayEntry?.totalPoints === "number" ? todayEntry.totalPoints : 0,
    todayIso: getTodayIso(),
    loading,
  };
};
