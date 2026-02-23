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

export type AlertRow = { id: string; title: string; body?: string; level: string; status: string; created_at: string; updated_at: string }

export const alertsService = {
  async list(): Promise<AlertRow[]> {
    const q = query(collection(db, 'alerts'), orderBy('created_at', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AlertRow))
  },

  async save(row: Partial<AlertRow> & { title: string; level?: string; status?: string }): Promise<AlertRow> {
    const id = row.id || uuidv4()
    const now = new Date().toISOString()
    const data = { level: 'info', status: 'open', ...row, id, updated_at: now, created_at: row.created_at || now }
    await setDoc(doc(db, 'alerts', id), data, { merge: true })
    const snap = await getDoc(doc(db, 'alerts', id))
    return { id: snap.id, ...snap.data() } as AlertRow
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'alerts', id))
  }
}
