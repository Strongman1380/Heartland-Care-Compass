
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ClipboardPaste, Loader2, Save, RotateCcw, User, Phone, BookOpen, Heart, Shield, Scale, Pill, Brain, Home, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { saveProgressNote } from "@/utils/local-storage-utils";

interface ReferralTabProps {
  youthId: string;
  youth: any;
}

interface ParsedReferral {
  demographics: Record<string, string>;
  family: Record<string, string>;
  education: Record<string, string>;
  medical: Record<string, string>;
  mentalHealth: Record<string, string>;
  legal: Record<string, string>;
  behavioral: Record<string, string>;
  placement: Record<string, string>;
  other: Record<string, string>;
}

const SECTION_CONFIG = [
  {
    key: "demographics" as const,
    label: "Demographics",
    icon: User,
    color: "blue",
    keywords: [
      "first name", "last name", "name", "dob", "date of birth", "age", "sex", "gender",
      "race", "ethnicity", "religion", "place of birth", "social security",
      "height", "weight", "hair color", "eye color", "tattoos", "scars",
      "address", "street", "city", "state", "zip",
    ],
  },
  {
    key: "family" as const,
    label: "Family & Contacts",
    icon: Home,
    color: "amber",
    keywords: [
      "mother", "father", "parent", "guardian", "legal guardian", "next of kin",
      "sibling", "family", "caregiver", "custody", "relative",
      "guardian phone", "guardian email", "guardian contact",
    ],
  },
  {
    key: "education" as const,
    label: "Education",
    icon: BookOpen,
    color: "purple",
    keywords: [
      "school", "grade", "iep", "academic", "education", "teacher", "gpa",
      "credits", "enrollment", "attendance", "special education", "504",
      "learning disability", "school contact", "school phone",
    ],
  },
  {
    key: "medical" as const,
    label: "Medical",
    icon: Pill,
    color: "green",
    keywords: [
      "medication", "allergy", "allergies", "physician", "doctor", "insurance",
      "medical condition", "health", "immunization", "prescription",
      "pharmacy", "hospital", "clinic", "dental", "vision",
    ],
  },
  {
    key: "mentalHealth" as const,
    label: "Mental Health",
    icon: Brain,
    color: "pink",
    keywords: [
      "diagnosis", "diagnoses", "mental health", "therapy", "therapist",
      "counseling", "counselor", "trauma", "ptsd", "anxiety", "depression",
      "adhd", "odd", "conduct disorder", "bipolar", "self-harm", "suicidal",
      "safety plan", "psychiatric", "psychotropic", "treatment",
      "session frequency", "session time",
    ],
  },
  {
    key: "legal" as const,
    label: "Legal & Court",
    icon: Scale,
    color: "slate",
    keywords: [
      "court", "judge", "attorney", "probation", "caseworker", "parole",
      "offense", "charge", "adjudication", "disposition", "legal status",
      "placing agency", "county", "guardian ad litem", "gal",
      "delinquent", "status offense", "dependency", "neglect",
    ],
  },
  {
    key: "behavioral" as const,
    label: "Behavioral History",
    icon: AlertTriangle,
    color: "orange",
    keywords: [
      "behavior", "aggression", "anger", "violence", "vandalism", "gang",
      "substance", "drug", "alcohol", "tobacco", "vaping", "marijuana",
      "runaway", "elopement", "restraint", "assault", "fighting",
      "coping", "strengths", "interests", "triggers",
    ],
  },
  {
    key: "placement" as const,
    label: "Placement & Referral",
    icon: Shield,
    color: "red",
    keywords: [
      "referral", "placement", "admission", "intake", "discharge",
      "prior placement", "foster care", "group home", "detention",
      "residential", "reason for", "estimated stay", "rcs",
      "orientation", "immediate needs",
    ],
  },
];

