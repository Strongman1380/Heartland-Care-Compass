import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Youth } from '@/integrations/firebase/services';
import { useYouth } from "@/hooks/useSupabase";
import { User, Palette, FileText, Save, Download, Printer } from 'lucide-react';
import { draftsService } from '@/integrations/firebase/draftsService';
import { useAuth } from '@/contexts/AuthContext';
import { buildReportFilename } from '@/utils/reportFilenames';

const COLOR_PROFILES = {
  Gold: {
    description: "I am stable and dependable by nature. I can stick to detailed tasks and see them through. Because of this, I am the person others come to when they need a job done. I am highly responsible and believe that work comes before play. I am neat, orderly and well organized. I follow rules and procedures and have a deep respect for regulations and authority. I am not comfortable in unstructured situations. I am loyal and faithful in my relationships.",
    traits: ["dependable", "organized", "thorough", "sensible", "punctual", "caring", "loyal", "natural preserver", "parent", "helper"],
    characteristics: {
      "Esteemed for": "Being dependable",
      "Stressed by": "Lack of order", 
      "Highest virtue is": "Responsibility",
      "On the job": "Organizer",
      "Primary needs": "To provide stability and order; to be in control",
      "Seek for": "Security",
      "Take pride in": "Dependability"
    }
  },
  Blue: {
    description: "I am nurturing by nature. I have a vivid imagination and love to talk with others about the way I feel and to learn about their feelings. I will do almost anything to avoid conflict or a confrontation. I am drawn to the helping professions where I feel I can have a greater influence on others and help them discover ways to live more significant lives. I am a true romantic. I value integrity and unity in relationships.",
    traits: ["sympathetic", "communicative", "compassionate", "idealistic", "sincere", "imaginative"],
    characteristics: {
      "Esteemed for": "Being a good listener",
      "Stressed by": "Feeling artificial",
      "Highest virtue is": "Loyalty", 
      "On the job": "Peacemaker",
      "Primary needs": "To be authentic and care for others",
      "Seek for": "Love and acceptance",
      "Take pride in": "Empathy"
    }
  },
  Green: {
    description: "I am non-conforming by nature. I think in abstract terms and I am always curious. I take time to analyze things. I am independent and because of this people often think that I am impersonal. The truth is that I am more comfortable with things than people. I question authority and have to respect someone before I value their advice. I am impatient with routines. I can get hooked on acquiring and storing knowledge. I am a natural non-conformist, and visionary.",
    traits: ["perfectionistic", "analytical", "conceptual", "cool", "calm", "inventive", "logical"],
    characteristics: {
      "Esteemed for": "Discovering new insights",
      "Stressed by": "Feeling inadequate",
      "Highest virtue is": "Objectivity",
      "On the job": "Pragmatist", 
      "Primary needs": "To be competent and rational",
      "Seek for": "Insight and knowledge",
      "Take pride in": "Competence"
    }
  },
  Orange: {
    description: "I am fun-loving by nature. I have lots of energy to try new and exciting things. I am easily bored and grow restless with routine and structured jobs or activities. I need the freedom to go and do what I want. I have a hard time following rules and regulations or respecting authority. I learn by and through my experiences. I constantly look for excitement. I act on a moment's notice and value skill, resourcefulness, and courage.",
    traits: ["witty", "spontaneous", "generous", "optimistic", "eager", "bold"],
    characteristics: {
      "Esteemed for": "Being fun; taking risks",
      "Stressed by": "Restrictions",
      "Highest virtue is": "Courage",
      "On the job": "Energizer",
      "Primary needs": "To be free and spontaneous", 
      "Seek for": "Freedom",
      "Take pride in": "Impact"
    }
  }
};

const COLOR_VARIANTS = {
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Blue: "bg-blue-100 text-blue-800 border-blue-300", 
  Green: "bg-green-100 text-green-800 border-green-300",
  Orange: "bg-orange-100 text-orange-800 border-orange-300"
};

interface RealColorsAssessmentProps {
  selectedYouth?: Youth;
}

