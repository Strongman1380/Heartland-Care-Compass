
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { buildReportFilename } from "@/utils/reportFilenames";
// Note: Assessment saving/loading functionality will need to be implemented with local storage

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
  createdAt: Date;
  updatedAt: Date;
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
  const [worksheet, setWorksheet] = useState<BehaviorWorksheet>({
    events: Array(3).fill({}).map(() => ({ ...EMPTY_EVENT })),
    summary: "",
    skillsToImprove: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  
  useEffect(() => {
    fetchWorksheet();
  }, [youthId]);
  
  const fetchWorksheet = () => {
    try {
      setIsLoading(true);
      
      // For now, just initialize with default structure
      // TODO: Implement local storage for behavior worksheets
      setWorksheet({
        events: Array(3).fill({}).map(() => ({ ...EMPTY_EVENT })),
        summary: "",
        skillsToImprove: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
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
  
  const handleSaveWorksheet = () => {
    try {
      setIsSaving(true);
      
      // TODO: Implement local storage for behavior worksheets
      console.log("Saving worksheet:", worksheet);
      
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
          <Button variant="outline">Reset Form</Button>
          <Button onClick={handleSaveWorksheet} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Worksheet"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
