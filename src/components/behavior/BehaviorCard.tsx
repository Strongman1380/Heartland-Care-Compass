import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingUp, TrendingDown, Users, History, Shield, Ban, X, CreditCard, RotateCcw, CalendarDays, Upload, Download, Copy, Check, FileSpreadsheet } from "lucide-react";
import { useBehaviorPoints, useYouth } from "@/hooks/useSupabase";
import { useBehaviorPointSummary } from "@/hooks/useBehaviorPointSummary";
import { caseNotesService } from "@/integrations/firebase/services";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CSV_TEMPLATES, getTemplateCsvString, downloadCsvTemplate } from "@/utils/csvUtils";

interface BehaviorCardProps {
  youthId: string;
  youth: any;
  onYouthUpdated?: (updated?: any) => void;
}

// Level system data
const levelsData = [
  { name: "Orientation", level: 0 },
  { name: "Level 1", level: 1 },
  { name: "Level 2", level: 2 },
  { name: "Level 3", level: 3 },
  { name: "Level 4", level: 4 },
  { name: "Level 5", level: 5 },
  { name: "Level 6", level: 6 },
  { name: "Level 7", level: 7 },
  { name: "Level 8", level: 8 },
  { name: "Level 9", level: 9 },
  { name: "Level 10", level: 10 },
];

type CsvRow = { date: string; points: number; notes: string; valid: boolean; error?: string };
type NotesCsvRow = { studentName: string; date: string; notes: string; valid: boolean; error?: string };
type CsvMode = "points" | "notes" | "narrative";

interface SubsystemHistoryEntry {
  status: 'on' | 'off';
  date: string;
  recordedBy: string;
}

