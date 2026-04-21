import { academicsService } from "@/integrations/firebase/academicsService";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";

export type BackfillSummary = {
  creditsUpdated: number;
  gradesUpdated: number;
  stepsUpdated: number;
  incidentsUpdated: number;
};

const hasCanonicalAcademicFields = (row: { youth_id?: string; student_id?: string; event_date?: string }) =>
  Boolean(row.youth_id && row.student_id && row.event_date);

const hasCanonicalIncidentFields = (row: { youth_id?: string; event_date?: string; schema_version?: number }) =>
  Boolean(row.youth_id && row.event_date && row.schema_version && row.schema_version >= 2);

export const backfillCanonicalDatabaseFields = async (): Promise<BackfillSummary> => {
  const summary: BackfillSummary = {
    creditsUpdated: 0,
    gradesUpdated: 0,
    stepsUpdated: 0,
    incidentsUpdated: 0,
  };

  const [credits, grades, steps, incidents] = await Promise.all([
    academicsService.credits.list(),
    academicsService.grades.list(),
    academicsService.steps.list(),
    incidentReportsService.list(),
  ]);

  for (const credit of credits) {
    if (hasCanonicalAcademicFields(credit)) continue;
    await academicsService.credits.save(credit);
    summary.creditsUpdated += 1;
  }

  for (const grade of grades) {
    if (hasCanonicalAcademicFields(grade)) continue;
    await academicsService.grades.save(grade);
    summary.gradesUpdated += 1;
  }

  for (const step of steps) {
    if (hasCanonicalAcademicFields(step)) continue;
    await academicsService.steps.save(step);
    summary.stepsUpdated += 1;
  }

  for (const incident of incidents) {
    if (hasCanonicalIncidentFields(incident)) continue;
    await incidentReportsService.save(incident);
    summary.incidentsUpdated += 1;
  }

  return summary;
};
