import { useState, useEffect, useRef } from "react";
import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Save, RotateCcw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportElementToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";
import { ReportHeader } from "@/components/reports/ReportHeader";
import { format, differenceInDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { draftsService } from "@/integrations/firebase/draftsService";

interface DischargeReportProps {
  youth: Youth;
}

interface DischargeData {
  residentName: string;
  idNumber: string;
  dateOfBirth: string;
  dateOfAdmission: string;
  dateOfDischarge: string;
  lengthOfStay: string;
  currentLevel: string;
  dischargeLevel: string;
  caseManager: string;
  primaryStaff: string;
  probationOfficer: string;

  reasonForDischarge: "Successful Completion" | "Court Order" | "Family Request" | "Transfer" | "AWOL" | "Administrative" | "Other";
  reasonDetail: string;

  treatmentGoalsSummary: string;
  goal1: string;
  goal1Status: "Achieved" | "Partially Achieved" | "Not Achieved" | "Ongoing";
  goal2: string;
  goal2Status: "Achieved" | "Partially Achieved" | "Not Achieved" | "Ongoing";
  goal3: string;
  goal3Status: "Achieved" | "Partially Achieved" | "Not Achieved" | "Ongoing";

  behavioralProgress: string;
  peerInteractionSummary: string;
  adultInteractionSummary: string;
  programInvestmentSummary: string;
  authoritySummary: string;

  academicSummary: string;
  independentLivingSkills: string;

  familyEngagementSummary: string;
  aftercarePlan: string;
  communityResources: string;
  followUpAppointments: string;

  strengthsAtDischarge: string;
  ongoingConcerns: string;
  recommendations: string;

  dischargeDisposition: "Home" | "Foster Care" | "Another Facility" | "Independent Living" | "Detention" | "Other";
  dispositionDetail: string;
  receivingAgency: string;
  transportationPlan: string;

  medicationAtDischarge: string;
  propertyReturned: boolean;
  documentsProvided: string;
}

export const DischargeReport = ({ youth }: DischargeReportProps) => {
  const admissionDate = youth.admissionDate ? new Date(youth.admissionDate) : null;
  const today = new Date();

  const [reportData, setReportData] = useState<DischargeData>({
    residentName: `${youth.firstName} ${youth.lastName}`,
    idNumber: youth.idNumber || youth.id,
    dateOfBirth: youth.dateOfBirth || "",
    dateOfAdmission: youth.admissionDate || "",
    dateOfDischarge: format(today, "yyyy-MM-dd"),
    lengthOfStay: admissionDate ? `${differenceInDays(today, admissionDate)} days` : "",
    currentLevel: `Level ${youth.level}`,
    dischargeLevel: `Level ${youth.level}`,
    caseManager: "",
    primaryStaff: "",
    probationOfficer: "",

    reasonForDischarge: "Successful Completion",
    reasonDetail: "",

    treatmentGoalsSummary: "",
    goal1: "",
    goal1Status: "Partially Achieved",
    goal2: "",
    goal2Status: "Partially Achieved",
    goal3: "",
    goal3Status: "Partially Achieved",

    behavioralProgress: "",
    peerInteractionSummary: "",
    adultInteractionSummary: "",
    programInvestmentSummary: "",
    authoritySummary: "",

    academicSummary: "",
    independentLivingSkills: "",

    familyEngagementSummary: "",
    aftercarePlan: "",
    communityResources: "",
    followUpAppointments: "",

    strengthsAtDischarge: "",
    ongoingConcerns: "",
    recommendations: "",

    dischargeDisposition: "Home",
    dispositionDetail: "",
    receivingAgency: "",
    transportationPlan: "",

    medicationAtDischarge: "",
    propertyReturned: false,
    documentsProvided: "",
  });

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const draft = await draftsService.get(youth.id, "discharge_report", user?.uid || null);
        if (draft?.data) {
          setReportData((prev) => ({ ...prev, ...(draft.data as any) }));
          return;
        }
      } catch {}
      setReportData((prev) => ({
        ...prev,
        residentName: `${youth.firstName} ${youth.lastName}`,
        currentLevel: `Level ${youth.level}`,
        idNumber: youth.idNumber || youth.id,
      }));
    })();
  }, [youth.id, youth.firstName, youth.lastName, youth.level, user?.uid]);

  useEffect(() => {
    const autoSave = async () => {
      try {
        setIsAutoSaving(true);
        await draftsService.save(youth.id, "discharge_report", user?.uid || null, reportData);
      } catch {}
      setTimeout(() => setIsAutoSaving(false), 500);
    };
    const timer = setTimeout(autoSave, 2000);
    return () => clearTimeout(timer);
  }, [reportData, youth.id, user?.uid]);

  const handleChange = (field: keyof DischargeData, value: any) => {
    setReportData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await draftsService.save(youth.id, "discharge_report", user?.uid || null, reportData);
    toast({ title: "Report Saved", description: "Discharge Report has been saved." });
  };

  const handleExportPDF = async () => {
    if (printRef.current) {
      try {
        const filename = `${buildReportFilename(youth, "Discharge Report")}.pdf`;
        await exportElementToPDF(printRef.current, filename);
        toast({ title: "PDF Exported", description: "Discharge Report exported as PDF." });
      } catch {
        toast({ title: "Export Error", description: "Failed to export PDF.", variant: "destructive" });
      }
    }
  };

  const handleReset = async () => {
    if (confirm("Reset the discharge report? All data will be lost.")) {
      try { await draftsService.delete(youth.id, "discharge_report", user?.uid || null); } catch {}
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <Card className="discharge-print-hide">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Discharge Report
            {isAutoSaving && <span className="text-sm text-green-600">(Auto-saving...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={handleSave} variant="outline"><Save className="h-4 w-4 mr-2" />Save</Button>
          <Button onClick={handleExportPDF} className="bg-[#823131] hover:bg-[#6b2828] text-white"><Download className="h-4 w-4 mr-2" />Export PDF</Button>
          <Button onClick={handleReset} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50"><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
        </CardContent>
      </Card>

      <div ref={printRef} className="bg-white p-8 rounded-lg border print-section">
        <ReportHeader subtitle="Discharge Summary Report" detail={reportData.dateOfDischarge ? format(new Date(reportData.dateOfDischarge + "T00:00:00"), "MMMM d, yyyy") : undefined} className="mb-8" />

        {/* Resident Information */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {([
            ["residentName", "Resident Name"],
            ["idNumber", "ID #"],
            ["dateOfBirth", "Date of Birth"],
            ["dateOfAdmission", "Date of Admission"],
            ["dateOfDischarge", "Date of Discharge"],
            ["lengthOfStay", "Length of Stay"],
            ["currentLevel", "Level at Discharge"],
            ["caseManager", "Case Manager"],
            ["primaryStaff", "Primary Staff"],
            ["probationOfficer", "Probation Officer"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label>{label}:</Label>
              <Input
                type={key === "dateOfDischarge" || key === "dateOfBirth" || key === "dateOfAdmission" ? "date" : "text"}
                value={reportData[key] as string}
                onChange={(e) => handleChange(key, e.target.value)}
                className="border-b border-gray-300 rounded-none"
              />
            </div>
          ))}
        </div>

        {/* I. Reason for Discharge */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">I. REASON FOR DISCHARGE</h3>
          <div className="flex gap-4 flex-wrap mb-3">
            {(["Successful Completion", "Court Order", "Family Request", "Transfer", "AWOL", "Administrative", "Other"] as const).map((reason) => (
              <label key={reason} className="flex items-center gap-2">
                <Checkbox checked={reportData.reasonForDischarge === reason} onCheckedChange={() => handleChange("reasonForDischarge", reason)} />
                {reason}
              </label>
            ))}
          </div>
          <Label className="font-semibold">Details:</Label>
          <Textarea value={reportData.reasonDetail} onChange={(e) => handleChange("reasonDetail", e.target.value)} rows={3} className="mt-1" />
        </div>

        {/* II. Treatment Goal Status */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">II. TREATMENT GOAL STATUS</h3>
          <div className="mb-3">
            <Label className="font-semibold">Summary of Treatment Progress:</Label>
            <Textarea value={reportData.treatmentGoalsSummary} onChange={(e) => handleChange("treatmentGoalsSummary", e.target.value)} rows={3} className="mt-1" />
          </div>
          {([1, 2, 3] as const).map((n) => {
            const goalKey = `goal${n}` as keyof DischargeData;
            const statusKey = `goal${n}Status` as keyof DischargeData;
            return (
              <div key={n} className="mb-3 space-y-2">
                <Label className="font-semibold">Goal #{n}:</Label>
                <Input value={reportData[goalKey] as string} onChange={(e) => handleChange(goalKey, e.target.value)} />
                <div className="flex gap-4">
                  {(["Achieved", "Partially Achieved", "Not Achieved", "Ongoing"] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2">
                      <Checkbox checked={reportData[statusKey] === s} onCheckedChange={() => handleChange(statusKey, s)} />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* III. Behavioral Progress */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">III. BEHAVIORAL PROGRESS</h3>
          {([
            ["behavioralProgress", "Overall Behavioral Progress:"],
            ["peerInteractionSummary", "Peer Interaction:"],
            ["adultInteractionSummary", "Adult Interaction:"],
            ["programInvestmentSummary", "Program Investment:"],
            ["authoritySummary", "Dealing with Authority:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={2} className="mt-1" />
            </div>
          ))}
        </div>

        {/* IV. Academic & Skills */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">IV. ACADEMIC & INDEPENDENT LIVING SKILLS</h3>
          <div className="mb-3">
            <Label className="font-semibold">Academic Summary:</Label>
            <Textarea value={reportData.academicSummary} onChange={(e) => handleChange("academicSummary", e.target.value)} rows={3} className="mt-1" />
          </div>
          <div>
            <Label className="font-semibold">Independent Living Skills:</Label>
            <Textarea value={reportData.independentLivingSkills} onChange={(e) => handleChange("independentLivingSkills", e.target.value)} rows={3} className="mt-1" />
          </div>
        </div>

        {/* V. Family & Aftercare */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">V. FAMILY ENGAGEMENT & AFTERCARE</h3>
          {([
            ["familyEngagementSummary", "Family Engagement Summary:"],
            ["aftercarePlan", "Aftercare / Transition Plan:"],
            ["communityResources", "Community Resources / Referrals:"],
            ["followUpAppointments", "Follow-Up Appointments:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={3} className="mt-1" />
            </div>
          ))}
        </div>

        {/* VI. Summary & Recommendations */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VI. SUMMARY & RECOMMENDATIONS</h3>
          {([
            ["strengthsAtDischarge", "Strengths at Discharge:"],
            ["ongoingConcerns", "Ongoing Concerns:"],
            ["recommendations", "Recommendations:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={3} className="mt-1" />
            </div>
          ))}
        </div>

        {/* VII. Discharge Disposition */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VII. DISCHARGE DISPOSITION</h3>
          <div className="flex gap-4 flex-wrap mb-3">
            {(["Home", "Foster Care", "Another Facility", "Independent Living", "Detention", "Other"] as const).map((d) => (
              <label key={d} className="flex items-center gap-2">
                <Checkbox checked={reportData.dischargeDisposition === d} onCheckedChange={() => handleChange("dischargeDisposition", d)} />
                {d}
              </label>
            ))}
          </div>
          {([
            ["dispositionDetail", "Details:"],
            ["receivingAgency", "Receiving Agency / Contact:"],
            ["transportationPlan", "Transportation Plan:"],
          ] as [keyof DischargeData, string][]).map(([key, label]) => (
            <div key={key} className="mb-3">
              <Label className="font-semibold">{label}</Label>
              <Textarea value={reportData[key] as string} onChange={(e) => handleChange(key, e.target.value)} rows={2} className="mt-1" />
            </div>
          ))}
        </div>

        {/* VIII. Administrative */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-4">VIII. ADMINISTRATIVE</h3>
          <div className="mb-3">
            <Label className="font-semibold">Medication at Discharge:</Label>
            <Textarea value={reportData.medicationAtDischarge} onChange={(e) => handleChange("medicationAtDischarge", e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="mb-3 flex items-center gap-2">
            <Checkbox checked={reportData.propertyReturned} onCheckedChange={(v) => handleChange("propertyReturned", !!v)} />
            <Label className="font-semibold">All personal property returned to resident</Label>
          </div>
          <div>
            <Label className="font-semibold">Documents Provided to Resident/Guardian:</Label>
            <Textarea value={reportData.documentsProvided} onChange={(e) => handleChange("documentsProvided", e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .discharge-print-hide { display: none !important; }
            .print-section {
              box-shadow: none !important;
              border: none !important;
              border-radius: 0 !important;
              margin: 0 !important;
              padding: 20px !important;
              background: white !important;
              color: black !important;
              font-size: 12pt !important;
              line-height: 1.4 !important;
            }
            .print-section h3 {
              font-size: 12pt !important;
              margin-bottom: 8pt !important;
              margin-top: 16pt !important;
            }
            @page {
              margin: 0.75in !important;
              size: letter !important;
            }
          }
        `
      }} />
    </div>
  );
};
