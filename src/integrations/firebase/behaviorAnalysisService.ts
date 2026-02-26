import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export interface BehaviorEventRow {
  description: string;
  trigger: string;
  thoughts: string;
  feelings: string;
  behaviors: string;
  consequences: string;
  alternativeResponses: string;
}

export interface BehaviorWorksheetRow {
  id: string;
  youth_id: string;
  events: BehaviorEventRow[];
  summary: string;
  skills_to_improve: string[];
  created_at: string;
  updated_at: string;
}

const COLLECTION = "behavior_analysis_worksheets";

export const behaviorAnalysisService = {
  async getByYouthId(youthId: string): Promise<BehaviorWorksheetRow | null> {
    const ref = doc(db, COLLECTION, youthId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data() as Partial<BehaviorWorksheetRow>;
    return {
      id: snap.id,
      youth_id: youthId,
      events: Array.isArray(data.events) ? data.events : [],
      summary: data.summary || "",
      skills_to_improve: Array.isArray(data.skills_to_improve) ? data.skills_to_improve : [],
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };
  },

  async save(
    youthId: string,
    payload: {
      events: BehaviorEventRow[];
      summary: string;
      skills_to_improve: string[];
    }
  ): Promise<BehaviorWorksheetRow> {
    const ref = doc(db, COLLECTION, youthId);
    const existing = await getDoc(ref);
    const now = new Date().toISOString();
    const createdAt = existing.exists()
      ? ((existing.data() as Partial<BehaviorWorksheetRow>)?.created_at || now)
      : now;

    const data: BehaviorWorksheetRow = {
      id: youthId,
      youth_id: youthId,
      events: payload.events,
      summary: payload.summary,
      skills_to_improve: payload.skills_to_improve,
      created_at: createdAt,
      updated_at: now,
    };

    await setDoc(ref, data, { merge: true });
    return data;
  },
};

