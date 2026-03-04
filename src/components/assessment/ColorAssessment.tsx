import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Youth } from "@/integrations/firebase/services";
import { useYouth } from "@/hooks/useSupabase";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { Printer, Save, RotateCcw, ClipboardList, Star, BarChart2, FileText, Trash2 } from "lucide-react";
import {
  realColorsAssessmentsService,
  type ColorAssessmentRow,
  type StyleLabel,
} from "@/integrations/firebase/realColorsAssessmentsService";

// ─────────────────────────────────────────────────
// Constants & Data
// ─────────────────────────────────────────────────

type StyleKey = "heart" | "anchor" | "mind" | "spark";

const STYLE_META: Record<
  StyleKey,
  { label: StyleLabel; color: string; coreNeed: string; strength: string; challenge: string; staffTip: string }
> = {
  heart: {
    label: "HEART",
    color: "#0D6E6E",
    coreNeed: "To feel authentic and genuinely cared for.",
    strength: "Builds trust quickly; natural peacemaker.",
    challenge: "Avoids conflict; may suppress own needs.",
    staffTip:
      "Validate feelings before redirecting. Frame skills as protecting relationships.",
  },
  anchor: {
    label: "ANCHOR",
    color: "#5A3E85",
    coreNeed: "Stability, order, and being in control.",
    strength: "Reliable, thorough, strong follow-through.",
    challenge: "Can be rigid or guilt-driven; resists change.",
    staffTip:
      "Give structure and clear expectations. Connect skills to rules and doing the right thing.",
  },
  mind: {
    label: "MIND",
    color: "#2D4F7C",
    coreNeed: "To be seen as competent and knowledgeable.",
    strength: "Problem-solver; calm under pressure.",
    challenge: "Can appear emotionally distant or detached.",
    staffTip:
      "Explain the why behind rules. Use logical reasoning; avoid emotional appeals.",
  },
  spark: {
    label: "SPARK",
    color: "#A63020",
    coreNeed: "Freedom, action, and visible results.",
    strength: "High energy; thrives with hands-on challenges.",
    challenge: "Impulsive; clashes with authority; bored by routine.",
    staffTip:
      "Build in movement and variety. Keep teaching brief and action-oriented. Roleplay works well.",
  },
};

const STYLE_KEYS: StyleKey[] = ["heart", "anchor", "mind", "spark"];

// Neutral labels used on youth-facing assessment to prevent gaming
const NEUTRAL_LABEL: Record<StyleKey, string> = {
  heart: "A",
  anchor: "B",
  mind: "C",
  spark: "D",
};

const ASSESSMENT_ROWS: Array<Record<StyleKey, string>> = [
  {
    heart: "Caring and kind. Puts others' feelings first.",
    anchor: "Organized and prepared. Likes having a clear plan.",
    mind: "Logical and curious. Likes figuring things out.",
    spark: "Bold and energetic. Loves action and new things.",
  },
  {
    heart: "Great listener. People share their problems with me.",
    anchor: "Reliable and consistent. Follows through on commitments.",
    mind: "Thinks carefully before deciding. Analyzes situations.",
    spark: "Hands-on and active. Prefers doing over just talking.",
  },
  {
    heart: "Avoids conflict. Wants everyone to get along.",
    anchor: "Feels better when things are orderly and neat.",
    mind: "Likes working things out independently. Values logic.",
    spark: "Gets bored with routine. Needs variety.",
  },
  {
    heart: "Feelings and relationships are the most important things.",
    anchor: "Believes in doing things the right way and on time.",
    mind: "Trusts facts and reasoning over emotions.",
    spark: "Lives in the moment. Moves fast and takes risks.",
  },
  {
    heart: "Motivated by connection and making others feel valued.",
    anchor: "Motivated by completing tasks and meeting responsibilities.",
    mind: "Motivated by learning and understanding how things work.",
    spark: "Motivated by freedom, excitement, and new challenges.",
  },
  {
    heart: "Shows care through empathy and being present.",
    anchor: "Shows care through dependability and keeping promises.",
    mind: "Shows care through solving problems and sharing knowledge.",
    spark: "Shows care through actions, humor, and spontaneity.",
  },
];

type RowRankings = Record<StyleKey, number | null>;

const emptyRow = (): RowRankings => ({ heart: null, anchor: null, mind: null, spark: null });

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"'/]/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
    };
    return entities[char] ?? char;
  });

