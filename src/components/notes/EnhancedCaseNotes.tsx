import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, ChevronDown, ChevronRight, Download, Edit2, FileText, Loader2, Mic, MicOff, Printer, Save, Search, Trash2, Upload, Users, X } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes, useYouth } from "@/hooks/useSupabase";
import { caseNotesService, type CaseNotes as CaseNote, type Youth } from "@/integrations/firebase/services";
import { exportElementToPDF } from "@/utils/export";
import { buildApiUrl } from "@/utils/apiUrl";
import { buildReportFilename } from "@/utils/reportFilenames";

interface EnhancedCaseNotesProps {
  youthId: string;
  youth: any;
  onYouthChange?: (youthId: string) => void;
  onBackToSelection?: () => void;
}

type CreateMode = "session" | "combined" | "team-meeting";
type ParsedNoteType = "session" | "general" | "shift" | "school" | "team-meeting" | "legacy";

type SessionFormData = {
  date: string;
  staff: string;
  content: string;
};

type CombinedFormData = {
  date: string;
  staff: string;
  content: string;
};

type TeamMeetingFormData = {
  date: string;
  staff: string;
  attendees: string;
  objectives: string;
  discussion: string;
  actionItems: string;
};

type CombinedClassification = {
  noteType: "general" | "shift";
  label: string;
  tags: string[];
  confidence: number;
};

type ParsedNote = {
  noteType: ParsedNoteType;
  text: string;
  label?: string;
  tags?: string[];
  confidence?: number;
};

const SHIFT_KEYWORDS = [
  "shift", "morning shift", "day shift", "evening shift", "night shift",
  "overnight", "handoff", "on duty", "staffing"
];

const INCIDENT_KEYWORDS = [
  "incident", "escalation", "crisis", "fight", "threat", "restraint", "safety"
];

const SKILL_KEYWORDS = [
  "skill", "skill building", "coping", "intervention", "practice", "role play",
  "processing", "therapy", "session"
];

const FAMILY_KEYWORDS = [
  "family", "guardian", "parent", "visit", "phone call", "home"
];

const ACADEMIC_KEYWORDS = [
  "school", "class", "academic", "teacher", "assignment", "grade"
];

const safeFormatDate = (dateString?: string | null, displayFormat = "MMM dd, yyyy"): string => {
  if (!dateString) return "No date";
  try {
    return format(parseISO(`${dateString}T00:00:00`), displayFormat);
  } catch {
    return dateString;
  }
};

const truncateForSummary = (text: string, max = 100): string =>
  text.length > max ? `${text.slice(0, max)}...` : text;

/**
 * Insert newlines before inline date markers so they act as entry boundaries.
 * Uses [^\S\n]+ (non-newline whitespace) so existing blank-line separators are preserved.
 */
const preInsertDateNewlines = (text: string): string =>
  text
    // YYYY-MM-DD: appearing mid-line (not preceded by a newline)
    .replace(/([^\n])[^\S\n]*(\d{4}-\d{2}-\d{2}[^\S\n]*[:\-–])/g, "$1\n$2")
    // M/D/YYYY: or M-D-YYYY: appearing mid-line
    .replace(/([^\n])[^\S\n]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}[^\S\n]*[:\-–])/g, "$1\n$2")
    // Month-name formats like "January 15, 2026 -" appearing mid-line
    .replace(
      /([^\n])[^\S\n]*((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^\S\n]+\d{1,2},?[^\S\n]+\d{2,4}[^\S\n]*[:\-–])/gi,
      "$1\n$2"
    );

const splitCombinedEntries = (raw: string): string[] => {
  const normalized = preInsertDateNewlines(raw.replace(/\r\n/g, "\n").trim());
  if (!normalized) return [];

  // If text has date markers, split on them directly
  const byDateMarker = normalized
    .split(/(?=^\d{4}-\d{2}-\d{2}\s*[:\-–]|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s*[:\-–])/m)
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (byDateMarker.length > 1) return byDateMarker;

  const byParagraph = normalized
    .split(/\n\s*\n/g)
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (byParagraph.length > 1) return byParagraph;

  const byBullets = normalized
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);

  return byBullets.length > 1 ? byBullets : [normalized];
};

const createRequestTimeout = (timeoutMs = 45000) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    controller,
    cleanup: () => window.clearTimeout(timeoutId),
  };
};

const keywordHits = (text: string, keywords: string[]): number =>
  keywords.reduce((hits, keyword) => (text.includes(keyword) ? hits + 1 : hits), 0);

const classifyCombinedEntry = (entry: string): CombinedClassification => {
  const text = entry.toLowerCase();
  const shiftHits = keywordHits(text, SHIFT_KEYWORDS);
  const incidentHits = keywordHits(text, INCIDENT_KEYWORDS);
  const skillHits = keywordHits(text, SKILL_KEYWORDS);
  const familyHits = keywordHits(text, FAMILY_KEYWORDS);
  const academicHits = keywordHits(text, ACADEMIC_KEYWORDS);

  const isShift = shiftHits > 0 || text.includes("during the shift");
  const noteType: "general" | "shift" = isShift ? "shift" : "general";

  let label = "General Log";
  if (incidentHits > 0) label = "Incident Follow-Up";
  else if (skillHits > 0) label = "Skill Building";
  else if (familyHits > 0) label = "Family Contact";
  else if (academicHits > 0) label = "Academic Update";
  else if (isShift) label = "Shift Summary";

  const tags = [
    incidentHits > 0 ? "incident" : null,
    skillHits > 0 ? "skill-building" : null,
    familyHits > 0 ? "family" : null,
    academicHits > 0 ? "academic" : null,
    isShift ? "shift" : "general",
  ].filter(Boolean) as string[];

  const confidence = Math.min(
    0.98,
    0.55 + (shiftHits * 0.08) + (incidentHits * 0.1) + (skillHits * 0.08) + (familyHits * 0.06) + (academicHits * 0.06)
  );

  return {
    noteType,
    label,
    tags: tags.length ? tags : [isShift ? "shift" : "general"],
    confidence: Number(confidence.toFixed(2)),
  };
};

