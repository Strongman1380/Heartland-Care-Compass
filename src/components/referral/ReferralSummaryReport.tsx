import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer } from "lucide-react";
import { format, differenceInDays, isValid } from "date-fns";

export interface ReferralSummaryItem {
  id: string;
  createdAt: string;
  referralName: string;
  referralSource: string;
  status: string;
  priority: string;
  archived: boolean;
  archivedAt?: string;
  archiveReason?: string;
  archiveReasonDetail?: string;
  referralNotes?: string;
  interviewScheduledDate?: string;
  staffRecommendation?: "yes" | "maybe" | "no" | null;
  parsedData?: {
    demographics?: Record<string, string>;
    legal?: Record<string, string>;
    [key: string]: Record<string, string> | undefined;
  } | null;
}

interface ReferralSummaryReportProps {
  open: boolean;
  onClose: () => void;
  history: ReferralSummaryItem[];
}

type DateRange = "30" | "60" | "90" | "180" | "365" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "30": "Last 30 Days",
  "60": "Last 60 Days",
  "90": "Last 90 Days",
  "180": "Last 6 Months",
  "365": "Last 12 Months",
  all: "All Time",
};

function cutoffDate(range: DateRange): Date | null {
  if (range === "all") return null;
  const d = new Date();
  d.setDate(d.getDate() - parseInt(range));
  return d;
}

