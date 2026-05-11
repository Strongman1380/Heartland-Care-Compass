import { useState, useEffect, useMemo } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download, FileJson, Calendar, Database, User,
  Loader2, CheckCircle2, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useYouth } from "@/hooks/useSupabase";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { fetchAllProgressNotes } from "@/utils/local-storage-utils";
import { getScoresByYouth } from "@/utils/schoolScores";
import {
  weeklyEvalService,
  dailyShiftService,
  caseNotesService,
} from "@/integrations/firebase/services";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import { youthService } from "@/integrations/firebase/services";
import { logger } from "@/utils/logger";

type ExportMode = "time_period" | "all_data";
type QuickRange = "last_30" | "last_90" | "this_month" | "last_month" | "custom";

interface DataSections {
  profile: boolean;
  behaviorPoints: boolean;
  dailyRatings: boolean;
  progressNotes: boolean;
  schoolScores: boolean;
  shiftScores: boolean;
  weeklyEvals: boolean;
  caseNotes: boolean;
  incidentReports: boolean;
}

const ALL_SECTIONS: DataSections = {
  profile: true,
  behaviorPoints: true,
  dailyRatings: true,
  progressNotes: true,
  schoolScores: true,
  shiftScores: true,
  weeklyEvals: true,
  caseNotes: true,
  incidentReports: true,
};

const SECTION_LABELS: Record<keyof DataSections, string> = {
  profile: "Youth Profile (full intake record)",
  behaviorPoints: "Behavior Points (daily totals)",
  dailyRatings: "Daily Performance Ratings (0–5)",
  progressNotes: "Progress / Case Notes",
  schoolScores: "School Scores",
  shiftScores: "Shift Scores (0–4)",
  weeklyEvals: "Weekly Evaluations",
  caseNotes: "Clinical Case Notes",
  incidentReports: "Incident Reports",
};

