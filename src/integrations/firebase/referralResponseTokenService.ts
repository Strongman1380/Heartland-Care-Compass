import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { buildApiUrl } from "@/utils/apiUrl";

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
    const response = await fetch(buildApiUrl(`/api/public/po-response/${encodeURIComponent(token)}`));
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error("Failed to load response token");
    }
    return await response.json() as ResponseToken;
  },

  async saveResponse(token: string, response: PlacementResponse): Promise<void> {
    const result = await fetch(buildApiUrl(`/api/public/po-response/${encodeURIComponent(token)}`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ response }),
    });

    if (!result.ok) {
      const payload = await result.json().catch(() => ({}));
      throw new Error(payload.error || "Failed to record PO response");
    }
  },
};

export { RESPONSE_LABELS };
