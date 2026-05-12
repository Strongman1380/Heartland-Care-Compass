import { db } from "@/lib/firebase";
import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { kpiSnapshotSchema } from "@/schemas/database-records";
import { stripUndefinedDeep, validateRecord, withFirestoreMeta } from "@/integrations/firebase/dataGovernance";
import { logAuditBestEffort } from "@/integrations/firebase/auditLogBestEffort";

export type KpiSnapshotRow = {
  id: string;
  scope: "program" | "youth";
  timeframe: "week" | "month" | "quarter" | "year";
  snapshot_date: string;
  generated_at: string;
  generated_by?: string | null;
  source?: string | null;
  youth_id?: string;
  metrics: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "kpi_snapshots";

export const kpiSnapshotsService = {
  async list(scope?: KpiSnapshotRow["scope"], youthId?: string): Promise<KpiSnapshotRow[]> {
    const clauses = [collection(db, COLLECTION)] as const;
    let snapshotQuery;
    if (scope && youthId) {
      snapshotQuery = query(clauses[0], where("scope", "==", scope), where("youth_id", "==", youthId), orderBy("generated_at", "desc"));
    } else if (scope) {
      snapshotQuery = query(clauses[0], where("scope", "==", scope), orderBy("generated_at", "desc"));
    } else {
      snapshotQuery = query(clauses[0], orderBy("generated_at", "desc"));
    }
    const snapshot = await getDocs(snapshotQuery);
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as KpiSnapshotRow));
  },

  async save(row: Omit<KpiSnapshotRow, "created_at" | "updated_at"> & { id?: string }): Promise<KpiSnapshotRow> {
    const isNew = !row.id;
    const id = row.id || uuidv4();
    const validated = validateRecord(
      kpiSnapshotSchema,
      withFirestoreMeta(stripUndefinedDeep({ ...row, id }), {
        isNew,
        createdBy: row.generated_by || null,
        updatedBy: row.generated_by || null,
        source: row.source || "dashboard",
      })
    ) as KpiSnapshotRow;
    await setDoc(doc(db, COLLECTION, id), validated, { merge: true });
    await logAuditBestEffort({
      entity_type: "kpi_snapshot",
      entity_id: id,
      action: "snapshot",
      youth_id: validated.youth_id,
      changed_at: validated.generated_at,
      changed_by: validated.generated_by || null,
      source: validated.source || "dashboard",
      after: validated,
      metadata: { scope: validated.scope, timeframe: validated.timeframe, snapshot_date: validated.snapshot_date },
    }, "save", "kpiSnapshotsService");
    return validated;
  },
};
