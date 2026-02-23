import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  where,
  writeBatch,
  collectionGroup,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import type {
  Youth,
  YouthInsert,
  YouthUpdate,
  BehaviorPoints,
  BehaviorPointsInsert,
  BehaviorPointsUpdate,
  CaseNotes,
  CaseNotesInsert,
  CaseNotesUpdate,
  DailyRatings,
  DailyRatingsInsert,
  DailyRatingsUpdate
} from './types'

// Helper to convert Firestore doc to typed object with id
function docToData<T>(docSnap: any): T {
  return { id: docSnap.id, ...docSnap.data() } as T
}

// Youth Services
export const youthService = {
  async getAll(): Promise<Youth[]> {
    const q = query(collection(db, 'youth'), orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)
    // Filter out discharged youth from the active list
    return snapshot.docs
      .map(d => docToData<Youth>(d))
      .filter(y => y.status !== 'discharged')
  },

  async getById(id: string): Promise<Youth | null> {
    const docSnap = await getDoc(doc(db, 'youth', id))
    if (!docSnap.exists()) return null
    return docToData<Youth>(docSnap)
  },

  async create(youth: YouthInsert): Promise<Youth> {
    const id = youth.id || uuidv4()
    const now = new Date().toISOString()
    const data = { ...youth, id, createdAt: now, updatedAt: now }
    await setDoc(doc(db, 'youth', id), data)
    return data as Youth
  },

  async update(id: string, updates: YouthUpdate): Promise<Youth> {
    console.log('Attempting to update youth:', { id, updates })
    const ref = doc(db, 'youth', id)
    const updatedData = { ...updates, updatedAt: new Date().toISOString() }
    await updateDoc(ref, updatedData as any)
    const updated = await getDoc(ref)
    if (!updated.exists()) throw new Error('Youth not found after update')
    console.log('Youth updated successfully')
    return docToData<Youth>(updated)
  },

  async delete(id: string): Promise<void> {
    console.log('Attempting to delete youth:', id)

    // Delete subcollection data first
    const subcollections = ['behavior_points', 'case_notes', 'daily_ratings', 'progress_notes', 'court_reports', 'report_drafts']
    for (const sub of subcollections) {
      try {
        const subSnap = await getDocs(collection(db, 'youth', id, sub))
        const batch = writeBatch(db)
        subSnap.docs.forEach(d => batch.delete(d.ref))
        if (subSnap.docs.length > 0) await batch.commit()
        console.log(`Deleted ${sub}`)
      } catch (err) {
        console.warn(`Error deleting ${sub}:`, err)
      }
    }

    // Delete the youth document
    await deleteDoc(doc(db, 'youth', id))
    console.log('Youth profile deleted successfully')
  },

  async discharge(id: string, data: {
    dischargeCategory: string
    dischargeReason: string
    dischargeNotes?: string
    dischargedBy?: string
  }): Promise<void> {
    console.log('Discharging youth:', id, data)
    const ref = doc(db, 'youth', id)
    await updateDoc(ref, {
      status: 'discharged',
      dischargeDate: new Date().toISOString().split('T')[0],
      dischargeCategory: data.dischargeCategory,
      dischargeReason: data.dischargeReason,
      dischargeNotes: data.dischargeNotes || null,
      dischargedBy: data.dischargedBy || null,
      updatedAt: new Date().toISOString(),
    } as any)
    console.log('Youth discharged successfully')
  },

  async searchByName(searchTerm: string): Promise<Youth[]> {
    // Firestore doesn't support ILIKE; fetch all and filter client-side (small dataset)
    const all = await this.getAll()
    const term = searchTerm.toLowerCase()
    return all.filter(y =>
      y.firstName?.toLowerCase().includes(term) ||
      y.lastName?.toLowerCase().includes(term)
    )
  }
}

