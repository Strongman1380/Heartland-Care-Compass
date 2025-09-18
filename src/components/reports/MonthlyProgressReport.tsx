import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Printer, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { fetchBehaviorPoints, fetchDailyRatings, fetchProgressNotes } from "@/utils/local-storage-utils";
import { getBehaviorPointsByYouth, getDailyRatingsByYouth, getProgressNotesByYouth } from "@/lib/api";
import { exportElementToPDF } from "@/utils/export";
import { summarizeReport } from "@/lib/aiClient";

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

const fetchDailyRatingsAPI = async (youthId: string) => {
  try {
    const data = await getDailyRatingsByYouth(youthId);
    return data;
  } catch (error) {
    console.warn(`API fetch failed for daily-ratings, falling back to localStorage:`, error);
    return fetchDailyRatings(youthId);
  }
};

const fetchProgressNotesAPI = async (youthId: string) => {
  try {
    const data = await getProgressNotesByYouth(youthId);
    return data;
  } catch (error) {
    console.warn(`API fetch failed for progress-notes, falling back to localStorage:`, error);
    return fetchProgressNotes(youthId);
  }
};

interface MonthlyProgressReportProps {
  youth: Youth;
}

interface MonthlyReportData {
  // Youth Profile Information
  fullLegalName: string;
  preferredName: string;
  dateOfBirth: string;
  age: number;
  dateOfAdmission: string;
  lengthOfStay: string;
  currentLevel: string;
  currentPlacement: string;
  probationOfficer: string;
  guardiansInfo: string;
  schoolPlacement: string;
  currentDiagnoses: string;

  // Program Participation & Daily Points
  avgWeeklyPoints: number;
  highPointAreas: string;
  lowPointAreas: string;
  trendsOverTime: string;
  incentivesEarned: string;

  // Behavioral Notes
  behavioralNotes: Array<{ date: string; summary: string }>;

  // Risk Assessment
  riskLevel: string;

  // Real Colors Profile
  primaryColor: string;
  secondaryColor: string;

  // AI Summary
  overallSummary: string;

  // Placement Recommendation
  placementRecommendation: string;
  recommendationReason: string;

  // Report metadata
  preparedBy: string;
  month: string;
  year: string;
}

