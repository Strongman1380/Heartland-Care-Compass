import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Download, Edit2, FileText, Loader2, Printer, Save, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes, useYouth } from "@/hooks/useSupabase";
import { caseNotesService, type CaseNotes as CaseNote, type Youth } from "@/integrations/firebase/services";
import { exportElementToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";

interface EnhancedCaseNotesProps {
  youthId: string;
  youth: any;
  onYouthChange?: (youthId: string) => void;
  onBackToSelection?: () => void;
}

type CreateMode = "session" | "combined";
type ParsedNoteType = "session" | "general" | "shift" | "school" | "legacy";

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

const splitCombinedEntries = (raw: string): string[] => {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (createMode === "session") {
        await handleSaveSession();
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
    const parts = raw.split(/[\/\-]/);
    if (parts.length !== 3) return null;
    let [month, day, year] = parts.map(Number);
    if (!month || !day || isNaN(year)) return null;
    // Expand 2-digit year: 00-49 → 2000s, 50-99 → 1900s
    if (year < 100) year += year < 50 ? 2000 : 1900;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  };

  // Try to parse any date string into yyyy-MM-dd
  const parseDateToISO = (raw: string): string => {
    // Try short date first (M-D-YY, M/D/YY, etc.)
    const short = parseShortDate(raw);
    if (short) return format(short, "yyyy-MM-dd");
    // Fall back to native Date parsing
    try {
      const d = new Date(raw);
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

    const normalized = text.replace(/\r\n/g, "\n").trim();

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
    const dateLineRegex = /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{2,4}|\d{4}-\d{2}-\d{2})\s*[:\-–]?\s*/i;

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
                Session note is simple skill-building documentation. Combined notes auto-classify and split into the log after Save.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={createMode === "session" ? "default" : "outline"}
                  onClick={() => setCreateMode("session")}
                  className={`flex-1 ${createMode === "session" ? "bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  Session Note
                </Button>
                <Button
                  type="button"
                  variant={createMode === "combined" ? "default" : "outline"}
                  onClick={() => setCreateMode("combined")}
                  className={`flex-1 ${createMode === "combined" ? "bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`}
                >
                  General / Shift Notes (AI)
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={createMode === "session" ? sessionFormData.date : combinedFormData.date}
                      onChange={createMode === "session" ? handleSessionChange : handleCombinedChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff">Staff Name</Label>
                    <Input
                      id="staff"
                      name="staff"
                      value={createMode === "session" ? sessionFormData.staff : combinedFormData.staff}
                      onChange={createMode === "session" ? handleSessionChange : handleCombinedChange}
                      placeholder="Staff name"
                      required
                    />
                  </div>
                </div>

                {createMode === "session" ? (
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
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="content">General/Shift Notes Input</Label>
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

                <Button type="submit" disabled={isSubmitting} className="w-full bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
                  {isSubmitting ? "Saving..." : createMode === "session" ? "Save Session Note" : "Save and Classify Notes"}
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
                    setBulkText(e.target.value);
                    setBulkParsedNotes([]);
                  }}
                  placeholder={`Example:\n\n1/15/2026: Youth participated in group therapy session. Showed good engagement with peers and was able to identify two coping strategies.\n\n1/16/2026: Youth had a difficult morning but recovered well after one-on-one with staff. Completed all chores and attended school without incident.\n\n1/17/2026: Family visit went well. Youth was calm and engaged with mother for the full hour.`}
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
                  onClick={handleBulkImport}
                  disabled={bulkParsedNotes.length === 0 || isBulkImporting || !bulkStaff.trim()}
                  className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"
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
