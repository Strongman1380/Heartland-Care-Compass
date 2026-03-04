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

interface ParsedReferral {
  demographics: Record<string, string>;
  family: Record<string, string>;
  education: Record<string, string>;
  medical: Record<string, string>;
  mentalHealth: Record<string, string>;
  legal: Record<string, string>;
  behavioral: Record<string, string>;
  placement: Record<string, string>;
  other: Record<string, string>;
}

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

const SECTION_CONFIG = [
  {
    key: "demographics" as const,
    label: "Demographics",
    icon: User,
    color: "blue",
    keywords: [
      "first name", "last name", "name", "dob", "date of birth", "age", "sex", "gender",
      "race", "ethnicity", "religion", "place of birth", "address", "city", "state", "zip",
    ],
  },
  {
    key: "family" as const,
    label: "Family & Contacts",
    icon: Home,
    color: "amber",
    keywords: ["mother", "father", "parent", "guardian", "sibling", "family", "caregiver", "custody"],
  },
  {
    key: "education" as const,
    label: "Education",
    icon: BookOpen,
    color: "purple",
    keywords: ["school", "grade", "iep", "academic", "education", "teacher", "attendance"],
  },
  {
    key: "medical" as const,
    label: "Medical",
    icon: Pill,
    color: "green",
    keywords: ["medication", "allergy", "doctor", "medical", "health", "hospital", "clinic"],
  },
  {
    key: "mentalHealth" as const,
    label: "Mental Health",
    icon: Brain,
    color: "pink",
    keywords: ["diagnosis", "therapy", "counseling", "trauma", "anxiety", "depression", "adhd"],
  },
  {
    key: "legal" as const,
    label: "Legal & Court",
    icon: Scale,
    color: "slate",
    keywords: ["court", "judge", "attorney", "probation", "caseworker", "case worker", "offense", "charge", "legal", "probation officer", "parole officer", "po "],
  },
  {
    key: "behavioral" as const,
    label: "Behavioral History",
    icon: AlertTriangle,
    color: "orange",
    keywords: ["behavior", "aggression", "anger", "violence", "substance", "runaway", "fighting"],
  },
  {
    key: "placement" as const,
    label: "Placement & Referral",
    icon: Shield,
    color: "red",
    keywords: ["referral", "placement", "admission", "intake", "discharge", "group home", "estimated stay"],
  },
];

const UNKNOWN_VALUE_RE = /^(n\/a|na|none|unknown|not provided|not documented|unspecified|-|—)$/i;

