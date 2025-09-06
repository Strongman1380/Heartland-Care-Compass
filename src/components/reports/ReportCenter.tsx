
import { useState } from "react";
import { ReportGenerationForm, type GenerateReportOptions } from "./ReportGenerationForm";
import { RecentReports } from "./RecentReports";
import { ReportTemplates } from "./ReportTemplates";
import { ReportPreview } from "./ReportPreview";

interface ReportCenterProps {
  youthId: string | null;
  youth: any | null;
}

export const ReportCenter = ({ youthId, youth }: ReportCenterProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeOptions, setActiveOptions] = useState<GenerateReportOptions | null>(null);

  const handleGenerateReport = (options: GenerateReportOptions) => {
    // Clear any existing preview and set new options
    setIsGenerating(true);
    setActiveOptions(null);
    // Debounce a beat so the UI can clear
    setTimeout(() => {
      setActiveOptions(options);
      setIsGenerating(false);
    }, 150);
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
        <div className="lg:col-span-2 space-y-6">
          <ReportGenerationForm 
            onGenerateReport={handleGenerateReport}
            isGenerating={isGenerating}
            onReportTypeChange={() => setActiveOptions(null)}
            onPeriodChange={() => setActiveOptions(null)}
          />

          {/* Preview: Clears automatically when type/period change */}
          {activeOptions && youthId && (
            <ReportPreview youthId={youthId} youth={youth} options={activeOptions} />
          )}
        </div>

        <div className="space-y-6">
          <RecentReports />
          <ReportTemplates />
        </div>
      </div>
    </div>
  );
};
