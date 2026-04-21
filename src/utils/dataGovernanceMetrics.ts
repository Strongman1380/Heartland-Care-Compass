import { differenceInCalendarDays } from "date-fns";
import type { Youth, BehaviorPoints, CaseNotes, DailyRatings } from "@/integrations/firebase/types";
import type { CreditRow, GradeRow, StepRow } from "@/integrations/firebase/academicsService";
import type { FacilityIncidentReport } from "@/types/facility-incident-types";
import type { KpiSnapshotRow } from "@/integrations/firebase/kpiSnapshotsService";
import { aggregateCaseNoteKpis } from "@/utils/kpiCaseNoteAi";
import { incidentMatchesYouth } from "@/utils/kpiDashboard";

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export type YouthDataQualityRow = {
  youthId: string;
  youthName: string;
  missingAdmissionDate: boolean;
  missingGradeValue: boolean;
  missingHyrna: boolean;
  missingIncidentLinkage: number;
  staleCaseNotesDays: number | null;
  staleRatingsDays: number | null;
  noCaseNotes: boolean;
  noRatings: boolean;
};

export const computeYouthDataQuality = (params: {
  youths: Youth[];
  caseNotes: CaseNotes[];
  dailyRatings: DailyRatings[];
  incidents: FacilityIncidentReport[];
  grades: GradeRow[];
}): YouthDataQualityRow[] => {
  const { youths, caseNotes, dailyRatings, incidents, grades } = params;

  return youths.map((youth) => {
    const youthNotes = caseNotes.filter((row) => row.youth_id === youth.id);
    const youthRatings = dailyRatings.filter((row) => row.youth_id === youth.id);
    const youthGrades = grades.filter((row) => (row.youth_id || row.student_id) === youth.id);
    const youthIncidents = incidents.filter((row) => incidentMatchesYouth(row, youth));

    const latestNote = youthNotes[0]?.date || youthNotes[0]?.createdAt || null;
    const latestRating = youthRatings[0]?.date || youthRatings[0]?.createdAt || null;
    const latestNoteDate = parseDate(latestNote);
    const latestRatingDate = parseDate(latestRating);

    return {
      youthId: youth.id,
      youthName: `${youth.firstName} ${youth.lastName}`.trim(),
      missingAdmissionDate: !youth.admissionDate,
      missingGradeValue: youthGrades.length === 0 || youthGrades.every((row) => row.grade_value == null),
      missingHyrna: youth.hyrnaScore == null && !youth.hyrnaRiskLevel,
      missingIncidentLinkage: youthIncidents.filter((row) => !row.youth_id).length,
      staleCaseNotesDays: latestNoteDate ? differenceInCalendarDays(new Date(), latestNoteDate) : null,
      staleRatingsDays: latestRatingDate ? differenceInCalendarDays(new Date(), latestRatingDate) : null,
      noCaseNotes: youthNotes.length === 0,
      noRatings: youthRatings.length === 0,
    };
  });
};

export const buildYouthSnapshots = (params: {
  youths: Youth[];
  behaviorPoints: BehaviorPoints[];
  caseNotes: CaseNotes[];
  dailyRatings: DailyRatings[];
  incidents: FacilityIncidentReport[];
  credits: CreditRow[];
  grades: GradeRow[];
  steps: StepRow[];
  generatedBy?: string | null;
}): Array<Omit<KpiSnapshotRow, "id" | "created_at" | "updated_at">> => {
  const { youths, behaviorPoints, caseNotes, dailyRatings, incidents, credits, grades, steps, generatedBy } = params;
  const generatedAt = new Date().toISOString();
  const snapshotDate = generatedAt.slice(0, 10);

  return youths.map((youth) => {
    const youthPoints = behaviorPoints.filter((row) => row.youth_id === youth.id);
    const youthNotes = caseNotes.filter((row) => row.youth_id === youth.id);
    const youthRatings = dailyRatings.filter((row) => row.youth_id === youth.id);
    const youthIncidents = incidents.filter((row) => incidentMatchesYouth(row, youth));
    const youthCredits = credits.filter((row) => (row.youth_id || row.student_id) === youth.id);
    const youthGrades = grades.filter((row) => (row.youth_id || row.student_id) === youth.id);
    const youthSteps = steps.filter((row) => (row.youth_id || row.student_id) === youth.id);
    const notesAggregate = aggregateCaseNoteKpis(youthNotes);

    const avgPoints = youthPoints.length
      ? Number((youthPoints.reduce((sum, row) => sum + (row.totalPoints || 0), 0) / youthPoints.length).toFixed(1))
      : 0;

    const avgDomains = youthRatings.length
      ? {
          peer: Number((youthRatings.reduce((sum, row) => sum + (row.peerInteraction || 0), 0) / youthRatings.length).toFixed(1)),
          adult: Number((youthRatings.reduce((sum, row) => sum + (row.adultInteraction || 0), 0) / youthRatings.length).toFixed(1)),
          investment: Number((youthRatings.reduce((sum, row) => sum + (row.investmentLevel || 0), 0) / youthRatings.length).toFixed(1)),
          authority: Number((youthRatings.reduce((sum, row) => sum + (row.dealAuthority || 0), 0) / youthRatings.length).toFixed(1)),
        }
      : null;

    const avgGrade = youthGrades.length
      ? Number((youthGrades.reduce((sum, row) => sum + row.grade_value, 0) / youthGrades.length).toFixed(2))
      : null;

    return {
      scope: "youth" as const,
      timeframe: "month" as const,
      snapshot_date: snapshotDate,
      generated_at: generatedAt,
      generated_by: generatedBy || null,
      source: "admin-governance",
      youth_id: youth.id,
      metrics: {
        level: youth.level,
        pointTotal: youth.pointTotal,
        behaviorEntries: youthPoints.length,
        avgBehaviorPoints: avgPoints,
        caseNotes: youthNotes.length,
        ratings: youthRatings.length,
        incidents: youthIncidents.length,
        creditsEarned: youthCredits.reduce((sum, row) => sum + (row.credit_value || 0), 0),
        avgGrade,
        academicSteps: youthSteps.reduce((sum, row) => sum + (row.steps_count || 0), 0),
        hyrnaScore: youth.hyrnaScore,
        hyrnaRiskLevel: youth.hyrnaRiskLevel,
        noteEngagementScore: notesAggregate.engagementScore,
        domainAverages: avgDomains,
      },
      metadata: {
        youthName: `${youth.firstName} ${youth.lastName}`.trim(),
      },
    };
  });
};
