
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { courtReportTemplate, monthlyProgressTemplate } from "./reportTemplateData";

const downloadTemplate = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const ReportTemplates = () => {
  const handleCourtReportTemplateDownload = () => {
    downloadTemplate(courtReportTemplate, 'Court_Report_Template.txt');
  };

  const handleMonthlyProgressTemplateDownload = () => {
    downloadTemplate(monthlyProgressTemplate, 'Monthly_Progress_Template.txt');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Templates</CardTitle>
        <CardDescription>Use standardized templates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            className="w-full justify-start text-left"
            onClick={handleCourtReportTemplateDownload}
          >
            <Download size={16} className="mr-2" />
            <div>
              <p>Court Report Template</p>
              <p className="text-xs text-gray-500">Official format for court submissions</p>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start text-left"
            onClick={handleMonthlyProgressTemplateDownload}
          >
            <Download size={16} className="mr-2" />
            <div>
              <p>Monthly Progress Template</p>
              <p className="text-xs text-gray-500">Standardized monthly summary</p>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
