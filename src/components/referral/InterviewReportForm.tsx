import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, Download, Copy, Printer, Loader2, ClipboardPaste, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { exportHTMLToPDF } from "@/utils/export";

const SECTIONS = [
  { key: "youthPresentation", label: "Youth Presentation", placeholder: "Appearance, demeanor, attitude during interview..." },
  { key: "motivationForChange", label: "Motivation for Change", placeholder: "Self-identified goals, willingness to engage, understanding of placement..." },
  { key: "riskFactorAssessment", label: "Risk Factor Assessment", placeholder: "Violence history, substance use, runaway risk, self-harm, gang involvement..." },
  { key: "behavioralIndicators", label: "Behavioral Indicators", placeholder: "Impulse control observations, emotional regulation, peer interaction style..." },
  { key: "familyDynamics", label: "Family Dynamics", placeholder: "Family support, custody situation, family willingness to participate..." },
  { key: "educationalEngagement", label: "Educational Engagement", placeholder: "Academic motivation, school behavior, IEP needs..." },
  { key: "treatmentHistory", label: "Treatment History", placeholder: "Prior placements, therapy history, medication compliance..." },
  { key: "programFitAssessment", label: "Program Fit Assessment", placeholder: "Suitability for Heartland, anticipated challenges, recommended level..." },
  { key: "interviewerRecommendation", label: "Interviewer Recommendation", placeholder: "Accept/Deny/Conditional recommendation with rationale..." },
  { key: "directorSummary", label: "Director / Executive Director Summary", placeholder: "Concise leadership brief..." },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export interface StructuredInterviewData {
  sections: Record<SectionKey, { text: string; rating: number }>;
  overallRecommendation: "accept" | "deny" | "conditional" | "";
  status?: string;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Average",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

// Maps heading text (lowercase) → SectionKey
const PASTE_SECTION_MAP: Array<[string, SectionKey]> = [
  ["youth presentation", "youthPresentation"],
  ["motivation for change", "motivationForChange"],
  ["risk factor assessment", "riskFactorAssessment"],
  ["behavioral indicators", "behavioralIndicators"],
  ["family dynamics", "familyDynamics"],
  ["educational engagement", "educationalEngagement"],
  ["treatment history", "treatmentHistory"],
  ["program fit assessment", "programFitAssessment"],
  ["interviewer recommendation", "interviewerRecommendation"],
  ["director", "directorSummary"],
];

function parseInterviewPaste(
  text: string
): { sections: Partial<Record<SectionKey, { text: string; rating: number }>>; overallRecommendation?: string } {
  const trimmed = text.trim();

  // Try JSON (StructuredInterviewData shape)
  try {
    const stripped = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    const parsed = JSON.parse(stripped);
    if (parsed.sections && typeof parsed.sections === "object") {
      return { sections: parsed.sections, overallRecommendation: parsed.overallRecommendation };
    }
  } catch { /* fall through to text parser */ }

  const sections: Partial<Record<SectionKey, { text: string; rating: number }>> = {};
  let overallRecommendation: string | undefined;
  let currentKey: SectionKey | null = null;
  let currentLines: string[] = [];
  let currentRating = 3;

  const flush = () => {
    if (!currentKey) return;
    sections[currentKey] = { text: currentLines.join("\n").trim(), rating: currentRating };
    currentLines = [];
    currentRating = 3;
  };

  for (const line of text.split("\n")) {
    // Section header: ## Title  or  ## Title | Rating: N
    const headerMatch = line.match(/^#{1,3}\s+(.+?)(?:\s*[|]\s*[Rr]ating[:\s]+(\d))?$/);
    if (headerMatch) {
      flush();
      const heading = headerMatch[1].trim().toLowerCase();
      if (headerMatch[2]) currentRating = parseInt(headerMatch[2]);
      currentKey = null;
      for (const [phrase, key] of PASTE_SECTION_MAP) {
        if (heading.includes(phrase)) { currentKey = key; break; }
      }
      continue;
    }

    // Standalone rating line: "Rating: 4"
    const ratingMatch = line.match(/^[Rr]ating[:\s]+(\d)/);
    if (ratingMatch) { currentRating = parseInt(ratingMatch[1]); continue; }

    // Overall recommendation line
    const recMatch = line.match(/[Oo]verall\s+[Rr]ecommendation[:\s]+(accept|deny|conditional)/i);
    if (recMatch) { overallRecommendation = recMatch[1].toLowerCase(); continue; }

    currentLines.push(line);
  }
  flush();

  return { sections, overallRecommendation };
}

export const INTERVIEW_PASTE_FORMAT = `Write an interview report with these sections. Use ## headings, then "Rating: N" (1=Poor, 5=Excellent), then narrative text.

## Youth Presentation
Rating: [1-5]
[Appearance, demeanor, attitude during interview...]

## Motivation for Change
Rating: [1-5]
[Self-identified goals, willingness to engage...]

## Risk Factor Assessment
Rating: [1-5]
[Violence history, substance use, runaway risk, self-harm, gang...]

## Behavioral Indicators
Rating: [1-5]
[Impulse control, emotional regulation, peer interaction style...]

## Family Dynamics
Rating: [1-5]
[Family support, custody, willingness to participate...]

## Educational Engagement
Rating: [1-5]
[Academic motivation, school behavior, IEP needs...]

## Treatment History
Rating: [1-5]
[Prior placements, therapy history, medication compliance...]

## Program Fit Assessment
Rating: [1-5]
[Suitability for Heartland, anticipated challenges, recommended level...]

## Interviewer Recommendation
Rating: [1-5]
[Accept/Deny/Conditional recommendation with rationale...]

## Director / Executive Director Summary
Rating: [1-5]
[Concise leadership brief...]

Overall Recommendation: accept`;

interface InterviewReportFormProps {
  referralName: string;
  initialData?: StructuredInterviewData | null;
  onSave: (data: StructuredInterviewData, status?: string) => Promise<void>;
  onCancel: () => void;
}

export const InterviewReportForm = ({ referralName, initialData, onSave, onCancel }: InterviewReportFormProps) => {
  const defaultSections = Object.fromEntries(
    SECTIONS.map((s) => [s.key, { text: "", rating: 3 }])
  ) as Record<SectionKey, { text: string; rating: number }>;

  const [sections, setSections] = useState<Record<SectionKey, { text: string; rating: number }>>(
    initialData?.sections || defaultSections
  );
  const [recommendation, setRecommendation] = useState(initialData?.overallRecommendation || "");
  const [status, setStatus] = useState(initialData?.status || "");
  const [saving, setSaving] = useState(false);
  const [showExportPreview, setShowExportPreview] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const handleParsePaste = () => {
    if (!pasteText.trim()) return;
    const { sections: parsed, overallRecommendation: rec } = parseInterviewPaste(pasteText);
    setSections((prev) => {
      const next = { ...prev };
      for (const s of SECTIONS) {
        const val = parsed[s.key];
        if (val) next[s.key] = { text: val.text ?? "", rating: typeof val.rating === "number" ? val.rating : 3 };
      }
      return next;
    });
    if (rec) setRecommendation(rec as any);
    setShowPaste(false);
    setPasteText("");
    toast.success("Interview form filled from paste.");
  };

  const updateSection = (key: SectionKey, field: "text" | "rating", value: string | number) => {
    setSections((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ sections, overallRecommendation: recommendation as any, status }, status);
      toast.success("Interview report saved.");
    } catch {
      toast.error("Failed to save interview report.");
    } finally {
      setSaving(false);
    }
  };

  const buildExportHTML = () => {
    const rows = SECTIONS.map((s) => {
      const data = sections[s.key];
      return `
        <div style="margin-bottom:16px; page-break-inside:avoid;">
          <h3 style="font-size:13px; font-weight:bold; color:#333; margin:0 0 4px;">${s.label}</h3>
          <div style="font-size:11px; color:#666; margin-bottom:4px;">Rating: ${data.rating}/5 — ${RATING_LABELS[data.rating] || ""}</div>
          <div style="font-size:12px; white-space:pre-wrap; color:#222;">${data.text || "<em>No notes entered</em>"}</div>
        </div>
      `;
    }).join("");

    return `
      <div style="font-family: 'Times New Roman', serif; max-width:700px; margin:0 auto; padding:24px;">
        <div style="text-align:center; margin-bottom:24px;">
          <h1 style="font-size:18px; margin:0;">Interview Report</h1>
          <h2 style="font-size:14px; font-weight:normal; color:#555; margin:4px 0 0;">${referralName}</h2>
          <p style="font-size:11px; color:#888;">${new Date().toLocaleDateString()}</p>
        </div>
        ${rows}
        <div style="margin-top:20px; padding-top:12px; border-top:1px solid #ccc;">
          <p style="font-size:13px; font-weight:bold;">Overall Recommendation: ${recommendation ? recommendation.charAt(0).toUpperCase() + recommendation.slice(1) : "Not specified"}</p>
        </div>
      </div>
    `;
  };

  const handleCopyToClipboard = () => {
    const text = SECTIONS.map((s) => {
      const data = sections[s.key];
      return `${s.label} (${data.rating}/5)\n${data.text || "—"}`;
    }).join("\n\n");
    const full = `Interview Report — ${referralName}\n${new Date().toLocaleDateString()}\n\n${text}\n\nOverall Recommendation: ${recommendation || "Not specified"}`;
    navigator.clipboard.writeText(full);
    toast.success("Copied to clipboard.");
  };

  const handleExportPDF = async () => {
    try {
      await exportHTMLToPDF(buildExportHTML(), `Interview_Report_${referralName.replace(/\s/g, "_")}.pdf`);
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Failed to export PDF.");
    }
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>Interview Report — ${referralName}</title></head><body onload="window.print(); window.close();">${buildExportHTML()}</body></html>`);
      w.document.close();
    }
  };

  const hasContent = SECTIONS.some((s) => sections[s.key].text.trim());

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Interview Report — {referralName}</CardTitle>
          <CardDescription>Rate and document each area. 1 = Poor, 5 = Excellent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Paste from Claude */}
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPaste((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 text-sm font-medium text-purple-800 hover:bg-purple-100 transition-colors"
            >
              <span className="flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" />
                Fill from Claude Paste
              </span>
              {showPaste ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showPaste && (
              <div className="p-4 space-y-3 bg-white">
                <p className="text-xs text-muted-foreground">
                  Ask Claude to write the interview report, then paste the result here. Supports JSON or the section-header format (## Youth Presentation, Rating: 4, ...).
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(INTERVIEW_PASTE_FORMAT);
                    toast.success("Format guide copied — paste into Claude to get the right output.");
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Copy Format Guide for Claude
                </Button>
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste Claude's interview report output here..."
                  rows={10}
                  className="font-mono text-xs"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleParsePaste} disabled={!pasteText.trim()}>
                    <ClipboardPaste className="h-3.5 w-3.5 mr-1" />
                    Parse & Fill Form
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setPasteText(""); setShowPaste(false); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {SECTIONS.map((section) => {
            const data = sections[section.key];
            return (
              <div key={section.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">{section.label}</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => updateSection(section.key, "rating", n)}
                        className={`w-7 h-7 rounded-full text-xs font-bold transition-colors no-brand-override ${
                          Number(data.rating) === Number(n)
                            ? n <= 2 ? "bg-red-500 text-white" : n === 3 ? "bg-yellow-500 text-white" : "bg-green-500 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2 w-20">{RATING_LABELS[data.rating]}</span>
                  </div>
                </div>
                <Textarea
                  value={data.text}
                  onChange={(e) => updateSection(section.key, "text", e.target.value)}
                  placeholder={section.placeholder}
                  rows={3}
                />
              </div>
            );
          })}

          {/* Overall recommendation */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="text-sm font-semibold">Overall Recommendation</Label>
            <div className="flex gap-2">
              {(["accept", "conditional", "deny"] as const).map((opt) => (
                <Button
                  key={opt}
                  variant={recommendation === opt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRecommendation(opt)}
                  className={`no-brand-override ${recommendation === opt
                    ? opt === "accept" ? "bg-green-600 hover:bg-green-700 text-white" : opt === "deny" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white"
                    : ""
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Status update */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Update Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="No change" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_interview">Pending Interview</SelectItem>
                <SelectItem value="schedule_interview">Schedule Interview</SelectItem>
                <SelectItem value="waiting_for_response">Waiting for Response</SelectItem>
                <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                <SelectItem value="interviewed_yes">Interviewed – Yes</SelectItem>
                <SelectItem value="interviewed_no">Interviewed – No</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="waitlisted">Waitlisted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Save
            </Button>
            <Button variant="outline" onClick={onCancel}>Cancel</Button>

            {hasContent && (
              <>
                <Button variant="outline" onClick={handleExportPDF}>
                  <Download className="h-4 w-4 mr-1" />
                  Export PDF
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleCopyToClipboard}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
