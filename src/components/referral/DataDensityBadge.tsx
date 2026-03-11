import { memo } from "react";
import { getCompletionColor, getStatusBadgeColor, getSectionStatus } from "@/utils/referralUtils";

interface DataDensityBadgeProps {
  completed: number;
  total: number;
  showPercentage?: boolean;
  showProgressBar?: boolean;
}

/**
 * DataDensityBadge component for displaying data completion indicator.
 * Shows completion count and optional progress bar with color gradient.
 * Memoized to prevent unnecessary re-renders.
 */
const DataDensityBadge = memo(function DataDensityBadge({
  completed,
  total,
  showPercentage = true,
  showProgressBar = true,
}: DataDensityBadgeProps) {
  if (total === 0) {
    return (
      <div className="text-xs font-medium text-gray-500">
        No fields
      </div>
    );
  }

  const percentage = Math.round((completed / total) * 100);
  const status = getSectionStatus({ mock: true }).status; // Dummy call to show usage
  const statusObj = {
    percentage,
    status: percentage === 0 ? "empty" as const : percentage < 50 ? "incomplete" as const : percentage < 80 ? "partial" as const : "complete" as const,
  };

  const bgColor = getCompletionColor(percentage);
  const textColor = getStatusBadgeColor(statusObj.status);

  return (
    <div className="flex items-center gap-2">
      <div className={`text-xs font-semibold ${textColor}`}>
        {completed}/{total}
        {showPercentage && ` (${percentage}%)`}
      </div>
      {showProgressBar && (
        <div className="h-1.5 w-24 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${bgColor} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
});

export { DataDensityBadge };
