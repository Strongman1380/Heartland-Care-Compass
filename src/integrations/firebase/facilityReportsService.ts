import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type FacilityReportRow = {
  id: string;
  title: string;
  timeframe: "week" | "month" | "quarter" | "year";
  generated_at: string;
  generated_by?: string | null;
  report_html: string;
  kpi_snapshot?: Record<string, unknown> | null;
  archived?: boolean;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "facility_reports";

export const facilityReportsService = {
  async list(limit = 500): Promise<FacilityReportRow[]> {
    const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 500, 1000));
    const q = query(collection(db, COLLECTION), orderBy("generated_at", "desc"), firestoreLimit(safeLimit));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FacilityReportRow));
  },

  async save(
    row: Partial<FacilityReportRow> & {
      title: string;
      timeframe: "week" | "month" | "quarter" | "year";
      generated_at: string;
      report_html: string;
    }
  ): Promise<FacilityReportRow> {
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
    if (!snapData) throw new Error(`Failed to read facility report after save: ${id}`);
    return { id: snap.id, ...snapData } as FacilityReportRow;
  },

  async update(id: string, updates: Partial<FacilityReportRow>): Promise<FacilityReportRow> {
    const ref = doc(db, COLLECTION, id);
    const preCheck = await getDoc(ref);
    if (!preCheck.exists()) throw new Error(`Facility report not found: ${id}`);
    const { id: _id, created_at: _createdAt, ...allowed } = updates;
    await updateDoc(ref, { ...allowed, updated_at: new Date().toISOString() } as Record<string, unknown>);
    const snap = await getDoc(ref);
    const snapData = snap.data();
    if (!snapData) throw new Error(`Facility report not found after update: ${id}`);
    return { id: snap.id, ...snapData } as FacilityReportRow;
  },

  async delete(id: string): Promise<void> {
    const ref = doc(db, COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Facility report not found: ${id}`);
    await deleteDoc(ref);
  },
};