export const BehaviorCard = ({ youthId, youth, onYouthUpdated }: BehaviorCardProps) => {
  const { updateYouth } = useYouth();
  const { behaviorPoints, loading: pointsLoading, saveBehaviorPoints } = useBehaviorPoints(youthId);
  const {
    todayTotal,
    weekTotal,
    monthTotal,
    lifetimeTotal,
    history,
  } = useBehaviorPointSummary(youthId);

  // Level change in-flight guard
  const [isLevelChanging, setIsLevelChanging] = useState(false);

  // Point management state
  const [correctedTotal, setCorrectedTotal] = useState("");
  const [cardPoints, setCardPoints] = useState("");
  const [isUpdatingPoints, setIsUpdatingPoints] = useState(false);

  // Restriction and subsystem state
  const [showRestrictionDialog, setShowRestrictionDialog] = useState(false);
  const [showSubsystemDialog, setShowSubsystemDialog] = useState(false);
  const [restrictionLevel, setRestrictionLevel] = useState<1 | 2 | null>(null);
  const [restrictionReason, setRestrictionReason] = useState("");
  const [subsystemReason, setSubsystemReason] = useState("");
  const [showSubsystemLog, setShowSubsystemLog] = useState(false);
  const [subsystemHistory] = useState<SubsystemHistoryEntry[]>([
    { status: 'off', date: new Date().toLocaleString(), recordedBy: 'System' }
  ]);

  // Past-date point entry
  const [pastDate, setPastDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [pastPoints, setPastPoints] = useState("");
  const [pastNotes, setPastNotes] = useState("");
  const [isSavingPast, setIsSavingPast] = useState(false);

  // CSV import
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<CsvRow[]>([]);
  const [notesCsvPreview, setNotesCsvPreview] = useState<NotesCsvRow[]>([]);
  const [csvMode, setCsvMode] = useState<CsvMode>("points");
  const [isImporting, setIsImporting] = useState(false);
  const csvFileRef = useRef<HTMLInputElement>(null);

  // Handle case where youth is null or undefined
  if (!youth) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-yellow-300">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-16 w-16 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">No Youth Selected</CardTitle>
            <CardDescription className="text-red-600 text-lg">
              Please select a youth from the system to manage level tracking.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Normalize null/undefined level to 0 (Orientation) for all calculations
  const currentLevelValue = youth.level ?? 0;

  // Get current level data
  const getCurrentLevel = () => {
    return levelsData.find(level => level.level === currentLevelValue) || levelsData[0];
  };

  const getNextLevel = () => {
    return levelsData.find(level => level.level === currentLevelValue + 1);
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const todayEntry = behaviorPoints.find((entry) => entry.date === todayIso) || null;

  const syncLifetimeTotal = async (nextTodayTotal: number) => {
    const nonTodayTotal = behaviorPoints.reduce((sum, entry) => {
      if (entry.date === todayIso) return sum;
      return sum + (entry.totalPoints || 0);
    }, 0);
    await updateYouth(youthId, { pointTotal: nonTodayTotal + nextTodayTotal });
  };

  const upsertTodayPoints = async (nextTodayTotal: number) => {
    await saveBehaviorPoints({
      youth_id: youthId,
      date: todayIso,
      morningPoints: todayEntry?.morningPoints ?? null,
      afternoonPoints: todayEntry?.afternoonPoints ?? null,
      eveningPoints: todayEntry?.eveningPoints ?? null,
      totalPoints: nextTodayTotal,
      comments: todayEntry?.comments || null,
      createdAt: todayEntry?.createdAt || new Date().toISOString(),
    });
    await syncLifetimeTotal(nextTodayTotal);
  };

  const handleLevelUp = async () => {
    if (!nextLevel || isLevelChanging) return;
    setIsLevelChanging(true);
    try {
      const updated = await updateYouth(youthId, {
        level: currentLevelValue + 1,
      });

      toast.success(`Congratulations! Advanced to ${nextLevel.name}!`);
      onYouthUpdated?.(updated);
    } catch (error) {
      console.error("Error updating level:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update level";
      toast.error(errorMessage);
    } finally {
      setIsLevelChanging(false);
    }
  };

  const handleLevelDemotion = async () => {
    if (currentLevelValue <= 0 || isLevelChanging) return;
    setIsLevelChanging(true);
    try {
      const updated = await updateYouth(youthId, {
        level: currentLevelValue - 1,
      });

      const previousLevel = levelsData.find(level => level.level === currentLevelValue - 1);
      toast.warning(`Demoted to ${previousLevel?.name || `Level ${currentLevelValue - 1}`}.`);
      onYouthUpdated?.(updated);
    } catch (error) {
      console.error("Error updating level:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update level";
      toast.error(errorMessage);
    } finally {
      setIsLevelChanging(false);
    }
  };

  // Point management
  const handleSetCorrectedTotal = async () => {
    const val = parseInt(correctedTotal, 10);
    if (isNaN(val) || val < 0) {
      toast.error("Enter a valid non-negative number");
      return;
    }
    try {
      setIsUpdatingPoints(true);
      await upsertTodayPoints(val);
      toast.success(`Today's points set to ${val.toLocaleString()}`);
      setCorrectedTotal("");
      onYouthUpdated?.();
    } catch (error) {
      toast.error("Failed to update point total");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  const handleAddCardPoints = async () => {
    const val = parseInt(cardPoints, 10);
    if (isNaN(val) || val <= 0) {
      toast.error("Enter a positive number of points");
      return;
    }
    try {
      setIsUpdatingPoints(true);
      const newTotal = todayTotal + val;
      await upsertTodayPoints(newTotal);
      toast.success(`Added ${val.toLocaleString()} points to today — new daily total: ${newTotal.toLocaleString()}`);
      setCardPoints("");
      onYouthUpdated?.();
    } catch (error) {
      toast.error("Failed to add card points");
    } finally {
      setIsUpdatingPoints(false);
    }
  };

  // Past-date and CSV helpers

  /** RFC 4180-compliant CSV line splitter — handles quoted fields with commas inside. */
  const parseCsvLine = (line: string): string[] => {
    const fields: string[] = [];
    let i = 0;
    while (i <= line.length) {
      if (i === line.length) { fields.push(""); break; }
      if (line[i] === '"') {
        i++;
        let field = "";
        while (i < line.length) {
          if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2; }
          else if (line[i] === '"') { i++; break; }
          else { field += line[i++]; }
        }
        fields.push(field.trim());
        if (line[i] === ',') i++;
      } else {
        const end = line.indexOf(',', i);
        if (end === -1) { fields.push(line.slice(i).trim()); break; }
        fields.push(line.slice(i, end).trim());
        i = end + 1;
      }
    }
    return fields;
  };

  /** Normalize a date string to YYYY-MM-DD, returning { date, error } */
  const normalizeDate = (raw: string): { date: string; error: string } => {
    const todayIso = new Date().toISOString().split("T")[0];
    let date = "";
    let error = "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      date = raw;
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
      const [m, d, y] = raw.split("/");
      date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    } else {
      return { date: "", error: `Invalid date "${raw}"` };
    }
    const [year, month, day] = date.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day ||
      parsed.toISOString().slice(0, 10) !== date
    ) {
      return { date: "", error: `Invalid calendar date "${raw}"` };
    }
    if (date > todayIso) {
      return { date: "", error: `Future date not allowed "${raw}"` };
    }
    return { date, error };
  };

  const parseCSV = (text: string): CsvRow[] => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) return [];
    const firstLineLower = lines[0].toLowerCase();
    const dataLines =
      firstLineLower.includes("date") || firstLineLower.includes("point")
        ? lines.slice(1)
        : lines;
    return dataLines.map((line) => {
      const [dateRaw = "", pointsRaw = "", notesRaw = ""] = parseCsvLine(line);
      const { date, error: dateError } = normalizeDate(dateRaw);
      const pts = parseInt(pointsRaw, 10);
      const ptsInvalid = isNaN(pts) || pts < 0;
      const valid = !dateError && !ptsInvalid;
      const error = dateError || (ptsInvalid ? `Invalid points "${pointsRaw}"` : "");
      return { date, points: isNaN(pts) ? 0 : pts, notes: notesRaw, valid, error };
    });
  };

  const parseNotesCsv = (text: string): NotesCsvRow[] => {
    const lines = text.trim().split("\n").filter((l) => l.trim());
    if (lines.length === 0) return [];
    // Skip header row
    const dataLines = lines[0].toLowerCase().includes("date") ? lines.slice(1) : lines;
    return dataLines.map((line) => {
      const parts = parseCsvLine(line);
      // Support both Student_Name,Date,Notes and Date,Notes (name may be absent if pre-selected)
      let studentName = "", dateRaw = "", notesRaw = "";
      if (parts.length >= 3) {
        [studentName, dateRaw, notesRaw] = parts;
      } else if (parts.length === 2) {
        [dateRaw, notesRaw] = parts;
      } else {
        return { studentName: "", date: "", notes: "", valid: false, error: "Too few columns" };
      }
      const { date, error: dateError } = normalizeDate(dateRaw);
      const valid = !dateError && notesRaw.trim().length > 0;
      const error = dateError || (notesRaw.trim().length === 0 ? "Notes column is empty" : "");
      return { studentName: studentName.trim(), date, notes: notesRaw.trim(), valid, error };
    });
  };

  /**
   * Parse a date-prefixed narrative block like:
   *   "2026-03-02: Chance earned daily averages of 2.5..."
   * Each entry starts with YYYY-MM-DD: and runs until the next date marker.
   */
  const parseNarrativeText = (text: string): NotesCsvRow[] => {
    // Pre-insert newlines before inline date markers so single-line AI output splits correctly
    const preprocessed = text
      .replace(/\r\n/g, "\n")
      .replace(/([^\n])\s+(\d{4}-\d{2}-\d{2}:)/g, "$1\n$2")
      .trim();
    // Split on every occurrence of a leading date marker
    const entries = preprocessed
      .split(/(?=\b\d{4}-\d{2}-\d{2}:)/)
      .map((s) => s.trim())
      .filter(Boolean);
    return entries.map((entry) => {
      const match = entry.match(/^(\d{4}-\d{2}-\d{2}):\s*([\s\S]*)/);
      if (!match) return { studentName: "", date: "", notes: "", valid: false, error: "Could not parse entry" };
      const dateRaw = match[1];
      const notes = match[2].trim();
      const { date, error: dateError } = normalizeDate(dateRaw);
      const valid = !dateError && notes.length > 0;
      const error = dateError || (notes.length === 0 ? "Empty note body" : "");
      return { studentName: "", date, notes, valid, error };
    });
  };

  /** Detect format from input and parse accordingly, updating state. */
  const parseCsvInput = (text: string) => {
    setCsvText(text);
    const firstLine = (text.trim().split("\n")[0] || "").trim();
    const firstLineLower = firstLine.toLowerCase();

    // Narrative: first token matches YYYY-MM-DD:
    if (/^\d{4}-\d{2}-\d{2}:/.test(firstLine)) {
      setCsvMode("narrative");
      setNotesCsvPreview(parseNarrativeText(text));
      setCsvPreview([]);
      return;
    }

    // Notes CSV: header contains student/name + note
    if ((firstLineLower.includes("student") || firstLineLower.includes("name")) && firstLineLower.includes("note")) {
      setCsvMode("notes");
      setNotesCsvPreview(parseNotesCsv(text));
      setCsvPreview([]);
      return;
    }

    // Default: points CSV
    setCsvMode("points");
    setCsvPreview(parseCSV(text));
    setNotesCsvPreview([]);
  };

  const recalcLifetimeFromPatch = async (patches: { date: string; points: number }[]) => {
    const patchMap = new Map(patches.map((p) => [p.date, p.points]));
    const base = new Map(behaviorPoints.map((e) => [e.date ?? "", e.totalPoints ?? 0]));
    patchMap.forEach((pts, dt) => base.set(dt, pts));
    const total = Array.from(base.values()).reduce((s, p) => s + p, 0);
    await updateYouth(youthId, { pointTotal: total });
  };

  const handleSavePastDate = async () => {
    const pts = parseInt(pastPoints, 10);
    if (!pastDate) { toast.error("Select a date"); return; }
    if (isNaN(pts) || pts < 0) { toast.error("Enter a valid non-negative number"); return; }
    setIsSavingPast(true);
    try {
      const existing = behaviorPoints.find((e) => e.date === pastDate);
      await saveBehaviorPoints({
        youth_id: youthId,
        date: pastDate,
        morningPoints: existing?.morningPoints ?? null,
        afternoonPoints: existing?.afternoonPoints ?? null,
        eveningPoints: existing?.eveningPoints ?? null,
        totalPoints: pts,
        comments: pastNotes || existing?.comments || null,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
      await recalcLifetimeFromPatch([{ date: pastDate, points: pts }]);
      toast.success(`Points saved for ${format(new Date(`${pastDate}T00:00:00`), "MMM d, yyyy")}`);
      onYouthUpdated?.();
      setPastPoints("");
      setPastNotes("");
    } catch {
      toast.error("Failed to save points");
    } finally {
      setIsSavingPast(false);
    }
  };

  const handleBulkImport = async () => {
    if (csvMode === "notes" || csvMode === "narrative") {
      const valid = notesCsvPreview.filter((r) => r.valid);
      if (valid.length === 0) { toast.error("No valid rows to import"); return; }
      setIsImporting(true);
      let saved = 0, failed = 0;
      const youthName = youth
        ? `${youth.firstName || ""} ${youth.lastName || ""}`.trim() || null
        : null;
      try {
        for (const row of valid) {
          try {
            await caseNotesService.create({
              youth_id: youthId,
              date: row.date,
              summary: row.notes.slice(0, 80),
              note: row.notes,
              // Notes CSV uses student name from column; narrative uses the selected youth's name
              staff: row.studentName || youthName || null,
              createdAt: new Date().toISOString(),
            });
            saved++;
          } catch {
            failed++;
          }
        }
        toast.success(`Imported ${saved} note${saved === 1 ? "" : "s"}${failed > 0 ? `, ${failed} failed` : ""}`);
        setCsvText("");
        setCsvPreview([]);
        setNotesCsvPreview([]);
        if (csvFileRef.current) csvFileRef.current.value = "";
      } finally {
        setIsImporting(false);
      }
      return;
    }

    // Points mode
    const valid = csvPreview.filter((r) => r.valid);
    if (valid.length === 0) { toast.error("No valid rows to import"); return; }
    setIsImporting(true);
    let saved = 0, failed = 0;
    try {
      const existingByDate = new Map(
        behaviorPoints.map((entry) => [
          entry.date ?? "",
          {
            morningPoints: entry.morningPoints ?? null,
            afternoonPoints: entry.afternoonPoints ?? null,
            eveningPoints: entry.eveningPoints ?? null,
            comments: entry.comments ?? null,
            createdAt: entry.createdAt || new Date().toISOString(),
          },
        ])
      );
      for (const row of valid) {
        try {
          const existing = existingByDate.get(row.date);
          await saveBehaviorPoints({
            youth_id: youthId,
            date: row.date,
            morningPoints: existing?.morningPoints ?? null,
            afternoonPoints: existing?.afternoonPoints ?? null,
            eveningPoints: existing?.eveningPoints ?? null,
            totalPoints: row.points,
            comments: row.notes || existing?.comments || null,
            createdAt: existing?.createdAt || new Date().toISOString(),
          });
          existingByDate.set(row.date, {
            morningPoints: existing?.morningPoints ?? null,
            afternoonPoints: existing?.afternoonPoints ?? null,
            eveningPoints: existing?.eveningPoints ?? null,
            comments: row.notes || existing?.comments || null,
            createdAt: existing?.createdAt || new Date().toISOString(),
          });
          saved++;
        } catch {
          failed++;
        }
      }
      await recalcLifetimeFromPatch(valid.map((r) => ({ date: r.date, points: r.points })));
      toast.success(`Imported ${saved} entr${saved === 1 ? "y" : "ies"}${failed > 0 ? `, ${failed} failed` : ""}`);
      onYouthUpdated?.();
      setCsvText("");
      setCsvPreview([]);
      if (csvFileRef.current) csvFileRef.current.value = "";
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      parseCsvInput(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  // Restriction management
  const handlePlaceOnRestriction = async () => {
    if (!restrictionLevel) {
      toast.error("Please select restriction level");
      return;
    }

    try {
      await updateYouth(youthId, {
        restrictionLevel: restrictionLevel,
        restrictionStartDate: new Date().toISOString(),
        restrictionReason: restrictionReason || "N/A"
      });

      toast.success(`Placed on Restriction Level ${restrictionLevel}.`);
      setShowRestrictionDialog(false);
      setRestrictionLevel(null);
      setRestrictionReason("");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error placing on restriction:", error);
      toast.error("Failed to place on restriction");
    }
  };

  const handleRemoveRestriction = async () => {
    try {
      await updateYouth(youthId, {
        restrictionLevel: null,
        restrictionStartDate: null,
        restrictionReason: null
      });

      toast.success("Restriction removed");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error removing restriction:", error);
      toast.error("Failed to remove restriction");
    }
  };

  // Subsystem management
  const handlePlaceOnSubsystem = async () => {
    try {
      await updateYouth(youthId, {
        subsystemActive: true,
        subsystemStartDate: new Date().toISOString(),
        subsystemReason: subsystemReason || "N/A"
      });

      toast.success(`Placed on Subsystem.`);
      setShowSubsystemDialog(false);
      setSubsystemReason("");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error placing on subsystem:", error);
      toast.error("Failed to place on subsystem");
    }
  };

  const handleRemoveSubsystem = async () => {
    try {
      await updateYouth(youthId, {
        subsystemActive: false,
        subsystemStartDate: null,
        subsystemReason: null
      });

      toast.success("Subsystem removed");
      onYouthUpdated?.();
    } catch (error) {
      console.error("Error removing subsystem:", error);
      toast.error("Failed to remove subsystem");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Level Tracking</h2>
        <p className="text-gray-600 mb-4">Manage level progression, restrictions, and subsystem status.</p>
      </div>

      {/* Level Information Card */}
      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle>Level Information</CardTitle>
          <CardDescription>Current level and progression</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Current Level</Label>
              <p className="text-2xl font-bold">{currentLevel.name}</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleLevelUp}
                disabled={!nextLevel || isLevelChanging}
                className="flex-1 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingUp size={18} className="mr-2" />
                {isLevelChanging ? "Saving..." : "Level Up"}
              </Button>
              <Button
                onClick={handleLevelDemotion}
                disabled={currentLevelValue <= 0 || isLevelChanging}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-6 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TrendingDown size={18} className="mr-2" />
                {isLevelChanging ? "Saving..." : "Demote"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point Management Card */}
      <Card>
        <CardHeader className="bg-green-50">
          <CardTitle>Point Management</CardTitle>
          <CardDescription>
            Today's total: <span className="font-bold text-green-800">{todayTotal.toLocaleString()} pts</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Add card points */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <CreditCard size={14} />
                Add Card Points
              </Label>
              <p className="text-xs text-gray-500">Add points to today's dated point record so the current-day cards and history stay accurate.</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 350"
                  value={cardPoints}
                  onChange={(e) => setCardPoints(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isUpdatingPoints) { e.preventDefault(); handleAddCardPoints(); } }}
                  className="flex-1"
                />
                <Button
                  onClick={handleAddCardPoints}
                  disabled={isUpdatingPoints || !cardPoints}
                  className="bg-green-700 hover:bg-green-600 text-white disabled:opacity-100 disabled:bg-green-200 disabled:text-green-900 disabled:border disabled:border-green-300"
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Set corrected total */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <RotateCcw size={14} />
                Set Today's Total
              </Label>
              <p className="text-xs text-gray-500">Overwrite today's dated point record with the exact corrected total.</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 2400"
                  value={correctedTotal}
                  onChange={(e) => setCorrectedTotal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !isUpdatingPoints) { e.preventDefault(); handleSetCorrectedTotal(); } }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSetCorrectedTotal}
                  disabled={isUpdatingPoints || !correctedTotal}
                  variant="outline"
                  className="border-gray-400 hover:border-red-700 hover:text-red-700 disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:border-gray-400"
                >
                  Set
                </Button>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Enter Points for a Specific Date */}
      <Card>
        <CardHeader className="bg-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays size={18} />
            Enter Points for a Specific Date
          </CardTitle>
          <CardDescription>Record or override points for any date, including past dates.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                max={todayIso}
                value={pastDate}
                onChange={(e) => setPastDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Total Points</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 2100"
                value={pastPoints}
                onChange={(e) => setPastPoints(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isSavingPast) { e.preventDefault(); handleSavePastDate(); } }}
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Optional note..."
                value={pastNotes}
                onChange={(e) => setPastNotes(e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={handleSavePastDate}
            disabled={isSavingPast || !pastDate || !pastPoints}
            className="mt-4 bg-indigo-700 hover:bg-indigo-600 text-white"
          >
            {isSavingPast ? "Saving..." : "Save Entry"}
          </Button>
        </CardContent>
      </Card>

      {/* Bulk CSV Import */}
      <Card>
        <CardHeader className="bg-sky-50">
          <CardTitle className="flex items-center gap-2">
            <Upload size={18} />
            Bulk CSV Import
          </CardTitle>
          <CardDescription>
            Auto-detects three formats. <strong>Points CSV:</strong>{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">date,points,notes</code>.{" "}
            <strong>Notes CSV:</strong>{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">Student_Name,Date,Notes</code>.{" "}
            <strong>Narrative:</strong> paste date-prefixed text —{" "}
            <code className="text-xs bg-gray-100 px-1 rounded">2026-03-02: note text... 2026-03-01: note text...</code>.
            Each entry becomes its own case note.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {/* Template Format Display */}
          <BehaviorPointsTemplate />

          <div className="flex items-center gap-3">
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              onClick={() => csvFileRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload size={14} />
              Choose CSV File
            </Button>
            <span className="text-xs text-gray-500">or paste below</span>
          </div>
          <Textarea
            rows={5}
            placeholder={"Points CSV:  date,points,notes\n2026-01-15,2100\n\nNotes CSV:  Student_Name,Date,Notes\nChance Thaller,2026-03-02,\"Note text here\"\n\nNarrative (paste directly):\n2026-03-02: Chance was noted for wandering at school.\n2026-03-01: Repeated profanity and property damage."}
            value={csvText}
            onChange={(e) => parseCsvInput(e.target.value)}
            className="font-mono text-sm"
          />
          {(csvMode === "notes" || csvMode === "narrative") && notesCsvPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-sky-700">
                {csvMode === "narrative" ? "Narrative format detected" : "Notes CSV format detected"} —{" "}
                {notesCsvPreview.filter((r) => r.valid).length} valid / {notesCsvPreview.length} total entries
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-sm">
                {notesCsvPreview.map((row, i) => (
                  <div key={i} className={`px-3 py-2 ${row.valid ? "bg-white" : "bg-red-50"}`}>
                    <div className="flex items-center gap-3 mb-0.5">
                      <span className={`text-xs font-mono font-bold ${row.valid ? "text-green-600" : "text-red-600"}`}>
                        {row.valid ? "✓" : "✗"}
                      </span>
                      <span className="font-mono text-xs text-gray-600">{row.date || "—"}</span>
                      {row.studentName && <span className="text-xs text-gray-500">{row.studentName}</span>}
                      {row.error && <span className="text-red-600 text-xs ml-auto">{row.error}</span>}
                    </div>
                    {row.notes && <p className="text-xs text-gray-700 pl-6 truncate" title={row.notes}>{row.notes}</p>}
                  </div>
                ))}
              </div>
              <Button
                onClick={handleBulkImport}
                disabled={isImporting || notesCsvPreview.filter((r) => r.valid).length === 0}
                className="bg-sky-700 hover:bg-sky-600 text-white"
              >
                {isImporting
                  ? "Importing..."
                  : `Import ${notesCsvPreview.filter((r) => r.valid).length} Note${notesCsvPreview.filter((r) => r.valid).length === 1 ? "" : "s"} as Case Notes`}
              </Button>
            </div>
          )}
          {csvMode === "points" && csvPreview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Points format — {csvPreview.filter((r) => r.valid).length} valid / {csvPreview.length} total rows
              </p>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y text-sm">
                {csvPreview.map((row, i) => (
                  <div key={i} className={`flex items-center justify-between px-3 py-2 ${row.valid ? "bg-white" : "bg-red-50"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold ${row.valid ? "text-green-600" : "text-red-600"}`}>
                        {row.valid ? "✓" : "✗"}
                      </span>
                      <span className="font-mono text-xs text-gray-600">{row.date || "—"}</span>
                      {row.valid && <span className="font-medium">{row.points.toLocaleString()} pts</span>}
                      {row.notes && <span className="text-gray-400 text-xs">{row.notes}</span>}
                    </div>
                    {row.error && <span className="text-red-600 text-xs">{row.error}</span>}
                  </div>
                ))}
              </div>
              <Button
                onClick={handleBulkImport}
                disabled={isImporting || csvPreview.filter((r) => r.valid).length === 0}
                className="bg-sky-700 hover:bg-sky-600 text-white"
              >
                {isImporting
                  ? "Importing..."
                  : `Import ${csvPreview.filter((r) => r.valid).length} Point Entr${csvPreview.filter((r) => r.valid).length === 1 ? "y" : "ies"}`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-emerald-50">
          <CardTitle>Point Summary</CardTitle>
          <CardDescription>
            Totals calculated from the dated point entries imported from your CSV and any newer daily entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-emerald-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-emerald-700">Today</p>
              <p className="text-lg font-bold text-emerald-900">{todayTotal.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-blue-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-blue-700">Last 7 Days</p>
              <p className="text-lg font-bold text-blue-900">{weekTotal.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-purple-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-purple-700">This Month</p>
              <p className="text-lg font-bold text-purple-900">{monthTotal.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white p-3">
              <p className="text-xs font-medium uppercase text-amber-700">Lifetime</p>
              <p className="text-lg font-bold text-amber-900">{lifetimeTotal.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50">
          <CardTitle className="flex items-center gap-2">
            <History size={18} />
            Recent Point History
          </CardTitle>
          <CardDescription>
            Timestamped history from the dated behavior point records. The most recent row reflects where they were at on that date.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {pointsLoading ? (
            <p className="text-sm text-gray-500">Loading point history...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-500">No behavior point history recorded yet.</p>
          ) : (
            <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">
                        {entry.date ? format(new Date(`${entry.date}T00:00:00`), "MMM d, yyyy") : "No date"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Entered in system: {entry.createdAt ? format(new Date(entry.createdAt), "MMM d, yyyy h:mm a") : "Unknown"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-700">
                        {typeof entry.totalPoints === "number" ? entry.totalPoints.toLocaleString() : "Status only"}
                      </p>
                      {entry.comments && (
                        <p className="text-xs text-slate-500">{entry.comments}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restriction & Subsystem Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Restriction Card */}
        <Card className={youth.restrictionLevel ? "border-2 border-orange-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Restriction Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {youth.restrictionLevel ? (
              <div className="space-y-3">
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertTitle className="text-orange-800">On Restriction Level {youth.restrictionLevel}</AlertTitle>
                  <AlertDescription className="text-orange-700">
                    Placed on {youth.restrictionStartDate ? format(new Date(youth.restrictionStartDate), 'MMM dd, yyyy') : 'N/A'}
                  </AlertDescription>
                </Alert>

                {youth.restrictionReason && (
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {youth.restrictionReason}
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={handleRemoveRestriction}
                  className="w-full border-2 border-orange-300 hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 transition-all duration-200 font-medium py-4"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove Restriction
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Youth is not currently on restriction</p>
                <Dialog open={showRestrictionDialog} onOpenChange={setShowRestrictionDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300 hover:border-red-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium py-5"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Place on Restriction
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Place on Restriction</DialogTitle>
                      <DialogDescription>
                        Set restriction level for {youth.firstName} {youth.lastName}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Restriction Level</Label>
                        <Select
                          value={restrictionLevel?.toString() || ""}
                          onValueChange={(val) => setRestrictionLevel(parseInt(val) as 1 | 2)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select level..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">R1 (Less Restrictive)</SelectItem>
                            <SelectItem value="2">R2 (More Restrictive)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          placeholder="Reason for restriction..."
                          value={restrictionReason}
                          onChange={(e) => setRestrictionReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={handlePlaceOnRestriction}
                        className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold py-5 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Confirm Restriction
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subsystem Card */}
        <Card className={youth.subsystemActive ? "border-2 border-red-500" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Subsystem Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {youth.subsystemActive ? (
              <div className="space-y-3">
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertTitle className="text-red-800">On Subsystem</AlertTitle>
                  <AlertDescription className="text-red-700">
                    Placed on {youth.subsystemStartDate ? format(new Date(youth.subsystemStartDate), 'MMM dd, yyyy') : 'N/A'}
                  </AlertDescription>
                </Alert>

                {youth.subsystemReason && (
                  <p className="text-sm text-gray-600">
                    <strong>Reason:</strong> {youth.subsystemReason}
                  </p>
                )}

                <Button
                  variant="outline"
                  onClick={handleRemoveSubsystem}
                  className="w-full border-2 border-red-300 hover:border-red-500 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium py-4"
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove from Subsystem
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Youth is not currently on subsystem</p>
                <Dialog open={showSubsystemDialog} onOpenChange={setShowSubsystemDialog}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-300 hover:border-red-700 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium py-5"
                    >
                      <Ban className="w-4 h-4 mr-2" />
                      Place on Subsystem
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Place on Subsystem</DialogTitle>
                      <DialogDescription>
                        Place {youth.firstName} {youth.lastName} on subsystem
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Reason (Optional)</Label>
                        <Textarea
                          placeholder="Reason for subsystem..."
                          value={subsystemReason}
                          onChange={(e) => setSubsystemReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={handlePlaceOnSubsystem}
                        className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-semibold py-5 shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        Confirm Subsystem
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subsystem Log Dialog */}
      <Dialog open={showSubsystemLog} onOpenChange={setShowSubsystemLog}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 font-medium"
          >
            <History size={16} className="mr-2" />
            Subsystem Log
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subsystem Change Log</DialogTitle>
            <DialogDescription>
              Review the history of subsystem status changes for {youth.firstName} {youth.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {subsystemHistory.length > 0 ? (
              <ul className="space-y-2">
                {[...subsystemHistory].reverse().map((entry, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className={`font-medium ${entry.status === 'on' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {entry.date} - by {entry.recordedBy}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center">No subsystem changes recorded yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Template display for behavior points CSV ──
const BehaviorPointsTemplate: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const template = CSV_TEMPLATES.behavior_points;

  const handleCopy = () => {
    navigator.clipboard.writeText(getTemplateCsvString('behavior_points'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
      <h4 className="font-semibold text-sm text-blue-800 flex items-center gap-2">
        <FileSpreadsheet className="w-4 h-4" />
        Expected Points CSV Format
      </h4>
      <div className="bg-white rounded p-3 font-mono text-xs text-gray-700 overflow-auto border">
        <div className="font-bold">{template.headers}</div>
        {template.sampleRows.map((row, i) => (
          <div key={i} className="text-gray-600">{row}</div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadCsvTemplate('behavior_points')} className="text-xs">
          <Download className="w-3 h-3 mr-1" />
          Download Template
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs">
          {copied ? <Check className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? "Copied!" : "Copy Format"}
        </Button>
      </div>
      <ul className="text-xs text-blue-700 space-y-0.5 list-disc list-inside">
        {template.notes.map((note, i) => <li key={i}>{note}</li>)}
      </ul>
    </div>
  );
};