export const RealColorsAssessment = ({ selectedYouth }: RealColorsAssessmentProps) => {
  const [primaryColor, setPrimaryColor] = useState<string>("");
  const [secondaryColor, setSecondaryColor] = useState<string>("");
  const [insights, setInsights] = useState("");
  const [comments, setComments] = useState("");
  const [observations, setObservations] = useState("");
  const [isScreening, setIsScreening] = useState(false);
  const [completedBy, setCompletedBy] = useState("");
  const [youthSelection, setYouthSelection] = useState<'existing' | 'new'>('existing');
  const [selectedYouthId, setSelectedYouthId] = useState<string>("");
  const [newYouthName, setNewYouthName] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { youths, loadYouths, createYouth, updateYouth } = useYouth();

  useEffect(() => {
    loadYouths();
    if (selectedYouth) {
      setSelectedYouthId(selectedYouth.id);
      setYouthSelection('existing');
    }

    // Load draft data on component mount
    loadDraft();
  }, [selectedYouth, loadYouths]);

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
    setIsScreening(false);
    setCompletedBy("");
    setNewYouthName("");
    setHasUnsavedChanges(false);

    // Clear draft from localStorage
    clearDraft();
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
        primaryColor,
        secondaryColor,
        insights,
        comments,
        observations,
        isScreening,
        completedBy,
        youthSelection,
        selectedYouthId,
        newYouthName,
        timestamp: Date.now()
      };

      const draftKey = getDraftKey();
      try { await draftsService.save(selectedYouth?.id || selectedYouthId || null, 'real_colors_assessment', (user as any)?.id || null, draftData) } catch {}
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
        const remote = await draftsService.get(selectedYouth?.id || selectedYouthId || null, 'real_colors_assessment', (user as any)?.id || null)
        if (remote?.data) {
          const parsed: any = remote.data
          setPrimaryColor(parsed.primaryColor || "");
          setSecondaryColor(parsed.secondaryColor || "");
          setInsights(parsed.insights || "");
          setComments(parsed.comments || "");
          setObservations(parsed.observations || "");
          setIsScreening(parsed.isScreening || false);
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
          setSecondaryColor(parsed.secondaryColor || "");
          setInsights(parsed.insights || "");
          setComments(parsed.comments || "");
          setObservations(parsed.observations || "");
          setIsScreening(parsed.isScreening || false);
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
    try { void draftsService.delete(selectedYouth?.id || selectedYouthId || null, 'real_colors_assessment', (user as any)?.id || null) } catch {}
    localStorage.removeItem(draftKey);
  };

  // Form change handlers that trigger autosave
  const handleFormChange = (setter: (value: any) => void, value: any) => {
    setter(value);
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
      const filename = `${buildReportFilename(currentYouth, "Real Colors Assessment")}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast({
        title: "Success",
        description: "Real Colors assessment exported successfully!"
      });
    } catch (error) {
      console.error("Error exporting Real Colors assessment:", error);
      toast({
        title: "Error",
        description: "Failed to export Real Colors assessment",
        variant: "destructive"
      });
    }
  };

  const generateRealColorsHTML = (data: any) => {
    const primaryProfile = data.assessment.primaryColor ? COLOR_PROFILES[data.assessment.primaryColor as keyof typeof COLOR_PROFILES] : null;
    const secondaryProfile = data.assessment.secondaryColor ? COLOR_PROFILES[data.assessment.secondaryColor as keyof typeof COLOR_PROFILES] : null;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Real Colors Assessment Report - Heartland Boys Home</title>
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
            <h2>Real Colors Assessment Report</h2>
            <p>Generated on ${data.exportDate}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${data.youth.firstName} ${data.youth.lastName}</p>
            <p><strong>Assessment Date:</strong> ${data.assessment.assessmentDate}</p>
            <p><strong>Completed By:</strong> ${data.assessment.completedBy}</p>
          </div>

          ${primaryProfile ? `
            <div class="color-section ${data.assessment.primaryColor.toLowerCase()}">
              <div class="color-title">Primary Color: ${data.assessment.primaryColor}</div>
              <div class="field">
                <div class="field-label">Description:</div>
                <div class="field-value">${primaryProfile.description}</div>
              </div>
              <div class="field">
                <div class="field-label">Key Traits:</div>
                <div class="traits">
                  ${primaryProfile.traits.map((trait: string) => `<span class="trait">${trait}</span>`).join('')}
                </div>
              </div>
              <div class="characteristics">
                <div class="field-label">Characteristics:</div>
                ${Object.entries(primaryProfile.characteristics).map(([key, value]) => `
                  <div class="characteristic"><strong>${key}:</strong> ${value}</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${secondaryProfile ? `
            <div class="color-section ${data.assessment.secondaryColor.toLowerCase()}">
              <div class="color-title">Secondary Color: ${data.assessment.secondaryColor}</div>
              <div class="field">
                <div class="field-label">Description:</div>
                <div class="field-value">${secondaryProfile.description}</div>
              </div>
              <div class="field">
                <div class="field-label">Key Traits:</div>
                <div class="traits">
                  ${secondaryProfile.traits.map((trait: string) => `<span class="trait">${trait}</span>`).join('')}
                </div>
              </div>
              <div class="characteristics">
                <div class="field-label">Characteristics:</div>
                ${Object.entries(secondaryProfile.characteristics).map(([key, value]) => `
                  <div class="characteristic"><strong>${key}:</strong> ${value}</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

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
    if (!primaryColor) {
      toast({
        title: "Validation Error",
        description: "Primary color is required",
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

      // Save Real Colors result to youth record
      const realColorsResult = secondaryColor && secondaryColor !== 'none' 
        ? `${primaryColor}/${secondaryColor}`
        : primaryColor;
      
      // Save Real Colors result (updatedAt will be handled by database trigger)
      await updateYouth(youthId, {
        realColorsResult: realColorsResult
      });

      console.log('Saved Real Colors assessment:', {
        youth_id: youthId,
        primary_color: primaryColor,
        secondary_color: secondaryColor === 'none' ? null : secondaryColor || null,
        real_colors_result: realColorsResult,
        insights: insights || null,
        comments: comments || null,
        observations: observations || null,
        is_screening: isScreening,
        completed_by: completedBy || null,
      });

      toast({
        title: "Success",
        description: "Real Colors assessment saved successfully",
      });

      resetForm();
      clearDraft();

    } catch (error) {
      console.error('Error saving Real Colors assessment:', error);
      
      // Enhanced error logging for debugging
      if (error && typeof error === 'object' && 'message' in error) {
        const supabaseError = error as any;
        console.error('Detailed Real Colors save error:', {
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
        description: `Failed to save Real Colors assessment: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedColorProfile = primaryColor ? COLOR_PROFILES[primaryColor as keyof typeof COLOR_PROFILES] : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Real Colors Personality Assessment
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <User className="h-4 w-4" />
                <span className="font-medium">Assessment for: {selectedYouth.firstName} {selectedYouth.lastName}</span>
              </div>
            </div>
          )}

          {/* Assessment Type */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="screening"
              checked={isScreening}
              onCheckedChange={(checked) => handleFormChange(setIsScreening, checked === true)}
            />
            <Label htmlFor="screening">Quick Screening (for follow-up assessments)</Label>
          </div>

          {/* Primary Color */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Primary Color *</Label>
            <Select value={primaryColor} onValueChange={(value) => handleFormChange(setPrimaryColor, value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary color" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(COLOR_PROFILES).map((color) => (
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
            <Select value={secondaryColor} onValueChange={(value) => handleFormChange(setSecondaryColor, value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select secondary color (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {Object.keys(COLOR_PROFILES)
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

          {/* Color Profile Display */}
          {selectedColorProfile && (
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={COLOR_VARIANTS[primaryColor as keyof typeof COLOR_VARIANTS]}>
                    {primaryColor}
                  </Badge>
                  Color Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description:</h4>
                  <p className="text-sm text-muted-foreground">{selectedColorProfile.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Key Traits:</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedColorProfile.traits.map((trait, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Characteristics:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedColorProfile.characteristics).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                placeholder="Staff member name"
                value={completedBy}
                onChange={(e) => handleFormChange(setCompletedBy, e.target.value)}
              />
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
