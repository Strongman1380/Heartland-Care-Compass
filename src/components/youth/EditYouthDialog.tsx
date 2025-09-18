
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/supabase/services";
import { useYouthForm, YouthFormData } from "@/hooks/useYouthForm";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { BackgroundTab } from "./BackgroundTab";
import { EducationTab } from "./EducationTab";
import { MedicalTab } from "./MedicalTab";
import { MentalHealthTab } from "./MentalHealthTab";
import { format } from "date-fns";

interface EditYouthDialogProps {
  youth: Youth;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditYouthDialog = ({ youth, open, onClose, onSuccess }: EditYouthDialogProps) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Use Supabase hook for youth operations
  const { updateYouth } = useYouth();
  
  const {
    formData,
    setFormData,
    handleChange,
    handleSelectChange,
    handleCheckboxChange,
    handleArrayItemChange,
    addArrayItem,
  } = useYouthForm();

  // Populate form data when youth changes
  useEffect(() => {
    if (youth && open) {
      const populatedData: YouthFormData = {
        // Personal Information
        firstName: youth.firstName || "",
        lastName: youth.lastName || "",
        dob: youth.dob ? format(youth.dob, 'yyyy-MM-dd') : "",
        age: youth.age?.toString() || "",
        idNumber: youth.idNumber || "",
        admissionDate: youth.admissionDate ? format(youth.admissionDate, 'yyyy-MM-dd') : "",
        currentLevel: youth.level || 1,
        level: youth.level?.toString() || "1",
        legalGuardian: youth.legalGuardian || "",
        guardianRelationship: youth.guardianRelationship || "",
        guardianContact: youth.guardianContact || "",
        guardianPhone: youth.guardianPhone || "",
        guardianEmail: youth.guardianEmail || "",
        probationOfficer: youth.probationOfficer || "",
        probationContact: youth.probationContact || "",
        probationPhone: youth.probationPhone || "",
        placementAuthority: youth.placementAuthority ? [youth.placementAuthority] : [],
        estimatedStay: youth.estimatedStay || "",
        referralSource: youth.referralSource || "",
        
        // Additional personal details
        sex: youth.sex || "",
        race: youth.race || "",
        religion: youth.religion || "",
        placeOfBirth: youth.placeOfBirth || "",
        socialSecurityNumber: youth.socialSecurityNumber || "",
        address: youth.address ? 
          `${youth.address.street || ""}, ${youth.address.city || ""}, ${youth.address.state || ""} ${youth.address.zip || ""}`.trim().replace(/^,\s*|,\s*$/g, '') : "",
        height: youth.physicalDescription?.height || "",
        weight: youth.physicalDescription?.weight || "",
        hairColor: youth.physicalDescription?.hairColor || "",
        eyeColor: youth.physicalDescription?.eyeColor || "",
        tattoosScars: youth.physicalDescription?.tattoosScars || "",
        
        // Background Information
        referralReason: youth.referralReason || "",
        priorPlacements: youth.priorPlacements || [],
        numPriorPlacements: youth.numPriorPlacements || "",
        lengthRecentPlacement: youth.lengthRecentPlacement || "",
        courtInvolvement: youth.courtInvolvement || [],
        
        // Education Information - parse from educationInfo string if available
        currentSchool: youth.currentSchool || "",
        grade: youth.grade || "",
        hasIEP: youth.hasIEP || false,
        academicStrengths: youth.academicStrengths || "",
        academicChallenges: youth.academicChallenges || "",
        educationGoals: youth.educationGoals || "",
        schoolContact: youth.schoolContact || "",
        schoolPhone: youth.schoolPhone || "",
        
        // Medical Information - parse from medicalInfo string if available
        physician: youth.physician || "",
        physicianPhone: youth.physicianPhone || "",
        insuranceProvider: youth.insuranceProvider || "",
        policyNumber: youth.policyNumber || "",
        allergies: youth.allergies || "",
        medicalConditions: youth.medicalConditions || "",
        medicalRestrictions: youth.medicalRestrictions || "",
        
        // Mental Health Information - parse from mentalHealthInfo string if available
        currentDiagnoses: youth.currentDiagnoses || "",
        diagnoses: youth.diagnoses || youth.currentDiagnoses || "",
        traumaHistory: youth.traumaHistory || [],
        previousTreatment: youth.previousTreatment || "",
        currentCounseling: youth.currentCounseling || [],
        therapistName: youth.therapistName || "",
        therapistContact: youth.therapistContact || "",
        sessionFrequency: youth.sessionFrequency || "",
        sessionTime: youth.sessionTime || "",
        selfHarmHistory: youth.selfHarmHistory || [],
        lastIncidentDate: youth.lastIncidentDate || "",
        hasSafetyPlan: youth.hasSafetyPlan || false,

        // Behavior tracking fields
        onSubsystem: youth.onSubsystem || false,
        pointsInCurrentLevel: youth.pointsInCurrentLevel || 0,
        dailyPointsForPrivileges: youth.dailyPointsForPrivileges || 10,
      };
      
      setFormData(populatedData);
    }
  }, [youth, open, setFormData]);

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
      
      // Extract all the fields
      const {
        firstName,
        lastName,
        dob,
        admissionDate,
        level,
        referralSource,
        referralReason,
      } = formData;
      
      // Validate required fields
      if (!firstName || !lastName) {
        toast.error("First name and last name are required");
        return;
      }

      // Calculate age from DOB
      const age = dob ? calculateAge(dob) : null;
      
