// Firebase persistence for academic data (credits, grades, steps) and incident reports
// All data is fetched directly from Firestore with no localStorage caching

import { SchoolIncidentReport } from '@/types/school-incident-types';
import { academicsService } from '@/integrations/firebase/academicsService';
import { schoolIncidentsService } from '@/integrations/firebase/schoolIncidentsService';

export type ID = string;

export type AcademicStudentId = string; // uses Supabase youth.id

export type CreditsEarned = {
  id: ID;
  student_id: AcademicStudentId;
  date_earned: string; // ISO yyyy-MM-dd
  credit_value: number;
  createdAt: string;
  updatedAt: string;
};

export type Grade = {
  id: ID;
  student_id: AcademicStudentId;
  date_entered: string; // ISO yyyy-MM-dd
  grade_value: number; // percentage 0-100
  course_name?: string; // name of the class/course
  createdAt: string;
  updatedAt: string;
};

export type StepsCompleted = {
  id: ID;
  student_id: AcademicStudentId;
  date_completed: string; // ISO yyyy-MM-dd
  steps_count: number; // integer >=0
  createdAt: string;
  updatedAt: string;
};

// Legacy incident report type (kept for backwards compatibility)
export type IncidentReport = {
  id: ID;
  student_id: AcademicStudentId | null;
  student_name?: string;
  incident_type?: string;
  incident_summary?: string;
  staff_name?: string;
  date_of_incident: string; // ISO yyyy-MM-dd
  involved_students?: { id: AcademicStudentId; name?: string }[];
  createdAt: string;
  updatedAt: string;
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Credits
export const listCredits = async (): Promise<CreditsEarned[]> => {
  const rows = await academicsService.credits.list();
  return rows.map(row => ({
    id: row.id,
    student_id: row.student_id,
    date_earned: row.date_earned,
    credit_value: row.credit_value,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

export const saveCredit = async (data: Omit<CreditsEarned, "id" | "createdAt" | "updatedAt"> & { id?: ID }): Promise<CreditsEarned> => {
  const payload: any = {
    student_id: data.student_id,
    date_earned: data.date_earned,
    credit_value: data.credit_value
  };

  if (data.id) {
    payload.id = data.id;
  } else {
    payload.id = genId();
  }

  const result = await academicsService.credits.save(payload);
  return {
    id: result.id,
    student_id: result.student_id,
    date_earned: result.date_earned,
    credit_value: result.credit_value,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  };
};

export const deleteCredit = async (id: ID): Promise<void> => {
  await academicsService.credits.delete(id);
};

// Grades
export const listGrades = async (): Promise<Grade[]> => {
  const rows = await academicsService.grades.list();
  return rows.map(row => ({
    id: row.id,
    student_id: row.student_id,
    date_entered: row.date_entered,
    grade_value: row.grade_value,
    course_name: (row as any).course_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

export const saveGrade = async (data: Omit<Grade, "id" | "createdAt" | "updatedAt"> & { id?: ID }): Promise<Grade> => {
  const payload: any = {
    student_id: data.student_id,
    date_entered: data.date_entered,
    grade_value: data.grade_value,
    course_name: data.course_name
  };

  if (data.id) {
    payload.id = data.id;
  } else {
    payload.id = genId();
  }

  const result = await academicsService.grades.save(payload);
  return {
    id: result.id,
    student_id: result.student_id,
    date_entered: result.date_entered,
    grade_value: result.grade_value,
    course_name: (result as any).course_name,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  };
};

export const deleteGrade = async (id: ID): Promise<void> => {
  await academicsService.grades.delete(id);
};

// Steps
export const listSteps = async (): Promise<StepsCompleted[]> => {
  const rows = await academicsService.steps.list();
  return rows.map(row => ({
    id: row.id,
    student_id: row.student_id,
    date_completed: row.date_completed,
    steps_count: row.steps_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

export const saveStep = async (data: Omit<StepsCompleted, "id" | "createdAt" | "updatedAt"> & { id?: ID }): Promise<StepsCompleted> => {
  const payload: any = {
    student_id: data.student_id,
    date_completed: data.date_completed,
    steps_count: data.steps_count
  };

  if (data.id) {
    payload.id = data.id;
  } else {
    payload.id = genId();
  }

  const result = await academicsService.steps.save(payload);
  return {
    id: result.id,
    student_id: result.student_id,
    date_completed: result.date_completed,
    steps_count: result.steps_count,
    createdAt: result.created_at,
    updatedAt: result.updated_at
  };
};

export const deleteStep = async (id: ID): Promise<void> => {
  await academicsService.steps.delete(id);
};

// Incident Reports (Legacy - keeping empty implementations for backwards compatibility)
export const listIncidents = async (): Promise<IncidentReport[]> => {
  console.warn('listIncidents is deprecated. Use school incidents instead.');
  return [];
};

export const saveIncident = async (data: Omit<IncidentReport, "id" | "createdAt" | "updatedAt"> & { id?: ID }): Promise<IncidentReport> => {
  console.warn('saveIncident is deprecated. Use school incidents instead.');
  const now = new Date().toISOString();
  return {
    ...(data as any),
    id: data.id || genId(),
    createdAt: now,
    updatedAt: now
  };
};

export const deleteIncident = async (id: ID): Promise<void> => {
  console.warn('deleteIncident is deprecated. Use school incidents instead.');
};

// Utilities
export const parseYmd = (value: string): Date => {
  // Accept yyyy-MM-dd or ISO; fallback to Date constructor
  if (!value) return new Date(NaN);
  const parts = value.split("T")[0];
  const [y, m, d] = parts.split("-").map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const dt = new Date(value);
  return dt;
};

export const truncateDecimal = (num: number, places: number) => {
  const factor = Math.pow(10, places);
  return Math.trunc((num + Number.EPSILON) * factor) / factor;
};

// School Incident Reports (New Structured Format)
export const listSchoolIncidents = async (): Promise<SchoolIncidentReport[]> => {
  try {
    const remote = await schoolIncidentsService.list();
    // Ensure we always return an array
    return Array.isArray(remote) ? remote as SchoolIncidentReport[] : [];
  } catch (error) {
    console.error('Error loading school incidents:', error);
    // Always return an empty array on error
    return [];
  }
};

export const getSchoolIncident = async (incidentId: string): Promise<SchoolIncidentReport | undefined> => {
  const incidents = await listSchoolIncidents();
  return incidents.find(i => i.incident_id === incidentId);
};

export const saveSchoolIncident = async (data: Partial<SchoolIncidentReport> & { incident_id?: string }): Promise<SchoolIncidentReport> => {
  const now = new Date().toISOString();

  if (data.incident_id) {
    // Update existing
    const result = await schoolIncidentsService.upsert({
      ...data,
      updated_at: now
    } as any);
    return result as SchoolIncidentReport;
  }

  // Create new - generate incident_id
  const year = new Date().getFullYear();
  const allIncidents = await listSchoolIncidents();
  const existingThisYear = allIncidents.filter(i => i.incident_id.startsWith(`HHH-${year}`));
  const nextNumber = existingThisYear.length + 1;
  const incident_id = `HHH-${year}-${String(nextNumber).padStart(4, '0')}`;

  const result = await schoolIncidentsService.upsert({
    ...data,
    incident_id,
    created_at: now,
    updated_at: now
  } as any);

  return result as SchoolIncidentReport;
};

export const deleteSchoolIncident = async (incidentId: string): Promise<void> => {
  await schoolIncidentsService.delete(incidentId);
};
