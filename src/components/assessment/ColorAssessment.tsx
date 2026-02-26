import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Youth } from '@/integrations/firebase/services';
import { useYouth } from "@/hooks/useSupabase";
import { User, Palette, Save, Download, Printer } from 'lucide-react';
import { draftsService } from '@/integrations/firebase/draftsService';
import { useAuth } from '@/contexts/AuthContext';
import { buildReportFilename } from '@/utils/reportFilenames';
import { realColorsAssessmentsService, type ColorAssessmentRow } from '@/integrations/firebase/realColorsAssessmentsService';

const COLOR_OPTIONS = ["Gold", "Blue", "Green", "Orange"] as const;
type ColorType = typeof COLOR_OPTIONS[number];

type QuestionOption = {
  value: ColorType;
  label: string;
};

type AssessmentQuestion = {
  id: string;
  prompt: string;
  options: QuestionOption[];
};

const COLOR_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "q1",
    prompt: "What motivates you most in a daily routine?",
    options: [
      { value: "Gold", label: "Structure, clear expectations, and responsibility" },
      { value: "Blue", label: "Connection, meaning, and helping others" },
      { value: "Green", label: "Understanding, strategy, and solving problems" },
      { value: "Orange", label: "Action, variety, and hands-on challenges" },
    ],
  },
  {
    id: "q2",
    prompt: "When conflict happens, your first instinct is to...",
    options: [
      { value: "Gold", label: "Follow rules/process and restore order" },
      { value: "Blue", label: "Talk it through and protect relationships" },
      { value: "Green", label: "Analyze what caused it and find a logical fix" },
      { value: "Orange", label: "Address it quickly and move forward" },
    ],
  },
  {
    id: "q3",
    prompt: "In school or programming groups, you naturally...",
    options: [
      { value: "Gold", label: "Keep everyone organized and on schedule" },
      { value: "Blue", label: "Support people emotionally and encourage teamwork" },
      { value: "Green", label: "Handle complex thinking and technical details" },
      { value: "Orange", label: "Take initiative and keep energy high" },
    ],
  },
  {
    id: "q4",
    prompt: "You usually make decisions by...",
    options: [
      { value: "Gold", label: "Considering responsibility and proven steps" },
      { value: "Blue", label: "Considering impact on people and values" },
      { value: "Green", label: "Considering evidence and logic" },
      { value: "Orange", label: "Considering immediate opportunity and momentum" },
    ],
  },
  {
    id: "q5",
    prompt: "The environment you do best in is...",
    options: [
      { value: "Gold", label: "Predictable, organized, and accountable" },
      { value: "Blue", label: "Supportive, collaborative, and personal" },
      { value: "Green", label: "Independent, thoughtful, and intellectually challenging" },
      { value: "Orange", label: "Flexible, active, and fast-paced" },
    ],
  },
  {
    id: "q6",
    prompt: "When you are stressed, you tend to...",
    options: [
      { value: "Gold", label: "Get stricter with structure and expectations" },
      { value: "Blue", label: "Become sensitive to others' reactions" },
      { value: "Green", label: "Withdraw to think and process alone" },
      { value: "Orange", label: "Act quickly or become restless" },
    ],
  },
  {
    id: "q7",
    prompt: "Others often describe your strength as...",
    options: [
      { value: "Gold", label: "Reliable and dependable" },
      { value: "Blue", label: "Empathetic and caring" },
      { value: "Green", label: "Insightful and analytical" },
      { value: "Orange", label: "Bold and adaptable" },
    ],
  },
  {
    id: "q8",
    prompt: "Your preferred way to learn is...",
    options: [
      { value: "Gold", label: "Step-by-step examples and clear instructions" },
      { value: "Blue", label: "Discussion and real-life personal connection" },
      { value: "Green", label: "Independent research and deeper concepts" },
      { value: "Orange", label: "Hands-on practice and trial-and-error" },
    ],
  },
  {
    id: "q9",
    prompt: "A successful day feels like...",
    options: [
      { value: "Gold", label: "I met my goals and stayed responsible" },
      { value: "Blue", label: "I built trust and meaningful interactions" },
      { value: "Green", label: "I solved difficult problems and learned something new" },
      { value: "Orange", label: "I took action and made progress quickly" },
    ],
  },
  {
    id: "q10",
    prompt: "What kind of support helps you most?",
    options: [
      { value: "Gold", label: "Clear expectations and consistent accountability" },
      { value: "Blue", label: "Encouragement, affirmation, and relationship support" },
      { value: "Green", label: "Space to think with rational feedback" },
      { value: "Orange", label: "Direct coaching with practical next steps" },
    ],
  },
];