      // Combine educational information
      const educationInfo = [
        formData.currentSchool && `School: ${formData.currentSchool}`,
        formData.grade && `Grade: ${formData.grade}`,
        formData.hasIEP && "Has IEP",
        formData.academicStrengths && `Strengths: ${formData.academicStrengths}`,
        formData.academicChallenges && `Challenges: ${formData.academicChallenges}`
      ].filter(Boolean).join('; ');
      
      // Combine medical information
      const medicalInfo = [
        formData.medicalConditions,
        formData.allergies && `Allergies: ${formData.allergies}`,
        formData.medicalRestrictions && `Restrictions: ${formData.medicalRestrictions}`
      ].filter(Boolean).join('; ');
      
      // Combine mental health information
      const mentalHealthInfo = [
        formData.currentDiagnoses || formData.diagnoses,
        formData.traumaHistory?.length > 0 && `Trauma history: ${formData.traumaHistory.join(', ')}`,
        formData.previousTreatment && `Previous treatment: ${formData.previousTreatment}`
      ].filter(Boolean).join('; ');
      
      // Create the update data object - ensuring all dates are strings for Supabase
      const updateData = {
        firstName,
        lastName,
        dob: dob || null,
        age: age || null,
        admissionDate: admissionDate || null,
        level: level ? parseInt(level) : 1,
        referralSource: referralSource || null,
        referralReason: referralReason || null,
        educationInfo: educationInfo || null,
        medicalInfo: medicalInfo || null,
        mentalHealthInfo: mentalHealthInfo || null,
        legalStatus: formData.courtInvolvement?.join(', ') || null,
        
        // Additional personal details
        sex: formData.sex || null,
        race: formData.race || null,
        religion: formData.religion || null,
        placeOfBirth: formData.placeOfBirth || null,
        socialSecurityNumber: formData.socialSecurityNumber || null,
        address: formData.address ? (() => {
          const parts = formData.address.split(',').map(p => p.trim());
          const stateParts = parts[2]?.split(' ') || [];
          return {
            street: parts[0] || null,
            city: parts[1] || null,
            state: stateParts[0] || null,
            zip: stateParts[1] || null,
          };
        })() : null,
        physicalDescription: {
          height: formData.height || null,
          weight: formData.weight || null,
          hairColor: formData.hairColor || null,
          eyeColor: formData.eyeColor || null,
          tattoosScars: formData.tattoosScars || null,
        },
        
        // Store detailed fields for future use
        legalGuardian: formData.legalGuardian || null,
        guardianRelationship: formData.guardianRelationship || null,
        guardianContact: formData.guardianContact || null,
        guardianPhone: formData.guardianPhone || null,
        guardianEmail: formData.guardianEmail || null,
        probationOfficer: formData.probationOfficer || null,
        probationContact: formData.probationContact || null,
        probationPhone: formData.probationPhone || null,
        placementAuthority: formData.placementAuthority?.[0] || null,
        estimatedStay: formData.estimatedStay || null,
        
        // Education details
        currentSchool: formData.currentSchool || null,
        grade: formData.grade || null,
        hasIEP: formData.hasIEP || false,
        academicStrengths: formData.academicStrengths || null,
        academicChallenges: formData.academicChallenges || null,
        educationGoals: formData.educationGoals || null,
        schoolContact: formData.schoolContact || null,
        schoolPhone: formData.schoolPhone || null,
        
        // Medical details
        physician: formData.physician || null,
        physicianPhone: formData.physicianPhone || null,
        insuranceProvider: formData.insuranceProvider || null,
        policyNumber: formData.policyNumber || null,
        allergies: formData.allergies || null,
        medicalConditions: formData.medicalConditions || null,
        medicalRestrictions: formData.medicalRestrictions || null,
        
        // Mental health details
        currentDiagnoses: formData.currentDiagnoses || formData.diagnoses || null,
        diagnoses: formData.currentDiagnoses || formData.diagnoses || null,
        traumaHistory: formData.traumaHistory || null,
        previousTreatment: formData.previousTreatment || null,
        currentCounseling: formData.currentCounseling || null,
        therapistName: formData.therapistName || null,
        therapistContact: formData.therapistContact || null,
        sessionFrequency: formData.sessionFrequency || null,
        sessionTime: formData.sessionTime || null,
        selfHarmHistory: formData.selfHarmHistory || null,
        lastIncidentDate: formData.lastIncidentDate || null,
        hasSafetyPlan: formData.hasSafetyPlan || false,
        
        // Background details
        priorPlacements: formData.priorPlacements || null,
        numPriorPlacements: formData.numPriorPlacements || null,
        lengthRecentPlacement: formData.lengthRecentPlacement || null,
        courtInvolvement: formData.courtInvolvement || null,
        
        // Behavior tracking
        onSubsystem: formData.onSubsystem || false,
        pointsInCurrentLevel: formData.pointsInCurrentLevel || 0,
        dailyPointsForPrivileges: formData.dailyPointsForPrivileges || 0,
        
        updatedAt: new Date().toISOString()
      };
      
      // Validate required fields
      if (!updateData.firstName || !updateData.lastName) {
        toast.error("First name and last name are required");
        return;
      }

      // Update youth in Supabase
      await updateYouth(youth.id, updateData);

      toast.success(`Successfully updated ${updateData.firstName} ${updateData.lastName}'s profile`);

      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error("Error updating youth:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update youth profile";
      toast.error(`Update failed: ${errorMessage}`);
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Youth Profile</DialogTitle>
          <DialogDescription>
            Update the profile information for {youth.firstName} {youth.lastName}. Make changes across different tabs and save when complete.
          </DialogDescription>
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
                setFormData={setFormData}
              />
            </TabsContent>
          </Tabs>
          
          <div className="text-xs text-gray-500 mt-2">
            <p>* Required fields. All changes will be saved to the youth's profile.</p>
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