function tallyTop(items: string[], n = 8): Array<{ name: string; count: number }> {
  const map: Record<string, number> = {};
  for (const item of items) {
    const key = item.trim();
    if (key) map[key] = (map[key] || 0) + 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

function formatDenialReason(item: ReferralSummaryItem): string {
  if (item.archiveReasonDetail && item.archiveReasonDetail.trim()) {
    return item.archiveReasonDetail.trim();
  }
  if (item.archiveReason && !item.archiveReason.startsWith("Automatically archived")) {
    return item.archiveReason.trim();
  }
  if (item.referralNotes && item.referralNotes.trim()) {
    return item.referralNotes.trim();
  }
  return "No specific reason recorded";
}

function safeDateDays(from: string | undefined, to: Date = new Date()): number | null {
  if (!from) return null;
  const d = new Date(from);
  if (!isValid(d)) return null;
  return Math.max(0, differenceInDays(to, d));
}

export function ReferralSummaryReport({ open, onClose, history }: ReferralSummaryReportProps) {
  const [dateRange, setDateRange] = useState<DateRange>("60");

  const filtered = useMemo(() => {
    const cutoff = cutoffDate(dateRange);
    if (!cutoff) return history;
    return history.filter((h) => {
      if (!h.createdAt) return false;
      return new Date(h.createdAt) >= cutoff;
    });
  }, [history, dateRange]);

  const stats = useMemo(() => {
    const total = filtered.length;

    // Use full filtered set (including archived) for all outcome counts so
    // auto-archived statuses like "denied" and "interviewed_no" are captured.
    const byStatus = (status: string) => filtered.filter((h) => h.status === status).length;
    const active = filtered.filter((h) => !h.archived);

    const denied = byStatus("denied");
    const accepted = byStatus("accepted");
    const interviewedYes = byStatus("interviewed_yes");
    const interviewedNo = byStatus("interviewed_no");
    const alreadyFoundPlacement = byStatus("already_found_placement");
    const waitlisted = byStatus("waitlisted");
    const interviewScheduled = active.filter((h) => h.status === "interview_scheduled").length;
    const pending =
      active.filter((h) =>
        ["pending_interview", "schedule_interview", "waiting_for_response", "new"].includes(h.status || "")
      ).length;

    const closedCount = denied + accepted + interviewedNo + alreadyFoundPlacement;
    const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
    const acceptanceRate = accepted + denied > 0 ? Math.round((accepted / (accepted + denied)) * 100) : 0;

    // Of everyone who was interviewed "yes" and either admitted or still pending:
    // what % actually got admitted?
    const interviewedYesTotalOutcomes = accepted + interviewedYes;
    const interviewedYesAdmissionRate =
      interviewedYesTotalOutcomes > 0
        ? Math.round((accepted / interviewedYesTotalOutcomes) * 100)
        : null;

    const priorityUrgent = filtered.filter((h) => h.priority === "urgent").length;
    const priorityHigh = filtered.filter((h) => h.priority === "high").length;
    const priorityRoutine = filtered.filter(
      (h) => !h.priority || h.priority === "routine"
    ).length;

    const staffYes = filtered.filter((h) => h.staffRecommendation === "yes").length;
    const staffMaybe = filtered.filter((h) => h.staffRecommendation === "maybe").length;
    const staffNo = filtered.filter((h) => h.staffRecommendation === "no").length;

    const sourceTop = tallyTop(filtered.map((h) => h.referralSource).filter(Boolean));

    const ages = filtered.flatMap((h) => {
      const a =
        h.parsedData?.demographics?.["Age"] ||
        h.parsedData?.demographics?.["age"] ||
        "";
      const n = parseInt(a);
      return isNaN(n) || n < 5 || n > 25 ? [] : [n];
    });
    const avgAge =
      ages.length > 0
        ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
        : null;

    const avgDaysToInterview = (() => {
      const arr = filtered
        .filter((h) => h.interviewScheduledDate && h.createdAt)
        .map((h) => {
          const diff =
            new Date(h.interviewScheduledDate!).getTime() -
            new Date(h.createdAt).getTime();
          return Math.max(0, Math.round(diff / (24 * 60 * 60 * 1000)));
        });
      return arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    })();

    // Month-by-month breakdown
    const monthMap: Record<string, number> = {};
    for (const h of filtered) {
      if (!h.createdAt) continue;
      const d = new Date(h.createdAt);
      const key = format(d, "MMM yyyy");
      monthMap[key] = (monthMap[key] || 0) + 1;
    }
    const monthlyBreakdown = Object.entries(monthMap)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([month, count]) => ({ month, count }));

    // ── Detailed lists ────────────────────────────────────────────────────────

    const deniedList = filtered
      .filter((h) => h.status === "denied")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((h) => ({
        name: h.referralName || "Unknown",
        source: h.referralSource || "—",
        receivedDate: h.createdAt,
        reason: formatDenialReason(h),
      }));

    const waitlistedList = filtered
      .filter((h) => h.status === "waitlisted")
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
      .map((h) => ({
        name: h.referralName || "Unknown",
        source: h.referralSource || "—",
        addedDate: h.createdAt,
        daysOnList: safeDateDays(h.createdAt),
      }));

    const interviewedYesNotAdmittedList = filtered
      .filter((h) => h.status === "interviewed_yes")
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .map((h) => ({
        name: h.referralName || "Unknown",
        source: h.referralSource || "—",
        receivedDate: h.createdAt,
        daysPending: safeDateDays(h.createdAt),
      }));

    return {
      total,
      pending,
      interviewScheduled,
      interviewedYes,
      interviewedNo,
      accepted,
      denied,
      waitlisted,
      alreadyFoundPlacement,
      closedCount,
      conversionRate,
      acceptanceRate,
      interviewedYesAdmissionRate,
      priorityUrgent,
      priorityHigh,
      priorityRoutine,
      staffYes,
      staffMaybe,
      staffNo,
      sourceTop,
      avgAge,
      avgDaysToInterview,
      monthlyBreakdown,
      deniedList,
      waitlistedList,
      interviewedYesNotAdmittedList,
    };
  }, [filtered]);

  const periodLabel = DATE_RANGE_LABELS[dateRange];
  const generatedDate = format(new Date(), "MMMM d, yyyy");

  const handlePrint = () => {
    const html = buildPrintHTML(stats, periodLabel, generatedDate);
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => {
        w.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Referral Summary Report</DialogTitle>
        </DialogHeader>

        {/* Controls */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Period:</span>
            <Select
              value={dateRange}
              onValueChange={(v) => setDateRange(v as DateRange)}
            >
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {DATE_RANGE_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Report Preview */}
        <div className="border rounded-lg bg-white p-6 space-y-6 text-sm font-sans">
          {/* Header */}
          <div className="border-b pb-4">
            <h1 className="text-lg font-bold text-gray-900">Heartland Boys Home</h1>
            <h2 className="text-base font-semibold text-gray-700 mt-0.5">
              Referral Intake Summary Report
            </h2>
            <div className="flex gap-6 mt-2 text-xs text-gray-500">
              <span>Period: <strong className="text-gray-700">{periodLabel}</strong></span>
              <span>Generated: <strong className="text-gray-700">{generatedDate}</strong></span>
              <span>Total referrals in period: <strong className="text-gray-700">{stats.total}</strong></span>
            </div>
          </div>

          {/* Volume & Outcomes */}
          <Section title="Referral Volume & Outcomes">
            <StatTable
              rows={[
                { label: "Total Referrals Received", value: stats.total, bold: true },
                { label: "Accepted / Admitted", value: stats.accepted, highlight: "green" },
                { label: "Interviewed – Yes (Pending Admission)", value: stats.interviewedYes, highlight: "teal" },
                { label: "Waitlisted", value: stats.waitlisted },
                { label: "Denied", value: stats.denied, highlight: "red" },
                { label: "Interviewed – No (Not Suitable)", value: stats.interviewedNo, highlight: "orange" },
                { label: "Already Found Placement", value: stats.alreadyFoundPlacement },
                { label: "Interview Scheduled", value: stats.interviewScheduled },
                { label: "Pending / Awaiting Contact", value: stats.pending },
              ]}
            />
          </Section>

          {/* Rates */}
          <Section title="Conversion Metrics">
            <StatTable
              rows={[
                {
                  label: "Conversion Rate (Accepted ÷ Total Received)",
                  value: `${stats.conversionRate}%`,
                },
                {
                  label: "Acceptance Rate (Accepted ÷ Accepted + Denied)",
                  value: `${stats.acceptanceRate}%`,
                },
                {
                  label: "Interviewed Yes → Admission Rate (Admitted ÷ Interviewed Yes + Admitted)",
                  value: stats.interviewedYesAdmissionRate != null
                    ? `${stats.interviewedYesAdmissionRate}%`
                    : "—",
                },
                {
                  label: "Interviewed Yes — Not Yet Admitted",
                  value: stats.interviewedYes,
                },
                {
                  label: "Average Days from Referral to Interview",
                  value: stats.avgDaysToInterview != null ? `${stats.avgDaysToInterview} days` : "—",
                },
                {
                  label: "Average Age of Youth Referred",
                  value: stats.avgAge != null ? `${stats.avgAge} years` : "—",
                },
              ]}
            />
          </Section>

          {/* Priority & Staff Rec side by side */}
          <div className="grid grid-cols-2 gap-6">
            <Section title="Priority Breakdown">
              <StatTable
                rows={[
                  { label: "Urgent", value: stats.priorityUrgent },
                  { label: "High", value: stats.priorityHigh },
                  { label: "Routine", value: stats.priorityRoutine },
                ]}
              />
            </Section>
            <Section title="Staff Recommendation">
              <StatTable
                rows={[
                  { label: "Yes – Recommend Admission", value: stats.staffYes },
                  { label: "Maybe – Further Review", value: stats.staffMaybe },
                  { label: "No – Do Not Admit", value: stats.staffNo },
                ]}
              />
            </Section>
          </div>

          {/* Denied Youth — Detail */}
          {stats.deniedList.length > 0 && (
            <Section title={`Denied Youth — Detail (${stats.deniedList.length})`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1 font-semibold text-gray-600 w-32">Name</th>
                    <th className="pb-1 font-semibold text-gray-600 w-24">Received</th>
                    <th className="pb-1 font-semibold text-gray-600 w-28">Source</th>
                    <th className="pb-1 font-semibold text-gray-600">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.deniedList.map(({ name, source, receivedDate, reason }, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 text-gray-800 font-medium pr-3">{name}</td>
                      <td className="py-1.5 text-gray-600 pr-3">
                        {receivedDate && isValid(new Date(receivedDate))
                          ? format(new Date(receivedDate), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="py-1.5 text-gray-600 pr-3 truncate max-w-[100px]">{source}</td>
                      <td className="py-1.5 text-gray-700">{reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Waitlisted Youth — Detail */}
          {stats.waitlistedList.length > 0 && (
            <Section title={`Waitlisted Youth — Detail (${stats.waitlistedList.length})`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1 font-semibold text-gray-600 w-32">Name</th>
                    <th className="pb-1 font-semibold text-gray-600 w-28">Source</th>
                    <th className="pb-1 font-semibold text-gray-600 w-28">Date Added</th>
                    <th className="pb-1 font-semibold text-gray-600 text-right w-24">Days on List</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.waitlistedList.map(({ name, source, addedDate, daysOnList }, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 text-gray-800 font-medium pr-3">{name}</td>
                      <td className="py-1.5 text-gray-600 pr-3 truncate max-w-[100px]">{source}</td>
                      <td className="py-1.5 text-gray-600 pr-3">
                        {addedDate && isValid(new Date(addedDate))
                          ? format(new Date(addedDate), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="py-1.5 text-right font-medium text-gray-800">
                        {daysOnList != null ? `${daysOnList}d` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Interviewed Yes — Not Yet Admitted */}
          {stats.interviewedYesNotAdmittedList.length > 0 && (
            <Section title={`Interviewed Yes — Not Yet Admitted (${stats.interviewedYesNotAdmittedList.length})`}>
              <p className="text-xs text-gray-500 mb-2">
                These youth passed the interview and received a positive recommendation but have not yet been formally admitted.
                {stats.interviewedYesAdmissionRate != null && (
                  <> Of all interviewed-yes outcomes, <strong className="text-gray-700">{stats.interviewedYesAdmissionRate}%</strong> resulted in admission.</>
                )}
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1 font-semibold text-gray-600 w-32">Name</th>
                    <th className="pb-1 font-semibold text-gray-600 w-28">Source</th>
                    <th className="pb-1 font-semibold text-gray-600 w-28">Referral Date</th>
                    <th className="pb-1 font-semibold text-gray-600 text-right w-28">Days Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.interviewedYesNotAdmittedList.map(({ name, source, receivedDate, daysPending }, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-1.5 text-gray-800 font-medium pr-3">{name}</td>
                      <td className="py-1.5 text-gray-600 pr-3 truncate max-w-[100px]">{source}</td>
                      <td className="py-1.5 text-gray-600 pr-3">
                        {receivedDate && isValid(new Date(receivedDate))
                          ? format(new Date(receivedDate), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="py-1.5 text-right font-medium text-gray-800">
                        {daysPending != null ? `${daysPending}d` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Top Sources */}
          {stats.sourceTop.length > 0 && (
            <Section title="Top Referral Sources">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1 font-semibold text-gray-600">Source</th>
                    <th className="pb-1 font-semibold text-gray-600 text-right w-16">Count</th>
                    <th className="pb-1 font-semibold text-gray-600 text-right w-16">%</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.sourceTop.map(({ name, count }) => (
                    <tr key={name} className="border-b last:border-0">
                      <td className="py-1 text-gray-800">{name}</td>
                      <td className="py-1 text-right font-medium text-gray-800">{count}</td>
                      <td className="py-1 text-right text-gray-500">
                        {stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Monthly intake */}
          {stats.monthlyBreakdown.length > 1 && (
            <Section title="Monthly Intake">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-1 font-semibold text-gray-600">Month</th>
                    <th className="pb-1 font-semibold text-gray-600 text-right w-24">Referrals</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthlyBreakdown.map(({ month, count }) => (
                    <tr key={month} className="border-b last:border-0">
                      <td className="py-1 text-gray-800">{month}</td>
                      <td className="py-1 text-right font-medium text-gray-800">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Footer */}
          <div className="border-t pt-3 text-xs text-gray-400">
            Heartland Care Compass &bull; Confidential &bull; Generated {generatedDate}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{title}</h3>
      {children}
    </div>
  );
}

type HighlightColor = "green" | "red" | "orange" | "teal";
const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  green: "text-green-700 font-bold",
  red: "text-red-700 font-bold",
  orange: "text-orange-700 font-bold",
  teal: "text-teal-700 font-bold",
};

function StatTable({
  rows,
}: {
  rows: Array<{
    label: string;
    value: string | number;
    bold?: boolean;
    highlight?: HighlightColor;
  }>;
}) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {rows.map(({ label, value, bold, highlight }) => (
          <tr key={label} className="border-b last:border-0">
            <td className={`py-1.5 text-gray-700 ${bold ? "font-semibold" : ""}`}>{label}</td>
            <td
              className={`py-1.5 text-right w-24 ${
                highlight
                  ? HIGHLIGHT_CLASSES[highlight]
                  : bold
                  ? "font-bold text-gray-900"
                  : "font-medium text-gray-800"
              }`}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Print HTML builder ────────────────────────────────────────────────────────

function row(label: string, value: string | number, color = "") {
  return `<tr><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#374151">${label}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;${color}">${value}</td></tr>`;
}

function section(title: string, content: string) {
  return `<div style="margin-bottom:20px"><h3 style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 6px">${title}</h3><table style="width:100%;font-size:12px;border-collapse:collapse">${content}</table></div>`;
}

type StatsShape = ReturnType<ReturnType<typeof makeStats>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStats() { return (s: any) => s as any; }

function buildPrintHTML(
  stats: StatsShape,
  periodLabel: string,
  generatedDate: string
): string {
  const sourcesHTML =
    stats.sourceTop.length === 0
      ? ""
      : section(
          "Top Referral Sources",
          `<tr style="border-bottom:2px solid #e5e7eb"><th style="padding:4px 8px;text-align:left;font-size:11px;color:#6b7280">Source</th><th style="padding:4px 8px;text-align:right;font-size:11px;color:#6b7280">Count</th><th style="padding:4px 8px;text-align:right;font-size:11px;color:#6b7280">%</th></tr>` +
          stats.sourceTop
            .map(
              ({ name, count }: { name: string; count: number }) =>
                `<tr><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${name}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${count}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280">${stats.total > 0 ? Math.round((count / stats.total) * 100) : 0}%</td></tr>`
            )
            .join("")
        );

  const monthlyHTML =
    stats.monthlyBreakdown.length <= 1
      ? ""
      : section(
          "Monthly Intake",
          `<tr style="border-bottom:2px solid #e5e7eb"><th style="padding:4px 8px;text-align:left;font-size:11px;color:#6b7280">Month</th><th style="padding:4px 8px;text-align:right;font-size:11px;color:#6b7280">Referrals</th></tr>` +
          stats.monthlyBreakdown
            .map(
              ({ month, count }: { month: string; count: number }) =>
                `<tr><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${month}</td><td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${count}</td></tr>`
            )
            .join("")
        );

  const deniedDetailHTML =
    stats.deniedList.length === 0
      ? ""
      : `<div style="margin-bottom:20px">
          <h3 style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 6px">Denied Youth — Detail (${stats.deniedList.length})</h3>
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:22%">Name</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:16%">Received</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:22%">Source</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280">Reason</th>
            </tr>
            ${stats.deniedList.map(({ name, source, receivedDate, reason }: { name: string; source: string; receivedDate: string; reason: string }) => {
              const d = receivedDate ? new Date(receivedDate) : null;
              const dateStr = d && !isNaN(d.getTime()) ? format(d, "MMM d, yyyy") : "—";
              return `<tr>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-weight:600">${name}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${dateStr}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${source}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${reason}</td>
              </tr>`;
            }).join("")}
          </table>
        </div>`;

  const waitlistDetailHTML =
    stats.waitlistedList.length === 0
      ? ""
      : `<div style="margin-bottom:20px">
          <h3 style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 6px">Waitlisted Youth — Detail (${stats.waitlistedList.length})</h3>
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:28%">Name</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:28%">Source</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:24%">Date Added</th>
              <th style="padding:4px 8px;text-align:right;color:#6b7280;width:20%">Days on List</th>
            </tr>
            ${stats.waitlistedList.map(({ name, source, addedDate, daysOnList }: { name: string; source: string; addedDate: string; daysOnList: number | null }) => {
              const d = addedDate ? new Date(addedDate) : null;
              const dateStr = d && !isNaN(d.getTime()) ? format(d, "MMM d, yyyy") : "—";
              return `<tr>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-weight:600">${name}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${source}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${dateStr}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${daysOnList != null ? `${daysOnList}d` : "—"}</td>
              </tr>`;
            }).join("")}
          </table>
        </div>`;

  const interviewedYesDetailHTML =
    stats.interviewedYesNotAdmittedList.length === 0
      ? ""
      : `<div style="margin-bottom:20px">
          <h3 style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:0 0 6px">Interviewed Yes — Not Yet Admitted (${stats.interviewedYesNotAdmittedList.length})</h3>
          <p style="font-size:11px;color:#6b7280;margin:0 0 6px">These youth passed the interview and were recommended for admission but have not been formally admitted.${stats.interviewedYesAdmissionRate != null ? ` Admission rate from interviewed-yes: <strong>${stats.interviewedYesAdmissionRate}%</strong>.` : ""}</p>
          <table style="width:100%;font-size:11px;border-collapse:collapse">
            <tr style="border-bottom:2px solid #e5e7eb">
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:28%">Name</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:28%">Source</th>
              <th style="padding:4px 8px;text-align:left;color:#6b7280;width:24%">Referral Date</th>
              <th style="padding:4px 8px;text-align:right;color:#6b7280;width:20%">Days Pending</th>
            </tr>
            ${stats.interviewedYesNotAdmittedList.map(({ name, source, receivedDate, daysPending }: { name: string; source: string; receivedDate: string; daysPending: number | null }) => {
              const d = receivedDate ? new Date(receivedDate) : null;
              const dateStr = d && !isNaN(d.getTime()) ? format(d, "MMM d, yyyy") : "—";
              return `<tr>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;font-weight:600">${name}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${source}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:#6b7280">${dateStr}</td>
                <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600">${daysPending != null ? `${daysPending}d` : "—"}</td>
              </tr>`;
            }).join("")}
          </table>
        </div>`;

  return `<!DOCTYPE html><html><head><title>Referral Summary Report</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12px; margin: 30px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 0 0 8px; color: #374151; }
  .meta { font-size: 11px; color: #6b7280; margin-bottom: 20px; }
  .meta strong { color: #374151; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
  .footer { margin-top: 24px; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  @media print { body { margin: 16px; } }
</style></head><body>
<h1>Heartland Boys Home</h1>
<h2>Referral Intake Summary Report</h2>
<div class="meta">
  Period: <strong>${periodLabel}</strong> &nbsp;&bull;&nbsp;
  Generated: <strong>${generatedDate}</strong> &nbsp;&bull;&nbsp;
  Total referrals: <strong>${stats.total}</strong>
</div>

${section(
  "Referral Volume & Outcomes",
  row("Total Referrals Received", stats.total, "font-weight:900;font-size:13px") +
    row("Accepted / Admitted", stats.accepted, "color:#15803d") +
    row("Interviewed – Yes (Pending Admission)", stats.interviewedYes, "color:#0f766e") +
    row("Waitlisted", stats.waitlisted) +
    row("Denied", stats.denied, "color:#b91c1c") +
    row("Interviewed – No (Not Suitable)", stats.interviewedNo, "color:#c2410c") +
    row("Already Found Placement", stats.alreadyFoundPlacement) +
    row("Interview Scheduled", stats.interviewScheduled) +
    row("Pending / Awaiting Contact", stats.pending)
)}

${section(
  "Conversion Metrics",
  row("Conversion Rate (Accepted ÷ Total Received)", `${stats.conversionRate}%`) +
    row("Acceptance Rate (Accepted ÷ Accepted + Denied)", `${stats.acceptanceRate}%`) +
    row(
      "Interviewed Yes → Admission Rate (Admitted ÷ Interviewed Yes + Admitted)",
      stats.interviewedYesAdmissionRate != null ? `${stats.interviewedYesAdmissionRate}%` : "—"
    ) +
    row("Interviewed Yes — Not Yet Admitted", stats.interviewedYes) +
    row(
      "Average Days from Referral to Interview",
      stats.avgDaysToInterview != null ? `${stats.avgDaysToInterview} days` : "—"
    ) +
    row(
      "Average Age of Youth Referred",
      stats.avgAge != null ? `${stats.avgAge} years` : "—"
    )
)}

<div class="two-col">
${section(
  "Priority Breakdown",
  row("Urgent", stats.priorityUrgent) +
    row("High", stats.priorityHigh) +
    row("Routine", stats.priorityRoutine)
)}
${section(
  "Staff Recommendation",
  row("Yes – Recommend Admission", stats.staffYes) +
    row("Maybe – Further Review", stats.staffMaybe) +
    row("No – Do Not Admit", stats.staffNo)
)}
</div>

${deniedDetailHTML}
${waitlistDetailHTML}
${interviewedYesDetailHTML}
${sourcesHTML}
${monthlyHTML}

<div class="footer">Heartland Care Compass &bull; Confidential &bull; Generated ${generatedDate}</div>
</body></html>`;
}
