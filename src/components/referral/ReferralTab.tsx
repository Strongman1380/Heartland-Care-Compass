import { useEffect, useMemo, useRef, useState } from "react";
import emailjs from "@emailjs/browser";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Eye,
  Home,
  Loader2,
  Mail,
  Pill,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Scale,
  Shield,
  Sparkles,
  User,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";
import { referralNotesService, type ReferralNoteRow, type POContactEntry } from "@/integrations/firebase/referralNotesService";
import { screenReferralIntake } from "@/services/aiService";
import {
  type ParsedReferral,
  SECTION_CONFIG,
  UNKNOWN_VALUE_RE,
  LINE_MARKER_RE,
  parseFieldLine,
  detectSectionForField,
  detectSectionHeader,
  parseProbationStyleBlock,
  parseReferralText,
  splitReferralEntries,
  inferReferralName,
  inferReferralSource,
  inferCaseWorker,
  inferGlobalReferralSource,
  inferGlobalStaffName,
} from "@/utils/referralParser";

interface ReferralHistoryItem {
  id: string;
  createdAt: string;
  referralName: string;
  referralSource: string;
  staff: string;
  summary: string;
  fieldCount: number;
  sectionCount: number;
  status: string;
  priority: string;
  interviewReport: string;
  directorSummary: string;
  archived: boolean;
  archivedAt: string;
  archiveReason: string;
  archiveReasonDetail: string;
  parsedData: ParsedReferral | null;
  rawText: string;
  staffRecommendation: "yes" | "maybe" | "no" | null;
  poContactLog: POContactEntry[];
  screeningResult: string;
  interviewScheduledDate: string;
  interviewTime: string;
  interviewPlace: string;
}

interface ParsedEntry {
  raw: string;
  parsed: ParsedReferral;
  referralName: string;
  referralSource: string;
  caseWorker: string;
}

const SECTION_CONFIG_UI = SECTION_CONFIG.map((s, i) => ({
  ...s,
  icon: [User, Home, BookOpen, Pill, Brain, Scale, AlertTriangle, Shield][i],
  color: ["blue", "amber", "purple", "green", "pink", "slate", "orange", "red"][i],
}));

const sectionHasContent = (section: Record<string, string>): boolean => Object.keys(section).length > 0;

const STATUS_LABELS: Record<string, string> = {
  pending_interview: "Pending Interview",
  interview_scheduled: "Interview Scheduled",
  interviewed_yes: "Interviewed - Yes",
  interviewed_no: "Interviewed - No",
  already_found_placement: "Already Found Placement",
  denied: "Denied",
  contacted_po: "Logged PO Contact",
  contacted_caseworker: "Logged Caseworker Contact",
  requested_more_info: "Requested More Info",
  waitlisted: "Waitlisted",
  accepted: "Accepted/Admitted",
  // legacy values
  new: "New",
  reviewed: "Reviewed",
  actioned: "Actioned",
};

const STATUS_COLORS: Record<string, string> = {
  pending_interview: "bg-yellow-100 text-yellow-800 border-yellow-300",
  interview_scheduled: "bg-blue-100 text-blue-800 border-blue-300",
  interviewed_yes: "bg-green-100 text-green-800 border-green-300",
  interviewed_no: "bg-orange-100 text-orange-800 border-orange-300",
  already_found_placement: "bg-slate-100 text-slate-800 border-slate-300",
  denied: "bg-red-100 text-red-800 border-red-300",
  contacted_po: "bg-indigo-100 text-indigo-800 border-indigo-300",
  contacted_caseworker: "bg-indigo-100 text-indigo-800 border-indigo-300",
  requested_more_info: "bg-cyan-100 text-cyan-800 border-cyan-300",
  waitlisted: "bg-amber-100 text-amber-800 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  new: "bg-gray-100 text-gray-800 border-gray-300",
  reviewed: "bg-purple-100 text-purple-800 border-purple-300",
  actioned: "bg-teal-100 text-teal-800 border-teal-300",
};

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  purple: "bg-purple-50 border-purple-200 text-purple-800",
  green: "bg-green-50 border-green-200 text-green-800",
  pink: "bg-pink-50 border-pink-200 text-pink-800",
  slate: "bg-slate-50 border-slate-200 text-slate-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
  red: "bg-red-50 border-red-200 text-red-800",
};

const badgeColorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  pink: "bg-pink-100 text-pink-700",
  slate: "bg-slate-100 text-slate-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

const normalizeEntityValue = (value: string): string => {
  return value
    .replace(/\s+/g, " ")
    .replace(/^[,;.\s]+|[,;.\s]+$/g, "")
    .trim();
};

const titleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const extractFromParsedData = (
  parsed: ParsedReferral | null,
  keyMatcher: (key: string) => boolean
): string[] => {
  if (!parsed) return [];
  const results: string[] = [];
  for (const section of Object.values(parsed)) {
    if (!section || typeof section !== "object") continue;
    for (const [key, value] of Object.entries(section)) {
      if (!value || typeof value !== "string") continue;
      if (!keyMatcher(key.toLowerCase())) continue;
      const normalized = normalizeEntityValue(value);
      if (normalized) results.push(normalized);
    }
  }
  return results;
};

const dedup = (arr: string[]): string[] => [...new Set(arr)];

