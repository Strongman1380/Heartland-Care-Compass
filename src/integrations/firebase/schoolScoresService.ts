import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  where
} from 'firebase/firestore'

export type SchoolScoreRow = {
  id: string
  youth_id: string
  date: string
  weekday: number
  score: number
  created_at: string
  updated_at: string
}

export const schoolScoresService = {
  async upsert(youth_id: string, date: string, weekday: number, score: number): Promise<SchoolScoreRow> {
    const compositeId = `${youth_id}_${date}_${weekday}`
    const now = new Date().toISOString()
    const data: SchoolScoreRow = {
      id: compositeId,
      youth_id,
      date,
      weekday,
      score,
      created_at: now,
      updated_at: now
    }
    await setDoc(doc(db, 'school_daily_scores', compositeId), data, { merge: true })
    // Re-read to get merged data
    const snap = await getDoc(doc(db, 'school_daily_scores', compositeId))
    return { id: snap.id, ...snap.data() } as SchoolScoreRow
  },

  async get(youth_id: string, date: string): Promise<SchoolScoreRow | null> {
    const q = query(
      collection(db, 'school_daily_scores'),
      where('youth_id', '==', youth_id),
      where('date', '==', date)
    )
    const snapshot = await getDocs(q)
    if (snapshot.empty) return null
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SchoolScoreRow
  },

  async range(startISO: string, endISO: string): Promise<SchoolScoreRow[]> {
    const q = query(
      collection(db, 'school_daily_scores'),
      where('date', '>=', startISO),
      where('date', '<=', endISO),
      orderBy('date', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SchoolScoreRow))
  },

  async forYouth(youth_id: string): Promise<SchoolScoreRow[]> {
    const q = query(
      collection(db, 'school_daily_scores'),
      where('youth_id', '==', youth_id)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as SchoolScoreRow))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
  }
}
