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
    const id = row.id || uuidv4();
    const now = new Date().toISOString();
    const data = {
      ...row,
      id,
      updated_at: now,
      created_at: row.created_at || now,
    };
    await setDoc(doc(db, COLLECTION, id), data, { merge: true });
    const snap = await getDoc(doc(db, COLLECTION, id));
    const snapData = snap.data();
    if (!snapData) throw new Error(`Failed to read KPI report after save: ${id}`);
    return { id: snap.id, ...snapData } as KpiReportRow;
  },

  async update(id: string, updates: Partial<KpiReportRow>): Promise<KpiReportRow> {
    const ref = doc(db, COLLECTION, id);
    const { id: _id, created_at: _createdAt, ...allowed } = updates;
    await updateDoc(ref, { ...allowed, updated_at: new Date().toISOString() } as Record<string, unknown>);
    const snap = await getDoc(ref);
    const snapData = snap.data();
    if (!snapData) throw new Error(`KPI report not found after update: ${id}`);
    return { id: snap.id, ...snapData } as KpiReportRow;
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};

