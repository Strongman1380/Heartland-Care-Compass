import { differenceInDays, endOfMonth, startOfMonth, subDays, subMonths } from "date-fns";
import { behaviorPointsService, type Youth } from "@/integrations/firebase/services";
import { calculateCombinedAveragesForRange } from "@/utils/shiftScores";

export type AwardsDateRange = {
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
};

export type AwardWinner = {
  youthId: string;
  name: string;
  evalAverage: number;
  totalPoints: number;
  improvement?: number;
};

export type ResidentAwards = {
  residentOfWeek: AwardWinner | null;
  mostImprovedWeek: AwardWinner | null;
  residentOfMonth: AwardWinner | null;
  mostImprovedMonth: AwardWinner | null;
};

const toISO = (d: Date) => d.toISOString().split("T")[0];
const EPS = 0.0001;

const metricPresence = (points: number, evalAverage: number) =>
  (points > 0 ? 1 : 0) + (evalAverage > 0 ? 1 : 0);

const sortResidentCandidates = (a: AwardWinner, b: AwardWinner) => {
  // Prefer candidates with more complete data (points + eval), then points, then eval.
  const aPresence = metricPresence(a.totalPoints, a.evalAverage);
  const bPresence = metricPresence(b.totalPoints, b.evalAverage);
  if (bPresence !== aPresence) return bPresence - aPresence;

  if (Math.abs(b.totalPoints - a.totalPoints) > EPS) return b.totalPoints - a.totalPoints;
  if (Math.abs(b.evalAverage - a.evalAverage) > EPS) return b.evalAverage - a.evalAverage;
  return a.name.localeCompare(b.name);
};

const calculateImprovementScore = ({
  currentEval,
  previousEval,
  currentPoints,
  previousPoints,
}: {
  currentEval: number;
  previousEval: number;
  currentPoints: number;
  previousPoints: number;
}) => {
  // Preferred signal: eval improvement week-over-week.
  if (currentEval > 0 && previousEval > 0) return currentEval - previousEval;

  // Fallback: eval appeared this period.
  if (currentEval > 0 && previousEval <= 0) return currentEval;

  // Secondary signal: points improvement.
  if (currentPoints > 0 && previousPoints > 0) return (currentPoints - previousPoints) / 10;

  // Final fallback: points appeared this period.
  if (currentPoints > 0 && previousPoints <= 0) return currentPoints / 10;

  return 0;
};

