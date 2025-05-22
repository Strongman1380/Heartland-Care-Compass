import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AddYouthDialogProps {
  onClose: () => void;
}

export const AddYouthDialog = ({ onClose }: AddYouthDialogProps) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    dob: "",
    admissionDate: new Date().toISOString().split('T')[0],
    level: "1",
    legalGuardian: "",
    guardianRelationship: "",
    guardianPhone: "",
    guardianEmail: "",
    probationOfficer: "",
    probationPhone: "",
    placementAuthority: "DHHS",
    estimatedStay: "3-6 months",

    // Placement Background
    referralReason: "",
    priorPlacements: [] as string[],
    numPriorPlacements: "",
    lengthRecentPlacement: "",
    courtInvolvement: [] as string[],
    
    // Education
    currentSchool: "",
    grade: "",
    hasIEP: false,
    academicStrengths: "",
    academicChallenges: "",
    educationGoals: "",
    schoolContact: "",
    schoolPhone: "",
    
    // Medical
    physician: "",
    physicianPhone: "",
    insuranceProvider: "",
    policyNumber: "",
    allergies: "",
    medications: [] as {name: string, dosage: string, frequency: string, purpose: string, startDate: string, prescriber: string}[],
    medicalConditions: "",
    medicalRestrictions: "",
    
    // Mental Health
    diagnoses: "",
    traumaHistory: [] as string[],
    previousTreatment: "",
    currentCounseling: [] as string[],
    therapistName: "",
    therapistContact: "",
    sessionFrequency: "Weekly",
    sessionTime: "",
    selfHarmHistory: "None",
    selfHarmDate: "",
    safetyPlan: false,
    
    // Risk Assessment
    riskLevel: "Low",
    riskScore: "",
    criminogenicNeeds: "",
    
    // Strengths
    personalStrengths: "",
    talents: "",
    interests: "",
    careerInterests: "",
    spiritualPreferences: "",
    
    // Social Network
    familyVisitation: "Yes",
    approvedVisitors: [] as {name: string, relationship: string, contact: string, calls: boolean, visits: boolean}[],
    restrictedContacts: "",
    
    // Treatment Goals
    goals: [] as {goal: string, objectives: string, measures: string}[],
    
    // Other fields
    referralSource: "",
    educationInfo: "",
    medicalInfo: "",
    mentalHealthInfo: "",
    legalStatus: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleArrayItemChange = (arrayName: string, index: number, field: string, value: any) => {
    setFormData(prev => {
      const array = [...prev[arrayName as keyof typeof prev] as any[]];
      array[index] = { ...array[index], [field]: value };
      return { ...prev, [arrayName]: array };
    });
  };

  const addArrayItem = (arrayName: string, item: any) => {
    setFormData(prev => {
      const array = [...(prev[arrayName as keyof typeof prev] as any[] || []), item];
      return { ...prev, [arrayName]: array };
    });
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (
      today.getMonth() < dob.getMonth() ||
      (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
    ) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const age = calculateAge(formData.dob);
      
      // Create a consolidated education, medical, and mental health info for database storage
      const educationInfo = `
School: ${formData.currentSchool}
Grade: ${formData.grade}
IEP: ${formData.hasIEP ? 'Yes' : 'No'}
Strengths: ${formData.academicStrengths}
Challenges: ${formData.academicChallenges}
Goals: ${formData.educationGoals}
Contact: ${formData.schoolContact} (${formData.schoolPhone})
      `.trim();
      
      const medicalInfo = `
Physician: ${formData.physician} (${formData.physicianPhone})
Insurance: ${formData.insuranceProvider} (${formData.policyNumber})
Allergies: ${formData.allergies}
Conditions: ${formData.medicalConditions}
Restrictions: ${formData.medicalRestrictions}
      `.trim();
      
      const mentalHealthInfo = `
Diagnoses: ${formData.diagnoses}
Trauma History: ${formData.traumaHistory.join(', ')}
Previous Treatment: ${formData.previousTreatment}
Current Counseling: ${formData.currentCounseling.join(', ')}
Therapist: ${formData.therapistName} (${formData.therapistContact})
Self-Harm History: ${formData.selfHarmHistory}
      `.trim();
      
      const legalStatus = `
Placement Authority: ${formData.placementAuthority}
Court Involvement: ${formData.courtInvolvement.join(', ')}
Probation Officer: ${formData.probationOfficer} (${formData.probationPhone})
Guardian: ${formData.legalGuardian} (${formData.guardianRelationship})
Guardian Contact: ${formData.guardianPhone}, ${formData.guardianEmail}
      `.trim();
      
      const youthData = {
        firstname: formData.firstName,
        lastname: formData.lastName,
        dob: formData.dob ? new Date(formData.dob).toISOString() : null,
        age: age,
        admissiondate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : new Date().toISOString(),
        level: parseInt(formData.level, 10),
        pointtotal: 0,
        referralsource: formData.referralSource || formData.referralReason,
        referralreason: formData.referralReason,
        educationinfo: educationInfo,
        medicalinfo: medicalInfo,
        mentalhealthinfo: mentalHealthInfo,
        legalstatus: legalStatus,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('youths')
        .insert(youthData)
        .select();
        
      if (error) {
        throw error;
      }

      // Consider storing the additional information in a separate table in the future
      // For now, we've consolidated into the existing fields
      
      toast.success("Youth profile added successfully");
      onClose();
    } catch (error) {
      console.error("Error adding youth:", error);
      toast.error("Failed to add youth profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tab navigation
  const tabs = [
    { id: "personal", label: "Personal" },
    { id: "background", label: "Background" },
    { id: "education", label: "Education" },
    { id: "medical", label: "Medical" },
    { id: "mental", label: "Mental Health" },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Youth</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
            
            {/* Personal Information Tab */}
            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="firstName" 
                    name="firstName" 
                    value={formData.firstName} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                  <Input 
                    id="lastName" 
                    name="lastName" 
                    value={formData.lastName} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input 
                    id="dob" 
                    name="dob" 
                    type="date" 
                    value={formData.dob} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admissionDate">Admission Date</Label>
                  <Input 
                    id="admissionDate" 
                    name="admissionDate" 
                    type="date" 
                    value={formData.admissionDate} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="level">Initial Level</Label>
                  <Select name="level" defaultValue={formData.level} onValueChange={value => handleSelectChange("level", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1</SelectItem>
                      <SelectItem value="2">Level 2</SelectItem>
                      <SelectItem value="3">Level 3</SelectItem>
                      <SelectItem value="4">Level 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="legalGuardian">Legal Guardian</Label>
                  <Input 
                    id="legalGuardian" 
                    name="legalGuardian" 
                    value={formData.legalGuardian} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guardianRelationship">Relationship</Label>
                  <Input 
                    id="guardianRelationship" 
                    name="guardianRelationship" 
                    value={formData.guardianRelationship} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Guardian Contact Phone</Label>
                  <Input 
                    id="guardianPhone" 
                    name="guardianPhone" 
                    value={formData.guardianPhone} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Guardian Email</Label>
                  <Input 
                    id="guardianEmail" 
                    name="guardianEmail" 
                    type="email" 
                    value={formData.guardianEmail} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="probationOfficer">Probation Officer</Label>
                  <Input 
                    id="probationOfficer" 
                    name="probationOfficer" 
                    value={formData.probationOfficer} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="probationPhone">Probation Officer Contact</Label>
                  <Input 
                    id="probationPhone" 
                    name="probationPhone" 
                    value={formData.probationPhone} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Placement Authority</Label>
                  <Select name="placementAuthority" defaultValue={formData.placementAuthority} onValueChange={value => handleSelectChange("placementAuthority", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select authority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DHHS">DHHS</SelectItem>
                      <SelectItem value="Probation">Probation</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Estimated Length of Stay</Label>
                  <Select name="estimatedStay" defaultValue={formData.estimatedStay} onValueChange={value => handleSelectChange("estimatedStay", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3-6 months">3-6 months</SelectItem>
                      <SelectItem value="6-9 months">6-9 months</SelectItem>
                      <SelectItem value="9-12 months">9-12 months</SelectItem>
                      <SelectItem value="12+ months">12+ months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            {/* Background Tab */}
            <TabsContent value="background" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="referralReason">Reason for Referral</Label>
                <Textarea 
                  id="referralReason" 
                  name="referralReason" 
                  value={formData.referralReason} 
                  onChange={handleChange} 
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Prior Placements</Label>
                <div className="flex flex-wrap gap-4">
                  {["None", "Foster Care", "Group Home", "Detention", "Treatment Facility"].map((placement) => (
                    <div key={placement} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`placement-${placement}`}
                        checked={formData.priorPlacements.includes(placement)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev, 
                              priorPlacements: [...prev.priorPlacements, placement]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev, 
                              priorPlacements: prev.priorPlacements.filter(p => p !== placement)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`placement-${placement}`}>{placement}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numPriorPlacements">Number of Prior Placements</Label>
                  <Input 
                    id="numPriorPlacements" 
                    name="numPriorPlacements" 
                    type="number"
                    value={formData.numPriorPlacements} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="lengthRecentPlacement">Length of Most Recent Placement</Label>
                  <Input 
                    id="lengthRecentPlacement" 
                    name="lengthRecentPlacement" 
                    value={formData.lengthRecentPlacement} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Court Involvement</Label>
                <div className="flex flex-wrap gap-4">
                  {["Status Offense", "Delinquency", "Dependency/Neglect", "Voluntary"].map((involvement) => (
                    <div key={involvement} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`involvement-${involvement}`}
                        checked={formData.courtInvolvement.includes(involvement)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev, 
                              courtInvolvement: [...prev.courtInvolvement, involvement]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev, 
                              courtInvolvement: prev.courtInvolvement.filter(i => i !== involvement)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`involvement-${involvement}`}>{involvement}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentSchool">Current School</Label>
                  <Input 
                    id="currentSchool" 
                    name="currentSchool" 
                    value={formData.currentSchool} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input 
                    id="grade" 
                    name="grade" 
                    value={formData.grade} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hasIEP" 
                  checked={formData.hasIEP}
                  onCheckedChange={(checked) => {
                    handleCheckboxChange("hasIEP", checked === true);
                  }}
                />
                <Label htmlFor="hasIEP">Has IEP</Label>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="academicStrengths">Academic Strengths</Label>
                <Textarea 
                  id="academicStrengths" 
                  name="academicStrengths" 
                  value={formData.academicStrengths} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="academicChallenges">Academic Challenges</Label>
                <Textarea 
                  id="academicChallenges" 
                  name="academicChallenges" 
                  value={formData.academicChallenges} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="educationGoals">Educational Goals</Label>
                <Textarea 
                  id="educationGoals" 
                  name="educationGoals" 
                  value={formData.educationGoals} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolContact">School Contact Person</Label>
                  <Input 
                    id="schoolContact" 
                    name="schoolContact" 
                    value={formData.schoolContact} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">School Phone</Label>
                  <Input 
                    id="schoolPhone" 
                    name="schoolPhone" 
                    value={formData.schoolPhone} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
            </TabsContent>

            {/* Medical Tab */}
            <TabsContent value="medical" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="physician">Primary Physician</Label>
                  <Input 
                    id="physician" 
                    name="physician" 
                    value={formData.physician} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="physicianPhone">Physician Phone</Label>
                  <Input 
                    id="physicianPhone" 
                    name="physicianPhone" 
                    value={formData.physicianPhone} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input 
                    id="insuranceProvider" 
                    name="insuranceProvider" 
                    value={formData.insuranceProvider} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="policyNumber">Policy #</Label>
                  <Input 
                    id="policyNumber" 
                    name="policyNumber" 
                    value={formData.policyNumber} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="allergies">Allergies</Label>
                <Input 
                  id="allergies" 
                  name="allergies" 
                  value={formData.allergies} 
                  onChange={handleChange} 
                  placeholder="List allergies or type 'None'"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medicalConditions">Medical Conditions</Label>
                <Textarea 
                  id="medicalConditions" 
                  name="medicalConditions" 
                  value={formData.medicalConditions} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="medicalRestrictions">Medical Restrictions</Label>
                <Textarea 
                  id="medicalRestrictions" 
                  name="medicalRestrictions" 
                  value={formData.medicalRestrictions} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
            </TabsContent>

            {/* Mental Health Tab */}
            <TabsContent value="mental" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="diagnoses">Current Diagnoses</Label>
                <Textarea 
                  id="diagnoses" 
                  name="diagnoses" 
                  value={formData.diagnoses} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Trauma History</Label>
                <div className="flex flex-wrap gap-4">
                  {["None", "Physical Abuse", "Sexual Abuse", "Neglect", "Witness to Violence", "Other"].map((trauma) => (
                    <div key={trauma} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`trauma-${trauma}`}
                        checked={formData.traumaHistory.includes(trauma)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev, 
                              traumaHistory: [...prev.traumaHistory, trauma]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev, 
                              traumaHistory: prev.traumaHistory.filter(t => t !== trauma)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`trauma-${trauma}`}>{trauma}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="previousTreatment">Previous Treatment</Label>
                <Textarea 
                  id="previousTreatment" 
                  name="previousTreatment" 
                  value={formData.previousTreatment} 
                  onChange={handleChange} 
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Current Counseling</Label>
                <div className="flex flex-wrap gap-4">
                  {["Individual", "Group", "Family", "None"].map((therapy) => (
                    <div key={therapy} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`therapy-${therapy}`}
                        checked={formData.currentCounseling.includes(therapy)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData(prev => ({
                              ...prev, 
                              currentCounseling: [...prev.currentCounseling, therapy]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev, 
                              currentCounseling: prev.currentCounseling.filter(t => t !== therapy)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`therapy-${therapy}`}>{therapy}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="therapistName">Therapist Name</Label>
                  <Input 
                    id="therapistName" 
                    name="therapistName" 
                    value={formData.therapistName} 
                    onChange={handleChange} 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="therapistContact">Therapist Contact</Label>
                  <Input 
                    id="therapistContact" 
                    name="therapistContact" 
                    value={formData.therapistContact} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Frequency</Label>
                  <Select name="sessionFrequency" defaultValue={formData.sessionFrequency} onValueChange={value => handleSelectChange("sessionFrequency", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly</SelectItem>
                      <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sessionTime">Day/Time</Label>
                  <Input 
                    id="sessionTime" 
                    name="sessionTime" 
                    value={formData.sessionTime} 
                    onChange={handleChange} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Self-Harm History</Label>
                <Select name="selfHarmHistory" defaultValue={formData.selfHarmHistory} onValueChange={value => handleSelectChange("selfHarmHistory", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select history" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    <SelectItem value="Ideation">Ideation</SelectItem>
                    <SelectItem value="Attempts">Attempts</SelectItem>
                  </SelectContent>
                </Select>
                
                {formData.selfHarmHistory !== "None" && (
                  <div className="mt-2">
                    <Label htmlFor="selfHarmDate">Date of Last Incident</Label>
                    <Input 
                      id="selfHarmDate" 
                      name="selfHarmDate" 
                      type="date"
                      value={formData.selfHarmDate} 
                      onChange={handleChange} 
                    />
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="safetyPlan" 
                  checked={formData.safetyPlan}
                  onCheckedChange={(checked) => {
                    handleCheckboxChange("safetyPlan", checked === true);
                  }}
                />
                <Label htmlFor="safetyPlan">Safety Plan in Place</Label>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>* Required fields. Other fields can be filled later in the youth's profile.</p>
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Youth"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