const emptyRankings = (): Record<number, RowRankings> =>
  Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i, emptyRow()]));

// ─────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────

const ScoreBar = ({
  styleKey,
  score,
  max = 24,
}: {
  styleKey: StyleKey;
  score: number;
  max?: number;
}) => {
  const meta = STYLE_META[styleKey];
  const pct = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs font-bold w-14 shrink-0"
        style={{ color: meta.color }}
      >
        {meta.label}
      </span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className="h-4 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: meta.color }}
        />
      </div>
      <span className="text-sm font-bold w-8 text-right">{score}</span>
    </div>
  );
};

const StyleResultCard = ({
  styleKey,
  rank,
  score,
}: {
  styleKey: StyleKey;
  rank: 1 | 2 | 3 | 4;
  score: number;
}) => {
  const meta = STYLE_META[styleKey];
  return (
    <div
      className="rounded-xl p-4 text-white"
      style={{ backgroundColor: meta.color }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg font-bold">{meta.label}</span>
        <div className="flex items-center gap-1">
          {rank === 1 && <Star className="h-5 w-5 fill-yellow-300 text-yellow-300" />}
          <Badge
            className="text-white border-white/40"
            style={{ backgroundColor: `${meta.color}cc` }}
          >
            {rank === 1 ? "Primary" : rank === 2 ? "Secondary" : `#${rank}`}
          </Badge>
        </div>
      </div>
      <p className="text-xs text-white/80 mb-3">Score: {score} / 24</p>
      <div className="space-y-2 text-sm">
        <p>
          <span className="font-semibold">Core need:</span> {meta.coreNeed}
        </p>
        <p>
          <span className="font-semibold">Strength:</span> {meta.strength}
        </p>
        <p>
          <span className="font-semibold">Challenge:</span> {meta.challenge}
        </p>
        <p className="bg-white/20 rounded-lg p-2 text-xs mt-2">
          <span className="font-semibold">Staff tip:</span> {meta.staffTip}
        </p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────

interface ColorAssessmentProps {
  selectedYouth?: Youth;
  onSaved?: (updated?: Youth) => void;
}

export const ColorAssessment = ({ selectedYouth, onSaved }: ColorAssessmentProps) => {
  const { updateYouth } = useYouth();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // ── State ──
  const [activeTab, setActiveTab] = useState<string>("assessment");
  const [entryMode, setEntryMode] = useState<"interactive" | "totals">("interactive");

  // Interactive row-by-row rankings
  const [rankings, setRankings] = useState<Record<number, RowRankings>>(emptyRankings());

  // Staff-totals-only entry
  const [totals, setTotals] = useState<Record<StyleKey, string>>({
    heart: "",
    anchor: "",
    mind: "",
    spark: "",
  });

  // Metadata
  const [staffName, setStaffName] = useState(user?.displayName || user?.email || "");
  const [assessmentDate, setAssessmentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [observations, setObservations] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");

  // Saved result
  const [savedResult, setSavedResult] = useState<ColorAssessmentRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);
  const [historyList, setHistoryList] = useState<ColorAssessmentRow[]>([]);

  // ── Load existing ──
  useEffect(() => {
    if (!selectedYouth?.id) return;
    realColorsAssessmentsService.getByYouthId(selectedYouth.id, 5).then((rows) => {
      setHistoryList(rows);
      if (rows.length > 0) {
        setSavedResult(rows[0]);
        setActiveTab("results");
      }
    });
  }, [selectedYouth?.id]);

  // ── Live scores from rankings ──
  const liveScores = useMemo<Record<StyleKey, number>>(() => {
    const s = { heart: 0, anchor: 0, mind: 0, spark: 0 };
    for (let i = 0; i < 6; i++) {
      STYLE_KEYS.forEach((k) => {
        s[k] += rankings[i]?.[k] ?? 0;
      });
    }
    return s;
  }, [rankings]);

  // ── Row validation ──
  const rowErrors = useMemo<(string | null)[]>(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const vals = STYLE_KEYS.map((k) => rankings[i]?.[k]).filter((v) => v !== null) as number[];
      if (vals.length === 0) return null;
      const hasDup = vals.length !== new Set(vals).size;
      return hasDup ? "Each number 1–4 must be used exactly once per row." : null;
    });
  }, [rankings]);

  const rowComplete = (i: number) =>
    STYLE_KEYS.every((k) => rankings[i]?.[k] !== null);

  const allComplete = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => i).every(rowComplete) &&
      rowErrors.every((e) => !e),
    [rankings, rowErrors]
  );

  // ── Compute sorted styles ──
  const sortedStyles = (scoreMap: Record<StyleKey, number>): [StyleKey, number][] =>
    (Object.entries(scoreMap) as [StyleKey, number][]).sort((a, b) => b[1] - a[1]);

  // ── Save handler ──
  const handleSave = async (scoreMap: Record<StyleKey, number>, rawRankings?: Record<number, RowRankings>) => {
    if (!selectedYouth?.id) {
      toast({ title: "No youth selected", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const sorted = sortedStyles(scoreMap);
      const primaryKey = sorted[0][0];
      const secondaryKey = sorted[1][0];
      const resultStr = `${STYLE_META[primaryKey].label}/${STYLE_META[secondaryKey].label}`;

      // Flatten rankings into keyed record
      const flatRankings: Record<string, number> | null = rawRankings
        ? Object.fromEntries(
            Array.from({ length: 6 }, (_, i) =>
              STYLE_KEYS.map((k) => [`r${i + 1}_${k}`, rawRankings[i]?.[k] ?? 0])
            ).flat()
          )
        : null;

      const row = await realColorsAssessmentsService.save({
        youth_id: selectedYouth.id,
        primary_color: STYLE_META[primaryKey].label,
        secondary_color: STYLE_META[secondaryKey].label,
        real_colors_result: resultStr,
        heart_score: scoreMap.heart,
        anchor_score: scoreMap.anchor,
        mind_score: scoreMap.mind,
        spark_score: scoreMap.spark,
        rankings: flatRankings,
        assessment_date: assessmentDate,
        observations: observations || null,
        staff_observations: observations || null,
        next_review_date: nextReviewDate || null,
        completed_by_type: "staff",
        completed_by_name: staffName || user?.email || null,
      });

      await updateYouth(selectedYouth.id, { realColorsResult: resultStr });

      setSavedResult(row);
      setHistoryList((prev) => [row, ...prev.filter((r) => r.id !== row.id)]);
      setActiveTab("results");
      toast({
        title: "Assessment Saved",
        description: `Primary style: ${STYLE_META[primaryKey].label} · Secondary: ${STYLE_META[secondaryKey].label}`,
      });
      if (onSaved) onSaved();
    } catch (err) {
      console.error(err);
      toast({ title: "Save failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitInteractive = () => {
    if (!allComplete) return;
    handleSave(liveScores, rankings);
  };

  const handleSubmitTotals = () => {
    const scoreMap: Record<StyleKey, number> = {
      heart: Math.max(6, Math.min(24, parseInt(totals.heart) || 6)),
      anchor: Math.max(6, Math.min(24, parseInt(totals.anchor) || 6)),
      mind: Math.max(6, Math.min(24, parseInt(totals.mind) || 6)),
      spark: Math.max(6, Math.min(24, parseInt(totals.spark) || 6)),
    };
    handleSave(scoreMap, undefined);
  };

  const handleReset = () => {
    setRankings(emptyRankings());
    setTotals({ heart: "", anchor: "", mind: "", spark: "" });
    setObservations("");
    setNextReviewDate("");
    setActiveTab("assessment");
  };

  const handlePrintResults = () => window.print();

  const handleDeleteAssessment = async (assessmentId: string) => {
    if (!selectedYouth?.id || !isAdmin) return;

    const target = historyList.find((row) => row.id === assessmentId);
    if (!target) return;

    const label = target.assessment_date || target.created_at?.slice(0, 10) || "this assessment";
    if (!window.confirm(`Delete the Personal Style Profile from ${label}? This cannot be undone.`)) {
      return;
    }

    setDeletingAssessmentId(assessmentId);
    try {
      await realColorsAssessmentsService.delete(assessmentId);

      const wasLatest = historyList[0]?.id === assessmentId;
      const remainingHistory = historyList.filter((row) => row.id !== assessmentId);
      const nextSelected = savedResult?.id === assessmentId
        ? remainingHistory[0] ?? null
        : savedResult;

      setHistoryList(remainingHistory);
      setSavedResult(nextSelected);

      if (wasLatest) {
        try {
          const updatedYouth = await updateYouth(selectedYouth.id, {
            realColorsResult: remainingHistory[0]?.real_colors_result ?? null,
          });
          if (onSaved) onSaved(updatedYouth);
        } catch (syncErr) {
          console.error("Failed to sync youth real colors result after deletion:", syncErr);
          if (onSaved) onSaved();
        }
      } else if (onSaved) {
        onSaved();
      }

      toast({
        title: "Assessment Deleted",
        description: "The Personal Style Profile entry has been removed from history.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Delete failed",
        description: "The assessment could not be removed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingAssessmentId(null);
    }
  };

  const handlePrintBlankForm = () => {
    const youthName = `${selectedYouth?.firstName ?? ""} ${selectedYouth?.lastName ?? ""}`.trim();
    const escapedYouthName = escapeHtml(youthName);
    const rows = ASSESSMENT_ROWS.map((row, idx) => `
      <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9f9f9"}">
        <td style="border:1px solid #000;padding:6px 8px;text-align:center;font-weight:bold">${idx + 1}</td>
        ${STYLE_KEYS.map((k) => `
          <td style="border:1px solid #000;padding:6px 8px">
            <div style="display:flex;align-items:flex-start;gap:6px">
              <span style="display:inline-block;border:1px solid #000;width:20px;height:20px;flex-shrink:0;margin-top:2px"></span>
              <span style="line-height:1.3;font-size:10pt">${row[k]}</span>
            </div>
          </td>
        `).join("")}
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Personal Style Profile — ${escapedYouthName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 0.5in; }
    h1 { font-size: 14pt; font-weight: bold; text-align: center; }
    h2 { font-size: 12pt; font-weight: bold; text-align: center; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #000; padding: 6px 8px; }
    @page { size: letter; margin: 0.5in; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Heartland Boys Home</h1>
  <h2>Personal Style Profile</h2>
  <hr style="margin:8px 0 12px;border-top:2px solid #000"/>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:14px;font-size:9pt">
    <div><strong>Youth Name:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:160px">${escapedYouthName}</span></div>
    <div><strong>Date:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:120px"></span></div>
    <div><strong>Staff:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:120px"></span></div>
  </div>

  <div style="border:1px solid #555;border-radius:4px;padding:8px;margin-bottom:14px;background:#f5f5f5;font-size:9pt">
    <strong>Instructions:</strong> Read each row. Rank all four descriptions using the numbers <strong>1–4</strong>.
    You must use each number exactly once per row.<br/>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-top:6px;font-weight:600">
      <span>4 = Most like me</span>
      <span>3 = A lot like me</span>
      <span>2 = A little like me</span>
      <span>1 = Least like me</span>
    </div>
  </div>

  <table style="margin-bottom:14px">
    <thead>
      <tr>
        <th style="background:#1C2B4A;color:#fff;width:32px;text-align:center">#</th>
        <th style="background:#1C2B4A;color:#fff;text-align:center">A</th>
        <th style="background:#1C2B4A;color:#fff;text-align:center">B</th>
        <th style="background:#1C2B4A;color:#fff;text-align:center">C</th>
        <th style="background:#1C2B4A;color:#fff;text-align:center">D</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background:#e8e8e8">
        <td style="border:1px solid #000;padding:6px 8px;text-align:center;font-weight:bold;font-size:9pt">Total</td>
        ${STYLE_KEYS.map(() => `<td style="border:1px solid #000;padding:10px 12px;text-align:center"><div style="display:inline-block;border:2px solid #000;width:48px;height:26px"></div></td>`).join("")}
      </tr>
    </tbody>
  </table>


  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9pt;margin-bottom:12px">
    <div>
      <strong>Youth Level:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:64px;margin-right:12px"></span>
      <strong>Next Review:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:96px"></span>
    </div>
    <div style="text-align:right">
      <strong>Primary Style:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:96px;margin-right:12px"></span>
      <strong>Secondary:</strong> <span style="display:inline-block;border-bottom:1px solid #000;width:80px"></span>
    </div>
  </div>

  <div style="font-size:9pt">
    <strong>Staff Observations:</strong>
    <div style="border-bottom:1px solid #000;height:22px;margin-top:6px"></div>
    <div style="border-bottom:1px solid #000;height:22px;margin-top:6px"></div>
    <div style="border-bottom:1px solid #000;height:22px;margin-top:6px"></div>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=850,height=1100");
    if (!win) {
      toast({ title: "Pop-up blocked", description: "Allow pop-ups for this site and try again.", variant: "destructive" });
      return;
    }
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); };
  };

  // ── Derive display scores from savedResult ──
  const displayScores = useMemo<Record<StyleKey, number> | null>(() => {
    if (!savedResult) return null;
    const h = savedResult.heart_score ?? 0;
    const a = savedResult.anchor_score ?? 0;
    const m = savedResult.mind_score ?? 0;
    const s = savedResult.spark_score ?? 0;
    if (h + a + m + s === 0) return null;
    return { heart: h, anchor: a, mind: m, spark: s };
  }, [savedResult]);

  // ─────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────

  if (!selectedYouth) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          Select a youth to view or complete the Personal Style Profile.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body > *:not(.psp-print-target) { display: none !important; }
            .psp-print-hide { display: none !important; }
            .psp-print-target {
              display: block !important;
              position: static !important;
              margin: 0 !important;
              padding: 0.4in !important;
              font-size: 10pt !important;
              font-family: Arial, sans-serif !important;
              color: black !important;
              background: white !important;
            }
            @page { size: letter; margin: 0.5in; }
          }
        `
      }} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="psp-print-hide grid w-full grid-cols-1 sm:grid-cols-3 bg-white border border-gray-200 shadow-sm h-auto gap-1">
          <TabsTrigger value="assessment" className="flex items-center justify-center gap-1.5 whitespace-normal px-3 py-2 data-[state=active]:bg-[#1C2B4A] data-[state=active]:text-white">
            <ClipboardList className="h-4 w-4" /> Assessment
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center justify-center gap-1.5 whitespace-normal px-3 py-2 data-[state=active]:bg-[#1C2B4A] data-[state=active]:text-white">
            <BarChart2 className="h-4 w-4" /> Results
          </TabsTrigger>
          <TabsTrigger value="print-form" className="flex items-center justify-center gap-1.5 whitespace-normal px-3 py-2 data-[state=active]:bg-[#1C2B4A] data-[state=active]:text-white">
            <FileText className="h-4 w-4" /> Print Blank Form
          </TabsTrigger>
        </TabsList>

        {/* ── Assessment Tab ── */}
        <TabsContent value="assessment" className="space-y-4">
          <Card className="border-2" style={{ borderColor: "#1C2B4A20" }}>
            <CardHeader style={{ backgroundColor: "#1C2B4A" }} className="rounded-t-lg">
              <CardTitle className="text-white text-lg">
                Personal Style Profile — {selectedYouth.firstName} {selectedYouth.lastName}
              </CardTitle>
              <p className="text-white/70 text-sm">
                Rank all four descriptions in each row using 1–4. Use each number exactly once per row.
                <br />
                <span className="font-semibold text-yellow-300">4 = Most like me &nbsp; 3 = A lot like me &nbsp; 2 = A little like me &nbsp; 1 = Least like me</span>
              </p>
            </CardHeader>
            <CardContent className="pt-4">

              {/* Entry mode toggle */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <Button
                  size="sm"
                  variant={entryMode === "interactive" ? "default" : "outline"}
                  onClick={() => setEntryMode("interactive")}
                  className="w-full sm:w-auto whitespace-normal text-left sm:text-center"
                  style={entryMode === "interactive" ? { backgroundColor: "#1C2B4A" } : {}}
                >
                  Row-by-Row Entry
                </Button>
                <Button
                  size="sm"
                  variant={entryMode === "totals" ? "default" : "outline"}
                  onClick={() => setEntryMode("totals")}
                  className="w-full sm:w-auto whitespace-normal text-left sm:text-center"
                  style={entryMode === "totals" ? { backgroundColor: "#1C2B4A" } : {}}
                >
                  Enter Totals Directly (paper form already scored)
                </Button>
              </div>

              {entryMode === "interactive" ? (
                <>
                  {/* Column headers — neutral labels so youth cannot predict results */}
                  <div className="hidden md:grid grid-cols-5 gap-2 mb-2 text-center text-xs font-bold">
                    <div className="text-gray-500">Row</div>
                    {STYLE_KEYS.map((k) => (
                      <div key={k} className="text-gray-600">
                        {NEUTRAL_LABEL[k]}
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {ASSESSMENT_ROWS.map((row, rowIdx) => (
                    <div key={rowIdx} className="mb-4 rounded-xl border border-slate-200 bg-white p-3 md:p-0 md:border-0 md:bg-transparent">
                      <div className="md:hidden flex items-center gap-2 mb-3">
                        <span
                          className="text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: "#1C2B4A" }}
                        >
                          {rowIdx + 1}
                        </span>
                        <span className="text-sm font-semibold text-slate-700">Row {rowIdx + 1}</span>
                      </div>

                      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {STYLE_KEYS.map((styleKey) => (
                          <div key={styleKey} className="rounded-lg border border-slate-200 p-3 bg-slate-50/70 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-500">Choice {NEUTRAL_LABEL[styleKey]}</span>
                              <span
                                className="text-[11px] font-semibold"
                                style={{ color: STYLE_META[styleKey].color }}
                              >
                                {STYLE_META[styleKey].label}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-snug">
                              {row[styleKey]}
                            </p>
                            <select
                              value={rankings[rowIdx]?.[styleKey] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setRankings((prev) => ({
                                  ...prev,
                                  [rowIdx]: { ...prev[rowIdx], [styleKey]: val },
                                }));
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2"
                            >
                              <option value="">Select 1-4</option>
                              {[4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="hidden md:grid grid-cols-5 gap-2 items-start">
                        <div className="flex items-center justify-center pt-2">
                          <span
                            className="text-sm font-bold w-7 h-7 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: "#1C2B4A" }}
                          >
                            {rowIdx + 1}
                          </span>
                        </div>
                        {STYLE_KEYS.map((styleKey) => (
                          <div key={styleKey} className="space-y-1">
                            <p className="text-xs text-gray-600 leading-tight min-h-[3em]">
                              {row[styleKey]}
                            </p>
                            <select
                              value={rankings[rowIdx]?.[styleKey] ?? ""}
                              onChange={(e) => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setRankings((prev) => ({
                                  ...prev,
                                  [rowIdx]: { ...prev[rowIdx], [styleKey]: val },
                                }));
                              }}
                              className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2"
                            >
                              <option value="">—</option>
                              {[4, 3, 2, 1].map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      {/* Row validation */}
                      {rowErrors[rowIdx] && (
                        <p className="text-red-600 text-xs mt-3 md:mt-1 md:col-span-5 md:pl-10">
                          ⚠ {rowErrors[rowIdx]}
                        </p>
                      )}
                      {rowComplete(rowIdx) && !rowErrors[rowIdx] && (
                        <p className="text-green-600 text-xs mt-3 md:mt-1 md:pl-10">✓ Row complete</p>
                      )}
                    </div>
                  ))}

                  {/* Running totals intentionally hidden — displaying live per-style scores
                      would allow youth to adjust rankings to target a desired result. */}
                </>
              ) : (
                /* Totals entry */
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Enter the column totals from the completed paper form. Each score should be between 6 and 24.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {STYLE_KEYS.map((k) => (
                      <div key={k}>
                        <Label style={{ color: STYLE_META[k].color }} className="font-bold">
                          {STYLE_META[k].label} Score
                        </Label>
                        <Input
                          type="number"
                          min={6}
                          max={24}
                          value={totals[k]}
                          onChange={(e) =>
                            setTotals((prev) => ({ ...prev, [k]: e.target.value }))
                          }
                          placeholder="6–24"
                          className="mt-1"
                          style={{ borderColor: STYLE_META[k].color + "80" }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* Preview bar */}
                  {STYLE_KEYS.some((k) => parseInt(totals[k]) > 0) && (
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      {STYLE_KEYS.map((k) => (
                        <ScoreBar key={k} styleKey={k} score={parseInt(totals[k]) || 0} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t pt-4">
                <div>
                  <Label>Staff Name</Label>
                  <Input
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    placeholder="Completing staff name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Date of Assessment</Label>
                  <Input
                    type="date"
                    value={assessmentDate}
                    onChange={(e) => setAssessmentDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Date of Next Review</Label>
                  <Input
                    type="date"
                    value={nextReviewDate}
                    onChange={(e) => setNextReviewDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Staff Observations</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Notes on how the youth engaged with the assessment, notable responses, relevant context..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                {entryMode === "interactive" ? (
                  <Button
                    onClick={handleSubmitInteractive}
                    disabled={!allComplete || isSaving}
                    style={{ backgroundColor: "#1C2B4A" }}
                    className="text-white w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Assessment"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitTotals}
                    disabled={
                      STYLE_KEYS.some((k) => !totals[k] || parseInt(totals[k]) < 6) || isSaving
                    }
                    style={{ backgroundColor: "#1C2B4A" }}
                    className="text-white w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Saving..." : "Save Assessment"}
                  </Button>
                )}
                <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                  <RotateCcw className="h-4 w-4 mr-2" /> Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Results Tab ── */}
        <TabsContent value="results" className="space-y-4">
          {savedResult && displayScores ? (
            <>
              {/* Printable results */}
              <div ref={printRef} className="psp-print-target space-y-6">
                {/* Header */}
                <div
                  className="rounded-xl p-5 text-white"
                  style={{ backgroundColor: "#1C2B4A" }}
                >
                  <h2 className="text-xl font-bold">Personal Style Profile Results</h2>
                  <p className="text-white/70 text-sm">Heartland Boys Home</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-white/60">Youth: </span>
                      <span className="font-semibold">
                        {selectedYouth.firstName} {selectedYouth.lastName}
                      </span>
                    </div>
                    <div>
                      <span className="text-white/60">Date: </span>
                      <span>{savedResult.assessment_date || savedResult.created_at?.slice(0, 10)}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Primary Style: </span>
                      <span className="font-bold text-yellow-300">{savedResult.primary_color}</span>
                    </div>
                    <div>
                      <span className="text-white/60">Secondary Style: </span>
                      <span className="font-semibold">{savedResult.secondary_color}</span>
                    </div>
                    {savedResult.completed_by_name && (
                      <div>
                        <span className="text-white/60">Completed by: </span>
                        <span>{savedResult.completed_by_name}</span>
                      </div>
                    )}
                    {savedResult.next_review_date && (
                      <div>
                        <span className="text-white/60">Next Review: </span>
                        <span>{savedResult.next_review_date}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score bars */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase">Score Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {sortedStyles(displayScores).map(([k, score]) => (
                      <ScoreBar key={k} styleKey={k} score={score} />
                    ))}
                  </CardContent>
                </Card>

                {/* Style cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sortedStyles(displayScores).map(([k, score], idx) => (
                    <StyleResultCard
                      key={k}
                      styleKey={k}
                      rank={(idx + 1) as 1 | 2 | 3 | 4}
                      score={score}
                    />
                  ))}
                </div>

                {/* Staff observations */}
                {savedResult.staff_observations && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold text-gray-700 uppercase">Staff Observations</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {savedResult.staff_observations}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Action buttons (hidden on print) */}
              <div className="flex flex-col sm:flex-row gap-2 psp-print-hide">
                <Button
                  onClick={handlePrintResults}
                  variant="outline"
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Printer className="h-4 w-4" /> Print Results
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("assessment")}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Retake Assessment
                </Button>
              </div>

              {/* History */}
              {historyList.length > 0 && (historyList.length > 1 || isAdmin) && (
                <Card className="psp-print-hide">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase">Assessment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {historyList.map((r) => (
                        <div
                          key={r.id}
                          className="w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-sm p-3 rounded border border-gray-100 hover:bg-gray-50"
                        >
                          <button
                            type="button"
                            className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 text-left"
                            onClick={() => setSavedResult(r)}
                          >
                            <span className="font-medium sm:font-normal">
                              {r.assessment_date || r.created_at?.slice(0, 10)}
                            </span>
                            <span className="font-semibold">
                              {r.primary_color} / {r.secondary_color}
                            </span>
                            <span className="text-gray-400 text-xs">
                              {r.completed_by_name}
                            </span>
                          </button>
                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                              onClick={() => handleDeleteAssessment(r.id)}
                              disabled={deletingAssessmentId === r.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p>No assessment results yet.</p>
                <Button
                  className="mt-4"
                  onClick={() => setActiveTab("assessment")}
                  style={{ backgroundColor: "#1C2B4A" }}
                >
                  Take Assessment
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Print Blank Form Tab ── */}
        <TabsContent value="print-form">
          <Button
            onClick={handlePrintBlankForm}
            className="mb-4 flex items-center justify-center gap-2 w-full sm:w-auto"
            style={{ backgroundColor: "#1C2B4A" }}
          >
            <Printer className="h-4 w-4" /> Print Blank Form
          </Button>
          <BlankPrintForm youthName={`${selectedYouth.firstName} ${selectedYouth.lastName}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─────────────────────────────────────────────────
// Blank Printable Form
// ─────────────────────────────────────────────────

const BlankPrintForm = ({ youthName }: { youthName: string }) => (
  <div className="psp-print-target bg-white text-black p-8 font-sans text-sm border border-gray-200 rounded-lg">
    {/* Header */}
    <div className="text-center mb-5 border-b-2 border-gray-800 pb-3">
      <p className="text-lg font-bold">Heartland Boys Home</p>
      <p className="text-base font-bold mt-0.5">Personal Style Profile</p>
    </div>

    {/* Name / Date / Staff row */}
    <div className="grid grid-cols-3 gap-6 mb-5 text-xs">
      <div>
        <span className="font-bold">Youth Name: </span>
        <span className="inline-block border-b border-black w-40">{youthName || ""}</span>
      </div>
      <div>
        <span className="font-bold">Date: </span>
        <span className="inline-block border-b border-black w-32" />
      </div>
      <div>
        <span className="font-bold">Staff: </span>
        <span className="inline-block border-b border-black w-32" />
      </div>
    </div>

    {/* Instructions */}
    <div className="border border-gray-700 rounded p-2 mb-4 text-xs bg-gray-50">
      <p className="font-bold mb-1">Instructions:</p>
      <p>
        Read each row. Rank all four descriptions using the numbers <strong>1–4</strong>. You must use each number
        exactly once per row.
      </p>
      <div className="grid grid-cols-4 mt-1 gap-2 font-semibold">
        <span>4 = Most like me</span>
        <span>3 = A lot like me</span>
        <span>2 = A little like me</span>
        <span>1 = Least like me</span>
      </div>
    </div>

    {/* Column headers */}
    <table className="w-full border border-black border-collapse text-xs mb-4">
      <thead>
        <tr style={{ backgroundColor: "#1C2B4A" }}>
          <th className="border border-black px-2 py-1 text-white text-center w-8">#</th>
          {STYLE_KEYS.map((k) => (
            <th
              key={k}
              className="border border-black px-2 py-2 text-white text-center font-bold"
            >
              {NEUTRAL_LABEL[k]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ASSESSMENT_ROWS.map((row, idx) => (
          <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
            <td className="border border-black px-2 py-2 text-center font-bold">{idx + 1}</td>
            {STYLE_KEYS.map((k) => (
              <td key={k} className="border border-black px-2 py-2">
                <div className="flex items-start gap-2">
                  <span className="inline-block border border-black w-6 h-6 shrink-0 mt-0.5" />
                  <span className="leading-tight">{row[k]}</span>
                </div>
              </td>
            ))}
          </tr>
        ))}
        {/* Totals row */}
        <tr style={{ backgroundColor: "#1C2B4A20" }}>
          <td className="border border-black px-2 py-2 text-center font-bold text-xs">Total</td>
          {STYLE_KEYS.map((k) => (
            <td key={k} className="border border-black px-3 py-3 text-center">
              <div className="inline-block border-2 border-black w-12 h-7" />
            </td>
          ))}
        </tr>
      </tbody>
    </table>

    {/* Signature / review */}
    <div className="grid grid-cols-2 gap-6 mt-4 text-xs">
      <div>
        <span className="font-bold">Youth Level: </span>
        <span className="inline-block border-b border-black w-20 mr-4" />
        <span className="font-bold">Next Review: </span>
        <span className="inline-block border-b border-black w-28" />
      </div>
      <div className="text-right">
        <span className="font-bold">Primary Style: </span>
        <span className="inline-block border-b border-black w-28 mr-4" />
        <span className="font-bold">Secondary: </span>
        <span className="inline-block border-b border-black w-24" />
      </div>
    </div>

    <div className="mt-4">
      <p className="font-bold text-xs mb-1">Staff Observations:</p>
      {[0, 1, 2].map((i) => (
        <div key={i} className="border-b border-black h-6 w-full mb-1" />
      ))}
    </div>
  </div>
);
