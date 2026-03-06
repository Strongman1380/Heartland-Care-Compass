import { getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { fetchBehaviorPoints, fetchDailyRatings, fetchAllProgressNotes } from "@/utils/local-storage-utils";
import { getScoresByYouth } from "@/utils/schoolScores";
import { weeklyEvalService, dailyShiftService, caseNotesService } from "@/integrations/firebase/services";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import type { ReportTypeKey } from "@/components/reports/ReportTypeSelector";

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AggregatedReportData {
  behaviorPoints: any[];
  dailyRatings: any[];
  progressNotes: any[];
  schoolScores: any[];
  shiftScores: any[];
  weeklyEvals: any[];
  caseNotes: any[];
  incidents: any[];
}

const DATA_SOURCES_BY_TYPE: Record<ReportTypeKey, (keyof AggregatedReportData)[]> = {
  progressMonthly: ["behaviorPoints", "dailyRatings", "progressNotes", "schoolScores", "caseNotes", "incidents"],
  court: ["behaviorPoints", "dailyRatings", "progressNotes", "schoolScores", "caseNotes", "incidents", "shiftScores", "weeklyEvals"],
  dpnBiWeekly: ["shiftScores", "dailyRatings", "behaviorPoints", "progressNotes"],
  dpnMonthly: ["shiftScores", "dailyRatings", "behaviorPoints", "progressNotes"],
  evalWeekly: ["behaviorPoints", "dailyRatings", "progressNotes", "shiftScores"],
  evalMonthly: ["behaviorPoints", "dailyRatings", "progressNotes", "shiftScores", "schoolScores"],
  servicePlan: ["behaviorPoints", "dailyRatings", "progressNotes", "schoolScores", "caseNotes", "incidents", "shiftScores"],
};

const inRange = (dateValue: any, range: DateRange): boolean => {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return d >= range.start && d <= range.end;
};

export async function aggregateReportData(
  youthId: string,
  reportType: ReportTypeKey,
  range: DateRange
): Promise<AggregatedReportData> {
  const needed = new Set(DATA_SOURCES_BY_TYPE[reportType] || []);

  const result: AggregatedReportData = {
    behaviorPoints: [],
    dailyRatings: [],
    progressNotes: [],
    schoolScores: [],
    shiftScores: [],
    weeklyEvals: [],
    caseNotes: [],
    incidents: [],
  };

  const fetchers: Promise<void>[] = [];

  if (needed.has("behaviorPoints")) {
    fetchers.push(
      getBehaviorPointsByYouth(youthId)
        .catch(() => fetchBehaviorPoints(youthId))
        .then((data) => { result.behaviorPoints = (data || []).filter((p: any) => inRange(p.date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("dailyRatings")) {
    fetchers.push(
      getDailyRatingsByYouth(youthId)
        .catch(() => fetchDailyRatings(youthId))
        .then((data) => { result.dailyRatings = (data || []).filter((r: any) => inRange(r.date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("progressNotes")) {
    fetchers.push(
      fetchAllProgressNotes(youthId)
        .then((data) => { result.progressNotes = (data || []).filter((n: any) => inRange(n.date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("schoolScores")) {
    fetchers.push(
      getScoresByYouth(youthId)
        .then((data) => { result.schoolScores = (data || []).filter((s: any) => inRange(s.date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("shiftScores")) {
    fetchers.push(
      dailyShiftService.forYouth(youthId)
        .then((data) => { result.shiftScores = (data || []).filter((s: any) => inRange(s.date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("weeklyEvals")) {
    fetchers.push(
      weeklyEvalService.forYouth(youthId)
        .then((data) => { result.weeklyEvals = (data || []).filter((w: any) => inRange(w.week_date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("caseNotes")) {
    fetchers.push(
      caseNotesService.getByYouthId(youthId)
        .then((data) => { result.caseNotes = (data || []).filter((n: any) => inRange(n.date, range)); })
        .catch(() => {})
    );
  }

  if (needed.has("incidents")) {
    fetchers.push(
      incidentReportsService.list()
        .then((data) => {
          result.incidents = (data || []).filter((i: any) => {
            const matchesYouth = (i.youthInvolved || []).some((y: any) =>
              y.name?.toLowerCase().includes(youthId.substring(0, 8))
            ) || i.youthName;
            return matchesYouth && inRange(i.dateOfIncident, range);
          });
        })
        .catch(() => {})
    );
  }

  await Promise.all(fetchers);
  return result;
}