const parseNote = (note: CaseNote): ParsedNote => {
  if (!note.note) {
    return { noteType: "legacy", text: note.summary || "" };
  }

  try {
    const parsed = JSON.parse(note.note);
    const noteType = parsed?.noteType || "legacy";

    if (noteType === "session") {
      const text =
        parsed?.sections?.content ||
        parsed?.sections?.summary ||
        parsed?.summary ||
        note.summary ||
        "";
      return { noteType: "session", text };
    }

    if (noteType === "general" || noteType === "shift") {
      const text = parsed?.summary || note.summary || note.note;
      const ai = parsed?.aiClassification || {};
      return {
        noteType,
        text,
        label: ai.label,
        tags: Array.isArray(ai.tags) ? ai.tags : [],
        confidence: typeof ai.confidence === "number" ? ai.confidence : undefined,
      };
    }

    if (noteType === "school") {
      const sections = parsed?.sections || {};
      const combined = [sections.overview, sections.behavior, sections.academics, sections.interventions, sections.followUp]
        .filter((section: any) => typeof section === "string" && section.trim().length > 0)
        .join("\n\n");
      return { noteType: "school", text: combined || note.summary || "" };
    }

    if (noteType === "team-meeting") {
      const sections = parsed?.sections || {};
      const combined = [
        sections.attendees ? `Attendees: ${sections.attendees}` : "",
        sections.objectives ? `Objectives: ${sections.objectives}` : "",
        sections.discussion ? `Discussion: ${sections.discussion}` : "",
        sections.actionItems ? `Action Items: ${sections.actionItems}` : "",
      ].filter(Boolean).join("\n\n");
      return { noteType: "team-meeting", text: combined || note.summary || "" };
    }

    return { noteType: "legacy", text: parsed?.summary || note.summary || note.note };
  } catch {
    return { noteType: "legacy", text: note.note || note.summary || "" };
  }
};

const getBadgeForType = (parsed: ParsedNote) => {
  if (parsed.noteType === "session") return <Badge>Session</Badge>;
  if (parsed.noteType === "shift") return <Badge variant="secondary">Shift</Badge>;
  if (parsed.noteType === "general") return <Badge variant="outline">General</Badge>;
  if (parsed.noteType === "school") return <Badge variant="secondary">School</Badge>;
  if (parsed.noteType === "team-meeting") return <Badge className="bg-blue-700 text-white hover:bg-blue-800">Team Meeting</Badge>;
  return <Badge variant="outline">Legacy</Badge>;
};

