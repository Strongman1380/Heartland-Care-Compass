
import { useState } from "react";
import { ReportGenerationForm } from "./ReportGenerationForm";
import { RecentReports } from "./RecentReports";
import { ReportTemplates } from "./ReportTemplates";

interface ReportCenterProps {
  youthId: string;
  youth: any;
}

export const ReportCenter = ({ youthId, youth }: ReportCenterProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    // In a real application, this would trigger report generation via a PDF library
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
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
    </div>
  );
};