function parseReferralText(raw: string): ParsedReferral {
  const result: ParsedReferral = {
    demographics: {},
    family: {},
    education: {},
    medical: {},
    mentalHealth: {},
    legal: {},
    behavioral: {},
    placement: {},
    other: {},
  };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•\-\u2022\*]\s*/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (!match) continue;

    const fieldName = match[1].trim();
    const value = match[2].trim();

    if (!value || /^(n\/a|na|none|unknown|not provided|not documented|unspecified|-|—)$/i.test(value)) {
      continue;
    }

    const fieldLower = fieldName.toLowerCase();
    let placed = false;

    for (const section of SECTION_CONFIG) {
      if (section.keywords.some((kw) => fieldLower.includes(kw) || kw.includes(fieldLower))) {
        result[section.key][fieldName] = value;
        placed = true;
        break;
      }
    }

    if (!placed) {
      result.other[fieldName] = value;
    }
  }

  // If nothing parsed via key:value, try to extract paragraphs as freeform sections
  const totalParsed = Object.values(result).reduce((sum, section) => sum + Object.keys(section).length, 0);
  if (totalParsed === 0 && raw.trim().length > 0) {
    // Try paragraph splitting for unstructured referral text
    const paragraphs = raw.split(/\n\s*\n/).filter((p) => p.trim());
    if (paragraphs.length > 0) {
      result.other["Referral Notes"] = raw.trim();
    }
  }

  return result;
}

function sectionHasContent(section: Record<string, string>): boolean {
  return Object.keys(section).length > 0;
}

const colorMap: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-800",
  amber: "bg-amber-50 border-amber-200 text-amber-800",
  purple: "bg-purple-50 border-purple-200 text-purple-800",
  green: "bg-green-50 border-green-200 text-green-800",
  pink: "bg-pink-50 border-pink-200 text-pink-800",
  slate: "bg-slate-50 border-slate-200 text-slate-800",
  orange: "bg-orange-50 border-orange-200 text-orange-800",
  red: "bg-red-50 border-red-200 text-red-800",
};

const badgeColorMap: Record<string, string> = {
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  purple: "bg-purple-100 text-purple-700",
  green: "bg-green-100 text-green-700",
  pink: "bg-pink-100 text-pink-700",
  slate: "bg-slate-100 text-slate-700",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-red-100 text-red-700",
};

