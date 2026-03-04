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
  where,
  arrayUnion,
  limit as firestoreLimit,
  type DocumentReference,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type POContactEntry = {
  id: string;
  date: string;
  notes: string;
  followUpDate: string;
};

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
  interview_scheduled_date?: string | null;
  screening_result?: string | null;
  staff_recommendation?: "yes" | "maybe" | "no" | null;
  po_contact_log?: POContactEntry[];
  archived?: boolean;
  archived_at?: string | null;
  archive_reason?: string | null;
  archive_reason_detail?: string | null;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "referral_notes";
type ReferralLookup = {
  id?: string | null;
  created_at?: string | null;
  referral_name?: string | null;
  staff_name?: string | null;
};

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

  async resolveRef(target: string | ReferralLookup): Promise<DocumentReference> {
    const lookup: ReferralLookup = typeof target === "string" ? { id: target } : target;
    const trimmedId = (lookup.id || "").trim();

    if (trimmedId) {
      const directRef = doc(db, COLLECTION, trimmedId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) return directRef;

      const idQuery = query(
        collection(db, COLLECTION),
        where("id", "==", trimmedId),
        firestoreLimit(1)
      );
      const idSnapshot = await getDocs(idQuery);
      if (!idSnapshot.empty) return idSnapshot.docs[0].ref;
    }

    const createdAt = (lookup.created_at || "").trim();
    if (createdAt) {
      const createdQuery = query(
        collection(db, COLLECTION),
        where("created_at", "==", createdAt)
      );
      const createdSnapshot = await getDocs(createdQuery);
      if (!createdSnapshot.empty) {
        const name = (lookup.referral_name || "").trim().toLowerCase();
        const staff = (lookup.staff_name || "").trim().toLowerCase();
        const exact = createdSnapshot.docs.find((snap) => {
          const data = (snap.data() || {}) as Record<string, unknown>;
          const rowName = String(data.referral_name || "").trim().toLowerCase();
          const rowStaff = String(data.staff_name || "").trim().toLowerCase();
          return (!name || rowName === name) && (!staff || rowStaff === staff);
        });
        return (exact || createdSnapshot.docs[0]).ref;
      }
    }

    throw new Error("Referral note not found");
  },

  async update(target: string | ReferralLookup, updates: Partial<ReferralNoteRow>): Promise<ReferralNoteRow> {
    const ref = await this.resolveRef(target);
    // Strip protected fields that callers should not overwrite
    const { id: _id, created_at: _ca, ...allowed } = updates;
    const payload: Record<string, unknown> = { ...allowed, updated_at: new Date().toISOString() };
    await updateDoc(ref, payload);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error(`Referral note not found after update`);
    return mapReferralDoc(snap);
  },

  async atomicAppendPoContactLog(target: string | ReferralLookup, entry: POContactEntry): Promise<void> {
    const ref = await this.resolveRef(target);
    await updateDoc(ref, {
      po_contact_log: arrayUnion(entry),
      updated_at: new Date().toISOString(),
    });
  },

  async delete(target: string | ReferralLookup): Promise<void> {
    const ref = await this.resolveRef(target);
    await deleteDoc(ref);
  },
};
