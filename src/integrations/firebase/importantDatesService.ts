import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

export interface ImportantDate {
  id: string
  youth_id: string
  title: string
  date: string        // ISO date string (YYYY-MM-DD)
  type: string        // e.g. 'Court', 'Family', 'Administrative', 'Medical', 'Other'
  createdAt: string
  updatedAt: string
}

export type ImportantDateInsert = Omit<ImportantDate, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string
}

function docToData<T>(docSnap: any): T {
  return { id: docSnap.id, ...docSnap.data() } as T
}

export const importantDatesService = {
  async getByYouthId(youthId: string): Promise<ImportantDate[]> {
    const q = query(
      collection(db, 'youth', youthId, 'important_dates'),
      orderBy('date', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => docToData<ImportantDate>(d))
  },

  async upsert(data: ImportantDateInsert): Promise<ImportantDate> {
    const id = data.id || uuidv4()
    const now = new Date().toISOString()
    const record: ImportantDate = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    }
    await setDoc(
      doc(db, 'youth', data.youth_id, 'important_dates', id),
      record,
      { merge: true }
    )
    return record
  },

  async delete(youthId: string, dateId: string): Promise<void> {
    await deleteDoc(doc(db, 'youth', youthId, 'important_dates', dateId))
  },
}
