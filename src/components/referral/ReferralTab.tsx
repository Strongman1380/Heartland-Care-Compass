import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Eye,
  Home,
  Loader2,
  Pill,
  RotateCcw,
  Save,
  Scale,
  Shield,
  User,
} from "lucide-react";
import { format, isValid } from "date-fns";
import { toast } from "sonner";
import { referralNotesService, type ReferralNoteRow } from "@/integrations/firebase/referralNotesService";

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
  parsedData: ParsedReferral | null;
  rawText: string;
}

interface ParsedEntry {
  raw: string;
  parsed: ParsedReferral;
  referralName: string;
  referralSource: string;
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
    keywords: ["court", "judge", "attorney", "probation", "caseworker", "offense", "charge", "legal"],
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

const parseReferralText = (raw: string): ParsedReferral => {
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
    id: row.id,
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
    parsedData: referralData as ParsedReferral | null,
    rawText: row.raw_text || "",
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
  const [status, setStatus] = useState("new");
  const [priority, setPriority] = useState("routine");

  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const [historyFilter, setHistoryFilter] = useState("all");
  const [archiveView, setArchiveView] = useState("active");
  const [historySearch, setHistorySearch] = useState("");
  const [history, setHistory] = useState<ReferralHistoryItem[]>([]);

  const [visibleCount, setVisibleCount] = useState(15);

  const [expandedReferralId, setExpandedReferralId] = useState<string | null>(null);

  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(null);
  const [interviewReport, setInterviewReport] = useState("");
  const [directorSummary, setDirectorSummary] = useState("");
  const [editStatus, setEditStatus] = useState("reviewed");
  const [savingInterview, setSavingInterview] = useState(false);

  const parseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      const entries = blocks.map((rawBlock) => {
        const parsedBlock = parseReferralText(rawBlock);
        return {
          raw: rawBlock,
          parsed: parsedBlock,
          referralName: inferReferralName(parsedBlock),
          referralSource: inferReferralSource(parsedBlock),
        };
      });

      if (entries.length > 1) {
        setParsed(null);
        setParsedEntries(entries);
      } else {
        const single = entries[0];
        setParsedEntries([]);
        setParsed(single.parsed);
        if (single.referralName && !referralName.trim()) setReferralName(single.referralName);
        if (single.referralSource && !referralSource.trim()) setReferralSource(single.referralSource);
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
        setReferralSource("");
        setReferralName("");
        setStaffName("");
        setStatus("new");
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
      setReferralSource("");
      setReferralName("");
      setStaffName("");
      setStatus("new");
      setPriority("routine");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save referral note";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const openInterviewEditor = (item: ReferralHistoryItem) => {
    setEditingInterviewId(item.id);
    setInterviewReport(item.interviewReport || "");
    setDirectorSummary(item.directorSummary || "");
    setEditStatus(item.status || "reviewed");
  };

  const saveInterviewUpdate = async () => {
    if (!editingInterviewId) return;
    try {
      setSavingInterview(true);
      await referralNotesService.update(editingInterviewId, {
        interview_report: interviewReport.trim() || null,
        director_summary: directorSummary.trim() || null,
        status: editStatus,
      });
      toast.success("Interview update saved");
      await loadReferralHistory();
      setEditingInterviewId(null);
      setInterviewReport("");
      setDirectorSummary("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save interview update";
      toast.error(msg);
    } finally {
      setSavingInterview(false);
    }
  };

  const setArchived = async (id: string, archived: boolean) => {
    try {
      await referralNotesService.update(id, {
        archived,
        archived_at: archived ? new Date().toISOString() : null,
      });
      toast.success(archived ? "Referral archived" : "Referral restored");
      await loadReferralHistory();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update archive status";
      toast.error(msg);
    }
  };

  const totalFields = parsed
    ? Object.values(parsed).reduce((sum, section) => sum + Object.keys(section).length, 0)
    : 0;

  const filteredHistory = history.filter((item) => {
    if (archiveView === "active" && item.archived) return false;
    if (archiveView === "archived" && !item.archived) return false;
    if (historyFilter !== "all" && item.status !== historyFilter) return false;
    if (!historySearch.trim()) return true;
    const haystack = `${item.referralName} ${item.summary} ${item.staff} ${item.priority} ${item.referralSource}`.toLowerCase();
    return haystack.includes(historySearch.toLowerCase().trim());
  });

  const kpis = useMemo(() => {
    const active = history.filter((h) => !h.archived);
    const total = active.length;
    const archivedCount = history.filter((h) => h.archived).length;
    const newCount = active.filter((h) => h.status === "new").length;
    const highUrgent = active.filter((h) => h.priority === "high" || h.priority === "urgent").length;
    const interviewed = active.filter((h) => h.interviewReport.trim().length > 0).length;
    const directorReady = active.filter((h) => h.directorSummary.trim().length > 0).length;
    return { total, archivedCount, newCount, highUrgent, interviewed, directorReady };
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Total Referrals</p><p className="text-xl font-semibold">{kpis.total}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">New</p><p className="text-xl font-semibold">{kpis.newCount}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">High/Urgent</p><p className="text-xl font-semibold">{kpis.highUrgent}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Interview Completed</p><p className="text-xl font-semibold">{kpis.interviewed}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Director Summary Ready</p><p className="text-xl font-semibold">{kpis.directorReady}</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Archived</p><p className="text-xl font-semibold">{kpis.archivedCount}</p></div>
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
                  <Input id="referral-source" value={referralSource} onChange={(e) => setReferralSource(e.target.value)} placeholder="Agency / County / Court" />
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
                {(rawText || parsed) && (
                  <Button variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1" />Reset</Button>
                )}
              </div>
            </CardContent>
          </Card>

          {parsed && (
            <Card>
              <CardHeader><CardTitle className="text-base">Save Referral Note</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="referral-date">Date</Label>
                    <Input id="referral-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="referral-staff">Staff Name</Label>
                    <Input id="referral-staff" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Your name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="actioned">Actioned</SelectItem>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="bulk-referral-date">Date</Label>
                    <Input id="bulk-referral-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="bulk-referral-staff">Staff Name</Label>
                    <Input id="bulk-referral-staff" value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Your name" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="reviewed">Reviewed</SelectItem>
                        <SelectItem value="actioned">Actioned</SelectItem>
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
                <CardDescription>{parsedEntries.length} referral entries detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {parsedEntries.map((entry, idx) => {
                    const fieldCount = Object.values(entry.parsed).reduce((sum, section) => sum + Object.keys(section).length, 0);
                    return (
                      <div key={idx} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">
                            {entry.referralName || `Referral ${idx + 1}`}
                          </p>
                          <Badge variant="outline">{fieldCount} fields</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Source: {entry.referralSource || referralSource || "Not detected"}
                        </p>
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
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="actioned">Actioned</SelectItem>
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
                <Input value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search referral, source, staff" />
              </div>

              {isLoadingHistory ? (
                <p className="text-sm text-muted-foreground">Loading referral history...</p>
              ) : filteredHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No referral notes saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.slice(0, visibleCount).map((item) => {
                    const createdDate = new Date(item.createdAt);
                    const formattedDate = isValid(createdDate) ? format(createdDate, "MMM d, yyyy") : "-";
                    const isExpanded = expandedReferralId === item.id;
                    return (
                    <div key={item.id} className="rounded-md border p-3">
                      <div className="flex items-center justify-between mb-1 gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formattedDate}</span>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline">{item.fieldCount} fields</Badge>
                          <Badge variant="secondary">{item.status}</Badge>
                          <Badge variant="secondary">{item.priority}</Badge>
                          {item.archived && <Badge variant="outline">archived</Badge>}
                        </div>
                      </div>
                      <p className="text-sm font-medium text-foreground">{item.referralName}</p>
                      {item.referralSource && <p className="text-xs text-muted-foreground">Source: {item.referralSource}</p>}
                      <p className="text-sm text-foreground line-clamp-2 mt-1">{item.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">Staff: {item.staff || "Unknown"} | Sections: {item.sectionCount}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedReferralId(isExpanded ? null : item.id)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Details
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openInterviewEditor(item)}>Add/Edit Interview Report</Button>
                        {!item.archived && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setArchived(item.id, true)}
                            disabled={item.interviewReport.trim().length > 0}
                          >
                            Archive
                          </Button>
                        )}
                        {item.archived && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setArchived(item.id, false)}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                      {!item.archived && item.interviewReport.trim().length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Interviewed referrals stay active. Clear interview report first if you need to archive.
                        </p>
                      )}

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

              {editingInterviewId && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Interview Report and Director Brief</CardTitle>
                    <CardDescription>Use this after the referral interview to prepare leadership-ready notes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="actioned">Actioned</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button onClick={saveInterviewUpdate} disabled={savingInterview} className="w-full">
                          {savingInterview ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Interview Update</>}
                        </Button>
                        <Button variant="outline" onClick={() => setEditingInterviewId(null)}>Cancel</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
