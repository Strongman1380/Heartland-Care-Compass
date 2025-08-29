
import { useState } from "react";
import { ReportGenerationForm } from "./ReportGenerationForm";
import { RecentReports } from "./RecentReports";
import { ReportTemplates } from "./ReportTemplates";
import { generateReport, downloadReport, ReportOptions } from "@/utils/report-service";
import { useToast } from "@/hooks/use-toast";

interface ReportCenterProps {
  youthId: string;
  youth: any;
}

export const ReportCenter = ({ youthId, youth }: ReportCenterProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  const handleGenerateReport = async (options: ReportOptions) => {
    setIsGenerating(true);
    
    try {
      const reportContent = await generateReport(youth, options);
      const filename = `${youth.firstName}_${youth.lastName}_${options.reportType}_report_${new Date().toISOString().split('T')[0]}.txt`;
      
      downloadReport(reportContent, filename);
      
      toast({
        title: "Report Generated",
        description: `${options.reportType.charAt(0).toUpperCase() + options.reportType.slice(1)} report has been downloaded successfully.`,
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
    </div>
  );
};
