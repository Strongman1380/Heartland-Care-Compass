import { differenceInCalendarDays, startOfDay } from "date-fns";
import type { Youth } from "@/integrations/firebase/types";
import type { FacilityIncidentReport } from "@/types/facility-incident-types";

const normalizeNameToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const buildYouthNameVariants = (youth: Pick<Youth, "firstName" | "lastName">): string[] => {
  const firstName = normalizeNameToken(youth.firstName || "");
  const lastName = normalizeNameToken(youth.lastName || "");

  return [firstName && lastName ? `${firstName} ${lastName}` : "", lastName && firstName ? `${lastName} ${firstName}` : ""]
    .filter(Boolean);
};

export const incidentMatchesYouth = (
  incident: FacilityIncidentReport,
  youth: Pick<Youth, "id" | "firstName" | "lastName">
): boolean => {
  if (incident.youth_id && incident.youth_id === youth.id) {
    return true;
  }

  const youthNameVariants = new Set(buildYouthNameVariants(youth));
  if (youthNameVariants.size === 0) {
    return false;
  }

  const incidentNames = [
    incident.youthName,
    `${incident.firstName || ""} ${incident.lastName || ""}`,
    ...(incident.youthInvolved || []).map((entry) => entry.name),
  ]
    .map((value) => normalizeNameToken(value || ""))
    .filter(Boolean);

  return incidentNames.some((name) => youthNameVariants.has(name));
};

export const getLatestActivityAt = (values: Array<string | null | undefined>): string | null => {
  const timestamps = values
    .map((value) => {
      if (!value) return Number.NaN;
      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? Number.NaN : timestamp;
    })
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
};

export const calculateCoveragePercent = (
  values: Array<string | null | undefined>,
  daySpan: number
): number => {
  const uniqueDays = new Set(
    values
      .map((value) => {
        if (!value) return "";
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return "";
        return startOfDay(parsed).toISOString().slice(0, 10);
      })
      .filter(Boolean)
  );

  if (daySpan <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((uniqueDays.size / daySpan) * 100));
};

export const calculateStaleDays = (lastActivityAt: string | null, now = new Date()): number | null => {
  if (!lastActivityAt) {
    return null;
  }

  const activityDate = new Date(lastActivityAt);
  if (Number.isNaN(activityDate.getTime())) {
    return null;
  }

  return Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(activityDate)));
};

export const describePeriodDelta = (current: number, previous: number | null | undefined): string => {
  if (typeof previous !== "number") {
    return "No prior period";
  }

  const delta = current - previous;
  if (delta === 0) {
    return "Flat vs prior";
  }

  return `${delta > 0 ? "+" : ""}${delta} vs prior`;
};
