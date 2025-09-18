import { useEffect, useMemo, useRef, useState } from 'react';
import { Youth, DailyRating, BehaviorPoints, ProgressNote } from '@/types/app-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { exportElementToPDF, exportElementToDocx } from '@/utils/export';
import { fetchDailyRatings, fetchBehaviorPoints, fetchProgressNotes } from '@/utils/local-storage-utils';
import { getDailyRatingsByYouth, getBehaviorPointsByYouth, getProgressNotesByYouth } from '@/lib/api';
import { saveDpnComments, fetchDpnCommentsInRange } from '@/utils/local-storage-utils';
import { summarizeReport } from '@/lib/aiClient';

export function DpnReport({ youth, variant, onAutoExportComplete }: { youth: Youth; variant: 'weekly' | 'biweekly' | 'monthly'; onAutoExportComplete?: () => void }) {
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [comments, setComments] = useState({ peer: '', adult: '', investment: '', authority: '', strengths: '', deficiencies: '' });
  const [averages, setAverages] = useState({ peer: 0, adult: 0, investment: 0, authority: 0 });
  const [ratingsInRange, setRatingsInRange] = useState<DailyRating[]>([]);
  const [aiNarrative, setAiNarrative] = useState<string>("");
  const [autoExported, setAutoExported] = useState(false);
  const [pointsInRange, setPointsInRange] = useState<BehaviorPoints[]>([]);
  const [notesInRange, setNotesInRange] = useState<ProgressNote[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  // Default date range
  useEffect(() => {
    const now = new Date();
    let start: Date; let end: Date;
    if (variant === 'weekly') {
      start = startOfWeek(now); end = endOfWeek(now);
    } else if (variant === 'biweekly') {
      end = now; start = subDays(now, 14);
    } else {
      start = startOfMonth(now); end = endOfMonth(now);
    }
    setPeriodFrom(format(start, 'yyyy-MM-dd'));
    setPeriodTo(format(end, 'yyyy-MM-dd'));
  }, [variant]);

  const loadRatings = async (start: Date, end: Date) => {
    try {
      const api = await getDailyRatingsByYouth(youth.id);
      return api.filter(r => r.date && new Date(r.date) >= start && new Date(r.date) <= end);
    } catch {
      const local = fetchDailyRatings(youth.id);
      return local.filter(r => r.date && new Date(r.date) >= start && new Date(r.date) <= end);
    }
  };

  const loadPoints = async (start: Date, end: Date) => {
    try {
      const api = await getBehaviorPointsByYouth(youth.id);
      return api.filter(p => p.date && new Date(p.date) >= start && new Date(p.date) <= end);
    } catch {
      const local = fetchBehaviorPoints(youth.id);
      return local.filter(p => p.date && new Date(p.date) >= start && new Date(p.date) <= end);
    }
  };

  const loadNotes = async (start: Date, end: Date) => {
    try {
      const api = await getProgressNotesByYouth(youth.id);
      return api.filter(n => n.date && new Date(n.date) >= start && new Date(n.date) <= end) as any as ProgressNote[];
    } catch {
      const local = fetchProgressNotes(youth.id) as any as ProgressNote[];
      return local.filter(n => n.date && new Date(n.date) >= start && new Date(n.date) <= end);
    }
  };

  const recalc = async () => {
    if (!periodFrom || !periodTo) return;
    const start = new Date(periodFrom); const end = new Date(periodTo);
    const [ratings, points, notes] = await Promise.all([
      loadRatings(start, end),
      loadPoints(start, end),
      loadNotes(start, end)
    ]);
    const avg = (field: keyof DailyRating) => {
      const vals = ratings.map(r => Number(r[field]) || 0).filter(v => v > 0);
      return vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0;
    };
    setAverages({
      peer: avg('peerInteraction'),
      adult: avg('adultInteraction'),
      investment: avg('investmentLevel'),
      authority: avg('dealAuthority'),
    });
    setRatingsInRange(ratings);
    setPointsInRange(points);
    setNotesInRange(notes);
  };

  // Recalculate when dates change (initially and on user edits)
  useEffect(() => {
    if (periodFrom && periodTo) {
      recalc();
    }
  }, [periodFrom, periodTo]);

  // Kick off AI summary after ratings are loaded; include fallback timeout export
  useEffect(() => {
    let timeoutId: any;
    const ready = !!periodFrom && !!periodTo && !!printRef.current && ratingsInRange !== undefined;
    if (!ready || autoExported) return;

    // Start AI generation in background
    const runAI = async () => {
      try {
        const variantToType = variant === 'weekly' ? 'dpnWeekly' : variant === 'biweekly' ? 'dpnBiWeekly' : 'dpnMonthly';
        const aiText = await summarizeReport({
          youth,
          reportType: variantToType,
          period: { startDate: new Date(periodFrom).toISOString(), endDate: new Date(periodTo).toISOString() },
          data: { dailyRatings: ratingsInRange, behaviorPoints: pointsInRange, progressNotes: notesInRange }
        });
        if (aiText) setAiNarrative(aiText);
      } catch (e) {
        // AI optional; proceed without blocking
        console.warn('AI narrative unavailable for DPN; proceeding without it');
      }
    };

    runAI();

    // Export after AI completes or after 5s, whichever first
    const tryExport = async () => {
      if (autoExported) return;
      try {
        // Slight delay to ensure DOM renders AI section if present
        setTimeout(async () => {
          if (!printRef.current) return;
          await exportPDF();
          setAutoExported(true);
          onAutoExportComplete && onAutoExportComplete();
        }, 300);
      } catch (error) {
        console.error("Error auto-generating DPN PDF:", error);
      }
    };

    // Fallback timer
    timeoutId = setTimeout(tryExport, 5000);

    // When AI finishes, export early and clear fallback
    if (aiNarrative) {
      clearTimeout(timeoutId);
      tryExport();
    }

    return () => clearTimeout(timeoutId);
  }, [ratingsInRange, pointsInRange, notesInRange, periodFrom, periodTo, aiNarrative, autoExported, variant, youth]);

  const handleSaveComments = () => {
    if (!periodFrom || !periodTo) return;
    saveDpnComments({
      youth_id: youth.id,
      periodStart: new Date(periodFrom).toISOString(),
      periodEnd: new Date(periodTo).toISOString(),
      variant,
      ...comments,
    });
  };

  const monthlySummary = useMemo(() => {
    if (variant !== 'monthly' || !periodFrom || !periodTo) return null;
    const start = new Date(periodFrom); const end = new Date(periodTo);
    const entries = fetchDpnCommentsInRange(youth.id, start, end);
    if (!entries.length) return null;
    const join = (arr: string[]) => arr.filter(Boolean).map(s => `- ${s}`).join('\n');
    return {
      peer: join(entries.map(e => e.peer)),
      adult: join(entries.map(e => e.adult)),
      investment: join(entries.map(e => e.investment)),
      authority: join(entries.map(e => e.authority)),
      strengths: join(entries.map(e => e.strengths || '')),
      deficiencies: join(entries.map(e => e.deficiencies || '')),
    };
  }, [variant, youth.id, periodFrom, periodTo]);

  const exportPDF = async () => {
    if (!printRef.current) return;
    try {
      await exportElementToPDF(printRef.current, `DPN-${variant}-${youth.lastName || 'report'}.pdf`);
      // Optional: Add toast notification here if needed
    } catch (error) {
      console.error("Error exporting DPN PDF:", error);
    }
  };
  const exportDOCX = async () => {
    if (!printRef.current) return;
    await exportElementToDocx(printRef.current, `DPN-${variant}-${youth.lastName || 'report'}.docx`);
  };

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <CardHeader>
          <CardTitle>DPN {variant === 'weekly' ? 'Weekly' : variant === 'biweekly' ? 'Bi-Weekly' : 'Monthly'} Progress Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>From</Label>
              <Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Peer Interaction (avg): {averages.peer || 0}</Label>
              <Textarea placeholder="Comment on peer interaction" value={comments.peer} onChange={e=>setComments({...comments, peer:e.target.value})} />
            </div>
            <div>
              <Label>Adult Interaction (avg): {averages.adult || 0}</Label>
              <Textarea placeholder="Comment on adult interaction" value={comments.adult} onChange={e=>setComments({...comments, adult:e.target.value})} />
            </div>
            <div>
              <Label>Investment Level (avg): {averages.investment || 0}</Label>
              <Textarea placeholder="Comment on investment level" value={comments.investment} onChange={e=>setComments({...comments, investment:e.target.value})} />
            </div>
            <div>
              <Label>Deal with Authority (avg): {averages.authority || 0}</Label>
              <Textarea placeholder="Comment on authority/structure" value={comments.authority} onChange={e=>setComments({...comments, authority:e.target.value})} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>Social Skills Strengths</Label>
              <Textarea placeholder="Strengths..." value={comments.strengths} onChange={e=>setComments({...comments, strengths:e.target.value})} />
            </div>
            <div>
              <Label>Social Skill Deficiencies</Label>
              <Textarea placeholder="Deficiencies..." value={comments.deficiencies} onChange={e=>setComments({...comments, deficiencies:e.target.value})} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSaveComments}>Save Comments</Button>
            <Button variant="outline" onClick={exportPDF}>Export PDF</Button>
            <Button variant="outline" onClick={exportDOCX}>Export DOCX</Button>
          </div>
        </CardContent>
      </Card>

      {/* Printable Section */}
      <div ref={printRef} className="print-section bg-white text-black p-8 rounded-lg border">
        <div className="text-center mb-6">
          <img src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`} alt="Heartland Boys Home Logo" className="h-14 mx-auto mb-2 object-contain" />
          <h1 className="text-2xl font-bold mb-2">Resident {variant === 'monthly' ? 'Monthly' : variant === 'biweekly' ? 'Bi-Weekly' : 'Weekly'} Progress Evaluation</h1>
          <h2 className="text-xl font-semibold">Heartland Boys Home</h2>
        </div>

        <div className="mb-4 ml-1">
          <div><strong>Name:</strong> {youth.firstName} {youth.lastName}</div>
          <div><strong>Evaluation Dates:</strong> {format(new Date(periodFrom || new Date()), 'M/d/yyyy')} - {format(new Date(periodTo || new Date()), 'M/d/yyyy')}</div>
          <div className="mt-2 text-sm">Rating Scale: 1=Poor 2=Below Average 3=Average 4=Above Average</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between font-semibold"><span>Relationship and Interaction with Peer</span><span>Rating: {averages.peer || 0}</span></div>
            <p className="mt-1 ml-1 whitespace-pre-wrap">{(monthlySummary?.peer || comments.peer) || '—'}</p>
          </div>
          <div>
            <div className="flex justify-between font-semibold"><span>Relationship and Interaction with Adults</span><span>Rating: {averages.adult || 0}</span></div>
            <p className="mt-1 ml-1 whitespace-pre-wrap">{(monthlySummary?.adult || comments.adult) || '—'}</p>
          </div>
          <div>
            <div className="flex justify-between font-semibold"><span>Investment Level in Program and Personal Growth</span><span>Rating: {averages.investment || 0}</span></div>
            <p className="mt-1 ml-1 whitespace-pre-wrap">{(monthlySummary?.investment || comments.investment) || '—'}</p>
          </div>
          <div>
            <div className="flex justify-between font-semibold"><span>How the Resident Deals with Authority and Structure</span><span>Rating: {averages.authority || 0}</span></div>
            <p className="mt-1 ml-1 whitespace-pre-wrap">{(monthlySummary?.authority || comments.authority) || '—'}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="font-semibold">Social Skills Strengths:</div>
          <p className="ml-1 whitespace-pre-wrap">{(monthlySummary?.strengths || comments.strengths) || '—'}</p>
        </div>
        <div className="mt-2">
          <div className="font-semibold">Social Skill Deficiencies:</div>
          <p className="ml-1 whitespace-pre-wrap">{(monthlySummary?.deficiencies || comments.deficiencies) || '—'}</p>
        </div>

        {aiNarrative && (
          <div className="mt-6">
            <div className="font-semibold">AI-Assisted Narrative</div>
            <p className="ml-1 whitespace-pre-wrap">{aiNarrative}</p>
          </div>
        )}
      </div>
    </div>
  );
}
