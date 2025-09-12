import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FileText, Printer } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF, exportElementToDocx } from "@/utils/export";
import { fetchBehaviorPoints, fetchProgressNotes, fetchDailyRatings } from "@/utils/local-storage-utils";
import { getBehaviorPointsByYouth, getProgressNotesByYouth, getDailyRatingsByYouth } from "@/lib/api";
import { generateBehavioralInsights, generateTreatmentRecommendations } from "@/lib/aiClient";

// AI helper functions for generating behavioral comments
const generatePositiveBehaviorComments = (avgPoints: number, peerRating: number, adultRating: number, youth: any): string => {
  const comments = [];
  
  if (avgPoints >= 15000) {
    comments.push("Consistently exceeds daily point expectations, demonstrating excellent program compliance");
  } else if (avgPoints >= 12000) {
    comments.push("Meets daily point requirements regularly, showing good behavioral consistency");
  }
  
  if (peerRating >= 3) {
    comments.push("Demonstrates positive peer interactions and appropriate social skills");
  }
  
  if (adultRating >= 3) {
    comments.push("Shows respect for authority figures and responds well to staff direction");
  }
  
  if (youth.level >= 3) {
    comments.push("Has achieved significant level advancement, indicating sustained behavioral improvement");
  }
  
  return comments.length > 0 
    ? comments.join(". ") + "."
    : "Youth is working toward establishing consistent positive behavioral patterns.";
};

const generateImprovementComments = (avgPoints: number, programRating: number, authorityRating: number, youth: any): string => {
  const areas = [];
  
  if (avgPoints < 12000) {
    areas.push("Focus on achieving daily point requirements through improved behavioral choices");
  }
  
  if (programRating < 3) {
    areas.push("Increase engagement and investment in therapeutic programming");
  }
  
  if (authorityRating < 3) {
    areas.push("Work on appropriate responses to authority and following staff directions");
  }
  
  if (youth.level < 2) {
    areas.push("Continue building foundational behavioral skills for level advancement");
  }
  
  return areas.length > 0 
    ? areas.join(". ") + "."
    : "Continue current programming to maintain positive behavioral trajectory.";
};

// API fetch functions with fallback to localStorage
const fetchBehaviorPointsAPI = async (youthId: string) => {
  try {
    const data = await getBehaviorPointsByYouth(youthId);
    return data;
  } catch (error) {
    console.warn(`API fetch failed for behavior-points, falling back to localStorage:`, error);
    return fetchBehaviorPoints(youthId);
  }
};
const fetchProgressNotesAPI = async (youthId: string) => {
  try {
    return await getProgressNotesByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for progress-notes, falling back to localStorage:', e);
    return fetchProgressNotes(youthId);
  }
};
const fetchDailyRatingsAPI = async (youthId: string) => {
  try {
    return await getDailyRatingsByYouth(youthId);
  } catch (e) {
    console.warn('API fetch failed for daily-ratings, falling back to localStorage:', e);
    return fetchDailyRatings(youthId);
  }
};

interface CourtReportProps {
  youth: Youth;
}

interface CourtReportData {
  reportPeriodFrom: string;
  reportPeriodTo: string;
  morningPointsAverage: number;
  afternoonPointsAverage: number;
  eveningPointsAverage: number;
  totalPointsThisPeriod: number;
  currentGradeLevel: string;
  academicPerformance: string;
  schoolAttendance: string;
  positiveBehaviors: string;
  areasForImprovement: string;
  counselingSessions: string;
  groupActivities: string;
  individualGoalsProgress: string;
  recommendations: string;
  notes: string;
  staffSignature: string;
  // DPN Ratings (1-4 scale)
  peerInteractionRating: number;
  adultInteractionRating: number;
  programInvestmentRating: number;
  authorityResponseRating: number;
  // AI-generated content
  aiPositiveBehaviors: string;
  aiAreasForImprovement: string;
  aiCounselingNotes: string;
}