export const calculateResidentAwardsForYouths = async (
  youths: Youth[],
  customRange?: AwardsDateRange
): Promise<ResidentAwards> => {
  const today = new Date();

  let currentWeekStart: string;
  let currentWeekEnd: string;
  let lastWeekStart: string;
  let lastWeekEnd: string;
  let currentMonthStart: string;
  let currentMonthEnd: string;
  let lastMonthStart: string;
  let lastMonthEnd: string;

  if (customRange) {
    const rangeStart = new Date(customRange.startDate);
    const rangeEnd = new Date(customRange.endDate);
    const rangeDays = differenceInDays(rangeEnd, rangeStart) + 1;
    const prevEnd = subDays(rangeStart, 1);
    const prevStart = subDays(rangeStart, rangeDays);

    // Both "week" and "month" windows map to the custom range
    currentWeekStart = customRange.startDate;
    currentWeekEnd = customRange.endDate;
    lastWeekStart = toISO(prevStart);
    lastWeekEnd = toISO(prevEnd);
    currentMonthStart = customRange.startDate;
    currentMonthEnd = customRange.endDate;
    lastMonthStart = toISO(prevStart);
    lastMonthEnd = toISO(prevEnd);
  } else {
    currentWeekStart = toISO(subDays(today, 6));
    currentWeekEnd = toISO(today);
    lastWeekStart = toISO(subDays(today, 13));
    lastWeekEnd = toISO(subDays(today, 7));
    currentMonthStart = toISO(startOfMonth(today));
    currentMonthEnd = toISO(endOfMonth(today));
    lastMonthStart = toISO(startOfMonth(subMonths(today, 1)));
    lastMonthEnd = toISO(endOfMonth(subMonths(today, 1)));
  }

  const weekCandidates: AwardWinner[] = [];
  const monthCandidates: AwardWinner[] = [];
  const weekImprovementCandidates: AwardWinner[] = [];
  const monthImprovementCandidates: AwardWinner[] = [];
  const overallCandidates: AwardWinner[] = [];

  // Fetch all data for all youths concurrently (eliminates serial N+1 IO)
  const youthData = await Promise.all(
    youths.map(async (youth) => {
      const [points, allTimeEvals, weekEvals, lastWeekEvals, monthEvals, lastMonthEvals] = await Promise.all([
        behaviorPointsService.getByYouthId(youth.id),
        calculateCombinedAveragesForRange(youth.id, "2000-01-01", customRange ? customRange.endDate : currentMonthEnd),
        calculateCombinedAveragesForRange(youth.id, currentWeekStart, currentWeekEnd),
        calculateCombinedAveragesForRange(youth.id, lastWeekStart, lastWeekEnd),
        calculateCombinedAveragesForRange(youth.id, currentMonthStart, currentMonthEnd),
        calculateCombinedAveragesForRange(youth.id, lastMonthStart, lastMonthEnd),
      ]);
      return { youth, points, allTimeEvals, weekEvals, lastWeekEvals, monthEvals, lastMonthEvals };
    })
  );

  for (const { youth, points, allTimeEvals, weekEvals, lastWeekEvals, monthEvals, lastMonthEvals } of youthData) {
    const name = `${youth.firstName} ${youth.lastName}`;
    const allTimePoints = points.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const allTimeEvalAvg = allTimeEvals.overall || 0;

    overallCandidates.push({
      youthId: youth.id,
      name,
      evalAverage: allTimeEvalAvg,
      totalPoints: allTimePoints || youth.pointTotal || 0,
    });

    const weekPoints = points.filter((p) => p.date && p.date >= currentWeekStart && p.date <= currentWeekEnd);
    const weekTotalPoints = weekPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const weekEvalAvg = weekEvals.overall || 0;

    if (weekTotalPoints > 0 || weekEvalAvg > 0) {
      weekCandidates.push({ youthId: youth.id, name, evalAverage: weekEvalAvg, totalPoints: weekTotalPoints });
    }

    const lastWeekPoints = points.filter((p) => p.date && p.date >= lastWeekStart && p.date <= lastWeekEnd);
    const lastWeekTotalPoints = lastWeekPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const lastWeekEvalAvg = lastWeekEvals.overall || 0;
    const weekImprovement = calculateImprovementScore({
      currentEval: weekEvalAvg,
      previousEval: lastWeekEvalAvg,
      currentPoints: weekTotalPoints,
      previousPoints: lastWeekTotalPoints,
    });
    if (weekImprovement > 0) {
      weekImprovementCandidates.push({ youthId: youth.id, name, evalAverage: weekEvalAvg, totalPoints: weekTotalPoints, improvement: weekImprovement });
    }

    const monthPoints = points.filter((p) => p.date && p.date >= currentMonthStart && p.date <= currentMonthEnd);
    const monthTotalPoints = monthPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const monthEvalAvg = monthEvals.overall || 0;
    if (monthTotalPoints > 0 || monthEvalAvg > 0) {
      monthCandidates.push({ youthId: youth.id, name, evalAverage: monthEvalAvg, totalPoints: monthTotalPoints });
    }

    const lastMonthPoints = points.filter((p) => p.date && p.date >= lastMonthStart && p.date <= lastMonthEnd);
    const lastMonthTotalPoints = lastMonthPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const lastMonthEvalAvg = lastMonthEvals.overall || 0;
    const monthImprovement = calculateImprovementScore({
      currentEval: monthEvalAvg,
      previousEval: lastMonthEvalAvg,
      currentPoints: monthTotalPoints,
      previousPoints: lastMonthTotalPoints,
    });
    if (monthImprovement > 0) {
      monthImprovementCandidates.push({ youthId: youth.id, name, evalAverage: monthEvalAvg, totalPoints: monthTotalPoints, improvement: monthImprovement });
    }
  }

  weekCandidates.sort(sortResidentCandidates);
  weekImprovementCandidates.sort((a, b) => (b.improvement || 0) - (a.improvement || 0));
  monthCandidates.sort(sortResidentCandidates);
  monthImprovementCandidates.sort((a, b) => (b.improvement || 0) - (a.improvement || 0));
  overallCandidates.sort(sortResidentCandidates);

  const residentOfMonth = monthCandidates[0] || overallCandidates[0] || null;
  const residentOfWeek = weekCandidates[0] || residentOfMonth || overallCandidates[0] || null;
  const mostImprovedWeek =
    weekImprovementCandidates[0] ||
    monthImprovementCandidates[0] ||
    (residentOfWeek
      ? { ...residentOfWeek, improvement: residentOfWeek.evalAverage || (residentOfWeek.totalPoints > 0 ? residentOfWeek.totalPoints / 10 : 0) }
      : null);
  const mostImprovedMonth =
    monthImprovementCandidates[0] ||
    weekImprovementCandidates[0] ||
    (residentOfMonth
      ? { ...residentOfMonth, improvement: residentOfMonth.evalAverage || (residentOfMonth.totalPoints > 0 ? residentOfMonth.totalPoints / 10 : 0) }
      : null);

  return {
    residentOfWeek,
    mostImprovedWeek,
    residentOfMonth,
    mostImprovedMonth,
  };
};
