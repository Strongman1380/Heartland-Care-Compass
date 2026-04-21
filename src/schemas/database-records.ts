import { z } from "zod";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected yyyy-MM-dd date");

export const auditLogSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().min(1),
  action: z.enum(["create", "update", "delete", "snapshot"]),
  youth_id: z.string().min(1).optional(),
  changed_at: z.string().datetime(),
  changed_by: z.string().nullish(),
  source: z.string().nullish(),
  before: z.record(z.string(), z.unknown()).nullish(),
  after: z.record(z.string(), z.unknown()).nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

const academicBaseSchema = z.object({
  id: z.string().min(1).optional(),
  youth_id: z.string().min(1).optional(),
  student_id: z.string().min(1).optional(),
  source: z.string().optional(),
  created_by: z.string().nullish(),
  updated_by: z.string().nullish(),
  event_date: isoDateSchema.optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
}).refine((value) => Boolean(value.youth_id || value.student_id), {
  message: "A canonical youth identifier is required",
  path: ["youth_id"],
});

export const academicCreditSchema = academicBaseSchema.extend({
  date_earned: isoDateSchema,
  credit_value: z.number().finite().min(0),
});

export const academicGradeSchema = academicBaseSchema.extend({
  date_entered: isoDateSchema,
  grade_value: z.number().finite().min(0),
  course_name: z.string().optional(),
});

export const academicStepSchema = academicBaseSchema.extend({
  date_completed: isoDateSchema,
  steps_count: z.number().int().min(0),
});

export const kpiSnapshotSchema = z.object({
  id: z.string().min(1).optional(),
  scope: z.enum(["program", "youth"]),
  timeframe: z.enum(["week", "month", "quarter", "year"]),
  snapshot_date: isoDateSchema,
  generated_at: z.string().datetime(),
  generated_by: z.string().nullish(),
  source: z.string().optional(),
  youth_id: z.string().optional(),
  metrics: z.record(z.string(), z.unknown()),
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
