import { differenceInDays } from "date-fns";
import { Award, TrendingUp, X, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAwards } from "@/contexts/AwardsContext";

const MIN_MONTH_DAYS = 30;

const AwardCard = ({
  label,
  colorClass,
  borderClass,
  icon,
  name,
  sub,
  loading,
}: {
  label: string;
  colorClass: string;
  borderClass: string;
  icon: React.ReactNode;
  name?: string;
  sub?: string;
  loading: boolean;
}) => (
  <div className={`flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border ${borderClass} shadow-sm overflow-hidden`}>
    <div className={`h-12 w-12 shrink-0 rounded-full ${colorClass} flex items-center justify-center text-white`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className={`text-xs font-bold uppercase mb-0.5 truncate`}>{label}</p>
      {loading ? (
        <p className="text-sm text-gray-500 truncate">Calculating...</p>
      ) : name ? (
        <>
          <p className="text-base font-bold text-gray-900 dark:text-slate-100 truncate">{name}</p>
          {sub && <p className="text-sm text-gray-500 dark:text-slate-400 truncate">{sub}</p>}
        </>
      ) : (
        <p className="text-sm text-gray-500 truncate">No eligible resident</p>
      )}
    </div>
  </div>
);

export const AwardsSection = () => {
  const { awards, loading: awardsLoading, dateRange, setDateRange } = useAwards();

  if (!awardsLoading && !awards) return null;

  const isCustom = !!dateRange;
  const rangeDays = dateRange
    ? differenceInDays(new Date(dateRange.endDate), new Date(dateRange.startDate)) + 1
    : null;
  const shortRangeWarning = isCustom && rangeDays !== null && rangeDays < MIN_MONTH_DAYS;

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const start = e.target.value;
    if (!start) return;
    setDateRange({ startDate: start, endDate: dateRange?.endDate ?? start });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const end = e.target.value;
    if (!end) return;
    setDateRange({ startDate: dateRange?.startDate ?? end, endDate: end });
  };

  const periodLabel = isCustom && dateRange
    ? `${dateRange.startDate} – ${dateRange.endDate}`
    : null;

  return (
    <Card className="bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <CardTitle className="text-lg flex items-center text-amber-800 shrink-0">
            <Award className="mr-2 h-5 w-5" />
            Resident Awards
            {periodLabel && (
              <span className="ml-2 text-sm font-normal text-amber-600">({periodLabel})</span>
            )}
          </CardTitle>

          {/* Date range controls */}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
              <input
                type="date"
                value={dateRange?.startDate ?? ""}
                max={dateRange?.endDate ?? undefined}
                onChange={handleStartChange}
                className="text-sm border border-amber-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="Start date"
              />
              <span className="text-amber-600 text-sm">to</span>
              <input
                type="date"
                value={dateRange?.endDate ?? ""}
                min={dateRange?.startDate ?? undefined}
                onChange={handleEndChange}
                className="text-sm border border-amber-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="End date"
              />
            </div>
            {isCustom && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange(null)}
                className="h-7 px-2 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {shortRangeWarning && (
          <p className="text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded px-2 py-1 mt-1">
            ⚠️ Range is {rangeDays} day{rangeDays !== 1 ? "s" : ""} — select at least 30 days for meaningful monthly awards.
          </p>
        )}
      </CardHeader>

      <CardContent>
        {isCustom ? (
          /* Custom range: 2 cards — top performer + most improved for the period */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AwardCard
              label="Resident of the Period"
              colorClass="bg-gradient-to-br from-amber-400 to-yellow-500"
              borderClass="border-amber-200 dark:border-amber-800"
              icon={<Award className="h-6 w-6" />}
              loading={awardsLoading}
              name={awards?.residentOfWeek?.name}
              sub={awards?.residentOfWeek
                ? `${awards.residentOfWeek.evalAverage.toFixed(1)} avg • ${awards.residentOfWeek.totalPoints} pts`
                : undefined}
            />
            <AwardCard
              label="Most Improved (Period)"
              colorClass="bg-gradient-to-br from-emerald-400 to-green-500"
              borderClass="border-emerald-200 dark:border-emerald-800"
              icon={<TrendingUp className="h-6 w-6" />}
              loading={awardsLoading}
              name={awards?.mostImprovedWeek?.name}
              sub={awards?.mostImprovedWeek
                ? `+${(awards.mostImprovedWeek.improvement || 0).toFixed(2)} improvement vs prior period`
                : undefined}
            />
          </div>
        ) : (
          /* Default: 4 cards for rolling week + month */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AwardCard
              label="Resident of the Week"
              colorClass="bg-gradient-to-br from-amber-400 to-yellow-500"
              borderClass="border-amber-200 dark:border-amber-800"
              icon={<Award className="h-6 w-6" />}
              loading={awardsLoading}
              name={awards?.residentOfWeek?.name}
              sub={awards?.residentOfWeek
                ? `${awards.residentOfWeek.evalAverage.toFixed(1)} avg • ${awards.residentOfWeek.totalPoints} pts`
                : undefined}
            />
            <AwardCard
              label="Resident of the Month"
              colorClass="bg-gradient-to-br from-purple-400 to-indigo-500"
              borderClass="border-purple-200 dark:border-purple-800"
              icon={<Award className="h-6 w-6" />}
              loading={awardsLoading}
              name={awards?.residentOfMonth?.name}
              sub={awards?.residentOfMonth
                ? `${awards.residentOfMonth.totalPoints} pts • ${awards.residentOfMonth.evalAverage.toFixed(1)} avg`
                : undefined}
            />
            <AwardCard
              label="Most Improved (Week)"
              colorClass="bg-gradient-to-br from-emerald-400 to-green-500"
              borderClass="border-emerald-200 dark:border-emerald-800"
              icon={<TrendingUp className="h-6 w-6" />}
              loading={awardsLoading}
              name={awards?.mostImprovedWeek?.name}
              sub={awards?.mostImprovedWeek
                ? `+${(awards.mostImprovedWeek.improvement || 0).toFixed(2)} improvement`
                : undefined}
            />
            <AwardCard
              label="Most Improved (Month)"
              colorClass="bg-gradient-to-br from-sky-400 to-blue-500"
              borderClass="border-sky-200 dark:border-sky-800"
              icon={<TrendingUp className="h-6 w-6" />}
              loading={awardsLoading}
              name={awards?.mostImprovedMonth?.name}
              sub={awards?.mostImprovedMonth
                ? `+${(awards.mostImprovedMonth.improvement || 0).toFixed(2)} improvement`
                : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
