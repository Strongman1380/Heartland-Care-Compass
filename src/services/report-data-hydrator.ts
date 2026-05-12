import { getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { notesService } from "@/integrations/firebase/notesService";
import { caseNotesService } from "@/integrations/firebase/services";
import type { SchoolScoreRow } from "@/integrations/firebase/schoolScoresService";
import { dailyShiftService, weeklyEvalService, type DailyShiftRow, type WeeklyEvalRow } from "@/integrations/firebase/shiftScoresService";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import type { BehaviorPoints, CaseNote, DailyRating, ProgressNote } from "@/types/app-types";
import type { FacilityIncidentReport } from "@/types/facility-incident-types";
import { getScoresByYouth } from "@/utils/schoolScores";

export interface ReportDateRange {
  start: Date;
  end: Date;
}

export type ReportSectionKey =
  | "behaviorPoints"
  | "dailyRatings"
  | "progressNotes"
  | "schoolScores"
  | "shiftScores"
  | "weeklyEvals"
  | "caseNotes"
  | "incidents";

export interface ReportDataSet {
  behaviorPoints: BehaviorPoints[];
  dailyRatings: DailyRating[];
  progressNotes: ProgressNote[];
  schoolScores: ReturnType<typeof convertSchoolScore>[];
  shiftScores: DailyShiftRow[];
  weeklyEvals: WeeklyEvalRow[];
  caseNotes: CaseNote[];
  incidents: FacilityIncidentReport[];
}

type FirebaseBehaviorPoint = {
  id: string;
  youth_id: string;
  date?: string | null;
  morningPoints?: number | null;
  afternoonPoints?: number | null;
  eveningPoints?: number | null;
  totalPoints?: number | null;
  comments?: string | null;
  createdAt?: string | null;
};

type FirebaseDailyRating = {
  id: string;
  youth_id: string;
  date?: string | null;
  peerInteraction?: number | null;
  adultInteraction?: number | null;
  investmentLevel?: number | null;
  dealAuthority?: number | null;
  comments?: string | null;
  staff?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type FirebaseNote = {
  id: string;
  youth_id: string;
  author_id?: string | null;
  category?: string | null;
  text: string;
  created_at: string;
  updated_at?: string | null;
};

type FirebaseCaseNote = {
  id: string;
  youth_id: string;
  date?: string | null;
  note?: string | null;
  summary?: string | null;
  staff?: string | null;
  createdAt?: string | null;
};

const toDate = (value?: string | Date | null): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isInRange = (value: string | Date | null | undefined, range: ReportDateRange): boolean => {
  const date = toDate(value);
  return !!date && date >= range.start && date <= range.end;
};

const normalizeBehaviorPoint = (item: FirebaseBehaviorPoint): BehaviorPoints => ({
  id: item.id,
  youth_id: item.youth_id,
  date: toDate(item.date),
  morningPoints: item.morningPoints ?? 0,
  afternoonPoints: item.afternoonPoints ?? 0,
  eveningPoints: item.eveningPoints ?? 0,
  totalPoints: item.totalPoints ?? 0,
  comments: item.comments ?? null,
  createdAt: toDate(item.createdAt),
});

const normalizeDailyRating = (item: FirebaseDailyRating): DailyRating => ({
  id: item.id,
  youth_id: item.youth_id,
  date: toDate(item.date),
  peerInteraction: item.peerInteraction ?? null,
  adultInteraction: item.adultInteraction ?? null,
  investmentLevel: item.investmentLevel ?? null,
  dealAuthority: item.dealAuthority ?? null,
  comments: item.comments ?? null,
  staff: item.staff ?? null,
  createdAt: toDate(item.createdAt),
  updatedAt: toDate(item.updatedAt),
});

const normalizeProgressNote = (item: FirebaseNote): ProgressNote => ({
  id: item.id,
  youth_id: item.youth_id,
  date: toDate(item.created_at),
  category: item.category ?? "Progress Note",
  note: item.text,
  staff: item.author_id ?? null,
  createdAt: toDate(item.created_at),
});

const normalizeCaseNote = (item: FirebaseCaseNote): ProgressNote => ({
  id: item.id,
  youth_id: item.youth_id,
  date: toDate(item.date),
  category: "Case Note",
  note: item.note ?? item.summary ?? "",
  staff: item.staff ?? null,
  createdAt: toDate(item.createdAt),
});

const convertSchoolScore = (row: SchoolScoreRow) => ({
  id: row.id,
  youth_id: row.youth_id,
  date: row.date,
  weekday: row.weekday,
  score: row.score,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const filterByRange = <T>(items: T[], range: ReportDateRange, getDate: (item: T) => string | Date | null | undefined): T[] =>
  items.filter((item) => isInRange(getDate(item), range));

export const reportDataHydrator = {
  async loadSections(youthId: string, sections: ReportSectionKey[], range?: ReportDateRange): Promise<Partial<ReportDataSet>> {
    const needed = new Set(sections);
    const result: Partial<ReportDataSet> = {};

    const tasks: Promise<void>[] = [];

    if (needed.has("behaviorPoints")) {
      tasks.push(
        getBehaviorPointsByYouth(youthId).then((items) => {
          const normalized = items.map((item) => normalizeBehaviorPoint(item as FirebaseBehaviorPoint));
          result.behaviorPoints = range ? filterByRange(normalized, range, (item) => item.date) : normalized;
        })
      );
    }

    if (needed.has("dailyRatings")) {
      tasks.push(
        getDailyRatingsByYouth(youthId).then((items) => {
          const normalized = items.map((item) => normalizeDailyRating(item as FirebaseDailyRating));
          result.dailyRatings = range ? filterByRange(normalized, range, (item) => item.date) : normalized;
        })
      );
    }

    if (needed.has("progressNotes")) {
      tasks.push(
        Promise.all([
          notesService.listForYouth(youthId),
          caseNotesService.getByYouthId(youthId),
        ]).then(([notes, caseNotes]) => {
          const progressNotes = notes.map((item) => normalizeProgressNote(item as FirebaseNote));
          const mergedCaseNotes = caseNotes.map((item) => normalizeCaseNote(item));
          const merged = [...progressNotes, ...mergedCaseNotes].sort((a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
          result.progressNotes = range ? filterByRange(merged, range, (item) => item.date) : merged;
        })
      );
    }

    if (needed.has("schoolScores")) {
      tasks.push(
        getScoresByYouth(youthId).then((items) => {
          result.schoolScores = range ? filterByRange(items.map(convertSchoolScore), range, (item) => item.date) : items.map(convertSchoolScore);
        })
      );
    }

    if (needed.has("shiftScores")) {
      tasks.push(
        dailyShiftService.forYouth(youthId).then((items) => {
          result.shiftScores = range ? filterByRange(items, range, (item) => item.date) : items;
        })
      );
    }

    if (needed.has("weeklyEvals")) {
      tasks.push(
        weeklyEvalService.forYouth(youthId).then((items) => {
          result.weeklyEvals = range ? filterByRange(items, range, (item) => item.week_date) : items;
        })
      );
    }

    if (needed.has("caseNotes")) {
      tasks.push(
        caseNotesService.getByYouthId(youthId).then((items) => {
          result.caseNotes = range ? filterByRange(items, range, (item) => item.date) : items;
        })
      );
    }

    if (needed.has("incidents")) {
      tasks.push(
        incidentReportsService.list().then((items) => {
          result.incidents = range ? filterByRange(items, range, (item) => item.dateOfIncident) : items;
        })
      );
    }

    await Promise.all(tasks);
    return result;
  },

  isInRange,
  toDate,
};
