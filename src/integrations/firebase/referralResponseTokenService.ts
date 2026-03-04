import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { referralNotesService } from "./referralNotesService";
import { format } from "date-fns";

const COLLECTION = "referral_response_tokens";

export type PlacementResponse = "still_needed" | "not_needed" | "already_placed";

export type ResponseToken = {
  token: string;
  referralId: string;
  referralName: string;
  poName: string;
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  response: PlacementResponse | null;
};

const RESPONSE_LABELS: Record<PlacementResponse, string> = {
  still_needed: "Still needs placement",
  not_needed: "No longer needs placement",
  already_placed: "Already placed elsewhere",
};

export const referralResponseTokenService = {
  async create(referralId: string, referralName: string, poName: string): Promise<string> {
    const token = uuidv4();
    const now = new Date();
    const expires = new Date(now);
    expires.setDate(expires.getDate() + 14);

    const data: ResponseToken = {
      token,
      referralId,
      referralName,
      poName,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      respondedAt: null,
      response: null,
    };

    await setDoc(doc(db, COLLECTION, token), data);
    return token;
  },

  async get(token: string): Promise<ResponseToken | null> {
    const snap = await getDoc(doc(db, COLLECTION, token));
    if (!snap.exists()) return null;
    return snap.data() as ResponseToken;
  },

  async saveResponse(token: string, response: PlacementResponse): Promise<void> {
    const tokenDoc = await this.get(token);
    if (!tokenDoc) throw new Error("Response token not found");

    if (tokenDoc.respondedAt) {
      throw new Error("This response link has already been used");
    }

    if (new Date(tokenDoc.expiresAt) <= new Date()) {
      throw new Error("This response link has expired");
    }

    const now = new Date().toISOString();
    await updateDoc(doc(db, COLLECTION, token), {
      respondedAt: now,
      response,
    });

    // Atomically append to referral po_contact_log
    const newEntry = {
      id: uuidv4(),
      date: format(new Date(), "yyyy-MM-dd"),
      notes: `PO Response (via link): ${RESPONSE_LABELS[response]}`,
      followUpDate: "",
    };
    await referralNotesService.atomicAppendPoContactLog(tokenDoc.referralId, newEntry);
  },
};

export { RESPONSE_LABELS };
