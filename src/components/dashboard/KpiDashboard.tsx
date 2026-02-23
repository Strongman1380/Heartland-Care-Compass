import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfMonth, differenceInDays } from "date-fns";
import { AlertCircle, TrendingDown, TrendingUp, FileText, ShieldAlert, Activity, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { useCaseNotes } from "@/hooks/useSupabase";
import { aggregateCaseNoteKpis, extractCaseNoteText } from "@/utils/kpiCaseNoteAi";

interface KpiDashboardProps {
  youthId: string;
  youth: any;
}

interface KpiMetrics {
  caseNoteCount: number;
  concernCount: number;
  incidentMentions: number;
  engagementScore: number;
  levelUpMentions: number;
  levelDownMentions: number;
  noteTrend: number;
  sentimentCounts: Record<string, number>;
  domainAverages: { peer: number; adult: number; investment: number; authority: number };
  notesPerDay: number;
}

const HEARTLAND_CHART_COLORS = {
  burgundy: "#b91c1c",
  burgundyDark: "#991b1b",
  amber: "#d97706",
  amberLight: "#f59e0b",
  neutral: "#6b7280",
};

export const KpiDashboard = ({ youthId, youth }: KpiDashboardProps) => {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("month");
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [staffData, setStaffData] = useState<any[]>([]);
  const [sentimentChartData, setSentimentChartData] = useState<any[]>([]);
  const [noteVolumeData, setNoteVolumeData] = useState<any[]>([]);
  const [domainRadarData, setDomainRadarData] = useState<any[]>([]);
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [kpiMetrics, setKpiMetrics] = useState<KpiMetrics>({
    caseNoteCount: 0,
    concernCount: 0,
    incidentMentions: 0,
    engagementScore: 0,
    levelUpMentions: 0,
    levelDownMentions: 0,
    noteTrend: 0,
    sentimentCounts: { positive: 0, neutral: 0, concerning: 0, critical: 0 },
    domainAverages: { peer: 0, adult: 0, investment: 0, authority: 0 },
    notesPerDay: 0,
  });

  const { caseNotes: notesData, loading: notesLoading } = useCaseNotes(youthId);

  useEffect(() => {
    processData();
  }, [notesData, timeframe]);

  const processData = () => {
    let startDate = new Date();
    const endDate = new Date();

    if (timeframe === "week") {
      startDate = subDays(endDate, 7);
    } else if (timeframe === "month") {
      startDate = startOfMonth(endDate);
    } else {
      startDate = subDays(endDate, 90);
    }

    const filteredNotesData = notesData.filter((note) => {
      const noteDate = new Date(note.date || note.createdAt || "");
      return !Number.isNaN(noteDate.getTime()) && noteDate >= startDate && noteDate <= endDate;
    });

    const aiAggregate = aggregateCaseNoteKpis(filteredNotesData);

    // Category pie chart
    const categoryData = Object.entries(aiAggregate.categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    setCategoriesData(categoryData);

    // Staff bar chart
    const staffCounts: Record<string, number> = {};
    filteredNotesData.forEach((note) => {
      const staff = note.staff?.trim() || "Unknown";
      staffCounts[staff] = (staffCounts[staff] || 0) + 1;
    });
    setStaffData(Object.entries(staffCounts).map(([name, value]) => ({ name, value })));

    // Sentiment distribution chart
    setSentimentChartData([
      { name: "Positive", value: aiAggregate.sentimentCounts.positive, fill: HEARTLAND_CHART_COLORS.amber },
      { name: "Neutral", value: aiAggregate.sentimentCounts.neutral, fill: HEARTLAND_CHART_COLORS.neutral },
      { name: "Concerning", value: aiAggregate.sentimentCounts.concerning, fill: HEARTLAND_CHART_COLORS.burgundy },
      { name: "Critical", value: aiAggregate.sentimentCounts.critical, fill: HEARTLAND_CHART_COLORS.burgundyDark },
    ].filter(d => d.value > 0));

    // Note volume over time (group by date)
    const volumeByDate: Record<string, number> = {};
    filteredNotesData.forEach((note) => {
      const noteDate = new Date(note.date || note.createdAt || "");
      if (!Number.isNaN(noteDate.getTime())) {
        const key = format(noteDate, "MM/dd");
        volumeByDate[key] = (volumeByDate[key] || 0) + 1;
      }
    });
    const volumeData = Object.entries(volumeByDate)
      .map(([date, count]) => ({ date, notes: count }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setNoteVolumeData(volumeData);

    // Domain radar data
    setDomainRadarData([
      { domain: "Peer", score: aiAggregate.domainAverages.peer, fullMark: 4 },
      { domain: "Adult", score: aiAggregate.domainAverages.adult, fullMark: 4 },
      { domain: "Investment", score: aiAggregate.domainAverages.investment, fullMark: 4 },
      { domain: "Authority", score: aiAggregate.domainAverages.authority, fullMark: 4 },
    ]);

    setAiInsights(aiAggregate.insights);

    const daySpan = Math.max(1, differenceInDays(endDate, startDate));

    setKpiMetrics({
      caseNoteCount: aiAggregate.noteCount,
      concernCount: aiAggregate.concernCount,
      incidentMentions: aiAggregate.incidentMentions,
      engagementScore: aiAggregate.engagementScore,
      levelUpMentions: aiAggregate.levelUpMentions,
      levelDownMentions: aiAggregate.levelDownMentions,
      noteTrend: aiAggregate.trendDelta,
      sentimentCounts: aiAggregate.sentimentCounts,
      domainAverages: aiAggregate.domainAverages,
      notesPerDay: Number((aiAggregate.noteCount / daySpan).toFixed(1)),
    });
  };

  const getCategoryColors = () => [
    HEARTLAND_CHART_COLORS.burgundy,
    HEARTLAND_CHART_COLORS.amber,
    HEARTLAND_CHART_COLORS.burgundyDark,
    HEARTLAND_CHART_COLORS.amberLight,
    HEARTLAND_CHART_COLORS.neutral,
  ];
  const getStaffColors = () => [
    HEARTLAND_CHART_COLORS.burgundy,
    HEARTLAND_CHART_COLORS.amber,
    HEARTLAND_CHART_COLORS.burgundyDark,
    HEARTLAND_CHART_COLORS.amberLight,
    HEARTLAND_CHART_COLORS.neutral,
  ];

  if (notesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  const hasInsufficientData = notesData.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Progress Dashboard</h2>
          <p className="text-muted-foreground mb-4">AI-extracted KPIs from case notes and level activity for {youth.firstName}.</p>
        </div>
        <Select value={timeframe} onValueChange={(value) => setTimeframe(value as "week" | "month" | "quarter")}>
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

      {hasInsufficientData && (
        <Card className="border-dashed border-2 border-border bg-muted/50">
          <CardContent className="p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-3 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No KPI Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add case notes to enable AI KPI extraction. Notes are analyzed for sentiment, risk signals, and behavioral domain patterns.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <FileText size={14} /> Case Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {kpiMetrics.caseNoteCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">notes</span>
              </div>
              <Badge variant="outline" className="bg-secondary/20 text-primary border-secondary/40">
                {kpiMetrics.notesPerDay}/day avg
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Activity size={14} /> AI Engagement Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {kpiMetrics.caseNoteCount === 0 ? <span className="text-muted-foreground">--</span> : kpiMetrics.engagementScore}
                {kpiMetrics.caseNoteCount > 0 && <span className="text-sm font-normal text-muted-foreground ml-1">/ 100</span>}
              </div>
              {kpiMetrics.caseNoteCount > 0 && (
                <Badge variant="outline" className={
                  kpiMetrics.noteTrend > 0
                    ? "bg-secondary/20 text-primary border-secondary/40"
                    : kpiMetrics.noteTrend < 0
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border"
                }>
                  {kpiMetrics.noteTrend > 0 ? <TrendingUp size={14} className="mr-1" /> : kpiMetrics.noteTrend < 0 ? <TrendingDown size={14} className="mr-1" /> : null}
                  {kpiMetrics.noteTrend > 0 ? "Improving" : kpiMetrics.noteTrend < 0 ? "Declining" : "Stable"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Level mentions: +{kpiMetrics.levelUpMentions} / -{kpiMetrics.levelDownMentions}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert size={14} /> Risk Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {kpiMetrics.concernCount}
                <span className="text-sm font-normal text-muted-foreground ml-1">concerns</span>
              </div>
              {kpiMetrics.incidentMentions > 0 ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {kpiMetrics.incidentMentions} incidents
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-secondary/20 text-primary border-secondary/40">
                  No incidents
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Users size={14} /> Current Level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                Level {youth.level || 0}
              </div>
              {youth.restrictionLevel && youth.restrictionLevel > 0 ? (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  R{youth.restrictionLevel}
                </Badge>
              ) : youth.subsystemActive ? (
                <Badge variant="outline" className="bg-secondary/20 text-primary border-secondary/40">
                  Subsystem
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-secondary/20 text-primary border-secondary/40">
                  No restrictions
                </Badge>
              )}
            </div>
            {youth.admissionDate && (
              <p className="text-xs text-muted-foreground mt-2">
                Admitted: {format(new Date(youth.admissionDate), "MMM d, yyyy")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Note Volume + Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Note Volume Over Time</CardTitle>
            <CardDescription>Daily case note documentation activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {noteVolumeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={noteVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [`${value} notes`, "Notes"]} />
                    <Bar dataKey="notes" fill={HEARTLAND_CHART_COLORS.burgundy} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No notes in this timeframe</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>AI-classified note sentiment breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {sentimentChartData.length > 0 ? (
                <div className="flex items-center h-full">
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sentimentChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                          {sentimentChartData.map((entry, index) => (
                            <Cell key={`sentiment-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-2 pl-4">
                    {sentimentChartData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-sm text-foreground">{entry.name}: {entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No notes to analyze</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2: Domain Radar + Categories + Staff */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Behavioral Domain Scores</CardTitle>
            <CardDescription>AI-extracted from note language (0-4 scale)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {kpiMetrics.caseNoteCount > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={domainRadarData} cx="50%" cy="50%" outerRadius="70%">
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
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Add notes to see domain scores</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Note Categories</CardTitle>
            <CardDescription>AI-detected topic distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {categoriesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoriesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => entry.name}>
                      {categoriesData.map((_, index) => (
                        <Cell key={`category-cell-${index}`} fill={getCategoryColors()[index % getCategoryColors().length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No case notes</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes by Staff</CardTitle>
            <CardDescription>Documentation activity per team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              {staffData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={staffData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {staffData.map((_, index) => (
                        <Cell key={`staff-cell-${index}`} fill={getStaffColors()[index % getStaffColors().length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No staff activity</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Documentation Consistency + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Documentation Summary</CardTitle>
            <CardDescription>Note cadence, sentiment, and level language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Notes this period</span>
                <span className="font-semibold">{kpiMetrics.caseNoteCount}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Daily average</span>
                <span className="font-semibold">{kpiMetrics.notesPerDay}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Concern signals</span>
                <span className={`font-semibold ${kpiMetrics.concernCount > 0 ? "text-primary" : "text-secondary-foreground"}`}>
                  {kpiMetrics.concernCount}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Level-up mentions</span>
                <span className="font-semibold text-secondary-foreground">+{kpiMetrics.levelUpMentions}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b">
                <span className="text-muted-foreground">Level-down mentions</span>
                <span className={`font-semibold ${kpiMetrics.levelDownMentions > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  -{kpiMetrics.levelDownMentions}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-muted-foreground">Sentiment trend</span>
                <span className={`font-semibold ${
                  kpiMetrics.noteTrend > 0 ? "text-secondary-foreground" : kpiMetrics.noteTrend < 0 ? "text-primary" : "text-muted-foreground"
                }`}>
                  {kpiMetrics.noteTrend > 0 ? "Improving" : kpiMetrics.noteTrend < 0 ? "Declining" : "Stable"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Observations & Insights</CardTitle>
            <CardDescription>Generated from case note content, sentiment patterns, and behavioral domain language</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notesData.length === 0 ? (
                <div className="p-4 border-l-4 border-primary bg-primary/10 rounded-r-md">
                  <h4 className="font-medium text-primary text-sm mb-1">Getting Started</h4>
                  <p className="text-sm text-primary">
                    Add case notes for {youth.firstName} to generate AI insights. Notes are analyzed for sentiment, risk signals, behavioral domains, and documentation patterns.
                  </p>
                </div>
              ) : (
                <>
                  {kpiMetrics.engagementScore > 0 && kpiMetrics.engagementScore < 40 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Low Engagement Alert</h4>
                      <p className="text-sm text-primary">
                        AI engagement score is {kpiMetrics.engagementScore}/100. Case note language suggests low program investment or concerning behavioral patterns.
                      </p>
                    </div>
                  )}
                  {kpiMetrics.domainAverages.peer < 2 && kpiMetrics.caseNoteCount > 0 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Peer Interaction Concern</h4>
                      <p className="text-sm text-primary">
                        Peer domain score is {kpiMetrics.domainAverages.peer}/4.0. Notes indicate peer conflict patterns that may need intervention.
                      </p>
                    </div>
                  )}
                  {kpiMetrics.domainAverages.authority < 2 && kpiMetrics.caseNoteCount > 0 && (
                    <div className="p-3 border-l-4 border-secondary bg-secondary/20 rounded-r-md">
                      <h4 className="font-medium text-primary text-sm">Authority Compliance Concern</h4>
                      <p className="text-sm text-primary">
                        Authority domain score is {kpiMetrics.domainAverages.authority}/4.0. Notes suggest ongoing challenges with structure and rule compliance.
                      </p>
                    </div>
                  )}
                  {aiInsights.map((insight, idx) => (
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
