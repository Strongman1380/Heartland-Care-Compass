import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useYouthForm } from "@/hooks/useYouthForm";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { BackgroundTab } from "./BackgroundTab";
import { EducationTab } from "./EducationTab";
import { MedicalTab } from "./MedicalTab";
import { MentalHealthTab } from "./MentalHealthTab";

interface AddYouthDialogProps {
  onClose: () => void;
}

export const AddYouthDialog = ({ onClose }: AddYouthDialogProps) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    formData,
    setFormData,
    handleChange,
    handleSelectChange,
    handleCheckboxChange,
    handleArrayItemChange,
    addArrayItem,
  } = useYouthForm();

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
Diagnoses: ${formData.currentDiagnoses}
Trauma History: ${formData.traumaHistory.join(', ')}
Previous Treatment: ${formData.previousTreatment}
Current Counseling: ${formData.currentCounseling.join(', ')}
Therapist: ${formData.therapistName} (${formData.therapistContact})
Self-Harm History: ${formData.selfHarmHistory.join(', ')}
      `.trim();
      
      const legalStatus = `
Placement Authority: ${formData.placementAuthority.join(', ')}
Court Involvement: ${formData.courtInvolvement.join(', ')}
Probation Officer: ${formData.probationOfficer} (${formData.probationContact})
Guardian: ${formData.legalGuardian} (${formData.guardianRelationship})
Guardian Contact: ${formData.guardianContact}, ${formData.guardianEmail}
      `.trim();
      
      const youthData = {
        firstname: formData.firstName,
        lastname: formData.lastName,
        dob: formData.dob ? new Date(formData.dob).toISOString() : null,
        age: age,
        admissiondate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : new Date().toISOString(),
        level: parseInt(formData.level, 10) || 1,
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
            
            <TabsContent value="personal">
              <PersonalInfoTab 
                formData={formData}
                handleChange={handleChange}
                handleSelectChange={handleSelectChange}
              />
            </TabsContent>

            <TabsContent value="background">
              <BackgroundTab 
                formData={formData}
                handleChange={handleChange}
                setFormData={setFormData}
              />
            </TabsContent>

            <TabsContent value="education">
              <EducationTab 
                formData={formData}
                handleChange={handleChange}
                handleCheckboxChange={handleCheckboxChange}
              />
            </TabsContent>

            <TabsContent value="medical">
              <MedicalTab 
                formData={formData}
                handleChange={handleChange}
              />
            </TabsContent>

            <TabsContent value="mental">
              <MentalHealthTab 
                formData={formData}
                handleChange={handleChange}
                handleCheckboxChange={handleCheckboxChange}
              />
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
