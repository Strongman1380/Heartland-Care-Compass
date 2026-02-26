import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { exportHTMLToDocx, exportHTMLToPDF } from "@/utils/export";
import { facilityNotesService, type FacilityNoteRow } from "@/integrations/firebase/facilityNotesService";
import { facilityReportsService, type FacilityReportRow } from "@/integrations/firebase/facilityReportsService";
import { referralNotesService, type ReferralNoteRow } from "@/integrations/firebase/referralNotesService";
import {
  behaviorPointsService,
  caseNotesService,
  dailyRatingsService,
  type BehaviorPoints,
  type CaseNotes,
  type DailyRatings,
  type Youth,
  youthService,
} from "@/integrations/firebase/services";
import { incidentReportsService } from "@/integrations/firebase/incidentReportsService";
import type { FacilityIncidentReport } from "@/types/facility-incident-types";

type Timeframe = "week" | "month" | "quarter" | "year";

const getTimeframeStart = (timeframe: Timeframe): Date => {
  const now = new Date();
  const start = new Date(now);
  if (timeframe === "week") start.setDate(now.getDate() - 7);
  else if (timeframe === "month") start.setMonth(now.getMonth() - 1);
  else if (timeframe === "quarter") start.setMonth(now.getMonth() - 3);
  else start.setFullYear(now.getFullYear() - 1);
  return start;
};

