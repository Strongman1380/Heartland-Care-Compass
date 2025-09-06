import { useState, useEffect } from "react";
import { Youth, DailyRating, mapDailyRatingFromSupabase } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, FileText, Printer, Wand2 } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProgressEvaluationReportProps {
  youth: Youth;
}

interface ReportData {
  peerInteraction: number;
  adultInteraction: number;
  investmentLevel: number;
  dealAuthority: number;
  evaluationPeriod: string;
  socialSkillsStrengths: string;
  socialSkillsDeficiencies: string;
  incidents: string;
  recommendations: string;
  evaluatedBy: string;
}

export const ProgressEvaluationReport = ({ youth }: ProgressEvaluationReportProps) => {
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "lifetime">("weekly");
  const [reportData, setReportData] = useState<ReportData>({
    peerInteraction: 0,
    adultInteraction: 0,
    investmentLevel: 0,
    dealAuthority: 0,
    evaluationPeriod: "",
    socialSkillsStrengths: "",
    socialSkillsDeficiencies: "",
    incidents: "",
    recommendations: "",
    evaluatedBy: ""
  });
  const [loading, setLoading] = useState(false);
  const [periodNotes, setPeriodNotes] = useState<Array<{ date: string; category: string | null; note: string | null; staff: string | null }>>([]);
  const { toast } = useToast();

  const generateReport = async () => {
    setLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;
      let periodLabel: string;

      const today = new Date();
      
      switch (reportType) {
        case "weekly":
          startDate = startOfWeek(subWeeks(today, 0));
          endDate = endOfWeek(subWeeks(today, 0));
          periodLabel = `${format(startDate, "M-d-yy")} to ${format(endDate, "M-d-yy")}`;
          break;
        case "monthly":
          startDate = startOfMonth(subMonths(today, 0));
          endDate = endOfMonth(subMonths(today, 0));
          periodLabel = format(startDate, "MMMM yyyy");
          break;
        case "lifetime":
          startDate = new Date(youth.admissionDate || youth.createdAt || "2000-01-01");
          endDate = today;
          periodLabel = `${format(startDate, "M-d-yy")} to ${format(endDate, "M-d-yy")} (Lifetime)`;
          break;
      }

      const { data, error } = await supabase
        .from("daily_ratings")
        .select("*")
        .eq("youth_id", youth.id)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0])
        .order("date", { ascending: false });

      if (error) throw error;

      const ratings = data?.map(mapDailyRatingFromSupabase) || [];
      
      const calcAverage = (field: keyof DailyRating) => {
        const values = ratings.map(r => r[field] as number).filter(v => v !== null && v !== undefined);
        return values.length > 0 ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10 : 0;
      };

      setReportData({
        peerInteraction: calcAverage('peerInteraction'),
        adultInteraction: calcAverage('adultInteraction'),
        investmentLevel: calcAverage('investmentLevel'),
        dealAuthority: calcAverage('dealAuthority'),
        evaluationPeriod: periodLabel,
        socialSkillsStrengths: "",
        socialSkillsDeficiencies: "",
        incidents: "",
        recommendations: "",
        evaluatedBy: ""
      });

      // Also fetch progress notes for the same period to surface in the report
      const { data: notesData, error: notesError } = await supabase
        .from("notes")
        .select("date,category,note,staff")
        .eq("youth_id", youth.id)
        .gte("date", startDate.toISOString().split('T')[0])
        .lte("date", endDate.toISOString().split('T')[0])
        .order("date", { ascending: false });
      if (notesError) throw notesError;
      setPeriodNotes((notesData || []).map(n => ({
        date: n.date || new Date().toISOString().split('T')[0],
        category: n.category,
        note: n.note,
        staff: n.staff,
      })));

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const autoDraftFromNotes = () => {
    if (periodNotes.length === 0) {
      toast({ title: "No notes", description: "No progress notes found in this period." });
      return;
    }
    const text = periodNotes.map(n => `${n.date} ${n.category ? `[${n.category}] `: ""}${n.note || ""}`).join("\n");
    // Naive drafting: pick sentences mentioning strengths/positive and areas/needs
    const strengths = text.split(/\n/).filter(l => /positive|improved|strength|participat|helpful|respect/i.test(l)).slice(0, 4).join("\n");
    const deficiencies = text.split(/\n/).filter(l => /struggle|needs|concern|incident|redirect|issue/i.test(l)).slice(0, 4).join("\n");
    const incidents = text.split(/\n/).filter(l => /incident|warning|violation|consequence/i.test(l)).slice(0, 5).join("\n");
    const recs = [
      "Continue weekly individual counseling focusing on goal progression.",
      "Reinforce positive peer/adult interactions through role-play exercises.",
      "Monitor compliance with program structure and provide timely feedback.",
    ].join("\n");
    setReportData(r => ({
      ...r,
      socialSkillsStrengths: strengths || r.socialSkillsStrengths,
      socialSkillsDeficiencies: deficiencies || r.socialSkillsDeficiencies,
      incidents: incidents || r.incidents,
      recommendations: r.recommendations || recs,
    }));
    toast({ title: "Draft ready", description: "Fields drafted from recent notes. Review and edit as needed." });
  };

  const getRatingDescription = (rating: number) => {
    if (rating >= 4.5) return "Excellent";
    if (rating >= 3.5) return "Above Average";
    if (rating >= 2.5) return "Average";
    if (rating >= 1.5) return "Below Average";
    return "Poor";
  };

  useEffect(() => {
    generateReport();
  }, [reportType, youth.id]);

  return (
    <div className="space-y-6">
      {/* Report Generation Controls */}
      <Card className="border-2 border-primary/20 no-print">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Progress Evaluation Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Report Type</Label>
              <Select value={reportType} onValueChange={(value: "weekly" | "monthly" | "lifetime") => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly Report</SelectItem>
                  <SelectItem value="monthly">Monthly Report</SelectItem>
                  <SelectItem value="lifetime">Lifetime Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Evaluated By</Label>
              <Input
                value={reportData.evaluatedBy}
                onChange={(e) => setReportData({...reportData, evaluatedBy: e.target.value})}
                placeholder="Staff name"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" onClick={autoDraftFromNotes} className="w-full">
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-draft from Notes
              </Button>
              <Button onClick={handlePrint} className="w-full">
                <Printer className="h-4 w-4 mr-2" />
                Print Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report */}
      <div className="print-section bg-white text-black p-8 rounded-lg border">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Heartland Boys Home</h1>
          <h2 className="text-xl font-semibold">Resident {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Progress Evaluation</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <strong>Name:</strong> {youth.firstName} {youth.lastName}
          </div>
          <div>
            <strong>Evaluation Date:</strong> {reportData.evaluationPeriod}
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Rating Scale</h3>
          <p className="text-sm">1=Poor | 2=Below Average | 3=Average | 4=Above Average | 5=Excellent</p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="border-b pb-3">
            <h4 className="font-semibold">Relationship and Interaction with Peer: Rating: {reportData.peerInteraction}</h4>
            <p className="text-sm mt-1">{youth.firstName} demonstrates {getRatingDescription(reportData.peerInteraction).toLowerCase()} peer interaction skills during this evaluation period.</p>
          </div>

          <div className="border-b pb-3">
            <h4 className="font-semibold">Relationship and Interaction with Adults: Rating: {reportData.adultInteraction}</h4>
            <p className="text-sm mt-1">{youth.firstName} shows {getRatingDescription(reportData.adultInteraction).toLowerCase()} interaction with staff and adults during this period.</p>
          </div>

          <div className="border-b pb-3">
            <h4 className="font-semibold">Investment Level in Program and Personal Growth: Rating: {reportData.investmentLevel}</h4>
            <p className="text-sm mt-1">{youth.firstName} displays {getRatingDescription(reportData.investmentLevel).toLowerCase()} investment in the program and personal development.</p>
          </div>

          <div className="border-b pb-3">
            <h4 className="font-semibold">How does the Resident deal with Authority and Structure: Rating: {reportData.dealAuthority}</h4>
            <p className="text-sm mt-1">{youth.firstName} handles authority and structure at an {getRatingDescription(reportData.dealAuthority).toLowerCase()} level.</p>
          </div>
        </div>

        <div className="space-y-4 mb-6 no-print">
          <div>
            <Label htmlFor="strengths" className="font-semibold">Social Skills Strengths:</Label>
            <Textarea
              id="strengths"
              value={reportData.socialSkillsStrengths}
              onChange={(e) => setReportData({...reportData, socialSkillsStrengths: e.target.value})}
              placeholder="Describe social skills strengths..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="deficiencies" className="font-semibold">Social Skill Deficiencies:</Label>
            <Textarea
              id="deficiencies"
              value={reportData.socialSkillsDeficiencies}
              onChange={(e) => setReportData({...reportData, socialSkillsDeficiencies: e.target.value})}
              placeholder="Describe areas for improvement..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="incidents" className="font-semibold">Incidents this period:</Label>
            <Textarea
              id="incidents"
              value={reportData.incidents}
              onChange={(e) => setReportData({...reportData, incidents: e.target.value})}
              placeholder="Document any incidents..."
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="recommendations" className="font-semibold">Recommendations and Comments:</Label>
            <Textarea
              id="recommendations"
              value={reportData.recommendations}
              onChange={(e) => setReportData({...reportData, recommendations: e.target.value})}
              placeholder="Provide recommendations and overall comments..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Recent notes context */}
        <div className="no-print mt-6">
          <h4 className="font-semibold mb-2">Recent Notes in Period</h4>
          {periodNotes.length === 0 ? (
            <p className="text-gray-600">No notes available for this period.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {periodNotes.slice(0, 8).map((n, i) => (
                <li key={i}>{n.date} {n.category ? `[${n.category}] `: ""}{n.note}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Print version of text fields */}
        <div className="print-only space-y-4">
          {reportData.socialSkillsStrengths && (
            <div>
              <strong>Social Skills Strengths:</strong>
              <p className="mt-1">{reportData.socialSkillsStrengths}</p>
            </div>
          )}

          {reportData.socialSkillsDeficiencies && (
            <div>
              <strong>Social Skill Deficiencies:</strong>
              <p className="mt-1">{reportData.socialSkillsDeficiencies}</p>
            </div>
          )}

          {reportData.incidents && (
            <div>
              <strong>Incidents this period:</strong>
              <p className="mt-1">{reportData.incidents}</p>
            </div>
          )}

          {reportData.recommendations && (
            <div>
              <strong>Recommendations and Comments:</strong>
              <p className="mt-1">{reportData.recommendations}</p>
            </div>
          )}
        </div>

        <div className="mt-8 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Evaluated by:</strong> {reportData.evaluatedBy}
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
            .no-print {
              display: none !important;
            }
            .print-section {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-only {
              display: block !important;
            }
            @page {
              margin: 1in;
            }
          }
          .print-only {
            display: none;
          }
        `
      }} />
    </div>
  );
};
