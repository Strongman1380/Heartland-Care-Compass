import { useEffect, useMemo, useRef, useState } from 'react';
import { Youth, DailyRating } from '@/types/app-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { exportElementToPDF, exportElementToDocx } from '@/utils/export';
import { fetchDailyRatings } from '@/utils/local-storage-utils';
import { getDailyRatingsByYouth } from '@/lib/api';
import { saveDpnComments, fetchDpnCommentsInRange } from '@/utils/local-storage-utils';

export function DpnReport({ youth, variant }: { youth: Youth; variant: 'weekly' | 'biweekly' | 'monthly' }) {
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [comments, setComments] = useState({ peer: '', adult: '', investment: '', authority: '', strengths: '', deficiencies: '' });
  const [averages, setAverages] = useState({ peer: 0, adult: 0, investment: 0, authority: 0 });
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

  const recalc = async () => {
    if (!periodFrom || !periodTo) return;
    const start = new Date(periodFrom); const end = new Date(periodTo);
    const ratings = await loadRatings(start, end);
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
  };

  useEffect(() => { recalc(); }, [periodFrom, periodTo]);

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
    await exportElementToPDF(printRef.current, `DPN-${variant}-${youth.lastName || 'report'}.pdf`);
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
      </div>
    </div>
  );
}

