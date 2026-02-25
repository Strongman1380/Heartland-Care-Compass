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

export type ShiftType = 'day' | 'evening' | 'night'

// Weekly eval scores (4-domain: Peer, Adult, Investment, Authority)
export type WeeklyEvalRow = {
  id: string
  youth_id: string
  week_date: string   // ISO date of the week start
  peer: number         // 0-40 (stored as tenths)
  adult: number
  investment: number
  authority: number
  source: 'manual' | 'uploaded'
  created_at: string
  updated_at: string
}

// Daily shift scores (per shift with 4 domains)
export type DailyShiftRow = {
  id: string
  youth_id: string
  date: string         // ISO yyyy-mm-dd
  shift: ShiftType
  peer: number         // 0-40 (stored as tenths)
  adult: number
  investment: number
  authority: number
  staff?: string
  created_at: string
  updated_at: string
}

const WEEKLY_COLLECTION = 'weekly_eval_scores'
const DAILY_COLLECTION = 'daily_shift_scores'

export const weeklyEvalService = {
  async upsert(youth_id: string, week_date: string, peer: number, adult: number, investment: number, authority: number, source: 'manual' | 'uploaded' = 'manual'): Promise<WeeklyEvalRow> {
    const compositeId = `${youth_id}_${week_date}`
    const now = new Date().toISOString()
    const data: WeeklyEvalRow = {
      id: compositeId,
      youth_id,
      week_date,
      peer, adult, investment, authority,
      source,
      created_at: now,
      updated_at: now
    }
    await setDoc(doc(db, WEEKLY_COLLECTION, compositeId), data, { merge: true })
    const snap = await getDoc(doc(db, WEEKLY_COLLECTION, compositeId))
    return { id: snap.id, ...snap.data() } as WeeklyEvalRow
  },

  async forYouth(youth_id: string): Promise<WeeklyEvalRow[]> {
    const q = query(
      collection(db, WEEKLY_COLLECTION),
      where('youth_id', '==', youth_id),
      orderBy('week_date', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyEvalRow))
  },

  async forYouthInRange(youth_id: string, startISO: string, endISO: string): Promise<WeeklyEvalRow[]> {
    const q = query(
      collection(db, WEEKLY_COLLECTION),
      where('youth_id', '==', youth_id),
      where('week_date', '>=', startISO),
      where('week_date', '<=', endISO),
      orderBy('week_date', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyEvalRow))
  },

  async range(startISO: string, endISO: string): Promise<WeeklyEvalRow[]> {
    const q = query(
      collection(db, WEEKLY_COLLECTION),
      where('week_date', '>=', startISO),
      where('week_date', '<=', endISO),
      orderBy('week_date', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as WeeklyEvalRow))
  }
}

export const dailyShiftService = {
  async upsert(youth_id: string, date: string, shift: ShiftType, peer: number, adult: number, investment: number, authority: number, staff?: string): Promise<DailyShiftRow> {
    const compositeId = `${youth_id}_${date}_${shift}`
    const now = new Date().toISOString()
    const data: DailyShiftRow = {
      id: compositeId,
      youth_id,
      date,
      shift,
      peer, adult, investment, authority,
      staff: staff || '',
      created_at: now,
      updated_at: now
    }
    await setDoc(doc(db, DAILY_COLLECTION, compositeId), data, { merge: true })
    const snap = await getDoc(doc(db, DAILY_COLLECTION, compositeId))
    return { id: snap.id, ...snap.data() } as DailyShiftRow
  },

  async range(startISO: string, endISO: string): Promise<DailyShiftRow[]> {
    const q = query(
      collection(db, DAILY_COLLECTION),
      where('date', '>=', startISO),
      where('date', '<=', endISO),
      orderBy('date', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyShiftRow))
  },

  async forYouth(youth_id: string): Promise<DailyShiftRow[]> {
    const q = query(
      collection(db, DAILY_COLLECTION),
      where('youth_id', '==', youth_id),
      orderBy('date', 'desc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyShiftRow))
  },

  async forYouthInRange(youth_id: string, startISO: string, endISO: string): Promise<DailyShiftRow[]> {
    const q = query(
      collection(db, DAILY_COLLECTION),
      where('youth_id', '==', youth_id),
      where('date', '>=', startISO),
      where('date', '<=', endISO),
      orderBy('date', 'asc')
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DailyShiftRow))
  }
}
