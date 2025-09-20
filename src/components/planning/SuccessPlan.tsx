import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Download, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveAssessment, fetchAssessment } from "@/utils/local-storage-utils";

interface SuccessPlanProps {
  youthId: string;
  youth: any;
}

interface SuccessPlanData {
  id?: string;
  goals: Goal[];
  strengths: string;
  supportnetwork: Support[];
  resources: Resource[];
  challengestoaddress: string;
  createdat: string;
  updatedat: string;
}

interface Goal {
  title: string;
  description: string;
  timeline: string;
  resources: string;
  status: "Not Started" | "In Progress" | "Completed";
}

interface Support {
  name: string;
  relationship: string;
  contact: string;
  role: string;
}

interface Resource {
  name: string;
  type: string;
  details: string;
  contactInfo: string;
}

interface Plan {
  id?: string;
  goals: Goal[];
  strengths: string;
  supportNetwork: Support[];
  resources: Resource[];
  challengesToAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const EMPTY_GOAL: Goal = {
  title: "",
  description: "",
  timeline: "",
  resources: "",
  status: "Not Started"
};

const EMPTY_SUPPORT: Support = {
  name: "",
  relationship: "",
  contact: "",
  role: ""
};

const EMPTY_RESOURCE: Resource = {
  name: "",
  type: "",
  details: "",
  contactInfo: ""
};

export const SuccessPlan = ({ youthId, youth }: SuccessPlanProps) => {
  const [plan, setPlan] = useState<Plan>({
    goals: [{ ...EMPTY_GOAL }],
    strengths: "",
    supportNetwork: [{ ...EMPTY_SUPPORT }],
    resources: [{ ...EMPTY_RESOURCE }],
    challengesToAddress: "",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("goals");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  useEffect(() => {
    fetchPlan();
  }, [youthId]);

  // Auto-save functionality
  const autoSave = useCallback(async (planData: Plan) => {
    try {
      setIsSaving(true);
      
      const formattedData = {
        goals: planData.goals,
        strengths: planData.strengths,
        supportnetwork: planData.supportNetwork,
        resources: planData.resources,
        challengestoaddress: planData.challengesToAddress,
        createdat: planData.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };
      
      await saveAssessment(
        youthId,
        'successplans',
        'successPlan',
        formattedData
      );
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error auto-saving success plan:", error);
    } finally {
      setIsSaving(false);
    }
  }, [youthId]);

  // Auto-save when plan changes (except during initial load)
  useEffect(() => {
    if (!isLoading && hasUnsavedChanges) {
      autoSave(plan);
    }
  }, [plan, autoSave, isLoading, hasUnsavedChanges]);
  
  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      
      // Changed 'plans' to 'successplans' to match the AssessmentTable type
      const planData = await fetchAssessment(youthId, 'successplans', 'successPlan') as SuccessPlanData | null;
      
      if (planData) {
        setPlan({
          id: planData.id,
          goals: planData.goals || [{ ...EMPTY_GOAL }],
          strengths: planData.strengths || "",
          supportNetwork: planData.supportnetwork || [{ ...EMPTY_SUPPORT }],
          resources: planData.resources || [{ ...EMPTY_RESOURCE }],
          challengesToAddress: planData.challengestoaddress || "",
          createdAt: planData.createdat ? new Date(planData.createdat) : new Date(),
          updatedAt: planData.updatedat ? new Date(planData.updatedat) : new Date()
        });
      } else {
        // Initialize with default if no plan exists
        setPlan({
          goals: [{ ...EMPTY_GOAL }],
          strengths: "",
          supportNetwork: [{ ...EMPTY_SUPPORT }],
          resources: [{ ...EMPTY_RESOURCE }],
          challengesToAddress: "",
          createdAt: new Date(),
          updatedAt: new Date()
        });
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
        resources: plan.resources,
        challengestoaddress: plan.challengesToAddress,
        createdat: plan.createdAt.toISOString(),
        updatedat: new Date().toISOString()
      };
      
      // Changed 'plans' to 'successplans' to match the AssessmentTable type
      await saveAssessment(
        youthId,
        'successplans',
        'successPlan',
        formattedData
      );
      
      toast.success("Success plan saved successfully");
    } catch (error) {
      console.error("Error saving success plan:", error);
      toast.error("Failed to save success plan");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGoalChange = (index: number, field: keyof Goal, value: string) => {
    const updatedGoals = [...plan.goals];
    updatedGoals[index] = {
      ...updatedGoals[index],
      [field]: value
    };
    setPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
    setHasUnsavedChanges(true);
  };
  
  const addGoal = () => {
    setPlan(prev => ({
      ...prev,
      goals: [...prev.goals, { ...EMPTY_GOAL }]
    }));
    setHasUnsavedChanges(true);
  };
  
  const removeGoal = (index: number) => {
    const updatedGoals = [...plan.goals];
    updatedGoals.splice(index, 1);
    setPlan(prev => ({
      ...prev,
      goals: updatedGoals
    }));
    setHasUnsavedChanges(true);
  };
  
  const handleSupportChange = (index: number, field: keyof Support, value: string) => {
    const updatedSupport = [...plan.supportNetwork];
    updatedSupport[index] = {
      ...updatedSupport[index],
      [field]: value
    };
    setPlan(prev => ({
      ...prev,
      supportNetwork: updatedSupport
    }));
    setHasUnsavedChanges(true);
  };
  
  const addSupport = () => {
    setPlan(prev => ({
      ...prev,
      supportNetwork: [...prev.supportNetwork, { ...EMPTY_SUPPORT }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeSupport = (index: number) => {
    const updatedSupport = [...plan.supportNetwork];
    updatedSupport.splice(index, 1);
    setPlan(prev => ({
      ...prev,
      supportNetwork: updatedSupport
    }));
    setHasUnsavedChanges(true);
  };
  
  const handleResourceChange = (index: number, field: keyof Resource, value: string) => {
    const updatedResources = [...plan.resources];
    updatedResources[index] = {
      ...updatedResources[index],
      [field]: value
    };
    setPlan(prev => ({
      ...prev,
      resources: updatedResources
    }));
    setHasUnsavedChanges(true);
  };

  const addResource = () => {
    setPlan(prev => ({
      ...prev,
      resources: [...prev.resources, { ...EMPTY_RESOURCE }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeResource = (index: number) => {
    const updatedResources = [...plan.resources];
    updatedResources.splice(index, 1);
    setPlan(prev => ({
      ...prev,
      resources: updatedResources
    }));
    setHasUnsavedChanges(true);
  };
  
  const handleInputChange = (field: keyof Plan, value: string) => {
    setPlan(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };
  
  const handlePrintPlan = () => {
    window.print();
  };
  
  const handleExportPdf = async () => {
    try {
      const { exportHTMLToPDF } = await import('@/utils/export');
      const { format } = await import('date-fns');

      const exportData = {
        youth: youth,
        plan: plan,
        exportDate: new Date().toLocaleDateString()
      };

      const html = generateSuccessPlanHTML(exportData);
      const filename = `${youth.firstName}_${youth.lastName}_Success_Plan_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast.success("Success plan exported successfully!");
    } catch (error) {
      console.error("Error exporting success plan:", error);
      toast.error("Failed to export success plan");
    }
  };

  const generateSuccessPlanHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Success Plan Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .youth-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .section { margin-bottom: 30px; }
            .section-title { font-weight: bold; font-size: 18px; margin-bottom: 15px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            .goal-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; background-color: #f9f9f9; }
            .goal-title { font-weight: bold; font-size: 16px; margin-bottom: 10px; color: #333; }
            .support-item { margin-bottom: 15px; padding: 10px; border-left: 4px solid #3b82f6; background-color: #eff6ff; }
            .resource-item { margin-bottom: 15px; padding: 10px; border-left: 4px solid #10b981; background-color: #ecfdf5; }
            .field { margin-bottom: 8px; }
            .field-label { font-weight: bold; color: #555; }
            .field-value { margin-left: 10px; }
            .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
            .status-not-started { background-color: #fee2e2; color: #991b1b; }
            .status-in-progress { background-color: #fef3c7; color: #92400e; }
            .status-completed { background-color: #dcfce7; color: #166534; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Heartland Care Compass</h1>
            <h2>Success Plan Report</h2>
            <p>Generated on ${data.exportDate}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${data.youth.firstName} ${data.youth.lastName}</p>
            <p><strong>Date of Birth:</strong> ${data.youth.dateOfBirth || 'Not specified'}</p>
            <p><strong>Current Level:</strong> ${data.youth.currentLevel || 'Not specified'}</p>
          </div>

          <div class="section">
            <div class="section-title">Goals</div>
            ${data.plan.goals.map((goal: any, index: number) => `
              <div class="goal-item">
                <div class="goal-title">Goal ${index + 1}: ${goal.title || 'Untitled Goal'}</div>
                <div class="field">
                  <span class="field-label">Description:</span>
                  <span class="field-value">${goal.description || 'No description provided'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Timeline:</span>
                  <span class="field-value">${goal.timeline || 'Not specified'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Resources:</span>
                  <span class="field-value">${goal.resources || 'Not specified'}</span>
                </div>
                <div class="field">
                  <span class="field-label">Status:</span>
                  <span class="status-badge status-${goal.status.toLowerCase().replace(' ', '-')}">${goal.status}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <div class="section-title">Strengths</div>
            <p>${data.plan.strengths || 'No strengths identified'}</p>
          </div>

          <div class="section">
            <div class="section-title">Support Network</div>
            ${data.plan.supportNetwork && data.plan.supportNetwork.length > 0 ?
              data.plan.supportNetwork.map((support: any) => `
                <div class="support-item">
                  <div class="field">
                    <span class="field-label">Name:</span>
                    <span class="field-value">${support.name || 'Not specified'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Relationship:</span>
                    <span class="field-value">${support.relationship || 'Not specified'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Contact:</span>
                    <span class="field-value">${support.contact || 'Not specified'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Role:</span>
                    <span class="field-value">${support.role || 'Not specified'}</span>
                  </div>
                </div>
              `).join('') :
              '<p>No support network members identified</p>'
            }
          </div>

          <div class="section">
            <div class="section-title">Resources</div>
            ${data.plan.resources && data.plan.resources.length > 0 ?
              data.plan.resources.map((resource: any) => `
                <div class="resource-item">
                  <div class="field">
                    <span class="field-label">Name:</span>
                    <span class="field-value">${resource.name || 'Not specified'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Type:</span>
                    <span class="field-value">${resource.type || 'Not specified'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Details:</span>
                    <span class="field-value">${resource.details || 'Not specified'}</span>
                  </div>
                  <div class="field">
                    <span class="field-label">Contact Info:</span>
                    <span class="field-value">${resource.contactInfo || 'Not specified'}</span>
                  </div>
                </div>
              `).join('') :
              '<p>No resources identified</p>'
            }
          </div>

          <div class="section">
            <div class="section-title">Challenges to Address</div>
            <p>${data.plan.challengesToAddress || 'No challenges identified'}</p>
          </div>
        </body>
      </html>
    `;
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
            Outline goals, strengths, support network, and resources to foster youth success.
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
          <Button onClick={handleSavePlan} disabled={isSaving} variant={hasUnsavedChanges ? "default" : "outline"}>
            <Save size={16} className="mr-2" />
            {isSaving ? "Auto-saving..." : hasUnsavedChanges ? "Save" : "Saved"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Driver Program - Success Plan</CardTitle>
          <CardDescription>
            Document goals, strengths, support network, and resources for the youth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="goals">Goals</TabsTrigger>
              <TabsTrigger value="strengths">Strengths</TabsTrigger>
              <TabsTrigger value="support">Support Network</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="challenges">Challenges</TabsTrigger>
            </TabsList>
            
            <TabsContent value="goals">
              <div className="space-y-4">
                {plan.goals.map((goal, index) => (
                  <div key={index} className="p-4 border rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Goal {index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`goal-${index}-title`}>Title</Label>
                        <Input
                          type="text"
                          id={`goal-${index}-title`}
                          value={goal.title}
                          onChange={(e) => handleGoalChange(index, "title", e.target.value)}
                          placeholder="Goal title"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`goal-${index}-timeline`}>Timeline</Label>
                        <Input
                          type="text"
                          id={`goal-${index}-timeline`}
                          value={goal.timeline}
                          onChange={(e) => handleGoalChange(index, "timeline", e.target.value)}
                          placeholder="Timeline"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`goal-${index}-description`}>Description</Label>
                      <Textarea
                        id={`goal-${index}-description`}
                        value={goal.description}
                        onChange={(e) => handleGoalChange(index, "description", e.target.value)}
                        placeholder="Description"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`goal-${index}-resources`}>Resources Needed</Label>
                      <Input
                        type="text"
                        id={`goal-${index}-resources`}
                        value={goal.resources}
                        onChange={(e) => handleGoalChange(index, "resources", e.target.value)}
                        placeholder="Resources needed"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`goal-${index}-status`}>Status</Label>
                      <Input
                        type="text"
                        id={`goal-${index}-status`}
                        value={goal.status}
                        onChange={(e) => handleGoalChange(index, "status", e.target.value)}
                        placeholder="Status"
                      />
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-500 hover:bg-red-50"
                      onClick={() => removeGoal(index)}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Remove Goal
                    </Button>
                  </div>
                ))}
                
                <Button type="button" variant="outline" onClick={addGoal}>
                  <Plus size={16} className="mr-2" />
                  Add New Goal
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="strengths">
              <div>
                <Label htmlFor="strengths">Youth Strengths & Protective Factors</Label>
                <Textarea
                  id="strengths"
                  value={plan.strengths}
                  onChange={(e) => handleInputChange("strengths", e.target.value)}
                  placeholder="Note positive attributes, skills, supports, and protective factors..."
                  rows={5}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="support">
              <div className="space-y-4">
                {plan.supportNetwork.map((support, index) => (
                  <div key={index} className="p-4 border rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Support Person {index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`support-${index}-name`}>Name</Label>
                        <Input
                          type="text"
                          id={`support-${index}-name`}
                          value={support.name}
                          onChange={(e) => handleSupportChange(index, "name", e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`support-${index}-relationship`}>Relationship</Label>
                        <Input
                          type="text"
                          id={`support-${index}-relationship`}
                          value={support.relationship}
                          onChange={(e) => handleSupportChange(index, "relationship", e.target.value)}
                          placeholder="Relationship"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`support-${index}-contact`}>Contact Info</Label>
                        <Input
                          type="text"
                          id={`support-${index}-contact`}
                          value={support.contact}
                          onChange={(e) => handleSupportChange(index, "contact", e.target.value)}
                          placeholder="Contact Info"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`support-${index}-role`}>Role</Label>
                        <Input
                          type="text"
                          id={`support-${index}-role`}
                          value={support.role}
                          onChange={(e) => handleSupportChange(index, "role", e.target.value)}
                          placeholder="Role"
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-500 hover:bg-red-50"
                      onClick={() => removeSupport(index)}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Remove Support
                    </Button>
                  </div>
                ))}
                
                <Button type="button" variant="outline" onClick={addSupport}>
                  <Plus size={16} className="mr-2" />
                  Add New Support
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="resources">
              <div className="space-y-4">
                {plan.resources.map((resource, index) => (
                  <div key={index} className="p-4 border rounded-md bg-gray-50">
                    <h3 className="text-lg font-medium mb-4">Resource {index + 1}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`resource-${index}-name`}>Name</Label>
                        <Input
                          type="text"
                          id={`resource-${index}-name`}
                          value={resource.name}
                          onChange={(e) => handleResourceChange(index, "name", e.target.value)}
                          placeholder="Name"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`resource-${index}-type`}>Type</Label>
                        <Input
                          type="text"
                          id={`resource-${index}-type`}
                          value={resource.type}
                          onChange={(e) => handleResourceChange(index, "type", e.target.value)}
                          placeholder="Type"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor={`resource-${index}-details`}>Details</Label>
                      <Textarea
                        id={`resource-${index}-details`}
                        value={resource.details}
                        onChange={(e) => handleResourceChange(index, "details", e.target.value)}
                        placeholder="Details"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`resource-${index}-contactInfo`}>Contact Info</Label>
                      <Input
                        type="text"
                        id={`resource-${index}-contactInfo`}
                        value={resource.contactInfo}
                        onChange={(e) => handleResourceChange(index, "contactInfo", e.target.value)}
                        placeholder="Contact Info"
                      />
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-500 hover:bg-red-50"
                      onClick={() => removeResource(index)}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Remove Resource
                    </Button>
                  </div>
                ))}
                
                <Button type="button" variant="outline" onClick={addResource}>
                  <Plus size={16} className="mr-2" />
                  Add New Resource
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="challenges">
              <div>
                <Label htmlFor="challenges">Challenges to Address</Label>
                <Textarea
                  id="challenges"
                  value={plan.challengesToAddress}
                  onChange={(e) => handleInputChange("challengesToAddress", e.target.value)}
                  placeholder="List challenges to address..."
                  rows={5}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Reset Form</Button>
          <Button onClick={handleSavePlan} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Plan"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
