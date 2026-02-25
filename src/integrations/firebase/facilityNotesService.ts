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
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type FacilityNoteRow = {
  id: string;
  note_date: string;
  title: string;
  note_text: string;
  author_name?: string | null;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "facility_notes";

export const facilityNotesService = {
  async list(): Promise<FacilityNoteRow[]> {
    const q = query(collection(db, COLLECTION), orderBy("note_date", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FacilityNoteRow));
  },

  async save(
    row: Partial<FacilityNoteRow> & { note_date: string; title: string; note_text: string }
  ): Promise<FacilityNoteRow> {
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
    if (!snapData) throw new Error(`Failed to read facility note after save: ${id}`);
    return { id: snap.id, ...snapData } as FacilityNoteRow;
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};

