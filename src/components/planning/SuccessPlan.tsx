
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Save } from "lucide-react";
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";
import { firestore } from "@/pages/Index";
import { toast } from "sonner";
import { format } from "date-fns";

interface SuccessPlanProps {
  youthId: string;
  youth: any;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  startDate: Date | Timestamp;
  targetDate: Date | Timestamp;
  objectives: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  targetSkills: string[];
  progress: number; // 0-100
  notes: string;
}

interface SuccessPlan {
  id?: string;
  createdDate: Date | Timestamp;
  reviewDate: Date | Timestamp;
  createdBy: string;
  youthName: string;
  goals: Goal[];
  strengths: string;
  barriers: string;
  supports: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

const SKILL_OPTIONS = [
  "Anger management",
  "Emotional regulation",
  "Impulse control",
  "Decision making",
  "Problem solving",
  "Communication",
  "Conflict resolution",
  "Stress management",
  "Time management",
  "Goal setting",
  "Responsibility",
  "Empathy",
  "Teamwork",
  "Self-awareness",
  "Self-confidence"
];

export const SuccessPlan = ({ youthId, youth }: SuccessPlanProps) => {
  const [successPlan, setSuccessPlan] = useState<SuccessPlan>({
    createdDate: new Date(),
    reviewDate: new Date(new Date().setDate(new Date().getDate() + 90)), // 90 days from now
    createdBy: "",
    youthName: `${youth.firstName} ${youth.lastName}`,
    goals: [
      {
        id: "goal-1",
        title: "",
        description: "",
        startDate: new Date(),
        targetDate: new Date(new Date().setDate(new Date().getDate() + 30)), // 30 days from now
        objectives: [
          { id: "obj-1-1", text: "", completed: false },
          { id: "obj-1-2", text: "", completed: false },
          { id: "obj-1-3", text: "", completed: false },
        ],
        targetSkills: [],
        progress: 0,
        notes: ""
      },
      {
        id: "goal-2",
        title: "",
        description: "",
        startDate: new Date(),
        targetDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        objectives: [
          { id: "obj-2-1", text: "", completed: false },
          { id: "obj-2-2", text: "", completed: false },
          { id: "obj-2-3", text: "", completed: false },
        ],
        targetSkills: [],
        progress: 0,
        notes: ""
      },
      {
        id: "goal-3",
        title: "",
        description: "",
        startDate: new Date(),
        targetDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        objectives: [
          { id: "obj-3-1", text: "", completed: false },
          { id: "obj-3-2", text: "", completed: false },
          { id: "obj-3-3", text: "", completed: false },
        ],
        targetSkills: [],
        progress: 0,
        notes: ""
      }
    ],
    strengths: "",
    barriers: "",
    supports: "",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [behaviorData, setbehaviorData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    fetchPlanAndSupportingData();
  }, [youthId]);
  
  const fetchPlanAndSupportingData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch existing success plan
      const planDocRef = doc(firestore, `youths/${youthId}/plans/successPlan`);
      const planDoc = await getDoc(planDocRef);
      
      if (planDoc.exists()) {
        const data = planDoc.data() as Omit<SuccessPlan, 'id'>;
        
        // Convert timestamps to dates
        const formattedGoals = data.goals.map(goal => ({
          ...goal,
          startDate: goal.startDate,
          targetDate: goal.targetDate
        }));
        
        setSuccessPlan({
          id: planDoc.id,
          ...data,
          goals: formattedGoals,
          createdDate: data.createdDate,
          reviewDate: data.reviewDate,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt
        });
      } else {
        // If no plan exists, initialize with youth's name
        setSuccessPlan(prev => ({
          ...prev,
          youthName: `${youth.firstName} ${youth.lastName}`
        }));
      }
      
      // Fetch assessment data for recommendations
      const assessmentDocRef = doc(firestore, `youths/${youthId}/assessments/riskNeeds`);
      const assessmentDoc = await getDoc(assessmentDocRef);
      
      if (assessmentDoc.exists()) {
        setAssessmentData(assessmentDoc.data());
      }
      
      // Fetch recent point entries
      const pointsRef = collection(firestore, `youths/${youthId}/points`);
      const q = query(pointsRef, orderBy("date", "desc"));
      const pointsSnapshot = await getDocs(q);
      
      const pointEntries = pointsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setbehaviorData(pointEntries);
    } catch (error) {
      console.error("Error fetching success plan data:", error);
      toast.error("Failed to load success plan");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBasicInfoChange = (field: keyof SuccessPlan, value: string) => {
    setSuccessPlan(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleDateChange = (field: 'createdDate' | 'reviewDate', value: string) => {
    setSuccessPlan(prev => ({
      ...prev,
      [field]: new Date(value)
    }));
  };
  
  const handleGoalChange = (index: number, field: keyof Goal, value: any) => {
    const updatedGoals = [...successPlan.goals];
    updatedGoals[index] = {
      ...updatedGoals[index],
      [field]: value
    };
    
    setSuccessPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
  };
  
  const handleGoalDateChange = (index: number, field: 'startDate' | 'targetDate', value: string) => {
    const updatedGoals = [...successPlan.goals];
    updatedGoals[index] = {
      ...updatedGoals[index],
      [field]: new Date(value)
    };
    
    setSuccessPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
  };
  
  const handleObjectiveChange = (goalIndex: number, objectiveIndex: number, text: string) => {
    const updatedGoals = [...successPlan.goals];
    updatedGoals[goalIndex].objectives[objectiveIndex].text = text;
    
    setSuccessPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
  };
  
  const handleObjectiveToggle = (goalIndex: number, objectiveIndex: number) => {
    const updatedGoals = [...successPlan.goals];
    updatedGoals[goalIndex].objectives[objectiveIndex].completed = 
      !updatedGoals[goalIndex].objectives[objectiveIndex].completed;
    
    // Update progress percentage
    const totalObjectives = updatedGoals[goalIndex].objectives.length;
    const completedObjectives = updatedGoals[goalIndex].objectives.filter(obj => obj.completed).length;
    updatedGoals[goalIndex].progress = Math.round((completedObjectives / totalObjectives) * 100);
    
    setSuccessPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
  };
  
  const handleSkillToggle = (goalIndex: number, skill: string) => {
    const updatedGoals = [...successPlan.goals];
    const currentSkills = [...updatedGoals[goalIndex].targetSkills];
    
    if (currentSkills.includes(skill)) {
      updatedGoals[goalIndex].targetSkills = currentSkills.filter(s => s !== skill);
    } else {
      updatedGoals[goalIndex].targetSkills = [...currentSkills, skill];
    }
    
    setSuccessPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
  };
  
  const handleSavePlan = async () => {
    try {
      setIsSaving(true);
      
      // Convert dates to Firestore timestamps
      const preparedGoals = successPlan.goals.map(goal => ({
        ...goal,
        startDate: goal.startDate instanceof Date 
          ? Timestamp.fromDate(goal.startDate) 
          : goal.startDate,
        targetDate: goal.targetDate instanceof Date 
          ? Timestamp.fromDate(goal.targetDate) 
          : goal.targetDate
      }));
      
      const planData = {
        ...successPlan,
        goals: preparedGoals,
        updatedAt: Timestamp.now(),
        createdDate: successPlan.createdDate instanceof Date 
          ? Timestamp.fromDate(successPlan.createdDate) 
          : successPlan.createdDate,
        reviewDate: successPlan.reviewDate instanceof Date 
          ? Timestamp.fromDate(successPlan.reviewDate) 
          : successPlan.reviewDate,
        createdAt: successPlan.createdAt instanceof Date 
          ? Timestamp.fromDate(successPlan.createdAt) 
          : successPlan.createdAt
      };
      
      await setDoc(
        doc(firestore, `youths/${youthId}/plans/successPlan`), 
        planData
      );
      
      toast.success("Success plan saved");
    } catch (error) {
      console.error("Error saving success plan:", error);
      toast.error("Failed to save success plan");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePrintPlan = () => {
    window.print();
  };
  
  const handleExportPdf = () => {
    // PDF export functionality would be implemented here
    console.log("Export PDF");
  };
  
  const getProgressColor = (progress: number) => {
    if (progress >= 75) return "bg-green-500";
    if (progress >= 50) return "bg-blue-500";
    if (progress >= 25) return "bg-yellow-500";
    return "bg-red-500";
  };
  
  const formatDate = (date: Date | Timestamp) => {
    if (!date) return "";
    
    try {
      // Handle Firestore timestamp
      if (typeof date === 'object' && 'toDate' in date) {
        const jsDate = date.toDate();
        return jsDate.toISOString().split('T')[0];
      }
      
      // Handle JS Date
      if (date instanceof Date) {
        return date.toISOString().split('T')[0];
      }
      
      return "";
    } catch (error) {
      console.error("Error formatting date:", error);
      return "";
    }
  };
  
  const getSuggestedSkills = () => {
    if (!assessmentData) return [];
    
    const suggestions = [];
    
    // Check domains with high scores
    if (assessmentData.domains?.attitudes?.score >= 5) {
      suggestions.push("Responsibility", "Empathy");
    }
    
    if (assessmentData.domains?.personality?.score >= 5) {
      suggestions.push("Emotional regulation", "Impulse control", "Self-awareness");
    }
    
    if (assessmentData.domains?.peerRelations?.score >= 5) {
      suggestions.push("Communication", "Conflict resolution", "Teamwork");
    }
    
    // Add any intervention targets
    if (assessmentData.interventionTargets?.length > 0) {
      assessmentData.interventionTargets.forEach((target: string) => {
        if (target === "Anger Management") suggestions.push("Anger management");
        if (target === "Emotion Regulation") suggestions.push("Emotional regulation");
        if (target === "Social Skills Training") suggestions.push("Communication", "Teamwork");
      });
    }
    
    // Return unique suggestions
    return [...new Set(suggestions)];
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading success plan...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Youth Success Plan</h2>
          <p className="text-gray-600 mb-4">
            Create personalized goals and objectives for behavioral change and skill development.
          </p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={handlePrintPlan}>
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSavePlan} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-blue-50">
          <CardTitle>Plan Information</CardTitle>
          <CardDescription>Basic details about this success plan</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="youthName">Youth Name</Label>
              <Input
                id="youthName"
                value={successPlan.youthName}
                onChange={(e) => handleBasicInfoChange("youthName", e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="createdDate">Plan Created</Label>
              <Input
                id="createdDate"
                type="date"
                value={formatDate(successPlan.createdDate)}
                onChange={(e) => handleDateChange("createdDate", e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="reviewDate">Review Date</Label>
              <Input
                id="reviewDate"
                type="date"
                value={formatDate(successPlan.reviewDate)}
                onChange={(e) => handleDateChange("reviewDate", e.target.value)}
              />
            </div>
            
            <div className="md:col-span-2">
              <Label htmlFor="createdBy">Plan Created By</Label>
              <Input
                id="createdBy"
                value={successPlan.createdBy}
                onChange={(e) => handleBasicInfoChange("createdBy", e.target.value)}
                placeholder="Staff name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Plan Framework</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="strengths">Youth Strengths</Label>
              <Textarea
                id="strengths"
                value={successPlan.strengths}
                onChange={(e) => handleBasicInfoChange("strengths", e.target.value)}
                placeholder="What qualities, interests, or abilities can help in reaching goals?"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="barriers">Potential Barriers</Label>
              <Textarea
                id="barriers"
                value={successPlan.barriers}
                onChange={(e) => handleBasicInfoChange("barriers", e.target.value)}
                placeholder="What challenges might make these goals difficult?"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="supports">Support Resources</Label>
              <Textarea
                id="supports"
                value={successPlan.supports}
                onChange={(e) => handleBasicInfoChange("supports", e.target.value)}
                placeholder="What people or resources can help in reaching these goals?"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <Tabs value={`goal-${activeGoalIndex}`} onValueChange={(value) => setActiveGoalIndex(parseInt(value.split('-')[1]))}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Youth Goals</CardTitle>
                <TabsList>
                  <TabsTrigger value="goal-0">Goal 1</TabsTrigger>
                  <TabsTrigger value="goal-1">Goal 2</TabsTrigger>
                  <TabsTrigger value="goal-2">Goal 3</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription>
                Set specific, measurable, achievable goals with clear objectives
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {[0, 1, 2].map((index) => (
                <TabsContent key={index} value={`goal-${index}`} className="space-y-4">
                  <div>
                    <Label htmlFor={`goal-${index}-title`}>Goal Title</Label>
                    <Input
                      id={`goal-${index}-title`}
                      value={successPlan.goals[index].title}
                      onChange={(e) => handleGoalChange(index, "title", e.target.value)}
                      placeholder="Brief, specific goal statement"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`goal-${index}-description`}>Goal Description</Label>
                    <Textarea
                      id={`goal-${index}-description`}
                      value={successPlan.goals[index].description}
                      onChange={(e) => handleGoalChange(index, "description", e.target.value)}
                      placeholder="Detailed description of the goal and why it's important"
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`goal-${index}-start-date`}>Start Date</Label>
                      <Input
                        id={`goal-${index}-start-date`}
                        type="date"
                        value={formatDate(successPlan.goals[index].startDate)}
                        onChange={(e) => handleGoalDateChange(index, "startDate", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`goal-${index}-target-date`}>Target Completion Date</Label>
                      <Input
                        id={`goal-${index}-target-date`}
                        type="date"
                        value={formatDate(successPlan.goals[index].targetDate)}
                        onChange={(e) => handleGoalDateChange(index, "targetDate", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Key Objectives</Label>
                      <span className="text-sm text-gray-500">Mark completed items</span>
                    </div>
                    
                    {successPlan.goals[index].objectives.map((objective, objIndex) => (
                      <div key={objective.id} className="flex items-start space-x-2 mb-2">
                        <Checkbox
                          id={objective.id}
                          checked={objective.completed}
                          onCheckedChange={() => handleObjectiveToggle(index, objIndex)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Input
                            value={objective.text}
                            onChange={(e) => handleObjectiveChange(index, objIndex, e.target.value)}
                            placeholder={`Objective ${objIndex + 1}`}
                            className={objective.completed ? "line-through text-gray-500" : ""}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div>
                    <Label className="mb-1 block">Target Skills</Label>
                    <div className="p-2 bg-gray-50 rounded-md">
                      <div className="flex flex-wrap gap-2 mb-2">
                        {successPlan.goals[index].targetSkills.map((skill) => (
                          <div key={skill} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                            {skill}
                          </div>
                        ))}
                        {successPlan.goals[index].targetSkills.length === 0 && (
                          <span className="text-sm text-gray-500">No skills selected</span>
                        )}
                      </div>
                      
                      {assessmentData && getSuggestedSkills().length > 0 && (
                        <div className="mt-2 mb-2">
                          <p className="text-xs text-gray-500 mb-1">Suggested from assessment:</p>
                          <div className="flex flex-wrap gap-1">
                            {getSuggestedSkills().map((skill) => (
                              <div 
                                key={skill} 
                                className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full cursor-pointer"
                                onClick={() => handleSkillToggle(index, skill)}
                              >
                                + {skill}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <Select 
                          onValueChange={(value) => handleSkillToggle(index, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select skills to develop" />
                          </SelectTrigger>
                          <SelectContent>
                            {SKILL_OPTIONS.map((skill) => (
                              <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor={`goal-${index}-progress`}>Progress</Label>
                      <span className="text-sm font-medium">{successPlan.goals[index].progress}%</span>
                    </div>
                    <Progress 
                      value={successPlan.goals[index].progress} 
                      className={getProgressColor(successPlan.goals[index].progress)} 
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`goal-${index}-notes`}>Progress Notes</Label>
                    <Textarea
                      id={`goal-${index}-notes`}
                      value={successPlan.goals[index].notes}
                      onChange={(e) => handleGoalChange(index, "notes", e.target.value)}
                      placeholder="Document progress, changes, or challenges with this goal"
                      rows={3}
                    />
                  </div>
                </TabsContent>
              ))}
            </CardContent>
          </Tabs>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Plan Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-md text-center">
            <p className="mb-4">By saving this plan, you confirm that it has been reviewed with the youth and represents agreed-upon goals.</p>
            <Button onClick={handleSavePlan} disabled={isSaving} size="lg">
              {isSaving ? "Saving Plan..." : "Save and Finalize Plan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
