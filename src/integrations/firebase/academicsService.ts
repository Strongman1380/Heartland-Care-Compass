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

export type CreditRow = { id: string; student_id: string; date_earned: string; credit_value: number; created_at: string; updated_at: string }
export type GradeRow = { id: string; student_id: string; date_entered: string; grade_value: number; created_at: string; updated_at: string }
export type StepRow = { id: string; student_id: string; date_completed: string; steps_count: number; created_at: string; updated_at: string }

export const academicsService = {
  credits: {
    async list(): Promise<CreditRow[]> {
      const q = query(collection(db, 'academic_credits'), orderBy('date_earned', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CreditRow))
    },
    async save(row: Partial<CreditRow> & { student_id: string; date_earned: string; credit_value: number }): Promise<CreditRow> {
      const id = row.id || uuidv4()
      const now = new Date().toISOString()
      const data = { ...row, id, updated_at: now, created_at: row.created_at || now }
      await setDoc(doc(db, 'academic_credits', id), data, { merge: true })
      const snap = await getDoc(doc(db, 'academic_credits', id))
      return { id: snap.id, ...snap.data() } as CreditRow
    },
    async delete(id: string): Promise<void> {
      await deleteDoc(doc(db, 'academic_credits', id))
    }
  },
  grades: {
    async list(): Promise<GradeRow[]> {
      const q = query(collection(db, 'academic_grades'), orderBy('date_entered', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GradeRow))
    },
    async save(row: Partial<GradeRow> & { student_id: string; date_entered: string; grade_value: number }): Promise<GradeRow> {
      const id = row.id || uuidv4()
      const now = new Date().toISOString()
      const data = { ...row, id, updated_at: now, created_at: row.created_at || now }
      await setDoc(doc(db, 'academic_grades', id), data, { merge: true })
      const snap = await getDoc(doc(db, 'academic_grades', id))
      return { id: snap.id, ...snap.data() } as GradeRow
    },
    async delete(id: string): Promise<void> {
      await deleteDoc(doc(db, 'academic_grades', id))
    }
  },
  steps: {
    async list(): Promise<StepRow[]> {
      const q = query(collection(db, 'academic_steps_completed'), orderBy('date_completed', 'desc'))
      const snapshot = await getDocs(q)
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as StepRow))
    },
    async save(row: Partial<StepRow> & { student_id: string; date_completed: string; steps_count: number }): Promise<StepRow> {
      const id = row.id || uuidv4()
      const now = new Date().toISOString()
      const data = { ...row, id, updated_at: now, created_at: row.created_at || now }
      await setDoc(doc(db, 'academic_steps_completed', id), data, { merge: true })
      const snap = await getDoc(doc(db, 'academic_steps_completed', id))
      return { id: snap.id, ...snap.data() } as StepRow
    },
    async delete(id: string): Promise<void> {
      await deleteDoc(doc(db, 'academic_steps_completed', id))
    }
  }
}
