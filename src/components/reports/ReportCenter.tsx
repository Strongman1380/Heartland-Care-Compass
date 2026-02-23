
import { useState } from "react";
import { ReportGenerationForm } from "./ReportGenerationForm";
import { RecentReports } from "./RecentReports";
import { ReportTemplates } from "./ReportTemplates";
import { generateReport, downloadReport, ReportOptions, generateReportHTML } from "@/utils/report-service";
import { exportElementToPDF, exportElementToDocx, exportHTMLToPDF, exportHTMLToDocx } from "@/utils/export";
import { useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { CourtReport } from "./CourtReport";
import { DpnReport } from "./DpnReport";
import { summarizeReport } from "@/lib/aiClient";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth, getProgressNotesByYouth } from "@/lib/api";
import { getScoresByYouth } from "@/utils/schoolScores";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "@/utils/local-storage-utils";
import { buildReportFilename } from "@/utils/reportFilenames";

interface ReportCenterProps {
  youthId: string;
  youth: any;
}

export const ReportCenter = ({ youthId, youth }: ReportCenterProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  const exportRef = useRef<HTMLDivElement>(null);
  const [showCourtReport, setShowCourtReport] = useState(false);
  const [dpnVariant, setDpnVariant] = useState<null | 'weekly' | 'biweekly' | 'monthly'>(null);
  const [formKey, setFormKey] = useState(0);
  
  const handleGenerateReport = async (options: ReportOptions) => {
    setIsGenerating(true);
    
    try {
      if (options.reportType === 'court') {
        toast({
          title: "Generating Court Report",
          description: "The court report will be displayed and automatically exported as a PDF.",
        });
        setShowCourtReport(true);
        setIsGenerating(false);
        return;
      }
      if (['dpnWeekly','dpnBiWeekly','dpnMonthly'].includes(options.reportType as any)) {
        setDpnVariant(options.reportType === 'dpnWeekly' ? 'weekly' : options.reportType === 'dpnBiWeekly' ? 'biweekly' : 'monthly');
        setIsGenerating(false);
        return;
      }

      // Normalize monthly progress to progress content with a monthly title
      const effectiveType = options.reportType === 'progressMonthly' ? 'progress' : options.reportType;
      const effectiveOptions = { ...options, reportType: effectiveType as any } as ReportOptions;
      const reportTypeLabel = options.reportType === "progressMonthly"
        ? "Monthly Progress Report"
        : options.reportType
            .replace(/([a-z])([A-Z])/g, "$1 $2")
            .replace(/^./, (c) => c.toUpperCase());
      const base = buildReportFilename(youth, reportTypeLabel, new Date());
      if (effectiveOptions.outputFormat === 'pdf' || effectiveOptions.outputFormat === 'docx') {
        let styledHTML = await generateReportHTML(youth, { ...effectiveOptions });
        // Optional AI narrative
        if (options.useAI) {
          const now = new Date();
          const range = (() => {
            switch (effectiveOptions.period) {
              case 'last7':
                return { start: new Date(now.getTime() - 7*24*60*60*1000), end: now };
              case 'last30':
                return { start: new Date(now.getTime() - 30*24*60*60*1000), end: now };
              case 'last90':
                return { start: new Date(now.getTime() - 90*24*60*60*1000), end: now };
              case 'custom':
                return { start: effectiveOptions.customStartDate ? new Date(effectiveOptions.customStartDate) : new Date(now.getTime() - 30*24*60*60*1000), end: effectiveOptions.customEndDate ? new Date(effectiveOptions.customEndDate) : now };
              case 'allTime':
              default:
                return { start: new Date('2020-01-01'), end: now };
            }
          })();
          const [allPoints, allNotes, allRatings, allSchoolScores] = await Promise.all([
            getBehaviorPointsByYouth(youth.id).catch(() => fetchBehaviorPoints(youth.id)),
            getProgressNotesByYouth(youth.id).catch(() => fetchProgressNotes(youth.id) as any),
            getDailyRatingsByYouth(youth.id).catch(() => fetchDailyRatings(youth.id) as any),
            getScoresByYouth(youth.id).catch((error) => {
              console.warn('Failed to load school scores for AI report generation:', error);
              return [];
            }),
          ]);
          const inRange = (d?: any) => d && new Date(d) >= range.start && new Date(d) <= range.end;
          const data = {
            behaviorPoints: (allPoints || []).filter((p:any)=> inRange(p.date)),
            progressNotes: (allNotes || []).filter((n:any)=> inRange(n.date)),
            dailyRatings: (allRatings || []).filter((r:any)=> inRange(r.date)),
            schoolScores: (allSchoolScores || []).filter((s:any)=> inRange(s.date)),
          };
          const aiText = await summarizeReport({
            youth,
            reportType: effectiveType,
            period: { startDate: range.start.toISOString(), endDate: range.end.toISOString() },
            data,
          });
          if (aiText) {
            const aiSection = `\n<div style="margin:12pt 0;">\n  <h3 style="font-size:12pt; margin:0 0 6pt;">AI-Assisted Narrative</h3>\n  <div style="font-size:11pt; white-space:pre-wrap;">${aiText.replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'} as any)[c])}</div>\n</div>`;
            styledHTML = styledHTML.replace('</div>', `${aiSection}</div>`);
          }
        }
        // Export directly from HTML string to avoid invisible DOM rendering issues
        if (effectiveOptions.outputFormat === 'pdf') {
          await exportHTMLToPDF(styledHTML, `${base}.pdf`);
        } else {
          await exportHTMLToDocx(styledHTML, `${base}.docx`);
        }
      } else {
        const reportContent = await generateReport(youth, effectiveOptions);
        downloadReport(reportContent, `${base}.txt`);
      }
      
      toast({
        title: "Report Generated",
        description: `${options.reportType.charAt(0).toUpperCase() + options.reportType.slice(1)} report downloaded successfully.`,
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Report Center</h2>
          <p className="text-gray-600 mb-4">Generate customized reports for youth progress and documentation.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ReportGenerationForm 
          key={formKey}
          onGenerateReport={handleGenerateReport}
          isGenerating={isGenerating}
        />

        <div className="space-y-6">
          <RecentReports />
          <ReportTemplates />
        </div>
      </div>

      {showCourtReport && (
        <div className="space-y-4">
          <CourtReport key={youth?.id || 'court-report'} youth={youth} />
        </div>
      )}
      {dpnVariant && (
        <div className="space-y-4">
          <DpnReport 
            key={`${youth?.id || 'dpn-report'}-${dpnVariant}`}
            youth={youth} 
            variant={dpnVariant}
            onAutoExportComplete={() => {
              toast({
                title: "DPN PDF Exported",
                description: "Download complete. Resetting to generate another report.",
              });
              setDpnVariant(null);
              setFormKey(k => k + 1);
            }}
          />
        </div>
      )}

      {/* Hidden container for export to PDF/DOCX */}
      <div ref={exportRef} style={{ position: 'absolute', left: '-99999px', top: 0 }} aria-hidden="true" />
    </div>
  );
};