const COLOR_INSIGHT_TEMPLATES: Record<ColorType, { summary: string; supports: string }> = {
  Gold: {
    summary: "Gold traits suggest responsibility, loyalty, and preference for structure.",
    supports: "Use clear routines, explicit expectations, and recognition for reliability.",
  },
  Blue: {
    summary: "Blue traits suggest empathy, relationship-focus, and strong personal values.",
    supports: "Use relational check-ins, encouragement, and collaborative goal setting.",
  },
  Green: {
    summary: "Green traits suggest analytical thinking, independence, and problem solving.",
    supports: "Use logic-based explanations, autonomy, and structured reflection time.",
  },
  Orange: {
    summary: "Orange traits suggest adaptability, action-orientation, and practical learning.",
    supports: "Use hands-on activities, short milestones, and immediate feedback loops.",
  },
};

interface ColorAssessmentProps {
  selectedYouth?: Youth;
  onSaved?: () => void;
}

export const ColorAssessment = ({ selectedYouth, onSaved }: ColorAssessmentProps) => {
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [secondaryColor, setSecondaryColor] = useState<string>("");
  const [insights, setInsights] = useState("");
  const [comments, setComments] = useState("");
  const [observations, setObservations] = useState("");
  const [questionResponses, setQuestionResponses] = useState<Record<string, ColorType | "">>(() =>
    Object.fromEntries(COLOR_ASSESSMENT_QUESTIONS.map((q) => [q.id, ""]))
  );
  const [completedByType, setCompletedByType] = useState<'staff' | 'youth'>('staff');
  const [completedBy, setCompletedBy] = useState("");
  const [youthSelection, setYouthSelection] = useState<'existing' | 'new'>('existing');
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [newYouthName, setNewYouthName] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [assessments, setAssessments] = useState<ColorAssessmentRow[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const { toast } = useToast();
  const { user } = useAuth();
  const { youths, loadYouths, createYouth, updateYouth } = useYouth();
  const userId = (user as any)?.uid || (user as any)?.id || null;
  const answeredCount = Object.values(questionResponses).filter(Boolean).length;
  const allQuestionsAnswered = answeredCount === COLOR_ASSESSMENT_QUESTIONS.length;

  useEffect(() => {
    loadYouths();
    if (selectedYouth) {
      setSelectedYouthId(selectedYouth.id);
      setYouthSelection('existing');
    }

    // Load draft data on component mount
    loadDraft();
  }, [selectedYouth, loadYouths]);

  useEffect(() => {
    const loadLatestAssessment = async () => {
      const youthId = selectedYouth?.id || selectedYouthId;
      if (!youthId) return;

      try {
        const latest = await realColorsAssessmentsService.getLatestByYouthId(youthId);
        if (!latest) return;
        setPrimaryColor(latest.primary_color || "");
        setSecondaryColor(latest.secondary_color || "");
        setInsights(latest.insights || "");
        setComments(latest.comments || "");
        setObservations(latest.observations || "");
        setCompletedByType(latest.completed_by_type || "staff");
        setCompletedBy(latest.completed_by_name || "");
        setEditingAssessmentId(latest.id);
        setLastSavedAt(latest.updated_at || latest.created_at || "");
      } catch (error) {
        console.warn("Failed to load latest color assessment:", error);
      }
    };

    void loadLatestAssessment();
  }, [selectedYouth?.id, selectedYouthId]);

  useEffect(() => {
    const youthId = selectedYouth?.id || selectedYouthId;
    if (!youthId) return;

    const loadHistory = async () => {
      setIsLoadingAssessments(true);
      try {
        const rows = await realColorsAssessmentsService.getByYouthId(youthId, 20);
        setAssessments(rows);
      } catch (error) {
        console.warn("Failed to load color assessment history:", error);
      } finally {
        setIsLoadingAssessments(false);
      }
    };

    void loadHistory();
  }, [selectedYouth?.id, selectedYouthId]);

  useEffect(() => {
    if (completedBy.trim()) return;
    const display = (user as any)?.displayName || (user as any)?.email || "";
    if (display) setCompletedBy(display);
  }, [user, completedBy]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const resetForm = () => {
    setPrimaryColor("");
    setSecondaryColor("");
    setInsights("");
    setComments("");
    setObservations("");
    setQuestionResponses(Object.fromEntries(COLOR_ASSESSMENT_QUESTIONS.map((q) => [q.id, ""])));
    setCompletedByType("staff");
    setCompletedBy("");
    setNewYouthName("");
    setEditingAssessmentId(null);
    setLastSavedAt("");
    setHasUnsavedChanges(false);

    // Clear draft from localStorage
    clearDraft();
  };

  const calculateResultsFromResponses = (responses: Record<string, ColorType | "">) => {
    const scores: Record<ColorType, number> = { Gold: 0, Blue: 0, Green: 0, Orange: 0 };
    Object.values(responses).forEach((value) => {
      if (value) scores[value] += 1;
    });
    const ranked = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]) as [ColorType, number][];
    const primary = ranked[0][1] > 0 ? ranked[0][0] : "";
    const secondary = ranked[1][1] > 0 ? ranked[1][0] : "";
    return { scores, primary, secondary };
  };

  const buildInsightsText = (
    primary: ColorType,
    secondary: ColorType | "",
    scores: Record<ColorType, number>
  ) => {
    const primaryTemplate = COLOR_INSIGHT_TEMPLATES[primary];
    const secondaryTemplate = secondary ? COLOR_INSIGHT_TEMPLATES[secondary] : null;
    const scoreLine = `Score breakdown: Gold ${scores.Gold}, Blue ${scores.Blue}, Green ${scores.Green}, Orange ${scores.Orange}.`;
    const secondaryLine = secondary
      ? `Secondary color influence: ${secondary}. ${secondaryTemplate?.summary || ""}`
      : "Secondary color influence: Not strongly expressed.";

    return [
      `Primary color identified: ${primary}. ${primaryTemplate.summary}`,
      secondaryLine,
      `Recommended support approach: ${primaryTemplate.supports}`,
      scoreLine,
    ].join("\n\n");
  };

  const applyCalculatedResults = () => {
    if (!allQuestionsAnswered) {
      toast({
        title: "Incomplete Assessment",
        description: `Please answer all ${COLOR_ASSESSMENT_QUESTIONS.length} questions.`,
        variant: "destructive",
      });
      return null;
    }

    const { scores, primary, secondary } = calculateResultsFromResponses(questionResponses);
    if (!primary) {
      toast({
        title: "Unable to Calculate",
        description: "Please review responses and try again.",
        variant: "destructive",
      });
      return null;
    }

    const generatedInsights = buildInsightsText(primary as ColorType, secondary as ColorType | "", scores);
    setPrimaryColor(primary);
    setSecondaryColor(secondary || "");
    setInsights(generatedInsights);
    setHasUnsavedChanges(true);
    return { primary, secondary, generatedInsights };
  };

  // Auto-save functionality
  const triggerAutoSave = () => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    // Set new timer for 10 seconds after user stops typing
    const timer = setTimeout(() => {
      autoSave();
    }, 10000);

    setAutoSaveTimer(timer);
  };

  const autoSave = async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;

    // Don't auto-save if required fields are empty
    if (!primaryColor) return;

    try {
      setIsAutoSaving(true);

      // Save to localStorage as draft
      const draftData = {
        questionResponses,
        primaryColor,
        secondaryColor,
        insights,
        comments,
        observations,
        completedByType,
        completedBy,
        youthSelection,
        selectedYouthId,
        newYouthName,
        timestamp: Date.now()
      };

      const draftKey = getDraftKey();
      try { await draftsService.save(selectedYouth?.id || selectedYouthId || null, 'real_colors_assessment', userId, draftData) } catch {}
      localStorage.setItem(draftKey, JSON.stringify(draftData));

      setHasUnsavedChanges(false);

      // Show subtle success indicator
      toast({
        title: "Draft auto-saved",
        description: "Your progress has been saved",
        duration: 2000
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      toast({
        title: "Auto-save Failed",
        description: error instanceof Error ? error.message : "Failed to save assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoSaving(false);
    }
  };

  const getDraftKey = () => {
    const youthId = selectedYouth?.id || selectedYouthId || 'new';
    return `real-colors-draft-${youthId}`;
  };

  const loadDraft = async () => {
    try {
      try {
        const remote = await draftsService.get(selectedYouth?.id || selectedYouthId || null, 'real_colors_assessment', userId)
        if (remote?.data) {
          const parsed: any = remote.data
          setQuestionResponses(parsed.questionResponses || Object.fromEntries(COLOR_ASSESSMENT_QUESTIONS.map((q) => [q.id, ""])));
          setPrimaryColor(parsed.primaryColor || "");
          setSecondaryColor(parsed.secondaryColor || "");
          setInsights(parsed.insights || "");
          setComments(parsed.comments || "");
          setObservations(parsed.observations || "");
          setCompletedByType(parsed.completedByType || "staff");
          setCompletedBy(parsed.completedBy || "");
          if (!selectedYouth) {
            setYouthSelection(parsed.youthSelection || 'existing');
            setSelectedYouthId(parsed.selectedYouthId || "");
            setNewYouthName(parsed.newYouthName || "");
          }
          setHasUnsavedChanges(true);
          return;
        }
      } catch {}
      const draftKey = getDraftKey();
      const draftData = localStorage.getItem(draftKey);

      if (draftData) {
        const parsed = JSON.parse(draftData);

        // Only load draft if it's less than 24 hours old
        const dayInMs = 24 * 60 * 60 * 1000;
        if (parsed.timestamp && (Date.now() - parsed.timestamp < dayInMs)) {
          setPrimaryColor(parsed.primaryColor || "");
          setQuestionResponses(parsed.questionResponses || Object.fromEntries(COLOR_ASSESSMENT_QUESTIONS.map((q) => [q.id, ""])));
          setSecondaryColor(parsed.secondaryColor || "");
          setInsights(parsed.insights || "");
          setComments(parsed.comments || "");
          setObservations(parsed.observations || "");
          setCompletedByType(parsed.completedByType || "staff");
          setCompletedBy(parsed.completedBy || "");

          if (!selectedYouth) {
            setYouthSelection(parsed.youthSelection || 'existing');
            setSelectedYouthId(parsed.selectedYouthId || "");
            setNewYouthName(parsed.newYouthName || "");
          }

          setHasUnsavedChanges(true);

          toast({
            title: "Draft loaded",
            description: "Your previous work has been restored",
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  };

  const clearDraft = () => {
    const draftKey = getDraftKey();
    try { void draftsService.delete(selectedYouth?.id || selectedYouthId || null, 'real_colors_assessment', userId) } catch {}
    localStorage.removeItem(draftKey);
  };

  // Form change handlers that trigger autosave
  const handleFormChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const handleQuestionResponseChange = (questionId: string, value: ColorType) => {
    setQuestionResponses((prev) => ({ ...prev, [questionId]: value }));
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const handlePrintAssessment = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    try {
      const { exportHTMLToPDF } = await import('@/utils/export');

      // Use selectedYouth if provided, otherwise use form selection
      let currentYouth;
      if (selectedYouth) {
        currentYouth = selectedYouth;
      } else if (youthSelection === 'existing') {
        currentYouth = youths.find(y => y.id === selectedYouthId);
      } else {
        currentYouth = { firstName: newYouthName.split(' ')[0], lastName: newYouthName.split(' ').slice(1).join(' ') };
      }

      if (!currentYouth) {
        toast({
          title: "Error",
          description: "Please select a youth before exporting",
          variant: "destructive"
        });
        return;
      }

      const exportData = {
        youth: currentYouth,
        assessment: {
          primaryColor,
          secondaryColor,
          insights,
          comments,
          observations,
          completedBy,
          assessmentDate: new Date().toLocaleDateString()
        },
        exportDate: new Date().toLocaleDateString()
      };

      const html = generateRealColorsHTML(exportData);
      const filename = `${buildReportFilename(currentYouth, "Color Assessment")}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast({
        title: "Success",
        description: "Color assessment exported successfully!"
      });
    } catch (error) {
      console.error("Error exporting color assessment:", error);
      toast({
        title: "Error",
        description: "Failed to export color assessment",
        variant: "destructive"
      });
    }
  };

  const generateRealColorsHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Color Assessment Report - Heartland Boys Home</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #b91c1c;
              padding-bottom: 20px;
              background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #d97706 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
            }
            .logo { height: 60px; margin-bottom: 15px; }
            .youth-info { background-color: #fef2f2; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #dc2626; }
            .color-section { margin-bottom: 30px; padding: 20px; border: 2px solid #ddd; border-radius: 5px; }
            .color-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; }
            .gold { border-color: #f59e0b; background-color: #fffbeb; }
            .blue { border-color: #3b82f6; background-color: #eff6ff; }
            .green { border-color: #10b981; background-color: #ecfdf5; }
            .orange { border-color: #f97316; background-color: #fff7ed; }
            .traits { display: flex; flex-wrap: wrap; gap: 5px; margin: 10px 0; }
            .trait { background-color: #e5e7eb; padding: 3px 8px; border-radius: 12px; font-size: 12px; }
            .field { margin-bottom: 15px; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-top: 5px; }
            .characteristics { margin-top: 15px; }
            .characteristic { margin-bottom: 8px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${import.meta.env.BASE_URL}files/BoysHomeLogo.png" alt="Heartland Boys Home Logo" class="logo" crossorigin="anonymous" />
            <h1>Heartland Boys Home</h1>
            <h2>Color Assessment Report</h2>
            <p>Generated on ${data.exportDate}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${data.youth.firstName} ${data.youth.lastName}</p>
            <p><strong>Assessment Date:</strong> ${data.assessment.assessmentDate}</p>
            <p><strong>Completed By:</strong> ${data.assessment.completedBy}</p>
          </div>

          <div class="color-section">
            <div class="color-title">Assessment Result</div>
            <div class="field"><div class="field-label">Primary Color:</div><div class="field-value">${data.assessment.primaryColor || "Not set"}</div></div>
            <div class="field"><div class="field-label">Secondary Color:</div><div class="field-value">${data.assessment.secondaryColor || "Not set"}</div></div>
          </div>

          ${data.assessment.insights ? `
            <div class="field">
              <div class="field-label">Assessment Insights:</div>
              <div class="field-value">${data.assessment.insights}</div>
            </div>
          ` : ''}

          ${data.assessment.comments ? `
            <div class="field">
              <div class="field-label">Comments:</div>
              <div class="field-value">${data.assessment.comments}</div>
            </div>
          ` : ''}

          ${data.assessment.observations ? `
            <div class="field">
              <div class="field-label">Observations:</div>
              <div class="field-value">${data.assessment.observations}</div>
            </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  const handleSubmit = async () => {
    const calculated = applyCalculatedResults();
    if (!calculated) {
      toast({
        title: "Validation Error",
        description: "Complete the assessment questions to generate results.",
        variant: "destructive",
      });
      return;
    }

    // Only validate youth selection if no selectedYouth is provided
    if (!selectedYouth) {
      if (youthSelection === 'existing' && !selectedYouthId) {
        toast({
          title: "Validation Error", 
          description: "Please select a youth",
          variant: "destructive",
        });
        return;
      }

      if (youthSelection === 'new' && !newYouthName.trim()) {
        toast({
          title: "Validation Error",
          description: "Please enter youth name for new assessment",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      let youthId: string;

      // Use selectedYouth if provided, otherwise use the form selection
      if (selectedYouth) {
        youthId = selectedYouth.id;
      } else if (youthSelection === 'existing') {
        youthId = selectedYouthId;
      } else {
        // Create new youth
        const [firstName, ...lastNameParts] = newYouthName.trim().split(' ');
        const lastName = lastNameParts.join(' ');

        const newYouth = {
          firstName,
          lastName: lastName || '',
          age: 0,
          level: 0,
          pointTotal: 0,
        };

        const createdYouth = await createYouth(newYouth);
        youthId = createdYouth.id;
        await loadYouths(); // Refresh the list
      }

      const resolvedPrimary = calculated.primary;
      const resolvedSecondary = calculated.secondary;
      const resolvedInsights = calculated.generatedInsights;

      // Keep compatibility field on youth record
      const realColorsResult = resolvedSecondary && resolvedSecondary !== 'none'
        ? `${resolvedPrimary}/${resolvedSecondary}`
        : resolvedPrimary;
      
      // Save result string on youth (updatedAt handled by hook/service)
      await updateYouth(youthId, {
        realColorsResult: realColorsResult
      });

      const savedAssessment = await realColorsAssessmentsService.save({
        id: editingAssessmentId || undefined,
        youth_id: youthId,
        primary_color: resolvedPrimary as "Gold" | "Blue" | "Green" | "Orange",
        secondary_color: resolvedSecondary === 'none' ? null : (resolvedSecondary as "Gold" | "Blue" | "Green" | "Orange" | null),
        real_colors_result: realColorsResult,
        insights: resolvedInsights || null,
        comments: comments || null,
        observations: observations || null,
        completed_by_type: completedByType,
        completed_by_name: completedBy || null,
      });

      setEditingAssessmentId(savedAssessment.id);
      setLastSavedAt(savedAssessment.updated_at || savedAssessment.created_at || "");
      setHasUnsavedChanges(false);
      clearDraft();

      try {
        const rows = await realColorsAssessmentsService.getByYouthId(youthId, 20);
        setAssessments(rows);
      } catch {}

      toast({
        title: "Success",
        description: "Assessment completed and saved. Results and insights are now available below.",
      });
      onSaved?.();

    } catch (error) {
      console.error('Error saving color assessment:', error);
      
      // Enhanced error logging for debugging
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as any;
        console.error('Detailed color assessment save error:', {
          message: supabaseError.message,
          details: supabaseError.details,
          hint: supabaseError.hint,
          code: supabaseError.code,
          selectedYouthId: selectedYouth?.id || selectedYouthId,
          primaryColor,
          secondaryColor,
          timestamp: new Date().toISOString()
        });
      }
      
      toast({
        title: "Error",
        description: `Failed to save color assessment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAssessmentForEditing = (assessment: ColorAssessmentRow) => {
    setQuestionResponses(Object.fromEntries(COLOR_ASSESSMENT_QUESTIONS.map((q) => [q.id, ""])));
    setPrimaryColor(assessment.primary_color || "");
    setSecondaryColor(assessment.secondary_color || "");
    setInsights(assessment.insights || "");
    setComments(assessment.comments || "");
    setObservations(assessment.observations || "");
    setCompletedByType(assessment.completed_by_type || "staff");
    setCompletedBy(assessment.completed_by_name || "");
    setEditingAssessmentId(assessment.id);
    setLastSavedAt(assessment.updated_at || assessment.created_at || "");
    setHasUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Youth Selection - Only show when no selectedYouth is provided */}
          {!selectedYouth && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Youth Selection</Label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={youthSelection === 'existing'}
                    onChange={() => handleFormChange(setYouthSelection, 'existing')}
                    className="form-radio"
                  />
                  <span>Existing Youth</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    checked={youthSelection === 'new'}
                    onChange={() => handleFormChange(setYouthSelection, 'new')}
                    className="form-radio"
                  />
                  <span>New Youth</span>
                </label>
              </div>

              {youthSelection === 'existing' ? (
                <Select value={selectedYouthId} onValueChange={(value) => handleFormChange(setSelectedYouthId, value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a youth" />
                  </SelectTrigger>
                  <SelectContent>
                    {youths.map((youth) => (
                      <SelectItem key={youth.id} value={youth.id}>
                        {youth.firstName} {youth.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter youth name"
                  value={newYouthName}
                  onChange={(e) => handleFormChange(setNewYouthName, e.target.value)}
                />
              )}
            </div>
          )}

          {/* Show current youth info when selectedYouth is provided */}
          {selectedYouth && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">Assessment for: {selectedYouth.firstName} {selectedYouth.lastName}</span>
              </div>
              {lastSavedAt && (
                <p className="text-xs text-blue-700">Last saved: {new Date(lastSavedAt).toLocaleString()}</p>
              )}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-900">Saved assessments</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={resetForm}
                    className="h-8 border-blue-300 text-blue-800 hover:bg-blue-100"
                  >
                    New Assessment
                  </Button>
                </div>
                {isLoadingAssessments ? (
                  <p className="text-xs text-blue-700">Loading assessments...</p>
                ) : assessments.length === 0 ? (
                  <p className="text-xs text-blue-700">No previous assessments saved for this youth yet.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-auto pr-1">
                    {assessments.map((assessment) => (
                      <button
                        key={assessment.id}
                        type="button"
                        onClick={() => loadAssessmentForEditing(assessment)}
                        className={`w-full text-left text-xs rounded-md border px-3 py-2 transition-colors ${
                          editingAssessmentId === assessment.id
                            ? "border-blue-400 bg-blue-100 text-blue-900"
                            : "border-blue-200 bg-white text-blue-800 hover:bg-blue-50"
                        }`}
                      >
                        <span className="font-semibold">{assessment.real_colors_result}</span>
                        <span className="ml-2 opacity-80">
                          {new Date(assessment.created_at).toLocaleDateString()}
                        </span>
                        {assessment.completed_by_name ? (
                          <span className="ml-2 opacity-70">by {assessment.completed_by_name}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Questionnaire */}
          <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Personality Assessment Questions</p>
                <p className="text-sm text-gray-600">
                  Answer all questions to calculate primary and secondary colors.
                </p>
              </div>
              <div className="text-sm font-medium text-gray-700">
                {answeredCount}/{COLOR_ASSESSMENT_QUESTIONS.length} answered
              </div>
            </div>

            <div className="space-y-3">
              {COLOR_ASSESSMENT_QUESTIONS.map((question, index) => (
                <div key={question.id} className="rounded-md border bg-white p-3 space-y-2">
                  <Label className="text-sm font-medium">
                    {index + 1}. {question.prompt}
                  </Label>
                  <Select
                    value={questionResponses[question.id] || ""}
                    onValueChange={(value) => handleQuestionResponseChange(question.id, value as ColorType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose the option that best fits" />
                    </SelectTrigger>
                    <SelectContent>
                      {question.options.map((opt) => (
                        <SelectItem key={`${question.id}-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={applyCalculatedResults}
              disabled={!allQuestionsAnswered}
            >
              Generate Results & Insights
            </Button>
          </div>

          {(primaryColor || insights) && (
            <div className="border rounded-lg p-4 bg-emerald-50/40 border-emerald-200 space-y-2">
              <p className="font-semibold text-emerald-900">Assessment Results</p>
              <p className="text-sm text-emerald-900">
                Primary: <span className="font-semibold">{primaryColor || "Not calculated"}</span>
                {"  |  "}
                Secondary: <span className="font-semibold">{secondaryColor || "Not calculated"}</span>
              </p>
            </div>
          )}

          {/* Primary Color */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Primary Color *</Label>
            <Select value={primaryColor} onValueChange={(value) => handleFormChange(setPrimaryColor, value)} disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select primary color" />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((color) => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        color === 'Gold' ? 'bg-yellow-400' :
                        color === 'Blue' ? 'bg-blue-400' :
                        color === 'Green' ? 'bg-green-400' : 'bg-orange-400'
                      }`} />
                      {color}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Secondary Color */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Secondary Color</Label>
            <Select value={secondaryColor} onValueChange={(value) => handleFormChange(setSecondaryColor, value)} disabled>
              <SelectTrigger>
                <SelectValue placeholder="Select secondary color (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {COLOR_OPTIONS
                  .filter(color => color !== primaryColor)
                  .map((color) => (
                  <SelectItem key={color} value={color}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${
                        color === 'Gold' ? 'bg-yellow-400' :
                        color === 'Blue' ? 'bg-blue-400' :
                        color === 'Green' ? 'bg-green-400' : 'bg-orange-400'
                      }`} />
                      {color}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assessment Details */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="insights">Insights</Label>
              <Textarea
                id="insights"
                placeholder="Key insights from the assessment..."
                value={insights}
                onChange={(e) => handleFormChange(setInsights, e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Additional comments..."
                value={comments}
                onChange={(e) => handleFormChange(setComments, e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observations">Observations</Label>
              <Textarea
                id="observations"
                placeholder="Behavioral observations during assessment..."
                value={observations}
                onChange={(e) => handleFormChange(setObservations, e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completedBy">Completed By</Label>
              <Input
                id="completedBy"
                placeholder={completedByType === "youth" ? "Youth name" : "Staff member name"}
                value={completedBy}
                onChange={(e) => handleFormChange(setCompletedBy, e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="completedByType">Completed By Type</Label>
              <Select value={completedByType} onValueChange={(value) => handleFormChange(setCompletedByType, value as 'staff' | 'youth')}>
                <SelectTrigger id="completedByType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="youth">Youth</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-save status */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
              {isAutoSaving ? (
                <>
                  <div className="animate-spin h-3 w-3 border border-amber-600 border-t-transparent rounded-full" />
                  <span>Auto-saving...</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 bg-amber-500 rounded-full" />
                  <span>Unsaved changes (auto-saves in 10 seconds)</span>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={handlePrintAssessment}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPdf}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Assessment'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