export const ReferralTab = ({ youthId, youth }: ReferralTabProps) => {
  const [rawText, setRawText] = useState("");
  const [parsed, setParsed] = useState<ParsedReferral | null>(null);
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleParse = () => {
    if (!rawText.trim()) {
      toast.error("Please paste referral text first");
      return;
    }

    setIsParsing(true);
    // Small delay to show loading state
    setTimeout(() => {
      const result = parseReferralText(rawText);
      setParsed(result);
      setIsParsing(false);

      const totalFields = Object.values(result).reduce(
        (sum, section) => sum + Object.keys(section).length,
        0
      );
      if (totalFields > 0) {
        toast.success(`Parsed ${totalFields} fields into ${Object.values(result).filter(sectionHasContent).length} sections`);
      } else {
        toast.warning("Could not parse structured fields. The full text will be saved as-is.");
      }
    }, 300);
  };

  const handleReset = () => {
    setRawText("");
    setParsed(null);
  };

  const handleSave = async () => {
    if (!staffName.trim()) {
      toast.error("Staff name is required");
      return;
    }
    if (!rawText.trim()) {
      toast.error("No referral text to save");
      return;
    }

    try {
      setIsSaving(true);

      // Build structured note for storage and KPI indexing
      const sections: string[] = [];

      if (parsed) {
        for (const sectionDef of SECTION_CONFIG) {
          const data = parsed[sectionDef.key];
          if (!sectionHasContent(data)) continue;
          sections.push(`[${sectionDef.label}]`);
          for (const [key, val] of Object.entries(data)) {
            sections.push(`${key}: ${val}`);
          }
          sections.push("");
        }
        if (sectionHasContent(parsed.other)) {
          sections.push("[Other Information]");
          for (const [key, val] of Object.entries(parsed.other)) {
            sections.push(`${key}: ${val}`);
          }
        }
      }

      const structuredNote = {
        formatVersion: "v2",
        noteType: "referral",
        sections: {
          summary: `Referral documentation for ${youth?.firstName || ""} ${youth?.lastName || ""}. Parsed from intake/referral text.`,
          strengthsChallenges: parsed
            ? sections.join("\n")
            : rawText.trim(),
          interventionsResponse: "",
          planNextSteps: "",
        },
        referralData: parsed || null,
        rawReferralText: rawText.trim(),
      };

      await saveProgressNote(youthId, {
        date: new Date(date),
        category: "Referral",
        note: JSON.stringify(structuredNote),
        staff: staffName.trim(),
      });

      toast.success("Referral note saved successfully");
      handleReset();
      setStaffName("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save referral note";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const totalFields = parsed
    ? Object.values(parsed).reduce((sum, section) => sum + Object.keys(section).length, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Referral Import</h2>
        <p className="text-gray-600">
          Paste referral text below and the system will parse and organize it into structured sections for search and KPI tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardPaste className="h-4 w-4" />
                Paste Referral Text
              </CardTitle>
              <CardDescription>
                Paste the referral document, email, or intake form text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  setParsed(null);
                }}
                rows={16}
                placeholder={`Paste referral text here...\n\nExample format:\nFirst Name: John\nLast Name: Doe\nDate of Birth: 01/15/2010\nReferral Source: County DHS\nReason for Placement: ...\nCurrent Diagnoses: ADHD, ODD\nCurrent Medications: ...\nProbation Officer: ...\n...`}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleParse}
                  disabled={!rawText.trim() || isParsing}
                  className="flex-1"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    "Parse Referral"
                  )}
                </Button>
                {(rawText || parsed) && (
                  <Button variant="outline" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save controls */}
          {parsed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Save Referral Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="referral-date">Date</Label>
                    <Input
                      id="referral-date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referral-staff">Staff Name</Label>
                    <Input
                      id="referral-staff"
                      value={staffName}
                      onChange={(e) => setStaffName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Referral Note
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Parsed results */}
        <div className="space-y-4">
          {!parsed ? (
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ClipboardPaste className="h-12 w-12 mb-4" />
                <p className="text-center font-medium">Paste referral text and click "Parse Referral"</p>
                <p className="text-center text-sm mt-1">The parsed information will appear here organized by section</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary badge bar */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-sm">
                  {totalFields} fields parsed
                </Badge>
                {SECTION_CONFIG.filter((s) => sectionHasContent(parsed[s.key])).map((s) => (
                  <Badge key={s.key} className={badgeColorMap[s.color]}>
                    {s.label} ({Object.keys(parsed[s.key]).length})
                  </Badge>
                ))}
              </div>

              {/* Section cards */}
              {SECTION_CONFIG.map((sectionDef) => {
                const data = parsed[sectionDef.key];
                if (!sectionHasContent(data)) return null;
                const Icon = sectionDef.icon;

                return (
                  <Card key={sectionDef.key} className={`border ${colorMap[sectionDef.color].split(" ").slice(1).join(" ")}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {sectionDef.label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-1.5">
                        {Object.entries(data).map(([key, val]) => (
                          <div key={key} className="flex gap-2 text-sm">
                            <span className="font-medium text-gray-600 min-w-[140px] shrink-0">{key}:</span>
                            <span className="text-gray-900">{val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Other / uncategorized */}
              {sectionHasContent(parsed.other) && (
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Other Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Object.entries(parsed.other).map(([key, val]) => (
                        <div key={key} className="text-sm">
                          {key === "Referral Notes" ? (
                            <div className="whitespace-pre-wrap text-gray-800">{val}</div>
                          ) : (
                            <div className="flex gap-2">
                              <span className="font-medium text-gray-600 min-w-[140px] shrink-0">{key}:</span>
                              <span className="text-gray-900">{val}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