export const EnhancedCaseNotes = ({ youthId, youth }: EnhancedCaseNotesProps) => {
  const [filteredNotes, setFilteredNotes] = useState<CaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "history" | "bulk-import">("create");
  const [createMode, setCreateMode] = useState<CreateMode>("session");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ date: string; staff: string; noteType: ParsedNoteType; text: string } | null>(null);

  // Bulk import state
  const [bulkText, setBulkText] = useState("");
  const [bulkStaff, setBulkStaff] = useState("");
  const [bulkParsedNotes, setBulkParsedNotes] = useState<{ date: string; content: string }[]>([]);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

  // Team meeting form state
  const [teamMeetingFormData, setTeamMeetingFormData] = useState<TeamMeetingFormData>({
    date: format(new Date(), "yyyy-MM-dd"),
    staff: "",
    attendees: "",
    objectives: "",
    discussion: "",
    actionItems: "",
  });

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  const [sessionFormData, setSessionFormData] = useState<SessionFormData>({
    date: format(new Date(), "yyyy-MM-dd"),
    staff: "",
    content: "",
  });

  const [combinedFormData, setCombinedFormData] = useState<CombinedFormData>({
    date: format(new Date(), "yyyy-MM-dd"),
    staff: "",
    content: "",
  });

  const {
    caseNotes: notes,
    loading: isLoading,
    createCaseNote,
    updateCaseNote,
    deleteCaseNote,
    loadCaseNotes,
  } = useCaseNotes(youthId);

  const { youths } = useYouth();

  useEffect(() => {
    const youthRecord = youths.find((entry) => entry.id === youthId);
    setSelectedYouth(youthRecord || null);
  }, [youthId, youths]);

  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    const filtered = notes
      .filter((note) => {
        if (!term) return true;
        const parsed = parseNote(note);
        return (
          (note.summary || "").toLowerCase().includes(term) ||
          parsed.text.toLowerCase().includes(term) ||
          (parsed.label || "").toLowerCase().includes(term) ||
          (note.staff || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const aTime = a.date ? new Date(a.date).getTime() : 0;
        const bTime = b.date ? new Date(b.date).getTime() : 0;
        return bTime - aTime;
      });
    setFilteredNotes(filtered);
  }, [notes, searchTerm]);

  const noteHistoryCount = useMemo(() => notes.length, [notes.length]);

  const handleSessionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSessionFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCombinedChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCombinedFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetForms = () => {
    setSessionFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      staff: "",
      content: "",
    });
    setCombinedFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      staff: "",
      content: "",
    });
    setTeamMeetingFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      staff: "",
      attendees: "",
      objectives: "",
      discussion: "",
      actionItems: "",
    });
  };

  const handleSaveSession = async () => {
    if (!sessionFormData.staff.trim()) {
      toast.error("Staff name is required.");
      return;
    }
    if (!sessionFormData.content.trim()) {
      toast.error("Please enter session note content.");
      return;
    }

    const payload = {
      youth_id: youthId,
      date: sessionFormData.date,
      staff: sessionFormData.staff.trim(),
      summary: truncateForSummary(sessionFormData.content.trim()),
      note: JSON.stringify({
        formatVersion: "v4",
        noteType: "session",
        sections: {
          content: sessionFormData.content.trim(),
        },
      }),
    };

    await createCaseNote(payload);
    toast.success("Session note saved.");
    resetForms();
    setActiveTab("history");
  };

  const handleSaveCombined = async () => {
    if (!combinedFormData.staff.trim()) {
      toast.error("Staff name is required.");
      return;
    }
    if (!combinedFormData.content.trim()) {
      toast.error("Please enter note content.");
      return;
    }

    const entries = splitCombinedEntries(combinedFormData.content);
    if (entries.length === 0) {
      toast.error("No valid note entries found.");
      return;
    }

    for (const entry of entries) {
      const classification = classifyCombinedEntry(entry);
      const payload = {
        youth_id: youthId,
        date: combinedFormData.date,
        staff: combinedFormData.staff.trim(),
        summary: truncateForSummary(`[${classification.label}] ${entry}`),
        note: JSON.stringify({
          formatVersion: "v4",
          noteType: classification.noteType,
          summary: entry,
          aiClassification: {
            label: classification.label,
            tags: classification.tags,
            confidence: classification.confidence,
            processedAt: new Date().toISOString(),
          },
        }),
      };

      // Use service directly here to avoid stacked success toasts for bulk save.
      await caseNotesService.create(payload);
    }

    await loadCaseNotes(youthId);
    toast.success(`${entries.length} note entr${entries.length === 1 ? "y" : "ies"} processed and logged.`);
    resetForms();
    setActiveTab("history");
  };

  const handleSaveTeamMeeting = async () => {
    if (!teamMeetingFormData.staff.trim()) { toast.error("Staff name is required."); return; }
    if (!teamMeetingFormData.discussion.trim()) { toast.error("Please enter at least a discussion summary."); return; }
    const youthName = `${selectedYouth?.firstName || youth?.firstName || ""} ${selectedYouth?.lastName || youth?.lastName || ""}`.trim();
    const summary = truncateForSummary(`[Team Meeting] ${teamMeetingFormData.discussion}`);
    const payload = {
      youth_id: youthId,
      date: teamMeetingFormData.date,
      staff: teamMeetingFormData.staff.trim(),
      summary,
      note: JSON.stringify({
        formatVersion: "v4",
        noteType: "team-meeting",
        youthName,
        sections: {
          attendees: teamMeetingFormData.attendees.trim(),
          objectives: teamMeetingFormData.objectives.trim(),
          discussion: teamMeetingFormData.discussion.trim(),
          actionItems: teamMeetingFormData.actionItems.trim(),
        },
      }),
    };
    await createCaseNote(payload);
    toast.success("Team meeting note saved.");
    resetForms();
    setActiveTab("history");
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This browser does not support microphone recording.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        try {
          const blob = new Blob(audioChunksRef.current, { type: mr.mimeType });
          await transcribeAndOrganize(blob, mr.mimeType);
        } catch (error) {
          console.error("Audio processing failed after recording stopped:", error);
          toast.error("Audio processing failed.");
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : "";
      if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
        toast.error("Microphone access was denied. Please allow microphone access in your browser settings.");
      } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
        toast.error("No microphone was found. Connect an audio input and try again.");
      } else if (errorName === "NotReadableError") {
        toast.error("The microphone is busy or unavailable. Close other audio apps and try again.");
      } else if (errorName === "SecurityError") {
        toast.error("Recording is blocked by browser security settings.");
      } else {
        toast.error("Unable to start recording. Check microphone permissions and try again.");
      }
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const transcribeAndOrganize = async (blob: Blob, mimeType: string) => {
    const youthName = `${selectedYouth?.firstName || youth?.firstName || ""} ${selectedYouth?.lastName || youth?.lastName || ""}`.trim();
    try {
      setIsTranscribing(true);
      const fd = new FormData();
      const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "m4a" : "webm";
      fd.append("audio", blob, `recording.${ext}`);
      const transcriptRequest = createRequestTimeout();
      const transcriptRes = await fetch(buildApiUrl("/api/ai/transcribe-audio"), {
        method: "POST",
        body: fd,
        signal: transcriptRequest.controller.signal,
      }).finally(() => {
        transcriptRequest.cleanup();
      });
      if (!transcriptRes.ok) throw new Error("Transcription failed");
      const { transcript } = await transcriptRes.json();
      setIsTranscribing(false);

      setIsOrganizing(true);
      const organizeRequest = createRequestTimeout();
      const organizeRes = await fetch(buildApiUrl("/api/ai/organize-meeting-notes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, youthName }),
        signal: organizeRequest.controller.signal,
      }).finally(() => {
        organizeRequest.cleanup();
      });
      if (!organizeRes.ok) throw new Error("Failed to organize notes");
      const { attendees, objectives, discussion, actionItems } = await organizeRes.json();
      setTeamMeetingFormData((prev) => ({
        ...prev,
        attendees: attendees || prev.attendees,
        objectives: objectives || prev.objectives,
        discussion: discussion || prev.discussion,
        actionItems: actionItems || prev.actionItems,
      }));
      toast.success("Recording transcribed and organized into form fields. Review and save.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        toast.error("Audio processing timed out. Please try again.");
      } else {
        toast.error(err instanceof Error ? err.message : "Audio processing failed.");
      }
    } finally {
      setIsTranscribing(false);
      setIsOrganizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (createMode === "session") {
        await handleSaveSession();
      } else if (createMode === "team-meeting") {
        await handleSaveTeamMeeting();
      } else {
        await handleSaveCombined();
      }
    } catch (error) {
      console.error("Failed saving case note(s):", error);
      toast.error("Failed to save note(s).");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Bulk import logic ---

  // Parse a short date like "2-11-26" or "2/11/26" into a proper Date
  const parseShortDate = (raw: string): Date | null => {
    // Handle M-D-YY, M/D/YY, M-D-YYYY, M/D/YYYY formats
    const parts = raw.split(/[/-]/);
    if (parts.length !== 3) return null;
    const [month, day, initialYear] = parts.map(Number);
    let year = initialYear;
    if (!month || !day || isNaN(year)) return null;
    // Expand 2-digit year: 00-49 → 2000s, 50-99 → 1900s
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  };

  // Try to parse any date string into yyyy-MM-dd
  const parseDateToISO = (raw: string): string => {
    const trimmed = raw.trim();
    // ISO format already — return as-is (must check BEFORE parseShortDate which misreads YYYY-MM-DD as M-D-Y)
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    // Short date: M/D/YY, M-D-YY, M/D/YYYY, M-D-YYYY
    const short = parseShortDate(trimmed);
    if (short) return format(short, "yyyy-MM-dd");
    // Fall back to native Date parsing (handles "March 2, 2026" etc.)
    try {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
    } catch { /* ignore */ }
    return format(new Date(), "yyyy-MM-dd");
  };

  // Parse structured JSON (daily progress notes format)
  const parseJSONNotes = (data: any): { date: string; content: string }[] => {
    const notes: { date: string; content: string }[] = [];

    // Find the daily_progress_notes array
    let entries: any[] = [];
    if (Array.isArray(data)) {
      entries = data;
    } else if (data.daily_progress_notes && Array.isArray(data.daily_progress_notes)) {
      entries = data.daily_progress_notes;
    }

    const residentName = data.resident_name || "";

    for (const entry of entries) {
      const dateStr = entry.date ? parseDateToISO(entry.date) : format(new Date(), "yyyy-MM-dd");
      const parts: string[] = [];

      if (residentName) parts.push(`Resident: ${residentName}`);

      // Shift notes
      if (entry.shift_notes) {
        const { overnight, day, evening } = entry.shift_notes;
        if (overnight) parts.push(`Overnight: ${overnight}`);
        if (day) parts.push(`Day: ${day}`);
        if (evening) parts.push(`Evening: ${evening}`);
      }

      // Scores
      if (entry.scores_and_skills) {
        parts.push(`Scores: ${entry.scores_and_skills}`);
      }

      // Negatives
      if (entry.negatives_for_the_day) {
        parts.push(`Negatives: ${entry.negatives_for_the_day}`);
      }

      // Notes of concern
      if (entry.notes_of_concern) {
        parts.push(`Notes of Concern: ${entry.notes_of_concern}`);
      }

      if (parts.length > 0) {
        notes.push({ date: dateStr, content: parts.join("\n") });
      }
    }

    return notes;
  };

  const parseBulkNotes = (text: string): { date: string; content: string }[] => {
    if (!text.trim()) return [];

    // Pre-process: insert newlines before inline date markers so they act as entry boundaries.
    // This handles AI-generated text where all dates appear on a single line.
    const normalized = preInsertDateNewlines(text.replace(/\r\n/g, "\n").trim());

    // Detect JSON input
    if (normalized.startsWith("{") || normalized.startsWith("[")) {
      try {
        const jsonData = JSON.parse(normalized);
        const jsonNotes = parseJSONNotes(jsonData);
        if (jsonNotes.length > 0) return jsonNotes;
      } catch {
        // Not valid JSON, fall through to text parsing
      }
    }

    // Date patterns to look for at the start of lines:
    // "1/15/2026", "01/15/2026", "1-15-2026", "January 15, 2026", "Jan 15, 2026", "2026-01-15"
    const dateLineRegex = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4}|\d{4}-\d{2}-\d{2})\s*[:\-–]?\s*/i;

    const lines = normalized.split("\n");
    const notes: { date: string; content: string }[] = [];
    let currentDate = "";
    let currentLines: string[] = [];

    for (const line of lines) {
      const dateMatch = line.match(dateLineRegex);
      if (dateMatch) {
        // Save previous note if exists
        if (currentDate && currentLines.length > 0) {
          notes.push({ date: currentDate, content: currentLines.join("\n").trim() });
        }
        currentDate = parseDateToISO(dateMatch[1]);
        // The rest of the line after the date is content
        const remainder = line.slice(dateMatch[0].length).trim();
        currentLines = remainder ? [remainder] : [];
      } else if (line.trim() === "" && currentLines.length > 0 && !currentDate) {
        currentLines.push(line);
      } else {
        currentLines.push(line);
      }
    }

    // Push the last accumulated note
    if (currentDate && currentLines.length > 0) {
      notes.push({ date: currentDate, content: currentLines.join("\n").trim() });
    }

    // If no date headers were found, fall back to splitting by blank lines
    if (notes.length === 0) {
      const paragraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
      const today = format(new Date(), "yyyy-MM-dd");
      return paragraphs.map(p => ({ date: today, content: p }));
    }

    return notes.filter(n => n.content.length > 0);
  };

  const handleBulkParse = () => {
    const parsed = parseBulkNotes(bulkText);
    setBulkParsedNotes(parsed);
    if (parsed.length === 0) {
      toast.error("No notes found. Make sure notes are separated by date headers or blank lines.");
    } else {
      toast.success(`Found ${parsed.length} note${parsed.length === 1 ? "" : "s"} to import.`);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkStaff.trim()) {
      toast.error("Staff name is required.");
      return;
    }
    if (bulkParsedNotes.length === 0) {
      toast.error("No notes to import. Parse your text first.");
      return;
    }

    setIsBulkImporting(true);
    try {
      let saved = 0;
      for (const entry of bulkParsedNotes) {
        const classification = classifyCombinedEntry(entry.content);
        const payload = {
          youth_id: youthId,
          date: entry.date,
          staff: bulkStaff.trim(),
          summary: truncateForSummary(`[${classification.label}] ${entry.content}`),
          note: JSON.stringify({
            formatVersion: "v4",
            noteType: classification.noteType,
            summary: entry.content,
            aiClassification: {
              label: classification.label,
              tags: classification.tags,
              confidence: classification.confidence,
              processedAt: new Date().toISOString(),
            },
          }),
        };
        await caseNotesService.create(payload);
        saved++;
      }

      await loadCaseNotes(youthId);
      toast.success(`Successfully imported ${saved} case note${saved === 1 ? "" : "s"}.`);
      setBulkText("");
      setBulkStaff("");
      setBulkParsedNotes([]);
      setActiveTab("history");
    } catch (error) {
      console.error("Bulk import error:", error);
      toast.error("Failed to import some notes. Please try again.");
    } finally {
      setIsBulkImporting(false);
    }
  };

  const startEditing = (note: CaseNote) => {
    const parsed = parseNote(note);
    setEditingNoteId(note.id);
    setEditForm({
      date: note.date || format(new Date(), "yyyy-MM-dd"),
      staff: note.staff || "",
      noteType: parsed.noteType,
      text: parsed.text,
    });
    setExpandedNote(note.id);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditForm(null);
  };

  const saveEdit = async (noteId: string) => {
    if (!editForm) return;
    if (!editForm.staff.trim()) {
      toast.error("Staff name is required.");
      return;
    }
    if (!editForm.text.trim()) {
      toast.error("Note text is required.");
      return;
    }

    let updatedPayload: any;
    if (editForm.noteType === "session") {
      updatedPayload = {
        date: editForm.date,
        staff: editForm.staff.trim(),
        summary: truncateForSummary(editForm.text.trim()),
        note: JSON.stringify({
          formatVersion: "v4",
          noteType: "session",
          sections: {
            content: editForm.text.trim(),
          },
        }),
      };
    } else {
      const resolvedType: "general" | "shift" = editForm.noteType === "shift" ? "shift" : "general";
      const classification = classifyCombinedEntry(editForm.text.trim());
      updatedPayload = {
        date: editForm.date,
        staff: editForm.staff.trim(),
        summary: truncateForSummary(`[${classification.label}] ${editForm.text.trim()}`),
        note: JSON.stringify({
          formatVersion: "v4",
          noteType: resolvedType,
          summary: editForm.text.trim(),
          aiClassification: {
            label: classification.label,
            tags: classification.tags,
            confidence: classification.confidence,
            processedAt: new Date().toISOString(),
          },
        }),
      };
    }

    await updateCaseNote(noteId, updatedPayload);
    toast.success("Note updated.");
    setEditingNoteId(null);
    setEditForm(null);
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    await deleteCaseNote(noteId);
    if (expandedNote === noteId) setExpandedNote(null);
    if (editingNoteId === noteId) cancelEditing();
  };

  const generateNotesHTML = () => {
    const youthName = selectedYouth ? `${selectedYouth.firstName} ${selectedYouth.lastName}` : `${youth?.firstName || ""} ${youth?.lastName || ""}`.trim();
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const logoSrc = `${baseUrl}${import.meta.env.BASE_URL}files/BoysHomeLogo.png`;

    const renderedNotes = filteredNotes.map((note) => {
      const parsed = parseNote(note);
      const label = parsed.label || (parsed.noteType === "session" ? "Session" : parsed.noteType === "shift" ? "Shift Summary" : "General Log");
      const tags = parsed.tags && parsed.tags.length > 0 ? parsed.tags.join(", ") : "";
      const confidence = typeof parsed.confidence === "number" ? ` (${Math.round(parsed.confidence * 100)}% confidence)` : "";

      return `
        <div class="note">
          <div class="note-head">
            <div>
              <span class="badge">${label}</span>
              <h3>${note.summary || "Case Note"}</h3>
            </div>
            <div class="meta">
              <div>${safeFormatDate(note.date, "MMMM d, yyyy")}</div>
              <div>${note.staff || "Staff"}</div>
            </div>
          </div>
          ${tags ? `<p class="tags">Tags: ${tags}${confidence}</p>` : ""}
          <p>${(parsed.text || "").replace(/\n/g, "<br>")}</p>
        </div>
      `;
    }).join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Case Notes</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #1f2937; }
          .header { text-align: center; border-bottom: 2px solid #991b1b; margin-bottom: 20px; padding-bottom: 10px; }
          .header img { height: 58px; }
          .note { border: 1px solid #d1d5db; border-radius: 8px; margin-bottom: 14px; padding: 12px; page-break-inside: avoid; }
          .note-head { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e5e7eb; margin-bottom: 10px; padding-bottom: 8px; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #991b1b; color: #fff; font-size: 11px; font-weight: 600; }
          h3 { margin: 8px 0 0 0; font-size: 16px; }
          .meta { font-size: 12px; color: #6b7280; text-align: right; }
          .tags { font-size: 12px; color: #374151; margin-bottom: 8px; }
          p { margin: 0; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoSrc}" alt="Heartland Boys Home Logo" />
          <h1>Case Notes Log</h1>
          <p>${youthName} - Generated ${format(new Date(), "MMMM d, yyyy")}</p>
        </div>
        ${renderedNotes}
      </body>
      </html>
    `;
  };

  const handleExportPDF = async () => {
    if (!printRef.current || filteredNotes.length === 0) return;
    try {
      setIsExporting(true);
      const html = generateNotesHTML();
      const temp = document.createElement("div");
      temp.innerHTML = html;
      temp.style.width = "816px";
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);

      await new Promise((resolve) => setTimeout(resolve, 100));
      const filename = `${buildReportFilename(
        {
          firstName: selectedYouth?.firstName || youth?.firstName || "Unknown First",
          lastName: selectedYouth?.lastName || youth?.lastName || "Unknown Last",
        },
        "Case Notes"
      )}.pdf`;
      await exportElementToPDF(temp, filename);
      document.body.removeChild(temp);
      toast.success("PDF exported.");
    } catch (error) {
      console.error("PDF export failed:", error);
      toast.error("Failed to export PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const html = generateNotesHTML();
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print notes.");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    };
  };

  const renderNoteContent = (note: CaseNote) => {
    if (editingNoteId === note.id && editForm) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editForm.date}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, date: e.target.value } : prev))}
              />
            </div>
            <div>
              <Label>Staff Name</Label>
              <Input
                value={editForm.staff}
                onChange={(e) => setEditForm((prev) => (prev ? { ...prev, staff: e.target.value } : prev))}
              />
            </div>
          </div>

          <div>
            <Label>Note Type</Label>
            <Select
              value={editForm.noteType === "session" ? "session" : editForm.noteType === "shift" ? "shift" : "general"}
              onValueChange={(value) =>
                setEditForm((prev) =>
                  prev ? { ...prev, noteType: value as ParsedNoteType } : prev
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="shift">Shift</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Content</Label>
            <Textarea
              rows={8}
              value={editForm.text}
              onChange={(e) => setEditForm((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={cancelEditing}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="button" onClick={() => saveEdit(note.id)}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      );
    }

    const parsed = parseNote(note);

    if (parsed.noteType === "team-meeting") {
      let sections: Record<string, string> = {};
      try { sections = JSON.parse(note.note || "{}")?.sections || {}; } catch { /* ignore */ }
      const hasAnySectionContent = Object.values(sections).some((value) => typeof value === "string" && value.trim().length > 0);
      return (
        <div className="space-y-3">
          {sections.attendees && (
            <div><p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Attendees</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{sections.attendees}</p></div>
          )}
          {sections.objectives && (
            <div><p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Meeting Objectives</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{sections.objectives}</p></div>
          )}
          {sections.discussion && (
            <div><p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Discussion Summary</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{sections.discussion}</p></div>
          )}
          {sections.actionItems && (
            <div><p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-0.5">Action Items / Next Steps</p><p className="text-sm text-gray-700 whitespace-pre-wrap">{sections.actionItems}</p></div>
          )}
          {!hasAnySectionContent && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.text || note.summary}</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {parsed.tags && parsed.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {parsed.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
            {typeof parsed.confidence === "number" && (
              <Badge variant="secondary">{Math.round(parsed.confidence * 100)}% confidence</Badge>
            )}
          </div>
        )}
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.text || note.note || note.summary}</p>
      </div>
    );
  };

  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const last = a.lastName.localeCompare(b.lastName);
      return last !== 0 ? last : a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  return (
    <div className="space-y-6" ref={printRef}>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Case Notes</h2>
          <p className="text-sm text-gray-600">
            {selectedYouth?.firstName || youth?.firstName} {selectedYouth?.lastName || youth?.lastName}
          </p>
        </div>
      </div>

      {/* Horizontal youth switcher */}
      {sortedYouths.length > 0 && onYouthChange && (
        <div className="rounded-2xl border border-red-100 bg-white/95 shadow-sm">
          <div className="border-b border-red-100 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
                  <ArrowRightLeft className="h-4 w-4" />
                  Quick Switch Youth
                </div>
                <p className="mt-0.5 text-xs text-slate-500">Switch directly to another youth without backing out.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-50">
                  Current: {(selectedYouth?.lastName || youth?.lastName)}, {(selectedYouth?.firstName || youth?.firstName)}
                </Badge>
                <Badge variant="outline" className="border-yellow-300 text-yellow-800 bg-yellow-50">
                  Level {selectedYouth?.level ?? youth?.level}
                </Badge>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 sm:px-5">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {sortedYouths.map((y) => {
                const isCurrent = y.id === youthId;
                return (
                  <button
                    key={y.id}
                    type="button"
                    onClick={() => !isCurrent && onYouthChange(y.id)}
                    className={`min-w-[200px] shrink-0 rounded-xl border p-3 text-left transition-all ${
                      isCurrent
                        ? "border-red-300 bg-red-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">
                          {y.lastName}, {y.firstName}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700">
                            Age {y.age || "N/A"}
                          </span>
                          <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700">
                            Level {y.level}
                          </span>
                          {(y.currentGrade || y.grade) && (
                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                              Grade {y.currentGrade || y.grade}
                            </span>
                          )}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Open
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "create" | "history" | "bulk-import")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Note</TabsTrigger>
          <TabsTrigger value="bulk-import">Bulk Import</TabsTrigger>
          <TabsTrigger value="history">Note History ({noteHistoryCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create Case Note</CardTitle>
              <CardDescription>
                Choose a note type. Team Meeting notes can be filled by recording the meeting audio.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Note type selector */}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => setCreateMode("session")}
                  className={`flex-1 border transition-colors ${
                    createMode === "session"
                      ? "bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131] shadow-md font-medium"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Session Note
                </Button>
                <Button
                  type="button"
                  onClick={() => setCreateMode("combined")}
                  className={`flex-1 border transition-colors ${
                    createMode === "combined"
                      ? "bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131] shadow-md font-medium"
                      : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  General / Shift (AI)
                </Button>
                <Button
                  type="button"
                  onClick={() => setCreateMode("team-meeting")}
                  className={`flex-1 border transition-colors ${
                    createMode === "team-meeting"
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-md font-medium"
                      : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  }`}
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  Team Meeting
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Date and Staff — always shown */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={
                        createMode === "session" ? sessionFormData.date
                        : createMode === "team-meeting" ? teamMeetingFormData.date
                        : combinedFormData.date
                      }
                      onChange={
                        createMode === "session" ? handleSessionChange
                        : createMode === "team-meeting"
                          ? (e) => setTeamMeetingFormData((p) => ({ ...p, date: e.target.value }))
                        : handleCombinedChange
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff">Staff Name</Label>
                    <Input
                      id="staff"
                      name="staff"
                      value={
                        createMode === "session" ? sessionFormData.staff
                        : createMode === "team-meeting" ? teamMeetingFormData.staff
                        : combinedFormData.staff
                      }
                      onChange={
                        createMode === "session" ? handleSessionChange
                        : createMode === "team-meeting"
                          ? (e) => setTeamMeetingFormData((p) => ({ ...p, staff: e.target.value }))
                        : handleCombinedChange
                      }
                      placeholder="Staff name"
                      required
                    />
                  </div>
                </div>

                {/* Session note content */}
                {createMode === "session" && (
                  <div>
                    <Label htmlFor="content">Session Note (Skill Building)</Label>
                    <Textarea
                      id="content"
                      name="content"
                      value={sessionFormData.content}
                      onChange={handleSessionChange}
                      placeholder="Enter skill-building session details..."
                      rows={8}
                      required
                    />
                  </div>
                )}

                {/* General / Shift content */}
                {createMode === "combined" && (
                  <div className="space-y-2">
                    <Label htmlFor="content">General / Shift Notes Input</Label>
                    <Textarea
                      id="content"
                      name="content"
                      value={combinedFormData.content}
                      onChange={handleCombinedChange}
                      placeholder="Paste one note or multiple notes. Use blank lines between entries for multiple notes."
                      rows={12}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      On save, notes are automatically split, labeled, and classified into General or Shift log entries.
                    </p>
                  </div>
                )}

                {/* Team Meeting fields */}
                {createMode === "team-meeting" && (
                  <div className="space-y-4">
                    {/* Audio recording strip */}
                    <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
                      {!isRecording ? (
                        <Button
                          type="button"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                          onClick={startRecording}
                          disabled={isTranscribing || isOrganizing}
                        >
                          <Mic className="h-4 w-4 mr-1.5" />
                          Record Meeting
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700 text-white font-medium animate-pulse"
                          onClick={stopRecording}
                        >
                          <MicOff className="h-4 w-4 mr-1.5" />
                          Stop Recording
                        </Button>
                      )}
                      {(isTranscribing || isOrganizing) && (
                        <span className="flex items-center gap-1.5 text-xs text-blue-700">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {isTranscribing ? "Transcribing audio…" : "Organizing into fields…"}
                        </span>
                      )}
                      {!isRecording && !isTranscribing && !isOrganizing && (
                        <span className="text-xs text-blue-600">
                          Record the meeting and AI will fill the fields below automatically.
                        </span>
                      )}
                    </div>

                    <div>
                      <Label>Attendees</Label>
                      <Input
                        value={teamMeetingFormData.attendees}
                        onChange={(e) => setTeamMeetingFormData((p) => ({ ...p, attendees: e.target.value }))}
                        placeholder="Names and roles of everyone present"
                      />
                    </div>
                    <div>
                      <Label>Meeting Objectives / Purpose</Label>
                      <Textarea
                        value={teamMeetingFormData.objectives}
                        onChange={(e) => setTeamMeetingFormData((p) => ({ ...p, objectives: e.target.value }))}
                        placeholder="Goals or purpose of this meeting"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Discussion Summary <span className="text-red-500">*</span></Label>
                      <Textarea
                        value={teamMeetingFormData.discussion}
                        onChange={(e) => setTeamMeetingFormData((p) => ({ ...p, discussion: e.target.value }))}
                        placeholder="Summary of topics discussed during the meeting"
                        rows={5}
                        required
                      />
                    </div>
                    <div>
                      <Label>Action Items / Next Steps</Label>
                      <Textarea
                        value={teamMeetingFormData.actionItems}
                        onChange={(e) => setTeamMeetingFormData((p) => ({ ...p, actionItems: e.target.value }))}
                        placeholder="Concrete next steps, who is responsible, and follow-up dates"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || isRecording || isTranscribing || isOrganizing}
                  className={`w-full text-white font-medium border-0 transition-colors ${
                    createMode === "team-meeting"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-[#823131] hover:bg-[#6b2828]"
                  }`}
                >
                  {isSubmitting ? "Saving…"
                    : createMode === "session" ? "Save Session Note"
                    : createMode === "team-meeting" ? "Save Team Meeting Note"
                    : "Save and Classify Notes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk-import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Import Case Notes</CardTitle>
              <CardDescription>
                Paste multiple case notes at once. Start each note with a date line (e.g. "1/15/2026:" or "January 15, 2026 -") and the text below it will become that note. Notes without date headers will be split by blank lines and saved with today's date.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="bulk-staff">Staff Name</Label>
                <Input
                  id="bulk-staff"
                  value={bulkStaff}
                  onChange={(e) => setBulkStaff(e.target.value)}
                  placeholder="Staff name for all imported notes"
                />
              </div>

              <div>
                <Label htmlFor="bulk-text">Paste Notes</Label>
                <Textarea
                  id="bulk-text"
                  value={bulkText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBulkText(val);
                    setBulkParsedNotes(val.trim() ? parseBulkNotes(val) : []);
                  }}
                  placeholder={`Paste notes here — auto-detected formats:\n\n2026-03-02: Note text for this date. 2026-03-01: Note text for previous date.\n\nMarch 2, 2026 -\nNote text here.\n\nMarch 1, 2026 -\nNote text here.\n\n1/15/2026: Each date becomes its own case note.`}
                  rows={14}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBulkParse}
                  disabled={!bulkText.trim() || isBulkImporting}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Parse Notes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBulkImport}
                  disabled={bulkParsedNotes.length === 0 || isBulkImporting || !bulkStaff.trim()}
                  className="bg-[#823131] hover:bg-[#6b2828] text-white border-0 font-medium"
                >
                  {isBulkImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {bulkParsedNotes.length > 0 ? `${bulkParsedNotes.length} Note${bulkParsedNotes.length === 1 ? "" : "s"}` : "Notes"}
                    </>
                  )}
                </Button>
                {(bulkText || bulkParsedNotes.length > 0) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setBulkText("");
                      setBulkStaff("");
                      setBulkParsedNotes([]);
                    }}
                    disabled={isBulkImporting}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              {bulkParsedNotes.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    Preview ({bulkParsedNotes.length} note{bulkParsedNotes.length === 1 ? "" : "s"} found)
                  </h4>
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {bulkParsedNotes.map((note, idx) => {
                      const classification = classifyCombinedEntry(note.content);
                      return (
                        <div key={idx} className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                              <Badge variant="outline">{classification.label}</Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {safeFormatDate(note.date, "MMM dd, yyyy")}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                            {note.content}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Note History</CardTitle>
                  <CardDescription>Chronological log for future reporting and audits</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={isExporting || filteredNotes.length === 0}>
                    {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    Export PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePrint} disabled={filteredNotes.length === 0}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  className="pl-10"
                  placeholder="Search notes, labels, tags, or staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading notes...</p>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">{searchTerm ? "No notes found for search." : "No notes yet."}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((note) => {
                    const parsed = parseNote(note);
                    return (
                      <Collapsible
                        key={note.id}
                        open={expandedNote === note.id}
                        onOpenChange={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3 flex-1">
                                  {expandedNote === note.id ? (
                                    <ChevronDown className="w-5 h-5 mt-0.5 text-gray-400" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 mt-0.5 text-gray-400" />
                                  )}
                                  <div className="text-left flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      {getBadgeForType(parsed)}
                                      {parsed.label && <Badge variant="outline">{parsed.label}</Badge>}
                                      <span className="text-sm font-medium">{safeFormatDate(note.date)}</span>
                                      <span className="text-xs text-gray-500">by {note.staff || "Staff"}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 line-clamp-2">{note.summary}</p>
                                  </div>
                                </div>
                                {editingNoteId !== note.id && (
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditing(note);
                                      }}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(note.id);
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="px-4 pb-4 pt-2 border-t">{renderNoteContent(note)}</div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedCaseNotes;