function getQuickRange(range: QuickRange): { start: Date; end: Date } {
  const today = new Date();
  switch (range) {
    case "last_30":
      return { start: subDays(today, 30), end: today };
    case "last_90":
      return { start: subDays(today, 90), end: today };
    case "this_month":
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case "last_month": {
      const lastMonth = subMonths(today, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    }
    default:
      return { start: subDays(today, 30), end: today };
  }
}

function inRange(dateValue: any, start: Date, end: Date): boolean {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  return d >= start && d <= end;
}

function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DataExportPage() {
  const navigate = useNavigate();
  const { youths, loading: youthsLoading, loadYouths } = useYouth();

  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [exportMode, setExportMode] = useState<ExportMode>("time_period");
  const [quickRange, setQuickRange] = useState<QuickRange>("last_30");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [sections, setSections] = useState<DataSections>({ ...ALL_SECTIONS });
  const [isExporting, setIsExporting] = useState(false);
  const [lastExport, setLastExport] = useState<string | null>(null);

  useEffect(() => { loadYouths(); }, []);

  const sortedYouths = useMemo(
    () => [...youths].sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName)),
    [youths]
  );

  const selectedYouth = useMemo(
    () => sortedYouths.find((y) => y.id === selectedYouthId) ?? null,
    [sortedYouths, selectedYouthId]
  );

  const toggleSection = (key: keyof DataSections) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const selectAll = () => setSections({ ...ALL_SECTIONS });
  const selectNone = () =>
    setSections(Object.fromEntries(Object.keys(ALL_SECTIONS).map((k) => [k, false])) as DataSections);

  const enabledCount = Object.values(sections).filter(Boolean).length;

  const handleExport = async () => {
    if (!selectedYouthId) {
      toast.error("Please select a youth first.");
      return;
    }
    if (enabledCount === 0) {
      toast.error("Select at least one data section to export.");
      return;
    }

    setIsExporting(true);
    try {
      const dateRange =
        exportMode === "time_period"
          ? quickRange === "custom"
            ? { start: new Date(customStart), end: new Date(customEnd) }
            : getQuickRange(quickRange)
          : null; // null = all time

      const filter = (dateValue: any) =>
        dateRange ? inRange(dateValue, dateRange.start, dateRange.end) : true;

      const exportPayload: Record<string, unknown> = {
        exportMetadata: {
          exportedAt: new Date().toISOString(),
          youthId: selectedYouthId,
          youthName: selectedYouth ? `${selectedYouth.firstName} ${selectedYouth.lastName}` : selectedYouthId,
          exportType: exportMode,
          dateRange: dateRange
            ? {
                start: format(dateRange.start, "yyyy-MM-dd"),
                end: format(dateRange.end, "yyyy-MM-dd"),
              }
            : "all_time",
          sectionsIncluded: Object.entries(sections)
            .filter(([, v]) => v)
            .map(([k]) => k),
        },
      };

      const fetches: Promise<void>[] = [];

      if (sections.profile) {
        fetches.push(
          youthService.getById(selectedYouthId)
            .then((data) => { exportPayload.profile = data ?? null; })
            .catch(() => { exportPayload.profile = null; })
        );
      }

      if (sections.behaviorPoints) {
        fetches.push(
          getBehaviorPointsByYouth(selectedYouthId)
            .then((data) => {
              exportPayload.behaviorPoints = (data ?? []).filter((p: any) => filter(p.date));
            })
            .catch(() => { exportPayload.behaviorPoints = []; })
        );
      }

      if (sections.dailyRatings) {
        fetches.push(
          getDailyRatingsByYouth(selectedYouthId)
            .then((data) => {
              exportPayload.dailyRatings = (data ?? []).filter((r: any) => filter(r.date));
            })
            .catch(() => { exportPayload.dailyRatings = []; })
        );
      }

      if (sections.progressNotes) {
        fetches.push(
          fetchAllProgressNotes(selectedYouthId)
            .then((data) => {
              exportPayload.progressNotes = (data ?? []).filter((n: any) => filter(n.date));
            })
            .catch(() => { exportPayload.progressNotes = []; })
        );
      }

      if (sections.schoolScores) {
        fetches.push(
          getScoresByYouth(selectedYouthId)
            .then((data) => {
              exportPayload.schoolScores = (data ?? []).filter((s: any) => filter(s.date));
            })
            .catch(() => { exportPayload.schoolScores = []; })
        );
      }

      if (sections.shiftScores) {
        fetches.push(
          dailyShiftService.forYouth(selectedYouthId)
            .then((data) => {
              exportPayload.shiftScores = (data ?? []).filter((s: any) => filter(s.date));
            })
            .catch(() => { exportPayload.shiftScores = []; })
        );
      }

      if (sections.weeklyEvals) {
        fetches.push(
          weeklyEvalService.forYouth(selectedYouthId)
            .then((data) => {
              exportPayload.weeklyEvals = (data ?? []).filter((w: any) => filter(w.week_date));
            })
            .catch(() => { exportPayload.weeklyEvals = []; })
        );
      }

      if (sections.caseNotes) {
        fetches.push(
          caseNotesService.getByYouthId(selectedYouthId)
            .then((data) => {
              exportPayload.caseNotes = (data ?? []).filter((n: any) => filter(n.date));
            })
            .catch(() => { exportPayload.caseNotes = []; })
        );
      }

      if (sections.incidentReports) {
        fetches.push(
          incidentReportsService.list()
            .then((data) => {
              exportPayload.incidentReports = (data ?? []).filter((i: any) => {
                const matchesYouth =
                  (i.youthInvolved ?? []).some((y: any) =>
                    y.id === selectedYouthId || y.name?.toLowerCase().includes(selectedYouth?.firstName?.toLowerCase() ?? "")
                  ) || i.youthName;
                return matchesYouth && filter(i.dateOfIncident);
              });
            })
            .catch(() => { exportPayload.incidentReports = []; })
        );
      }

      await Promise.all(fetches);

      const youthName = selectedYouth
        ? `${selectedYouth.lastName}_${selectedYouth.firstName}`
        : selectedYouthId;
      const dateLabel =
        exportMode === "all_data"
          ? "all_data"
          : quickRange === "custom"
          ? `${customStart}_to_${customEnd}`
          : quickRange;
      const filename = `HBH_export_${youthName}_${dateLabel}_${format(new Date(), "yyyyMMdd")}.json`;

      downloadJSON(exportPayload, filename);
      setLastExport(filename);
      toast.success(`Exported: ${filename}`);
    } catch (err) {
      logger.error("Data export error:", err);
      toast.error("Export failed. Check the console for details.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 pb-24 max-w-3xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-[#823131]/10">
            <FileJson className="h-6 w-6 text-[#823131]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Data Export</h1>
            <p className="text-sm text-muted-foreground">
              Download youth records as structured JSON for external use or AI analysis
            </p>
          </div>
        </div>

        {/* Step 1: Select youth */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              1. Select Youth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
              <SelectTrigger>
                <SelectValue placeholder={youthsLoading ? "Loading youth…" : "Choose a resident…"} />
              </SelectTrigger>
              <SelectContent>
                {sortedYouths.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.lastName}, {y.firstName}
                    {y.level ? ` — Level ${y.level}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Export mode */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              2. Date Range
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                onClick={() => setExportMode("time_period")}
                className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors text-left ${
                  exportMode === "time_period"
                    ? "border-[#823131] bg-[#823131]/5 text-[#823131]"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="font-semibold">Time Period</div>
                <div className="text-xs text-muted-foreground mt-0.5">Export records within a date range</div>
              </button>
              <button
                onClick={() => setExportMode("all_data")}
                className={`flex-1 rounded-lg border p-3 text-sm font-medium transition-colors text-left ${
                  exportMode === "all_data"
                    ? "border-[#823131] bg-[#823131]/5 text-[#823131]"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="font-semibold">All Data</div>
                <div className="text-xs text-muted-foreground mt-0.5">Export every record on file</div>
              </button>
            </div>

            {exportMode === "time_period" && (
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "last_30", label: "Last 30 days" },
                    { value: "last_90", label: "Last 90 days" },
                    { value: "this_month", label: "This month" },
                    { value: "last_month", label: "Last month" },
                    { value: "custom", label: "Custom range" },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setQuickRange(value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        quickRange === value
                          ? "bg-[#823131] text-white border-[#823131]"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {quickRange === "custom" && (
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">Start date</Label>
                      <Input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs mb-1 block">End date</Label>
                      <Input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {quickRange !== "custom" && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const r = getQuickRange(quickRange);
                      return `${format(r.start, "MMM d, yyyy")} → ${format(r.end, "MMM d, yyyy")}`;
                    })()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Data sections */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                3. Data Sections
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAll}>
                  All
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectNone}>
                  None
                </Button>
              </div>
            </div>
            <CardDescription>Choose which data types to include in the export</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2">
              {(Object.keys(SECTION_LABELS) as (keyof DataSections)[]).map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={sections[key]}
                    onCheckedChange={() => toggleSection(key)}
                    id={`section-${key}`}
                  />
                  <span className="text-sm">{SECTION_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export button */}
        <div className="space-y-3">
          <Button
            onClick={handleExport}
            disabled={isExporting || !selectedYouthId || enabledCount === 0}
            className="w-full bg-[#823131] hover:bg-[#6b2828] text-white h-12 text-base"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Collecting data…
              </>
            ) : (
              <>
                <Download className="h-5 w-5 mr-2" />
                Export JSON
                {selectedYouth && (
                  <Badge variant="secondary" className="ml-2 bg-white/20 text-white">
                    {enabledCount} section{enabledCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </>
            )}
          </Button>

          {lastExport && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Last export: {lastExport}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-center">
            The JSON file downloads to your device. It contains all selected records and the full
            youth profile when included. You can paste it directly into Claude for AI analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
