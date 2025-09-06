import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Save } from "lucide-react";
import { toast } from "sonner";
import { saveAssessment, fetchAssessment, RiskAssessmentData } from "@/utils/supabase-utils";

interface RiskAssessmentProps {
  youthId: string;
  youth: any;
}

interface DomainScore {
  score: number;
  notes: string;
  maxScore: number;
}

interface RiskAssessment {
  id?: string;
  assessmentDate: Date;
  completedBy: string;
  domains: {
    priorOffending: DomainScore;
    familyCircumstances: DomainScore;
    education: DomainScore;
    peerRelations: DomainScore;
    substanceUse: DomainScore;
    recreation: DomainScore;
    personality: DomainScore;
    attitudes: DomainScore;
  };
  traumaHistory: string;
  strengths: string;
  recommendedLevel: number;
  overallRiskLevel: string;
  interventionTargets: string[];
  createdAt: Date;
  updatedAt: Date;
}

const DOMAIN_QUESTIONS = {
  priorOffending: [
    { id: "po1", text: "Three or more prior arrests", score: 2 },
    { id: "po2", text: "Previous incarceration in detention facility", score: 2 },
    { id: "po3", text: "Prior probation or community supervision", score: 1 },
    { id: "po4", text: "Previous failure to comply with court orders", score: 3 },
    { id: "po5", text: "Pattern of escalating severity in offenses", score: 2 }
  ],
  familyCircumstances: [
    { id: "fc1", text: "History of family disruption or separation", score: 2 },
    { id: "fc2", text: "Family members with criminal involvement", score: 2 },
    { id: "fc3", text: "Inconsistent parental supervision", score: 3 },
    { id: "fc4", text: "Parental difficulty controlling behavior", score: 2 },
    { id: "fc5", text: "Exposure to domestic violence", score: 1 }
  ],
  education: [
    { id: "ed1", text: "Poor academic achievement", score: 2 },
    { id: "ed2", text: "Truancy or dropping out", score: 3 },
    { id: "ed3", text: "Limited engagement in school activities", score: 1 },
    { id: "ed4", text: "Negative attitude toward education", score: 2 },
    { id: "ed5", text: "Disciplinary issues at school", score: 2 }
  ],
  peerRelations: [
    { id: "pr1", text: "Association with delinquent peers", score: 3 },
    { id: "pr2", text: "Limited positive peer relationships", score: 2 },
    { id: "pr3", text: "Gang involvement or affiliation", score: 3 },
    { id: "pr4", text: "Peer rejection or isolation", score: 1 },
    { id: "pr5", text: "Easily influenced by negative peers", score: 1 }
  ],
  substanceUse: [
    { id: "su1", text: "Regular substance use", score: 3 },
    { id: "su2", text: "Substance use linked to offending", score: 3 },
    { id: "su3", text: "Early onset of substance use", score: 2 },
    { id: "su4", text: "Substance use affects functioning", score: 1 },
    { id: "su5", text: "Family history of substance abuse", score: 1 }
  ],
  recreation: [
    { id: "rc1", text: "Limited structured leisure activities", score: 1 },
    { id: "rc2", text: "Excessive unstructured free time", score: 2 },
    { id: "rc3", text: "Lack of positive recreational interests", score: 2 },
    { id: "rc4", text: "Limited community involvement", score: 1 },
    { id: "rc5", text: "Recreational activities involve risk-taking", score: 4 }
  ],
  personality: [
    { id: "ps1", text: "Impulsivity and risk-taking", score: 2 },
    { id: "ps2", text: "Low empathy or remorse", score: 3 },
    { id: "ps3", text: "Poor frustration tolerance", score: 2 },
    { id: "ps4", text: "Inflated self-esteem", score: 1 },
    { id: "ps5", text: "Verbally aggressive or intimidating", score: 2 }
  ],
  attitudes: [
    { id: "at1", text: "Antisocial attitudes or beliefs", score: 3 },
    { id: "at2", text: "Defiance toward authority", score: 2 },
    { id: "at3", text: "Lack of concern for others", score: 2 },
    { id: "at4", text: "Minimizes harm caused to others", score: 1 },
    { id: "at5", text: "Negative attitude toward intervention", score: 2 }
  ]
};

const DOMAIN_LABELS = {
  priorOffending: "Prior & Current Offending",
  familyCircumstances: "Family Circumstances",
  education: "Education & Employment",
  peerRelations: "Peer Relations",
  substanceUse: "Substance Use",
  recreation: "Leisure & Recreation",
  personality: "Personality & Behavior",
  attitudes: "Attitudes & Orientation"
};

