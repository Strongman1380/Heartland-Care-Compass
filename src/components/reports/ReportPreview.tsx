import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GenerateReportOptions, ReportPeriod, ReportType } from "./ReportGenerationForm";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";

type NoteRow = {
  id: string;
  date: string | null;
  category: string | null;
  note: string | null;
  rating: number | null;
  staff: string | null;
};

type RatingRow = {
  date: string;
  peer_interaction: number | null;
  adult_interaction: number | null;
  investment_level: number | null;
  deal_authority: number | null;
};

type PointsRow = {
  date: string | null;
  totalpoints: number | null;
  comments: string | null;
};

interface ReportPreviewProps {
  youthId: string;
  youth: any;
  options: GenerateReportOptions;
}

function resolveRange(period: ReportPeriod, start?: string, end?: string) {
  const today = new Date();
  let from = new Date("2000-01-01");
  let to = today;
  if (period === "last7") from = subDays(today, 7);
  if (period === "last30") from = subDays(today, 30);
  if (period === "last90") from = subDays(today, 90);
  if (period === "custom" && start && end) {
    from = new Date(start);
    to = new Date(end);
  }
  return {
    fromISO: format(from, "yyyy-MM-dd"),
    toISO: format(to, "yyyy-MM-dd"),
    label: `${format(from, "M/d/yy")} - ${format(to, "M/d/yy")}`,
  };
}

function summarizeNotes(notes: NoteRow[]) {
  const text = notes.map(n => `- ${format(new Date(n.date || Date.now()), "M/d")} ${n.category ? `[${n.category}] `: ""}${n.note || ""}`).join("\n");
  // Simple, non-AI fallback summary: take first few highlights
  const highlights = notes.slice(0, 5).map(n => `${n.category || "General"}: ${n.note?.slice(0, 140) || ""}`).join(" \n");
  return { text, highlights };
}

export const ReportPreview = ({ youthId, youth, options }: ReportPreviewProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [ratings, setRatings] = useState<RatingRow[]>([]);
  const [points, setPoints] = useState<PointsRow[]>([]);
  const [aiText, setAiText] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const range = useMemo(() => resolveRange(options.period, options.startDate, options.endDate), [options]);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);

        const qFrom = range.fromISO;
        const qTo = range.toISO;

        const [notesRes, ratingsRes, pointsRes] = await Promise.all([
          options.include.notes
            ? supabase.from("notes").select("id,date,category,note,rating,staff").eq("youth_id", youthId).gte("date", qFrom).lte("date", qTo).order("date", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          options.include.points || options.reportType === "progress"
            ? supabase.from("daily_ratings").select("date,peer_interaction,adult_interaction,investment_level,deal_authority").eq("youth_id", youthId).gte("date", qFrom).lte("date", qTo).order("date", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          options.include.points
            ? supabase.from("points").select("date,totalpoints,comments").eq("youth_id", youthId).gte("date", qFrom).lte("date", qTo).order("date", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (!cancelled) {
          if (notesRes.error) throw notesRes.error;
          if (ratingsRes.error) throw ratingsRes.error;
          if (pointsRes.error) throw pointsRes.error;
          setNotes(notesRes.data as NoteRow[]);
          setRatings(ratingsRes.data as RatingRow[]);
          setPoints(pointsRes.data as PointsRow[]);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load report data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [youthId, options, range.fromISO, range.toISO]);

  const avg = (arr: (number | null)[]) => {
    const vals = arr.filter((v): v is number => typeof v === 'number');
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  };

  const ratingsSummary = useMemo(() => ({
    peer: avg(ratings.map(r => r.peer_interaction)),
    adult: avg(ratings.map(r => r.adult_interaction)),
    invest: avg(ratings.map(r => r.investment_level)),
    authority: avg(ratings.map(r => r.deal_authority)),
  }), [ratings]);

  const pointsTotal = useMemo(() => points.reduce((s, p) => s + (p.totalpoints || 0), 0), [points]);
  const notesSummary = useMemo(() => summarizeNotes(notes), [notes]);

  const canUseAI = options.reportType !== 'progress' && options.include.notes;

  const runAI = async () => {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiText("");
      const resp = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: options.reportType,
          youth,
          period: { from: range.fromISO, to: range.toISO, label: range.label },
          notes,
          ratings: ratingsSummary,
          pointsTotal,
        })
      });
      if (resp.status === 501) {
        setAiError('AI not configured. Set OPENAI_API_KEY in Vercel project settings.');
        return;
      }
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(t || 'Failed to generate AI summary');
      }
      const data = await resp.json();
      setAiText(data.summary || '');
    } catch (e: any) {
      setAiError(e?.message || String(e));
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {options.reportType === "comprehensive" && "Comprehensive Report Preview"}
          {options.reportType === "summary" && "Summary Report Preview"}
          {options.reportType === "progress" && "Progress Report Preview"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-gray-600">Loading report data...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">Period: {range.label}</div>

            {options.include.profile && youth && (
              <section className="space-y-1">
                <h3 className="font-semibold">Youth Profile</h3>
                <p>Name: {youth.firstName} {youth.lastName}</p>
                <p>Level: {youth.level ?? 'N/A'} • Points: {youth.pointTotal ?? 0}</p>
                <p>Admission: {youth.admissionDate ? format(new Date(youth.admissionDate), 'M/d/yyyy') : 'N/A'}</p>
              </section>
            )}

            {(options.include.points || options.reportType === "progress") && (
              <section className="space-y-1">
                <h3 className="font-semibold">Ratings & Points</h3>
                <p>Peer: {ratingsSummary.peer} • Adult: {ratingsSummary.adult} • Investment: {ratingsSummary.invest} • Authority: {ratingsSummary.authority}</p>
                <p>Total Points in Period: {pointsTotal.toLocaleString()}</p>
              </section>
            )}

            {options.include.notes && (
              <section className="space-y-2">
                <h3 className="font-semibold">Progress Notes</h3>
                {notes.length === 0 ? (
                  <p className="text-gray-600">No notes found for this period.</p>
                ) : (
                  <>
                    <p className="text-gray-700 whitespace-pre-wrap">{notesSummary.highlights}</p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600">Show all notes</summary>
                      <pre className="whitespace-pre-wrap text-sm mt-2 bg-gray-50 p-2 rounded border">{notesSummary.text}</pre>
                    </details>
                  </>
                )}
                {canUseAI && (
                  <div className="pt-2">
                    <Button onClick={runAI} disabled={aiLoading}>
                      {aiLoading ? 'Generating AI Narrative…' : 'AI Draft Narrative'}
                    </Button>
                    {aiError && <p className="text-red-600 text-sm mt-2">{aiError}</p>}
                    {aiText && (
                      <div className="mt-3 p-3 bg-yellow-50 border rounded">
                        <h4 className="font-medium mb-1">AI Narrative</h4>
                        <p className="whitespace-pre-wrap text-sm">{aiText}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Placeholder for other sections; can be populated similarly */}
            {options.include.assessment && (
              <section>
                <h3 className="font-semibold">Assessments</h3>
                <p className="text-gray-600">Coming soon: include risk assessments and worksheets.</p>
              </section>
            )}

            {options.include.successPlan && (
              <section>
                <h3 className="font-semibold">Success Plan</h3>
                <p className="text-gray-600">Coming soon: pull structured goals and progress.</p>
              </section>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