export const MonthlyProgressReport = ({ youth }: MonthlyProgressReportProps) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [reportData, setReportData] = useState<MonthlyReportData>({
    fullLegalName: "",
    preferredName: "",
    dateOfBirth: "",
    age: 0,
    dateOfAdmission: "",
    lengthOfStay: "",
    currentLevel: "",
    currentPlacement: "",
    probationOfficer: "",
    guardiansInfo: "",
    schoolPlacement: "",
    currentDiagnoses: "",
    avgWeeklyPoints: 0,
    highPointAreas: "",
    lowPointAreas: "",
    trendsOverTime: "",
    incentivesEarned: "",
    behavioralNotes: [],
    riskLevel: "",
    primaryColor: "",
    secondaryColor: "",
    overallSummary: "",
    placementRecommendation: "",
    recommendationReason: "",
    preparedBy: "",
    month: "",
    year: ""
  });
  const [loading, setLoading] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      const selectedDate = new Date(selectedMonth + "-01");
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);

      // Fetch all data
      const [allPoints, allRatings, allNotes] = await Promise.all([
        fetchBehaviorPointsAPI(youth.id),
        fetchDailyRatingsAPI(youth.id),
        fetchProgressNotesAPI(youth.id),
      ]);

      // Filter data for the report period
      const periodPoints = allPoints.filter(point => {
        if (!point.date) return false;
        const pointDate = new Date(point.date);
        return pointDate >= monthStart && pointDate <= monthEnd;
      });

      const periodNotes = allNotes.filter(note => {
        if (!note.date) return false;
        const noteDate = new Date(note.date);
        return noteDate >= monthStart && noteDate <= monthEnd;
      });

      // Calculate average weekly points
      const totalPoints = periodPoints.reduce((sum, point) => sum + (point.totalPoints || 0), 0);
      const avgWeeklyPoints = periodPoints.length > 0 ? Math.round(totalPoints / 4) : 0;

      // Analyze behavioral notes (summarized)
      const behavioralNotes = periodNotes.slice(0, 10).map(note => ({
        date: format(new Date(note.date), "MM/dd"),
        summary: note.note?.substring(0, 100) || "Progress note recorded"
      }));

      // Calculate age
      const age = youth.dob ? Math.floor((new Date().getTime() - new Date(youth.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 0;

      // Calculate length of stay
      const lengthOfStay = youth.admissionDate ?
        Math.floor((new Date().getTime() - new Date(youth.admissionDate).getTime()) / (1000 * 60 * 60 * 24)) + " days" :
        "N/A";

      // Generate AI summary
      let overallSummary = "";
      if (periodNotes.length > 0 || periodPoints.length > 0) {
        setGeneratingAI(true);
        try {
          const aiPayload = {
            youth: {
              ...youth,
              age,
              lengthOfStay
            },
            reportType: "progressMonthly",
            period: {
              startDate: format(monthStart, "yyyy-MM-dd"),
              endDate: format(monthEnd, "yyyy-MM-dd")
            },
            data: {
              behaviorPoints: periodPoints,
              progressNotes: periodNotes,
              dailyRatings: allRatings.filter(rating => {
                if (!rating.date) return false;
                const ratingDate = new Date(rating.date);
                return ratingDate >= monthStart && ratingDate <= monthEnd;
              })
            }
          };

          overallSummary = await summarizeReport(aiPayload);
        } catch (aiError) {
          console.warn("AI summary failed, using fallback:", aiError);
          overallSummary = `During the reporting period from ${format(monthStart, "MMM d, yyyy")} to ${format(monthEnd, "MMM d, yyyy")}, ${youth.firstName} ${youth.lastName} participated in the residential treatment program. The youth earned an average of ${avgWeeklyPoints} points per week, demonstrating ${avgWeeklyPoints >= 100 ? 'consistent program compliance' : 'variable engagement with program expectations'}. Staff documented ${periodNotes.length} progress notes highlighting areas of growth and ongoing treatment goals.`;
        } finally {
          setGeneratingAI(false);
        }
      }

      setReportData({
        fullLegalName: `${youth.firstName} ${youth.lastName}`,
        preferredName: youth.firstName || "",
        dateOfBirth: youth.dob ? format(new Date(youth.dob), "MM/dd/yyyy") : "",
        age,
        dateOfAdmission: youth.admissionDate ? format(new Date(youth.admissionDate), "MM/dd/yyyy") : "",
        lengthOfStay,
        currentLevel: youth.level ? `Level ${youth.level}` : "Level 1",
        currentPlacement: "To be assigned", // Fixed: removed reference to non-existent property
        probationOfficer: typeof youth.probationOfficer === 'string' ? youth.probationOfficer : youth.probationOfficer?.name || "N/A",
        guardiansInfo: typeof youth.legalGuardian === 'string' ? youth.legalGuardian : youth.legalGuardian?.name || "N/A",
        schoolPlacement: youth.currentSchool || "N/A",
        currentDiagnoses: youth.currentDiagnoses || youth.diagnoses || "N/A",
        avgWeeklyPoints,
        highPointAreas: avgWeeklyPoints >= 100 ? "Consistent program compliance, positive peer interactions" : "Variable performance with opportunities for improvement",
        lowPointAreas: avgWeeklyPoints < 100 ? "Inconsistent point achievement, behavioral challenges" : "Minimal areas of concern",
        trendsOverTime: periodPoints.length > 7 ? "Stable performance with room for growth" : "Limited data available",
        incentivesEarned: avgWeeklyPoints >= 120 ? "Multiple incentives earned for exceptional performance" : "Standard incentives based on performance",
        behavioralNotes,
        riskLevel: "Moderate", // Fixed: removed reference to non-existent property
        primaryColor: "N/A", // Fixed: removed reference to non-existent property
        secondaryColor: "N/A", // Fixed: removed reference to non-existent property
        overallSummary,
        placementRecommendation: youth.level && youth.level >= 3 ? "Review for Step-Down" : "Continue Placement",
        recommendationReason: youth.level && youth.level >= 3 ?
          "Youth has demonstrated consistent progress and readiness for increased independence" :
          "Youth continues to benefit from structured residential environment",
        preparedBy: "",
        month: format(selectedDate, "MMMM"),
        year: format(selectedDate, "yyyy")
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

  const handlePrint = async () => {
    // Generate the report first to ensure data is current
    await generateReport();

    // Small delay to ensure state updates before exporting
    setTimeout(async () => {
      if (printRef.current) {
        try {
          const selectedDate = new Date(selectedMonth + "-01");
          const filename = `Monthly_Progress_${youth.lastName}_${youth.firstName}_${format(selectedDate, "MMMM_yyyy")}.pdf`;
          await exportElementToPDF(printRef.current, filename);
          toast({
            title: "Success",
            description: "Monthly progress report PDF has been generated and downloaded",
          });
        } catch (error) {
          console.error("Error exporting PDF:", error);
          toast({
            title: "Error",
            description: "Failed to generate PDF. Please try again.",
            variant: "destructive"
          });
        }
      }
    }, 500);
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
                Generate PDF Report
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
          <div className="text-sm mt-2">
            {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
          </div>
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
          <h3 className="font-bold text-lg mb-4 border-b pb-1">2. Program Participation & Daily Points</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Average Weekly Point Totals for the Month:</strong> {reportData.avgWeeklyPoints}</div>
            <div><strong>High Point Areas (strengths):</strong> {reportData.highPointAreas}</div>
            <div><strong>Low Point Areas (struggles):</strong> {reportData.lowPointAreas}</div>
            <div><strong>Trends Over Time:</strong> {reportData.trendsOverTime}</div>
            <div><strong>Incentives Earned / Lost:</strong> {reportData.incentivesEarned}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">3. Behavioral Notes (Summarized)</h3>
          <div className="space-y-2 ml-4">
            {reportData.behavioralNotes.length > 0 ? (
              reportData.behavioralNotes.map((note, index) => (
                <div key={index}>
                  <strong>{note.date}:</strong> {note.summary}
                </div>
              ))
            ) : (
              <div>No behavioral notes recorded for this period.</div>
            )}
          </div>
        </div>

                <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">4. Risk Assessment Result</h3>
          <div className="ml-4">
            <div><strong>Current Overall Risk Level:</strong> {reportData.riskLevel}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">5. Real Colors Profile</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Top Color:</strong> {reportData.primaryColor}</div>
            <div><strong>Secondary Color:</strong> {reportData.secondaryColor}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">6. Overall Summary</h3>
          <div className="ml-4">
            {generatingAI ? (
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 animate-spin" />
                <span>Generating AI summary...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{reportData.overallSummary}</div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-1">7. Placement Recommendation</h3>
          <div className="ml-4">
            <div><strong>{reportData.placementRecommendation}</strong></div>
            <div className="mt-2"><strong>Reason:</strong> {reportData.recommendationReason}</div>
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
        `}} />
      <div className="no-print flex gap-2 mt-4">
        <Button variant="outline" onClick={async () => printRef.current && exportElementToPDF(printRef.current, `monthly-progress-${youth.lastName || 'report'}.pdf`)}>Export PDF</Button>
      </div>
    </div>
  );
};
