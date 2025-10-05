// Local storage-backed store for academic data (credits, grades, steps) and incident reports
// This is a lightweight placeholder until we migrate to Supabase.

import { SchoolIncidentReport } from '@/types/school-incident-types';
import { academicsService } from '@/integrations/supabase/academicsService';
import { schoolIncidentsService } from '@/integrations/supabase/schoolIncidentsService';

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

const LS_KEYS = {
  credits: "academic:credits",
  grades: "academic:grades",
  steps: "academic:steps",
  incidents: "academic:incidents",
  schoolIncidents: "academic:school-incidents",
};

const readArray = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const writeArray = <T>(key: string, arr: T[]) => {
  localStorage.setItem(key, JSON.stringify(arr));
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// Credits
export const listCredits = (): CreditsEarned[] => readArray<CreditsEarned>(LS_KEYS.credits);
export const saveCredit = (data: Omit<CreditsEarned, "id" | "createdAt" | "updatedAt"> & { id?: ID }): CreditsEarned => {
  const now = new Date().toISOString();

  const items = listCredits();
  let result: CreditsEarned;

  if (data.id) {
    const idx = items.findIndex(i => i.id === data.id);
    if (idx >= 0) {
      const updated: CreditsEarned = { ...items[idx], ...data, updatedAt: now } as CreditsEarned;
      items[idx] = updated;
      writeArray(LS_KEYS.credits, items);
      result = updated;
    } else {
      const created: CreditsEarned = { ...(data as any), id: data.id, createdAt: now, updatedAt: now };
      items.push(created);
      writeArray(LS_KEYS.credits, items);
      result = created;
    }
  } else {
    const created: CreditsEarned = { ...(data as any), id: genId(), createdAt: now, updatedAt: now };
    items.push(created);
    writeArray(LS_KEYS.credits, items);
    result = created;
  }

  // Persist to Supabase after local save succeeds
  try {
    void academicsService.credits.save({
      id: result.id as any,
      student_id: result.student_id,
      date_earned: result.date_earned,
      credit_value: result.credit_value,
    });
  } catch (error) {
    console.error('Failed to sync credit to Supabase:', error);
  }

  return result;
};

export const deleteCredit = (id: ID) => {
  // Delete from Supabase first (best effort)
  try {
    void academicsService.credits.delete(id as any);
  } catch (error) {
    console.error('Failed to delete credit from Supabase:', error);
  }

  // Then delete from localStorage
  writeArray(LS_KEYS.credits, listCredits().filter(i => i.id !== id));
};

// Grades
export const listGrades = (): Grade[] => readArray<Grade>(LS_KEYS.grades);
export const saveGrade = (data: Omit<Grade, "id" | "createdAt" | "updatedAt"> & { id?: ID }): Grade => {
  const now = new Date().toISOString();

  const items = listGrades();
  let result: Grade;

  if (data.id) {
    const idx = items.findIndex(i => i.id === data.id);
    if (idx >= 0) {
      const updated: Grade = { ...items[idx], ...data, updatedAt: now } as Grade;
      items[idx] = updated;
      writeArray(LS_KEYS.grades, items);
      result = updated;
    } else {
      const created: Grade = { ...(data as any), id: data.id, createdAt: now, updatedAt: now };
      items.push(created);
      writeArray(LS_KEYS.grades, items);
      result = created;
    }
  } else {
    const created: Grade = { ...(data as any), id: genId(), createdAt: now, updatedAt: now };
    items.push(created);
    writeArray(LS_KEYS.grades, items);
    result = created;
  }

  // Persist to Supabase after local save
  try {
    void academicsService.grades.save({
      id: result.id as any,
      student_id: result.student_id,
      date_entered: result.date_entered,
      grade_value: result.grade_value,
      course_name: result.course_name
    } as any);
  } catch (error) {
    console.error('Failed to sync grade to Supabase:', error);
  }

  return result;
};

export const deleteGrade = (id: ID) => {
  try {
    void academicsService.grades.delete(id as any);
  } catch (error) {
    console.error('Failed to delete grade from Supabase:', error);
  }
  writeArray(LS_KEYS.grades, listGrades().filter(i => i.id !== id));
};

// Steps
export const listSteps = (): StepsCompleted[] => readArray<StepsCompleted>(LS_KEYS.steps);
export const saveStep = (data: Omit<StepsCompleted, "id" | "createdAt" | "updatedAt"> & { id?: ID }): StepsCompleted => {
  const now = new Date().toISOString();

  const items = listSteps();
  let result: StepsCompleted;

  if (data.id) {
    const idx = items.findIndex(i => i.id === data.id);
    if (idx >= 0) {
      const updated: StepsCompleted = { ...items[idx], ...data, updatedAt: now } as StepsCompleted;
      items[idx] = updated;
      writeArray(LS_KEYS.steps, items);
      result = updated;
    } else {
      const created: StepsCompleted = { ...(data as any), id: data.id, createdAt: now, updatedAt: now };
      items.push(created);
      writeArray(LS_KEYS.steps, items);
      result = created;
    }
  } else {
    const created: StepsCompleted = { ...(data as any), id: genId(), createdAt: now, updatedAt: now };
    items.push(created);
    writeArray(LS_KEYS.steps, items);
    result = created;
  }

  // Persist to Supabase after local save
  try {
    void academicsService.steps.save({
      id: result.id as any,
      student_id: result.student_id,
      date_completed: result.date_completed,
      steps_count: result.steps_count
    });
  } catch (error) {
    console.error('Failed to sync step to Supabase:', error);
  }

  return result;
};

export const deleteStep = (id: ID) => {
  try {
    void academicsService.steps.delete(id as any);
  } catch (error) {
    console.error('Failed to delete step from Supabase:', error);
  }
  writeArray(LS_KEYS.steps, listSteps().filter(i => i.id !== id));
};

// Incident Reports
export const listIncidents = (): IncidentReport[] => readArray<IncidentReport>(LS_KEYS.incidents);
export const saveIncident = (data: Omit<IncidentReport, "id" | "createdAt" | "updatedAt"> & { id?: ID }): IncidentReport => {
  const now = new Date().toISOString();
  const items = listIncidents();
  if (data.id) {
    const idx = items.findIndex(i => i.id === data.id);
    if (idx >= 0) {
      const updated: IncidentReport = { ...items[idx], ...data, updatedAt: now } as IncidentReport;
      items[idx] = updated;
      writeArray(LS_KEYS.incidents, items);
      return updated;
    }
  }
  const created: IncidentReport = { ...(data as any), id: genId(), createdAt: now, updatedAt: now };
  items.push(created);
  writeArray(LS_KEYS.incidents, items);
  return created;
};
export const deleteIncident = (id: ID) => {
  writeArray(LS_KEYS.incidents, listIncidents().filter(i => i.id !== id));
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
export const listSchoolIncidents = (): SchoolIncidentReport[] => {
  // Attempt to hydrate from Supabase in background
  (async () => {
    try {
      const remote = await schoolIncidentsService.list()
      if (remote && remote.length) {
        writeArray(LS_KEYS.schoolIncidents, remote as any)
      }
    } catch (error) {
      // Silently fail - we'll use local cache
      console.warn('School incidents sync failed, using local cache:', error)
    }
  })()
  return readArray<SchoolIncidentReport>(LS_KEYS.schoolIncidents)
}

export const getSchoolIncident = (incidentId: string): SchoolIncidentReport | undefined => {
  const incidents = listSchoolIncidents();
  return incidents.find(i => i.incident_id === incidentId);
};

export const saveSchoolIncident = (data: Partial<SchoolIncidentReport> & { incident_id?: string }): SchoolIncidentReport => {
  const now = new Date().toISOString();
  // Persist to Supabase (best-effort)
  try { void schoolIncidentsService.upsert(data as any) } catch {}
  const items = listSchoolIncidents();
  
  if (data.incident_id) {
    // Update existing
    const idx = items.findIndex(i => i.incident_id === data.incident_id);
    if (idx >= 0) {
      const updated: SchoolIncidentReport = { 
        ...items[idx], 
        ...data, 
        updated_at: now 
      } as SchoolIncidentReport;
      items[idx] = updated;
      writeArray(LS_KEYS.schoolIncidents, items);
      return updated;
    }
  }
  
  // Create new
  const year = new Date().getFullYear();
  const existingThisYear = items.filter(i => i.incident_id.startsWith(`HHH-${year}`));
  const nextNumber = existingThisYear.length + 1;
  const incident_id = `HHH-${year}-${String(nextNumber).padStart(4, '0')}`;
  
  const created: SchoolIncidentReport = { 
    ...(data as any), 
    incident_id,
    created_at: now, 
    updated_at: now 
  };
  items.push(created);
  writeArray(LS_KEYS.schoolIncidents, items);
  return created;
};

export const deleteSchoolIncident = (incidentId: string) => {
  try { void schoolIncidentsService.delete(incidentId) } catch {}
  writeArray(
    LS_KEYS.schoolIncidents, 
    listSchoolIncidents().filter(i => i.incident_id !== incidentId)
  );
};
