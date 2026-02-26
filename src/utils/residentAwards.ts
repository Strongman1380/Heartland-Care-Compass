import { endOfMonth, endOfWeek, startOfMonth, startOfWeek, subWeeks } from "date-fns";
import { behaviorPointsService, type Youth } from "@/integrations/firebase/services";
import { calculateCombinedAveragesForRange } from "@/utils/shiftScores";

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
};

const toISO = (d: Date) => d.toISOString().split("T")[0];

export const calculateResidentAwardsForYouths = async (youths: Youth[]): Promise<ResidentAwards> => {
  const today = new Date();
  const currentWeekStart = toISO(startOfWeek(today, { weekStartsOn: 1 }));
  const currentWeekEnd = toISO(endOfWeek(today, { weekStartsOn: 1 }));
  const lastWeekStart = toISO(startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }));
  const lastWeekEnd = toISO(endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }));
  const currentMonthStart = toISO(startOfMonth(today));
  const currentMonthEnd = toISO(endOfMonth(today));

  const weekCandidates: AwardWinner[] = [];
  const monthCandidates: AwardWinner[] = [];
  const improvementCandidates: AwardWinner[] = [];

  for (const youth of youths) {
    const points = await behaviorPointsService.getByYouthId(youth.id);

    const weekPoints = points.filter((p) => p.date && p.date >= currentWeekStart && p.date <= currentWeekEnd);
    const weekTotalPoints = weekPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const weekEvals = await calculateCombinedAveragesForRange(youth.id, currentWeekStart, currentWeekEnd);
    const weekEvalAvg = weekEvals.overall || 0;

    if (weekTotalPoints > 0 || weekEvalAvg > 0) {
      weekCandidates.push({
        youthId: youth.id,
        name: `${youth.firstName} ${youth.lastName}`,
        evalAverage: weekEvalAvg,
        totalPoints: weekTotalPoints,
      });
    }

    const lastWeekEvals = await calculateCombinedAveragesForRange(youth.id, lastWeekStart, lastWeekEnd);
    const lastWeekEvalAvg = lastWeekEvals.overall || 0;
    if (weekEvalAvg > 0 && lastWeekEvalAvg > 0) {
      improvementCandidates.push({
        youthId: youth.id,
        name: `${youth.firstName} ${youth.lastName}`,
        evalAverage: weekEvalAvg,
        totalPoints: weekTotalPoints,
        improvement: weekEvalAvg - lastWeekEvalAvg,
      });
    }

    const monthPoints = points.filter((p) => p.date && p.date >= currentMonthStart && p.date <= currentMonthEnd);
    const monthTotalPoints = monthPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const monthEvals = await calculateCombinedAveragesForRange(youth.id, currentMonthStart, currentMonthEnd);
    const monthEvalAvg = monthEvals.overall || 0;
    if (monthTotalPoints > 0 || monthEvalAvg > 0) {
      monthCandidates.push({
        youthId: youth.id,
        name: `${youth.firstName} ${youth.lastName}`,
        evalAverage: monthEvalAvg,
        totalPoints: monthTotalPoints,
      });
    }
  }

  weekCandidates.sort((a, b) => {
    if (b.evalAverage !== a.evalAverage) return b.evalAverage - a.evalAverage;
    return b.totalPoints - a.totalPoints;
  });
  improvementCandidates.sort((a, b) => (b.improvement || 0) - (a.improvement || 0));
  monthCandidates.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.evalAverage - a.evalAverage;
  });

  return {
    residentOfWeek: weekCandidates[0] || null,
    mostImprovedWeek: improvementCandidates[0] || null,
    residentOfMonth: monthCandidates[0] || null,
  };
};