const parseFieldLine = (line: string): { fieldName: string; value: string } | null => {
  const colonMatch = line.match(/^([^:]{2,80}):\s*(.+)$/);
  if (colonMatch) return { fieldName: colonMatch[1].trim(), value: colonMatch[2].trim() };

  const tabMatch = line.match(/^([^\t]{2,80})\t+(.+)$/);
  if (tabMatch) return { fieldName: tabMatch[1].trim(), value: tabMatch[2].trim() };

  const dashMatch = line.match(/^([A-Za-z][A-Za-z0-9 /()#&]{2,80})\s[-–—]\s(.+)$/);
  if (dashMatch) return { fieldName: dashMatch[1].trim(), value: dashMatch[2].trim() };

  return null;
};

const detectSectionForField = (field: string): keyof ParsedReferral | null => {
  const fieldLower = field.toLowerCase();
  for (const section of SECTION_CONFIG) {
    if (section.keywords.some((kw) => fieldLower.includes(kw))) return section.key;
  }
  return null;
};

const detectSectionHeader = (line: string): keyof ParsedReferral | null => {
  const normalized = line.toLowerCase().replace(/[:\-]+$/g, "").trim();
  if (!normalized) return null;
  for (const section of SECTION_CONFIG) {
    const label = section.label.toLowerCase();
    if (normalized === label || (normalized.includes(label) && normalized.length <= label.length + 14)) {
      return section.key;
    }
  }
  return null;
};

const sectionHasContent = (section: Record<string, string>): boolean => Object.keys(section).length > 0;

const LINE_MARKER_RE = /^Line\s+(\d+):\s*$/i;

const PROBATION_ENTRY_RE =
  /^(?<name>.+?)\s*-\s*(?<decision>Yes|Maybe|No\+?-?|No\+o|No)\s*-\s*(?<age>\d{1,2})\s*-\s*(?<rest>.+)$/i;

const PROBATION_ENTRY_ALT_RE =
  /^(?<name>.+?)\s*-\s*(?<age>\d{1,2})\s*-\s*(?<decision>Yes|Maybe|No\+?-?|No\+o|No)\s*-\s*(?<rest>.+)$/i;

const normalizeDecision = (value: string): string => {
  const v = value.trim().toLowerCase();
  if (v === "yes") return "Yes";
  if (v === "maybe") return "Maybe";
  if (v.startsWith("no")) return "No";
  return value.trim();
};

const parseProbationEntryHeader = (
  line: string
): { name: string; decision: string; age: string; rest: string } | null => {
  const match = line.match(PROBATION_ENTRY_RE) || line.match(PROBATION_ENTRY_ALT_RE);
  if (!match?.groups) return null;
  if (!/\bPO\b/i.test(line)) return null;

  const name = (match.groups.name || "").trim();
  const decision = normalizeDecision((match.groups.decision || "").trim());
  const age = (match.groups.age || "").trim();
  const rest = (match.groups.rest || "").trim();
  if (!name || !decision || !age || !rest) return null;
  return { name, decision, age, rest };
};

const extractLabeledSegment = (text: string, labels: string[]): string => {
  const escaped = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelExpr = escaped.join("|");
  const re = new RegExp(`(?:^|,|;)\\s*(?:${labelExpr})\\s*\\(([^)]*)\\)`, "i");
  const match = text.match(re);
  return (match?.[1] || "").trim();
};

const parseProbationStyleBlock = (raw: string): ParsedReferral | null => {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  let sourceLineNumber = "";
  const lineMarker = lines.find((l) => LINE_MARKER_RE.test(l));
  if (lineMarker) {
    sourceLineNumber = (lineMarker.match(LINE_MARKER_RE)?.[1] || "").trim();
  }

  const firstDataLine = lines.find((l) => !LINE_MARKER_RE.test(l));
  if (!firstDataLine) return null;
  const header = parseProbationEntryHeader(firstDataLine);
  if (!header) return null;

  const parsed: ParsedReferral = {
    demographics: {},
    family: {},
    education: {},
    medical: {},
    mentalHealth: {},
    legal: {},
    behavioral: {},
    placement: {},
    other: {},
  };

  const poMatch = header.rest.match(/^(.*?)(?:\s*-\s*)?PO\s+([^()]+?)\s*(\([^)]+\)(?:\s*Ext\.?\s*[\dA-Za-z]+)?)?\s*$/i);
  const narrative = (poMatch?.[1] || header.rest).trim();
  const poName = (poMatch?.[2] || "").trim();
  const poPhone = (poMatch?.[3] || "").replace(/^\s+|\s+$/g, "");

  parsed.demographics["Name"] = header.name;
  parsed.demographics["Age"] = header.age;
  parsed.placement["Referral Recommendation"] = header.decision;
  if (poName) parsed.legal["Probation Officer"] = poName;
  if (poPhone) parsed.legal["Probation Officer Contact"] = poPhone;

  const currentOffense = extractLabeledSegment(narrative, ["current offense", "current offenses", "current charge", "current charges"]);
  const priorOffense = extractLabeledSegment(narrative, ["prior offense", "prior offenses", "previous offense", "previous offenses"]);
  const school = extractLabeledSegment(narrative, ["school"]);
  const substance = extractLabeledSegment(narrative, ["substance use"]);

  if (currentOffense) parsed.legal["Current Offense"] = currentOffense;
  if (priorOffense) parsed.legal["Prior Offense"] = priorOffense;
  if (school) parsed.education["School"] = school;
  if (substance) parsed.behavioral["Substance Use"] = substance;

  if (sourceLineNumber) parsed.other["Source Line"] = sourceLineNumber;
  parsed.other["Referral Narrative"] = narrative;
  parsed.other["Raw Entry"] = firstDataLine;

  return parsed;
};

const parseReferralText = (raw: string): ParsedReferral => {
  const probationParsed = parseProbationStyleBlock(raw);
  if (probationParsed) return probationParsed;

  const result: ParsedReferral = {
    demographics: {},
    family: {},
    education: {},
    medical: {},
    mentalHealth: {},
    legal: {},
    behavioral: {},
    placement: {},
    other: {},
  };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•\-\u2022\*]\s*/, "").trim())
    .filter((l) => l.length > 0);

  let currentFieldRef: { section: keyof ParsedReferral; fieldName: string } | null = null;
  let activeSection: keyof ParsedReferral = "other";

  for (const line of lines) {
    const sectionHeader = detectSectionHeader(line);
    if (sectionHeader) {
      activeSection = sectionHeader;
      currentFieldRef = null;
      continue;
    }

    const parsedField = parseFieldLine(line);
    if (!parsedField) {
      if (currentFieldRef) {
        const { section, fieldName } = currentFieldRef;
        const prev = result[section][fieldName] || "";
        result[section][fieldName] = prev ? `${prev} ${line}`.trim() : line.trim();
      } else {
        result.other[`Line ${Object.keys(result.other).length + 1}`] = line.trim();
      }
      continue;
    }

    const { fieldName, value } = parsedField;
    if (!value || UNKNOWN_VALUE_RE.test(value)) continue;

    const section = detectSectionForField(fieldName) || activeSection;
    result[section][fieldName] = value;
    currentFieldRef = { section, fieldName };
  }

  const totalParsed = Object.values(result).reduce((sum, section) => sum + Object.keys(section).length, 0);
  if (totalParsed === 0 && raw.trim().length > 0) {
    result.other["Referral Notes"] = raw.trim();
  }

  return result;
};