const INTERVENTION_TARGETS = [
  "Emotion Regulation",
  "Impulse Control",
  "Criminal Thinking",
  "Substance Abuse Treatment",
  "Family Counseling",
  "Academic Support",
  "Vocational Training",
  "Cognitive Behavioral Therapy",
  "Social Skills Training",
  "Mentoring",
  "Anger Management",
  "Trauma-Focused Therapy",
  "Individual Counseling",
  "Group Therapy",
  "Peer Association Management"
];

export const RiskAssessment = ({ youthId, youth }: RiskAssessmentProps) => {
  const [assessment, setAssessment] = useState<RiskAssessment>({
    assessmentDate: new Date(),
    completedBy: "",
    domains: {
      priorOffending: { score: 0, notes: "", maxScore: 10 },
      familyCircumstances: { score: 0, notes: "", maxScore: 10 },
      education: { score: 0, notes: "", maxScore: 10 },
      peerRelations: { score: 0, notes: "", maxScore: 10 },
      substanceUse: { score: 0, notes: "", maxScore: 10 },
      recreation: { score: 0, notes: "", maxScore: 10 },
      personality: { score: 0, notes: "", maxScore: 10 },
      attitudes: { score: 0, notes: "", maxScore: 10 }
    },
    traumaHistory: "",
    strengths: "",
    recommendedLevel: 1,
    overallRiskLevel: "Low",
    interventionTargets: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDomain, setActiveDomain] = useState<keyof typeof assessment.domains>("priorOffending");
  const [questionResponses, setQuestionResponses] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    fetchAssessmentData();
  }, [youthId]);
  
  const fetchAssessmentData = async () => {
    try {
      setIsLoading(true);
      
      // Changed 'assessments' to 'riskassessments' to match the AssessmentTable type
      const assessmentData = await fetchAssessment(youthId, 'riskassessments', 'riskNeeds') as RiskAssessmentData | null;
      
      if (assessmentData) {
        // Map the data from Supabase to our RiskAssessment interface
        setAssessment({
          id: assessmentData.id,
          assessmentDate: assessmentData.assessmentdate ? new Date(assessmentData.assessmentdate) : new Date(),
          completedBy: assessmentData.completedby || "",
          domains: assessmentData.domains || {
            priorOffending: { score: 0, notes: "", maxScore: 10 },
            familyCircumstances: { score: 0, notes: "", maxScore: 10 },
            education: { score: 0, notes: "", maxScore: 10 },
            peerRelations: { score: 0, notes: "", maxScore: 10 },
            substanceUse: { score: 0, notes: "", maxScore: 10 },
            recreation: { score: 0, notes: "", maxScore: 10 },
            personality: { score: 0, notes: "", maxScore: 10 },
            attitudes: { score: 0, notes: "", maxScore: 10 }
          },
          traumaHistory: assessmentData.traumahistory || "",
          strengths: assessmentData.strengths || "",
          recommendedLevel: assessmentData.recommendedlevel || 1,
          overallRiskLevel: assessmentData.overallrisklevel || "Low",
          interventionTargets: assessmentData.interventiontargets || [],
          createdAt: assessmentData.createdat ? new Date(assessmentData.createdat) : new Date(),
          updatedAt: assessmentData.updatedat ? new Date(assessmentData.updatedat) : new Date()
        });
        
        // Reconstruct question responses from scores
        const responses: Record<string, boolean> = {};
        
        Object.entries(DOMAIN_QUESTIONS).forEach(([domain, questions]) => {
          questions.forEach(question => {
            // If the domain's score includes this question's score, mark it as yes
            responses[question.id] = false; // Default to No
          });
        });
        
        setQuestionResponses(responses);
      }
    } catch (error) {
      console.error("Error fetching risk assessment:", error);
      toast.error("Failed to load risk assessment");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuestionChange = (questionId: string, domain: keyof typeof assessment.domains, value: boolean) => {
    // Update responses
    setQuestionResponses(prev => ({
      ...prev,
      [questionId]: value
    }));
    
    // Recalculate domain score
    const domainQuestions = DOMAIN_QUESTIONS[domain];
    let newScore = 0;
    
    domainQuestions.forEach(question => {
      if (questionId === question.id) {
        if (value) {
          newScore += question.score;
        }
      } else if (questionResponses[question.id]) {
        newScore += question.score;
      }
    });
    
    // Update assessment with new domain score
    setAssessment(prev => ({
      ...prev,
      domains: {
        ...prev.domains,
        [domain]: {
          ...prev.domains[domain],
          score: newScore
        }
      }
    }));
  };
  
  const handleDomainNotesChange = (domain: keyof typeof assessment.domains, notes: string) => {
    setAssessment(prev => ({
      ...prev,
      domains: {
        ...prev.domains,
        [domain]: {
          ...prev.domains[domain],
          notes
        }
      }
    }));
  };
  
  const handleGeneralInputChange = (field: keyof RiskAssessment, value: string) => {
    setAssessment(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAssessment(prev => ({
      ...prev,
      assessmentDate: new Date(e.target.value)
    }));
  };
  
  const handleInterventionToggle = (target: string) => {
    setAssessment(prev => {
      const targets = [...prev.interventionTargets];
      
      if (targets.includes(target)) {
        return {
          ...prev,
          interventionTargets: targets.filter(t => t !== target)
        };
      } else {
        return {
          ...prev,
          interventionTargets: [...targets, target]
        };
      }
    });
  };
  
  const handleSaveAssessment = async () => {
    try {
      setIsSaving(true);
      
      // Calculate total score and risk level
      const totalScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.score, 0);
      const maxPossibleScore = Object.values(assessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);
      
      let riskLevel = "Low";
      let recommendedLevel = 1;
      
      if (totalScore >= maxPossibleScore * 0.7) {
        riskLevel = "Very High";
        recommendedLevel = 1;
      } else if (totalScore >= maxPossibleScore * 0.5) {
        riskLevel = "High";
        recommendedLevel = 1;
      } else if (totalScore >= maxPossibleScore * 0.3) {
        riskLevel = "Moderate";
        recommendedLevel = 2;
      } else if (totalScore >= maxPossibleScore * 0.15) {
        riskLevel = "Low";
        recommendedLevel = 3;
      } else {
        riskLevel = "Very Low";
        recommendedLevel = 4;
      }
      
      const updatedAssessment = {
        ...assessment,
        overallRiskLevel: riskLevel,
        recommendedLevel,
        updatedAt: new Date()
      };
      
      // Format the data for Supabase
      const formattedData = {
        assessmentdate: updatedAssessment.assessmentDate.toISOString(),
        completedby: updatedAssessment.completedBy,
        domains: updatedAssessment.domains,
        traumahistory: updatedAssessment.traumaHistory,
        strengths: updatedAssessment.strengths,
        recommendedlevel: updatedAssessment.recommendedLevel,
        overallrisklevel: updatedAssessment.overallRiskLevel,
        interventiontargets: updatedAssessment.interventionTargets,
        createdat: updatedAssessment.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };
      
      // Changed 'assessments' to 'riskassessments' to match the AssessmentTable type
      await saveAssessment(
        youthId,
        'riskassessments',
        'riskNeeds',
        formattedData
      );
      
      setAssessment(updatedAssessment);
      toast.success("Risk assessment saved successfully");
    } catch (error) {
      console.error("Error saving risk assessment:", error);
      toast.error("Failed to save risk assessment");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrintAssessment = () => {
    window.print();
  };
  
  const handleExportPdf = () => {
    // PDF export functionality would be implemented here
    console.log("Export PDF");
  };
  
  const getTotalScore = () => {
    return Object.values(assessment.domains).reduce((sum, domain) => sum + domain.score, 0);
  };
  
  const getMaxPossibleScore = () => {
    return Object.values(assessment.domains).reduce((sum, domain) => sum + domain.maxScore, 0);
  };
  
  const getScorePercentage = () => {
    const total = getTotalScore();
    const max = getMaxPossibleScore();
    return (total / max) * 100;
  };
  
  const getRiskColor = () => {
    const percentage = getScorePercentage();
    
    if (percentage >= 70) return "bg-red-500";
    if (percentage >= 50) return "bg-orange-500";
    if (percentage >= 30) return "bg-yellow-500";
    if (percentage >= 15) return "bg-blue-500";
    return "bg-green-500";
  };
  
  const formatDate = (date: Date) => {
    if (!date) return "";
    
    try {
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading risk assessment...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Youth Risk & Needs Assessment</h2>
          <p className="text-gray-600 mb-4">
            Evaluate risk factors and needs across eight domains to inform treatment planning.
          </p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintAssessment}>
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSaveAssessment} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="bg-blue-50">
            <CardTitle>Assessment Overview</CardTitle>
            <CardDescription>Summary of risk factors and needs</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="assessmentDate">Assessment Date</Label>
                <Input
                  id="assessmentDate"
                  type="date"
                  value={formatDate(assessment.assessmentDate)}
                  onChange={handleDateChange}
                  className="max-w-full"
                />
              </div>
              
              <div>
                <Label htmlFor="completedBy">Completed By</Label>
                <Input
                  id="completedBy"
                  value={assessment.completedBy}
                  onChange={(e) => handleGeneralInputChange("completedBy", e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Overall Risk Score</h3>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">
                  {getTotalScore()} out of {getMaxPossibleScore()} points
                </span>
                <span className="text-sm font-medium">{assessment.overallRiskLevel} Risk</span>
              </div>
              <Progress value={getScorePercentage()} className={getRiskColor()} />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Domain Breakdown</h3>
              <div className="space-y-1">
                {Object.entries(assessment.domains).map(([domain, data]) => (
                  <div key={domain} className="grid grid-cols-3 text-sm">
                    <span className="col-span-2 truncate" title={DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}>
                      {DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}
                    </span>
                    <span className="text-right font-medium">
                      {data.score}/{data.maxScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border rounded-md bg-gray-50">
              <h3 className="font-semibold mb-2">Placement Recommendation</h3>
              <p className="font-bold text-xl">Level {assessment.recommendedLevel}</p>
              <p className="text-sm text-gray-600 mt-1">
                Based on {assessment.overallRiskLevel} risk assessment
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Risk Domain Assessment</CardTitle>
            </div>
            <CardDescription>
              Complete each domain to generate a comprehensive risk profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeDomain} onValueChange={(value) => setActiveDomain(value as keyof typeof assessment.domains)}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="priorOffending">Offending</TabsTrigger>
                <TabsTrigger value="familyCircumstances">Family</TabsTrigger>
                <TabsTrigger value="education">Education</TabsTrigger>
                <TabsTrigger value="peerRelations">Peers</TabsTrigger>
              </TabsList>
              <TabsList className="grid grid-cols-4">
                <TabsTrigger value="substanceUse">Substance</TabsTrigger>
                <TabsTrigger value="recreation">Leisure</TabsTrigger>
                <TabsTrigger value="personality">Personality</TabsTrigger>
                <TabsTrigger value="attitudes">Attitudes</TabsTrigger>
              </TabsList>
              
              {Object.keys(assessment.domains).map(domain => (
                <TabsContent key={domain} value={domain} className="pt-4 space-y-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS]}
                  </h3>
                  
                  <div className="space-y-4">
                    {DOMAIN_QUESTIONS[domain as keyof typeof DOMAIN_QUESTIONS].map((question) => (
                      <div key={question.id} className="p-3 border rounded-md hover:bg-gray-50">
                        <RadioGroup 
                          value={questionResponses[question.id] ? "yes" : "no"}
                          onValueChange={(value) => {
                            handleQuestionChange(
                              question.id, 
                              domain as keyof typeof assessment.domains, 
                              value === "yes"
                            );
                          }}
                          className="flex items-center"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{question.text}</p>
                            <p className="text-sm text-gray-500">Score weight: {question.score}</p>
                          </div>
                          <div className="space-x-4 flex items-center">
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="yes" id={`${question.id}-yes`} />
                              <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="no" id={`${question.id}-no`} />
                              <Label htmlFor={`${question.id}-no`}>No</Label>
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor={`${domain}-notes`}>Domain Notes</Label>
                      <span className="text-sm font-medium">
                        Score: {assessment.domains[domain as keyof typeof assessment.domains].score} / 
                        {assessment.domains[domain as keyof typeof assessment.domains].maxScore}
                      </span>
                    </div>
                    <Textarea 
                      id={`${domain}-notes`} 
                      value={assessment.domains[domain as keyof typeof assessment.domains].notes}
                      onChange={(e) => handleDomainNotesChange(
                        domain as keyof typeof assessment.domains, 
                        e.target.value
                      )}
                      placeholder={`Additional notes about ${DOMAIN_LABELS[domain as keyof typeof DOMAIN_LABELS].toLowerCase()}...`}
                      rows={3}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Trauma History & Strengths</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="traumaHistory">Trauma History</Label>
              <Textarea 
                id="traumaHistory" 
                value={assessment.traumaHistory}
                onChange={(e) => handleGeneralInputChange("traumaHistory", e.target.value)}
                placeholder="Document any known trauma history or adverse childhood experiences..."
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="strengths">Youth Strengths & Protective Factors</Label>
              <Textarea 
                id="strengths" 
                value={assessment.strengths}
                onChange={(e) => handleGeneralInputChange("strengths", e.target.value)}
                placeholder="Note positive attributes, skills, supports, and protective factors..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Intervention Targets</CardTitle>
            <CardDescription>Select primary treatment targets based on assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Select all that apply:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {INTERVENTION_TARGETS.map((target) => (
                  <div key={target} className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id={`target-${target}`}
                      checked={assessment.interventionTargets.includes(target)}
                      onChange={() => handleInterventionToggle(target)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Label htmlFor={`target-${target}`} className="text-sm cursor-pointer">
                      {target}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveAssessment} disabled={isSaving} className="w-full">
              {isSaving ? "Saving Assessment..." : "Save Complete Assessment"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
