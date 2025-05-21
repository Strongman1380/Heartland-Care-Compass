import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { FileText, Download, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveAssessment, fetchAssessment } from "@/utils/supabase-utils";

interface SuccessPlanProps {
  youthId: string;
  youth: any;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold';
  progress: number;
  category: string;
  steps: Step[];
}

interface Step {
  id: string;
  description: string;
  completed: boolean;
  dueDate?: Date;
}

interface SuccessPlanData {
  id?: string;
  goals: Goal[];
  strengths: string[];
  supportNetwork: string[];
  barriers: string[];
  notes: string;
  lastReviewDate: Date;
  nextReviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GOAL_CATEGORIES = [
  "Education",
  "Employment",
  "Housing",
  "Health",
  "Mental Health",
  "Substance Use",
  "Family",
  "Social",
  "Legal",
  "Financial",
  "Personal Development"
];

const generateId = () => Math.random().toString(36).substring(2, 9);

export const SuccessPlan = ({ youthId, youth }: SuccessPlanProps) => {
  const [plan, setPlan] = useState<SuccessPlanData>({
    goals: [],
    strengths: [],
    supportNetwork: [],
    barriers: [],
    notes: "",
    lastReviewDate: new Date(),
    nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("goals");
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [newStrength, setNewStrength] = useState("");
  const [newSupport, setNewSupport] = useState("");
  const [newBarrier, setNewBarrier] = useState("");
  
  useEffect(() => {
    fetchSuccessPlan();
  }, [youthId]);
  
  const fetchSuccessPlan = async () => {
    try {
      setIsLoading(true);
      
      const planData = await fetchAssessment(youthId, 'plans', 'successPlan');
      
      if (planData) {
        setPlan({
          id: planData.id,
          goals: planData.goals || [],
          strengths: planData.strengths || [],
          supportNetwork: planData.supportnetwork || [],
          barriers: planData.barriers || [],
          notes: planData.notes || "",
          lastReviewDate: planData.lastreviewdate ? new Date(planData.lastreviewdate) : new Date(),
          nextReviewDate: planData.nextreviewdate ? new Date(planData.nextreviewdate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          createdAt: planData.createdat ? new Date(planData.createdat) : new Date(),
          updatedAt: planData.updatedat ? new Date(planData.updatedat) : new Date()
        });
        
        // Set active goal if there are any goals
        if (planData.goals && planData.goals.length > 0) {
          setActiveGoalId(planData.goals[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching success plan:", error);
      toast.error("Failed to load success plan");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSavePlan = async () => {
    try {
      setIsSaving(true);
      
      const formattedData = {
        goals: plan.goals,
        strengths: plan.strengths,
        supportnetwork: plan.supportNetwork,
        barriers: plan.barriers,
        notes: plan.notes,
        lastreviewdate: plan.lastReviewDate.toISOString(),
        nextreviewdate: plan.nextReviewDate.toISOString(),
        createdat: plan.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };
      
      await saveAssessment(
        youthId,
        'plans',
        'successPlan',
        formattedData
      );
      
      setPlan(prev => ({
        ...prev,
        updatedAt: new Date()
      }));
      
      toast.success("Success plan saved");
    } catch (error) {
      console.error("Error saving success plan:", error);
      toast.error("Failed to save success plan");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleAddGoal = () => {
    const newGoal: Goal = {
      id: generateId(),
      title: "New Goal",
      description: "",
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'not-started',
      progress: 0,
      category: GOAL_CATEGORIES[0],
      steps: []
    };
    
    setPlan(prev => ({
      ...prev,
      goals: [...prev.goals, newGoal]
    }));
    
    setActiveGoalId(newGoal.id);
  };
  
  const handleDeleteGoal = (goalId: string) => {
    setPlan(prev => ({
      ...prev,
      goals: prev.goals.filter(goal => goal.id !== goalId)
    }));
    
    if (activeGoalId === goalId) {
      const remainingGoals = plan.goals.filter(goal => goal.id !== goalId);
      setActiveGoalId(remainingGoals.length > 0 ? remainingGoals[0].id : null);
    }
  };
  
  const handleUpdateGoal = (goalId: string, field: keyof Goal, value: any) => {
    setPlan(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === goalId 
          ? { ...goal, [field]: value } 
          : goal
      )
    }));
  };
  
  const handleAddStep = (goalId: string) => {
    const newStep: Step = {
      id: generateId(),
      description: "",
      completed: false
    };
    
    setPlan(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              steps: [...goal.steps, newStep] 
            } 
          : goal
      )
    }));
  };
  
  const handleUpdateStep = (goalId: string, stepId: string, field: keyof Step, value: any) => {
    setPlan(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              steps: goal.steps.map(step => 
                step.id === stepId 
                  ? { ...step, [field]: value } 
                  : step
              ) 
            } 
          : goal
      )
    }));
    
    // Update goal progress when step completion changes
    if (field === 'completed') {
      updateGoalProgress(goalId);
    }
  };
  
  const handleDeleteStep = (goalId: string, stepId: string) => {
    setPlan(prev => ({
      ...prev,
      goals: prev.goals.map(goal => 
        goal.id === goalId 
          ? { 
              ...goal, 
              steps: goal.steps.filter(step => step.id !== stepId) 
            } 
          : goal
      )
    }));
    
    // Update goal progress after deleting a step
    updateGoalProgress(goalId);
  };
  
  const updateGoalProgress = (goalId: string) => {
    setPlan(prev => {
      const updatedGoals = prev.goals.map(goal => {
        if (goal.id === goalId) {
          const totalSteps = goal.steps.length;
          const completedSteps = goal.steps.filter(step => step.completed).length;
          const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
          
          return {
            ...goal,
            progress
          };
        }
        return goal;
      });
      
      return {
        ...prev,
        goals: updatedGoals
      };
    });
  };
  
  const handleAddStrength = () => {
    if (newStrength.trim()) {
      setPlan(prev => ({
        ...prev,
        strengths: [...prev.strengths, newStrength.trim()]
      }));
      setNewStrength("");
    }
  };
  
  const handleRemoveStrength = (index: number) => {
    setPlan(prev => ({
      ...prev,
      strengths: prev.strengths.filter((_, i) => i !== index)
    }));
  };
  
  const handleAddSupport = () => {
    if (newSupport.trim()) {
      setPlan(prev => ({
        ...prev,
        supportNetwork: [...prev.supportNetwork, newSupport.trim()]
      }));
      setNewSupport("");
    }
  };
  
  const handleRemoveSupport = (index: number) => {
    setPlan(prev => ({
      ...prev,
      supportNetwork: prev.supportNetwork.filter((_, i) => i !== index)
    }));
  };
  
  const handleAddBarrier = () => {
    if (newBarrier.trim()) {
      setPlan(prev => ({
        ...prev,
        barriers: [...prev.barriers, newBarrier.trim()]
      }));
      setNewBarrier("");
    }
  };
  
  const handleRemoveBarrier = (index: number) => {
    setPlan(prev => ({
      ...prev,
      barriers: prev.barriers.filter((_, i) => i !== index)
    }));
  };
  
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPlan(prev => ({
      ...prev,
      notes: e.target.value
    }));
  };
  
