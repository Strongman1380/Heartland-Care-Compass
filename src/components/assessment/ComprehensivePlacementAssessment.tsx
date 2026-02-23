import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
// Note: Assessment saving/loading functionality will need to be implemented with local storage
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Printer, Download, Save } from "lucide-react";

interface CPATProps {
  youthId: string;
  youth: any;
}

interface CPATData {
  youthName: string;
  dob: string;
  age: string;
  interviewer: string;
  date: string;
  location: string;
  referralSource: string;
  legalStatus: string;
  
  // Section A scores
  primaryCaregiverStability: number;
  housingStability: number;
  familySupport: number;
  academicPerformance: number;
  schoolAttendance: number;
  behavioralIssuesSchool: number;
  educationalSupportNeeds: number;
  
  // Section B scores
  thinkingBeforeActing: number;
  learningFromConsequences: number;
  problemSolvingSkills: number;
  angerManagement: number;
  emotionalExpression: number;
  copingStrategies: number;
  stressResponse: number;
  peerRelationships: number;
  authorityRelationships: number;
  socialCommunication: number;
  empathy: number;
  
  // Section C scores
  frequencyOfUse: number;
  ageOfFirstUse: number;
  impactOnFunctioning: number;
  treatmentHistory: number;
  criminalHistory: number;
  ageAtFirstOffense: number;
  escalationPattern: number;
  riskTakingBehaviors: number;
  physicalAggression: number;
  verbalAggression: number;
  weaponInvolvement: number;
  victimImpactAwareness: number;
  
  // Section D scores
  physicalAbuse: number;
  sexualAbuse: number;
  emotionalAbuseNeglect: number;
  witnessToViolence: number;
  depressionSymptoms: number;
  anxietySymptoms: number;
  sleepPatterns: number;
  selfHarmHistory: number;
  
  // Section E scores
  programAwareness: number;
  changeMotivation: number;
  responsibilityTaking: number;
  futureOrientation: number;
  followingInstructions: number;
  acceptingNo: number;
  acceptingCriticism: number;
  showingRespect: number;
  
  // Section F scores
  familyViolenceConflict: number;
  parentalSubstanceUse: number;
  homeSupervision: number;
  familySupportForTreatment: number;
  
  // Final recommendations
  recommendedStartingLevel: string;
  priorityTreatmentAreas: string[];
  specializedServices: string[];
  safetyProtocols: string[];
  contraindications: string[];
  finalRecommendation: string;
  rationale: string;
  estimatedLengthOfStay: string;
  primaryTreatmentGoals: string[];
  familyEngagementPlan: string;
}

const SCORING_CRITERIA = {
  0: "No Risk/Highly Adaptive",
  1: "Low Risk/Mostly Adaptive", 
  2: "Moderate Risk/Some Concerns",
  3: "High Risk/Significant Concerns",
  4: "Critical Risk/Major Barriers"
};

