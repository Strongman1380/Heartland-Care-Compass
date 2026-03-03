import { db } from "@/lib/firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";

export type StyleLabel = "HEART" | "ANCHOR" | "MIND" | "SPARK";

// Raw row rankings: keyed as "r1_heart", "r1_anchor", ..., "r6_spark"
export type StyleRankings = Record<string, number>;

export type ColorAssessmentRow = {
  id: string;
  youth_id: string;
  // Style result — stored as "HEART/ANCHOR" (primary/secondary)
  primary_color: StyleLabel | "Gold" | "Blue" | "Green" | "Orange";
  secondary_color?: StyleLabel | "Gold" | "Blue" | "Green" | "Orange" | null;
  real_colors_result: string;
  // Personal Style Profile scores
  heart_score?: number | null;
  anchor_score?: number | null;
  mind_score?: number | null;
  spark_score?: number | null;
  // Raw 24-point rankings (r1_heart … r6_spark), null for staff-totals mode
  rankings?: StyleRankings | null;
  // Metadata
  assessment_date?: string | null;
  observations?: string | null;
  staff_observations?: string | null;
  next_review_date?: string | null;
  // Legacy fields kept for backward compatibility
  insights?: string | null;
  comments?: string | null;
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
      ...payload,
      id,
      created_at: now,
      updated_at: now,
    };

    await setDoc(doc(db, COLLECTION, id), row, { merge: true });
    return row;
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTION, id));
  },
};
