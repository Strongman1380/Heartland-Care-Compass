import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Users,
  FileText,
  ClipboardList,
  Activity,
  AlertTriangle,
  TrendingUp,
  ArrowLeft,
  Shield,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  youthService,
  behaviorPointsService,
  caseNotesService,
  dailyRatingsService,
  type Youth,
  type BehaviorPoints,
  type CaseNotes,
  type DailyRatings,
} from '@/integrations/firebase/services';

type Timeframe = 'week' | 'month' | 'quarter' | 'year';

const HEARTLAND_CHART_COLORS = {
  burgundy: '#b91c1c',
  burgundyDark: '#991b1b',
  burgundyDeep: '#7f1d1d',
  amber: '#d97706',
  amberSoft: '#f59e0b',
  neutral: '#6b7280',
  slate: '#475569',
};

const RISK_ORDER = ['Very Low', 'Low', 'Low Medium', 'Medium', 'Medium High', 'High', 'Very High'];
const RISK_TO_SCORE: Record<string, number> = {
  'Very Low': 1,
  Low: 2,
  'Low Medium': 3,
  Medium: 4,
  'Medium High': 5,
  High: 6,
  'Very High': 7,
  Moderate: 4,
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeRisk = (risk: string | null | undefined): string | null => {
  if (!risk) return null;
  if (risk === 'Moderate') return 'Medium';
  return risk;
};

const isInRange = (d: Date | null, startDate: Date): boolean => !!d && d >= startDate;

const monthKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const weekKey = (d: Date): string => {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  copy.setDate(copy.getDate() + diff);
  return `${copy.getFullYear()}-${String(copy.getMonth() + 1).padStart(2, '0')}-${String(copy.getDate()).padStart(2, '0')}`;
};

const formatMonthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

const formatWeekLabel = (key: string): string => {
  const d = parseDate(key);
  if (!d) return key;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const extractRealColors = (value: unknown): string[] => {
  if (!value || typeof value !== 'string') return [];
  const allowed = ['blue', 'gold', 'green', 'orange'];
  return value
    .toLowerCase()
    .split(/[,/&|\s]+/)
    .map((v) => v.trim())
    .filter((v) => allowed.includes(v))
    .map((v) => v.charAt(0).toUpperCase() + v.slice(1));
};

const getTimeframeStart = (timeframe: Timeframe): Date => {
  const now = new Date();
  const start = new Date(now);
  if (timeframe === 'week') {
    start.setDate(now.getDate() - 7);
  } else if (timeframe === 'month') {
    start.setMonth(now.getMonth() - 1);
  } else if (timeframe === 'quarter') {
    start.setMonth(now.getMonth() - 3);
  } else {
    start.setFullYear(now.getFullYear() - 1);
  }
  return start;
};

const AssessmentKPIDashboard = () => {
  const navigate = useNavigate();

  const [youths, setYouths] = useState<Youth[]>([]);
  const [allBehaviorPoints, setAllBehaviorPoints] = useState<BehaviorPoints[]>([]);
  const [allCaseNotes, setAllCaseNotes] = useState<CaseNotes[]>([]);
  const [allDailyRatings, setAllDailyRatings] = useState<DailyRatings[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        const [youthData, pointsData, notesData] = await Promise.all([
          youthService.getAll(),
          behaviorPointsService.getAll(),
          caseNotesService.getAll(),
        ]);

        setYouths(youthData);
        setAllBehaviorPoints(pointsData);
        setAllCaseNotes(notesData);

        const ratingsPromises = youthData.map((youth) => dailyRatingsService.getByYouthId(youth.id).catch(() => []));
        const ratings = (await Promise.all(ratingsPromises)).flat();
        setAllDailyRatings(ratings);
      } catch (error) {
        console.error('Error loading KPI data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const analytics = useMemo(() => {
    const startDate = getTimeframeStart(timeframe);

    const filteredNotes = allCaseNotes.filter((note) => isInRange(parseDate(note.date || note.createdAt), startDate));
    const filteredPoints = allBehaviorPoints.filter((point) => isInRange(parseDate(point.date || point.createdAt), startDate));
    const filteredRatings = allDailyRatings.filter((rating) => isInRange(parseDate(rating.date || rating.createdAt), startDate));

    const documentedYouth = new Set<string>();
    filteredNotes.forEach((x) => x.youth_id && documentedYouth.add(x.youth_id));
    filteredPoints.forEach((x) => x.youth_id && documentedYouth.add(x.youth_id));
    filteredRatings.forEach((x) => x.youth_id && documentedYouth.add(x.youth_id));

    const domainTotals = { peer: 0, adult: 0, investment: 0, authority: 0, count: 0 };
    filteredRatings.forEach((rating) => {
      if (rating.peerInteraction != null) {
        domainTotals.peer += rating.peerInteraction || 0;
        domainTotals.adult += rating.adultInteraction || 0;
        domainTotals.investment += rating.investmentLevel || 0;
        domainTotals.authority += rating.dealAuthority || 0;
        domainTotals.count += 1;
      }
    });

    const avgDomain = {
      peer: domainTotals.count ? Number((domainTotals.peer / domainTotals.count).toFixed(2)) : 0,
      adult: domainTotals.count ? Number((domainTotals.adult / domainTotals.count).toFixed(2)) : 0,
      investment: domainTotals.count ? Number((domainTotals.investment / domainTotals.count).toFixed(2)) : 0,
      authority: domainTotals.count ? Number((domainTotals.authority / domainTotals.count).toFixed(2)) : 0,
    };

    const riskCounts: Record<string, number> = Object.fromEntries(RISK_ORDER.map((r) => [r, 0]));
    const riskScores: number[] = [];

    youths.forEach((youth) => {
      const risk = normalizeRisk(youth.hyrnaRiskLevel);
      if (risk && riskCounts[risk] !== undefined) riskCounts[risk] += 1;

      if (typeof youth.hyrnaScore === 'number' && Number.isFinite(youth.hyrnaScore)) {
        riskScores.push(youth.hyrnaScore);
      } else if (risk && RISK_TO_SCORE[risk]) {
        riskScores.push(RISK_TO_SCORE[risk]);
      }
    });

    const riskDistribution = RISK_ORDER.map((name) => ({ name, value: riskCounts[name] })).filter((x) => x.value > 0);
    const youthWithRiskData = youths.filter((y) => y.hyrnaRiskLevel || y.hyrnaScore != null || y.hyrnaAssessmentDate).length;
    const highRiskYouth = ['Medium High', 'High', 'Very High'].reduce((sum, key) => sum + (riskCounts[key] || 0), 0);

    const levelMap = new Map<number, number>();
    youths.forEach((y) => {
      const level = typeof y.level === 'number' ? y.level : 0;
      levelMap.set(level, (levelMap.get(level) || 0) + 1);
    });
    const levelDistribution = Array.from(levelMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, count]) => ({ level: `L${level}`, count }));

    const realColorsCount: Record<string, number> = { Blue: 0, Gold: 0, Green: 0, Orange: 0 };
    youths.forEach((youth) => {
      extractRealColors(youth.realColorsResult).forEach((color) => {
        realColorsCount[color] = (realColorsCount[color] || 0) + 1;
      });
    });
    const realColorsDistribution = Object.entries(realColorsCount)
      .map(([name, value]) => ({ name, value }))
      .filter((x) => x.value > 0);

    const docsByMonth: Record<string, { notes: number; ratings: number; points: number }> = {};
    filteredNotes.forEach((item) => {
      const d = parseDate(item.date || item.createdAt);
      if (!d) return;
      const key = monthKey(d);
      docsByMonth[key] = docsByMonth[key] || { notes: 0, ratings: 0, points: 0 };
      docsByMonth[key].notes += 1;
    });
    filteredRatings.forEach((item) => {
      const d = parseDate(item.date || item.createdAt);
      if (!d) return;
      const key = monthKey(d);
      docsByMonth[key] = docsByMonth[key] || { notes: 0, ratings: 0, points: 0 };
      docsByMonth[key].ratings += 1;
    });
    filteredPoints.forEach((item) => {
      const d = parseDate(item.date || item.createdAt);
      if (!d) return;
      const key = monthKey(d);
      docsByMonth[key] = docsByMonth[key] || { notes: 0, ratings: 0, points: 0 };
      docsByMonth[key].points += 1;
    });

    const documentationTrend = Object.entries(docsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, counts]) => ({
        month: formatMonthLabel(month),
        notes: counts.notes,
        ratings: counts.ratings,
        points: counts.points,
      }));

    const pointsByMonth: Record<string, { total: number; count: number }> = {};
    filteredPoints.forEach((point) => {
      const d = parseDate(point.date || point.createdAt);
      if (!d) return;
      const key = monthKey(d);
      pointsByMonth[key] = pointsByMonth[key] || { total: 0, count: 0 };
      pointsByMonth[key].total += point.totalPoints || 0;
      pointsByMonth[key].count += 1;
    });
    const pointsTrend = Object.entries(pointsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([month, data]) => ({
        month: formatMonthLabel(month),
        averagePoints: data.count ? Number((data.total / data.count).toFixed(1)) : 0,
      }));

    const ratingsByWeek: Record<string, { peer: number; adult: number; investment: number; authority: number; count: number }> = {};
    filteredRatings.forEach((rating) => {
      const d = parseDate(rating.date || rating.createdAt);
      if (!d) return;
      const key = weekKey(d);
      ratingsByWeek[key] = ratingsByWeek[key] || { peer: 0, adult: 0, investment: 0, authority: 0, count: 0 };
      ratingsByWeek[key].peer += rating.peerInteraction || 0;
      ratingsByWeek[key].adult += rating.adultInteraction || 0;
      ratingsByWeek[key].investment += rating.investmentLevel || 0;
      ratingsByWeek[key].authority += rating.dealAuthority || 0;
      ratingsByWeek[key].count += 1;
    });

    const domainTrend = Object.entries(ratingsByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([week, data]) => ({
        week: formatWeekLabel(week),
        peer: data.count ? Number((data.peer / data.count).toFixed(2)) : 0,
        adult: data.count ? Number((data.adult / data.count).toFixed(2)) : 0,
        investment: data.count ? Number((data.investment / data.count).toFixed(2)) : 0,
        authority: data.count ? Number((data.authority / data.count).toFixed(2)) : 0,
      }));

    const admissionsInWindow = youths.filter((y) => isInRange(parseDate(y.admissionDate), startDate)).length;
    const avgPoints = filteredPoints.length
      ? Number((filteredPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0) / filteredPoints.length).toFixed(1))
      : 0;
    const avgRiskScore = riskScores.length
      ? Number((riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length).toFixed(2))
      : 0;

    return {
      metrics: {
        activeYouth: youths.length,
        documentedYouth: documentedYouth.size,
        coveragePercent: youths.length ? Math.round((documentedYouth.size / youths.length) * 100) : 0,
        notesCount: filteredNotes.length,
        ratingsCount: filteredRatings.length,
        pointsCount: filteredPoints.length,
        avgPoints,
        avgRiskScore,
        youthWithRiskData,
        highRiskYouth,
        admissionsInWindow,
        avgDomain,
      },
      riskDistribution,
      levelDistribution,
      realColorsDistribution,
      documentationTrend,
      pointsTrend,
      domainTrend,
    };
  }, [youths, allCaseNotes, allBehaviorPoints, allDailyRatings, timeframe]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading KPI data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => navigate('/')} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Program KPI Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Built from live youth, notes, ratings, points, HYRNA, level, and Real Colors data.</p>
            </div>
          </div>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="quarter">Past Quarter</SelectItem>
              <SelectItem value="year">Past Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" />Active Youth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.activeYouth}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><ClipboardList className="h-4 w-4" />Documentation Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.coveragePercent}%</div>
              <p className="text-xs text-muted-foreground">{analytics.metrics.documentedYouth} youth documented</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" />Case Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.notesCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Daily Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.ratingsCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4" />Avg Points / Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.avgPoints}</div>
              <p className="text-xs text-muted-foreground">{analytics.metrics.pointsCount} point entries</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Risk Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.highRiskYouth}</div>
              <p className="text-xs text-muted-foreground">High-risk youth</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Avg HYRNA Score</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.metrics.avgRiskScore || '--'}</div>
              <p className="text-xs text-muted-foreground">{analytics.metrics.youthWithRiskData} youth with risk data</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Admissions in Window</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{analytics.metrics.admissionsInWindow}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Peer Interaction</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{analytics.metrics.avgDomain.peer.toFixed(2)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Authority</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{analytics.metrics.avgDomain.authority.toFixed(2)}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="documentation" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
            <TabsTrigger value="domains">Behavior Domains</TabsTrigger>
            <TabsTrigger value="risk">Risk & Levels</TabsTrigger>
            <TabsTrigger value="points">Points Trend</TabsTrigger>
          </TabsList>

          <TabsContent value="documentation">
            <Card>
              <CardHeader>
                <CardTitle>Documentation Volume by Month</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={analytics.documentationTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="notes" name="Case Notes" fill={HEARTLAND_CHART_COLORS.burgundy} />
                    <Bar dataKey="ratings" name="Daily Ratings" fill={HEARTLAND_CHART_COLORS.amber} />
                    <Bar dataKey="points" name="Behavior Points" fill={HEARTLAND_CHART_COLORS.neutral} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="domains">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Domain Trend (Weekly Averages)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analytics.domainTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="peer" stroke={HEARTLAND_CHART_COLORS.burgundy} name="Peer" strokeWidth={2} />
                    <Line type="monotone" dataKey="adult" stroke={HEARTLAND_CHART_COLORS.amber} name="Adult" strokeWidth={2} />
                    <Line type="monotone" dataKey="investment" stroke={HEARTLAND_CHART_COLORS.slate} name="Investment" strokeWidth={2} />
                    <Line type="monotone" dataKey="authority" stroke={HEARTLAND_CHART_COLORS.burgundyDark} name="Authority" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>HYRNA Risk Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={analytics.riskDistribution} dataKey="value" nameKey="name" outerRadius={110} label>
                        {analytics.riskDistribution.map((entry, idx) => (
                          <Cell key={`${entry.name}-${idx}`} fill={[
                            '#84cc16', '#65a30d', '#eab308', '#d97706', '#b45309', '#991b1b', '#7f1d1d'
                          ][idx % 7]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Current Level Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={analytics.levelDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="level" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={HEARTLAND_CHART_COLORS.burgundyDark} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" />Real Colors Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.realColorsDistribution.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No Real Colors results stored yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {analytics.realColorsDistribution.map((item) => (
                      <Badge key={item.name} variant="outline">{item.name}: {item.value}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points">
            <Card>
              <CardHeader><CardTitle>Average Behavior Points by Month</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={analytics.pointsTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="averagePoints" stroke={HEARTLAND_CHART_COLORS.amberSoft} strokeWidth={3} name="Avg Points" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssessmentKPIDashboard;