export const CourtReport = ({ youth }: CourtReportProps) => {
  const [reportData, setReportData] = useState<CourtReportData>({
    reportPeriodFrom: format(startOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    reportPeriodTo: format(endOfMonth(subMonths(new Date(), 1)), "yyyy-MM-dd"),
    morningPointsAverage: 0,
    afternoonPointsAverage: 0,
    eveningPointsAverage: 0,
    totalPointsThisPeriod: 0,
    currentGradeLevel: "",
    academicPerformance: "",
    schoolAttendance: "",
    positiveBehaviors: "",
    areasForImprovement: "",
    counselingSessions: "",
    groupActivities: "",
    individualGoalsProgress: "",
    recommendations: "",
    notes: "",
    staffSignature: "",
    // DPN Ratings
    peerInteractionRating: 0,
    adultInteractionRating: 0,
    programInvestmentRating: 0,
    authorityResponseRating: 0,
    // AI-generated content
    aiPositiveBehaviors: "",
    aiAreasForImprovement: "",
    aiCounselingNotes: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch data from API with localStorage fallback
      const [allPoints, allNotes, allRatings] = await Promise.all([
        fetchBehaviorPointsAPI(youth.id),
        fetchProgressNotesAPI(youth.id),
        fetchDailyRatingsAPI(youth.id),
      ]);
      
      // Filter data for the report period
      const reportStartDate = new Date(reportData.reportPeriodFrom);
      const reportEndDate = new Date(reportData.reportPeriodTo);
      
      const periodPoints = allPoints.filter(point => {
        if (!point.date) return false;
        const pointDate = new Date(point.date);
        return pointDate >= reportStartDate && pointDate <= reportEndDate;
      });
      const periodNotes = allNotes.filter(n => n.date && new Date(n.date) >= reportStartDate && new Date(n.date) <= reportEndDate);
      const periodRatings = allRatings.filter(r => r.date && new Date(r.date) >= reportStartDate && new Date(r.date) <= reportEndDate);

      // Calculate averages from actual data
      const morningAvg = periodPoints.length > 0 
        ? Math.round((periodPoints.reduce((sum, p) => sum + (p.morningPoints || 0), 0) / periodPoints.length) * 10) / 10
        : 0;
      
      const afternoonAvg = periodPoints.length > 0 
        ? Math.round((periodPoints.reduce((sum, p) => sum + (p.afternoonPoints || 0), 0) / periodPoints.length) * 10) / 10
        : 0;
      
      const eveningAvg = periodPoints.length > 0 
        ? Math.round((periodPoints.reduce((sum, p) => sum + (p.eveningPoints || 0), 0) / periodPoints.length) * 10) / 10
        : 0;
      
      const totalPoints = periodPoints.reduce((sum, p) => sum + (p.totalPoints || 0), 0);

      // Calculate DPN ratings averages
      const peerInteractionAvg = periodRatings.length > 0 
        ? Math.round((periodRatings.reduce((sum, r) => sum + (r.peerInteraction || 0), 0) / periodRatings.length) * 10) / 10
        : youth.peerInteraction || 0;
      
      const adultInteractionAvg = periodRatings.length > 0 
        ? Math.round((periodRatings.reduce((sum, r) => sum + (r.adultInteraction || 0), 0) / periodRatings.length) * 10) / 10
        : youth.adultInteraction || 0;
      
      const programInvestmentAvg = periodRatings.length > 0 
        ? Math.round((periodRatings.reduce((sum, r) => sum + (r.investmentLevel || 0), 0) / periodRatings.length) * 10) / 10
        : youth.investmentLevel || 0;
      
      const authorityResponseAvg = periodRatings.length > 0 
        ? Math.round((periodRatings.reduce((sum, r) => sum + (r.dealAuthority || 0), 0) / periodRatings.length) * 10) / 10
        : youth.dealAuthority || 0;

      // Generate AI insights
      const behavioralInsights = generateBehavioralInsights(periodPoints, youth);
      const treatmentRecommendations = generateTreatmentRecommendations(youth, { notes: periodNotes, ratings: periodRatings });
      
      // Generate AI content for positive behaviors and areas for improvement
      const avgDailyPoints = periodPoints.length > 0 ? totalPoints / periodPoints.length : 0;
      const aiPositiveBehaviors = generatePositiveBehaviorComments(avgDailyPoints, peerInteractionAvg, adultInteractionAvg, youth);
      const aiAreasForImprovement = generateImprovementComments(avgDailyPoints, programInvestmentAvg, authorityResponseAvg, youth);
      
      // Extract counseling session notes
      const counselingNotes = periodNotes.filter(note => 
        note.category?.toLowerCase().includes('counseling') || 
        note.category?.toLowerCase().includes('therapy') ||
        note.note?.toLowerCase().includes('counseling') ||
        note.note?.toLowerCase().includes('therapy')
      );
      const aiCounselingNotes = counselingNotes.length > 0 
        ? `${counselingNotes.length} counseling sessions documented. Key themes: ${counselingNotes.map(n => n.note?.substring(0, 100)).join('; ')}`
        : "No specific counseling sessions documented during this period.";

      setReportData(prev => ({
        ...prev,
        morningPointsAverage: morningAvg,
        afternoonPointsAverage: afternoonAvg,
        eveningPointsAverage: eveningAvg,
        totalPointsThisPeriod: totalPoints,
        currentGradeLevel: youth.educationInfo || youth.currentGrade || "",
        academicPerformance: youth.academicStrengths || prev.academicPerformance,
        schoolAttendance: `${periodRatings.length} recorded days`,
        // DPN Ratings
        peerInteractionRating: peerInteractionAvg,
        adultInteractionRating: adultInteractionAvg,
        programInvestmentRating: programInvestmentAvg,
        authorityResponseRating: authorityResponseAvg,
        // AI-generated content
        aiPositiveBehaviors: aiPositiveBehaviors,
        aiAreasForImprovement: aiAreasForImprovement,
        aiCounselingNotes: aiCounselingNotes
      }));

      // Attach derived summaries for notes/ratings in DOM via refs
      try {
        const notesCount = periodNotes.length;
        const ratingsInPeriod = periodRatings;
        const avg = (field: keyof typeof ratingsInPeriod[0]) => {
          const vals = ratingsInPeriod.map((r:any)=> Number(r[field])||0).filter(v=>v>0);
          return vals.length ? Math.round((vals.reduce((s:number,v:number)=>s+v,0)/vals.length)*10)/10 : 0;
        };
        // Trend label based on points change between first and second half of period
        let trendLabel = 'stable';
        if (periodPoints.length > 4) {
          const mid = Math.floor(periodPoints.length/2);
          const sum = (arr:any[]) => arr.reduce((s,p)=> s + (p.totalPoints||0), 0);
          const first = sum(periodPoints.slice(0, mid)) / Math.max(mid,1);
          const second = sum(periodPoints.slice(mid)) / Math.max(periodPoints.length-mid,1);
          if (second > first + 5) trendLabel = 'improving';
          else if (second < first - 5) trendLabel = 'regressing';
        }

        // Incident extraction from notes (by category match)
        const incidents = periodNotes.filter(n => (n.category||'').toLowerCase().includes('incident')).slice(0, 6)
          .map(n => ({ date: n.date ? format(new Date(n.date), 'M/d/yyyy') : '—', text: (n.note||'').slice(0,160) }));

        (window as any).__court_meta = { notesCount, attendanceDays: periodRatings.length, trendLabel, ratingsAvg: {
          peer: avg('peerInteraction'), adult: avg('adultInteraction'), invest: avg('investmentLevel'), authority: avg('dealAuthority')
        }};
        (window as any).__court_incidents = incidents;
      } catch {}

    } catch (error) {
      console.error("Error generating court report:", error);
      toast({
        title: "Error",
        description: "Failed to generate court report",
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

  const handleExportPDF = async () => {
    if (!printRef.current) return;
    await exportElementToPDF(printRef.current, `court-report-${youth.lastName || 'report'}.pdf`);
  };

  const handleExportDocx = async () => {
    if (!printRef.current) return;
    await exportElementToDocx(printRef.current, `court-report-${youth.lastName || 'report'}.docx`);
  };

  const handleInputChange = (field: keyof CourtReportData, value: string | number) => {
    setReportData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  useEffect(() => {
    generateReport();
  }, [youth.id, reportData.reportPeriodFrom, reportData.reportPeriodTo]);
  
  // Auto-export to PDF when component mounts
  useEffect(() => {
    // Wait for data to load and component to render
    const timer = setTimeout(async () => {
      if (printRef.current) {
        try {
          await handleExportPDF();
          toast({
            title: "Court Report Generated",
            description: "Court report has been automatically exported as PDF.",
          });
        } catch (error) {
          console.error("Error auto-exporting court report:", error);
          toast({
            title: "Export Error",
            description: "Failed to automatically export court report. Please use the Print or Export buttons.",
            variant: "destructive"
          });
        }
      }
    }, 1000); // Give time for the report to generate and render
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Report Generation Controls */}
      <Card className="border-2 border-primary/20 no-print">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Court Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Report Period From</Label>
              <Input
                type="date"
                value={reportData.reportPeriodFrom}
                onChange={(e) => handleInputChange('reportPeriodFrom', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Report Period To</Label>
              <Input
                type="date"
                value={reportData.reportPeriodTo}
                onChange={(e) => handleInputChange('reportPeriodTo', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Staff Signature</Label>
              <Input
                value={reportData.staffSignature}
                onChange={(e) => handleInputChange('staffSignature', e.target.value)}
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
          <img src={`${import.meta.env.BASE_URL}files/BoysHomeLogo.png`} alt="Heartland Boys Home Logo" className="h-14 mx-auto mb-2 object-contain" />
          <h1 className="text-2xl font-bold mb-2">COURT REPORT</h1>
          <h2 className="text-xl font-semibold">Heartland Boys Home</h2>
        </div>

        {/* 1. Legal and Behavioral History Summary */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">1. Legal and Behavioral History Summary (Pre-Placement / Court Report Context)</h3>
          <p className="ml-4">
            The youth was placed at Heartland Boys Home on {youth.admissionDate ? format(new Date(youth.admissionDate), "M/d/yyyy") : "_____"}
            {youth.referralReason ? ` following adjudication for ${youth.referralReason}.` : '.'}
            Key concerns noted at intake may include chronic defiance of authority, school refusal or academic disengagement, family conflict, and peer aggression or AWOL history.
            The placement provides structured, trauma-informed care within a normalized group setting to promote behavioral change, responsibility, and readiness for reintegration.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">Youth Information:</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Name:</strong> {youth.firstName} {youth.lastName}</div>
            <div><strong>Date of Birth:</strong> {youth.dob ? format(new Date(youth.dob), "M/d/yyyy") : "_".repeat(20)}</div>
            <div><strong>Admission Date:</strong> {youth.admissionDate ? format(new Date(youth.admissionDate), "M/d/yyyy") : "_".repeat(20)}</div>
            <div><strong>Current Level:</strong> {youth.level || "_".repeat(20)}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Report Period</h3>
          <div className="space-y-2 ml-4">
            <div><strong>From:</strong> {format(new Date(reportData.reportPeriodFrom), "M/d/yyyy")}</div>
            <div><strong>To:</strong> {format(new Date(reportData.reportPeriodTo), "M/d/yyyy")}</div>
          </div>
        </div>

        {/* 2. Academic Functioning Summary */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">2. Academic Functioning Summary</h3>
          <div className="space-y-1 ml-4">
            <div><strong>Attendance:</strong> {(window as any).__court_meta?.attendanceDays ?? '—'} days recorded</div>
            <div><strong>Behavior:</strong> {(window as any).__court_meta?.ratingsAvg?.adult ? ((window as any).__court_meta?.ratingsAvg?.adult >= 3 ? 'Respectful/cooperative' : 'Inconsistent; requires redirection') : '—'}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">3. Group Home Behavior Summary</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Morning Points Average:</strong> {reportData.morningPointsAverage.toLocaleString()}</div>
            <div><strong>Afternoon Points Average:</strong> {reportData.afternoonPointsAverage.toLocaleString()}</div>
            <div><strong>Evening Points Average:</strong> {reportData.eveningPointsAverage.toLocaleString()}</div>
            <div><strong>Total Points This Period:</strong> {reportData.totalPointsThisPeriod.toLocaleString()}</div>
            <div><strong>Current Grade Level:</strong> {reportData.currentGradeLevel || 'Not specified'}</div>
            <div><strong>Academic Performance:</strong> {reportData.academicPerformance || 'See academic section'}</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">DPN Ratings Summary (1-4 Scale)</h3>
          <div className="space-y-2 ml-4">
            <div><strong>Peer Interaction:</strong> {reportData.peerInteractionRating}/4</div>
            <div><strong>Adult Interaction:</strong> {reportData.adultInteractionRating}/4</div>
            <div><strong>Program Investment:</strong> {reportData.programInvestmentRating}/4</div>
            <div><strong>Authority Response:</strong> {reportData.authorityResponseRating}/4</div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Positive Behaviors Noted</h3>
          <div className="ml-4 p-3 bg-green-50 border border-green-200 rounded">
            <p>{reportData.aiPositiveBehaviors || 'Click Generate Report to populate AI insights'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Areas for Improvement</h3>
          <div className="ml-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p>{reportData.aiAreasForImprovement || 'Click Generate Report to populate AI insights'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Counseling Sessions Summary</h3>
          <div className="ml-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p>{reportData.aiCounselingNotes || 'Click Generate Report to populate counseling information'}</p>
          </div>
        </div>

        {/* 4. Strengths Observed */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">4. Strengths Observed</h3>
          <ul className="list-disc ml-9">
            <li>Engages in structured activities</li>
            <li>Responds well to praise</li>
            <li>Demonstrates empathy / peer support</li>
            <li>Completes chores / hygiene routines independently</li>
            <li>Maintains family contact positively</li>
            <li>Self-advocates appropriately</li>
            <li>Uses coping tools (walking away, asking for breaks)</li>
          </ul>
        </div>

        {/* 6. Incident Reports Summary */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">6. Incident Reports Summary</h3>
          <div className="space-y-1 ml-4">
            <div><strong>Total Critical Incidents:</strong> {(window as any).__court_meta?.notesCount ?? 0}</div>
            {Array.isArray((window as any).__court_incidents) && (window as any).__court_incidents.length > 0 ? (
              <ul className="list-disc ml-5">
                {(window as any).__court_incidents.map((i:any, idx:number) => (
                  <li key={idx}>{i.date}: {i.text}</li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-600">No incident notes recorded in this period.</div>
            )}
          </div>
        </div>

        {/* 7. Summary of Month */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">7. Summary of Month</h3>
          <p className="ml-4">
            This month, the youth demonstrated {(window as any).__court_meta?.trendLabel || 'stable'} overall progress. He is currently on Level {youth.level}. Focus areas include respectful communication, accountability, self-regulation, school participation, and healthy peer relationships.
          </p>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">EDUCATIONAL PROGRESS:</h3>
          <div className="space-y-2 ml-4">
            <div className="no-print">
              <Label>Current Grade Level:</Label>
              <Input
                value={reportData.currentGradeLevel}
                onChange={(e) => handleInputChange('currentGradeLevel', e.target.value)}
                placeholder="Enter grade level"
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>Current Grade Level:</strong> {reportData.currentGradeLevel || "_".repeat(20)}
            </div>
            
            <div className="no-print">
              <Label>Academic Performance:</Label>
              <Input
                value={reportData.academicPerformance}
                onChange={(e) => handleInputChange('academicPerformance', e.target.value)}
                placeholder="Describe academic performance"
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>Academic Performance:</strong> {reportData.academicPerformance || "_".repeat(20)}
            </div>
            
            <div className="no-print">
              <Label>School Attendance:</Label>
              <Input
                value={reportData.schoolAttendance}
                onChange={(e) => handleInputChange('schoolAttendance', e.target.value)}
                placeholder="Enter attendance information"
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>School Attendance:</strong> {reportData.schoolAttendance || "_".repeat(20)}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">BEHAVIORAL OBSERVATIONS:</h3>
          <div className="ml-4">
            <div className="mb-4">
              <strong>Positive Behaviors Noted:</strong>
              <div className="no-print mt-2">
                <Textarea
                  value={reportData.positiveBehaviors}
                  onChange={(e) => handleInputChange('positiveBehaviors', e.target.value)}
                  placeholder="Describe positive behaviors observed..."
                  rows={3}
                />
              </div>
              <div className="print-only mt-2">
                {reportData.positiveBehaviors ? (
                  <p className="whitespace-pre-wrap">{reportData.positiveBehaviors}</p>
                ) : (
                  <div className="space-y-1">
                    <div>{"_".repeat(60)}</div>
                    <div>{"_".repeat(60)}</div>
                    <div>{"_".repeat(60)}</div>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <strong>Areas for Improvement:</strong>
              <div className="no-print mt-2">
                <Textarea
                  value={reportData.areasForImprovement}
                  onChange={(e) => handleInputChange('areasForImprovement', e.target.value)}
                  placeholder="Describe areas needing improvement..."
                  rows={3}
                />
              </div>
              <div className="print-only mt-2">
                {reportData.areasForImprovement ? (
                  <p className="whitespace-pre-wrap">{reportData.areasForImprovement}</p>
                ) : (
                  <div className="space-y-1">
                    <div>{"_".repeat(60)}</div>
                    <div>{"_".repeat(60)}</div>
                    <div>{"_".repeat(60)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">PROGRAM PARTICIPATION:</h3>
          <div className="space-y-2 ml-4">
            <div className="no-print">
              <Label>Counseling Sessions:</Label>
              <Input
                value={reportData.counselingSessions}
                onChange={(e) => handleInputChange('counselingSessions', e.target.value)}
                placeholder="Describe counseling participation"
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>Counseling Sessions:</strong> {reportData.counselingSessions || "_".repeat(20)}
            </div>
            
            <div className="no-print">
              <Label>Group Activities:</Label>
              <Input
                value={reportData.groupActivities}
                onChange={(e) => handleInputChange('groupActivities', e.target.value)}
                placeholder="Describe group activity participation"
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>Group Activities:</strong> {reportData.groupActivities || "_".repeat(20)}
            </div>
            
            <div className="no-print">
              <Label>Individual Goals Progress:</Label>
              <Input
                value={reportData.individualGoalsProgress}
                onChange={(e) => handleInputChange('individualGoalsProgress', e.target.value)}
                placeholder="Describe progress on individual goals"
                className="mt-1"
              />
            </div>
            <div className="print-only">
              <strong>Individual Goals Progress:</strong> {reportData.individualGoalsProgress || "_".repeat(20)}
            </div>
          </div>
        </div>

        {/* 8. Recommendation */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">8. Recommendation</h3>
          <div className="ml-4">
            <ul className="list-disc ml-5">
              <li>☐ Youth is not yet ready for step-down or reintegration. Continued placement is recommended to stabilize behavior and promote accountability.</li>
              <li>☐ Youth is approaching readiness for transition. Continued observation is advised with focus on stability during family contact or passes.</li>
              <li>☐ Youth has reached maximum benefit of programming. Discharge planning toward a less restrictive setting is recommended with support.</li>
              <li>☐ Youth is not benefitting due to non-engagement or safety concerns. Consider alternative placement if gains do not resume within the next month.</li>
              <li>☐ Court should consider a step-down program / return home / extended placement / additional evaluation.</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <strong>Staff Signature:</strong> {reportData.staffSignature || "_".repeat(30)}
            </div>
            <div>
              <strong>Date:</strong> {format(new Date(), "M/d/yyyy")}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-4">NOTES:</h3>
          <div className="ml-4">
            <div className="no-print">
              <Textarea
                value={reportData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Additional notes or observations..."
                rows={5}
              />
            </div>
            <div className="print-only">
              {reportData.notes ? (
                <p className="whitespace-pre-wrap">{reportData.notes}</p>
              ) : (
                <div className="space-y-1">
                  <div>{"_".repeat(60)}</div>
                  <div>{"_".repeat(60)}</div>
                  <div>{"_".repeat(60)}</div>
                  <div>{"_".repeat(60)}</div>
                  <div>{"_".repeat(60)}</div>
                </div>
              )}
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
            
            .print-section .mb-4 {
              margin-bottom: 12pt !important;
            }
            
            .print-section .mb-6 {
              margin-bottom: 18pt !important;
            }
            
            .print-section .mt-2 {
              margin-top: 6pt !important;
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
        <Button variant="outline" onClick={handleExportPDF}>Export PDF</Button>
        <Button variant="outline" onClick={handleExportDocx}>Export Word (.docx)</Button>
      </div>
    </div>
  );
};
