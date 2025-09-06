
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, FilePlus, FileCheck } from "lucide-react";

export type ReportType = "comprehensive" | "summary" | "progress";
export type ReportPeriod = "allTime" | "last7" | "last30" | "last90" | "custom";

export interface GenerateReportOptions {
  reportType: ReportType;
  period: ReportPeriod;
  startDate?: string;
  endDate?: string;
  include: {
    profile: boolean;
    points: boolean;
    notes: boolean;
    assessment: boolean;
    successPlan: boolean;
    documents: boolean;
  };
}

interface ReportGenerationFormProps {
  onGenerateReport: (options: GenerateReportOptions) => void;
  isGenerating: boolean;
  onReportTypeChange?: (reportType: ReportType) => void;
  onPeriodChange?: (period: ReportPeriod) => void;
}

export const ReportGenerationForm = ({ onGenerateReport, isGenerating, onReportTypeChange, onPeriodChange }: ReportGenerationFormProps) => {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("comprehensive");
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("last30");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [includeOptions, setIncludeOptions] = useState({
    profile: true,
    points: true,
    notes: true,
    assessment: false,
    successPlan: false,
    documents: false,
  });

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                className={`p-4 border rounded-md cursor-pointer ${
                  selectedReportType === "comprehensive" ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => { setSelectedReportType("comprehensive"); onReportTypeChange?.("comprehensive"); }}
              >
                <FileText className="h-5 w-5 text-blue-600 mb-2" />
                <h4 className="font-medium">Comprehensive Report</h4>
                <p className="text-sm text-gray-500 mt-1">Complete overview of all youth data and progress</p>
              </div>
              
              <div 
                className={`p-4 border rounded-md cursor-pointer ${
                  selectedReportType === "summary" ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => { setSelectedReportType("summary"); onReportTypeChange?.("summary"); }}
              >
                <FilePlus className="h-5 w-5 text-blue-600 mb-2" />
                <h4 className="font-medium">Summary Report</h4>
                <p className="text-sm text-gray-500 mt-1">Condensed highlights of key information</p>
              </div>
              
              <div 
                className={`p-4 border rounded-md cursor-pointer ${
                  selectedReportType === "progress" ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => { setSelectedReportType("progress"); onReportTypeChange?.("progress"); }}
              >
                <FileCheck className="h-5 w-5 text-blue-600 mb-2" />
                <h4 className="font-medium">Progress Report</h4>
                <p className="text-sm text-gray-500 mt-1">Focus on behavior points and goal progress</p>
              </div>
            </div>
          </div>
          
          <div>
            <Label className="text-base font-medium mb-2 block">Time Period</Label>
            <Select value={selectedPeriod} onValueChange={(value: ReportPeriod) => { setSelectedPeriod(value); onPeriodChange?.(value); }}>
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
                <Label htmlFor="includeNotes">Progress Notes</Label>
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
                  id="includeSuccessPlan" 
                  checked={includeOptions.successPlan} 
                  onCheckedChange={() => handleIncludeOptionChange("successPlan")}
                />
                <Label htmlFor="includeSuccessPlan">Success Plan</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeDocuments" 
                  checked={includeOptions.documents} 
                  onCheckedChange={() => handleIncludeOptionChange("documents")}
                />
                <Label htmlFor="includeDocuments">Uploaded Documents</Label>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full"
            onClick={() => onGenerateReport({
              reportType: selectedReportType,
              period: selectedPeriod,
              startDate: customStartDate || undefined,
              endDate: customEndDate || undefined,
              include: { ...includeOptions },
            })}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating Report..." : "Generate Report"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
