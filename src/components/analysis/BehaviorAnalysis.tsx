
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { buildReportFilename } from "@/utils/reportFilenames";
import { behaviorPointsService, caseNotesService } from "@/integrations/firebase/services";
import { generateBehavioralInsights } from "@/lib/aiClient";
import {
  behaviorAnalysisService,
  type BehaviorWorksheetRow,
} from "@/integrations/firebase/behaviorAnalysisService";

interface BehaviorAnalysisProps {
  youthId: string;
  youth: any;
}

interface BehaviorEvent {
  description: string;
  trigger: string;
  thoughts: string;
  feelings: string;
  behaviors: string;
  consequences: string;
  alternativeResponses: string;
}

interface BehaviorWorksheet {
  id?: string;
  events: BehaviorEvent[];
  summary: string;
  skillsToImprove: string[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_SKILLS = [
  "Anger management",
  "Emotional regulation",
  "Impulse control",
  "Social awareness",
  "Problem solving",
  "Communication skills",
  "Conflict resolution",
  "Stress management",
  "Coping strategies",
  "Self-awareness"
];

const EMPTY_EVENT: BehaviorEvent = {
  description: "",
  trigger: "",
  thoughts: "",
  feelings: "",
  behaviors: "",
  consequences: "",
  alternativeResponses: ""
};

export const BehaviorAnalysis = ({ youthId, youth }: BehaviorAnalysisProps) => {
  const createDefaultWorksheet = (): BehaviorWorksheet => {
    const now = new Date().toISOString();
    return {
      events: Array(3).fill({}).map(() => ({ ...EMPTY_EVENT })),
      summary: "",
      skillsToImprove: [],
      createdAt: now,
      updatedAt: now,
    };
  };

  const [worksheet, setWorksheet] = useState<BehaviorWorksheet>(createDefaultWorksheet());
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  
  useEffect(() => {
    const load = async () => {
      await fetchWorksheet();
    };
    load();
  }, [youthId]);
  
  const mapRowToWorksheet = (row: BehaviorWorksheetRow): BehaviorWorksheet => {
    const events = Array.isArray(row.events) ? row.events.slice(0, 3) : [];
    while (events.length < 3) events.push({ ...EMPTY_EVENT });
    return {
      id: row.id,
      events,
      summary: row.summary || "",
      skillsToImprove: row.skills_to_improve || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  };

  const fetchWorksheet = async () => {
    try {
      setIsLoading(true);
      const existing = await behaviorAnalysisService.getByYouthId(youthId);
      if (existing) {
        setWorksheet(mapRowToWorksheet(existing));
      } else {
        setWorksheet(createDefaultWorksheet());
      }
      setActiveEventIndex(0);
    } catch (error) {
      console.error("Error fetching behavior worksheet:", error);
      toast.error("Failed to load behavior analysis worksheet");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleEventChange = (index: number, field: keyof BehaviorEvent, value: string) => {
    const updatedEvents = [...worksheet.events];
    updatedEvents[index] = {
      ...updatedEvents[index],
      [field]: value
    };
    setWorksheet(prev => ({
      ...prev,
      events: updatedEvents
    }));
  };
  
  const handleSummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWorksheet(prev => ({
      ...prev,
      summary: e.target.value
    }));
  };
  
  const handleSkillToggle = (skill: string) => {
    setWorksheet(prev => {
      const skills = [...prev.skillsToImprove];
      
      if (skills.includes(skill)) {
        return {
          ...prev,
          skillsToImprove: skills.filter(s => s !== skill)
        };
      } else {
        return {
          ...prev,
          skillsToImprove: [...skills, skill]
        };
      }
    });
  };
  
  const handleSaveWorksheet = async () => {
    try {
      setIsSaving(true);
      const saved = await behaviorAnalysisService.save(youthId, {
        events: worksheet.events,
        summary: worksheet.summary,
        skills_to_improve: worksheet.skillsToImprove,
      });

      setWorksheet((prev) => ({
        ...prev,
        id: saved.id,
        createdAt: saved.created_at,
        updatedAt: saved.updated_at,
      }));
      toast.success("Behavior analysis worksheet saved successfully");
    } catch (error) {
      console.error("Error saving behavior worksheet:", error);
      toast.error("Failed to save behavior analysis worksheet");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrintWorksheet = () => {
    window.print();
  };

  const handleResetWorksheet = () => {
    if (!confirm("Reset this worksheet to blank fields? Unsaved changes will be lost.")) return;
    setWorksheet(createDefaultWorksheet());
    setActiveEventIndex(0);
  };

  const inferSkillsFromSummary = (summary: string): string[] => {
    const text = summary.toLowerCase();
    const matched: string[] = [];
    const mapping: Array<{ skill: string; keywords: string[] }> = [
      { skill: "Anger management", keywords: ["anger", "angry", "frustrat"] },
      { skill: "Emotional regulation", keywords: ["emotion", "escalat", "mood"] },
      { skill: "Impulse control", keywords: ["impulse", "impulsive", "reactive"] },
      { skill: "Social awareness", keywords: ["peer", "social", "relationship"] },
      { skill: "Problem solving", keywords: ["problem", "solution", "decision"] },
      { skill: "Communication skills", keywords: ["communication", "communicate", "express"] },
      { skill: "Conflict resolution", keywords: ["conflict", "argument", "fight"] },
      { skill: "Stress management", keywords: ["stress", "pressure", "overwhelm"] },
      { skill: "Coping strategies", keywords: ["coping", "strategy", "de-escalat"] },
      { skill: "Self-awareness", keywords: ["insight", "self", "awareness"] },
    ];

    mapping.forEach(({ skill, keywords }) => {
      if (keywords.some((k) => text.includes(k))) matched.push(skill);
    });

    return matched.slice(0, 5);
  };

  const handleGenerateSummary = async () => {
    try {
      setIsGeneratingSummary(true);
      const [points, notes] = await Promise.all([
        behaviorPointsService.getByYouthId(youthId, 90),
        caseNotesService.getByYouthId(youthId, 25),
      ]);

      if (points.length === 0 && notes.length === 0) {
        toast.error("No behavior points or case notes found to generate analysis");
        return;
      }

      const period = {
        startDate: points[points.length - 1]?.date || "",
        endDate: points[0]?.date || "",
      };

      const insight = await generateBehavioralInsights(points, youth, period);
      const caseNoteSignal =
        notes.length > 0
          ? `\n\nCase note context: reviewed ${notes.length} recent notes for corroborating behavioral patterns.`
          : "";
      const nextSummary = `${insight}${caseNoteSignal}`.trim();
      const inferredSkills = inferSkillsFromSummary(nextSummary);

      setWorksheet((prev) => ({
        ...prev,
        summary: nextSummary,
        skillsToImprove: prev.skillsToImprove.length > 0 ? prev.skillsToImprove : inferredSkills,
      }));

      toast.success("Behavior analysis summary generated from live behavior data");
    } catch (error) {
      console.error("Error generating behavior summary:", error);
      toast.error("Failed to generate behavior analysis summary");
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  const handleExportPdf = async () => {
    try {
      const { exportHTMLToPDF } = await import('@/utils/export');

      const exportData = {
        youth: youth,
        worksheet: worksheet,
        exportDate: new Date().toLocaleDateString()
      };

      const html = generateBehaviorAnalysisHTML(exportData);
      const filename = `${buildReportFilename(youth, "Behavior Analysis Worksheet")}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast.success("Behavior analysis exported successfully!");
    } catch (error) {
      console.error("Error exporting behavior analysis:", error);
      toast.error("Failed to export behavior analysis");
    }
  };

  const generateBehaviorAnalysisHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Behavior Analysis Worksheet</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .youth-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .event-section { margin-bottom: 30px; padding: 20px; border: 2px solid #ddd; border-radius: 5px; }
            .event-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #333; }
            .field { margin-bottom: 10px; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; }
            .summary-section { background-color: #e8f4fd; padding: 20px; border-radius: 5px; margin-top: 30px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Heartland Care Compass</h1>
            <h2>Behavior Analysis Worksheet</h2>
            <p>Generated on ${data.exportDate}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${data.youth.firstName} ${data.youth.lastName}</p>
            <p><strong>Date of Birth:</strong> ${data.youth.dateOfBirth || 'Not specified'}</p>
            <p><strong>Current Level:</strong> ${data.youth.currentLevel || 'Not specified'}</p>
          </div>

          <h3>Behavioral Events</h3>
          ${data.worksheet.events.map((event: any, index: number) => `
            <div class="event-section">
              <div class="event-title">Event ${index + 1}</div>
              <div class="field">
                <span class="field-label">Description:</span>
                <span class="field-value">${event.description || 'Not specified'}</span>
              </div>
              <div class="field">
                <span class="field-label">Trigger:</span>
                <span class="field-value">${event.trigger || 'Not specified'}</span>
              </div>
              <div class="field">
                <span class="field-label">Thoughts:</span>
                <span class="field-value">${event.thoughts || 'Not specified'}</span>
              </div>
              <div class="field">
                <span class="field-label">Feelings:</span>
                <span class="field-value">${event.feelings || 'Not specified'}</span>
              </div>
              <div class="field">
                <span class="field-label">Behaviors:</span>
                <span class="field-value">${event.behaviors || 'Not specified'}</span>
              </div>
              <div class="field">
                <span class="field-label">Consequences:</span>
                <span class="field-value">${event.consequences || 'Not specified'}</span>
              </div>
              <div class="field">
                <span class="field-label">Alternative Responses:</span>
                <span class="field-value">${event.alternativeResponses || 'Not specified'}</span>
              </div>
            </div>
          `).join('')}

          <div class="summary-section">
            <h3>Analysis Summary</h3>
            <p>${data.worksheet.summary || 'No summary provided'}</p>
          </div>
        </body>
      </html>
    `;
  };
  
  const isEventEmpty = (event: BehaviorEvent) => {
    return !Object.values(event).some(value => value.trim().length > 0);
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading behavior analysis worksheet...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Behavior Analysis Worksheet</h2>
          <p className="text-gray-600 mb-4">
            Document and analyze behavioral triggers, thoughts, feelings, and consequences.
          </p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintWorksheet}>
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateSummary} disabled={isGeneratingSummary}>
            {isGeneratingSummary ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Sparkles size={16} className="mr-2" />}
            Generate Summary
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSaveWorksheet} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Driver Program - Behavior Analysis</CardTitle>
          <CardDescription>
            Document at least three behavior events to help identify patterns and triggers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2].map((index) => (
                <Button 
                  key={index}
                  variant={activeEventIndex === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveEventIndex(index)}
                  className={isEventEmpty(worksheet.events[index]) ? "border-dashed" : ""}
                >
                  Event {index + 1}
                  {!isEventEmpty(worksheet.events[index]) && <span className="ml-1 text-xs">✓</span>}
                </Button>
              ))}
            </div>
            
            <div className="p-4 bg-gray-50 rounded-md">
              <h3 className="text-lg font-medium mb-4">Event {activeEventIndex + 1}</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="description">Event Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what happened in detail..."
                    value={worksheet.events[activeEventIndex]?.description || ""}
                    onChange={(e) => handleEventChange(activeEventIndex, "description", e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="trigger">Trigger</Label>
                    <Textarea
                      id="trigger"
                      placeholder="What triggered this behavior?"
                      value={worksheet.events[activeEventIndex]?.trigger || ""}
                      onChange={(e) => handleEventChange(activeEventIndex, "trigger", e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="thoughts">Thoughts</Label>
                    <Textarea
                      id="thoughts"
                      placeholder="What were you thinking at the time?"
                      value={worksheet.events[activeEventIndex]?.thoughts || ""}
                      onChange={(e) => handleEventChange(activeEventIndex, "thoughts", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="feelings">Feelings</Label>
                    <Textarea
                      id="feelings"
                      placeholder="What emotions were you experiencing?"
                      value={worksheet.events[activeEventIndex]?.feelings || ""}
                      onChange={(e) => handleEventChange(activeEventIndex, "feelings", e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="behaviors">Behaviors</Label>
                    <Textarea
                      id="behaviors"
                      placeholder="What did you do? How did you react?"
                      value={worksheet.events[activeEventIndex]?.behaviors || ""}
                      onChange={(e) => handleEventChange(activeEventIndex, "behaviors", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="consequences">Consequences</Label>
                    <Textarea
                      id="consequences"
                      placeholder="What happened as a result of your behavior?"
                      value={worksheet.events[activeEventIndex]?.consequences || ""}
                      onChange={(e) => handleEventChange(activeEventIndex, "consequences", e.target.value)}
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="alternativeResponses">Alternative Responses</Label>
                    <Textarea
                      id="alternativeResponses"
                      placeholder="What could you have done differently?"
                      value={worksheet.events[activeEventIndex]?.alternativeResponses || ""}
                      onChange={(e) => handleEventChange(activeEventIndex, "alternativeResponses", e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <Label htmlFor="summary">Summary of Patterns</Label>
              <Textarea
                id="summary"
                placeholder="Based on these events, summarize any patterns you notice in your behavior, triggers, or responses..."
                value={worksheet.summary}
                onChange={handleSummaryChange}
                rows={4}
              />
            </div>
            
            <div>
              <Label className="mb-2 block">Skills to Improve</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {DEFAULT_SKILLS.map((skill) => (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`skill-${skill}`}
                      checked={worksheet.skillsToImprove.includes(skill)}
                      onCheckedChange={() => handleSkillToggle(skill)}
                    />
                    <Label 
                      htmlFor={`skill-${skill}`}
                      className="text-sm cursor-pointer"
                    >
                      {skill}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={handleResetWorksheet}>Reset Form</Button>
          <Button onClick={handleSaveWorksheet} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Worksheet"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
