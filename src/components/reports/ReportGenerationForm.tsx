
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
// Icons removed: switching to a simple dropdown for report type

import { ReportOptions } from "@/utils/report-service";

interface ReportGenerationFormProps {
  onGenerateReport: (options: ReportOptions) => void;
  isGenerating: boolean;
}

export const ReportGenerationForm = ({ onGenerateReport, isGenerating }: ReportGenerationFormProps) => {
  const [selectedReportType, setSelectedReportType] = useState<string>("progressMonthly");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [includeOptions, setIncludeOptions] = useState({
    profile: true,
    points: true,
    notes: true,
    assessment: false,
    documents: false,
  });
  const [outputFormat, setOutputFormat] = useState<'text' | 'pdf' | 'docx'>('pdf');
  const [useAI, setUseAI] = useState<boolean>(false);

  // Check if selected report type should auto-export to PDF
  const isDPNReport = selectedReportType.startsWith('dpn') || selectedReportType === 'court';
  const shouldAutoExportPDF = isDPNReport;

  // Handle report type change and auto-set PDF format for DPN reports
  const handleReportTypeChange = (value: string) => {
    setSelectedReportType(value);
    if (value.startsWith('dpn') || value === 'court') {
      setOutputFormat('pdf');
    }
  };

  const handleIncludeOptionChange = (option: string) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option as keyof typeof includeOptions]
    }));
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Generate Report</CardTitle>
        <CardDescription>Select report options and content to include</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <Label className="text-base font-medium mb-2 block">Report Type</Label>
            <div className="max-w-sm">
              <Select value={selectedReportType} onValueChange={handleReportTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progressMonthly">Monthly Progress Report</SelectItem>
                  <SelectItem value="court">Court Report (auto-exports PDF)</SelectItem>
                  <SelectItem value="dpnWeekly">DPN Weekly Progress Evaluation (auto-exports PDF)</SelectItem>
                  <SelectItem value="dpnBiWeekly">DPN Bi-Weekly Progress Evaluation (auto-exports PDF)</SelectItem>
                  <SelectItem value="dpnMonthly">DPN Monthly Progress Evaluation (auto-exports PDF)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label className="text-base font-medium mb-2 block">Time Period</Label>
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value)}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="allTime">All Time</SelectItem>
                <SelectItem value="last7">Last 7 Days</SelectItem>
                <SelectItem value="last30">Last 30 Days</SelectItem>
                <SelectItem value="last90">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {selectedPeriod === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input 
                    id="startDate" 
                    type="date" 
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input 
                    id="endDate" 
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div>
            <Label className="text-base font-medium mb-2 block">Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeProfile" 
                  checked={includeOptions.profile} 
                  onCheckedChange={() => handleIncludeOptionChange("profile")}
                />
                <Label htmlFor="includeProfile">Youth Profile Information</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includePoints" 
                  checked={includeOptions.points} 
                  onCheckedChange={() => handleIncludeOptionChange("points")}
                />
                <Label htmlFor="includePoints">Behavior Point Data</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeNotes" 
                  checked={includeOptions.notes} 
                  onCheckedChange={() => handleIncludeOptionChange("notes")}
                />
                <Label htmlFor="includeNotes">Case Notes</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeAssessment" 
                  checked={includeOptions.assessment} 
                  onCheckedChange={() => handleIncludeOptionChange("assessment")}
                />
                <Label htmlFor="includeAssessment">Risk Assessment Results</Label>
              </div>
              
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeDocuments" 
                  checked={includeOptions.documents} 
                  onCheckedChange={() => handleIncludeOptionChange("documents")}
                />
                <Label htmlFor="includeDocuments">Uploaded Documents</Label>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox 
                  id="useAI" 
                  checked={useAI} 
                  onCheckedChange={() => setUseAI(!useAI)}
                />
                <Label htmlFor="useAI">Use AI to draft narrative (if configured)</Label>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-base font-medium mb-2 block">Output Format</Label>
            {shouldAutoExportPDF ? (
              <div className="space-y-2">
                <div className="max-w-xs p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">PDF (.pdf)</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    {selectedReportType === 'court' ? 'Court reports' : 'DPN reports'} automatically export as PDF
                  </p>
                </div>
              </div>
            ) : (
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Plain Text (.txt)</SelectItem>
                  <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  <SelectItem value="docx">Word (.docx)</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Button
            className="w-full bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"
            onClick={() => {
              const options: ReportOptions = {
                reportType: selectedReportType as any,
                period: selectedPeriod as "allTime" | "last7" | "last30" | "last90" | "custom",
                customStartDate,
                customEndDate,
                includeOptions,
                outputFormat,
                useAI
              };
              // If user chose Monthly Progress, normalize to last30 period
              if (selectedReportType === 'progressMonthly') {
                options.period = 'last30';
              }
              onGenerateReport(options);
            }}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating Report..." : "Generate Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
