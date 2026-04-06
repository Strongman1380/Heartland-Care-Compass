import { db } from '@/lib/firebase'
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore'
import type { FacilityIncidentReport } from '@/types/facility-incident-types'

const COLLECTION = 'facility_incidents'

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T
  }

  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
      if (val === undefined) return
      result[key] = stripUndefinedDeep(val)
    })
    return result as T
  }

  return value
}

function generateId(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `HBH-IR-${year}-${rand}`
}

export const incidentReportsService = {
  async list(): Promise<FacilityIncidentReport[]> {
    const q = query(collection(db, COLLECTION), orderBy('dateOfIncident', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FacilityIncidentReport))
  },

  async get(id: string): Promise<FacilityIncidentReport | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id))
    if (!docSnap.exists()) return null
    return { id: docSnap.id, ...docSnap.data() } as FacilityIncidentReport
  },

  async save(report: Partial<FacilityIncidentReport> & { id?: string }): Promise<FacilityIncidentReport> {
    const id = report.id || generateId()
    const now = new Date().toISOString()
    const data = stripUndefinedDeep({
      ...report,
      id,
      updatedAt: now,
      createdAt: report.createdAt || now,
    })
    await setDoc(doc(db, COLLECTION, id), data, { merge: true })
    const snap = await getDoc(doc(db, COLLECTION, id))
    return { id: snap.id, ...snap.data() } as FacilityIncidentReport
  },

  async saveBulk(reports: Partial<FacilityIncidentReport>[]): Promise<string[]> {
    const batch = writeBatch(db)
    const now = new Date().toISOString()
    const createdIds: string[] = []

    reports.forEach((report) => {
      const id = report.id || generateId()
      const data = stripUndefinedDeep({
        ...report,
        id,
        updatedAt: now,
        createdAt: report.createdAt || now,
      })
      const docRef = doc(db, COLLECTION, id)
      batch.set(docRef, data, { merge: true })
      createdIds.push(id)
    })

    await batch.commit()
    return createdIds
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
