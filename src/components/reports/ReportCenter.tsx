
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
  
  const handleGenerateReport = async (options: ReportOptions) => {
    setIsGenerating(true);
    
    try {
      if (options.reportType === 'court') {
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
      const base = `${youth.firstName}_${youth.lastName}_${options.reportType}_report_${new Date().toISOString().split('T')[0]}`;
      if (effectiveOptions.outputFormat === 'pdf' || effectiveOptions.outputFormat === 'docx') {
        let styledHTML = await generateReportHTML(youth, { ...effectiveOptions });
        // Optional AI narrative
        if (options.useAI) {
          const now = new Date();
          const start = new Date(now);
          start.setDate(now.getDate() - (effectiveOptions.period === 'last30' ? 30 : effectiveOptions.period === 'last7' ? 7 : 90));
          const aiText = await summarizeReport({
            youth,
            reportType: effectiveType,
            period: { startDate: start.toISOString(), endDate: now.toISOString() },
            data: {},
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
          <CourtReport youth={youth} />
        </div>
      )}
      {dpnVariant && (
        <div className="space-y-4">
          <DpnReport youth={youth} variant={dpnVariant} />
        </div>
      )}

      {/* Hidden container for export to PDF/DOCX */}
      <div ref={exportRef} style={{ position: 'absolute', left: '-99999px', top: 0 }} aria-hidden="true" />
    </div>
  );
};