  const handleDateChange = (field: 'lastReviewDate' | 'nextReviewDate', value: string) => {
    setPlan(prev => ({
      ...prev,
      [field]: new Date(value)
    }));
  };
  
  const formatDate = (date: Date) => {
    if (!date) return "";
    return date.toISOString().split('T')[0];
  };
  
  const getActiveGoal = () => {
    return plan.goals.find(goal => goal.id === activeGoalId) || null;
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in-progress': return 'bg-blue-500';
      case 'on-hold': return 'bg-yellow-500';
      default: return 'bg-gray-300';
    }
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
            Create and track goals, identify strengths and supports to help youth succeed.
          </p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm">
            <FileText size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export PDF
          </Button>
          <Button onClick={handleSavePlan} disabled={isSaving}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="strengths">Strengths & Supports</TabsTrigger>
          <TabsTrigger value="notes">Notes & Review</TabsTrigger>
        </TabsList>
        
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Goals</span>
                  <Button size="sm" variant="ghost" onClick={handleAddGoal}>
                    <Plus size={16} />
                  </Button>
                </CardTitle>
                <CardDescription>
                  {plan.goals.length} goal{plan.goals.length !== 1 ? 's' : ''} defined
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plan.goals.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No goals defined yet. Click the + button to add a goal.</p>
                  ) : (
                    plan.goals.map(goal => (
                      <div 
                        key={goal.id}
                        className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${activeGoalId === goal.id ? 'border-blue-500 bg-blue-50' : ''}`}
                        onClick={() => setActiveGoalId(goal.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{goal.title}</h4>
                            <p className="text-sm text-gray-500">{goal.category}</p>
                          </div>
                          <div className={`px-2 py-1 text-xs rounded-full text-white ${getStatusColor(goal.status)}`}>
                            {goal.status.replace('-', ' ')}
                          </div>
                        </div>
                        <Progress value={goal.progress} className="h-1 mt-2" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Goal Details</CardTitle>
                <CardDescription>
                  {getActiveGoal() ? 'Edit goal details and steps' : 'Select or create a goal'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!getActiveGoal() ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No goal selected</p>
                    <Button onClick={handleAddGoal}>
                      <Plus size={16} className="mr-2" />
                      Create New Goal
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="goalTitle">Goal Title</Label>
                        <Input 
                          id="goalTitle" 
                          value={getActiveGoal()?.title || ''}
                          onChange={(e) => handleUpdateGoal(activeGoalId!, 'title', e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="goalCategory">Category</Label>
                        <Select 
                          value={getActiveGoal()?.category || GOAL_CATEGORIES[0]}
                          onValueChange={(value) => handleUpdateGoal(activeGoalId!, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {GOAL_CATEGORIES.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="goalDescription">Description</Label>
                      <Textarea 
                        id="goalDescription" 
                        value={getActiveGoal()?.description || ''}
                        onChange={(e) => handleUpdateGoal(activeGoalId!, 'description', e.target.value)}
                        placeholder="Describe the goal in detail..."
                        rows={3}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="targetDate">Target Date</Label>
                        <Input 
                          id="targetDate" 
                          type="date"
                          value={formatDate(getActiveGoal()?.targetDate!)}
                          onChange={(e) => handleUpdateGoal(activeGoalId!, 'targetDate', new Date(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select 
                          value={getActiveGoal()?.status || 'not-started'}
                          onValueChange={(value) => handleUpdateGoal(activeGoalId!, 'status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not-started">Not Started</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Steps to Achieve Goal</Label>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleAddStep(activeGoalId!)}
                        >
                          <Plus size={14} className="mr-1" />
                          Add Step
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        {getActiveGoal()?.steps.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No steps defined yet. Add steps to track progress.</p>
                        ) : (
                          getActiveGoal()?.steps.map(step => (
                            <div key={step.id} className="flex items-start space-x-2 p-2 border rounded-md">
                              <Checkbox 
                                id={`step-${step.id}`}
                                checked={step.completed}
                                onCheckedChange={(checked) => 
                                  handleUpdateStep(activeGoalId!, step.id, 'completed', !!checked)
                                }
                                className="mt-1"
                              />
                              <div className="flex-1">
                                <Input 
                                  value={step.description}
                                  onChange={(e) => 
                                    handleUpdateStep(activeGoalId!, step.id, 'description', e.target.value)
                                  }
                                  placeholder="Describe this step..."
                                  className={step.completed ? "line-through text-gray-500" : ""}
                                />
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteStep(activeGoalId!, step.id)}
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {getActiveGoal() && (
                  <>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleDeleteGoal(activeGoalId!)}
                    >
                      Delete Goal
                    </Button>
                    <Button onClick={handleSavePlan} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Goal"}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="strengths" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Strengths & Abilities</CardTitle>
                <CardDescription>
                  Identify youth's strengths to build upon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input 
                      value={newStrength}
                      onChange={(e) => setNewStrength(e.target.value)}
                      placeholder="Add a strength..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddStrength}>Add</Button>
                  </div>
                  
                  <div className="space-y-2">
                    {plan.strengths.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No strengths added yet.</p>
                    ) : (
                      plan.strengths.map((strength, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <span>{strength}</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleRemoveStrength(index)}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Support Network</CardTitle>
                <CardDescription>
                  People and resources that can help
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input 
                      value={newSupport}
                      onChange={(e) => setNewSupport(e.target.value)}
                      placeholder="Add support person/resource..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddSupport}>Add</Button>
                  </div>
                  
                  <div className="space-y-2">
                    {plan.supportNetwork.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No supports added yet.</p>
                    ) : (
                      plan.supportNetwork.map((support, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <span>{support}</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleRemoveSupport(index)}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Barriers to Success</CardTitle>
                <CardDescription>
                  Challenges that need to be addressed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <Input 
                      value={newBarrier}
                      onChange={(e) => setNewBarrier(e.target.value)}
                      placeholder="Add a barrier..."
                      className="flex-1"
                    />
                    <Button onClick={handleAddBarrier}>Add</Button>
                  </div>
                  
                  <div className="space-y-2">
                    {plan.barriers.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No barriers added yet.</p>
                    ) : (
                      plan.barriers.map((barrier, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                          <span>{barrier}</span>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleRemoveBarrier(index)}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="notes" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Notes</CardTitle>
                <CardDescription>
                  Additional information about the success plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={plan.notes}
                  onChange={handleNotesChange}
                  placeholder="Enter any additional notes, observations, or context about this success plan..."
                  rows={8}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Review Schedule</CardTitle>
                <CardDescription>
                  Track when the plan was last reviewed and when it should be reviewed next
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="lastReviewDate">Last Review Date</Label>
                  <Input 
                    id="lastReviewDate" 
                    type="date"
                    value={formatDate(plan.lastReviewDate)}
                    onChange={(e) => handleDateChange('lastReviewDate', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="nextReviewDate">Next Review Date</Label>
                  <Input 
                    id="nextReviewDate" 
                    type="date"
                    value={formatDate(plan.nextReviewDate)}
                    onChange={(e) => handleDateChange('nextReviewDate', e.target.value)}
                  />
                </div>
                
                <div className="pt-4">
                  <Button onClick={handleSavePlan} className="w-full" disabled={isSaving}>
                    {isSaving ? "Saving Plan..." : "Save Success Plan"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
