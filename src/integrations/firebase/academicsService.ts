import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { logAuditBestEffort } from '@/integrations/firebase/auditLogBestEffort'
import { canonicalYouthId, dateOnlyIso, stripUndefinedDeep, validateRecord, withFirestoreMeta } from '@/integrations/firebase/dataGovernance'
import { academicCreditSchema, academicGradeSchema, academicStepSchema } from '@/schemas/database-records'

export type CreditRow = {
  id: string
  youth_id: string
  student_id: string
  event_date: string
  date_earned: string
  credit_value: number
  source?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}
export type GradeRow = {
  id: string
  youth_id: string
  student_id: string
  event_date: string
  date_entered: string
  grade_value: number
  course_name?: string
  source?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}
export type StepRow = {
  id: string
  youth_id: string
  student_id: string
  event_date: string
  date_completed: string
  steps_count: number
  source?: string | null
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

const normalizeAcademicRow = <T extends { youth_id?: string; student_id?: string; date_earned?: string; date_entered?: string; date_completed?: string }>(row: T) => {
  const youthId = canonicalYouthId(row)
  const eventDate = row.date_earned || row.date_entered || row.date_completed
  return {
    ...row,
    youth_id: youthId,
    student_id: youthId,
    event_date: eventDate,
  }
}

export const academicsService = {
  credits: {
    async list(): Promise<CreditRow[]> {
      const q = query(collection(db, 'academic_credits'), orderBy('date_earned', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => normalizeAcademicRow({ id: d.id, ...d.data() } as CreditRow) as CreditRow)
    },
    async save(row: Partial<CreditRow> & { youth_id?: string; student_id?: string; date_earned: string; credit_value: number }): Promise<CreditRow> {
      const id = row.id || uuidv4()
      const youthId = canonicalYouthId(row)
      const existing = row.id ? await getDoc(doc(db, 'academic_credits', id)) : null
      const existingData = existing?.exists() ? (existing.data() as Record<string, unknown>) : null
      const validated = validateRecord(
        academicCreditSchema,
        withFirestoreMeta(stripUndefinedDeep({
          ...(existingData || {}),
          ...row,
          id,
          youth_id: youthId,
          student_id: youthId,
          date_earned: dateOnlyIso(row.date_earned),
          event_date: dateOnlyIso(row.date_earned),
        }), {
          isNew: !existing?.exists(),
          createdBy: row.created_by || null,
          updatedBy: row.updated_by || row.created_by || null,
          source: row.source || 'manual',
        })
      ) as CreditRow
      await setDoc(doc(db, 'academic_credits', id), validated, { merge: true })
      await logAuditBestEffort({
        entity_type: 'academic_credit',
        entity_id: id,
        action: existingData ? 'update' : 'create',
        youth_id: youthId,
        changed_at: validated.updated_at,
        changed_by: validated.updated_by || validated.created_by || null,
        source: validated.source || 'manual',
        before: existingData,
        after: validated,
      }, 'save', 'academicsService')
      const snap = await getDoc(doc(db, 'academic_credits', id))
      return normalizeAcademicRow({ id: snap.id, ...snap.data() } as CreditRow) as CreditRow
    },
    async delete(id: string): Promise<void> {
      const ref = doc(db, 'academic_credits', id)
      const existing = await getDoc(ref)
      await deleteDoc(doc(db, 'academic_credits', id))
      if (existing.exists()) {
        const row = normalizeAcademicRow({ id: existing.id, ...existing.data() } as CreditRow) as CreditRow
        await logAuditBestEffort({
          entity_type: 'academic_credit',
          entity_id: id,
          action: 'delete',
          youth_id: row.youth_id,
          changed_at: new Date().toISOString(),
          changed_by: row.updated_by || row.created_by || null,
          source: row.source || 'manual',
          before: row,
        }, 'delete', 'academicsService')
      }
    }
  },
  grades: {
    async list(): Promise<GradeRow[]> {
      const q = query(collection(db, 'academic_grades'), orderBy('date_entered', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => normalizeAcademicRow({ id: d.id, ...d.data() } as GradeRow) as GradeRow)
    },
    async save(row: Partial<GradeRow> & { youth_id?: string; student_id?: string; date_entered: string; grade_value: number }): Promise<GradeRow> {
      const id = row.id || uuidv4()
      const youthId = canonicalYouthId(row)
      const existing = row.id ? await getDoc(doc(db, 'academic_grades', id)) : null
      const existingData = existing?.exists() ? (existing.data() as Record<string, unknown>) : null
      const validated = validateRecord(
        academicGradeSchema,
        withFirestoreMeta(stripUndefinedDeep({
          ...(existingData || {}),
          ...row,
          id,
          youth_id: youthId,
          student_id: youthId,
          date_entered: dateOnlyIso(row.date_entered),
          event_date: dateOnlyIso(row.date_entered),
        }), {
          isNew: !existing?.exists(),
          createdBy: row.created_by || null,
          updatedBy: row.updated_by || row.created_by || null,
          source: row.source || 'manual',
        })
      ) as GradeRow
      await setDoc(doc(db, 'academic_grades', id), validated, { merge: true })
      await logAuditBestEffort({
        entity_type: 'academic_grade',
        entity_id: id,
        action: existingData ? 'update' : 'create',
        youth_id: youthId,
        changed_at: validated.updated_at,
        changed_by: validated.updated_by || validated.created_by || null,
        source: validated.source || 'manual',
        before: existingData,
        after: validated,
      }, 'save', 'academicsService')
      const snap = await getDoc(doc(db, 'academic_grades', id))
      return normalizeAcademicRow({ id: snap.id, ...snap.data() } as GradeRow) as GradeRow
    },
    async delete(id: string): Promise<void> {
      const ref = doc(db, 'academic_grades', id)
      const existing = await getDoc(ref)
      await deleteDoc(doc(db, 'academic_grades', id))
      if (existing.exists()) {
        const row = normalizeAcademicRow({ id: existing.id, ...existing.data() } as GradeRow) as GradeRow
        await logAuditBestEffort({
          entity_type: 'academic_grade',
          entity_id: id,
          action: 'delete',
          youth_id: row.youth_id,
          changed_at: new Date().toISOString(),
          changed_by: row.updated_by || row.created_by || null,
          source: row.source || 'manual',
          before: row,
        }, 'delete', 'academicsService')
      }
    }
  },
  steps: {
    async list(): Promise<StepRow[]> {
      const q = query(collection(db, 'academic_steps_completed'), orderBy('date_completed', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => normalizeAcademicRow({ id: d.id, ...d.data() } as StepRow) as StepRow)
    },
    async save(row: Partial<StepRow> & { youth_id?: string; student_id?: string; date_completed: string; steps_count: number }): Promise<StepRow> {
      const id = row.id || uuidv4()
      const youthId = canonicalYouthId(row)
      const existing = row.id ? await getDoc(doc(db, 'academic_steps_completed', id)) : null
      const existingData = existing?.exists() ? (existing.data() as Record<string, unknown>) : null
      const validated = validateRecord(
        academicStepSchema,
        withFirestoreMeta(stripUndefinedDeep({
          ...(existingData || {}),
          ...row,
          id,
          youth_id: youthId,
          student_id: youthId,
          date_completed: dateOnlyIso(row.date_completed),
          event_date: dateOnlyIso(row.date_completed),
        }), {
          isNew: !existing?.exists(),
          createdBy: row.created_by || null,
          updatedBy: row.updated_by || row.created_by || null,
          source: row.source || 'manual',
        })
      ) as StepRow
      await setDoc(doc(db, 'academic_steps_completed', id), validated, { merge: true })
      await logAuditBestEffort({
        entity_type: 'academic_step',
        entity_id: id,
        action: existingData ? 'update' : 'create',
        youth_id: youthId,
        changed_at: validated.updated_at,
        changed_by: validated.updated_by || validated.created_by || null,
        source: validated.source || 'manual',
        before: existingData,
        after: validated,
      }, 'save', 'academicsService')
      const snap = await getDoc(doc(db, 'academic_steps_completed', id))
      return normalizeAcademicRow({ id: snap.id, ...snap.data() } as StepRow) as StepRow
    },
    async delete(id: string): Promise<void> {
      const ref = doc(db, 'academic_steps_completed', id)
      const existing = await getDoc(ref)
      await deleteDoc(doc(db, 'academic_steps_completed', id))
      if (existing.exists()) {
        const row = normalizeAcademicRow({ id: existing.id, ...existing.data() } as StepRow) as StepRow
        await logAuditBestEffort({
          entity_type: 'academic_step',
          entity_id: id,
          action: 'delete',
          youth_id: row.youth_id,
          changed_at: new Date().toISOString(),
          changed_by: row.updated_by || row.created_by || null,
          source: row.source || 'manual',
          before: row,
        }, 'delete', 'academicsService')
      }
    }
  }
}
