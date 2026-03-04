import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  referralResponseTokenService,
  type ResponseToken,
  type PlacementResponse,
  RESPONSE_LABELS,
} from "@/integrations/firebase/referralResponseTokenService";
import { alertsService } from "@/integrations/firebase/alertsService";
import emailjs from "@emailjs/browser";
import { format } from "date-fns";

type PageState = "loading" | "active" | "already_responded" | "expired" | "error" | "confirmed";

const RESPONSE_COLORS: Record<PlacementResponse, string> = {
  still_needed: "bg-green-600 hover:bg-green-700",
  not_needed: "bg-red-600 hover:bg-red-700",
  already_placed: "bg-amber-500 hover:bg-amber-600",
};

export default function PoResponsePage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get("r") as PlacementResponse | null;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [tokenDoc, setTokenDoc] = useState<ResponseToken | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedResponse, setConfirmedResponse] = useState<PlacementResponse | null>(null);

  useEffect(() => {
    if (!token) { setPageState("error"); return; }
    referralResponseTokenService.get(token).then((doc) => {
      if (!doc) { setPageState("error"); return; }
      if (doc.respondedAt) { setTokenDoc(doc); setPageState("already_responded"); return; }
      if (new Date(doc.expiresAt) < new Date()) { setTokenDoc(doc); setPageState("expired"); return; }
      setTokenDoc(doc);
      setPageState("active");
    }).catch(() => setPageState("error"));
  }, [token]);

  const handleRespond = async (response: PlacementResponse) => {
    if (!token || !tokenDoc) return;
    setSubmitting(true);
    try {
      await referralResponseTokenService.saveResponse(token, response);

      // In-app alert for staff
      await alertsService.save({
        title: "PO Response Received",
        body: `${tokenDoc.poName || "PO"} responded for ${tokenDoc.referralName}: ${RESPONSE_LABELS[response]}`,
        level: "info",
        status: "open",
      });

      // Email notification to admissions staff
      try {
        await emailjs.send(
          import.meta.env.VITE_EMAILJS_SERVICE_ID,
          import.meta.env.VITE_EMAILJS_PO_RESPONSE_TEMPLATE_ID,
          {
            youth_name: tokenDoc.referralName,
            po_name: tokenDoc.poName || "PO",
            response_text: RESPONSE_LABELS[response],
            date: format(new Date(), "MMMM d, yyyy"),
            to_email: "admissions@heartlandboyshomenebraska.org",
          },
          import.meta.env.VITE_EMAILJS_PUBLIC_KEY
        );
      } catch {
        // Email notification is best-effort; don't fail the whole response
      }

      setConfirmedResponse(response);
      setPageState("confirmed");
    } catch {
      alert("Something went wrong. Please try again or contact Heartland directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-red-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 to-red-700 px-6 py-5 text-white">
          <div className="text-sm font-medium opacity-80 mb-1">Heartland Boys Home</div>
          <h1 className="text-xl font-bold">Placement Status Request</h1>
        </div>

        <div className="px-6 py-6">
          {pageState === "loading" && (
            <div className="text-center py-8 text-slate-500">Loading…</div>
          )}

          {pageState === "error" && (
            <div className="text-center py-8">
              <p className="text-slate-700 font-medium">This link is invalid or has expired.</p>
              <p className="text-slate-500 text-sm mt-2">Please contact Heartland Admissions directly.</p>
            </div>
          )}

          {pageState === "expired" && (
            <div className="text-center py-8">
              <p className="text-slate-700 font-medium">This response link has expired.</p>
              <p className="text-slate-500 text-sm mt-2">
                Please contact Heartland Admissions at{" "}
                <a href="mailto:admissions@heartlandboyshomenebraska.org" className="text-red-700 underline">
                  admissions@heartlandboyshomenebraska.org
                </a>
              </p>
            </div>
          )}

          {pageState === "already_responded" && tokenDoc && (
            <div className="text-center py-8">
              <p className="text-slate-700 font-medium">This link has already been used.</p>
              {tokenDoc.respondedAt && (
                <p className="text-slate-500 text-sm mt-1">
                  Response recorded on {format(new Date(tokenDoc.respondedAt), "MMMM d, yyyy")}
                </p>
              )}
              {tokenDoc.response && (
                <p className="mt-3 inline-block bg-slate-100 text-slate-700 rounded-md px-3 py-1.5 text-sm font-medium">
                  {RESPONSE_LABELS[tokenDoc.response]}
                </p>
              )}
            </div>
          )}

          {pageState === "active" && tokenDoc && (
            <div>
              <p className="text-slate-700 text-sm mb-1">
                Regarding youth: <span className="font-semibold">{tokenDoc.referralName}</span>
              </p>
              <p className="text-slate-800 font-semibold text-lg mt-3 mb-5">
                Does this youth still need placement?
              </p>
              <div className="flex flex-col gap-3">
                {(["still_needed", "not_needed", "already_placed"] as PlacementResponse[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRespond(r)}
                    disabled={submitting}
                    className={`w-full rounded-xl px-4 py-3 text-white font-semibold text-sm transition-colors disabled:opacity-60 ${
                      preselected === r
                        ? `${RESPONSE_COLORS[r]} ring-2 ring-offset-2 ring-slate-400`
                        : RESPONSE_COLORS[r]
                    }`}
                    style={preselected === r ? { outline: "2px solid #64748b" } : {}}
                  >
                    {submitting ? "Saving…" : RESPONSE_LABELS[r]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                This link can only be used once.
              </p>
            </div>
          )}

          {pageState === "confirmed" && confirmedResponse && (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-slate-800 font-semibold text-lg">Thank you!</p>
              <p className="text-slate-600 text-sm mt-2">Your response has been recorded:</p>
              <p className="mt-3 inline-block bg-green-50 text-green-800 border border-green-200 rounded-md px-3 py-1.5 text-sm font-medium">
                {RESPONSE_LABELS[confirmedResponse]}
              </p>
              <p className="text-slate-400 text-xs mt-4">
                Heartland Admissions has been notified.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-6 py-3 bg-slate-50 text-center">
          <p className="text-xs text-slate-400">
            Heartland Boys Home · admissions@heartlandboyshomenebraska.org
          </p>
        </div>
      </div>
    </div>
  );
}
