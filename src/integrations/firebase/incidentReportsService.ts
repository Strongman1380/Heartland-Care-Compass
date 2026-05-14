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
import { youthService } from '@/integrations/firebase/services'
import { logAuditBestEffort } from '@/integrations/firebase/auditLogBestEffort'
import { dateOnlyIso, nowIso, stripUndefinedDeep, withFirestoreMeta } from '@/integrations/firebase/dataGovernance'

const COLLECTION = 'facility_incidents'

function generateId(): string {
  const year = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `HBH-IR-${year}-${rand}`
}

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: string }).code === 'permission-denied'
  )
}

async function resolveYouthId(report: Partial<FacilityIncidentReport>): Promise<string | undefined> {
  if (report.youth_id) return report.youth_id
  if (report.subjectType !== 'Resident') return undefined

  const targetFirst = (report.firstName || '').trim().toLowerCase()
  const targetLast = (report.lastName || '').trim().toLowerCase()
  if (!targetFirst || !targetLast) return undefined

  const youth = (await youthService.getAllIncludingArchived()).find(
    (item) => item.firstName.trim().toLowerCase() === targetFirst && item.lastName.trim().toLowerCase() === targetLast
  )
  return youth?.id
}

async function normalizeIncident(report: Partial<FacilityIncidentReport> & { id?: string }, isNew: boolean, existing?: Record<string, unknown> | null): Promise<FacilityIncidentReport> {
  const id = report.id || generateId()
  const youthId = await resolveYouthId(report)
  const normalizedYouthInvolved = (report.youthInvolved || []).map((item) => {
    const normalized = { ...item }
    if (!normalized.youth_id && youthId && normalized.role === 'primary') {
      normalized.youth_id = youthId
    }
    return normalized
  })
  const base = withFirestoreMeta(stripUndefinedDeep({
    ...(existing || {}),
    ...report,
    id,
    youth_id: youthId || report.youth_id,
    event_date: report.dateOfIncident ? dateOnlyIso(report.dateOfIncident) : existing?.event_date,
    dateOfIncident: report.dateOfIncident ? dateOnlyIso(report.dateOfIncident) : existing?.dateOfIncident,
    reportDate: report.reportDate ? dateOnlyIso(report.reportDate) : existing?.reportDate,
    signatureDate: report.signatureDate ? dateOnlyIso(report.signatureDate) : existing?.signatureDate,
    youthName: report.youthName || [report.lastName, [report.firstName, report.initial].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    youthInvolved: normalizedYouthInvolved,
    schema_version: 2,
  }), {
    isNew,
    createdBy: report.created_by || report.submittedBy || report.staffCompletingReport || null,
    updatedBy: report.updated_by || report.submittedBy || report.staffCompletingReport || null,
    source: report.source || 'manual',
  })
  return base as FacilityIncidentReport
}

export const incidentReportsService = {
  async list(): Promise<FacilityIncidentReport[]> {
    const q = query(collection(db, COLLECTION), orderBy('dateOfIncident', 'desc'))
    const snapshot = await getDocs(q)
    return snapshot.docs
      .map(d => ({ ...d.data(), id: d.id } as FacilityIncidentReport & { deleted_at?: string }))
      .filter(report => !report.deleted_at)
  },

  async get(id: string): Promise<FacilityIncidentReport | null> {
    const docSnap = await getDoc(doc(db, COLLECTION, id))
    if (!docSnap.exists()) return null
    return { ...docSnap.data(), id: docSnap.id } as FacilityIncidentReport
  },

  async save(report: Partial<FacilityIncidentReport> & { id?: string }): Promise<FacilityIncidentReport> {
    const id = report.id || generateId()
    const ref = doc(db, COLLECTION, id)
    const existingSnap = report.id ? await getDoc(ref) : null
    const existing = existingSnap?.exists() ? (existingSnap.data() as Record<string, unknown>) : null
    const data = await normalizeIncident(report, !existingSnap?.exists(), existing)
    await setDoc(ref, data, { merge: true })
    await logAuditBestEffort({
      entity_type: 'facility_incident',
      entity_id: id,
      action: existing ? 'update' : 'create',
      youth_id: data.youth_id,
      changed_at: data.updatedAt,
      changed_by: data.updated_by || data.created_by || data.submittedBy || null,
      source: data.source || 'manual',
      before: existing,
      after: data as unknown as Record<string, unknown>,
    }, 'save', 'incidentReportsService')
    const snap = await getDoc(doc(db, COLLECTION, id))
    return { ...snap.data(), id: snap.id } as FacilityIncidentReport
  },

  async saveBulk(reports: Partial<FacilityIncidentReport>[]): Promise<string[]> {
    const batch = writeBatch(db)
    const createdIds: string[] = []

    for (const report of reports) {
      const id = report.id || generateId()
      const data = await normalizeIncident(report, !report.id, null)
      const docRef = doc(db, COLLECTION, id)
      batch.set(docRef, data, { merge: true })
      createdIds.push(id)
    }

    await batch.commit()
    await Promise.all(createdIds.map((id, index) => logAuditBestEffort({
      entity_type: 'facility_incident',
      entity_id: id,
      action: 'create',
      youth_id: reports[index].youth_id,
      changed_at: nowIso(),
      changed_by: reports[index].submittedBy || reports[index].staffCompletingReport || null,
      source: reports[index].source || 'import',
      after: reports[index] as Record<string, unknown>,
      metadata: { bulk: true },
    }, 'bulk import', 'incidentReportsService')))
    return createdIds
  },

  async delete(id: string): Promise<void> {
    const ref = doc(db, COLLECTION, id)
    const existing = await getDoc(ref)
    const deletedAt = nowIso()
    let usedSoftDelete = false

    try {
      await deleteDoc(ref)
    } catch (error) {
      if (!isPermissionDenied(error) || !existing.exists()) {
        throw error
      }

      await setDoc(ref, {
        deleted_at: deletedAt,
        updated_at: deletedAt,
      }, { merge: true })
      usedSoftDelete = true
    }

    if (existing.exists()) {
      const row = { id: existing.id, ...existing.data() } as FacilityIncidentReport
      await logAuditBestEffort({
        entity_type: 'facility_incident',
        entity_id: id,
        action: 'delete',
        youth_id: row.youth_id,
        changed_at: deletedAt,
        changed_by: row.updated_by || row.created_by || row.submittedBy || null,
        source: row.source || 'manual',
        before: row as unknown as Record<string, unknown>,
        metadata: usedSoftDelete ? { delete_mode: 'soft' } : { delete_mode: 'hard' },
      }, 'delete', 'incidentReportsService')
    }
  },
}
