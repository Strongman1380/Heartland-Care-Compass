import { useState, useEffect, useRef } from "react";
import { Youth, DailyRating } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Printer, Sparkles } from "lucide-react";
import {
  format,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
  subWeeks, subMonths,
} from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { logger } from '@/utils/logger';
import { fetchDailyRatings, fetchAllProgressNotes } from "@/utils/local-storage-utils";
import { getDailyRatingsByYouth } from "@/lib/api";
import { getWeeklyEvalsForYouthInRange, getDailyShiftsForYouthInRange } from "@/utils/shiftScores";
import { exportElementToPDF, exportElementToDocx } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";
import * as aiService from "@/services/aiService";

export type EvalReportType = "weekly" | "monthly";

const fetchDailyRatingsAPI = async (youthId: string) => {
  try {
    return await getDailyRatingsByYouth(youthId);
  } catch {
    return fetchDailyRatings(youthId);
  }
};

// Extract readable text from a case note object (matches pattern in other reports)
const extractNoteText = (note: any): string => {
  if (!note) return "";
  if (typeof note.note === "string") {
    try {
      const parsed = JSON.parse(note.note);
      if (parsed.sections) {
        return [
          parsed.sections.summary,
          parsed.sections.strengthsChallenges,
          parsed.sections.interventionsResponse,
          parsed.sections.planNextSteps,
        ]
          .filter(Boolean)
          .join(" ");
      }
      return parsed.summary || parsed.content || note.note;
    } catch {
      return note.note;
    }
  }
  return note.summary || note.content || "";
};

interface ProgressEvaluationReportProps {
  youth: Youth;
  variant?: EvalReportType;
  onAutoExportComplete?: () => void;
}

interface ReportData {
  peerInteraction: number;
  adultInteraction: number;
  investmentLevel: number;
  dealAuthority: number;
  selfEsteem: number;
  evaluationPeriod: string;
  socialSkillsStrengths: string;
  socialSkillsDeficiencies: string;
  incidents: string;
  recommendations: string;
  evaluatedBy: string;
  passScheduleFor: string;
  passWithWhom: string;
}

const EMPTY: ReportData = {
  peerInteraction: 0,
  adultInteraction: 0,
  investmentLevel: 0,
  dealAuthority: 0,
  selfEsteem: 0,
  evaluationPeriod: "",
  socialSkillsStrengths: "",
  socialSkillsDeficiencies: "",
  incidents: "",
  recommendations: "",
  evaluatedBy: "",
  passScheduleFor: "",
  passWithWhom: "",
};

const ratingLabel = (r: number) => {
  if (r >= 3.5) return "4 - Above Average";
  if (r >= 2.5) return "3 - Average";
  if (r >= 1.5) return "2 - Below Average";
  if (r > 0)   return "1 - Poor";
  return "—";
};

