import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

export type NoteRow = { id: string; youth_id: string; author_id?: string | null; category?: string | null; text: string; created_at: string; updated_at: string }

export const notesService = {
  async listForYouth(youth_id: string): Promise<NoteRow[]> {
    const q = query(
      collection(db, 'notes'),
      where('youth_id', '==', youth_id),
      orderBy('created_at', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NoteRow))
  },

  async save(row: Partial<NoteRow> & { youth_id: string; text: string }): Promise<NoteRow> {
    const id = row.id || uuidv4()
    const now = new Date().toISOString()
    const data = { ...row, id, updated_at: now, created_at: row.created_at || now }
    await setDoc(doc(db, 'notes', id), data, { merge: true })
    const snap = await getDoc(doc(db, 'notes', id))
    return { id: snap.id, ...snap.data() } as NoteRow
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'notes', id))
  }
}