export const ComprehensivePlacementAssessment = ({ youthId, youth }: CPATProps) => {
  const [assessment, setAssessment] = useState<CPATData>({
    youthName: `${youth?.firstName || ''} ${youth?.lastName || ''}`,
    dob: youth?.dob ? new Date(youth.dob).toLocaleDateString() : '',
    age: youth?.age?.toString() || '',
    interviewer: '',
    date: new Date().toLocaleDateString(),
    location: '',
    referralSource: youth?.referralSource || '',
    legalStatus: youth?.legalStatus || '',
    
    // Initialize all scores to 0
    primaryCaregiverStability: 0,
    housingStability: 0,
    familySupport: 0,
    academicPerformance: 0,
    schoolAttendance: 0,
    behavioralIssuesSchool: 0,
    educationalSupportNeeds: 0,
    thinkingBeforeActing: 0,
    learningFromConsequences: 0,
    problemSolvingSkills: 0,
    angerManagement: 0,
    emotionalExpression: 0,
    copingStrategies: 0,
    stressResponse: 0,
    peerRelationships: 0,
    authorityRelationships: 0,
    socialCommunication: 0,
    empathy: 0,
    frequencyOfUse: 0,
    ageOfFirstUse: 0,
    impactOnFunctioning: 0,
    treatmentHistory: 0,
    criminalHistory: 0,
    ageAtFirstOffense: 0,
    escalationPattern: 0,
    riskTakingBehaviors: 0,
    physicalAggression: 0,
    verbalAggression: 0,
    weaponInvolvement: 0,
    victimImpactAwareness: 0,
    physicalAbuse: 0,
    sexualAbuse: 0,
    emotionalAbuseNeglect: 0,
    witnessToViolence: 0,
    depressionSymptoms: 0,
    anxietySymptoms: 0,
    sleepPatterns: 0,
    selfHarmHistory: 0,
    programAwareness: 0,
    changeMotivation: 0,
    responsibilityTaking: 0,
    futureOrientation: 0,
    followingInstructions: 0,
    acceptingNo: 0,
    acceptingCriticism: 0,
    showingRespect: 0,
    familyViolenceConflict: 0,
    parentalSubstanceUse: 0,
    homeSupervision: 0,
    familySupportForTreatment: 0,
    
    recommendedStartingLevel: '',
    priorityTreatmentAreas: [],
    specializedServices: [],
    safetyProtocols: [],
    contraindications: [],
    finalRecommendation: '',
    rationale: '',
    estimatedLengthOfStay: '',
    primaryTreatmentGoals: ['', '', ''],
    familyEngagementPlan: ''
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAssessmentData();
  }, [youthId]);

  const fetchAssessmentData = async () => {
    try {
      setLoading(true);
      const data = await fetchAssessment(youthId, "riskassessments", "cpat");
      if (data) {
        setAssessment({ ...assessment, ...data });
      }
    } catch (err) {
      console.error("Error fetching CPAT data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (field: keyof CPATData, value: number) => {
    setAssessment(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof CPATData, value: string) => {
    setAssessment(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field: keyof CPATData, value: string, checked: boolean) => {
    setAssessment(prev => {
      const currentArray = (prev[field] as string[]) || [];
      if (checked) {
        return { ...prev, [field]: [...currentArray, value] };
      } else {
        return { ...prev, [field]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const calculateSectionScore = (fields: (keyof CPATData)[]): { total: number; max: number; percentage: number } => {
    const total = fields.reduce((sum, field) => sum + (assessment[field] as number || 0), 0);
    const max = fields.length * 4;
    const percentage = (total / max) * 100;
    return { total, max, percentage };
  };

  const getTotalScore = () => {
    const allScoreFields = Object.keys(assessment).filter(key => 
      typeof assessment[key as keyof CPATData] === 'number' && 
      key !== 'age'
    ) as (keyof CPATData)[];
    
    return calculateSectionScore(allScoreFields);
  };

  const getRiskLevel = (percentage: number): string => {
    if (percentage <= 25) return "LOW RISK";
    if (percentage <= 50) return "MODERATE RISK";
    if (percentage <= 75) return "HIGH RISK";
    return "CRITICAL RISK";
  };

  const getRiskColor = (percentage: number): string => {
    if (percentage <= 25) return "text-green-600";
    if (percentage <= 50) return "text-yellow-600";
    if (percentage <= 75) return "text-orange-600";
    return "text-red-600";
  };

  const handleSaveAssessment = async () => {
    try {
      setSaving(true);
      
      await saveAssessment(youthId, "riskassessments", "cpat", assessment);
      
      toast.success("CPAT assessment saved successfully!");
    } catch (err) {
      console.error("Error saving assessment:", err);
      toast.error("Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  const ScoreInput = ({ 
    label, 
    field, 
    criteria 
  }: { 
    label: string; 
    field: keyof CPATData; 
    criteria: Record<number, string>;
  }) => (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      <RadioGroup
        value={(assessment[field] as number).toString()}
        onValueChange={(value) => handleScoreChange(field, parseInt(value))}
        className="flex flex-wrap gap-4"
      >
        {Object.entries(criteria).map(([score, description]) => (
          <div key={score} className="flex items-center space-x-2">
            <RadioGroupItem value={score} id={`${field}-${score}`} />
            <Label htmlFor={`${field}-${score}`} className="text-sm">
              {score}: {description}
            </Label>
          </div>
        ))}
      </RadioGroup>
      <div className="text-sm text-muted-foreground">
        Current Score: {assessment[field] as number}/4
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading CPAT Assessment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalScore = getTotalScore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">
            Comprehensive Placement Assessment Tool (CPAT)
          </CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <Label>Youth Name</Label>
              <Input 
                value={assessment.youthName}
                onChange={(e) => handleInputChange('youthName', e.target.value)}
              />
            </div>
            <div>
              <Label>DOB</Label>
              <Input 
                value={assessment.dob}
                onChange={(e) => handleInputChange('dob', e.target.value)}
              />
            </div>
            <div>
              <Label>Age</Label>
              <Input 
                value={assessment.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
              />
            </div>
            <div>
              <Label>Interviewer</Label>
              <Input 
                value={assessment.interviewer}
                onChange={(e) => handleInputChange('interviewer', e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Assessment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Score:</span>
              <span className="text-lg font-bold">
                {totalScore.total}/{totalScore.max} ({totalScore.percentage.toFixed(1)}%)
              </span>
            </div>
            <Progress value={totalScore.percentage} className="h-3" />
            <div className="text-center">
              <Badge className={`text-lg px-4 py-2 ${getRiskColor(totalScore.percentage)}`}>
                {getRiskLevel(totalScore.percentage)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Sections */}
      <Tabs defaultValue="section-a" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="section-a">Background</TabsTrigger>
          <TabsTrigger value="section-b">Behavioral</TabsTrigger>
          <TabsTrigger value="section-c">Risk</TabsTrigger>
          <TabsTrigger value="section-d">Trauma/MH</TabsTrigger>
          <TabsTrigger value="section-e">Motivation</TabsTrigger>
          <TabsTrigger value="section-f">Family</TabsTrigger>
        </TabsList>

        <TabsContent value="section-a">
          <Card>
            <CardHeader>
              <CardTitle>Section A: Background & Demographic Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">A1. Family Structure & Stability</h3>
                <ScoreInput
                  label="Primary Caregiver Stability"
                  field="primaryCaregiverStability"
                  criteria={{
                    0: "Stable 2-parent",
                    1: "Single stable parent",
                    2: "Relative care",
                    3: "Multiple changes",
                    4: "No stable caregiver"
                  }}
                />
                <ScoreInput
                  label="Housing Stability"
                  field="housingStability"
                  criteria={{
                    0: "Owned home >2yrs",
                    1: "Stable rental >1yr",
                    2: "Recent move",
                    3: "Multiple moves",
                    4: "Homeless/couch surfing"
                  }}
                />
                <ScoreInput
                  label="Family Support System"
                  field="familySupport"
                  criteria={{
                    0: "Strong extended family",
                    1: "Some family support",
                    2: "Limited support",
                    3: "Isolated family",
                    4: "Hostile/toxic family"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">A2. Educational History</h3>
                <ScoreInput
                  label="Academic Performance"
                  field="academicPerformance"
                  criteria={{
                    0: "Above grade level",
                    1: "At grade level",
                    2: "1 year behind",
                    3: "2+ years behind",
                    4: "Significant learning issues"
                  }}
                />
                <ScoreInput
                  label="School Attendance"
                  field="schoolAttendance"
                  criteria={{
                    0: ">95%",
                    1: "90-94%",
                    2: "80-89%",
                    3: "70-79%",
                    4: "<70%"
                  }}
                />
                <ScoreInput
                  label="Behavioral Issues at School"
                  field="behavioralIssuesSchool"
                  criteria={{
                    0: "None",
                    1: "Minor incidents",
                    2: "Several suspensions",
                    3: "Multiple suspensions",
                    4: "Expelled/alternative school"
                  }}
                />
                <ScoreInput
                  label="Educational Support Needs"
                  field="educationalSupportNeeds"
                  criteria={{
                    0: "None",
                    1: "Tutoring",
                    2: "Special education",
                    3: "Multiple services",
                    4: "Significant accommodations"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section-b">
          <Card>
            <CardHeader>
              <CardTitle>Section B: Behavioral & Personality Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">B1. Impulse Control & Decision Making</h3>
                <ScoreInput
                  label="Thinking Before Acting"
                  field="thinkingBeforeActing"
                  criteria={{
                    0: "Always considers consequences",
                    1: "Usually thinks first",
                    2: "Sometimes impulsive",
                    3: "Often impulsive",
                    4: "Rarely thinks first"
                  }}
                />
                <ScoreInput
                  label="Learning from Consequences"
                  field="learningFromConsequences"
                  criteria={{
                    0: "Changes behavior quickly",
                    1: "Usually learns",
                    2: "Sometimes repeats mistakes",
                    3: "Often repeats mistakes",
                    4: "No pattern of learning"
                  }}
                />
                <ScoreInput
                  label="Problem-Solving Skills"
                  field="problemSolvingSkills"
                  criteria={{
                    0: "Uses multiple strategies",
                    1: "Has some strategies",
                    2: "Limited strategies",
                    3: "Poor problem-solving",
                    4: "No effective strategies"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">B2. Emotional Regulation</h3>
                <ScoreInput
                  label="Anger Management"
                  field="angerManagement"
                  criteria={{
                    0: "Excellent control",
                    1: "Good control",
                    2: "Some difficulty",
                    3: "Poor control",
                    4: "Explosive/dangerous"
                  }}
                />
                <ScoreInput
                  label="Emotional Expression"
                  field="emotionalExpression"
                  criteria={{
                    0: "Appropriate expression",
                    1: "Usually appropriate",
                    2: "Sometimes inappropriate",
                    3: "Often inappropriate",
                    4: "Consistently inappropriate"
                  }}
                />
                <ScoreInput
                  label="Coping Strategies"
                  field="copingStrategies"
                  criteria={{
                    0: "Multiple healthy strategies",
                    1: "Some healthy strategies",
                    2: "Mixed strategies",
                    3: "Mostly unhealthy",
                    4: "No healthy strategies"
                  }}
                />
                <ScoreInput
                  label="Stress Response"
                  field="stressResponse"
                  criteria={{
                    0: "Handles stress well",
                    1: "Usually manages",
                    2: "Some difficulty",
                    3: "Poor stress management",
                    4: "Overwhelmed by minor stress"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">B3. Social Skills & Relationships</h3>
                <ScoreInput
                  label="Peer Relationships"
                  field="peerRelationships"
                  criteria={{
                    0: "Healthy friendships",
                    1: "Generally positive",
                    2: "Some poor choices",
                    3: "Mostly negative peers",
                    4: "Gang/criminal associations"
                  }}
                />
                <ScoreInput
                  label="Authority Relationships"
                  field="authorityRelationships"
                  criteria={{
                    0: "Respectful cooperation",
                    1: "Usually cooperative",
                    2: "Sometimes defiant",
                    3: "Often defiant",
                    4: "Consistently oppositional"
                  }}
                />
                <ScoreInput
                  label="Social Communication"
                  field="socialCommunication"
                  criteria={{
                    0: "Excellent skills",
                    1: "Good skills",
                    2: "Some deficits",
                    3: "Poor skills",
                    4: "Significant deficits"
                  }}
                />
                <ScoreInput
                  label="Empathy & Perspective-Taking"
                  field="empathy"
                  criteria={{
                    0: "High empathy",
                    1: "Good empathy",
                    2: "Some empathy",
                    3: "Limited empathy",
                    4: "No apparent empathy"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section-c">
          <Card>
            <CardHeader>
              <CardTitle>Section C: Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">C1. Substance Use History</h3>
                <ScoreInput
                  label="Frequency of Use"
                  field="frequencyOfUse"
                  criteria={{
                    0: "Never used",
                    1: "Experimental only",
                    2: "Occasional use",
                    3: "Regular use",
                    4: "Daily/dependent use"
                  }}
                />
                <ScoreInput
                  label="Age of First Use"
                  field="ageOfFirstUse"
                  criteria={{
                    0: "Never",
                    1: "16+",
                    2: "14-15",
                    3: "12-13",
                    4: "Under 12"
                  }}
                />
                <ScoreInput
                  label="Impact on Functioning"
                  field="impactOnFunctioning"
                  criteria={{
                    0: "No impact",
                    1: "Minor impact",
                    2: "Some problems",
                    3: "Significant problems",
                    4: "Major impairment"
                  }}
                />
                <ScoreInput
                  label="Treatment History"
                  field="treatmentHistory"
                  criteria={{
                    0: "No need",
                    1: "Completed successfully",
                    2: "Some treatment",
                    3: "Multiple failed attempts",
                    4: "Refuses treatment"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">C2. Legal History & Risk Behaviors</h3>
                <ScoreInput
                  label="Criminal History"
                  field="criminalHistory"
                  criteria={{
                    0: "No arrests",
                    1: "1-2 minor offenses",
                    2: "Multiple misdemeanors",
                    3: "Felony charges",
                    4: "Violent/sexual offenses"
                  }}
                />
                <ScoreInput
                  label="Age at First Offense"
                  field="ageAtFirstOffense"
                  criteria={{
                    0: "No offenses",
                    1: "15+",
                    2: "13-14",
                    3: "11-12",
                    4: "Under 11"
                  }}
                />
                <ScoreInput
                  label="Escalation Pattern"
                  field="escalationPattern"
                  criteria={{
                    0: "No pattern",
                    1: "Stable/decreasing",
                    2: "Slight increase",
                    3: "Clear escalation",
                    4: "Rapid escalation"
                  }}
                />
                <ScoreInput
                  label="Risk-Taking Behaviors"
                  field="riskTakingBehaviors"
                  criteria={{
                    0: "Very cautious",
                    1: "Normal adolescent risks",
                    2: "Some concerning risks",
                    3: "High-risk behaviors",
                    4: "Dangerous/life-threatening"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">C3. Violence & Aggression Assessment</h3>
                <ScoreInput
                  label="Physical Aggression"
                  field="physicalAggression"
                  criteria={{
                    0: "Never physical",
                    1: "Rare defensive",
                    2: "Occasional fights",
                    3: "Frequent aggression",
                    4: "Severe/dangerous violence"
                  }}
                />
                <ScoreInput
                  label="Verbal Aggression"
                  field="verbalAggression"
                  criteria={{
                    0: "Rarely verbal",
                    1: "Occasional arguments",
                    2: "Frequent arguing",
                    3: "Threatening language",
                    4: "Intimidating/abusive"
                  }}
                />
                <ScoreInput
                  label="Weapon Involvement"
                  field="weaponInvolvement"
                  criteria={{
                    0: "Never",
                    1: "Saw weapons used",
                    2: "Threatened with weapon",
                    3: "Carried weapon",
                    4: "Used weapon"
                  }}
                />
                <ScoreInput
                  label="Victim Impact Awareness"
                  field="victimImpactAwareness"
                  criteria={{
                    0: "High awareness",
                    1: "Good awareness",
                    2: "Some awareness",
                    3: "Limited awareness",
                    4: "No awareness"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section-d">
          <Card>
            <CardHeader>
              <CardTitle>Section D: Trauma & Mental Health Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">D1. Trauma History</h3>
                <ScoreInput
                  label="Physical Abuse"
                  field="physicalAbuse"
                  criteria={{
                    0: "No history",
                    1: "Single incident",
                    2: "Occasional",
                    3: "Chronic",
                    4: "Severe/ongoing"
                  }}
                />
                <ScoreInput
                  label="Sexual Abuse"
                  field="sexualAbuse"
                  criteria={{
                    0: "No history",
                    1: "Single incident",
                    2: "Multiple incidents",
                    3: "Chronic abuse",
                    4: "Severe/multiple perpetrators"
                  }}
                />
                <ScoreInput
                  label="Emotional Abuse/Neglect"
                  field="emotionalAbuseNeglect"
                  criteria={{
                    0: "Loving family",
                    1: "Some criticism",
                    2: "Frequent criticism",
                    3: "Emotional abuse",
                    4: "Severe emotional trauma"
                  }}
                />
                <ScoreInput
                  label="Witness to Violence"
                  field="witnessToViolence"
                  criteria={{
                    0: "No exposure",
                    1: "Minimal exposure",
                    2: "Some exposure",
                    3: "Frequent exposure",
                    4: "Chronic exposure"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">D2. Mental Health Indicators</h3>
                <ScoreInput
                  label="Depression Symptoms"
                  field="depressionSymptoms"
                  criteria={{
                    0: "No symptoms",
                    1: "Mild sadness",
                    2: "Moderate symptoms",
                    3: "Significant depression",
                    4: "Severe/suicidal ideation"
                  }}
                />
                <ScoreInput
                  label="Anxiety Symptoms"
                  field="anxietySymptoms"
                  criteria={{
                    0: "No anxiety",
                    1: "Mild worry",
                    2: "Moderate anxiety",
                    3: "Significant anxiety",
                    4: "Panic/severe anxiety"
                  }}
                />
                <ScoreInput
                  label="Sleep Patterns"
                  field="sleepPatterns"
                  criteria={{
                    0: "Healthy sleep",
                    1: "Minor issues",
                    2: "Some problems",
                    3: "Significant issues",
                    4: "Severe sleep disturbance"
                  }}
                />
                <ScoreInput
                  label="Self-Harm History"
                  field="selfHarmHistory"
                  criteria={{
                    0: "Never",
                    1: "Thought about it",
                    2: "Single incident",
                    3: "Multiple incidents",
                    4: "Chronic self-harm"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section-e">
          <Card>
            <CardHeader>
              <CardTitle>Section E: Motivation & Treatment Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">E1. Program Understanding & Motivation</h3>
                <ScoreInput
                  label="Program Awareness"
                  field="programAwareness"
                  criteria={{
                    0: "Excellent understanding",
                    1: "Good understanding",
                    2: "Some understanding",
                    3: "Limited understanding",
                    4: "No understanding"
                  }}
                />
                <ScoreInput
                  label="Change Motivation"
                  field="changeMotivation"
                  criteria={{
                    0: "Highly motivated",
                    1: "Motivated",
                    2: "Somewhat motivated",
                    3: "Low motivation",
                    4: "No motivation"
                  }}
                />
                <ScoreInput
                  label="Responsibility Taking"
                  field="responsibilityTaking"
                  criteria={{
                    0: "Full responsibility",
                    1: "Mostly responsible",
                    2: "Some responsibility",
                    3: "Blames others",
                    4: "No responsibility"
                  }}
                />
                <ScoreInput
                  label="Future Orientation"
                  field="futureOrientation"
                  criteria={{
                    0: "Clear goals",
                    1: "Some goals",
                    2: "Vague goals",
                    3: "No real goals",
                    4: "Negative future view"
                  }}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">E2. Social Skills Readiness Assessment</h3>
                <ScoreInput
                  label="Following Instructions"
                  field="followingInstructions"
                  criteria={{
                    0: "Masters skill",
                    1: "Usually follows",
                    2: "Sometimes follows",
                    3: "Rarely follows",
                    4: "Never follows"
                  }}
                />
                <ScoreInput
                  label="Accepting 'No'"
                  field="acceptingNo"
                  criteria={{
                    0: "Accepts easily",
                    1: "Usually accepts",
                    2: "Sometimes argues",
                    3: "Often argues",
                    4: "Never accepts"
                  }}
                />
                <ScoreInput
                  label="Accepting Criticism"
                  field="acceptingCriticism"
                  criteria={{
                    0: "Handles well",
                    1: "Usually handles well",
                    2: "Sometimes defensive",
                    3: "Very defensive",
                    4: "Cannot handle"
                  }}
                />
                <ScoreInput
                  label="Showing Respect"
                  field="showingRespect"
                  criteria={{
                    0: "Very respectful",
                    1: "Usually respectful",
                    2: "Sometimes disrespectful",
                    3: "Often disrespectful",
                    4: "Never respectful"
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section-f">
          <Card>
            <CardHeader>
              <CardTitle>Section F: Family & Safety Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">F1. Family Dynamics & Safety</h3>
                <ScoreInput
                  label="Family Violence/Conflict"
                  field="familyViolenceConflict"
                  criteria={{
                    0: "Peaceful home",
                    1: "Minor conflicts",
                    2: "Regular arguing",
                    3: "Frequent violence",
                    4: "Severe/dangerous violence"
                  }}
                />
                <ScoreInput
                  label="Parental Substance Use"
                  field="parentalSubstanceUse"
                  criteria={{
                    0: "No use",
                    1: "Social drinking",
                    2: "Occasional problems",
                    3: "Regular abuse",
                    4: "Severe addiction"
                  }}
                />
                <ScoreInput
                  label="Home Supervision"
                  field="homeSupervision"
                  criteria={{
                    0: "Excellent supervision",
                    1: "Good supervision",
                    2: "Some supervision",
                    3: "Poor supervision",
                    4: "No supervision"
                  }}
                />
                <ScoreInput
                  label="Family Support for Treatment"
                  field="familySupportForTreatment"
                  criteria={{
                    0: "Highly supportive",
                    1: "Supportive",
                    2: "Somewhat supportive",
                    3: "Unsupportive",
                    4: "Actively opposed"
                  }}
                />
              </div>

              <div className="space-y-4 mt-8">
                <h3 className="font-semibold">Recommendations & Planning</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label>Final Recommendation</Label>
                    <RadioGroup
                      value={assessment.finalRecommendation}
                      onValueChange={(value) => handleInputChange('finalRecommendation', value)}
                      className="mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="accept" id="accept" />
                        <Label htmlFor="accept">ACCEPT - Youth meets criteria</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="conditional" id="conditional" />
                        <Label htmlFor="conditional">CONDITIONAL ACCEPT - Accept with conditions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="defer" id="defer" />
                        <Label htmlFor="defer">DEFER - Defer pending additional information</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="deny" id="deny" />
                        <Label htmlFor="deny">DENY - Not appropriate for this level of care</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Rationale</Label>
                    <Textarea
                      value={assessment.rationale}
                      onChange={(e) => handleInputChange('rationale', e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Estimated Length of Stay (months)</Label>
                    <Input
                      value={assessment.estimatedLengthOfStay}
                      onChange={(e) => handleInputChange('estimatedLengthOfStay', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={() => window.print()} className="border-gray-300 text-gray-700 hover:bg-gray-50">
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
        <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <Button onClick={handleSaveAssessment} disabled={saving} className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Assessment"}
        </Button>
      </div>
    </div>
  );
};