export const ProgressEvaluationReport = ({
  youth,
  variant = "weekly",
  onAutoExportComplete,
}: ProgressEvaluationReportProps) => {
  const [reportType, setReportType] = useState<EvalReportType>(variant);
  const [data, setData] = useState<ReportData>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoExported, setAutoExported] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const titleMap: Record<EvalReportType, string> = {
    weekly:  "Resident Weekly Progress Evaluation",
    monthly: "Resident Monthly Progress Evaluation",
  };

  useEffect(() => {
    setReportType(variant);
    setAutoExported(false);
  }, [variant, youth.id]);

  // ── Date range helper ──
  const getDateRange = (type: EvalReportType): { startDate: Date; endDate: Date; periodLabel: string } => {
    const today = new Date();
    if (type === "weekly") {
      const startDate = startOfWeek(subWeeks(today, 0));
      const endDate   = endOfWeek(subWeeks(today, 0));
      return { startDate, endDate, periodLabel: `${format(startDate, "M/d/yy")} – ${format(endDate, "M/d/yy")}` };
    }
    const startDate = startOfMonth(subMonths(today, 0));
    const endDate   = endOfMonth(subMonths(today, 0));
    return { startDate, endDate, periodLabel: format(startDate, "MMMM yyyy") };
  };

  // ── Load ratings and compute averages ──
  const generateReport = async () => {
    setLoading(true);
    try {
      const { startDate, endDate, periodLabel } = getDateRange(reportType);
      const startISO = format(startDate, "yyyy-MM-dd");
      const endISO   = format(endDate,   "yyyy-MM-dd");

      // Fetch all three score sources in parallel
      const [allDailyRatings, weeklyEvals, dailyShifts] = await Promise.all([
        fetchDailyRatingsAPI(youth.id),
        getWeeklyEvalsForYouthInRange(youth.id, startISO, endISO).catch(() => []),
        getDailyShiftsForYouthInRange(youth.id, startISO, endISO).catch(() => []),
      ]);

      // Daily ratings filtered to the period (0–5 scale)
      const ratings = allDailyRatings.filter((r) => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return d >= startDate && d <= endDate;
      });

      const avgDailyRating = (field: keyof DailyRating) => {
        const vals = ratings
          .map((r) => r[field] as number)
          .filter((v) => v !== null && v !== undefined && v > 0);
        return vals.length > 0
          ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
          : 0;
      };

      // Shift/weekly eval data (0–4 scale, already normalized)
      const allEvals = [...weeklyEvals, ...dailyShifts];
      const avgEval = (field: "peer" | "adult" | "investment" | "authority") => {
        const vals = allEvals.map((e) => e[field]).filter((v): v is number => v !== null && v !== undefined && v > 0);
        return vals.length > 0
          ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
          : 0;
      };

      // Prefer whichever source has more entries for this period
      const useEvals = allEvals.length >= ratings.length && allEvals.length > 0;

      setData((prev) => ({
        ...prev,
        peerInteraction:  useEvals ? avgEval("peer")       : avgDailyRating("peerInteraction"),
        adultInteraction: useEvals ? avgEval("adult")      : avgDailyRating("adultInteraction"),
        investmentLevel:  useEvals ? avgEval("investment") : avgDailyRating("investmentLevel"),
        dealAuthority:    useEvals ? avgEval("authority")  : avgDailyRating("dealAuthority"),
        evaluationPeriod: periodLabel,
      }));
    } catch (err) {
      logger.error("Error generating evaluation report:", err);
      toast({ title: "Error", description: "Failed to load ratings.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generateReport(); }, [reportType, youth.id]);

  // ── AI auto-fill for all narrative sections ──
  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      const { startDate, endDate, periodLabel } = getDateRange(reportType);
      const startISO = format(startDate, "yyyy-MM-dd");
      const endISO   = format(endDate,   "yyyy-MM-dd");

      // Fetch case notes, ratings, and eval scores in parallel
      const [allNotes, allRatings, weeklyEvals, dailyShifts] = await Promise.all([
        fetchAllProgressNotes(youth.id),
        fetchDailyRatingsAPI(youth.id),
        getWeeklyEvalsForYouthInRange(youth.id, startISO, endISO).catch(() => []),
        getDailyShiftsForYouthInRange(youth.id, startISO, endISO).catch(() => []),
      ]);

      // Filter to the period
      const periodNotes = allNotes.filter((n) => {
        if (!n.date) return false;
        const d = new Date(n.date);
        return d >= startDate && d <= endDate;
      });

      const periodRatings = allRatings.filter((r) => {
        if (!r.date) return false;
        const d = new Date(r.date);
        return d >= startDate && d <= endDate;
      });

      // Build case notes text
      const caseNotesText = periodNotes
        .map((n) => {
          const text = extractNoteText(n);
          const date = n.date ? format(new Date(n.date), "MMM d, yyyy") : "No date";
          return `[${date}] ${text}`;
        })
        .filter((t) => t.length > 15)
        .join("\n\n");

      // Compute rating averages for context
      const rc = periodRatings.length;
      const avgPeer     = rc > 0 ? (periodRatings.reduce((s, r) => s + (r.peerInteraction  ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgAdult    = rc > 0 ? (periodRatings.reduce((s, r) => s + (r.adultInteraction  ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgInvest   = rc > 0 ? (periodRatings.reduce((s, r) => s + (r.investmentLevel   ?? 0), 0) / rc).toFixed(1) : "N/A";
      const avgAuthority= rc > 0 ? (periodRatings.reduce((s, r) => s + (r.dealAuthority     ?? 0), 0) / rc).toFixed(1) : "N/A";

      // Weekly eval averages
      const allEvals = [...weeklyEvals, ...dailyShifts];
      const ec = allEvals.length;
      const evalAvgPeer     = ec > 0 ? (allEvals.reduce((s, e) => s + (e.peer       ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgAdult    = ec > 0 ? (allEvals.reduce((s, e) => s + (e.adult      ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgInvest   = ec > 0 ? (allEvals.reduce((s, e) => s + (e.investment ?? 0), 0) / ec).toFixed(1) : "N/A";
      const evalAvgAuthority= ec > 0 ? (allEvals.reduce((s, e) => s + (e.authority  ?? 0), 0) / ec).toFixed(1) : "N/A";

      const baseContext = `You are a clinical staff member completing a Progress Evaluation for ${youth.firstName} ${youth.lastName} at Heartland Boys Home.
Evaluation period: ${periodLabel}
Current Level: ${youth.level || "Not specified"}

Daily Ratings (0–5 scale, ${rc} entries this period):
- Peer Interaction: ${avgPeer}/5
- Adult Interaction: ${avgAdult}/5
- Investment Level: ${avgInvest}/5
- Dealing with Authority: ${avgAuthority}/5

Weekly Eval / Shift Scores (0–4 scale, ${ec} entries):
- Peer Interaction: ${evalAvgPeer}/4
- Adult Interaction: ${evalAvgAdult}/4
- Investment Level: ${evalAvgInvest}/4
- Dealing with Authority: ${evalAvgAuthority}/4

Case Notes / Staff Observations for this period:
${caseNotesText || "No case notes documented for this period."}

CRITICAL OUTPUT RULES:
1. Output ONLY plain text. No headings, no titles, no labels, no "Summary:", no markdown, no bullet points.
2. Do NOT start your response with the field name or a heading. Just write the content directly.
3. Write 1-3 concise sentences in professional clinical language.
4. Do not include raw dates, staff names, or note excerpts.`;

      // Generate all four narrative fields
      const prompts: Array<{ field: keyof ReportData; instruction: string }> = [
        {
          field: "socialSkillsStrengths",
          instruction: `${baseContext}\n\nThis text goes into the "Social Skills Strengths" textarea. Write 1-3 sentences about the resident's social skills strengths this period: positive peer interactions, cooperative behavior, relationship-building, respectful communication.`,
        },
        {
          field: "socialSkillsDeficiencies",
          instruction: `${baseContext}\n\nThis text goes into the "Social Skill Deficiencies" textarea. Write 1-3 sentences about areas needing improvement: conflict patterns, authority challenges, peer difficulties, communication issues.`,
        },
        {
          field: "incidents",
          instruction: `${baseContext}\n\nThis text goes into the "Incidents" textarea. Write 1-3 sentences about any significant incidents or behavioral concerns this period. If no incidents occurred, simply state that.`,
        },
        {
          field: "recommendations",
          instruction: `${baseContext}\n\nThis text goes into the "Recommendations" textarea. Write 2-3 sentences about what this resident should focus on next period, level advancement readiness, and suggested interventions.`,
        },
      ];

      const updates: Partial<ReportData> = {};
      for (const { field, instruction } of prompts) {
        try {
          const response = await aiService.queryData(instruction, {
            youth,
            period: periodLabel,
            caseNotes: caseNotesText,
          });
          if (response.success && response.data?.answer) {
            updates[field] = response.data.answer as string;
          }
        } catch (err) {
          logger.error(`Auto-fill failed for ${field}:`, err);
        }
      }

      if (Object.keys(updates).length > 0) {
        setData((prev) => ({ ...prev, ...updates }));
        toast({
          title: "Narrative Generated",
          description: "All text sections have been populated from case notes and ratings data. Review and edit as needed.",
        });
      } else {
        toast({
          title: "AI Unavailable",
          description: "Could not reach AI service. Fill in the text sections manually.",
          variant: "destructive",
        });
      }
    } catch (err) {
      logger.error("Auto-fill error:", err);
      toast({ title: "Error", description: "Failed to auto-fill narrative.", variant: "destructive" });
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handlePrint = () => {
    generateReport();
    setTimeout(() => window.print(), 150);
  };

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    await exportElementToPDF(
      printRef.current,
      `${buildReportFilename(youth, titleMap[reportType])}.pdf`
    );
  };

  const handleExportDocx = async () => {
    if (!printRef.current) return;
    await exportElementToDocx(
      printRef.current,
      `${buildReportFilename(youth, titleMap[reportType])}.docx`
    );
  };

  const set = (field: keyof ReportData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setData((prev) => ({ ...prev, [field]: e.target.value }));

  useEffect(() => {
    if (!onAutoExportComplete || autoExported || !printRef.current) return;

    const timerId = window.setTimeout(async () => {
      if (!printRef.current) return;
      try {
        await handleExportPDF();
        setAutoExported(true);
        onAutoExportComplete();
      } catch (error) {
        logger.error("Error auto-generating evaluation PDF:", error);
      }
    }, 300);

    return () => window.clearTimeout(timerId);
  }, [onAutoExportComplete, autoExported, reportType, youth.id]);

  return (
    <div className="space-y-6">
      {/* Controls — hidden when printing */}
      <Card className="border-2 border-primary/20 eval-print-hide">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Progress Evaluation Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Period toggle */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(["weekly", "monthly"] as EvalReportType[]).map((t) => (
              <button
                key={t}
                onClick={() => setReportType(t)}
                className={`px-4 py-2 rounded-lg border-2 font-medium capitalize transition-colors ${
                  reportType === t
                    ? "bg-red-700 text-white border-red-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-red-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* AI auto-fill */}
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Auto-Fill Narrative Sections</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Pulls case notes, daily ratings, and eval scores for the period and uses AI to populate
                Social Skills Strengths, Deficiencies, Incidents, and Recommendations.
              </p>
            </div>
            <Button
              onClick={handleAutoFill}
              disabled={loading || isAutoFilling}
              className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {isAutoFilling ? "Populating..." : "Populate Report"}
            </Button>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Evaluated By</Label>
              <Input value={data.evaluatedBy} onChange={set("evaluatedBy")} placeholder="Staff name" className="mt-1" />
            </div>
            <div>
              <Label>Pass Schedule For</Label>
              <Input value={data.passScheduleFor} onChange={set("passScheduleFor")} placeholder="Activity / location" className="mt-1" />
            </div>
            <div>
              <Label>With Whom</Label>
              <Input value={data.passWithWhom} onChange={set("passWithWhom")} placeholder="Person accompanying" className="mt-1" />
            </div>
          </div>

          {/* Narrative text fields */}
          <div className="grid grid-cols-1 gap-4 mt-4">
            <div>
              <Label>Social Skills Strengths</Label>
              <Textarea value={data.socialSkillsStrengths} onChange={set("socialSkillsStrengths")} placeholder="Describe strengths..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Social Skill Deficiencies</Label>
              <Textarea value={data.socialSkillsDeficiencies} onChange={set("socialSkillsDeficiencies")} placeholder="Areas for improvement..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Incidents This Period</Label>
              <Textarea value={data.incidents} onChange={set("incidents")} placeholder="Document any incidents..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Recommendations and Comments</Label>
              <Textarea value={data.recommendations} onChange={set("recommendations")} placeholder="Recommendations..." className="mt-1" rows={2} />
            </div>
            <div>
              <Label>Self-Esteem Rating (manual)</Label>
              <Input
                type="number"
                min={0}
                max={4}
                step={0.1}
                value={data.selfEsteem || ""}
                onChange={(e) => setData((prev) => ({ ...prev, selfEsteem: parseFloat(e.target.value) || 0 }))}
                placeholder="0–4"
                className="mt-1 w-32"
              />
            </div>
          </div>

          {/* Export / print actions */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <Button onClick={handlePrint} disabled={loading} className="flex items-center gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={loading}>Export PDF</Button>
            <Button variant="outline" onClick={handleExportDocx} disabled={loading}>Export Word</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Printable Form — matches the physical document ── */}
      <div ref={printRef} className="eval-print-form bg-white text-black p-10 font-serif text-sm leading-relaxed">

        {/* Header */}
        <div className="text-center mb-5">
          <p className="text-xl font-bold">Heartland Boys Home</p>
          <p className="text-base font-bold mt-1">{titleMap[reportType]}</p>
        </div>

        {/* Name / Date row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="font-bold">Name: </span>
            <span className="inline-block border-b border-black min-w-[160px] pb-0.5">
              {youth.firstName} {youth.lastName}
            </span>
          </div>
          <div>
            <span className="font-bold">Evaluation Date: </span>
            <span className="font-bold">{data.evaluationPeriod || "—"}</span>
          </div>
        </div>

        {/* Rating Scale */}
        <div className="mb-4">
          <p className="font-bold text-center mb-1">Rating Scale</p>
          <div className="grid grid-cols-4 text-center text-xs border border-black">
            {["1=Poor", "2=Below Average", "3=Average", "4=Above Average"].map((s) => (
              <div key={s} className="border-r last:border-r-0 border-black px-2 py-1">{s}</div>
            ))}
          </div>
        </div>

        {/* Rating rows */}
        {[
          { label: "Relationship and Interaction with Peer:", value: data.peerInteraction },
          { label: "Relationship and Interaction with Adults:", value: data.adultInteraction },
          { label: "Investment Level in Program and his own personal Growth:", value: data.investmentLevel },
          { label: "How does the Resident deal with Authority and Structure:", value: data.dealAuthority },
          { label: "Level of self-esteem and Motivation:", value: data.selfEsteem },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between border-b border-gray-300 py-2">
            <span className="font-bold">{label}</span>
            <span className="font-bold ml-4 whitespace-nowrap">
              Rating: <span className="inline-block border-b border-black min-w-[80px] text-center">
                {value > 0 ? ratingLabel(value) : ""}
              </span>
            </span>
          </div>
        ))}

        {/* Evaluated by */}
        {data.evaluatedBy && (
          <div className="mt-3 border-b border-gray-300 py-1">
            <span className="font-bold">Evaluated By: </span>{data.evaluatedBy}
          </div>
        )}

        {/* Text sections */}
        {[
          { label: "Social Skills Strengths:", value: data.socialSkillsStrengths },
          { label: "Social Skill Deficiencies:", value: data.socialSkillsDeficiencies },
          { label: "Incidents this period:", value: data.incidents },
          { label: "Recommendations and Comments:", value: data.recommendations },
        ].map(({ label, value }) => (
          <div key={label} className="mt-4">
            <p className="font-bold">{label}</p>
            <div className="mt-1 space-y-1">
              {value ? (
                <p className="pl-2">{value}</p>
              ) : (
                <>
                  <div className="border-b border-black h-5 w-full" />
                  <div className="border-b border-black h-5 w-full" />
                </>
              )}
            </div>
          </div>
        ))}

        {/* Pass Schedule table */}
        <div className="mt-6">
          <table className="w-full border border-black border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-black px-3 py-3 w-1/2">
                  <span className="font-bold">Pass Schedule for: </span>
                  {data.passScheduleFor || <span className="inline-block border-b border-black w-32" />}
                </td>
                <td className="border border-black px-3 py-3 w-1/2">
                  <span className="font-bold">With Whom: </span>
                  {data.passWithWhom || <span className="inline-block border-b border-black w-32" />}
                </td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-8">
                  <span className="font-bold">Director's Signature</span>
                </td>
                <td className="border border-black px-3 py-8">
                  <span className="font-bold">Resident's Signature</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pass and sign out information */}
        <div className="mt-6">
          <p className="text-center font-bold mb-1">Pass and sign out information</p>
          <table className="w-full border border-black border-collapse text-xs">
            <thead>
              <tr>
                {["Date/Day", "Time Out", "Signature", "Time In", "Signature"].map((h) => (
                  <th key={h} className="border border-black px-2 py-1 font-bold text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  {[0, 1, 2, 3, 4].map((c) => (
                    <td key={c} className="border border-black px-2 py-4" />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body > *:not(.eval-print-form) { display: none !important; }
            .eval-print-hide { display: none !important; }
            .eval-print-form {
              display: block !important;
              position: static !important;
              margin: 0 !important;
              padding: 0.5in !important;
              width: 100% !important;
              font-size: 11pt !important;
              color: black !important;
              background: white !important;
              font-family: 'Times New Roman', serif !important;
            }
            @page { size: letter; margin: 0.75in; }
          }
        `
      }} />
    </div>
  );
};
