
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, FileText, FilePlus, FileCheck, Calendar } from "lucide-react";

interface ReportCenterProps {
  youthId: string;
  youth: any;
}

export const ReportCenter = ({ youthId, youth }: ReportCenterProps) => {
  const [selectedReportType, setSelectedReportType] = useState<string>("comprehensive");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last30");
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
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleIncludeOptionChange = (option: string) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option as keyof typeof includeOptions]
    }));
  };
  
  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    // In a real application, this would trigger report generation via a PDF library
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  };

  const handleCourtReportTemplateDownload = () => {
    const courtReportTemplate = `COURT REPORT TEMPLATE
Heartland Boys Home

Youth Information:
Name: ___________________________
Date of Birth: ___________________
Admission Date: __________________
Current Level: ___________________

Report Period:
From: ___________________________
To: _____________________________

BEHAVIOR SUMMARY:
Morning Points Average: ___________
Afternoon Points Average: _________
Evening Points Average: ___________
Total Points This Period: _________

EDUCATIONAL PROGRESS:
Current Grade Level: ______________
Academic Performance: ____________
School Attendance: _______________

BEHAVIORAL OBSERVATIONS:
Positive Behaviors Noted:
_________________________________
_________________________________
_________________________________

Areas for Improvement:
_________________________________
_________________________________
_________________________________

PROGRAM PARTICIPATION:
Counseling Sessions: ______________
Group Activities: ________________
Individual Goals Progress: _______

RECOMMENDATIONS:
_________________________________
_________________________________
_________________________________

Staff Signature: _________________
Date: ___________________________

NOTES:
_________________________________
_________________________________
_________________________________
_________________________________
_________________________________`;

    const blob = new Blob([courtReportTemplate], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Court_Report_Template.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleMonthlyProgressTemplateDownload = () => {
    const monthlyTemplate = `MONTHLY PROGRESS REPORT TEMPLATE
Heartland Boys Home

Youth: ___________________________
Month/Year: ______________________

BEHAVIOR POINT SUMMARY:
Week 1 Total: ____________________
Week 2 Total: ____________________
Week 3 Total: ____________________
Week 4 Total: ____________________
Monthly Average: _________________

LEVEL PROGRESSION:
Starting Level: __________________
Ending Level: ____________________
Level Changes: ___________________

KEY ACHIEVEMENTS:
_________________________________
_________________________________
_________________________________

CHALLENGES ADDRESSED:
_________________________________
_________________________________
_________________________________

GOALS FOR NEXT MONTH:
_________________________________
_________________________________
_________________________________

Prepared by: _____________________
Date: ___________________________`;

    const blob = new Blob([monthlyTemplate], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Monthly_Progress_Template.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
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
                    onClick={() => setSelectedReportType("comprehensive")}
                  >
                    <FileText className="h-5 w-5 text-blue-600 mb-2" />
                    <h4 className="font-medium">Comprehensive Report</h4>
                    <p className="text-sm text-gray-500 mt-1">Complete overview of all youth data and progress</p>
                  </div>
                  
                  <div 
                    className={`p-4 border rounded-md cursor-pointer ${
                      selectedReportType === "summary" ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedReportType("summary")}
                  >
                    <FilePlus className="h-5 w-5 text-blue-600 mb-2" />
                    <h4 className="font-medium">Summary Report</h4>
                    <p className="text-sm text-gray-500 mt-1">Condensed highlights of key information</p>
                  </div>
                  
                  <div 
                    className={`p-4 border rounded-md cursor-pointer ${
                      selectedReportType === "progress" ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedReportType("progress")}
                  >
                    <FileCheck className="h-5 w-5 text-blue-600 mb-2" />
                    <h4 className="font-medium">Progress Report</h4>
                    <p className="text-sm text-gray-500 mt-1">Focus on behavior points and goal progress</p>
                  </div>
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
                onClick={handleGenerateReport}
                disabled={isGenerating}
              >
                {isGenerating ? "Generating Report..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <p>No previously generated reports</p>
                </div>
                
                {/* Example report entries (hidden initially) */}
                <div className="border rounded-md p-3 hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">Progress Report</h4>
                      <div className="text-sm text-gray-500 flex items-center mt-1">
                        <Calendar size={14} className="mr-1" />
                        <span>Generated May 15, 2025</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
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
        </div>
      </div>
    </div>
  );
};
