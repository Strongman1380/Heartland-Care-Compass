import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfMonth, differenceInDays, isValid } from "date-fns";
import {
  AlertCircle, TrendingDown, TrendingUp, FileText, ShieldAlert, Activity,
  Users, BookOpen, Star, BarChart3
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, XAxis, YAxis, Legend
} from "recharts";
import { useCaseNotes, useBehaviorPoints, useDailyRatings } from "@/hooks/useSupabase";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import { academicsService, type CreditRow, type GradeRow, type StepRow } from "@/integrations/firebase/academicsService";
import { notesService, type NoteRow } from "@/integrations/firebase/notesService";
import type { FacilityIncidentReport } from "@/types/facility-incident-types";
import { aggregateCaseNoteKpis } from "@/utils/kpiCaseNoteAi";

interface KpiDashboardProps {
  youthId: string;
  youth: any;
}

type Timeframe = "week" | "month" | "quarter";

const HEARTLAND_CHART_COLORS = {
  burgundy: "#b91c1c",
  burgundyDark: "#991b1b",
  amber: "#d97706",
  amberLight: "#f59e0b",
  neutral: "#6b7280",
  slate: "#475569",
};

const RISK_BADGE_STYLES: Record<string, string> = {
  "Very Low": "bg-green-100 text-green-800 border-green-300",
  "Low": "bg-green-50 text-green-700 border-green-200",
  "Low Medium": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Medium": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Medium High": "bg-orange-100 text-orange-800 border-orange-300",
  "High": "bg-red-100 text-red-800 border-red-300",
  "Very High": "bg-red-200 text-red-900 border-red-400",
};

const GRADE_LABELS: Record<string, { label: string; color: string }> = {
  exceeding: { label: "Exceeding", color: "text-green-600" },
  meeting: { label: "Meeting", color: "text-blue-600" },
  needsImprovement: { label: "Needs Improvement", color: "text-yellow-600" },
  unsatisfactory: { label: "Unsatisfactory", color: "text-red-600" },
};

const classifyGrade = (value: number): string => {
  if (value >= 3.5) return "exceeding";
  if (value >= 3.0) return "meeting";
  if (value >= 2.0) return "needsImprovement";
  return "unsatisfactory";
};

const weekSortKey = (d: Date): string => {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return format(copy, "yyyy-MM-dd");
};

const weekLabel = (sortKey: string): string => {
  const d = new Date(sortKey);
  return isValid(d) ? format(d, "MM/dd") : sortKey;
};

const safeFormatDate = (value: string | null | undefined, fmt: string): string => {
  if (!value) return "";
  try {
    const d = new Date(value);
    return isValid(d) ? format(d, fmt) : "";
  } catch {
    return "";
  }
};