const parseDate = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  // For date-only strings (YYYY-MM-DD), parse as local midnight to avoid UTC offset issues
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const isInRange = (d: Date | null, startDate: Date): boolean => !!d && d >= startDate;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const AdminFacility = () => {
  const today = format(new Date(), "yyyy-MM-dd");
  const [noteDate, setNoteDate] = useState(today);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");
  const [staffName, setStaffName] = useState("");
  const [reportStaffName, setReportStaffName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState<string>("");
  const [reportHtml, setReportHtml] = useState("");
  const [reportGeneratedAt, setReportGeneratedAt] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [historyView, setHistoryView] = useState<"active" | "archived" | "all">("active");
  const [isSavingReport, setIsSavingReport] = useState(false);

  const [facilityNotes, setFacilityNotes] = useState<FacilityNoteRow[]>([]);
  const [facilityReports, setFacilityReports] = useState<FacilityReportRow[]>([]);
  const [youths, setYouths] = useState<Youth[]>([]);
  const [behaviorPoints, setBehaviorPoints] = useState<BehaviorPoints[]>([]);
  const [caseNotes, setCaseNotes] = useState<CaseNotes[]>([]);
  const [dailyRatings, setDailyRatings] = useState<DailyRatings[]>([]);
  const [facilityIncidents, setFacilityIncidents] = useState<FacilityIncidentReport[]>([]);
  const [referrals, setReferrals] = useState<ReferralNoteRow[]>([]);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [loadedNotes, loadedReports, loadedYouths, loadedPoints, loadedCaseNotes, loadedIncidents, loadedReferrals] = await Promise.all([
        facilityNotesService.list(),
        facilityReportsService.list(),
        youthService.getAll(),
        behaviorPointsService.getAll(),
        caseNotesService.getAll(),
        incidentReportsService.list(),
        referralNotesService.list(),
      ]);

      const ratingPromises = loadedYouths.map((youth) =>
        dailyRatingsService.getByYouthId(youth.id).catch(() => [])
      );
      const loadedRatings = (await Promise.all(ratingPromises)).flat();

      setFacilityNotes(loadedNotes);
      setFacilityReports(loadedReports);
      setYouths(loadedYouths);
      setBehaviorPoints(loadedPoints);
      setCaseNotes(loadedCaseNotes);
      setFacilityIncidents(loadedIncidents);
      setReferrals(loadedReferrals);
      setDailyRatings(loadedRatings);
      setLastRefreshAt(new Date().toISOString());
    } catch (error) {
      console.error("Failed to load facility admin data", error);
      toast.error("Failed to refresh facility data");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(() => {
    const start = getTimeframeStart(timeframe);
    const activeReferrals = referrals.filter((x) => !x.archived);

    const filteredCaseNotes = caseNotes.filter((x) => isInRange(parseDate(x.date || x.createdAt), start));
    const filteredRatings = dailyRatings.filter((x) => isInRange(parseDate(x.date || x.createdAt), start));
    const filteredPoints = behaviorPoints.filter((x) => isInRange(parseDate(x.date || x.createdAt), start));
    const filteredIncidents = facilityIncidents.filter((x) => isInRange(parseDate(x.dateOfIncident || x.createdAt), start));
    const filteredReferrals = activeReferrals.filter((x) => isInRange(parseDate(x.created_at), start));
    const filteredFacilityNotes = facilityNotes.filter((x) => isInRange(parseDate(x.note_date || x.created_at), start));

    const totalPoints = filteredPoints.reduce((sum, row) => sum + (row.totalPoints || 0), 0);
    const avgPoints = filteredPoints.length ? Number((totalPoints / filteredPoints.length).toFixed(1)) : 0;

    return {
      activeYouth: youths.length,
      caseNotes: filteredCaseNotes.length,
      ratings: filteredRatings.length,
      behaviorPoints: filteredPoints.length,
      avgPoints,
      incidents: filteredIncidents.length,
      referrals: filteredReferrals.length,
      facilityNotes: filteredFacilityNotes.length,
      filteredFacilityNotes,
    };
  }, [timeframe, referrals, caseNotes, dailyRatings, behaviorPoints, facilityIncidents, facilityNotes, youths.length]);

  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !noteText.trim()) {
      toast.error("Title and note text are required");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(noteDate)) {
      toast.error("Invalid date format");
      return;
    }
    try {
      setIsSaving(true);
      await facilityNotesService.save({
        note_date: noteDate,
        title: noteTitle.trim(),
        note_text: noteText.trim(),
        author_name: staffName.trim() || null,
      });
      toast.success("Facility note saved");
      setNoteTitle("");
      setNoteText("");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save facility note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error("Paste at least one note line to import");
      return;
    }

    const parsedRows = lines
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length < 2) return null;

        if (parts.length >= 3 && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
          const [, ...rest] = parts;
          return {
            note_date: parts[0],
            title: rest[0] || "Facility Note",
            note_text: rest.slice(1).join(" | ").trim() || "",
          };
        }

        return {
          note_date: noteDate,
          title: parts[0] || "Facility Note",
          note_text: parts.slice(1).join(" | ").trim() || "",
        };
      })
      .filter((row): row is { note_date: string; title: string; note_text: string } => !!row && !!row.note_text);

    if (parsedRows.length === 0) {
      toast.error("Could not parse bulk lines. Use `YYYY-MM-DD | Title | Note` or `Title | Note`.");
      return;
    }

    try {
      setIsBulkSaving(true);
      await Promise.all(
        parsedRows.map((row) =>
          facilityNotesService.save({
            note_date: row.note_date,
            title: row.title,
            note_text: row.note_text,
            author_name: staffName.trim() || null,
          })
        )
      );
      toast.success(`Imported ${parsedRows.length} facility notes`);
      setBulkText("");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Bulk import failed");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await facilityNotesService.delete(id);
      setFacilityNotes((prev) => prev.filter((note) => note.id !== id));
      toast.success("Facility note deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete note");
    }
  };

  const generateFacilityReport = () => {
    const generatedAt = new Date();
    const generatedIso = generatedAt.toISOString();
    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.45;">
        <h1 style="margin: 0 0 8px 0;">Heartland Facility Report</h1>
        <p style="margin: 0 0 16px 0;">Generated: ${escapeHtml(format(generatedAt, "MMMM d, yyyy h:mm a"))}</p>
        <p style="margin: 0 0 16px 0;">Timeframe: ${escapeHtml(timeframe)}</p>

        <h2 style="margin: 18px 0 8px 0;">Program KPIs</h2>
        <ul>
          <li>Active Youth: ${metrics.activeYouth}</li>
          <li>Case Notes (window): ${metrics.caseNotes}</li>
          <li>Daily Ratings (window): ${metrics.ratings}</li>
          <li>Behavior Points Entries (window): ${metrics.behaviorPoints}</li>
          <li>Average Points / Entry (window): ${metrics.avgPoints}</li>
          <li>Facility Incidents (window): ${metrics.incidents}</li>
          <li>Referrals (active, window): ${metrics.referrals}</li>
          <li>Facility Notes (window): ${metrics.facilityNotes}</li>
        </ul>

        <h2 style="margin: 18px 0 8px 0;">Facility Notes Included In Report</h2>
        ${
          metrics.filteredFacilityNotes.length === 0
            ? "<p>No facility notes in selected timeframe.</p>"
            : metrics.filteredFacilityNotes
                .map(
                  (note) => `
                    <div style="margin: 0 0 12px 0; padding: 10px; border: 1px solid #e5e7eb; border-radius: 6px;">
                      <div style="font-weight: 700;">${escapeHtml(note.title)}</div>
                      <div style="font-size: 12px; color: #6b7280; margin: 3px 0 8px 0;">
                        Date: ${escapeHtml(note.note_date)}${note.author_name ? ` | Staff: ${escapeHtml(note.author_name)}` : ""}
                      </div>
                      <div style="white-space: pre-wrap;">${escapeHtml(note.note_text)}</div>
                    </div>
                  `
                )
                .join("")
        }
      </div>
    `;

    setReportHtml(html);
    setReportGeneratedAt(generatedIso);
    setReportTitle(`Facility Report - ${format(generatedAt, "MMM d, yyyy")} (${timeframe})`);
    toast.success("Facility report generated");
  };

  const handleSaveReportSnapshot = async () => {
    if (!reportHtml) {
      toast.error("Generate a facility report first");
      return;
    }
    try {
      setIsSavingReport(true);
      await facilityReportsService.save({
        title: reportTitle.trim() || `Facility Report - ${format(new Date(), "MMM d, yyyy")}`,
        timeframe,
        generated_at: reportGeneratedAt || new Date().toISOString(),
        generated_by: reportStaffName.trim() || null,
        report_html: reportHtml,
        kpi_snapshot: {
          activeYouth: metrics.activeYouth,
          caseNotes: metrics.caseNotes,
          ratings: metrics.ratings,
          behaviorPoints: metrics.behaviorPoints,
          avgPoints: metrics.avgPoints,
          incidents: metrics.incidents,
          referrals: metrics.referrals,
          facilityNotes: metrics.facilityNotes,
        },
        archived: false,
        archived_at: null,
      });
      toast.success("Facility report snapshot saved");
      await loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save report snapshot");
    } finally {
      setIsSavingReport(false);
    }
  };

  const handleExportPdf = async () => {
    if (!reportHtml) {
      toast.error("Generate a facility report first");
      return;
    }
    try {
      const filename = `Facility-Report-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      await exportHTMLToPDF(reportHtml, filename);
      toast.success("Facility report PDF exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export PDF");
    }
  };

  const handleExportDocx = async () => {
    if (!reportHtml) {
      toast.error("Generate a facility report first");
      return;
    }
    try {
      const filename = `Facility-Report-${format(new Date(), "yyyy-MM-dd")}.docx`;
      await exportHTMLToDocx(reportHtml, filename);
      toast.success("Facility report DOCX exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export DOCX");
    }
  };

  const exportHistoryReportPdf = async (report: FacilityReportRow) => {
    try {
      const d = parseDate(report.generated_at) || new Date();
      const filename = `Facility-Report-${format(d, "yyyy-MM-dd")}-${report.id.slice(0, 6)}.pdf`;
      await exportHTMLToPDF(report.report_html, filename);
      toast.success("Report PDF exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export report PDF");
    }
  };

  const exportHistoryReportDocx = async (report: FacilityReportRow) => {
    try {
      const d = parseDate(report.generated_at) || new Date();
      const filename = `Facility-Report-${format(d, "yyyy-MM-dd")}-${report.id.slice(0, 6)}.docx`;
      await exportHTMLToDocx(report.report_html, filename);
      toast.success("Report DOCX exported");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export report DOCX");
    }
  };

  const setReportArchived = async (id: string, archived: boolean) => {
    try {
      await facilityReportsService.update(id, {
        archived,
        archived_at: archived ? new Date().toISOString() : null,
      });
      setFacilityReports((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, archived, archived_at: archived ? new Date().toISOString() : null }
            : row
        )
      );
      toast.success(archived ? "Report archived" : "Report restored");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update report archive status");
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await facilityReportsService.delete(id);
      setFacilityReports((prev) => prev.filter((row) => row.id !== id));
      toast.success("Report deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete report");
    }
  };

  const filteredReportHistory = useMemo(() => {
    if (historyView === "all") return facilityReports;
    if (historyView === "archived") return facilityReports.filter((x) => x.archived);
    return facilityReports.filter((x) => !x.archived);
  }, [facilityReports, historyView]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
              Admin Facility Operations
            </h1>
            <p className="text-red-700 mt-1">Facility notes and facility-level report generation with live KPIs.</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="quarter">Past Quarter</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadData} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Active Youth</p><p className="text-xl font-semibold">{metrics.activeYouth}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Case Notes</p><p className="text-xl font-semibold">{metrics.caseNotes}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Daily Ratings</p><p className="text-xl font-semibold">{metrics.ratings}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Point Entries</p><p className="text-xl font-semibold">{metrics.behaviorPoints}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Avg Points</p><p className="text-xl font-semibold">{metrics.avgPoints}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Incidents</p><p className="text-xl font-semibold">{metrics.incidents}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Referrals</p><p className="text-xl font-semibold">{metrics.referrals}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Facility Notes</p><p className="text-xl font-semibold">{metrics.facilityNotes}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Facility Note Entry</CardTitle>
            <CardDescription>Create a daily facility note used in facility reporting.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
              </div>
              <div>
                <Label>Staff Name</Label>
                <Input placeholder="Your name" value={staffName} onChange={(e) => setStaffName(e.target.value)} />
              </div>
              <div>
                <Label>Title</Label>
                <Input placeholder="Daily operations summary" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Note</Label>
              <Textarea rows={4} placeholder="Enter facility note details..." value={noteText} onChange={(e) => setNoteText(e.target.value)} />
            </div>
            <Button onClick={handleSaveNote} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Facility Note"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Import Facility Notes</CardTitle>
            <CardDescription>
              One note per line. Format: <code>YYYY-MM-DD | Title | Note</code> or <code>Title | Note</code> (uses selected date).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={6}
              placeholder="2026-02-24 | Evening shift | Improved transitions and reduced peer conflict..."
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <Button onClick={handleBulkImport} disabled={isBulkSaving}>
              {isBulkSaving ? "Importing..." : "Import Notes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generate Facility Report</CardTitle>
            <CardDescription>
              Combines live KPI calculations and facility notes for the selected timeframe.
              {lastRefreshAt ? ` Last refresh: ${format(new Date(lastRefreshAt), "MMM d, yyyy h:mm a")}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Report Title</Label>
                <Input
                  placeholder="Facility Report title"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                />
              </div>
              <div>
                <Label>Prepared By</Label>
                <Input
                  placeholder="Staff name for report metadata"
                  value={reportStaffName}
                  onChange={(e) => setReportStaffName(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={generateFacilityReport}>Generate Report</Button>
              <Button variant="secondary" onClick={handleSaveReportSnapshot} disabled={isSavingReport || !reportHtml}>
                {isSavingReport ? "Saving..." : "Save Report Snapshot"}
              </Button>
              <Button variant="outline" onClick={handleExportPdf}>Export PDF</Button>
              <Button variant="outline" onClick={handleExportDocx}>Export DOCX</Button>
            </div>
            {reportHtml ? (
              <div className="rounded-md border bg-white p-4 max-h-[500px] overflow-y-auto">
                <div dangerouslySetInnerHTML={{ __html: reportHtml }} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No facility report generated yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facility Report History</CardTitle>
            <CardDescription>Saved report snapshots for reuse, export, and archive workflow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="w-44">
              <Label className="mb-1 block">History View</Label>
              <Select value={historyView} onValueChange={(v) => setHistoryView(v as "active" | "archived" | "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredReportHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved facility reports in this view.</p>
            ) : (
              <div className="space-y-2">
                {filteredReportHistory.slice(0, 50).map((report) => (
                  <div key={report.id} className="rounded-md border p-3 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Generated: {format(parseDate(report.generated_at) || new Date(), "MMM d, yyyy h:mm a")}
                          {" | "}Timeframe: {report.timeframe}
                          {report.generated_by ? ` | Staff: ${report.generated_by}` : ""}
                        </p>
                        <div className="mt-1 flex gap-2">
                          {report.archived && <Badge variant="outline">Archived</Badge>}
                          {report.kpi_snapshot && (
                            <Badge variant="secondary">
                              Youth: {(report.kpi_snapshot.activeYouth as number) ?? "-"} / Incidents: {(report.kpi_snapshot.incidents as number) ?? "-"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 justify-end">
                        <Button size="sm" variant="outline" onClick={() => exportHistoryReportPdf(report)}>PDF</Button>
                        <Button size="sm" variant="outline" onClick={() => exportHistoryReportDocx(report)}>DOCX</Button>
                        {!report.archived ? (
                          <Button size="sm" variant="outline" onClick={() => setReportArchived(report.id, true)}>Archive</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setReportArchived(report.id, false)}>Restore</Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => {
                            if (confirm(`Delete report \"${report.title}\"? This cannot be undone.`)) {
                              deleteReport(report.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Facility Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {facilityNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No facility notes saved yet.</p>
            ) : (
              <div className="space-y-2">
                {facilityNotes.slice(0, 40).map((note) => (
                  <div key={note.id} className="rounded-md border p-3 bg-white">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{note.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {note.note_date} {note.author_name ? `| ${note.author_name}` : ""}
                        </p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{note.note_text}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        onClick={() => {
                          if (confirm(`Delete note "${note.title}"? This cannot be undone.`)) {
                            handleDeleteNote(note.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminFacility;
