import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer, Save, Calculator } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  const [data, setData] = useState<AssessmentData>(initialData);

  const calculateSectionTotal = (section: Record<string, { score: number; notes: string }>) => {
    return Object.values(section).reduce((total: number, item) => {
      return total + (item.score || 0);
    }, 0);
  };

  const calculateTotalScore = () => {
    return calculateSectionTotal(data.family) +
           calculateSectionTotal(data.education) +
           calculateSectionTotal(data.behavioral) +
           calculateSectionTotal(data.risk) +
           calculateSectionTotal(data.mentalHealth) +
           calculateSectionTotal(data.motivation) +
           calculateSectionTotal(data.socialSkills);
  };

  const getRiskLevel = (percentage: number) => {
    if (percentage <= 25) return { level: 'LOW', color: 'bg-green-500' };
    if (percentage <= 50) return { level: 'MODERATE', color: 'bg-yellow-500' };
    if (percentage <= 75) return { level: 'HIGH', color: 'bg-orange-500' };
    return { level: 'CRITICAL', color: 'bg-red-500' };
  };

  const handleScoreChange = (section: string, field: string, value: number) => {
    setData(prev => {
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
  };

  const handleNotesChange = (section: string, field: string, notes: string) => {
    setData(prev => {
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
    localStorage.setItem('rpat-assessment', JSON.stringify(data));
    toast({
      title: "Assessment Saved",
      description: "Assessment data has been saved successfully",
    });
  };

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
    const sectionData = data[section as keyof AssessmentData] as Record<string, { score: number; notes: string }>;
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
                    value={(data[section as keyof AssessmentData] as any)[field.key].score}
                    onChange={(value) => handleScoreChange(section, field.key, value)}
                  />
                </div>
                <div className="col-span-7">
                  <Input
                    placeholder="Brief notes..."
                    value={(data[section as keyof AssessmentData] as any)[field.key].notes}
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
    <div className="max-w-6xl mx-auto p-6 space-y-6 print:max-w-none print:p-4">
      {/* Header */}
      <Card>
        <CardHeader className="text-center bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 text-white">
          <CardTitle className="text-2xl font-bold">HEARTLAND BOYS HOME</CardTitle>
          <p className="text-lg">Rapid Placement Assessment Tool (RPAT)</p>
          <p className="text-sm opacity-90">
            Streamlined 30-minute intake assessment for Group Home A placement decisions
          </p>
        </CardHeader>
        <CardContent className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="youthName">Youth Name</Label>
              <Input
                id="youthName"
                value={data.youthName}
                onChange={(e) => setData(prev => ({ ...prev, youthName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="dob">DOB</Label>
              <Input
                id="dob"
                type="date"
                value={data.dob}
                onChange={(e) => setData(prev => ({ ...prev, dob: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                value={data.age}
                onChange={(e) => setData(prev => ({ ...prev, age: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="interviewer">Interviewer</Label>
              <Input
                id="interviewer"
                value={data.interviewer}
                onChange={(e) => setData(prev => ({ ...prev, interviewer: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={data.date}
                onChange={(e) => setData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="referralSource">Referral Source</Label>
              <Input
                id="referralSource"
                value={data.referralSource}
                onChange={(e) => setData(prev => ({ ...prev, referralSource: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="legalStatus">Legal Status</Label>
              <Input
                id="legalStatus"
                value={data.legalStatus}
                onChange={(e) => setData(prev => ({ ...prev, legalStatus: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 print:hidden">
        <Button onClick={handleSave} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Save Assessment
        </Button>
        <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
        <Button variant="outline" className="flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Total: {totalScore}/108 ({percentage}%)
        </Button>
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
                      checked={data.placementRecommendation.decision === option}
                      onChange={(e) => setData(prev => ({
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
                value={data.placementRecommendation.estimatedStay}
                onChange={(e) => setData(prev => ({
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
    </div>
  );
};