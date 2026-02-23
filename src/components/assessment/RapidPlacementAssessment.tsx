import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer, Save, Calculator, FileText, ClipboardCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { draftsService } from '@/integrations/firebase/draftsService'
import { useAuth } from '@/contexts/AuthContext'
// Supabase removed - using local storage only
import { fetchAllYouths } from '@/utils/local-storage-utils';
import { Youth } from '@/types/app-types';
import QuickISPAssessment from './QuickISPAssessment';
import { RealColorsAssessment } from './RealColorsAssessment';

interface AssessmentData {
  youthName: string;
  dob: string;
  age: string;
  interviewer: string;
  date: string;
  referralSource: string;
  legalStatus: string;
  family: {
    caregiverStability: { score: number; notes: string };
    housingStability: { score: number; notes: string };
    familySupport: { score: number; notes: string };
    familySafety: { score: number; notes: string };
  };
  education: {
    academicPerformance: { score: number; notes: string };
    schoolAttendance: { score: number; notes: string };
    behavioralIssues: { score: number; notes: string };
  };
  behavioral: {
    impulseControl: { score: number; notes: string };
    angerManagement: { score: number; notes: string };
    authorityResponse: { score: number; notes: string };
    peerRelationships: { score: number; notes: string };
  };
  risk: {
    substanceUse: { score: number; notes: string };
    legalHistory: { score: number; notes: string };
    violenceAggression: { score: number; notes: string };
    riskTaking: { score: number; notes: string };
  };
  mentalHealth: {
    traumaHistory: { score: number; notes: string };
    depressionAnxiety: { score: number; notes: string };
    selfHarmRisk: { score: number; notes: string };
    sleepAppetite: { score: number; notes: string };
  };
  motivation: {
    programUnderstanding: { score: number; notes: string };
    changeMotivation: { score: number; notes: string };
    responsibilityTaking: { score: number; notes: string };
    futureGoals: { score: number; notes: string };
  };
  socialSkills: {
    followingInstructions: { score: number; notes: string };
    acceptingNo: { score: number; notes: string };
    acceptingCriticism: { score: number; notes: string };
    showingRespect: { score: number; notes: string };
  };
  personalityProfile: {
    group1: string;
    group2: string;
    group3: string;
    primaryType: string;
    staffApproach: string;
  };
  placementRecommendation: {
    decision: string;
    conditions: string;
    placementLevel: string;
    priorityTreatment: string[];
    safetyProtocols: string[];
    estimatedStay: string;
  };
}

const initialData: AssessmentData = {
  youthName: '',
  dob: '',
  age: '',
  interviewer: '',
  date: new Date().toISOString().split('T')[0],
  referralSource: '',
  legalStatus: '',
  family: {
    caregiverStability: { score: 0, notes: '' },
    housingStability: { score: 0, notes: '' },
    familySupport: { score: 0, notes: '' },
    familySafety: { score: 0, notes: '' },
  },
  education: {
    academicPerformance: { score: 0, notes: '' },
    schoolAttendance: { score: 0, notes: '' },
    behavioralIssues: { score: 0, notes: '' },
  },
  behavioral: {
    impulseControl: { score: 0, notes: '' },
    angerManagement: { score: 0, notes: '' },
    authorityResponse: { score: 0, notes: '' },
    peerRelationships: { score: 0, notes: '' },
  },
  risk: {
    substanceUse: { score: 0, notes: '' },
    legalHistory: { score: 0, notes: '' },
    violenceAggression: { score: 0, notes: '' },
    riskTaking: { score: 0, notes: '' },
  },
  mentalHealth: {
    traumaHistory: { score: 0, notes: '' },
    depressionAnxiety: { score: 0, notes: '' },
    selfHarmRisk: { score: 0, notes: '' },
    sleepAppetite: { score: 0, notes: '' },
  },
  motivation: {
    programUnderstanding: { score: 0, notes: '' },
    changeMotivation: { score: 0, notes: '' },
    responsibilityTaking: { score: 0, notes: '' },
    futureGoals: { score: 0, notes: '' },
  },
  socialSkills: {
    followingInstructions: { score: 0, notes: '' },
    acceptingNo: { score: 0, notes: '' },
    acceptingCriticism: { score: 0, notes: '' },
    showingRespect: { score: 0, notes: '' },
  },
  personalityProfile: {
    group1: '',
    group2: '',
    group3: '',
    primaryType: '',
    staffApproach: '',
  },
  placementRecommendation: {
    decision: '',
    conditions: '',
    placementLevel: '',
    priorityTreatment: [],
    safetyProtocols: [],
    estimatedStay: '',
  },
};

