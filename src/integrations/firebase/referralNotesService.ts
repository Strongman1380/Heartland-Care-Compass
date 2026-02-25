import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type ReferralNoteRow = {
  id: string;
  referral_name: string;
  referral_source?: string | null;
  referral_date?: string | null;
  staff_name?: string | null;
  status?: string | null;
  priority?: string | null;
  summary?: string | null;
  parsed_data?: any;
  raw_text?: string | null;
  interview_report?: string | null;
  director_summary?: string | null;
  archived?: boolean;
  archived_at?: string | null;
  archive_reason?: string | null;
  archive_reason_detail?: string | null;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "referral_notes";

const mapReferralDoc = (
  snap: { id: string; data: () => Record<string, unknown> | undefined }
): ReferralNoteRow => {
  const data = (snap.data() || {}) as Record<string, unknown>;
  // Always trust Firestore document id over any stored `id` field in data.
  return { ...data, id: snap.id } as ReferralNoteRow;
};

export const referralNotesService = {
  async list(): Promise<ReferralNoteRow[]> {
    const q = query(collection(db, COLLECTION), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => mapReferralDoc(d));
  },

  async save(row: Partial<ReferralNoteRow> & { referral_name: string }): Promise<ReferralNoteRow> {
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
    if (!snap.exists()) throw new Error(`Failed to read referral note after save: ${id}`);
    return mapReferralDoc(snap);
  },

  async update(id: string, updates: Partial<ReferralNoteRow>): Promise<ReferralNoteRow> {
    const ref = doc(db, COLLECTION, id);
    // Strip protected fields that callers should not overwrite
    const { id: _id, created_at: _ca, ...allowed } = updates;
    const payload: Record<string, unknown> = { ...allowed, updated_at: new Date().toISOString() };
    await updateDoc(ref, payload);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Referral note not found after update: ${id}`);
    return mapReferralDoc(snap);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
