import type { ReportTypeKey } from "@/components/reports/ReportTypeSelector";
import {
  reportDataHydrator,
  type ReportDateRange,
  type ReportDataSet,
  type ReportSectionKey,
} from "@/services/report-data-hydrator";

export type DateRange = ReportDateRange;

const DATA_SOURCES_BY_TYPE: Record<ReportTypeKey, ReportSectionKey[]> = {
  progressMonthly: ["behaviorPoints", "dailyRatings", "progressNotes", "schoolScores", "caseNotes", "incidents"],
  court: ["behaviorPoints", "dailyRatings", "progressNotes", "schoolScores", "caseNotes", "incidents", "shiftScores", "weeklyEvals"],
  dpnBiWeekly: ["shiftScores", "dailyRatings", "behaviorPoints", "progressNotes"],
  dpnMonthly: ["shiftScores", "dailyRatings", "behaviorPoints", "progressNotes"],
  evalWeekly: ["behaviorPoints", "dailyRatings", "progressNotes", "shiftScores"],
  evalMonthly: ["behaviorPoints", "dailyRatings", "progressNotes", "shiftScores", "schoolScores"],
  servicePlan: ["behaviorPoints", "dailyRatings", "progressNotes", "schoolScores", "caseNotes", "incidents", "shiftScores"],
};

const emptyReportData = (): ReportDataSet => ({
  behaviorPoints: [],
  dailyRatings: [],
  progressNotes: [],
  schoolScores: [],
  shiftScores: [],
  weeklyEvals: [],
  caseNotes: [],
  incidents: [],
});

export async function aggregateReportData(
  youthId: string,
  reportType: ReportTypeKey,
  range: ReportDateRange
): Promise<ReportDataSet> {
  const sections = DATA_SOURCES_BY_TYPE[reportType] || [];
  const data = await reportDataHydrator.loadSections(youthId, sections, range);
  return {
    ...emptyReportData(),
    ...data,
  };
}