// Behavior Points Services
export const behaviorPointsService = {
  async getAll(): Promise<BehaviorPoints[]> {
    const q = query(collectionGroup(db, 'behavior_points'), orderBy('date', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => docToData<BehaviorPoints>(d))
  },

  async getByYouthId(youthId: string, limit?: number): Promise<BehaviorPoints[]> {
    let q = query(
      collection(db, 'youth', youthId, 'behavior_points'),
      orderBy('date', 'desc')
    )
    if (limit) {
      q = query(q, firestoreLimit(limit))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => docToData<BehaviorPoints>(d))
  },

  async getByDate(youthId: string, date: string): Promise<BehaviorPoints | null> {
    const compositeId = `${youthId}_${date}`
    const docSnap = await getDoc(doc(db, 'youth', youthId, 'behavior_points', compositeId))
    if (!docSnap.exists()) return null
    return docToData<BehaviorPoints>(docSnap)
  },

  async upsert(behaviorPoints: BehaviorPointsInsert): Promise<BehaviorPoints> {
    const youthId = behaviorPoints.youth_id
    const date = behaviorPoints.date || new Date().toISOString().split('T')[0]
    const compositeId = `${youthId}_${date}`
    const now = new Date().toISOString()
    const data = {
      ...behaviorPoints,
      id: compositeId,
      youth_id: youthId,
      date,
      createdAt: behaviorPoints.createdAt || now
    }
    await setDoc(doc(db, 'youth', youthId, 'behavior_points', compositeId), data, { merge: true })
    return data as BehaviorPoints
  },

  async delete(id: string): Promise<void> {
    // id is compositeId: youthId_date; find the doc via collection group
    const q = query(collectionGroup(db, 'behavior_points'), where('id', '==', id))
    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  },

  async deleteAllForYouth(youthId: string): Promise<void> {
    const snapshot = await getDocs(collection(db, 'youth', youthId, 'behavior_points'))
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    if (snapshot.docs.length > 0) await batch.commit()
  }
}

// Case Notes Services
export const caseNotesService = {
  async getAll(): Promise<CaseNotes[]> {
    const q = query(collectionGroup(db, 'case_notes'), orderBy('date', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => docToData<CaseNotes>(d))
  },

  async getByYouthId(youthId: string, limit?: number): Promise<CaseNotes[]> {
    let q = query(
      collection(db, 'youth', youthId, 'case_notes'),
      orderBy('date', 'desc')
    )
    if (limit) {
      q = query(q, firestoreLimit(limit))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => docToData<CaseNotes>(d))
  },

  async create(caseNote: CaseNotesInsert): Promise<CaseNotes> {
    const youthId = caseNote.youth_id
    const id = caseNote.id || uuidv4()
    const now = new Date().toISOString()
    const data = { ...caseNote, id, youth_id: youthId, createdAt: now }
    await setDoc(doc(db, 'youth', youthId, 'case_notes', id), data)
    return data as CaseNotes
  },

  async update(id: string, updates: CaseNotesUpdate): Promise<CaseNotes> {
    // Need to find which youth this note belongs to
    const q = query(collectionGroup(db, 'case_notes'), where('id', '==', id))
    const snapshot = await getDocs(q)
    if (snapshot.empty) throw new Error('Case note not found')
    const docRef = snapshot.docs[0].ref
    await updateDoc(docRef, updates as any)
    const updated = await getDoc(docRef)
    return docToData<CaseNotes>(updated)
  },

  async delete(id: string): Promise<void> {
    const q = query(collectionGroup(db, 'case_notes'), where('id', '==', id))
    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  }
}

// Daily Ratings Services
export const dailyRatingsService = {
  async getByYouthId(youthId: string, limit?: number): Promise<DailyRatings[]> {
    let q = query(
      collection(db, 'youth', youthId, 'daily_ratings'),
      orderBy('date', 'desc')
    )
    if (limit) {
      q = query(q, firestoreLimit(limit))
    }
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => docToData<DailyRatings>(d))
  },

  async getByDate(youthId: string, date: string, timeOfDay?: 'morning' | 'day' | 'evening'): Promise<DailyRatings | null> {
    try {
      const q = query(
        collection(db, 'youth', youthId, 'daily_ratings'),
        where('date', '==', date),
        orderBy('createdAt', 'desc'),
        firestoreLimit(1)
      )
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      return docToData<DailyRatings>(snapshot.docs[0])
    } catch (error) {
      console.error('Error fetching daily rating:', error)
      return null
    }
  },

  async upsert(dailyRating: DailyRatingsInsert & { time_of_day?: 'morning' | 'day' | 'evening' }): Promise<DailyRatings> {
    const { time_of_day, ...payload } = dailyRating as any
    const youthId = payload.youth_id
    const now = new Date().toISOString()

    // If there's an id, update existing
    if (payload.id) {
      const ref = doc(db, 'youth', youthId, 'daily_ratings', payload.id)
      const updatedData = { ...payload, updatedAt: now }
      await setDoc(ref, updatedData, { merge: true })
      return updatedData as DailyRatings
    }

    // Otherwise insert new (allows multiple per day)
    const id = uuidv4()
    const data = { ...payload, id, createdAt: now, updatedAt: now }
    await setDoc(doc(db, 'youth', youthId, 'daily_ratings', id), data)
    return data as DailyRatings
  },

  async delete(id: string): Promise<void> {
    const q = query(collectionGroup(db, 'daily_ratings'), where('id', '==', id))
    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    await batch.commit()
  },

  async deleteByDateRange(youthId: string, startDate: Date, endDate: Date): Promise<void> {
    const startStr = startDate.toISOString().split('T')[0]
    const endStr = endDate.toISOString().split('T')[0]
    const q = query(
      collection(db, 'youth', youthId, 'daily_ratings'),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    )
    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    if (snapshot.docs.length > 0) await batch.commit()
  },

  async deleteAllForYouth(youthId: string): Promise<void> {
    const snapshot = await getDocs(collection(db, 'youth', youthId, 'daily_ratings'))
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    if (snapshot.docs.length > 0) await batch.commit()
  }
}

// Utility functions
export const supabaseUtils = {
  async testConnection(): Promise<boolean> {
    try {
      const q = query(collection(db, 'youth'), firestoreLimit(1))
      await getDocs(q)
      return true
    } catch {
      return false
    }
  },

  async testRealColorsField(): Promise<boolean> {
    try {
      const q = query(collection(db, 'youth'), firestoreLimit(1))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return true
      const data = snapshot.docs[0].data()
      return 'realColorsResult' in data
    } catch (err) {
      console.error('Real Colors field test failed:', err)
      return false
    }
  },

  async getTableInfo(): Promise<any> {
    try {
      const q = query(collection(db, 'youth'), firestoreLimit(1))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      const data = snapshot.docs[0].data()
      console.log('Sample youth record structure:', Object.keys(data))
      return data
    } catch (err) {
      console.error('Failed to get table info:', err)
      return null
    }
  },

  async getStats() {
    const [youthSnap, bpSnap, cnSnap, drSnap] = await Promise.all([
      getDocs(collection(db, 'youth')),
      getDocs(collectionGroup(db, 'behavior_points')),
      getDocs(collectionGroup(db, 'case_notes')),
      getDocs(collectionGroup(db, 'daily_ratings'))
    ])
    return {
      youth: youthSnap.size,
      behaviorPoints: bpSnap.size,
      caseNotes: cnSnap.size,
      dailyRatings: drSnap.size
    }
  }
}

// Export types for use in components
export type {
  Youth,
  YouthInsert,
  YouthUpdate,
  BehaviorPoints,
  BehaviorPointsInsert,
  BehaviorPointsUpdate,
  CaseNotes,
  CaseNotesInsert,
  CaseNotesUpdate,
  DailyRatings,
  DailyRatingsInsert,
  DailyRatingsUpdate
}
