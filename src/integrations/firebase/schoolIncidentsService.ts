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
  where,
  writeBatch
} from 'firebase/firestore'

export type SchoolIncident = {
  incident_id: string
  date_time: string
  reported_by: any
  location: string
  incident_type: string
  severity: 'Low' | 'Medium' | 'High' | 'Critical'
  summary: string
  timeline: any[]
  actions_taken?: string
  medical_needed: boolean
  medical_details?: string
  attachments: any[]
  staff_signatures: any[]
  follow_up?: any
  confidential_notes?: string
  created_at: string
  updated_at: string
}

export type Involved = {
  id: string
  incident_id: string
  resident_id: string
  name?: string
  role_in_incident: string
}

export const schoolIncidentsService = {
  async list(): Promise<SchoolIncident[]> {
    const q = query(collection(db, 'school_incidents'), orderBy('date_time', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ incident_id: d.id, ...d.data() } as SchoolIncident))
  },

  async get(incident_id: string): Promise<SchoolIncident | null> {
    const docSnap = await getDoc(doc(db, 'school_incidents', incident_id))
    if (!docSnap.exists()) return null
    return { incident_id: docSnap.id, ...docSnap.data() } as SchoolIncident
  },

  async upsert(incident: Partial<SchoolIncident> & { incident_id?: string }): Promise<SchoolIncident> {
    let id = incident.incident_id
    if (!id) {
      const year = new Date().getFullYear()
      const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
      id = `HHH-${year}-${rand}`
    }
    const now = new Date().toISOString()
    const data = { ...incident, incident_id: id, updated_at: now, created_at: incident.created_at || now }
    await setDoc(doc(db, 'school_incidents', id), data, { merge: true })
    const snap = await getDoc(doc(db, 'school_incidents', id))
    return { incident_id: snap.id, ...snap.data() } as SchoolIncident
  },

  async delete(incident_id: string): Promise<void> {
    await deleteDoc(doc(db, 'school_incidents', incident_id))
  },

  async listInvolved(incident_id: string): Promise<Involved[]> {
    const q = query(
      collection(db, 'school_incident_involved'),
      where('incident_id', '==', incident_id)
    )
    const snapshot = await getDocs(q)
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Involved))
  },

  async upsertInvolved(rows: Omit<Involved, 'id'>[]): Promise<Involved[]> {
    const batch = writeBatch(db)
    const results: Involved[] = []
    for (const row of rows) {
      const ref = doc(collection(db, 'school_incident_involved'))
      const data = { ...row, id: ref.id }
      batch.set(ref, data)
      results.push(data as Involved)
    }
    await batch.commit()
    return results
  },

  async deleteInvolvedByIncident(incident_id: string): Promise<void> {
    const q = query(
      collection(db, 'school_incident_involved'),
      where('incident_id', '==', incident_id)
    )
    const snapshot = await getDocs(q)
    const batch = writeBatch(db)
    snapshot.docs.forEach(d => batch.delete(d.ref))
    if (snapshot.docs.length > 0) await batch.commit()
  }
}