export const KpiDashboard = ({ youthId, youth }: KpiDashboardProps) => {
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [incidents, setIncidents] = useState<FacilityIncidentReport[]>([]);
  const [credits, setCredits] = useState<CreditRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [steps, setSteps] = useState<StepRow[]>([]);
  const [referralNotes, setReferralNotes] = useState<NoteRow[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);

  const { caseNotes: notesData, loading: notesLoading } = useCaseNotes(youthId);
  const { behaviorPoints, loading: pointsLoading } = useBehaviorPoints(youthId);
  const { dailyRatings, loading: ratingsLoading } = useDailyRatings(youthId);

  // Fetch incident reports and academic data
  useEffect(() => {
    let cancelled = false;
    const fetchExtras = async () => {
      try {
        setExtrasLoading(true);
        const [incidentData, creditData, gradeData, stepData, allNotes] = await Promise.all([
          incidentReportsService.list().catch(() => []),
          academicsService.credits.list().catch(() => []),
          academicsService.grades.list().catch(() => []),
          academicsService.steps.list().catch(() => []),
          notesService.listForYouth(youthId).catch(() => []),
        ]);
        if (cancelled) return;
        setIncidents(incidentData);
        setCredits(creditData);
        setGrades(gradeData);
        setSteps(stepData);
        const referrals = allNotes.filter((row) => {
          if ((row.category || "").toLowerCase() === "referral") return true;
          try {
            const parsed = JSON.parse(row.text);
            return parsed?.noteType === "referral" || Boolean(parsed?.referralData);
          } catch {
            return false;
          }
        });
        setReferralNotes(referrals);
      } catch {
        // Silently handle — cards will show zero state
      } finally {
        if (!cancelled) setExtrasLoading(false);
      }
    };
    fetchExtras();
    return () => { cancelled = true; };
  }, [youthId]);

  const analytics = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    if (timeframe === "week") {
      startDate = subDays(now, 7);
    } else if (timeframe === "month") {
      startDate = startOfMonth(now);
    } else {
      startDate = subDays(now, 90);
    }

    const inRange = (dateStr: string | null | undefined): boolean => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return !Number.isNaN(d.getTime()) && d >= startDate && d <= now;
    };

    const daySpan = Math.max(1, differenceInDays(now, startDate));

    // --- Case Notes ---
    const filteredNotes = notesData.filter((n) => inRange(n.date || n.createdAt));
    const aiAggregate = aggregateCaseNoteKpis(filteredNotes);
    const filteredReferralNotes = referralNotes.filter((r) => inRange(r.created_at));
    const referralMeta = filteredReferralNotes.reduce(
      (acc, row) => {
        let parsed: any = null;
        try {
          parsed = JSON.parse(row.text);
        } catch {
          parsed = null;
        }
        const status = parsed?.referralMeta?.status || "new";
        const priority = parsed?.referralMeta?.priority || "routine";
        acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
        acc.byPriority[priority] = (acc.byPriority[priority] || 0) + 1;
        return acc;
      },
      { byStatus: {} as Record<string, number>, byPriority: {} as Record<string, number> }
    );
    const urgentReferralCount = (referralMeta.byPriority.urgent || 0) + (referralMeta.byPriority.high || 0);

    // Documentation volume by date (case notes + referral notes)
    const volumeByDate: Record<string, { label: string; count: number }> = {};
    filteredNotes.forEach((note) => {
      const d = new Date(note.date || note.createdAt || "");
      if (!Number.isNaN(d.getTime())) {
        const key = format(d, "yyyy-MM-dd");
        const label = format(d, "MM/dd");
        volumeByDate[key] = volumeByDate[key] || { label, count: 0 };
        volumeByDate[key].count += 1;
      }
    });
    filteredReferralNotes.forEach((note) => {
      const d = new Date(note.created_at || "");
      if (!Number.isNaN(d.getTime())) {
        const key = format(d, "yyyy-MM-dd");
        const label = format(d, "MM/dd");
        volumeByDate[key] = volumeByDate[key] || { label, count: 0 };
        volumeByDate[key].count += 1;
      }
    });
    const noteVolumeData = Object.entries(volumeByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { label, count }]) => ({ date: label, notes: count }));

    // Documentation categories (case note AI categories + referral)
    const categoriesData = Object.entries(aiAggregate.categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    if (filteredReferralNotes.length > 0) {
      categoriesData.push({ name: "Referral", value: filteredReferralNotes.length });
    }

    // Documentation by staff
    const staffCounts: Record<string, number> = {};
    filteredNotes.forEach((note) => {
      const staff = note.staff?.trim() || "Unknown";
      staffCounts[staff] = (staffCounts[staff] || 0) + 1;
    });
    filteredReferralNotes.forEach((note) => {
      const staff = (note.author_id || "").trim() || "Unknown";
      staffCounts[staff] = (staffCounts[staff] || 0) + 1;
    });
    const staffData = Object.entries(staffCounts).map(([name, value]) => ({ name, value }));

    // Sentiment chart
    const sentimentChartData = [
      { name: "Positive", value: aiAggregate.sentimentCounts.positive, fill: HEARTLAND_CHART_COLORS.amber },
      { name: "Neutral", value: aiAggregate.sentimentCounts.neutral, fill: HEARTLAND_CHART_COLORS.neutral },
      { name: "Concerning", value: aiAggregate.sentimentCounts.concerning, fill: HEARTLAND_CHART_COLORS.burgundy },
      { name: "Critical", value: aiAggregate.sentimentCounts.critical, fill: HEARTLAND_CHART_COLORS.burgundyDark },
    ].filter((d) => d.value > 0);

    // --- Daily Ratings (actual domain scores) ---
    const filteredRatings = dailyRatings.filter((r) => inRange(r.date || r.createdAt));
    const domainTotals = { peer: 0, adult: 0, investment: 0, authority: 0, count: 0 };
    filteredRatings.forEach((r) => {
      if (r.peerInteraction != null) {
        domainTotals.peer += r.peerInteraction || 0;
        domainTotals.adult += r.adultInteraction || 0;
        domainTotals.investment += r.investmentLevel || 0;
        domainTotals.authority += r.dealAuthority || 0;
        domainTotals.count += 1;
      }
    });
    const actualDomainAvg = {
      peer: domainTotals.count ? Number((domainTotals.peer / domainTotals.count).toFixed(1)) : 0,
      adult: domainTotals.count ? Number((domainTotals.adult / domainTotals.count).toFixed(1)) : 0,
      investment: domainTotals.count ? Number((domainTotals.investment / domainTotals.count).toFixed(1)) : 0,
      authority: domainTotals.count ? Number((domainTotals.authority / domainTotals.count).toFixed(1)) : 0,
    };
    const hasActualRatings = domainTotals.count > 0;

    // Domain scores to use (prefer actual ratings, fall back to AI-extracted)
    const domainScores = hasActualRatings ? actualDomainAvg : aiAggregate.domainAverages;
    const domainSource = hasActualRatings ? "Daily Ratings" : "AI-Extracted from Notes";

    // Domain radar data
    const domainRadarData = [
      { domain: "Peer", score: domainScores.peer, fullMark: 4 },
      { domain: "Adult", score: domainScores.adult, fullMark: 4 },
      { domain: "Investment", score: domainScores.investment, fullMark: 4 },
      { domain: "Authority", score: domainScores.authority, fullMark: 4 },
    ];

    // Weekly domain trend from actual ratings
    const ratingsByWeek: Record<string, { peer: number; adult: number; investment: number; authority: number; count: number }> = {};
    filteredRatings.forEach((r) => {
      const d = new Date(r.date || r.createdAt || "");
      if (Number.isNaN(d.getTime())) return;
      const key = weekSortKey(d);
      ratingsByWeek[key] = ratingsByWeek[key] || { peer: 0, adult: 0, investment: 0, authority: 0, count: 0 };
      ratingsByWeek[key].peer += r.peerInteraction || 0;
      ratingsByWeek[key].adult += r.adultInteraction || 0;
      ratingsByWeek[key].investment += r.investmentLevel || 0;
      ratingsByWeek[key].authority += r.dealAuthority || 0;
      ratingsByWeek[key].count += 1;
    });
    const domainTrendData = Object.entries(ratingsByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([sortKey, data]) => ({
        week: weekLabel(sortKey),
        Peer: data.count ? Number((data.peer / data.count).toFixed(2)) : 0,
        Adult: data.count ? Number((data.adult / data.count).toFixed(2)) : 0,
        Investment: data.count ? Number((data.investment / data.count).toFixed(2)) : 0,
        Authority: data.count ? Number((data.authority / data.count).toFixed(2)) : 0,
      }));

    // --- Behavior Points ---
    const filteredPoints = behaviorPoints.filter((p) => inRange(p.date || p.createdAt));
    const totalPointsSum = filteredPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
    const avgPointsPerEntry = filteredPoints.length
      ? Number((totalPointsSum / filteredPoints.length).toFixed(1))
      : 0;

    // Points trend by date
    const pointsByDate: Record<string, { label: string; total: number }> = {};
    filteredPoints.forEach((p) => {
      const d = new Date(p.date || p.createdAt || "");
      if (!Number.isNaN(d.getTime())) {
        const key = format(d, "yyyy-MM-dd");
        const label = format(d, "MM/dd");
        pointsByDate[key] = pointsByDate[key] || { label, total: 0 };
        pointsByDate[key].total += (p.totalPoints || 0);
      }
    });
    const pointsTrendData = Object.entries(pointsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, { label, total }]) => ({ date: label, points: total }));

    // --- Incident Reports ---
    const youthFullName = `${youth.firstName} ${youth.lastName}`.trim().toLowerCase();
    const youthIncidents = incidents.filter((inc) => {
      // Strict equality match on normalized full name
      if (inc.youthName?.trim().toLowerCase() === youthFullName) return true;
      if (inc.youthInvolved?.some((y) => y.name?.trim().toLowerCase() === youthFullName)) return true;
      return false;
    });
    const filteredIncidents = youthIncidents.filter((inc) => inRange(inc.dateOfIncident));

    // Incident type breakdown
    const incidentTypeCounts: Record<string, number> = {};
    filteredIncidents.forEach((inc) => {
      (inc.incidentTypes || []).forEach((type) => {
        incidentTypeCounts[type] = (incidentTypeCounts[type] || 0) + 1;
      });
    });
    const incidentTypeData = Object.entries(incidentTypeCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    // --- Academics ---
    const youthCredits = credits.filter((c) => c.student_id === youthId && inRange(c.date_earned));
    const youthGrades = grades.filter((g) => g.student_id === youthId && inRange(g.date_entered));
    const youthSteps = steps.filter((s) => s.student_id === youthId && inRange(s.date_completed));

    const totalCredits = youthCredits.reduce((sum, c) => sum + (c.credit_value || 0), 0);
    const avgGrade = youthGrades.length
      ? Number((youthGrades.reduce((sum, g) => sum + g.grade_value, 0) / youthGrades.length).toFixed(2))
      : null;
    const totalSteps = youthSteps.reduce((sum, s) => sum + (s.steps_count || 0), 0);
    const gradeClassification = avgGrade !== null ? classifyGrade(avgGrade) : null;

    return {
      // Case note AI analysis
      aiAggregate,
      noteVolumeData,
      categoriesData,
      staffData,
      sentimentChartData,
      referralCount: filteredReferralNotes.length,
      urgentReferralCount,
      referralByStatus: referralMeta.byStatus,
      referralByPriority: referralMeta.byPriority,
      documentationCount: filteredNotes.length + filteredReferralNotes.length,
      // Domain scores (actual or AI-derived)
      domainScores,
      domainSource,
      domainRadarData,
      domainTrendData,
      hasActualRatings,
      ratingsCount: filteredRatings.length,
      // Behavior points
      pointsCount: filteredPoints.length,
      totalPointsSum,
      avgPointsPerEntry,
      pointsTrendData,
      // Incidents
      incidentCount: filteredIncidents.length,
      incidentTypeData,
      totalIncidents: youthIncidents.length,
      // Academics
      totalCredits,
      avgGrade,
      totalSteps,
      gradeClassification,
      gradeEntries: youthGrades.length,
      // General
      notesPerDay: Number((filteredNotes.length / daySpan).toFixed(1)),
      documentationPerDay: Number(((filteredNotes.length + filteredReferralNotes.length) / daySpan).toFixed(1)),
      daySpan,
    };
  }, [notesData, referralNotes, dailyRatings, behaviorPoints, incidents, credits, grades, steps, timeframe, youthId, youth]);

  const isLoading = notesLoading || pointsLoading || ratingsLoading || extrasLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const hasAnyData = notesData.length > 0 || referralNotes.length > 0 || behaviorPoints.length > 0 || dailyRatings.length > 0 || incidents.length > 0 || credits.length > 0 || grades.length > 0 || steps.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Progress Dashboard</h2>
          <p className="text-muted-foreground mb-4">
            Live KPIs from ratings, points, notes, incidents, and academics for {youth.firstName}.
          </p>
        </div>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last 7 Days</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!hasAnyData && (
        <Card className="border-dashed border-2 border-border bg-muted/50">
          <CardContent className="p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No KPI Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add daily ratings, behavior points, case notes, or referral notes to populate this dashboard with real data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Row 1: Top KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users size={14} /> Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">L{youth.level || 0}</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {youth.restrictionLevel > 0 && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  R{youth.restrictionLevel}
                </Badge>
              )}
              {youth.subsystemActive && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                  Subsystem
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Star size={14} /> Behavior Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.avgPointsPerEntry || "--"}</div>
            <p className="text-xs text-muted-foreground">{analytics.pointsCount} entries avg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity size={14} /> Daily Ratings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.ratingsCount}</div>
            <p className="text-xs text-muted-foreground">in period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText size={14} /> Documentation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.documentationCount}</div>
            <Badge variant="outline" className="text-xs mt-1 bg-secondary/20 text-primary border-secondary/40">
              {analytics.documentationPerDay}/day
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.aiAggregate.noteCount} case | {analytics.referralCount} referral
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert size={14} /> Incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.incidentCount}</div>
            <p className="text-xs text-muted-foreground">{analytics.totalIncidents} total on file</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen size={14} /> Credits Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCredits || "--"}</div>
            {analytics.avgGrade !== null && (
              <p className={`text-xs font-medium mt-1 ${GRADE_LABELS[analytics.gradeClassification!]?.color || ""}`}>
                {analytics.avgGrade} avg ({GRADE_LABELS[analytics.gradeClassification!]?.label})
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: HYRNA + Engagement + Domain Summary ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">HYRNA Risk Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            {youth.hyrnaRiskLevel ? (
              <div className="space-y-2">
                <Badge variant="outline" className={`text-sm px-3 py-1 ${RISK_BADGE_STYLES[youth.hyrnaRiskLevel] || ""}`}>
                  {youth.hyrnaRiskLevel}
                </Badge>
                {youth.hyrnaScore != null && (
                  <p className="text-sm text-muted-foreground">Score: {youth.hyrnaScore}</p>
                )}
                {youth.hyrnaAssessmentDate && safeFormatDate(youth.hyrnaAssessmentDate, "MMM d, yyyy") && (
                  <p className="text-xs text-muted-foreground">
                    Assessed: {safeFormatDate(youth.hyrnaAssessmentDate, "MMM d, yyyy")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No HYRNA assessment on file</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Engagement Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {analytics.aiAggregate.noteCount === 0 ? (
                  <span className="text-muted-foreground">--</span>
                ) : (
                  <>
                    {analytics.aiAggregate.engagementScore}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>
                  </>
                )}
              </div>
              {analytics.aiAggregate.noteCount > 0 && (
                <Badge
                  variant="outline"
                  className={
                    analytics.aiAggregate.trendDelta > 0
                      ? "bg-secondary/20 text-primary border-secondary/40"
                      : analytics.aiAggregate.trendDelta < 0
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted text-muted-foreground border-border"
                  }
                >
                  {analytics.aiAggregate.trendDelta > 0 ? (
                    <TrendingUp size={14} className="mr-1" />
                  ) : analytics.aiAggregate.trendDelta < 0 ? (
                    <TrendingDown size={14} className="mr-1" />
                  ) : null}
                  {analytics.aiAggregate.trendDelta > 0
                    ? "Improving"
                    : analytics.aiAggregate.trendDelta < 0
                      ? "Declining"
                      : "Stable"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Level mentions: +{analytics.aiAggregate.levelUpMentions} / -{analytics.aiAggregate.levelDownMentions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profile Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5 text-sm">
              {youth.admissionDate && safeFormatDate(youth.admissionDate, "MMM d, yyyy") && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Admitted</span>
                  <span className="font-medium">{safeFormatDate(youth.admissionDate, "MMM d, yyyy")}</span>
                </div>
              )}
              {youth.realColorsResult && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Real Colors</span>
                  <span className="font-medium">{youth.realColorsResult}</span>
                </div>
              )}
              {youth.pointTotal != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lifetime Points</span>
                  <span className="font-medium">{youth.pointTotal}</span>
                </div>
              )}
              {analytics.totalSteps > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Academic Steps</span>
                  <span className="font-medium">{analytics.totalSteps}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Domain Radar + Domain Trend Line ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Behavioral Domain Scores</CardTitle>
            <CardDescription>
              Source: {analytics.domainSource} (0-4 scale)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {(analytics.hasActualRatings || analytics.aiAggregate.noteCount > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={analytics.domainRadarData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid />
                    <PolarAngleAxis dataKey="domain" fontSize={12} />
                    <PolarRadiusAxis angle={90} domain={[0, 4]} tickCount={5} fontSize={10} />
                    <Radar
                      name="Score"
                      dataKey="score"
                      stroke={HEARTLAND_CHART_COLORS.burgundy}
                      fill={HEARTLAND_CHART_COLORS.burgundy}
                      fillOpacity={0.28}
                    />
                    <Tooltip formatter={(value) => [Number(value).toFixed(1), "Score"]} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Add daily ratings or notes to see domain scores
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domain Trend (Weekly Avg)</CardTitle>
            <CardDescription>Actual daily rating averages by week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {analytics.domainTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.domainTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" fontSize={12} />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Peer" stroke={HEARTLAND_CHART_COLORS.burgundy} strokeWidth={2} />
                    <Line type="monotone" dataKey="Adult" stroke={HEARTLAND_CHART_COLORS.amber} strokeWidth={2} />
                    <Line type="monotone" dataKey="Investment" stroke={HEARTLAND_CHART_COLORS.slate} strokeWidth={2} />
                    <Line type="monotone" dataKey="Authority" stroke={HEARTLAND_CHART_COLORS.burgundyDark} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No daily ratings recorded in this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 4: Points Trend + Sentiment Distribution ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 size={16} /> Behavior Points Trend
            </CardTitle>
            <CardDescription>Daily total behavior points</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {analytics.pointsTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.pointsTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} pts`, "Points"]} />
                    <Bar dataKey="points" fill={HEARTLAND_CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No behavior points recorded in this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note Sentiment Distribution</CardTitle>
            <CardDescription>AI-classified case note sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {analytics.sentimentChartData.length > 0 ? (
                <div className="flex items-center h-full">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.sentimentChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={40}
                        >
                          {analytics.sentimentChartData.map((entry, index) => (
                            <Cell key={`sentiment-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 pl-4">
                    {analytics.sentimentChartData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm text-foreground">
                          {entry.name}: {entry.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No notes to analyze
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 5: Note Volume + Categories + Staff ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Note Volume Over Time</CardTitle>
            <CardDescription>Daily case and referral note activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {analytics.noteVolumeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.noteVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} notes`, "Notes"]} />
                    <Bar dataKey="notes" fill={HEARTLAND_CHART_COLORS.burgundy} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No documentation in this timeframe
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note Categories</CardTitle>
            <CardDescription>AI topics + referral volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {analytics.categoriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoriesData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => entry.name}
                    >
                      {analytics.categoriesData.map((_, index) => (
                        <Cell
                          key={`category-cell-${index}`}
                          fill={
                            [
                              HEARTLAND_CHART_COLORS.burgundy,
                              HEARTLAND_CHART_COLORS.amber,
                              HEARTLAND_CHART_COLORS.burgundyDark,
                              HEARTLAND_CHART_COLORS.amberLight,
                              HEARTLAND_CHART_COLORS.neutral,
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No documentation
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes by Staff</CardTitle>
            <CardDescription>Documentation per team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {analytics.staffData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.staffData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {analytics.staffData.map((_, index) => (
                        <Cell
                          key={`staff-cell-${index}`}
                          fill={
                            [
                              HEARTLAND_CHART_COLORS.burgundy,
                              HEARTLAND_CHART_COLORS.amber,
                              HEARTLAND_CHART_COLORS.burgundyDark,
                              HEARTLAND_CHART_COLORS.amberLight,
                              HEARTLAND_CHART_COLORS.neutral,
                            ][index % 5]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  No staff activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 6: Incident Breakdown + Documentation Summary + Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Incident Breakdown</CardTitle>
            <CardDescription>Facility incident types for {youth.firstName}</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.incidentTypeData.length > 0 ? (
              <div className="space-y-2">
                {analytics.incidentTypeData.map((item) => (
                  <div key={item.name} className="flex justify-between items-center py-1.5 border-b last:border-b-0">
                    <span className="text-sm text-foreground">{item.name}</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      {item.value}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {analytics.totalIncidents === 0
                  ? "No incident reports on file"
                  : "No incidents in this timeframe"}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Documentation Summary</CardTitle>
            <CardDescription>Note cadence, sentiment, and level language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Notes this period</span>
                <span className="font-semibold">{analytics.aiAggregate.noteCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Referrals this period</span>
                <span className="font-semibold">{analytics.referralCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">High/Urgent referrals</span>
                <span className={`font-semibold ${analytics.urgentReferralCount > 0 ? "text-primary" : ""}`}>
                  {analytics.urgentReferralCount}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Daily average</span>
                <span className="font-semibold">{analytics.documentationPerDay}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Concern signals</span>
                <span
                  className={`font-semibold ${analytics.aiAggregate.concernCount > 0 ? "text-primary" : "text-secondary-foreground"}`}
                >
                  {analytics.aiAggregate.concernCount}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Level-up mentions</span>
                <span className="font-semibold text-secondary-foreground">
                  +{analytics.aiAggregate.levelUpMentions}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Level-down mentions</span>
                <span
                  className={`font-semibold ${analytics.aiAggregate.levelDownMentions > 0 ? "text-primary" : "text-muted-foreground"}`}
                >
                  -{analytics.aiAggregate.levelDownMentions}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Sentiment trend</span>
                <span
                  className={`font-semibold ${
                    analytics.aiAggregate.trendDelta > 0
                      ? "text-secondary-foreground"
                      : analytics.aiAggregate.trendDelta < 0
                        ? "text-primary"
                        : "text-muted-foreground"
                  }`}
                >
                  {analytics.aiAggregate.trendDelta > 0
                    ? "Improving"
                    : analytics.aiAggregate.trendDelta < 0
                      ? "Declining"
                      : "Stable"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Observations & Insights</CardTitle>
            <CardDescription>From notes, ratings, and behavioral patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notesData.length === 0 && dailyRatings.length === 0 ? (
                <div className="p-4 border-l-4 border-primary bg-primary/10 rounded-r-md">
                  <h4 className="font-medium text-primary text-sm mb-1">Getting Started</h4>
                  <p className="text-sm text-primary">
                    Add case notes or daily ratings for {youth.firstName} to generate AI insights.
                  </p>
                </div>
              ) : (
                <>
                  {analytics.hasActualRatings && analytics.domainScores.peer < 2 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Peer Interaction Concern</h4>
                      <p className="text-sm text-primary">
                        Peer domain avg is {analytics.domainScores.peer}/4.0 from daily ratings. May need focused peer
                        skills intervention.
                      </p>
                    </div>
                  )}
                  {analytics.hasActualRatings && analytics.domainScores.authority < 2 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Authority Compliance Concern</h4>
                      <p className="text-sm text-primary">
                        Authority domain avg is {analytics.domainScores.authority}/4.0. Ongoing challenges with
                        structure and rule compliance indicated.
                      </p>
                    </div>
                  )}
                  {analytics.incidentCount > 2 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Elevated Incident Activity</h4>
                      <p className="text-sm text-primary">
                        {analytics.incidentCount} incident reports filed this period. Review for patterns and
                        intervention needs.
                      </p>
                    </div>
                  )}
                  {analytics.urgentReferralCount > 0 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Referral Follow-Up Needed</h4>
                      <p className="text-sm text-primary">
                        {analytics.urgentReferralCount} high or urgent referral note(s) in this period. Review and assign follow-up tasks.
                      </p>
                    </div>
                  )}
                  {analytics.aiAggregate.engagementScore > 0 && analytics.aiAggregate.engagementScore < 40 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Low Engagement Alert</h4>
                      <p className="text-sm text-primary">
                        AI engagement score is {analytics.aiAggregate.engagementScore}/100. Case note language suggests
                        low program investment.
                      </p>
                    </div>
                  )}
                  {analytics.aiAggregate.insights.map((insight, idx) => (
                    <div key={idx} className="p-3 border-l-4 border-primary bg-primary/10 rounded-r-md">
                      <p className="text-sm text-primary">{insight}</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