const extractCounties = (item: ReferralHistoryItem): string[] => {
  const fromFields = extractFromParsedData(item.parsedData, (key) => key.includes("county"));
  const fromSource = (item.referralSource.match(/([A-Za-z][A-Za-z\s'-]+?)\s+County/gi) || [])
    .map((m) => normalizeEntityValue(m.replace(/\s+County$/i, "")))
    .map((m) => `${titleCase(m)} County`);
  return dedup(
    [...fromFields, ...fromSource]
      .map((x) => (x.toLowerCase().includes("county") ? titleCase(x) : `${titleCase(x)} County`))
      .filter(Boolean)
  );
};

const extractCities = (item: ReferralHistoryItem): string[] => {
  return extractFromParsedData(item.parsedData, (key) => key.includes("city"))
    .map((x) => titleCase(x))
    .filter(Boolean);
};

const extractStates = (item: ReferralHistoryItem): string[] => {
  const fromFields = extractFromParsedData(
    item.parsedData,
    (key) => key.includes("state") || key.includes("province")
  ).map((x) => titleCase(x));
  const fromSource = (item.referralSource.match(/\b([A-Z]{2})\b/g) || []).map((x) => x.toUpperCase());
  return dedup([...fromFields, ...fromSource].filter(Boolean));
};

const extractProbationOfficer = (item: ReferralHistoryItem): string[] => {
  const fromFields = extractFromParsedData(
    item.parsedData,
    (key) =>
      key.includes("probation officer") ||
      key === "po" ||
      key.includes("parole officer") ||
      key.includes("case worker") ||
      key.includes("caseworker")
  )
    .map((v) => v.replace(/\(\d{3}\)\s*\d{3}-\d{4}.*$/g, "").trim())
    .map(normalizeEntityValue)
    .filter(Boolean);

  const fromRaw = (item.rawText.match(/(?:^|\s)-\s*PO\s+([^-(\n]+?)(?:\s*\(|\s*-|$)/i)?.[1] || "").trim();
  const rawResults = fromRaw ? [titleCase(normalizeEntityValue(fromRaw))] : [];
  return dedup([...fromFields.map((x) => titleCase(x)), ...rawResults].filter(Boolean));
};

const derivePoContact = (item: ReferralHistoryItem): { email: string; firstName: string; friendlyName: string } => {
  const extractedPOs = extractProbationOfficer(item);
  const rawPOName = extractedPOs.length > 0 ? extractedPOs[0] : "";
  const friendlyName = rawPOName.split(/[,\(0-9]/)[0].trim() || "Worker";
  const firstName = friendlyName.split(" ")[0] || "Worker";
  const clean = rawPOName.trim();
  let email = "";
  if (clean.includes(",")) {
    const [last, rest] = clean.split(",");
    const first = (rest || "").trim().split(/[\s\(]/)[0];
    if (first && last.trim()) email = `${first.toLowerCase()}.${last.trim().toLowerCase()}@nejudicial.gov`;
  } else {
    const parts = clean.split(/\s+/);
    if (parts.length >= 2) email = `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}@nejudicial.gov`;
  }
  return { email, firstName, friendlyName: friendlyName };
};

const extractFirstEmail = (item: ReferralHistoryItem): string => {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // 1) Target parsed fields that likely contain the PO's email.
  const emailFields = extractFromParsedData(
    item.parsedData,
    (key) => key.includes("email") || key.includes("e-mail") || key.includes("contact")
  );
  
  for (const field of emailFields) {
    const matches = field.match(emailRegex);
    if (matches) {
      for (const match of matches) {
        const email = match.toLowerCase();
        if (!email.includes("heartlandboyshome")) return email;
      }
    }
  }

  // 2) Target ALL parsed fields just in case it was dumped into an odd key.
  if (item.parsedData) {
    for (const section of Object.values(item.parsedData)) {
      if (typeof section === "object" && section !== null) {
        for (const val of Object.values(section)) {
          if (typeof val === "string") {
            const matches = val.match(emailRegex);
            if (matches) {
              for (const match of matches) {
                const email = match.toLowerCase();
                if (!email.includes("heartlandboyshome")) return email;
              }
            }
          }
        }
      }
    }
  }

  // 3) Check referral source line explicitly
  if (item.referralSource) {
    const matches = item.referralSource.match(emailRegex);
    if (matches) {
      for (const match of matches) {
        const email = match.toLowerCase();
        if (!email.includes("heartlandboyshome")) return email;
      }
    }
  }

  // 4) Fallback to the raw text document
  if (item.rawText) {
    const matches = item.rawText.match(emailRegex);
    if (matches) {
      for (const match of matches) {
        const email = match.toLowerCase();
        if (!email.includes("heartlandboyshome")) return email;
      }
    }
  }
  
  return "";
};

const tallyTop = (values: string[], limit = 6): { name: string; count: number }[] => {
  const map = new Map<string, number>();
  values
    .map((value) => normalizeEntityValue(value))
    .filter(Boolean)
    .forEach((value) => map.set(value, (map.get(value) || 0) + 1));
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
};

const toHistoryItem = (row: ReferralNoteRow): ReferralHistoryItem => {
  const referralData = row.parsed_data || null;
  const sectionCount = referralData
    ? Object.values(referralData).filter((v: any) => v && typeof v === "object" && Object.keys(v).length > 0).length
    : 0;
  const fieldCount = referralData
    ? Object.values(referralData).reduce((sum: number, section: any) => {
      if (!section || typeof section !== "object") return sum;
      return sum + Object.keys(section).length;
    }, 0)
    : 0;

  return {
    id: String(row.id || "").trim(),
    createdAt: row.created_at,
    referralName: row.referral_name || "Unspecified referral",
    referralSource: row.referral_source || "",
    staff: row.staff_name || "Unknown",
    summary: row.summary || "Referral entry",
    fieldCount,
    sectionCount,
    status: row.status || "new",
    priority: row.priority || "routine",
    interviewReport: row.interview_report || "",
    directorSummary: row.director_summary || "",
    archived: Boolean(row.archived),
    archivedAt: row.archived_at || "",
    archiveReason: row.archive_reason || "",
    archiveReasonDetail: row.archive_reason_detail || "",
    parsedData: referralData as ParsedReferral | null,
    rawText: row.raw_text || "",
    staffRecommendation: row.staff_recommendation ?? null,
    poContactLog: row.po_contact_log || [],
    screeningResult: row.screening_result || "",
    interviewScheduledDate: row.interview_scheduled_date || "",
    interviewTime: (row as any).interview_time || "",
    interviewPlace: (row as any).interview_place || "",
  };
};

export const ReferralTab = () => {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedReferral | null>(null);
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [referralName, setReferralName] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [status, setStatus] = useState("pending_interview");
  const [priority, setPriority] = useState("routine");

  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all");
  const [archiveView, setArchiveView] = useState("active");
  const [historySearch, setHistorySearch] = useState("");
  const [poContactFilter, setPoContactFilter] = useState(false);
  const [poFilter, setPoFilter] = useState("all");
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);

  const [visibleCount, setVisibleCount] = useState(15);

  const [expandedReferralId, setExpandedReferralId] = useState<string | null>(null);

  const [editingInterviewTarget, setEditingInterviewTarget] = useState<ReferralHistoryItem | null>(null);
  const [interviewReport, setInterviewReport] = useState("");
  const [directorSummary, setDirectorSummary] = useState("");
  const [editStatus, setEditStatus] = useState("interview_scheduled");
  const [savingInterview, setSavingInterview] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [selectedReferralKeys, setSelectedReferralKeys] = useState<Set<string>>(new Set());
  const [bulkOutreachOpen, setBulkOutreachOpen] = useState(false);
  const [bulkOutreachType, setBulkOutreachType] = useState<"check_need" | "interview">("check_need");
  const [bulkStatus, setBulkStatus] = useState("no_change");
  const [bulkPriority, setBulkPriority] = useState("no_change");
  const [isBulkApplying, setIsBulkApplying] = useState(false);

  const [savingRecommendationId, setSavingRecommendationId] = useState<string | null>(null);
  const [expandedPoLogId, setExpandedPoLogId] = useState<string | null>(null);
  const [poLogDate, setPoLogDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [poLogNotes, setPoLogNotes] = useState("");
  const [poLogFollowUp, setPoLogFollowUp] = useState("");
  const [savingPoContactId, setSavingPoContactId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // AI Screening state
  const [newReferralScreening, setNewReferralScreening] = useState<string>("");
  const [isScreeningNew, setIsScreeningNew] = useState(false);
  const [aiScreeningResults, setAiScreeningResults] = useState<Record<string, string>>({});
  const [aiScreeningLoading, setAiScreeningLoading] = useState<Set<string>>(new Set());

  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // AI Screening handler
  const handleAIScreen = async (text: string, itemKey?: string) => {
    if (!text.trim()) {
      toast.error("No referral text to screen");
      return;
    }
    if (itemKey) {
      setAiScreeningLoading((prev) => new Set(prev).add(itemKey));
    } else {
      setIsScreeningNew(true);
    }
    try {
      const result = await screenReferralIntake(text);
      if (result.error) {
        toast.error("AI screening failed: " + result.error);
        return;
      }
      const screeningText = result.data?.screening || "";
      if (itemKey) {
        setAiScreeningResults((prev) => ({ ...prev, [itemKey]: screeningText }));
        const item = history.find((h) => referralRowKey(h) === itemKey);
        if (item) {
          await referralNotesService.update(toReferralLookup(item), { screening_result: screeningText });
          setHistory((prev) => prev.map((h) => referralRowKey(h) === itemKey ? { ...h, screeningResult: screeningText } : h));
        }
        toast.success("AI screening complete");
        // Auto-expand the referral to show results
        setExpandedReferralId(itemKey);
      } else {
        setNewReferralScreening(screeningText);
        toast.success("AI screening complete");
      }
    } catch {
      toast.error("AI screening failed. Please try again.");
    } finally {
      if (itemKey) {
        setAiScreeningLoading((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      } else {
        setIsScreeningNew(false);
      }
    }
  };

  // Parse AI screening JSON and render structured result
  const renderAIScreening = (screeningJson: string) => {
    if (!screeningJson) return null;
    let data: any = null;
    try {
      const clean = screeningJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      data = JSON.parse(clean);
    } catch {
      // Fallback: render as plain text
      return <div className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{screeningJson}</div>;
    }

    const rec: string = data.recommendation || "";
    const recStyle: Record<string, string> = {
      INTERVIEW: "bg-green-100 text-green-800 border-green-400",
      INTERVIEW_WITH_CONDITIONS: "bg-yellow-100 text-yellow-800 border-yellow-400",
      DECLINE: "bg-red-100 text-red-800 border-red-400",
    };
    const screenStyle: Record<string, string> = {
      PASS: "bg-green-50 text-green-700 border-green-200",
      CONDITIONAL: "bg-yellow-50 text-yellow-700 border-yellow-200",
      FAIL: "bg-red-50 text-red-700 border-red-200",
    };
    const fitStyle: Record<string, string> = {
      STRONG: "bg-green-50 text-green-700 border-green-200",
      MIXED: "bg-yellow-50 text-yellow-700 border-yellow-200",
      POOR: "bg-red-50 text-red-700 border-red-200",
    };

    const profile = data.youth_profile || {};
    const profileParts = [profile.name, profile.age && `Age ${profile.age}`, profile.gender, profile.county].filter(Boolean);

    return (
      <div className="space-y-3 text-sm">
        {/* Header row */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className={`px-3 py-1 rounded-full text-sm font-bold border ${recStyle[rec] || "bg-gray-100 text-gray-800 border-gray-300"}`}>
            {rec.replace(/_/g, " ") || "No Recommendation"}
          </span>
          {data.screen_status && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${screenStyle[data.screen_status] || "bg-gray-100 border-gray-200 text-gray-700"}`}>
              Screen: {data.screen_status}
            </span>
          )}
          {data.fit_rating && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${fitStyle[data.fit_rating] || "bg-gray-100 border-gray-200 text-gray-700"}`}>
              Fit: {data.fit_rating}
            </span>
          )}
          {profileParts.length > 0 && (
            <span className="text-xs text-gray-500 italic">{profileParts.join(" · ")}</span>
          )}
        </div>

        {/* Rationale */}
        {Array.isArray(data.rationale_bullets) && data.rationale_bullets.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-1">Rationale</p>
            <ul className="space-y-1">
              {data.rationale_bullets.map((b: string, i: number) => (
                <li key={i} className="text-xs text-gray-700 flex gap-1.5"><span className="shrink-0 text-gray-400">•</span><span>{b}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Conditions (only for INTERVIEW_WITH_CONDITIONS) */}
        {Array.isArray(data.conditions) && data.conditions.length > 0 && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-2.5">
            <p className="text-xs font-semibold text-yellow-800 mb-1">Conditions Required</p>
            <ul className="space-y-1">
              {data.conditions.map((c: string, i: number) => (
                <li key={i} className="text-xs text-yellow-800 flex gap-1.5"><span className="shrink-0">→</span><span>{c}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Questions for referral source */}
        {Array.isArray(data.questions_for_referral_source) && data.questions_for_referral_source.length > 0 && (
          <div className="rounded-md bg-blue-50 border border-blue-200 p-2.5">
            <p className="text-xs font-semibold text-blue-800 mb-1">Follow-up Questions for Referral Source</p>
            <ol className="space-y-1 list-none">
              {data.questions_for_referral_source.map((q: string, i: number) => (
                <li key={i} className="text-xs text-blue-900 flex gap-1.5"><span className="shrink-0 font-medium text-blue-600">{i + 1}.</span><span>{q}</span></li>
              ))}
            </ol>
          </div>
        )}

        {/* Missing info */}
        {Array.isArray(data.missing_info) && data.missing_info.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-orange-700 mb-1">Missing / Not Documented</p>
            <div className="flex flex-wrap gap-1">
              {data.missing_info.map((m: string, i: number) => (
                <span key={i} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded">{m}</span>
              ))}
            </div>
          </div>
        )}

        {/* Barriers */}
        {Array.isArray(data.barriers) && data.barriers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-700 mb-1">Barriers</p>
            <ul className="space-y-1">
              {data.barriers.map((b: string, i: number) => (
                <li key={i} className="text-xs text-red-800 flex gap-1.5"><span className="shrink-0 text-red-400">•</span><span>{b}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Strengths */}
        {Array.isArray(data.strengths) && data.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-700 mb-1">Strengths</p>
            <ul className="space-y-1">
              {data.strengths.map((s: string, i: number) => (
                <li key={i} className="text-xs text-green-800 flex gap-1.5"><span className="shrink-0 text-green-500">✓</span><span>{s}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const loadReferralHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const rows = await referralNotesService.list();
      setHistory(rows.map(toHistoryItem));
    } catch (error) {
      console.warn("Failed to load referral history:", error);
      setHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadReferralHistory();
  }, []);

  useEffect(() => {
    return () => {
      if (parseTimerRef.current) clearTimeout(parseTimerRef.current);
    };
  }, []);

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Please paste referral text first");
      return;
    }

    setIsParsing(true);
    parseTimerRef.current = setTimeout(() => {
      parseTimerRef.current = null;
      const blocks = splitReferralEntries(rawText);
      const globalSource = inferGlobalReferralSource(rawText);
      const globalStaff = inferGlobalStaffName(rawText);
      const entries = blocks.map((rawBlock) => {
        const parsedBlock = parseReferralText(rawBlock);
        return {
          raw: rawBlock,
          parsed: parsedBlock,
          referralName: inferReferralName(parsedBlock),
          referralSource: inferReferralSource(parsedBlock),
          caseWorker: inferCaseWorker(parsedBlock),
        };
      });

      if (globalSource && !referralSource.trim()) {
        setReferralSource(globalSource);
      }
      if (globalStaff && !staffName.trim()) {
        setStaffName(globalStaff);
      }

      if (entries.length > 1) {
        setParsed(null);
        setParsedEntries(entries);
        if (!referralSource.trim()) {
          // Prefer globalSource (from header) over per-entry detected source
          const firstDetectedSource = entries.find((e) => e.referralSource.trim())?.referralSource || "";
          if (globalSource) setReferralSource(globalSource);
          else if (firstDetectedSource) setReferralSource(firstDetectedSource);
        }
      } else {
        const single = entries[0];
        setParsedEntries([]);
        setParsed(single.parsed);
        if (single.referralName && !referralName.trim()) setReferralName(single.referralName);
        if (single.referralSource && !referralSource.trim()) setReferralSource(single.referralSource);
        if (!single.referralSource && globalSource && !referralSource.trim()) setReferralSource(globalSource);
      }
      setIsParsing(false);

      const totalFields = entries.reduce(
        (sum, entry) => sum + Object.values(entry.parsed).reduce((inner, section) => inner + Object.keys(section).length, 0),
        0
      );
      if (entries.length > 1) {
        toast.success(`Detected ${entries.length} referrals with ${totalFields} total parsed fields`);
      } else if (totalFields > 0) {
        toast.success(`Parsed ${totalFields} fields into ${Object.values(entries[0].parsed).filter(sectionHasContent).length} sections`);
      } else {
        toast.warning("Could not parse structured fields. The full text will be saved as-is.");
      }
    }, 250);
  };

  const handleReset = () => {
    if (parseTimerRef.current) {
      clearTimeout(parseTimerRef.current);
      parseTimerRef.current = null;
      setIsParsing(false);
    }
    setRawText("");
    setParsed(null);
    setParsedEntries([]);
  };

  const handleSave = async () => {
    if (!staffName.trim()) {
      toast.error("Staff name is required");
      return;
    }
    if (!rawText.trim()) {
      toast.error("No referral text to save");
      return;
    }

    try {
      setIsSaving(true);

      if (parsedEntries.length > 1) {
        let saved = 0;
        for (let i = 0; i < parsedEntries.length; i += 1) {
          const entry = parsedEntries[i];
          const name = entry.referralName || `Referral ${i + 1}`;
          const source = entry.referralSource || referralSource.trim() || null;
          await referralNotesService.save({
            referral_name: name,
            referral_source: source,
            referral_date: date,
            staff_name: staffName.trim(),
            status,
            priority,
            summary: `Referral intake for ${name}`,
            parsed_data: entry.parsed || null,
            raw_text: entry.raw,
            interview_report: null,
            director_summary: null,
            archived: false,
            archived_at: null,
          });
          saved += 1;
        }
        toast.success(`Saved ${saved} referral notes`);
        await loadReferralHistory();
        handleReset();
        setNewReferralScreening("");
        setReferralSource("");
        setReferralName("");
        setStaffName("");
        setStatus("pending_interview");
        setPriority("routine");
        return;
      }

      if (!referralName.trim()) {
        toast.error("Referral name is required");
        return;
      }

      const summaryLines: string[] = [];

      if (parsed) {
        for (const sectionDef of SECTION_CONFIG) {
          const data = parsed[sectionDef.key];
          if (!sectionHasContent(data)) continue;
          summaryLines.push(`[${sectionDef.label}]`);
          for (const [key, val] of Object.entries(data)) {
            summaryLines.push(`${key}: ${val}`);
          }
          summaryLines.push("");
        }
        if (sectionHasContent(parsed.other)) {
          summaryLines.push("[Other Information]");
          for (const [key, val] of Object.entries(parsed.other)) {
            summaryLines.push(`${key}: ${val}`);
          }
        }
      }

      await referralNotesService.save({
        referral_name: referralName.trim(),
        referral_source: referralSource.trim() || null,
        referral_date: date,
        staff_name: staffName.trim(),
        status,
        priority,
        summary: `Referral intake for ${referralName.trim()}`,
        parsed_data: parsed || null,
        raw_text: parsed ? summaryLines.join("\n") : rawText.trim(),
        interview_report: null,
        director_summary: null,
        archived: false,
        archived_at: null,
      });

      toast.success("Referral note saved successfully");
      await loadReferralHistory();
      handleReset();
      setNewReferralScreening("");
      setReferralSource("");
      setReferralName("");
      setStaffName("");
      setStatus("pending_interview");
      setPriority("routine");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save referral note";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const toReferralLookup = (item: ReferralHistoryItem) => ({
    id: item.id || null,
    created_at: item.createdAt || null,
    referral_name: item.referralName || null,
    staff_name: item.staff || null,
  });
  const referralRowKey = (item: ReferralHistoryItem) =>
    item.id || `${item.createdAt}__${item.referralName}__${item.staff}__${item.referralSource}`;
  const sameReferral = (a: ReferralHistoryItem, b: ReferralHistoryItem) =>
    a.id === b.id &&
    a.createdAt === b.createdAt &&
    a.referralName === b.referralName &&
    a.staff === b.staff;

  const openInterviewEditor = (item: ReferralHistoryItem) => {
    setEditingInterviewTarget(item);
    setInterviewReport(item.interviewReport || "");
    setDirectorSummary(item.directorSummary || "");
    setEditStatus(item.status || "reviewed");
  };

  const saveInterviewUpdate = async () => {
    if (!editingInterviewTarget) return;
    try {
      setSavingInterview(true);
      await referralNotesService.update(toReferralLookup(editingInterviewTarget), {
        interview_report: interviewReport.trim() || null,
        director_summary: directorSummary.trim() || null,
        status: editStatus,
      });
      toast.success("Interview update saved");
      setHistory((prev) =>
        prev.map((h) =>
          sameReferral(h, editingInterviewTarget)
            ? {
                ...h,
                interviewReport: interviewReport.trim(),
                directorSummary: directorSummary.trim(),
                status: editStatus,
              }
            : h
        )
      );
      setEditingInterviewTarget(null);
      setInterviewReport("");
      setDirectorSummary("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save interview update";
      toast.error(msg);
    } finally {
      setSavingInterview(false);
    }
  };

  const setArchived = async (
    item: ReferralHistoryItem,
    archived: boolean,
    reason?: string | null,
    reasonDetail?: string | null
  ) => {
    try {
      if (archived) setArchivingId(item.id || item.createdAt);
      await referralNotesService.update(toReferralLookup(item), {
        archived,
        archived_at: archived ? new Date().toISOString() : null,
        archive_reason: archived ? (reason || null) : null,
        archive_reason_detail: archived ? (reasonDetail || null) : null,
      });
      setHistory((prev) =>
        prev.map((h) =>
          sameReferral(h, item)
            ? {
                ...h,
                archived,
                archivedAt: archived ? new Date().toISOString() : "",
                archiveReason: archived ? reason || "" : "",
                archiveReasonDetail: archived ? reasonDetail || "" : "",
              }
            : h
        )
      );
      toast.success(archived ? "Referral archived" : "Referral restored");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update archive status";
      toast.error(msg);
    } finally {
      if (archived) setArchivingId(null);
    }
  };

  const handleDelete = async (item: ReferralHistoryItem) => {
    try {
      setDeletingId(item.id || item.createdAt);
      await referralNotesService.delete(toReferralLookup(item));
      toast.success("Referral deleted");
      setHistory((prev) =>
        prev.filter(
          (h) =>
            !(
              h.createdAt === item.createdAt &&
              h.referralName === item.referralName &&
              h.staff === item.staff
            )
        )
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to delete referral";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleQuickPriorityUpdate = async (item: ReferralHistoryItem, newPriority: string) => {
    const rowKey = referralRowKey(item);
    try {
      setUpdatingStatusId(rowKey); // We can reuse this loading state
      await referralNotesService.update(toReferralLookup(item), { priority: newPriority });
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, priority: newPriority } : h));
      toast.success(`Priority updated to ${newPriority}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update priority";
      toast.error(msg);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleQuickStatusUpdate = async (item: ReferralHistoryItem, newStatus: string) => {
    const rowKey = referralRowKey(item);
    try {
      setUpdatingStatusId(rowKey);
      const shouldArchive = ["denied", "interviewed_no", "already_found_placement"].includes(newStatus) && !item.archived;
      const updateData: any = { status: newStatus };
      if (shouldArchive) {
        updateData.archived = true;
        updateData.archivedAt = new Date().toISOString();
        updateData.archiveReason = `Automatically archived by status: ${STATUS_LABELS[newStatus] || newStatus}`;
      }
      await referralNotesService.update(toReferralLookup(item), updateData);
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, ...updateData } : h));
      if (shouldArchive) {
        toast.success(`Automatically archived referral based on status update.`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update status";
      toast.error(msg);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const totalFields = parsed
    ? Object.values(parsed).reduce((sum, section) => sum + Object.keys(section).length, 0)
    : 0;

  const uniquePONames = useMemo(() => {
    const allPOs = history.flatMap(extractProbationOfficer);
    return [...new Set(allPOs)].sort();
  }, [history]);

  const filteredHistory = history.filter((item) => {
    if (archiveView === "active" && item.archived) return false;
    if (archiveView === "archived" && !item.archived) return false;
    if (historyFilter !== "all" && item.status !== historyFilter) return false;
    if (poContactFilter && item.poContactLog && item.poContactLog.length > 0) return false;
    if (poFilter !== "all") {
      const itemPOs = extractProbationOfficer(item).map((p) => p.toLowerCase());
      if (!itemPOs.some((p) => p.includes(poFilter.toLowerCase()))) return false;
    }
    if (!historySearch.trim()) return true;
    const poNames = extractProbationOfficer(item).join(" ");
    const haystack = `${item.referralName} ${item.summary} ${item.staff} ${item.priority} ${item.referralSource} ${poNames}`.toLowerCase();
    return haystack.includes(historySearch.toLowerCase().trim());
  });
  const visibleHistory = filteredHistory.slice(0, visibleCount);
  const selectedItems = history.filter((item) => selectedReferralKeys.has(referralRowKey(item)));
  const selectedVisibleCount = visibleHistory.filter((item) => selectedReferralKeys.has(referralRowKey(item))).length;

  const toggleReferralSelection = (item: ReferralHistoryItem, checked: boolean) => {
    const key = referralRowKey(item);
    setSelectedReferralKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const toggleVisibleSelection = (checked: boolean) => {
    setSelectedReferralKeys((prev) => {
      const next = new Set(prev);
      visibleHistory.forEach((item) => {
        const key = referralRowKey(item);
        if (checked) next.add(key);
        else next.delete(key);
      });
      return next;
    });
  };

  const handleBulkArchive = async () => {
    if (selectedItems.length === 0) return;
    try {
      setIsBulkApplying(true);
      await Promise.all(
        selectedItems.map((item) =>
          referralNotesService.update(toReferralLookup(item), {
            archived: true,
            archived_at: new Date().toISOString(),
            archive_reason: "Archived by staff",
            archive_reason_detail: null,
          })
        )
      );
      setHistory((prev) =>
        prev.map((item) =>
          selectedReferralKeys.has(referralRowKey(item))
            ? {
                ...item,
                archived: true,
                archivedAt: new Date().toISOString(),
                archiveReason: "Archived by staff",
                archiveReasonDetail: "",
              }
            : item
        )
      );
      setSelectedReferralKeys(new Set());
      toast.success(`Archived ${selectedItems.length} referral${selectedItems.length === 1 ? "" : "s"}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bulk archive failed";
      toast.error(msg);
    } finally {
      setIsBulkApplying(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    if (!confirm(`Delete ${selectedItems.length} selected referral${selectedItems.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    try {
      setIsBulkApplying(true);
      await Promise.all(selectedItems.map((item) => referralNotesService.delete(toReferralLookup(item))));
      setHistory((prev) => prev.filter((item) => !selectedReferralKeys.has(referralRowKey(item))));
      setSelectedReferralKeys(new Set());
      toast.success(`Deleted ${selectedItems.length} referral${selectedItems.length === 1 ? "" : "s"}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bulk delete failed";
      toast.error(msg);
    } finally {
      setIsBulkApplying(false);
    }
  };

  const handleBulkEdit = async () => {
    if (selectedItems.length === 0) return;
    if (bulkStatus === "no_change" && bulkPriority === "no_change") {
      toast.error("Choose a status or priority to edit");
      return;
    }

    const updates: Record<string, string> = {};
    if (bulkStatus !== "no_change") updates.status = bulkStatus;
    if (bulkPriority !== "no_change") updates.priority = bulkPriority;

    try {
      setIsBulkApplying(true);
      await Promise.all(selectedItems.map((item) => referralNotesService.update(toReferralLookup(item), updates)));
      setHistory((prev) =>
        prev.map((item) =>
          selectedReferralKeys.has(referralRowKey(item))
            ? {
                ...item,
                status: bulkStatus !== "no_change" ? bulkStatus : item.status,
                priority: bulkPriority !== "no_change" ? bulkPriority : item.priority,
              }
            : item
        )
      );
      setSelectedReferralKeys(new Set());
      setBulkStatus("no_change");
      setBulkPriority("no_change");
      toast.success(`Updated ${selectedItems.length} referral${selectedItems.length === 1 ? "" : "s"}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Bulk edit failed";
      toast.error(msg);
    } finally {
      setIsBulkApplying(false);
    }
  };

  const handleStaffRecommendation = async (item: ReferralHistoryItem, recommendation: "yes" | "maybe" | "no") => {
    const rowKey = referralRowKey(item);
    try {
      setSavingRecommendationId(rowKey);
      await referralNotesService.update(toReferralLookup(item), { staff_recommendation: recommendation });
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, staffRecommendation: recommendation } : h));
      toast.success(`Recommendation saved: ${recommendation}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save recommendation";
      toast.error(msg);
    } finally {
      setSavingRecommendationId(null);
    }
  };

  const handleSetInterviewDate = async (item: ReferralHistoryItem, date: string) => {
    try {
      await referralNotesService.update(toReferralLookup(item), { interview_scheduled_date: date || null });
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, interviewScheduledDate: date } : h));
      toast.success(date ? `Interview date saved: ${format(new Date(date + "T00:00:00"), "MMM d, yyyy")}` : "Interview date cleared");
    } catch (error) {
      toast.error("Failed to save interview date");
    }
  };

  const handleSetInterviewTime = async (item: ReferralHistoryItem, time: string) => {
    try {
      await referralNotesService.update(toReferralLookup(item), { interview_time: time || null });
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, interviewTime: time } : h));
    } catch (error) {
      toast.error("Failed to save interview time");
    }
  };

  const handleSetInterviewPlace = async (item: ReferralHistoryItem, place: string) => {
    try {
      await referralNotesService.update(toReferralLookup(item), { interview_place: place || null });
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, interviewPlace: place } : h));
    } catch (error) {
      toast.error("Failed to save interview place");
    }
  };

  const handleAddPoContact = async (item: ReferralHistoryItem) => {
    if (!poLogDate.trim()) {
      toast.error("Contact date is required");
      return;
    }
    const rowKey = referralRowKey(item);
    try {
      setSavingPoContactId(rowKey);
      const { v4: uuidv4 } = await import("uuid");
      const newEntry: POContactEntry = {
        id: uuidv4(),
        date: poLogDate,
        notes: poLogNotes.trim(),
        followUpDate: poLogFollowUp.trim(),
      };
      const updatedLog = [...(item.poContactLog || []), newEntry];
      await referralNotesService.update(toReferralLookup(item), { po_contact_log: updatedLog });
      setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, poContactLog: updatedLog } : h));
      setPoLogDate(format(new Date(), "yyyy-MM-dd"));
      setPoLogNotes("");
      setPoLogFollowUp("");
      toast.success("PO contact logged");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to log PO contact";
      toast.error(msg);
    } finally {
      setSavingPoContactId(null);
    }
  };

  const sendAndLogEmail = async (
    item: ReferralHistoryItem,
    emailType: "accept" | "deny" | "interview" | "check_need",
    toEmail: string,
    poFirstName: string,
    extraParams?: Record<string, string>
  ) => {
    if (!toEmail) {
      toast.error("No PO email found — cannot send. Add a PO name to this referral first.");
      return;
    }
    const rowKey = referralRowKey(item);
    const loadingKey = rowKey + emailType;
    setSendingEmailId(loadingKey);
    const templateIds: Record<string, string> = {
      accept: import.meta.env.VITE_EMAILJS_ACCEPT_TEMPLATE_ID,
      deny: import.meta.env.VITE_EMAILJS_DENY_TEMPLATE_ID,
      interview: import.meta.env.VITE_EMAILJS_INTERVIEW_TEMPLATE_ID,
      check_need: import.meta.env.VITE_EMAILJS_CHECK_NEED_TEMPLATE_ID,
    };
    const labels: Record<string, string> = {
      accept: "Acceptance",
      deny: "Denial",
      interview: "Interview scheduling",
      check_need: "Check Need",
    };
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        templateIds[emailType],
        {
          to_email: toEmail,
          reply_to: "admissions@heartlandboyshomenebraska.org",
          po_first_name: poFirstName,
          youth_name: item.referralName || "the youth",
          date: format(new Date(), "MMMM d, yyyy"),
          ...extraParams,
        },
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      );
      const { v4: uuidv4 } = await import("uuid");
      const logNote = `${labels[emailType]} email auto-sent to PO (${toEmail || "unknown email"})`;
      const newEntry: POContactEntry = {
        id: uuidv4(),
        date: format(new Date(), "yyyy-MM-dd"),
        notes: logNote,
        followUpDate: emailType === "interview" && item.interviewScheduledDate ? item.interviewScheduledDate : "",
      };
      const updatedLog = [...(item.poContactLog || []), newEntry];
      await referralNotesService.update(toReferralLookup(item), { po_contact_log: updatedLog });
      setHistory((prev) =>
        prev.map((h) => (sameReferral(h, item) ? { ...h, poContactLog: updatedLog } : h))
      );
      toast.success(`${labels[emailType]} email sent and logged in PO contact log`);
    } catch (err) {
      const errMsg = err && typeof err === "object" && "text" in err ? (err as { text: string }).text : "Unknown error";
      toast.error(`Failed to send email: ${errMsg}`);
      console.error("EmailJS error:", err);
    } finally {
      setSendingEmailId(null);
    }
  };

  const kpis = useMemo(() => {
    const active = history.filter((h) => !h.archived);
    const totalReceived = history.length;
    const pendingCount = active.filter((h) => h.status === "pending_interview" || h.status === "new").length;
    const scheduledCount = active.filter((h) => h.status === "interview_scheduled").length;
    const interviewedYes = active.filter((h) => h.status === "interviewed_yes").length;
    const interviewedNo = active.filter((h) => h.status === "interviewed_no").length;
    const deniedCount = active.filter((h) => h.status === "denied").length;
    const acceptedCount = active.filter((h) => h.status === "accepted").length;
    const waitlistedCount = active.filter((h) => h.status === "waitlisted").length;

    // PO contact tracking
    const noPoContact = active.filter((h) => (h.poContactLog || []).length === 0).length;
    const poContacted = active.filter((h) => (h.poContactLog || []).length > 0).length;

    // Priority breakdown
    const priorityUrgent = active.filter((h) => h.priority === "urgent").length;
    const priorityHigh = active.filter((h) => h.priority === "high").length;
    const priorityRoutine = active.filter((h) => !h.priority || h.priority === "routine").length;

    // AI screening recommendation breakdown
    const parseRec = (h: ReferralHistoryItem) => { try { return JSON.parse(h.screeningResult).recommendation as string; } catch { return ""; } };
    const aiInterview = active.filter((h) => parseRec(h) === "INTERVIEW").length;
    const aiConditions = active.filter((h) => parseRec(h) === "INTERVIEW_WITH_CONDITIONS").length;
    const aiDecline = active.filter((h) => parseRec(h) === "DECLINE").length;
    const aiScreened = aiInterview + aiConditions + aiDecline;

    // Staff recommendation breakdown
    const staffYes = active.filter((h) => h.staffRecommendation === "yes").length;
    const staffMaybe = active.filter((h) => h.staffRecommendation === "maybe").length;
    const staffNo = active.filter((h) => h.staffRecommendation === "no").length;

    // Age distribution from parsed demographics
    const ages = active.flatMap((h) => {
      const a = h.parsedData?.demographics?.["Age"] || h.parsedData?.demographics?.["age"] || "";
      const n = parseInt(a);
      return isNaN(n) || n < 5 || n > 25 ? [] : [n];
    });
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;
    const ageWithData = ages.length;

    // Gender breakdown from parsed demographics
    const genderMap: Record<string, number> = {};
    for (const h of active) {
      const g = (h.parsedData?.demographics?.["Gender"] || h.parsedData?.demographics?.["gender"] || "").toLowerCase().trim();
      if (!g) continue;
      const key = g.includes("female") ? "Female" : g.includes("male") ? "Male" : titleCase(g);
      genderMap[key] = (genderMap[key] || 0) + 1;
    }
    const genderTop = Object.entries(genderMap).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    // Top diagnoses from mental health section
    const diagnosisTop = tallyTop(active.flatMap((h) => {
      const d = h.parsedData?.mentalHealth?.["Diagnosis"] || h.parsedData?.mentalHealth?.["Diagnoses"] || h.parsedData?.mentalHealth?.["diagnosis"] || "";
      return d ? d.split(/[,;\/]/).map((s) => s.trim()).filter((s) => s.length > 2) : [];
    }));

    // Top offenses from legal section
    const offenseTop = tallyTop(active.flatMap((h) => {
      const o = h.parsedData?.legal?.["Current Offense"] || h.parsedData?.legal?.["Offense"] || h.parsedData?.legal?.["current offense"] || "";
      return o ? [o.trim()] : [];
    }));

    const sourceTop = tallyTop(active.map((h) => h.referralSource).filter(Boolean));
    const countyTop = tallyTop(active.flatMap(extractCounties));
    const cityTop = tallyTop(active.flatMap(extractCities));
    const stateTop = tallyTop(active.flatMap(extractStates));
    const poTop = tallyTop(active.flatMap(extractProbationOfficer));

    return {
      totalReceived,
      total: active.length,
      pendingCount,
      scheduledCount,
      interviewedYes,
      interviewedNo,
      deniedCount,
      acceptedCount,
      waitlistedCount,
      noPoContact,
      poContacted,
      priorityUrgent,
      priorityHigh,
      priorityRoutine,
      aiInterview,
      aiConditions,
      aiDecline,
      aiScreened,
      staffYes,
      staffMaybe,
      staffNo,
      avgAge,
      ageWithData,
      genderTop,
      diagnosisTop,
      offenseTop,
      sourceTop,
      countyTop,
      cityTop,
      stateTop,
      poTop,
      uniqueSources: new Set(active.map((h) => h.referralSource).filter(Boolean)).size,
      uniqueCounties: new Set(active.flatMap(extractCounties)).size,
      uniqueCities: new Set(active.flatMap(extractCities)).size,
      uniqueStates: new Set(active.flatMap(extractStates)).size,
      uniquePOs: new Set(active.flatMap(extractProbationOfficer)).size,
    };
  }, [history]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Referral Intake and Interview Management</h2>
        <p className="text-gray-600">
          Paste referral information, parse it into structured tracking notes, and add interview reports for director and executive director review.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral KPI Snapshot</CardTitle>
          <CardDescription>Operational intake and interview progress</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pipeline row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Received</p>
              <p className="text-xl font-semibold">{kpis.totalReceived}</p>
              <p className="text-xs text-muted-foreground mt-0.5">all time</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Active</p>
              <p className="text-xl font-semibold">{kpis.total}</p>
              <p className="text-xs text-muted-foreground mt-0.5">non-archived</p>
            </div>
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-xs text-yellow-700">Pending</p>
              <p className="text-xl font-semibold text-yellow-800">{kpis.pendingCount}</p>
              <p className="text-xs text-yellow-600 mt-0.5">awaiting contact</p>
            </div>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Interview Scheduled</p>
              <p className="text-xl font-semibold text-blue-800">{kpis.scheduledCount}</p>
              <p className="text-xs text-blue-600 mt-0.5">confirmed dates</p>
            </div>
            <div className="rounded-md border border-teal-200 bg-teal-50 p-3">
              <p className="text-xs text-teal-700">Interviewed – Yes</p>
              <p className="text-xl font-semibold text-teal-800">{kpis.interviewedYes}</p>
              <p className="text-xs text-teal-600 mt-0.5">proceeding</p>
            </div>
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
              <p className="text-xs text-orange-700">Interviewed – No</p>
              <p className="text-xl font-semibold text-orange-800">{kpis.interviewedNo}</p>
              <p className="text-xs text-orange-600 mt-0.5">not suitable</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Accepted</p>
              <p className="text-xl font-semibold text-emerald-800">{kpis.acceptedCount}</p>
              {kpis.waitlistedCount > 0 && <p className="text-xs text-emerald-600 mt-0.5">{kpis.waitlistedCount} waitlisted</p>}
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-xs text-red-700">Denied</p>
              <p className="text-xl font-semibold text-red-800">{kpis.deniedCount}</p>
              <p className="text-xs text-red-600 mt-0.5">not accepted</p>
            </div>
          </div>

          {/* PO contact row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 font-medium">No PO Contact</p>
                <p className="text-2xl font-bold text-amber-800">{kpis.noPoContact}</p>
                <p className="text-xs text-amber-600 mt-0.5">active referrals needing outreach</p>
              </div>
            </div>
            <div className="rounded-md border border-green-200 bg-green-50 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 font-medium">PO Contacted</p>
                <p className="text-2xl font-bold text-green-800">{kpis.poContacted}</p>
                <p className="text-xs text-green-600 mt-0.5">active referrals with contact logged</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referral Source and PO KPI</CardTitle>
          <CardDescription>Track intake origin by source, county, city, state, and probation officer volume</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Unique Sources</p><p className="text-xl font-semibold">{kpis.uniqueSources}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Unique Counties</p><p className="text-xl font-semibold">{kpis.uniqueCounties}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Unique Cities</p><p className="text-xl font-semibold">{kpis.uniqueCities}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Unique States</p><p className="text-xl font-semibold">{kpis.uniqueStates}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Unique POs</p><p className="text-xl font-semibold">{kpis.uniquePOs}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Sources</p>
              <div className="space-y-1">
                {kpis.sourceTop.length === 0 ? <p className="text-xs text-muted-foreground">No source data yet</p> : kpis.sourceTop.map((x) => (
                  <div key={x.name} className="text-xs flex justify-between gap-2"><span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Counties</p>
              <div className="space-y-1">
                {kpis.countyTop.length === 0 ? <p className="text-xs text-muted-foreground">No county data yet</p> : kpis.countyTop.map((x) => (
                  <div key={x.name} className="text-xs flex justify-between gap-2"><span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Cities</p>
              <div className="space-y-1">
                {kpis.cityTop.length === 0 ? <p className="text-xs text-muted-foreground">No city data yet</p> : kpis.cityTop.map((x) => (
                  <div key={x.name} className="text-xs flex justify-between gap-2"><span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top States</p>
              <div className="space-y-1">
                {kpis.stateTop.length === 0 ? <p className="text-xs text-muted-foreground">No state data yet</p> : kpis.stateTop.map((x) => (
                  <div key={x.name} className="text-xs flex justify-between gap-2"><span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span></div>
                ))}
              </div>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top POs</p>
              <div className="space-y-1">
                {kpis.poTop.length === 0 ? <p className="text-xs text-muted-foreground">No PO data yet</p> : kpis.poTop.map((x) => (
                  <div key={x.name} className="text-xs flex justify-between gap-2"><span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span></div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intake Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Intake Trends</CardTitle>
          <CardDescription>Demographics, clinical profile, and screening patterns across active referrals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Priority + AI Screening + Staff Rec */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Priority Breakdown</p>
              <div className="space-y-1.5">
                {kpis.priorityUrgent > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Urgent</span>
                    <span className="font-semibold text-red-700">{kpis.priorityUrgent}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />High</span>
                  <span className="font-semibold">{kpis.priorityHigh}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Routine</span>
                  <span className="font-semibold">{kpis.priorityRoutine}</span>
                </div>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">AI Screening Results <span className="font-normal text-muted-foreground">({kpis.aiScreened} screened)</span></p>
              {kpis.aiScreened === 0 ? (
                <p className="text-xs text-muted-foreground">No AI screenings yet</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Interview</span>
                    <span className="font-semibold text-green-700">{kpis.aiInterview}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Conditions</span>
                    <span className="font-semibold text-yellow-700">{kpis.aiConditions}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Decline</span>
                    <span className="font-semibold text-red-700">{kpis.aiDecline}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Staff Recommendation</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Yes</span>
                  <span className="font-semibold text-green-700">{kpis.staffYes}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />Maybe</span>
                  <span className="font-semibold text-yellow-700">{kpis.staffMaybe}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />No</span>
                  <span className="font-semibold text-red-700">{kpis.staffNo}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Age + Gender + Diagnoses + Offenses */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Average Age</p>
              {kpis.avgAge === null ? (
                <p className="text-xs text-muted-foreground">No age data parsed yet</p>
              ) : (
                <>
                  <p className="text-2xl font-bold">{kpis.avgAge}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">across {kpis.ageWithData} referrals with age data</p>
                </>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Gender</p>
              {kpis.genderTop.length === 0 ? (
                <p className="text-xs text-muted-foreground">No gender data parsed yet</p>
              ) : (
                <div className="space-y-1">
                  {kpis.genderTop.map((x) => (
                    <div key={x.name} className="text-xs flex justify-between gap-2">
                      <span>{x.name}</span><span className="font-semibold">{x.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Diagnoses</p>
              {kpis.diagnosisTop.length === 0 ? (
                <p className="text-xs text-muted-foreground">No diagnosis data parsed yet</p>
              ) : (
                <div className="space-y-1">
                  {kpis.diagnosisTop.map((x) => (
                    <div key={x.name} className="text-xs flex justify-between gap-2">
                      <span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-md border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Offenses</p>
              {kpis.offenseTop.length === 0 ? (
                <p className="text-xs text-muted-foreground">No offense data parsed yet</p>
              ) : (
                <div className="space-y-1">
                  {kpis.offenseTop.map((x) => (
                    <div key={x.name} className="text-xs flex justify-between gap-2">
                      <span className="truncate">{x.name}</span><span className="font-semibold">{x.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ClipboardPaste className="h-4 w-4" /> Paste Referral Text</CardTitle>
              <CardDescription>Paste referral packet, intake email, or placement document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="referral-name">Referral Name</Label>
                  <Input
                    id="referral-name"
                    value={referralName}
                    onChange={(e) => setReferralName(e.target.value)}
                    placeholder={parsedEntries.length > 1 ? "Bulk mode: auto-detected per referral" : "First Last"}
                    disabled={parsedEntries.length > 1}
                  />
                </div>
                <div>
                  <Label htmlFor="referral-source">Referral Source</Label>
                  <Input id="referral-source" value={referralSource} onChange={(e) => setReferralSource(e.target.value)} placeholder="Agency / County / Court (auto-detected if present)" />
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
                <p className="text-xs font-medium text-slate-700">Intake Metadata (applies to all parsed notes)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="global-referral-date">Date</Label>
                    <Input id="global-referral-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="global-referral-staff">Staff Name</Label>
                    <Input id="global-referral-staff" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Your name (saved on every parsed note)" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_interview">Pending Interview</SelectItem>
                        <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                        <SelectItem value="interviewed_yes">Interviewed - Yes</SelectItem>
                        <SelectItem value="interviewed_no">Interviewed - No</SelectItem>
                        <SelectItem value="contacted_po">Logged PO Contact</SelectItem>
                        <SelectItem value="contacted_caseworker">Logged Caseworker Contact</SelectItem>
                        <SelectItem value="requested_more_info">Requested More Info</SelectItem>
                        <SelectItem value="already_found_placement">Already Found Placement</SelectItem>
                        <SelectItem value="waitlisted">Waitlisted</SelectItem>
                        <SelectItem value="accepted">Accepted / Admitted</SelectItem>
                        <SelectItem value="denied">Denied</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="routine">Routine</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {parsedEntries.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  Bulk mode active: {parsedEntries.length} referrals detected and will be saved as separate referral notes.
                </p>
              )}
              <Textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setParsed(null);
                }}
                rows={16}
                placeholder="Paste referral text here..."
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={handleParse} disabled={!rawText.trim() || isParsing} className="flex-1">
                  {isParsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...</> : "Parse Referral"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleAIScreen(rawText)}
                  disabled={!rawText.trim() || isScreeningNew}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  {isScreeningNew ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Screening...</> : <><Sparkles className="h-4 w-4 mr-1.5" />AI Screen</>}
                </Button>
                {(rawText || parsed) && (
                  <Button variant="outline" onClick={() => { handleReset(); setNewReferralScreening(""); }}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {newReferralScreening && (
            <Card className="border-purple-200 bg-purple-50/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
                  <Sparkles className="h-4 w-4" />AI Screening Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderAIScreening(newReferralScreening)}
              </CardContent>
            </Card>
          )}

          {parsed && (
            <Card>
              <CardHeader><CardTitle className="text-base">Save Referral Note</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Saving with global metadata above: Date, Staff Name, Status, and Priority.
                </p>
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Referral Note</>}
                </Button>
              </CardContent>
            </Card>
          )}
          {parsedEntries.length > 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Save Referral Notes</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Staff name and metadata from the top section will be applied to all {parsedEntries.length} parsed notes.
                </p>
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save {parsedEntries.length} Referral Notes</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          {!parsed && parsedEntries.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardPaste className="h-12 w-12 mb-4" />
                <p className="text-center font-medium">Paste referral text and click "Parse Referral"</p>
                <p className="text-center text-sm mt-1">Structured sections will appear here</p>
              </CardContent>
            </Card>
          ) : parsedEntries.length > 1 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bulk Referral Preview</CardTitle>
                <CardDescription>{parsedEntries.length} referral entries detected — each will be saved as an individual card</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {parsedEntries.map((entry, idx) => {
                    const fieldCount = Object.values(entry.parsed).reduce((sum, section) => sum + Object.keys(section).length, 0);
                    const dob = entry.parsed.demographics["Date of Birth"] || entry.parsed.demographics["DOB"] || entry.parsed.demographics["dob"] || "";
                    const age = entry.parsed.demographics["Age"] || entry.parsed.demographics["age"] || "";
                    const gender = entry.parsed.demographics["Sex"] || entry.parsed.demographics["Gender"] || "";
                    return (
                      <div key={idx} className="rounded-md border p-3 bg-gray-50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">
                              {idx + 1}. {entry.referralName || `Referral ${idx + 1}`}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {age && <span className="text-xs text-gray-600">Age: {age}</span>}
                              {gender && <span className="text-xs text-gray-600">• {gender}</span>}
                              {dob && <span className="text-xs text-gray-600">• DOB: {dob}</span>}
                            </div>
                            {entry.referralSource && (
                              <p className="text-xs text-gray-500 mt-1">Source: {entry.referralSource}</p>
                            )}
                            {entry.caseWorker && (
                              <p className="text-xs text-blue-700 mt-0.5 font-medium">PO / Case Worker: {entry.caseWorker}</p>
                            )}
                          </div>
                          <Badge variant="outline" className="shrink-0">{fieldCount} fields</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-sm">{totalFields} fields parsed</Badge>
                {SECTION_CONFIG_UI.filter((s) => sectionHasContent(parsed[s.key])).map((s) => (
                  <Badge key={s.key} className={badgeColorMap[s.color]}>{s.label} ({Object.keys(parsed[s.key]).length})</Badge>
                ))}
              </div>

              {SECTION_CONFIG_UI.map((sectionDef) => {
                const data = parsed[sectionDef.key];
                if (!sectionHasContent(data)) return null;
                const Icon = sectionDef.icon;
                return (
                  <Card key={sectionDef.key} className={`border ${colorMap[sectionDef.color].split(" ").slice(1).join(" ")}`}>
                    <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Icon className="h-4 w-4" />{sectionDef.label}</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-1.5">
                        {Object.entries(data).map(([key, val]) => (
                          <div key={key} className="flex gap-2 text-sm">
                            <span className="font-medium text-gray-600 min-w-[140px] shrink-0">{key}:</span>
                            <span className="text-gray-900">{val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {sectionHasContent(parsed.other) && (
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Other Information</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.entries(parsed.other).map(([key, val]) => (
                        <div key={key} className="text-sm">
                          {key === "Referral Notes" ? (
                            <div className="whitespace-pre-wrap text-gray-800">{val}</div>
                          ) : (
                            <div className="flex gap-2"><span className="font-medium text-gray-600 min-w-[140px] shrink-0">{key}:</span><span className="text-gray-900">{val}</span></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Referral History and Interview Workflow</CardTitle>
              <CardDescription>Track referral notes and add interview reports for leadership</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <Select value={historyFilter} onValueChange={setHistoryFilter}>
                  <SelectTrigger><SelectValue placeholder="Filter status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_interview">Pending Interview</SelectItem>
                    <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                    <SelectItem value="interviewed_yes">Interviewed - Yes</SelectItem>
                    <SelectItem value="interviewed_no">Interviewed - No</SelectItem>
                    <SelectItem value="contacted_po">Logged PO Contact</SelectItem>
                    <SelectItem value="contacted_caseworker">Logged Caseworker Contact</SelectItem>
                    <SelectItem value="requested_more_info">Requested More Info</SelectItem>
                    <SelectItem value="already_found_placement">Already Found Placement</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted</SelectItem>
                    <SelectItem value="accepted">Accepted / Admitted</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={poFilter} onValueChange={setPoFilter}>
                  <SelectTrigger><SelectValue placeholder="Filter by PO" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All POs</SelectItem>
                    {uniquePONames.map((po) => (
                      <SelectItem key={po} value={po}>{po}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={archiveView} onValueChange={setArchiveView}>
                  <SelectTrigger><SelectValue placeholder="Archive view" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="archived">Archived Only</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search referral, source, staff" className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPoContactFilter((v) => !v)}
                    className={`shrink-0 whitespace-nowrap ${poContactFilter ? "bg-amber-50 border-amber-400 text-amber-800 font-semibold" : "border-slate-300 text-slate-600"}`}
                  >
                    {poContactFilter ? "No PO Contact ✓" : "No PO Contact"}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                  Bulk actions support archive, edit, and delete only. Interview report and view details are single-referral actions.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 ml-3 text-violet-700 border-violet-300 hover:bg-violet-50"
                  onClick={() => setBulkOutreachOpen(true)}
                >
                  <Mail className="h-3.5 w-3.5 mr-1" />
                  Bulk Outreach
                </Button>
              </div>

              {isLoadingHistory ? (
                <p className="text-sm text-muted-foreground">Loading referral history...</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No referral notes saved yet.</p>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/70">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={visibleHistory.length > 0 && selectedVisibleCount === visibleHistory.length}
                          onChange={(e) => toggleVisibleSelection(e.target.checked)}
                        />
                        Select visible
                      </label>
                      <span className="inline-flex items-center rounded-full bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {selectedReferralKeys.size} selected
                      </span>
                      {selectedReferralKeys.size > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                          onClick={() => setSelectedReferralKeys(new Set())}
                        >
                          Clear selection
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Select value={bulkStatus} onValueChange={setBulkStatus}>
                          <SelectTrigger className="bg-white w-full"><SelectValue placeholder="Bulk status update" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_change">No status change</SelectItem>
                            <SelectItem value="pending_interview">Pending Interview</SelectItem>
                            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                            <SelectItem value="interviewed_yes">Interviewed - Yes</SelectItem>
                            <SelectItem value="interviewed_no">Interviewed - No</SelectItem>
                            <SelectItem value="contacted_po">Logged PO Contact</SelectItem>
                            <SelectItem value="contacted_caseworker">Logged Caseworker Contact</SelectItem>
                            <SelectItem value="requested_more_info">Requested More Info</SelectItem>
                            <SelectItem value="already_found_placement">Already Found Placement</SelectItem>
                            <SelectItem value="waitlisted">Waitlisted</SelectItem>
                            <SelectItem value="accepted">Accepted / Admitted</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={bulkPriority} onValueChange={setBulkPriority}>
                          <SelectTrigger className="bg-white w-full"><SelectValue placeholder="Bulk priority update" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_change">No priority change</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="routine">Routine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          onClick={handleBulkEdit}
                          disabled={isBulkApplying || selectedReferralKeys.size === 0}
                          className="w-full min-w-0"
                        >
                          {isBulkApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply Updates"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBulkArchive}
                          disabled={isBulkApplying || selectedReferralKeys.size === 0}
                          className="w-full min-w-0"
                        >
                          {isBulkApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Archive Selected"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleBulkDelete}
                          disabled={isBulkApplying || selectedReferralKeys.size === 0}
                          className="w-full min-w-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          {isBulkApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Selected"}
                        </Button>
                      </div>
                    </div>
                    {selectedReferralKeys.size === 0 && (
                      <p className="mt-2 text-xs text-slate-500">Select one or more referrals to enable bulk actions.</p>
                    )}
                  </div>

                  {visibleHistory.map((item) => {
                    const createdDate = new Date(item.createdAt);
                    const formattedDate = isValid(createdDate) ? format(createdDate, "MMM d, yyyy") : "-";
                    const rowKey = referralRowKey(item);
                    const isExpanded = expandedReferralId === rowKey;
                    
                    const { email: inferredPoEmail, firstName: poFirstName, friendlyName: friendlyPoName } = derivePoContact(item);
                    const mailtoTo = inferredPoEmail
                      ? encodeURIComponent(inferredPoEmail)
                      : encodeURIComponent(friendlyPoName);

                    const hrefCheck = `mailto:${mailtoTo}?subject=${encodeURIComponent(`Referral Follow-Up: ${item.referralName || 'the youth'}`)}&body=${encodeURIComponent(`Hi ${poFirstName},\n\nWe are reaching out to check whether ${item.referralName || 'this youth'} still needs placement. If placement is no longer needed or they have already been placed elsewhere, please reply to let us know so we can update our records.\n\nWe apologize if you haven't already heard from us regarding this referral. We've updated our referral process to make sure everything is documented and we can provide answers more quickly. This will help us offer better service times for kids and quicker case management responses for you.\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`)}`;

                    const hrefInterviewRequest = `mailto:${mailtoTo}?subject=${encodeURIComponent(`Interview Request – ${item.referralName || 'the youth'}`)}&body=${encodeURIComponent(`Hi ${poFirstName},\n\nWe have received the referral for ${item.referralName || 'the youth'} and would like to schedule an interview to further assess placement fit at Heartland Boys Home.\n\nCould you please let us know your availability, or provide the best way to coordinate this with the youth and their family? We want to ensure the process is as smooth as possible for everyone involved.\n\nPlease feel free to reply to this email or contact us directly at admissions@heartlandboyshomenebraska.org.\n\nThank you for your time and for the work you do on behalf of the youth in your care.\n\nSincerely,\nHeartland Admissions\nHeartland Boys Home\nadmissions@heartlandboyshomenebraska.org`)}`;

                    const hrefAccept = `mailto:${mailtoTo}?subject=${encodeURIComponent(`Placement Accepted for ${item.referralName || "the youth"}`)}&body=${encodeURIComponent(`Hi ${poFirstName},\n\nWe can accept ${item.referralName || "the youth"}. What intake date/time are you aiming for, and who is transporting?\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`)}`;

                    const hrefDeny = `mailto:${mailtoTo}?subject=${encodeURIComponent(`Referral Update for ${item.referralName || "the youth"}`)}&body=${encodeURIComponent(`Hi ${poFirstName},\n\nThanks for the referral for ${item.referralName || "the youth"}. We're not able to accept at this time due to [reason].\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`)}`;

                    return (
                    <div key={rowKey} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedReferralKeys.has(rowKey)}
                            onChange={(e) => toggleReferralSelection(item, e.target.checked)}
                          />
                          <span className="text-xs text-muted-foreground">{formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline">{item.fieldCount} fields</Badge>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[item.status] || STATUS_COLORS.new}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                          <Badge variant="secondary">{item.priority}</Badge>
                          {item.staffRecommendation === "yes" && <Badge className="bg-green-100 text-green-800 border-green-300">Staff: Yes</Badge>}
                          {item.staffRecommendation === "maybe" && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Staff: Maybe</Badge>}
                          {item.staffRecommendation === "no" && <Badge className="bg-red-100 text-red-800 border-red-300">Staff: No</Badge>}
                          {item.interviewScheduledDate && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                              Interview: {format(new Date(item.interviewScheduledDate + "T00:00:00"), "MMM d, yyyy")}
                            </Badge>
                          )}
                          {item.archived && <Badge variant="outline">archived</Badge>}
                          {(() => {
                            const sr = item.screeningResult || aiScreeningResults[rowKey] || "";
                            if (!sr) return null;
                            try {
                              const clean = sr.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
                              const parsed = JSON.parse(clean);
                              const rec = parsed.recommendation || "";
                              const styles: Record<string, string> = {
                                INTERVIEW: "bg-green-100 text-green-800 border-green-300",
                                INTERVIEW_WITH_CONDITIONS: "bg-yellow-100 text-yellow-800 border-yellow-300",
                                DECLINE: "bg-red-100 text-red-800 border-red-300",
                              };
                              return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${styles[rec] || "bg-purple-100 text-purple-800 border-purple-300"}`}><Sparkles className="h-3 w-3" />{rec.replace(/_/g, " ") || "AI Screened"}</span>;
                            } catch {
                              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-purple-100 text-purple-800 border-purple-300"><Sparkles className="h-3 w-3" />AI Screened</span>;
                            }
                          })()}
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{item.referralName}</p>
                      {item.referralSource && <p className="text-xs text-muted-foreground">Source: {item.referralSource}</p>}
                      {extractProbationOfficer(item).length > 0 && (
                        <p className="text-xs text-muted-foreground">PO: <span className="font-medium text-foreground">{extractProbationOfficer(item).join(", ")}</span></p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Staff: {item.staff || "Unknown"} | Sections: {item.sectionCount}</p>
                      {item.archived && item.archiveReason && (
                        <p className="text-xs text-amber-700 mt-1">
                          Archive reason: {item.archiveReason}
                          {item.archiveReasonDetail ? ` ${item.archiveReasonDetail}` : ""}
                        </p>
                      )}

                      {/* Quick Info (DOB, Worker, etc.) */}
                      {(() => {
                        if (!item.parsedData) return null;
                        const dob = item.parsedData.demographics?.["Date of Birth"] || item.parsedData.demographics?.["DOB"] || item.parsedData.demographics?.["dob"] || "";
                        const age = item.parsedData.demographics?.["Age"] || item.parsedData.demographics?.["age"] || "";
                        const worker = inferCaseWorker(item.parsedData);
                        const charges = item.parsedData.legal?.["Current Charges"] || item.parsedData.legal?.["Charges"] || "";
                        if (!dob && !age && !worker && !charges) return null;
                        return (
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-1 text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-100">
                            {dob && <div><span className="font-medium text-slate-700">DOB:</span> {dob}</div>}
                            {age && <div><span className="font-medium text-slate-700">Age:</span> {age}</div>}
                            {worker && <div><span className="font-medium text-slate-700">Worker:</span> {worker}</div>}
                            {charges && <div className="w-full truncate" title={String(charges)}><span className="font-medium text-slate-700">Charges:</span> {charges}</div>}
                          </div>
                        );
                      })()}

                      {/* Staff Recommendation */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600 font-medium shrink-0">Staff Rec:</span>
                        {(["yes", "maybe", "no"] as const).map((rec) => (
                          <button
                            key={rec}
                            onClick={() => handleStaffRecommendation(item, rec)}
                            disabled={savingRecommendationId === rowKey}
                            className={`px-2.5 py-0.5 rounded text-xs font-medium border transition-colors ${
                              item.staffRecommendation === rec
                                ? rec === "yes"
                                  ? "bg-green-600 text-white border-green-600"
                                  : rec === "maybe"
                                  ? "bg-yellow-500 text-white border-yellow-500"
                                  : "bg-red-600 text-white border-red-600"
                                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {savingRecommendationId === rowKey ? "..." : rec.charAt(0).toUpperCase() + rec.slice(1)}
                          </button>
                        ))}
                        {item.poContactLog.length > 0 && (
                          <span className="text-xs text-indigo-700 ml-2">
                            PO last contacted: {format(new Date(item.poContactLog[item.poContactLog.length - 1].date), "MMM d, yyyy")}
                          </span>
                        )}
                      </div>

                      {/* Interview Scheduled Date / Time / Place */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600 font-medium shrink-0">Interview Date:</span>
                        <input
                          type="date"
                          value={item.interviewScheduledDate || ""}
                          onChange={(e) => handleSetInterviewDate(item, e.target.value)}
                          className="h-7 rounded-md border border-gray-300 px-2 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                        <span className="text-xs text-gray-600 font-medium shrink-0">Time:</span>
                        <input
                          type="time"
                          value={item.interviewTime || ""}
                          onChange={(e) => handleSetInterviewTime(item, e.target.value)}
                          className="h-7 rounded-md border border-gray-300 px-2 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                        <span className="text-xs text-gray-600 font-medium shrink-0">Place:</span>
                        <input
                          type="text"
                          placeholder="Location..."
                          value={item.interviewPlace || ""}
                          onBlur={(e) => handleSetInterviewPlace(item, e.target.value)}
                          onChange={(e) => setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, interviewPlace: e.target.value } : h))}
                          className="h-7 w-40 rounded-md border border-gray-300 px-2 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                        />
                        {item.interviewScheduledDate && (
                          <button
                            onClick={() => handleSetInterviewDate(item, "")}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                            title="Clear date"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* PO Contact Log */}
                      <div className="mt-1">
                        <button
                          onClick={() => setExpandedPoLogId(expandedPoLogId === rowKey ? null : rowKey)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors shadow-sm"
                          style={{ backgroundColor: '#4338ca', color: '#ffffff' }}
                        >
                          <Mail className="h-3 w-3" />
                          PO Contact Log ({item.poContactLog.length})
                          {expandedPoLogId === rowKey ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                        {expandedPoLogId === rowKey && (
                          <div className="mt-2 space-y-2 rounded-md border border-indigo-100 bg-indigo-50 p-3">
                            {item.poContactLog.length > 0 && (
                              <div className="space-y-1 mb-3">
                                {item.poContactLog.map((entry) => (
                                  <div key={entry.id} className="text-xs bg-white rounded border border-indigo-100 p-2">
                                    <div className="flex gap-3 flex-wrap">
                                      <span className="font-medium text-indigo-800">{format(new Date(entry.date), "MMM d, yyyy")}</span>
                                      {entry.followUpDate && <span className="text-indigo-600">Follow-up: {format(new Date(entry.followUpDate), "MMM d, yyyy")}</span>}
                                    </div>
                                    {entry.notes && <p className="text-gray-700 mt-0.5">{entry.notes}</p>}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-indigo-800">Log new contact</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-xs text-gray-600">Date</label>
                                  <Input type="date" value={poLogDate} onChange={(e) => setPoLogDate(e.target.value)} className="h-7 text-xs" />
                                </div>
                                <div>
                                  <label className="text-xs text-gray-600">Follow-up Date</label>
                                  <Input type="date" value={poLogFollowUp} onChange={(e) => setPoLogFollowUp(e.target.value)} className="h-7 text-xs" />
                                </div>
                              </div>
                              <Textarea
                                value={poLogNotes}
                                onChange={(e) => setPoLogNotes(e.target.value)}
                                placeholder="Contact notes..."
                                rows={2}
                                className="text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddPoContact(item)}
                                disabled={savingPoContactId === rowKey}
                                className="border-0"
                                style={{ backgroundColor: '#4338ca', color: '#ffffff' }}
                              >
                                {savingPoContactId === rowKey ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Plus className="h-3.5 w-3.5 mr-1" />Log Contact</>}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quick updates */}
                      <div className="mt-2 flex items-center gap-2 flex-wrap bg-slate-50/50 p-2 rounded-md border border-slate-100">
                        <span className="text-xs text-gray-600 font-medium shrink-0">Status:</span>
                        <Select
                          value={item.status || "pending_interview"}
                          onValueChange={(val) => handleQuickStatusUpdate(item, val)}
                          disabled={updatingStatusId === rowKey}
                        >
                          <SelectTrigger className="h-7 text-xs w-[160px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending_interview">Pending Interview</SelectItem>
                            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                            <SelectItem value="interviewed_yes">Interviewed - Yes</SelectItem>
                            <SelectItem value="interviewed_no">Interviewed - No</SelectItem>
                            <SelectItem value="contacted_po">Logged PO Contact</SelectItem>
                            <SelectItem value="contacted_caseworker">Logged Caseworker Contact</SelectItem>
                            <SelectItem value="requested_more_info">Requested More Info</SelectItem>
                            <SelectItem value="already_found_placement">Already Found Placement</SelectItem>
                            <SelectItem value="waitlisted">Waitlisted</SelectItem>
                            <SelectItem value="accepted">Accepted / Admitted</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                          </SelectContent>
                        </Select>

                        <span className="text-xs text-gray-600 font-medium shrink-0 ml-1">Priority:</span>
                        <Select
                          value={item.priority || "routine"}
                          onValueChange={(val) => handleQuickPriorityUpdate(item, val)}
                          disabled={updatingStatusId === rowKey}
                        >
                          <SelectTrigger className="h-7 text-xs w-[110px] bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="routine">Routine</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-2">
                        <span className="text-xs font-semibold text-gray-500 mr-1 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Quick Emails:
                        </span>
                        <a
                          href={hrefCheck}
                          className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-1 rounded border border-blue-200 transition-colors"
                        >
                          Check Need
                        </a>
                        <a
                          href={hrefInterviewRequest}
                          className="text-xs bg-violet-50 text-violet-700 hover:bg-violet-100 px-2 py-1 rounded border border-violet-200 transition-colors"
                        >
                          Request Interview
                        </a>
                        <a
                          href={hrefAccept}
                          className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded border border-green-200 transition-colors"
                        >
                          Accept
                        </a>
                        <a
                          href={hrefDeny}
                          className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded border border-red-200 transition-colors"
                        >
                          Deny
                        </a>
                        {item.interviewScheduledDate && (() => {
                          const intDate = format(new Date(item.interviewScheduledDate + "T00:00:00"), "MMMM d, yyyy");
                          const intTime = item.interviewTime
                            ? new Date(`2000-01-01T${item.interviewTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                            : "TBD";
                          const intPlace = item.interviewPlace || "TBD";
                          const hrefInterview = `mailto:${mailtoTo}?subject=${encodeURIComponent(`Interview Scheduled for ${item.referralName || "the youth"}`)}&body=${encodeURIComponent(`Hi ${poFirstName},\n\nWe'd like to schedule an interview for ${item.referralName || "the youth"}.\n\nDate: ${intDate}\nTime: ${intTime}\nLocation: ${intPlace}\n\nPlease confirm or let us know if adjustments are needed.\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`)}`;
                          return (
                            <a
                              href={hrefInterview}
                              className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 transition-colors"
                            >
                              Interview
                            </a>
                          );
                        })()}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 border-t pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedReferralId(isExpanded ? null : rowKey)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Details
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openInterviewEditor(item)}>Interview Report</Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={() => handleAIScreen(item.rawText || JSON.stringify(item.parsedData || {}), rowKey)}
                          disabled={aiScreeningLoading.has(rowKey)}
                        >
                          {aiScreeningLoading.has(rowKey)
                            ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />Screening...</>
                            : <><Sparkles className="h-3.5 w-3.5 mr-1" />{(item.screeningResult || aiScreeningResults[rowKey]) ? "Re-screen" : "AI Screen"}</>
                          }
                        </Button>
                        {!item.archived && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setArchived(item, true, "Archived by staff", null)}
                            disabled={archivingId === (item.id || item.createdAt)}
                          >
                            {archivingId === (item.id || item.createdAt) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Archive"}
                          </Button>
                        )}
                        {item.archived && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setArchived(item, false)}
                          >
                            Restore
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => {
                            if (confirm(`Delete referral for "${item.referralName}"? This cannot be undone.`)) {
                              handleDelete(item);
                            }
                          }}
                          disabled={deletingId === (item.id || item.createdAt)}
                        >
                          {deletingId === (item.id || item.createdAt) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t space-y-3">
                          {item.parsedData && Object.values(item.parsedData).some((section: any) => section && typeof section === "object" && Object.keys(section).length > 0) ? (
                            <>
                              {SECTION_CONFIG_UI.map((sectionDef) => {
                                const data = item.parsedData?.[sectionDef.key];
                                if (!data || typeof data !== "object" || Object.keys(data).length === 0) return null;
                                const Icon = sectionDef.icon;
                                return (
                                  <div key={sectionDef.key} className={`rounded-md border p-3 ${colorMap[sectionDef.color]}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                      <Icon className="h-4 w-4" />
                                      <span className="text-sm font-semibold">{sectionDef.label}</span>
                                      <Badge variant="outline" className="text-xs">{Object.keys(data).length}</Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-1">
                                      {Object.entries(data).map(([key, val]) => (
                                        <div key={key} className="flex gap-2 text-sm">
                                          <span className="font-medium text-gray-600 min-w-[120px] shrink-0">{key}:</span>
                                          <span className="text-gray-900 break-words">{val as string}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                              {item.parsedData?.other && typeof item.parsedData.other === "object" && Object.keys(item.parsedData.other).length > 0 && (
                                <div className="rounded-md border border-gray-200 p-3">
                                  <span className="text-sm font-semibold mb-2 block">Other Information</span>
                                  <div className="grid grid-cols-1 gap-1">
                                    {Object.entries(item.parsedData.other).map(([key, val]) => (
                                      <div key={key} className="text-sm">
                                        {key === "Referral Notes" ? (
                                          <div className="whitespace-pre-wrap text-gray-800">{val as string}</div>
                                        ) : (
                                          <div className="flex gap-2">
                                            <span className="font-medium text-gray-600 min-w-[120px] shrink-0">{key}:</span>
                                            <span className="text-gray-900 break-words">{val as string}</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : item.rawText ? (
                            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                              <span className="text-sm font-semibold mb-2 block">Raw Referral Text</span>
                              <div className="whitespace-pre-wrap text-sm text-gray-800 max-h-[500px] overflow-y-auto">{item.rawText}</div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No detailed referral data available for this entry.</p>
                          )}

                          {/* AI Screening Result */}
                          {(item.screeningResult || aiScreeningResults[rowKey]) && (
                            <div className="rounded-md border border-purple-200 bg-purple-50/50 p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                                  <Sparkles className="h-4 w-4" />AI Screening Result
                                </span>
                                <button
                                  onClick={() => handleAIScreen(item.rawText || JSON.stringify(item.parsedData || {}), rowKey)}
                                  disabled={aiScreeningLoading.has(rowKey)}
                                  className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                                >
                                  {aiScreeningLoading.has(rowKey) ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                  Re-run
                                </button>
                              </div>
                              {renderAIScreening(item.screeningResult || aiScreeningResults[rowKey])}
                            </div>
                          )}

                          {item.interviewReport.trim() && (
                            <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                              <span className="text-sm font-semibold text-blue-800 mb-2 block">Interview Report</span>
                              <div className="whitespace-pre-wrap text-sm text-blue-900">{item.interviewReport}</div>
                            </div>
                          )}
                          {item.directorSummary.trim() && (
                            <div className="rounded-md border border-purple-200 bg-purple-50 p-3">
                              <span className="text-sm font-semibold text-purple-800 mb-2 block">Director Summary</span>
                              <div className="whitespace-pre-wrap text-sm text-purple-900">{item.directorSummary}</div>
                            </div>
                          )}
                          {item.archived && (item.archiveReason || item.archiveReasonDetail) && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                              <span className="text-sm font-semibold text-amber-800 mb-2 block">Archive Reason</span>
                              <div className="text-sm text-amber-900 whitespace-pre-wrap">
                                {item.archiveReason || "Reason not specified"}
                                {item.archiveReasonDetail ? `\n${item.archiveReasonDetail}` : ""}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                  })}
                  {filteredHistory.length > visibleCount && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setVisibleCount((prev) => prev + 15)}>
                      Show more ({filteredHistory.length - visibleCount} remaining)
                    </Button>
                  )}
                  {visibleCount > 15 && filteredHistory.length <= visibleCount && (
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setVisibleCount(15)}>
                      Show less
                    </Button>
                  )}
                </div>
              )}

              <Dialog
                open={Boolean(editingInterviewTarget)}
                onOpenChange={(open) => {
                  if (!open) setEditingInterviewTarget(null);
                }}
              >
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Interview Report and Director Brief</DialogTitle>
                    <DialogDescription>Use this after the referral interview to prepare leadership-ready notes</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Interview Report</Label>
                      <Textarea
                        value={interviewReport}
                        onChange={(e) => setInterviewReport(e.target.value)}
                        rows={6}
                        placeholder="Enter interview findings, strengths, risks, placement fit, and recommendations..."
                      />
                    </div>
                    <div>
                      <Label>Director and Executive Director Summary</Label>
                      <Textarea
                        value={directorSummary}
                        onChange={(e) => setDirectorSummary(e.target.value)}
                        rows={4}
                        placeholder="Concise summary for leadership decision-making"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Update Status</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending_interview">Pending Interview</SelectItem>
                            <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                            <SelectItem value="interviewed_yes">Interviewed - Yes</SelectItem>
                            <SelectItem value="interviewed_no">Interviewed - No</SelectItem>
                            <SelectItem value="contacted_po">Logged PO Contact</SelectItem>
                            <SelectItem value="contacted_caseworker">Logged Caseworker Contact</SelectItem>
                            <SelectItem value="requested_more_info">Requested More Info</SelectItem>
                            <SelectItem value="already_found_placement">Already Found Placement</SelectItem>
                            <SelectItem value="waitlisted">Waitlisted</SelectItem>
                            <SelectItem value="accepted">Accepted / Admitted</SelectItem>
                            <SelectItem value="denied">Denied</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button onClick={saveInterviewUpdate} disabled={savingInterview} className="w-full">
                          {savingInterview ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Interview Update</>}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingInterviewTarget(null)}>Cancel</Button>
                      </div>
                    </div>
                    {(interviewReport.trim() || directorSummary.trim()) && (
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = [
                              editingInterviewTarget ? `Referral: ${editingInterviewTarget.referralName}` : "",
                              interviewReport.trim() ? `\nInterview Report:\n${interviewReport.trim()}` : "",
                              directorSummary.trim() ? `\nDirector Summary:\n${directorSummary.trim()}` : "",
                            ].filter(Boolean).join("\n");
                            navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
                          }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" />Copy Report
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const name = editingInterviewTarget?.referralName || "Referral";
                            const html = `<html><head><title>Interview Report — ${name}</title><style>body{font-family:sans-serif;padding:2rem;max-width:800px;margin:auto}h2{margin-top:1.5rem}pre{white-space:pre-wrap;font-family:inherit}</style></head><body><h1>Interview Report</h1><p><strong>Referral:</strong> ${name}</p>${interviewReport.trim() ? `<h2>Interview Report</h2><pre>${interviewReport.trim()}</pre>` : ""}${directorSummary.trim() ? `<h2>Director Summary</h2><pre>${directorSummary.trim()}</pre>` : ""}</body></html>`;
                            const win = window.open("", "_blank");
                            if (win) { win.document.write(html); win.document.close(); win.print(); }
                          }}
                        >
                          <Printer className="h-3.5 w-3.5 mr-1" />Print / PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Bulk Outreach Dialog */}
              <Dialog open={bulkOutreachOpen} onOpenChange={setBulkOutreachOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-violet-600" />
                      Bulk PO Outreach
                    </DialogTitle>
                    <DialogDescription>
                      Pending referrals with no prior PO contact, grouped by probation officer. One email per PO covers all their youth.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Email type selector */}
                  <div className="flex items-center gap-3 pb-2 border-b">
                    <span className="text-sm font-medium text-gray-700">Email type:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setBulkOutreachType("check_need")}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${bulkOutreachType === "check_need" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                      >
                        Check Need
                      </button>
                      <button
                        onClick={() => setBulkOutreachType("interview")}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${bulkOutreachType === "interview" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
                      >
                        Request Interview
                      </button>
                    </div>
                  </div>

                  {(() => {
                    const PENDING_STATUSES = new Set(["pending_interview", "interview_scheduled", "requested_more_info", "new", ""]);
                    const pendingItems = history.filter(
                      (item) => !item.archived && PENDING_STATUSES.has(item.status || "") && (item.poContactLog || []).length === 0
                    );

                    const logBulkPoContact = async (items: ReferralHistoryItem[], emailTypeLabel: string, poEmail: string) => {
                      const { v4: uuidv4 } = await import("uuid");
                      const today = format(new Date(), "yyyy-MM-dd");
                      await Promise.all(items.map(async (item) => {
                        const note = `${emailTypeLabel} email opened via Bulk Outreach${poEmail ? ` (${poEmail})` : ""}`;
                        const newEntry: POContactEntry = { id: uuidv4(), date: today, notes: note, followUpDate: "" };
                        const updatedLog = [...(item.poContactLog || []), newEntry];
                        await referralNotesService.update(toReferralLookup(item), { po_contact_log: updatedLog });
                        setHistory((prev) => prev.map((h) => sameReferral(h, item) ? { ...h, poContactLog: updatedLog } : h));
                      }));
                    };

                    // Group by inferred PO email (or friendly name as fallback key)
                    const groups = new Map<string, { poEmail: string; poFirstName: string; poFriendly: string; items: ReferralHistoryItem[] }>();
                    for (const item of pendingItems) {
                      const { email, firstName, friendlyName } = derivePoContact(item);
                      const key = email || friendlyName;
                      if (!groups.has(key)) {
                        groups.set(key, { poEmail: email, poFirstName: firstName, poFriendly: friendlyName, items: [] });
                      }
                      groups.get(key)!.items.push(item);
                    }

                    const groupList = [...groups.values()];

                    if (groupList.length === 0) {
                      return <p className="text-sm text-muted-foreground py-4 text-center">No pending referrals found.</p>;
                    }

                    const buildMailtoHref = (group: typeof groupList[0]): string => {
                      const { poEmail, poFirstName, poFriendly, items } = group;
                      const mailtoTo = poEmail ? encodeURIComponent(poEmail) : encodeURIComponent(poFriendly);
                      const names = items.map((i) => i.referralName || "the youth");
                      const isMulti = names.length > 1;

                      if (bulkOutreachType === "check_need") {
                        const subject = encodeURIComponent(isMulti ? `Referral Follow-Up – Multiple Youth` : `Referral Follow-Up: ${names[0]}`);
                        const body = isMulti
                          ? encodeURIComponent(`Hi ${poFirstName},\n\nWe are reaching out regarding the following youth on your caseload who have pending referrals with us:\n${names.map((n) => `  \u2022 ${n}`).join("\n")}\n\nCould you please let us know whether each youth still needs placement? If placement is no longer needed or they have already been placed elsewhere, please reply so we can update our records.\n\nWe apologize if you have already heard from us regarding any of these referrals. We have updated our process to ensure timely communication and better service times.\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`)
                          : encodeURIComponent(`Hi ${poFirstName},\n\nWe are reaching out to check whether ${names[0]} still needs placement. If placement is no longer needed or they have already been placed elsewhere, please reply to let us know so we can update our records.\n\nWe apologize if you haven't already heard from us regarding this referral. We've updated our referral process to make sure everything is documented and we can provide answers more quickly.\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`);
                        return `mailto:${mailtoTo}?subject=${subject}&body=${body}`;
                      } else {
                        const subject = encodeURIComponent(isMulti ? `Interview Request – Multiple Youth` : `Interview Request – ${names[0]}`);
                        const body = isMulti
                          ? encodeURIComponent(`Hi ${poFirstName},\n\nWe have received referrals for the following youth and would like to schedule interviews to further assess placement fit at Heartland Boys Home:\n${names.map((n) => `  \u2022 ${n}`).join("\n")}\n\nCould you please let us know your availability, or provide the best way to coordinate with each youth and their family? We want to ensure the process is as smooth as possible for everyone involved.\n\nPlease feel free to reply or contact us at admissions@heartlandboyshomenebraska.org.\n\nSincerely,\nHeartland Admissions\nHeartland Boys Home\nadmissions@heartlandboyshomenebraska.org`)
                          : encodeURIComponent(`Hi ${poFirstName},\n\nWe have received the referral for ${names[0]} and would like to schedule an interview to further assess placement fit at Heartland Boys Home.\n\nCould you please let us know your availability, or provide the best way to coordinate this with the youth and their family?\n\nPlease feel free to reply or contact us at admissions@heartlandboyshomenebraska.org.\n\nSincerely,\nHeartland Admissions\nHeartland Boys Home\nadmissions@heartlandboyshomenebraska.org`);
                        return `mailto:${mailtoTo}?subject=${subject}&body=${body}`;
                      }
                    };

                    const emailTypeLabel = bulkOutreachType === "check_need" ? "Check Need" : "Request Interview";

                    const openAll = () => {
                      groupList.forEach((group, i) => {
                        setTimeout(() => {
                          window.location.href = buildMailtoHref(group);
                          logBulkPoContact(group.items, emailTypeLabel, group.poEmail);
                        }, i * 700);
                      });
                    };

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            <span className="font-semibold">{groupList.length}</span> PO{groupList.length !== 1 ? "s" : ""} · <span className="font-semibold">{pendingItems.length}</span> pending referral{pendingItems.length !== 1 ? "s" : ""}
                          </p>
                          <Button size="sm" variant="outline" className="text-violet-700 border-violet-300 hover:bg-violet-50" onClick={openAll}>
                            <Mail className="h-3.5 w-3.5 mr-1" />
                            Open All ({groupList.length})
                          </Button>
                        </div>

                        {groupList.map((group) => (
                          <div key={group.poEmail || group.poFriendly} className="rounded-lg border border-gray-200 p-3 bg-gray-50/50">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 truncate">{group.poFriendly}</p>
                                {group.poEmail && (
                                  <p className="text-xs text-gray-500 truncate">{group.poEmail}</p>
                                )}
                                <ul className="mt-1.5 space-y-0.5">
                                  {group.items.map((item) => (
                                    <li key={item.id} className="text-xs text-gray-600 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                                      {item.referralName || "Unknown youth"}
                                      {item.status && (
                                        <span className="text-gray-400">· {STATUS_LABELS[item.status] || item.status}</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <button
                                onClick={() => {
                                  window.location.href = buildMailtoHref(group);
                                  logBulkPoContact(group.items, emailTypeLabel, group.poEmail);
                                }}
                                className="shrink-0 text-xs bg-violet-50 text-violet-700 hover:bg-violet-100 px-3 py-1.5 rounded border border-violet-200 transition-colors whitespace-nowrap"
                              >
                                Open Email
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
