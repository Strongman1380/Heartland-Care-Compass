import { format } from "date-fns";
import { useBehaviorPointSummary } from "@/hooks/useBehaviorPointSummary";

interface PointSummaryInlineProps {
  youthId: string;
  compact?: boolean;
}

export const PointSummaryInline = ({ youthId, compact = false }: PointSummaryInlineProps) => {
  const { todayEntry, latestEntry, todayTotal, weekTotal, monthTotal, lifetimeTotal, loading } =
    useBehaviorPointSummary(youthId);

  if (loading) {
    return <span className="text-xs text-gray-500">Loading points...</span>;
  }

  const latestLabel =
    latestEntry?.date && latestEntry.date !== todayEntry?.date
      ? `${typeof latestEntry.totalPoints === "number" ? latestEntry.totalPoints.toLocaleString() : "status"} on ${format(
          new Date(`${latestEntry.date}T00:00:00`),
          "MMM d"
        )}`
      : null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2 text-xs mt-1">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-green-100 text-green-800 border border-green-300">
          Today: {todayTotal.toLocaleString()}
        </span>
        {latestLabel ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-amber-100 text-amber-800 border border-amber-300">
            Last: {latestLabel}
          </span>
        ) : null}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-blue-100 text-blue-800 border border-blue-300">
          7 Days: {weekTotal.toLocaleString()}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-purple-100 text-purple-800 border border-purple-300">
          Month: {monthTotal.toLocaleString()}
        </span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-800 border border-slate-300">
          Life: {lifetimeTotal.toLocaleString()}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
        Today: {todayTotal.toLocaleString()} pts
      </span>
      {latestLabel ? (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-300">
          Last: {latestLabel}
        </span>
      ) : null}
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
        7 Days: {weekTotal.toLocaleString()}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300">
        Month: {monthTotal.toLocaleString()}
      </span>
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-300">
        Life: {lifetimeTotal.toLocaleString()}
      </span>
    </div>
  );
};
