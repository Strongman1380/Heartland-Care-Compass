import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type ColorAssessmentRow = {
  id: string;
  youth_id: string;
  primary_color: "Gold" | "Blue" | "Green" | "Orange";
  secondary_color?: "Gold" | "Blue" | "Green" | "Orange" | null;
  real_colors_result: string;
  insights?: string | null;
  comments?: string | null;
  observations?: string | null;
  completed_by_type: "staff" | "youth";
  completed_by_name?: string | null;
  created_at: string;
  updated_at: string;
};

const COLLECTION = "real_colors_assessments";

export const realColorsAssessmentsService = {
  async getLatestByYouthId(youthId: string): Promise<ColorAssessmentRow | null> {
    const q = query(collection(db, COLLECTION), where("youth_id", "==", youthId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const latest = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ColorAssessmentRow))
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0];
    return latest || null;
  },

  async getByYouthId(youthId: string, limit = 10): Promise<ColorAssessmentRow[]> {
    const q = query(collection(db, COLLECTION), where("youth_id", "==", youthId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as ColorAssessmentRow))
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .slice(0, Math.max(1, limit));
  },

  async save(
    payload: Omit<ColorAssessmentRow, "id" | "created_at" | "updated_at"> & { id?: string }
  ): Promise<ColorAssessmentRow> {
    const id = payload.id || uuidv4();
    const now = new Date().toISOString();
    const row: ColorAssessmentRow = {
      id,
      youth_id: payload.youth_id,
      primary_color: payload.primary_color,
      secondary_color: payload.secondary_color || null,
      real_colors_result: payload.real_colors_result,
      insights: payload.insights || null,
      comments: payload.comments || null,
      observations: payload.observations || null,
      completed_by_type: payload.completed_by_type,
      completed_by_name: payload.completed_by_name || null,
      created_at: now,
      updated_at: now,
    };

    await setDoc(doc(db, COLLECTION, id), row, { merge: true });
    return row;
  },
};
