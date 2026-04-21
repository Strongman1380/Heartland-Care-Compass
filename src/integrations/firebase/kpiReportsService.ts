import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { auditLogService } from "@/integrations/firebase/auditLogService";
import { stripUndefinedDeep, withFirestoreMeta } from "@/integrations/firebase/dataGovernance";

export type KpiReportRow = {
  id: string;
  title: string;
  timeframe: "week" | "month" | "quarter" | "year";
  generated_at: string;
  report_html: string;
  generated_by?: string | null;
  metrics_snapshot?: Record<string, unknown> | null;
  archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "kpi_reports";

export const kpiReportsService = {
  async list(): Promise<KpiReportRow[]> {
    const q = query(collection(db, COLLECTION), orderBy("generated_at", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as KpiReportRow));
  },

  async save(
    row: Partial<KpiReportRow> & {
      title: string;
      timeframe: "week" | "month" | "quarter" | "year";
      generated_at: string;
      report_html: string;
    }
  ): Promise<KpiReportRow> {
    const isNew = !row.id;
    const id = row.id || uuidv4();
    const ref = doc(db, COLLECTION, id);
    const existing = row.id ? await getDoc(ref) : null;
    const existingData = existing?.exists() ? (existing.data() as Record<string, unknown>) : null;
    const data: Record<string, unknown> = withFirestoreMeta(
      stripUndefinedDeep({
        ...(existingData || {}),
        ...row,
        id,
      }),
      {
        isNew,
        createdBy: row.generated_by || null,
        updatedBy: row.generated_by || null,
        source: "assessment-kpi",
      }
    );
    await setDoc(ref, data, { merge: true });
    await auditLogService.log({
      entity_type: "kpi_report",
      entity_id: id,
      action: existingData ? "update" : "create",
      changed_at: String(data.updated_at),
      changed_by: row.generated_by || null,
      source: "assessment-kpi",
      before: existingData,
      after: data,
      metadata: { timeframe: row.timeframe },
    });
    return { ...data, id } as unknown as KpiReportRow;
  },

  async update(id: string, updates: Partial<KpiReportRow>): Promise<KpiReportRow> {
    const ref = doc(db, COLLECTION, id);
    const before = await getDoc(ref);
    const beforeData = before.exists() ? (before.data() as Record<string, unknown>) : null;
    const { id: _id, created_at: _createdAt, ...allowed } = updates;
    await updateDoc(ref, { ...allowed, updated_at: new Date().toISOString() } as Record<string, unknown>);
    const snap = await getDoc(ref);
    const snapData = snap.data();
    if (!snapData) throw new Error(`KPI report not found after update: ${id}`);
    await auditLogService.log({
      entity_type: "kpi_report",
      entity_id: id,
      action: "update",
      changed_at: String(snapData.updated_at || new Date().toISOString()),
      changed_by: updates.generated_by || null,
      source: "assessment-kpi",
      before: beforeData,
      after: snapData as Record<string, unknown>,
    });
    return { id: snap.id, ...snapData } as KpiReportRow;
  },

  async delete(id: string): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    const before = await getDoc(ref);
    await deleteDoc(ref);
    if (before.exists()) {
      await auditLogService.log({
        entity_type: "kpi_report",
        entity_id: id,
        action: "delete",
        changed_at: new Date().toISOString(),
        source: "assessment-kpi",
        before: before.data() as Record<string, unknown>,
      });
    }
  },
};
