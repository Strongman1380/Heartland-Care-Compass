import { db } from "@/lib/firebase";
import { collection, doc, getDocs, orderBy, query, setDoc, where } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { auditLogSchema } from "@/schemas/database-records";
import { stripUndefinedDeep, validateRecord } from "@/integrations/firebase/dataGovernance";

export type AuditLogRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  action: "create" | "update" | "delete" | "snapshot";
  youth_id?: string;
  changed_at: string;
  changed_by?: string | null;
  source?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

const COLLECTION = "audit_log";

export const auditLogService = {
  async log(entry: Omit<AuditLogRow, "id"> & { id?: string }): Promise<AuditLogRow> {
    const id = entry.id || uuidv4();
    const validated = validateRecord(auditLogSchema, stripUndefinedDeep({ ...entry, id }));
    await setDoc(doc(db, COLLECTION, id), validated, { merge: true });
    return validated as AuditLogRow;
  },

  async listForEntity(entityType: string, entityId: string): Promise<AuditLogRow[]> {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTION),
        where("entity_type", "==", entityType),
        where("entity_id", "==", entityId),
        orderBy("changed_at", "desc")
      )
    );
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as AuditLogRow));
  },

  async listRecent(limitCount = 25): Promise<AuditLogRow[]> {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTION),
        orderBy("changed_at", "desc")
      )
    );
    return snapshot.docs.slice(0, limitCount).map((item) => ({ id: item.id, ...item.data() } as AuditLogRow));
  },
};
