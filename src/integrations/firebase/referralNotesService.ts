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
  created_at: string;
  updated_at: string;
};

const COLLECTION = "referral_notes";

export const referralNotesService = {
  async list(): Promise<ReferralNoteRow[]> {
    const q = query(collection(db, COLLECTION), orderBy("created_at", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ReferralNoteRow));
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
    return { id: snap.id, ...snap.data() } as ReferralNoteRow;
  },

  async update(id: string, updates: Partial<ReferralNoteRow>): Promise<ReferralNoteRow> {
    const ref = doc(db, COLLECTION, id);
    await updateDoc(ref, { ...updates, updated_at: new Date().toISOString() } as any);
    const snap = await getDoc(ref);
    return { id: snap.id, ...snap.data() } as ReferralNoteRow;
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
