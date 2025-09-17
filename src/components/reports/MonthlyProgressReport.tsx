import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, addWeeks } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fetchBehaviorPoints } from "@/utils/local-storage-utils";
import { getBehaviorPointsByYouth } from "@/lib/api";
import { exportElementToPDF, exportElementToDocx } from "@/utils/export";

// API fetch function with fallback to localStorage
const fetchBehaviorPointsAPI = async (youthId: string) => {
  try {
    const data = await getBehaviorPointsByYouth(youthId);
    return data;
  } catch (error) {
    console.warn(`API fetch failed for behavior-points, falling back to localStorage:`, error);
    return fetchBehaviorPoints(youthId);
  }
};

interface MonthlyProgressReportProps {
  youth: Youth;
}

interface MonthlyReportData {
  month: string;
  year: string;
  week1Total: number;
  week2Total: number;
  week3Total: number;
  week4Total: number;
  monthlyAverage: number;
  startingLevel: string;
  endingLevel: string;
  levelChanges: string;
  keyAchievements: string;
  challengesAddressed: string;
  goalsForNextMonth: string;
  preparedBy: string;
}

export const MonthlyProgressReport = ({ youth }: MonthlyProgressReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState<MonthlyReportData>({
    month: "",
    year: "",
    week1Total: 0,
    week2Total: 0,
    week3Total: 0,
    week4Total: 0,
    monthlyAverage: 0,
    startingLevel: "",
    endingLevel: "",
    levelChanges: "",
    keyAchievements: "",
    challengesAddressed: "",
    goalsForNextMonth: "",
    preparedBy: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(selectedMonth + "-01");
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      
      // Fetch actual behavior points from API with localStorage fallback
      const allPoints = await fetchBehaviorPointsAPI(youth.id);
      
      // Calculate weekly totals from actual data
      const week1Start = monthStart;
      const week1End = endOfWeek(week1Start);
      const week2Start = addWeeks(week1Start, 1);
      const week2End = endOfWeek(week2Start);
      const week3Start = addWeeks(week1Start, 2);
      const week3End = endOfWeek(week3Start);
      const week4Start = addWeeks(week1Start, 3);
      const week4End = endOfWeek(week4Start);

      const calculateWeekTotal = (weekStart: Date, weekEnd: Date) => {
        const weekPoints = allPoints.filter(point => {
          if (!point.date) return false;
          const pointDate = new Date(point.date);
          return pointDate >= weekStart && pointDate <= weekEnd;
        });
        return weekPoints.reduce((sum, point) => sum + (point.totalPoints || 0), 0);
      };

      const week1Total = calculateWeekTotal(week1Start, week1End);
      const week2Total = calculateWeekTotal(week2Start, week2End);
      const week3Total = calculateWeekTotal(week3Start, week3End);
      const week4Total = calculateWeekTotal(week4Start, week4End);
      const monthlyAverage = Math.round((week1Total + week2Total + week3Total + week4Total) / 4);

      setReportData({
        month: format(selectedDate, "MMMM"),
        year: format(selectedDate, "yyyy"),
        week1Total,
        week2Total,
        week3Total,
        week4Total,
        monthlyAverage,
        startingLevel: youth.level ? `Level ${youth.level}` : "Level 1",
        endingLevel: youth.level ? `Level ${youth.level}` : "Level 1",
        levelChanges: "",
        keyAchievements: "",
        challengesAddressed: "",
        goalsForNextMonth: "",
        preparedBy: ""
      });

    } catch (error) {
      console.error("Error generating monthly report:", error);
      toast({
        title: "Error",
        description: "Failed to generate monthly report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Generate the report first to ensure data is current
    generateReport();
    // Small delay to ensure state updates before printing
    setTimeout(() => {
      window.print();
    }, 100);
  };

  useEffect(() => {
    generateReport();
  }, [selectedMonth, youth.id]);

  return (
    <div className="space-y-6">
      {/* Report Generation Controls */}
      <Card className="border-2 border-primary/20 no-print">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monthly Progress Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Month</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Prepared By</Label>
              <Input
                value={reportData.preparedBy}
                onChange={(e) => setReportData({...reportData, preparedBy: e.target.value})}
                placeholder="Staff name"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handlePrint} className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div ref={printRef} className="print-section bg-white text-black p-8 rounded-lg border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">MONTHLY PROGRESS REPORT</h1>
          <h2 className="text-xl font-semibold">Heartland Boys Home</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <strong>Youth:</strong> {youth.firstName} {youth.lastName}
          </div>
          <div>
            <strong>Month/Year:</strong> {reportData.month} {reportData.year}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">BEHAVIOR POINT SUMMARY:</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Week 1 Total:</strong> {reportData.week1Total}</div>
            <div><strong>Week 2 Total:</strong> {reportData.week2Total}</div>
            <div><strong>Week 3 Total:</strong> {reportData.week3Total}</div>
            <div><strong>Week 4 Total:</strong> {reportData.week4Total}</div>
            <div><strong>Monthly Average:</strong> {reportData.monthlyAverage}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">LEVEL PROGRESSION:</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Starting Level:</strong> {reportData.startingLevel}</div>
            <div><strong>Ending Level:</strong> {reportData.endingLevel}</div>
            <div className="no-print">
              <Label htmlFor="levelChanges" className="font-semibold">Level Changes:</Label>
              <Textarea
                id="levelChanges"
                value={reportData.levelChanges}
                onChange={(e) => setReportData({...reportData, levelChanges: e.target.value})}
                placeholder="Describe any level changes during the month..."
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>Level Changes:</strong>
              <p className="mt-1">{reportData.levelChanges || "_".repeat(50)}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">KEY ACHIEVEMENTS:</h3>
          <div className="no-print">
            <Textarea
              value={reportData.keyAchievements}
              onChange={(e) => setReportData({...reportData, keyAchievements: e.target.value})}
              placeholder="List key achievements and positive developments..."
              className="mt-1"
              rows={4}
            />
          </div>
          <div className="print-only ml-4">
            {reportData.keyAchievements ? (
              <p className="whitespace-pre-wrap">{reportData.keyAchievements}</p>
            ) : (
              <div className="space-y-1">
                <div>{"_".repeat(60)}</div>
                <div>{"_".repeat(60)}</div>
                <div>{"_".repeat(60)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">CHALLENGES ADDRESSED:</h3>
          <div className="no-print">
            <Textarea
              value={reportData.challengesAddressed}
              onChange={(e) => setReportData({...reportData, challengesAddressed: e.target.value})}
              placeholder="Describe challenges that were addressed during the month..."
              className="mt-1"
              rows={4}
            />
          </div>
          <div className="print-only ml-4">
            {reportData.challengesAddressed ? (
              <p className="whitespace-pre-wrap">{reportData.challengesAddressed}</p>
            ) : (
              <div className="space-y-1">
                <div>{"_".repeat(60)}</div>
                <div>{"_".repeat(60)}</div>
                <div>{"_".repeat(60)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">GOALS FOR NEXT MONTH:</h3>
          <div className="no-print">
            <Textarea
              value={reportData.goalsForNextMonth}
              onChange={(e) => setReportData({...reportData, goalsForNextMonth: e.target.value})}
              placeholder="Set goals and objectives for the upcoming month..."
              className="mt-1"
              rows={4}
            />
          </div>
          <div className="print-only ml-4">
            {reportData.goalsForNextMonth ? (
              <p className="whitespace-pre-wrap">{reportData.goalsForNextMonth}</p>
            ) : (
              <div className="space-y-1">
                <div>{"_".repeat(60)}</div>
                <div>{"_".repeat(60)}</div>
                <div>{"_".repeat(60)}</div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Prepared by:</strong> {reportData.preparedBy || "_".repeat(30)}
            </div>
            <div>
              <strong>Date:</strong> {format(new Date(), "M/d/yyyy")}
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            body {
              background: white !important;
              color: black !important;
              font-family: 'Times New Roman', serif !important;
              line-height: 1.4 !important;
            }
            
            .no-print {
              display: none !important;
            }
            
            .print-section {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: black !important;
              font-size: 12pt !important;
              line-height: 1.4 !important;
              width: 100% !important;
              max-width: none !important;
            }
            
            .print-section h1 {
              font-size: 18pt !important;
              font-weight: bold !important;
              margin-bottom: 8pt !important;
              color: black !important;
              text-align: center !important;
            }
            
            .print-section h2 {
              font-size: 14pt !important;
              font-weight: bold !important;
              margin-bottom: 12pt !important;
              color: black !important;
              text-align: center !important;
            }
            
            .print-section h3 {
              font-size: 12pt !important;
              font-weight: bold !important;
              margin-bottom: 6pt !important;
              margin-top: 12pt !important;
              color: black !important;
            }
            
            .print-section p {
              font-size: 11pt !important;
              margin-bottom: 6pt !important;
              color: black !important;
              text-align: justify !important;
            }
            
            .print-section .grid {
              display: block !important;
            }
            
            .print-section .grid-cols-2 > div {
              display: inline-block !important;
              width: 48% !important;
              margin-right: 4% !important;
              vertical-align: top !important;
            }
            
            .print-section .grid-cols-2 > div:nth-child(2n) {
              margin-right: 0 !important;
            }
            
            .print-section .space-y-2 > * + * {
              margin-top: 6pt !important;
            }
            
            .print-section .space-y-4 > * + * {
              margin-top: 12pt !important;
            }
            
            .print-section .space-y-6 > * + * {
              margin-top: 18pt !important;
            }
            
            .print-section .border-t {
              border-top: 1pt solid black !important;
              padding-top: 12pt !important;
              margin-top: 18pt !important;
            }
            
            .print-section strong {
              font-weight: bold !important;
              color: black !important;
            }
            
            .print-only {
              display: block !important;
            }
            
            .print-only > div {
              margin-bottom: 12pt !important;
              page-break-inside: avoid !important;
            }
            
            .print-section .ml-4 {
              margin-left: 24pt !important;
            }
            
            @page {
              margin: 0.75in !important;
              size: letter !important;
            }
            
            /* Ensure content flows properly */
            .print-section > div {
              page-break-inside: avoid !important;
            }
            
            /* Make sure text areas content appears properly */
            .print-section .print-only p {
              white-space: pre-wrap !important;
              word-wrap: break-word !important;
              margin-top: 4pt !important;
            }
          }
          
          .print-only {
            display: none;
          }
        `
      }} />
      <div className="no-print flex gap-2 mt-4">
        <Button variant="outline" onClick={async () => printRef.current && exportElementToPDF(printRef.current, `monthly-progress-${youth.lastName || 'report'}.pdf`)}>Export PDF</Button>
        <Button variant="outline" onClick={async () => printRef.current && exportElementToDocx(printRef.current, `monthly-progress-${youth.lastName || 'report'}.docx`)}>Export Word (.docx)</Button>
      </div>
    </div>
  );
};