export const RapidPlacementAssessment = () => {
  const [assessmentType, setAssessmentType] = useState<string>('');
  const [youthSelection, setYouthSelection] = useState<string>('');
  const [selectedYouthId, setSelectedYouthId] = useState<string>('');
  const [youths, setYouths] = useState<any[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(initialData);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchYouths();
    // Load draft data on component mount
    loadDraft();
  }, []);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const fetchYouths = () => {
    try {
      const data = fetchAllYouths();
      setYouths(data || []);
    } catch (error) {
      console.error('Error fetching youths:', error);
      toast({
        title: "Error",
        description: "Failed to load youth data",
        variant: "destructive",
      });
    }
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

    // Don't auto-save if basic info is not filled
    if (!assessmentData.youthName.trim() || !showAssessment) return;

    try {
      setIsAutoSaving(true);

      // Save to localStorage as draft
      const draftData = {
        assessmentType,
        youthSelection,
        selectedYouthId,
        assessmentData,
        showAssessment,
        timestamp: Date.now()
      };

      const draftKey = getDraftKey();
      try { await draftsService.save(selectedYouthId || null, 'rapid_placement', (user as any)?.id || null, draftData) } catch {}
      localStorage.setItem(draftKey, JSON.stringify(draftData));

      setHasUnsavedChanges(false);

      // Show subtle success indicator
      toast({
        title: "Draft auto-saved",
        description: "Your assessment progress has been saved",
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
    return `rpat-assessment-draft-${selectedYouthId || 'new'}-${assessmentType}`;
  };

  const loadDraft = async () => {
    try {
      try {
        const remote = await draftsService.get(selectedYouthId || null, 'rapid_placement', (user as any)?.id || null)
        if (remote?.data) {
          const parsed: any = remote.data
          setAssessmentType(parsed.assessmentType || '');
          setYouthSelection(parsed.youthSelection || '');
          setSelectedYouthId(parsed.selectedYouthId || '');
          setAssessmentData(parsed.assessmentData || initialData);
          setShowAssessment(parsed.showAssessment || false);
          return
        }
      } catch {}
      const draftKey = getDraftKey();
      const draftData = localStorage.getItem(draftKey);

      if (draftData) {
        const parsed = JSON.parse(draftData);

        // Only load draft if it's less than 24 hours old
        const dayInMs = 24 * 60 * 60 * 1000;
        if (parsed.timestamp && (Date.now() - parsed.timestamp < dayInMs)) {
          setAssessmentType(parsed.assessmentType || '');
          setYouthSelection(parsed.youthSelection || '');
          setSelectedYouthId(parsed.selectedYouthId || '');
          setAssessmentData(parsed.assessmentData || initialData);
          setShowAssessment(parsed.showAssessment || false);
          setHasUnsavedChanges(true);

          toast({
            title: "Draft loaded",
            description: "Your previous assessment has been restored",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  };

  const clearDraft = () => {
    const draftKey = getDraftKey();
    try { void draftsService.delete(selectedYouthId || null, 'rapid_placement', (user as any)?.id || null) } catch {}
    localStorage.removeItem(draftKey);
  };

  const handleStartAssessment = () => {
    if (!assessmentType || !youthSelection) {
      toast({
        title: "Selection Required",
        description: "Please select both an assessment type and youth option",
        variant: "destructive",
      });
      return;
    }

    if (youthSelection === 'existing' && !selectedYouthId) {
      toast({
        title: "Youth Selection Required",
        description: "Please select a specific youth for the assessment",
        variant: "destructive",
      });
      return;
    }

    // Pre-populate youth data if existing youth selected
    if (youthSelection === 'existing' && selectedYouthId) {
      const selectedYouth = youths.find(y => y.id === selectedYouthId);
      if (selectedYouth) {
        setAssessmentData(prev => ({
          ...prev,
          youthName: `${selectedYouth.firstname} ${selectedYouth.lastname}`,
          age: selectedYouth.age?.toString() || '',
          dob: selectedYouth.dob ? new Date(selectedYouth.dob).toISOString().split('T')[0] : '',
        }));
      }
    }

    setShowAssessment(true);
  };

  const resetSelection = () => {
    setAssessmentType('');
    setYouthSelection('');
    setSelectedYouthId('');
    setShowAssessment(false);
    setAssessmentData(initialData);
  };

  const calculateSectionTotal = (section: Record<string, { score: number; notes: string }>) => {
    return Object.values(section).reduce((total: number, item) => {
      return total + (item.score || 0);
    }, 0);
  };

  const calculateTotalScore = () => {
    return calculateSectionTotal(assessmentData.family) +
           calculateSectionTotal(assessmentData.education) +
           calculateSectionTotal(assessmentData.behavioral) +
           calculateSectionTotal(assessmentData.risk) +
           calculateSectionTotal(assessmentData.mentalHealth) +
           calculateSectionTotal(assessmentData.motivation) +
           calculateSectionTotal(assessmentData.socialSkills);
  };

  const getRiskLevel = (percentage: number) => {
    if (percentage <= 25) return { level: 'LOW', color: 'bg-green-500' };
    if (percentage <= 50) return { level: 'MODERATE', color: 'bg-yellow-500' };
    if (percentage <= 75) return { level: 'HIGH', color: 'bg-orange-500' };
    return { level: 'CRITICAL', color: 'bg-red-500' };
  };

  const handleScoreChange = (section: string, field: string, value: number) => {
    setAssessmentData(prev => {
      const sectionData = prev[section as keyof AssessmentData] as Record<string, any>;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: {
            ...sectionData[field],
            score: value
          }
        }
      };
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const handleNotesChange = (section: string, field: string, notes: string) => {
    setAssessmentData(prev => {
      const sectionData = prev[section as keyof AssessmentData] as Record<string, any>;
      return {
        ...prev,
        [section]: {
          ...sectionData,
          [field]: {
            ...sectionData[field],
            notes
          }
        }
      };
    });
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  const handlePrint = () => {
    window.print();
    toast({
      title: "Print Dialog Opened",
      description: "Assessment ready for printing",
    });
  };

  const handleSave = () => {
    // Here you would typically save to database
    localStorage.setItem('rpat-assessment', JSON.stringify(assessmentData));
    setHasUnsavedChanges(false);
    clearDraft();
    toast({
      title: "Assessment Saved",
      description: "Assessment data has been saved successfully",
    });
  };

  const familyTotal = calculateSectionTotal(assessmentData.family);
  const educationTotal = calculateSectionTotal(assessmentData.education);
  const behavioralTotal = calculateSectionTotal(assessmentData.behavioral);
  const riskTotal = calculateSectionTotal(assessmentData.risk);
  const mentalHealthTotal = calculateSectionTotal(assessmentData.mentalHealth);
  const motivationTotal = calculateSectionTotal(assessmentData.motivation);
  const socialSkillsTotal = calculateSectionTotal(assessmentData.socialSkills);

  const totalScore = calculateTotalScore();
  const percentage = Math.round((totalScore / 108) * 100);
  const overallRisk = getRiskLevel(percentage);

  const ScoreInput = ({ value, onChange, max = 4 }: { value: number; onChange: (val: number) => void; max?: number }) => (
    <div className="flex gap-1">
      {Array.from({ length: max + 1 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className={`w-8 h-8 rounded border text-sm font-medium ${
            value === i 
              ? 'bg-red-600 text-white border-red-600' 
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          {i}
        </button>
      ))}
    </div>
  );

  const SectionCard = ({ 
    title, 
    keyQuestion, 
    fields, 
    section, 
    maxScore 
  }: { 
    title: string; 
    keyQuestion: string; 
    fields: Array<{ key: string; label: string }>; 
    section: string;
    maxScore: number;
  }) => {
    const sectionData = assessmentData[section as keyof AssessmentData] as Record<string, { score: number; notes: string }>;
    const sectionTotal = calculateSectionTotal(sectionData);
    const sectionPercentage = Math.round((sectionTotal / maxScore) * 100);
    const sectionRisk = getRiskLevel(sectionPercentage);

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{title}</span>
            <div className="flex items-center gap-2">
              <Badge className={`${sectionRisk.color} text-white`}>
                {sectionRisk.level} RISK
              </Badge>
              <span className="text-sm text-gray-600">{sectionTotal}/{maxScore}</span>
            </div>
          </CardTitle>
          <p className="text-sm text-gray-600 italic">{keyQuestion}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fields.map(field => (
              <div key={field.key} className="grid grid-cols-12 gap-4 items-center">
                <Label className="col-span-3 text-sm">{field.label}</Label>
                <div className="col-span-2">
                  <ScoreInput
                    value={(assessmentData[section as keyof AssessmentData] as any)[field.key].score}
                    onChange={(value) => handleScoreChange(section, field.key, value)}
                  />
                </div>
                <div className="col-span-7">
                  <Input
                    placeholder="Brief notes..."
                    value={(assessmentData[section as keyof AssessmentData] as any)[field.key].notes}
                    onChange={(e) => handleNotesChange(section, field.key, e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100 p-6 print:p-0 print:bg-white">
      <div className="max-w-4xl mx-auto">
        {!showAssessment ? (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-red-800 mb-2">
                Assessment Center
              </h1>
              <p className="text-red-600 text-lg">
                Select an assessment type and youth to begin
              </p>
            </div>

            <Card className="w-full max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Assessment Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="assessment-type">Select Assessment Type</Label>
                  <Select value={assessmentType} onValueChange={setAssessmentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an assessment..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rapid">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Rapid Placement Assessment Tool (RPAT)
                        </div>
                      </SelectItem>
                      <SelectItem value="isp">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Quick Individualized Service Plan (ISP)
                        </div>
                      </SelectItem>
                      <SelectItem value="realcolors">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Real Colors Personality Assessment
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="youth-selection">Youth Selection</Label>
                  <Select value={youthSelection} onValueChange={setYouthSelection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose youth option..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New Youth</SelectItem>
                      <SelectItem value="existing">Existing Youth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {youthSelection === 'existing' && (
                  <div>
                    <Label htmlFor="youth-select">Select Youth</Label>
                    <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a youth..." />
                      </SelectTrigger>
                      <SelectContent>
                        {youths.map((youth) => (
                          <SelectItem key={youth.id} value={youth.id}>
                            {youth.firstname} {youth.lastname} (Age {youth.age})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button 
                    onClick={handleStartAssessment} 
                    className="flex-1"
                    disabled={!assessmentType || !youthSelection || (youthSelection === 'existing' && !selectedYouthId)}
                  >
                    Start Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="print:block">
            {assessmentType === 'isp' ? (
              <div>
                <div className="flex items-center justify-between mb-4 print:hidden">
                  <Button variant="outline" onClick={resetSelection}>
                    ← Back to Assessment Selection
                  </Button>
                  <Badge variant="secondary">
                    ISP - {youthSelection === 'new' ? 'New Youth' : 'Existing Youth'}
                  </Badge>
                </div>
                <QuickISPAssessment 
                  selectedYouth={youthSelection === 'existing' && selectedYouthId ? youths.find(y => y.id === selectedYouthId) : undefined}
                />
              </div>
            ) : assessmentType === 'realcolors' ? (
              <div>
                <div className="flex items-center justify-between mb-4 print:hidden">
                  <Button variant="outline" onClick={resetSelection}>
                    ← Back to Assessment Selection
                  </Button>
                  <Badge variant="secondary">
                    Real Colors - {youthSelection === 'new' ? 'New Youth' : 'Existing Youth'}
                  </Badge>
                </div>
                <RealColorsAssessment 
                  selectedYouth={youthSelection === 'existing' && selectedYouthId ? youths.find(y => y.id === selectedYouthId) : undefined}
                />
              </div>
            ) : (
              <>
                <div className="text-center mb-8 print:mb-4">
                  <div className="flex items-center justify-between mb-4 print:hidden">
                    <Button variant="outline" onClick={resetSelection}>
                      ← Back to Assessment Selection
                    </Button>
                    <Badge variant="secondary">
                      RPAT - {youthSelection === 'new' ? 'New Youth' : 'Existing Youth'}
                    </Badge>
                  </div>
              <h1 className="text-3xl font-bold text-red-800 mb-2 print:text-black print:text-2xl">
                HEARTLAND BOYS HOME
              </h1>
              <h2 className="text-2xl font-semibold text-red-700 mb-4 print:text-black print:text-xl">
                Rapid Placement Assessment Tool (RPAT)
              </h2>
              <p className="text-red-600 print:text-black text-sm max-w-3xl mx-auto">
                This streamlined assessment tool is designed for efficient (30-minute) intake interviews while still providing comprehensive data for placement decisions.
              </p>
            </div>

            {/* Basic Information */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="youthName">Youth Name</Label>
                    <Input
                      id="youthName"
                      value={assessmentData.youthName}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, youthName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="dob">DOB</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={assessmentData.dob}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, dob: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      value={assessmentData.age}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, age: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="interviewer">Interviewer</Label>
                    <Input
                      id="interviewer"
                      value={assessmentData.interviewer}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, interviewer: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={assessmentData.date}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referralSource">Referral Source</Label>
                    <Input
                      id="referralSource"
                      value={assessmentData.referralSource}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, referralSource: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="legalStatus">Legal Status</Label>
                    <Input
                      id="legalStatus"
                      value={assessmentData.legalStatus}
                      onChange={(e) => setAssessmentData(prev => ({ ...prev, legalStatus: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Auto-save status */}
            {hasUnsavedChanges && (
              <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-4">
                {isAutoSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full" />
                    <span>Auto-saving assessment...</span>
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
            <div className="flex justify-center gap-4 mb-6 print:hidden">
              <Button onClick={handleSave} className="flex items-center gap-2 bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
                <Save className="h-4 w-4" />
                Save Assessment
              </Button>
              <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50">
                <Printer className="h-4 w-4" />
                Print Report
              </Button>
              <Button variant="outline" className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50">
                <Calculator className="h-4 w-4" />
                Total: {totalScore}/108 ({percentage}%)
              </Button>
            </div>

            {/* Assessment Summary - Hidden on screen, shown on print */}
            <div className="hidden print:block print:break-before-page">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-4">ASSESSMENT SUMMARY REPORT</h2>
                <div className="border-b-2 border-gray-300 pb-2 mb-4">
                  <p><strong>Youth:</strong> {assessmentData.youthName}</p>
                  <p><strong>Date of Assessment:</strong> {assessmentData.date}</p>
                  <p><strong>Interviewer:</strong> {assessmentData.interviewer}</p>
                </div>
              </div>

              {/* Score Summary */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">ASSESSMENT TOTALS</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <p><strong>Family & Living:</strong> {familyTotal}/16 ({Math.round((familyTotal/16)*100)}%)</p>
                      <p><strong>Education:</strong> {educationTotal}/12 ({Math.round((educationTotal/12)*100)}%)</p>
                      <p><strong>Behavioral:</strong> {behavioralTotal}/16 ({Math.round((behavioralTotal/16)*100)}%)</p>
                      <p><strong>Risk Factors:</strong> {riskTotal}/16 ({Math.round((riskTotal/16)*100)}%)</p>
                    </div>
                    <div className="space-y-2">
                      <p><strong>Mental Health:</strong> {mentalHealthTotal}/16 ({Math.round((mentalHealthTotal/16)*100)}%)</p>
                      <p><strong>Motivation:</strong> {motivationTotal}/16 ({Math.round((motivationTotal/16)*100)}%)</p>
                      <p><strong>Social Skills:</strong> {socialSkillsTotal}/16 ({Math.round((socialSkillsTotal/16)*100)}%)</p>
                      <p className="text-lg font-bold border-t pt-2"><strong>TOTAL SCORE:</strong> {totalScore}/108 ({percentage}%)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Interpretation */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">RISK INTERPRETATION</h3>
                  <div className="bg-gray-50 p-4 rounded">
                    <p className="font-semibold mb-2">
                      Overall Risk Level: <span className={`${
                        percentage <= 25 ? 'text-green-600' :
                        percentage <= 50 ? 'text-yellow-600' :
                        percentage <= 75 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {percentage <= 25 ? 'LOW RISK' :
                         percentage <= 50 ? 'MODERATE RISK' :
                         percentage <= 75 ? 'HIGH RISK' : 'CRITICAL RISK'}
                      </span>
                    </p>
                    <p className="text-sm">
                      {percentage <= 25 ? 'Excellent candidate for Group Home A placement. Youth demonstrates strong adaptive functioning across most domains.' :
                       percentage <= 50 ? 'Good candidate with support needs. Youth shows manageable risk factors that can be addressed with appropriate interventions.' :
                       percentage <= 75 ? 'Requires intensive services. Youth presents significant challenges that will need comprehensive treatment planning.' :
                       'May need higher level of care. Youth demonstrates critical risk factors that may exceed Group Home A capacity.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Key Assessment Notes */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">KEY ASSESSMENT NOTES</h3>
                  <div className="grid grid-cols-1 gap-4">
                    {[
                      { title: 'Family & Living Situation', notes: assessmentData.family },
                      { title: 'Education & Learning', notes: assessmentData.education },
                      { title: 'Behavioral Assessment', notes: assessmentData.behavioral },
                      { title: 'Risk Factors', notes: assessmentData.risk },
                      { title: 'Trauma & Mental Health', notes: assessmentData.mentalHealth },
                      { title: 'Motivation & Readiness', notes: assessmentData.motivation },
                      { title: 'Social Skills', notes: assessmentData.socialSkills }
                    ].map((section, index) => {
                      const hasNotes = Object.values(section.notes).some((item: any) => item.notes?.trim());
                      if (!hasNotes) return null;
                      
                      return (
                        <div key={index} className="border-l-4 border-blue-200 pl-4 mb-3">
                          <h4 className="font-semibold text-sm mb-2">{section.title}</h4>
                          <div className="space-y-1">
                            {Object.entries(section.notes).map(([key, item], noteIndex) => {
                              const note = (item as any).notes;
                              return note?.trim() && (
                                <p key={noteIndex} className="text-sm">
                                  <span className="font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span> {note}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Placement Recommendation Summary */}
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold mb-4">PLACEMENT RECOMMENDATION</h3>
                  <div className="space-y-2">
                    <p><strong>Recommendation:</strong> {assessmentData.placementRecommendation.decision || 'Not specified'}</p>
                    <p><strong>Placement Level:</strong> {assessmentData.placementRecommendation.placementLevel || 'Not specified'}</p>
                    {assessmentData.placementRecommendation.priorityTreatment.length > 0 && (
                      <p><strong>Priority Treatment Areas:</strong> {assessmentData.placementRecommendation.priorityTreatment.join(', ')}</p>
                    )}
                    {assessmentData.placementRecommendation.safetyProtocols.length > 0 && (
                      <p><strong>Safety Protocols Required:</strong> {assessmentData.placementRecommendation.safetyProtocols.join(', ')}</p>
                    )}
                    {assessmentData.placementRecommendation.estimatedStay && (
                      <p><strong>Estimated Length of Stay:</strong> {assessmentData.placementRecommendation.estimatedStay} months</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Assessment Sections */}
            <SectionCard
              title="1. FAMILY & LIVING SITUATION"
              keyQuestion="Tell me about your current living situation and family relationships."
              fields={[
                { key: 'caregiverStability', label: 'Caregiver Stability' },
                { key: 'housingStability', label: 'Housing Stability' },
                { key: 'familySupport', label: 'Family Support' },
                { key: 'familySafety', label: 'Family Safety' },
              ]}
              section="family"
              maxScore={16}
            />

            <SectionCard
              title="2. EDUCATION & LEARNING"
              keyQuestion="How's school going for you? Any challenges?"
              fields={[
                { key: 'academicPerformance', label: 'Academic Performance' },
                { key: 'schoolAttendance', label: 'School Attendance' },
                { key: 'behavioralIssues', label: 'Behavioral Issues' },
              ]}
              section="education"
              maxScore={12}
            />

            <SectionCard
              title="3. BEHAVIORAL ASSESSMENT"
              keyQuestion="How do you typically handle anger or frustration?"
              fields={[
                { key: 'impulseControl', label: 'Impulse Control' },
                { key: 'angerManagement', label: 'Anger Management' },
                { key: 'authorityResponse', label: 'Authority Response' },
                { key: 'peerRelationships', label: 'Peer Relationships' },
              ]}
              section="behavioral"
              maxScore={16}
            />

            <SectionCard
              title="4. RISK FACTORS"
              keyQuestion="Have you had any involvement with law enforcement or substance use?"
              fields={[
                { key: 'substanceUse', label: 'Substance Use' },
                { key: 'legalHistory', label: 'Legal History' },
                { key: 'violenceAggression', label: 'Violence/Aggression' },
                { key: 'riskTaking', label: 'Risk-Taking' },
              ]}
              section="risk"
              maxScore={16}
            />

            <SectionCard
              title="5. TRAUMA & MENTAL HEALTH"
              keyQuestion="Have you experienced any events that were really scary or upsetting?"
              fields={[
                { key: 'traumaHistory', label: 'Trauma History' },
                { key: 'depressionAnxiety', label: 'Depression/Anxiety' },
                { key: 'selfHarmRisk', label: 'Self-Harm Risk' },
                { key: 'sleepAppetite', label: 'Sleep/Appetite' },
              ]}
              section="mentalHealth"
              maxScore={16}
            />

            <SectionCard
              title="6. MOTIVATION & READINESS"
              keyQuestion="What do you know about our program, and how do you feel about being here?"
              fields={[
                { key: 'programUnderstanding', label: 'Program Understanding' },
                { key: 'changeMotivation', label: 'Change Motivation' },
                { key: 'responsibilityTaking', label: 'Responsibility Taking' },
                { key: 'futureGoals', label: 'Future Goals' },
              ]}
              section="motivation"
              maxScore={16}
            />

            <SectionCard
              title="SOCIAL SKILLS ASSESSMENT"
              keyQuestion="Rate current mastery level of core skills:"
              fields={[
                { key: 'followingInstructions', label: 'Following Instructions' },
                { key: 'acceptingNo', label: 'Accepting "No"' },
                { key: 'acceptingCriticism', label: 'Accepting Criticism' },
                { key: 'showingRespect', label: 'Showing Respect' },
              ]}
              section="socialSkills"
              maxScore={16}
            />

            {/* Final Scoring Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  SCORING SUMMARY & PLACEMENT DECISION
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-red-800 mb-2">
                    {totalScore}/108
                  </div>
                  <div className={`inline-block px-4 py-2 rounded text-white font-bold ${overallRisk.color}`}>
                    {overallRisk.level} RISK ({percentage}%)
                  </div>
                  <div className="mt-4 text-sm text-gray-600">
                    {percentage <= 25 && "Excellent candidate for program success"}
                    {percentage > 25 && percentage <= 50 && "Good candidate with support needs"}
                    {percentage > 50 && percentage <= 75 && "Requires intensive services"}
                    {percentage > 75 && "May need higher level of care"}
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="space-y-4">
                  <div>
                    <Label className="text-lg font-semibold">Placement Recommendation</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      {['ACCEPT', 'CONDITIONAL ACCEPT', 'DEFER', 'DENY'].map(option => (
                        <label key={option} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            name="decision"
                            value={option}
                            checked={assessmentData.placementRecommendation.decision === option}
                            onChange={(e) => setAssessmentData(prev => ({
                              ...prev,
                              placementRecommendation: {
                                ...prev.placementRecommendation,
                                decision: e.target.value
                              }
                            }))}
                          />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="estimatedStay">Estimated Length of Stay (months)</Label>
                    <Input
                      id="estimatedStay"
                      value={assessmentData.placementRecommendation.estimatedStay}
                      onChange={(e) => setAssessmentData(prev => ({
                        ...prev,
                        placementRecommendation: {
                          ...prev.placementRecommendation,
                          estimatedStay: e.target.value
                        }
                      }))}
                      className="w-32"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
