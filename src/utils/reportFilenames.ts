import { format } from "date-fns";

type YouthNameLike = {
  firstName?: string | null;
  lastName?: string | null;
};

const sanitizeFilenamePart = (value: string): string =>
  value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const safeNamePart = (value: string | null | undefined, fallback: string): string => {
  const text = sanitizeFilenamePart(String(value || ""));
  return text || fallback;
};

export function buildReportFilename(
  youth: YouthNameLike | null | undefined,
  reportType: string,
  date: Date = new Date()
): string {
  const lastName = safeNamePart(youth?.lastName, "Unknown Last");
  const firstName = safeNamePart(youth?.firstName, "Unknown First");
  const type = safeNamePart(reportType, "Report");
  const reportDate = format(date, "yyyy-MM-dd");
  return `${lastName}, ${firstName}, ${type}, ${reportDate}`;
}