const splitReferralEntries = (raw: string): string[] => {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const probationBlocks: string[] = [];
  let pendingLineMarker = "";

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (LINE_MARKER_RE.test(trimmed)) {
      pendingLineMarker = trimmed;
      continue;
    }

    if (!parseProbationEntryHeader(trimmed)) continue;

    const chunkLines: string[] = [];
    if (pendingLineMarker) chunkLines.push(pendingLineMarker);
    chunkLines.push(trimmed);
    pendingLineMarker = "";

    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      if (!next) {
        j += 1;
        continue;
      }
      if (LINE_MARKER_RE.test(next) || parseProbationEntryHeader(next)) break;
      if (/^Feb\s+\d{1,2},\s+\d{4}$/i.test(next)) break;
      if (/^\d+\s+fields$/i.test(next) || /^Source:\s*/i.test(next) || /^Status:\s*/i.test(next)) break;
      chunkLines.push(next);
      j += 1;
    }

    probationBlocks.push(chunkLines.join("\n").trim());
    i = j - 1;
  }

  if (probationBlocks.length > 1) return probationBlocks;

  const firstNameStarts: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim().toLowerCase();
    if (/^first name\s*:/.test(line)) firstNameStarts.push(i);
  }
  if (firstNameStarts.length >= 2) {
    const segments: string[] = [];
    for (let i = 0; i < firstNameStarts.length; i += 1) {
      const start = firstNameStarts[i];
      const end = i + 1 < firstNameStarts.length ? firstNameStarts[i + 1] : lines.length;
      const block = lines.slice(start, end).join("\n").trim();
      if (block) segments.push(block);
    }
    if (segments.length > 1) return segments;
  }

  const delimiterSplit = normalized
    .split(/\n(?:[-_=]{3,}|\*{3,})\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (delimiterSplit.length > 1) return delimiterSplit;

  const sections = normalized
    .split(/\n\s*\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const likelyBlocks = sections.filter((s) =>
    /(first name|last name|date of birth|dob|referral source|reason for placement)/i.test(s)
  );
  if (likelyBlocks.length >= 2) return likelyBlocks;

  return [normalized];
};

const inferReferralName = (parsed: ParsedReferral): string => {
  const findValue = (keys: string[]): string => {
    const entries = Object.entries(parsed.demographics);
    for (const [k, v] of entries) {
      const lk = k.toLowerCase();
      if (keys.some((x) => lk.includes(x)) && v.trim()) return v.trim();
    }
    return "";
  };

  const fullName = findValue(["full name", "name"]);
  const first = findValue(["first name"]);
  const last = findValue(["last name"]);

  if (first || last) return `${first} ${last}`.trim();
  return fullName;
};

const inferReferralSource = (parsed: ParsedReferral): string => {
  const sections = [parsed.placement, parsed.legal, parsed.other];
  for (const section of sections) {
    for (const [k, v] of Object.entries(section)) {
      const lk = k.toLowerCase();
      if (lk.includes("referral source") || lk === "source" || lk.includes("placing agency") || lk.includes("county")) {
        if (v.trim()) return v.trim();
      }
    }
  }
  return "";
};

const inferCaseWorker = (parsed: ParsedReferral): string => {
  const sections = [parsed.legal, parsed.placement, parsed.other];
  for (const section of sections) {
    for (const [k, v] of Object.entries(section)) {
      const lk = k.toLowerCase();
      if (
        lk.includes("case worker") || lk.includes("caseworker") ||
        lk.includes("probation officer") || lk.includes("parole officer") ||
        lk === "po" || lk.includes("p.o.") || lk.includes("worker name") ||
        lk.includes("assigned worker") || lk.includes("dcf worker")
      ) {
        if (v.trim()) return v.trim();
      }
    }
  }
  return "";
};

const inferGlobalReferralSource = (raw: string): string => {
  const m = raw.match(/(?:^|\n)\s*Source:\s*([^\n|]+)/i);
  return (m?.[1] || "").trim();
};

const inferGlobalStaffName = (raw: string): string => {
  const m = raw.match(/(?:^|\n)\s*Staff:\s*([^\n|]+)/i);
  return (m?.[1] || "").trim();
};

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

  const filteredHistory = history.filter((item) => {
    if (archiveView === "active" && item.archived) return false;
    if (archiveView === "archived" && !item.archived) return false;
    if (historyFilter !== "all" && item.status !== historyFilter) return false;
    if (poContactFilter && item.poContactLog && item.poContactLog.length > 0) return false;
    if (!historySearch.trim()) return true;
    const haystack = `${item.referralName} ${item.summary} ${item.staff} ${item.priority} ${item.referralSource}`.toLowerCase();
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
    emailType: "accept" | "deny" | "interview",
    toEmail: string,
    poFirstName: string,
    extraParams?: Record<string, string>
  ) => {
    const rowKey = referralRowKey(item);
    const loadingKey = rowKey + emailType;
    setSendingEmailId(loadingKey);
    const templateIds: Record<string, string> = {
      accept: import.meta.env.VITE_EMAILJS_ACCEPT_TEMPLATE_ID,
      deny: import.meta.env.VITE_EMAILJS_DENY_TEMPLATE_ID,
      interview: import.meta.env.VITE_EMAILJS_INTERVIEW_TEMPLATE_ID,
    };
    const labels: Record<string, string> = {
      accept: "Acceptance",
      deny: "Denial",
      interview: "Interview scheduling",
    };
    try {
      await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID,
        templateIds[emailType],
        {
          to_email: toEmail,
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
      toast.error("Failed to send email — check EmailJS configuration in .env");
      console.error(err);
    } finally {
      setSendingEmailId(null);
    }
  };

  const kpis = useMemo(() => {
    const active = history.filter((h) => !h.archived);
    const total = active.length;
    const archivedCount = history.filter((h) => h.archived).length;
    const pendingCount = active.filter((h) => h.status === "pending_interview" || h.status === "new").length;
    const scheduledCount = active.filter((h) => h.status === "interview_scheduled").length;
    const interviewedYes = active.filter((h) => h.status === "interviewed_yes").length;
    const interviewedNo = active.filter((h) => h.status === "interviewed_no").length;
    const deniedCount = active.filter((h) => h.status === "denied").length;
    const sourceTop = tallyTop(active.map((h) => h.referralSource).filter(Boolean));
    const countyTop = tallyTop(active.flatMap(extractCounties));
    const cityTop = tallyTop(active.flatMap(extractCities));
    const stateTop = tallyTop(active.flatMap(extractStates));
    const poTop = tallyTop(active.flatMap(extractProbationOfficer));

    return {
      total,
      archivedCount,
      pendingCount,
      scheduledCount,
      interviewedYes,
      interviewedNo,
      deniedCount,
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
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-semibold">{kpis.total}</p></div>
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3"><p className="text-xs text-yellow-700">Pending Interview</p><p className="text-xl font-semibold text-yellow-800">{kpis.pendingCount}</p></div>
            <div className="rounded-md border border-blue-200 bg-blue-50 p-3"><p className="text-xs text-blue-700">Scheduled</p><p className="text-xl font-semibold text-blue-800">{kpis.scheduledCount}</p></div>
            <div className="rounded-md border border-green-200 bg-green-50 p-3"><p className="text-xs text-green-700">Interviewed - Yes</p><p className="text-xl font-semibold text-green-800">{kpis.interviewedYes}</p></div>
            <div className="rounded-md border border-orange-200 bg-orange-50 p-3"><p className="text-xs text-orange-700">Interviewed - No</p><p className="text-xl font-semibold text-orange-800">{kpis.interviewedNo}</p></div>
            <div className="rounded-md border border-red-200 bg-red-50 p-3"><p className="text-xs text-red-700">Denied</p><p className="text-xl font-semibold text-red-800">{kpis.deniedCount}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Archived</p><p className="text-xl font-semibold">{kpis.archivedCount}</p></div>
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
                {SECTION_CONFIG.filter((s) => sectionHasContent(parsed[s.key])).map((s) => (
                  <Badge key={s.key} className={badgeColorMap[s.color]}>{s.label} ({Object.keys(parsed[s.key]).length})</Badge>
                ))}
              </div>

              {SECTION_CONFIG.map((sectionDef) => {
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
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
              <p className="text-xs text-muted-foreground mb-3">
                Bulk actions support archive, edit, and delete only. Interview report and view details are single-referral actions.
              </p>

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
                    
                    const extractedPOs = extractProbationOfficer(item);
                    const rawPOName = extractedPOs.length > 0 ? extractedPOs[0] : "";
                    const friendlyPoName = rawPOName.split(/[,\(0-9]/)[0].trim() || "Worker";
                    const poFirstName = friendlyPoName.split(" ")[0] || "Worker";

                    // Generate firstname.lastname@nejudicial.gov from PO name
                    // Handles "Last, First ..." and "First Last" formats
                    const inferredPoEmail = (() => {
                      const clean = rawPOName.trim();
                      if (!clean) return "";
                      if (clean.includes(",")) {
                        const [last, rest] = clean.split(",");
                        const first = (rest || "").trim().split(/[\s\(]/)[0];
                        if (first && last.trim()) {
                          return `${first.toLowerCase()}.${last.trim().toLowerCase()}@nejudicial.gov`;
                        }
                      } else {
                        const parts = clean.split(/\s+/);
                        if (parts.length >= 2) {
                          return `${parts[0].toLowerCase()}.${parts[parts.length - 1].toLowerCase()}@nejudicial.gov`;
                        }
                      }
                      return "";
                    })();
                    const mailtoTo = inferredPoEmail
                      ? encodeURIComponent(inferredPoEmail)
                      : encodeURIComponent(friendlyPoName);
                    
                    const subjectCheck = encodeURIComponent(`Referral Follow-Up: ${item.referralName || 'the youth'}`);
                    const bodyCheck = encodeURIComponent(`Hi ${poFirstName},\n\nWe apologize if you have already heard regarding an answer for this referral. If you have not yet heard, please know that as we have improved our referral process we are working to get everything perfectly documented and to ensure timely services for ${item.referralName || 'the youth'}.\n\nIf you have any questions or need to provide an update, please do not hesitate to reply to this email.\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`);
                    const priorityHeaders = `&importance=high&X-Priority=1`;
                    const hrefCheck = `mailto:${mailtoTo}?subject=${subjectCheck}${priorityHeaders}&body=${bodyCheck}`;

                    const subjectDeny = encodeURIComponent(`Referral Update for ${item.referralName || "the youth"}`);
                    const bodyDeny = encodeURIComponent(`Hi ${poFirstName},\n\nThanks for the referral for ${item.referralName || "the youth"}. We’re not able to accept at this time due to [reason].\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`);
                    const hrefDeny = `mailto:${mailtoTo}?subject=${subjectDeny}&body=${bodyDeny}`;

                    const subjectAccept = encodeURIComponent(`Placement Accepted for ${item.referralName || "the youth"}`);
                    const bodyAccept = encodeURIComponent(`Hi ${poFirstName},\n\nWe can accept ${item.referralName || "the youth"}. What intake date/time are you aiming for, and who is transporting?\n\nThank you,\nHeartland Admissions\nadmissions@heartlandboyshomenebraska.org`);
                    const hrefAccept = `mailto:${mailtoTo}?subject=${subjectAccept}&body=${bodyAccept}`;

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
                        <button
                          onClick={() => sendAndLogEmail(item, "accept", inferredPoEmail, poFirstName)}
                          disabled={sendingEmailId === rowKey + "accept"}
                          className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2 py-1 rounded border border-green-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {sendingEmailId === rowKey + "accept" ? (
                            <><Loader2 className="h-3 w-3 animate-spin" />Sending...</>
                          ) : "Accept"}
                        </button>
                        <button
                          onClick={() => sendAndLogEmail(item, "deny", inferredPoEmail, poFirstName)}
                          disabled={sendingEmailId === rowKey + "deny"}
                          className="text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded border border-red-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {sendingEmailId === rowKey + "deny" ? (
                            <><Loader2 className="h-3 w-3 animate-spin" />Sending...</>
                          ) : "Deny"}
                        </button>
                        {item.interviewScheduledDate && (
                          <button
                            onClick={() => sendAndLogEmail(item, "interview", inferredPoEmail, poFirstName, {
                              interview_date: format(new Date(item.interviewScheduledDate + "T00:00:00"), "MMMM d, yyyy"),
                              interview_time: item.interviewTime
                                ? new Date(`2000-01-01T${item.interviewTime}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
                                : "TBD",
                              interview_place: item.interviewPlace || "TBD",
                            })}
                            disabled={sendingEmailId === rowKey + "interview"}
                            className="text-xs bg-purple-50 text-purple-700 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            {sendingEmailId === rowKey + "interview" ? (
                              <><Loader2 className="h-3 w-3 animate-spin" />Sending...</>
                            ) : "Interview"}
                          </button>
                        )}
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
                              {SECTION_CONFIG.map((sectionDef) => {
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
