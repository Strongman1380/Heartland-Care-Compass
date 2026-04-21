import { z } from "zod";

export const nowIso = (): string => new Date().toISOString();

export const dateOnlyIso = (value: string | Date): string => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date value: ${String(value)}`);
  }
  return parsed.toISOString().slice(0, 10);
};

export const stripUndefinedDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      if (entryValue === undefined) return;
      result[key] = stripUndefinedDeep(entryValue);
    });
    return result as T;
  }

  return value;
};

export const canonicalYouthId = <T extends { youth_id?: string | null; student_id?: string | null }>(record: T): string => {
  const resolved = record.youth_id || record.student_id;
  if (!resolved) {
    throw new Error("A canonical youth identifier is required");
  }
  return resolved;
};

export const withFirestoreMeta = <T extends Record<string, unknown>>(
  record: T,
  options?: { isNew?: boolean; createdBy?: string | null; updatedBy?: string | null; source?: string | null }
): T & {
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  source?: string | null;
} => {
  const now = nowIso();
  const existingCreatedAt = typeof record.created_at === "string" ? record.created_at : undefined;

  return {
    ...record,
    created_at: options?.isNew === false ? existingCreatedAt || now : existingCreatedAt || now,
    updated_at: now,
    created_by: options?.isNew === false ? (record.created_by as string | null | undefined) ?? options?.createdBy ?? null : options?.createdBy ?? null,
    updated_by: options?.updatedBy ?? options?.createdBy ?? null,
    source: (record.source as string | null | undefined) ?? options?.source ?? "manual",
  };
};

export const validateRecord = <T>(schema: z.ZodSchema<T>, record: unknown): T => schema.parse(record);
