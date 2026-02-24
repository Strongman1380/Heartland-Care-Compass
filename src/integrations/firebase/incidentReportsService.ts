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
} from 'firebase/firestore'
import type { FacilityIncidentReport } from '@/types/facility-incident-types'

const COLLECTION = 'facility_incidents'

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
    const data = {
      ...report,
      id,
      updatedAt: now,
      createdAt: report.createdAt || now,
    }
    await setDoc(doc(db, COLLECTION, id), data, { merge: true })
    const snap = await getDoc(doc(db, COLLECTION, id))
    return { id: snap.id, ...snap.data() } as FacilityIncidentReport
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id))
  },
}
