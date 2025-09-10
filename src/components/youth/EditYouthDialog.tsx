
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { updateYouth } from "@/utils/local-storage-utils";
import { Youth } from "@/types/app-types";
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
      
      // Create the update data object
      const updateData = {
        firstName,
        lastName,
        dob: dob ? new Date(dob) : undefined,
        age,
        admissionDate: admissionDate ? new Date(admissionDate) : undefined,
        level: level ? parseInt(level) : 1,
        referralSource,
        referralReason,
        educationInfo,
        medicalInfo,
        mentalHealthInfo,
        legalStatus: formData.courtInvolvement?.join(', ') || undefined,
        
        // Additional personal details
        sex: formData.sex || undefined,
        race: formData.race || undefined,
        religion: formData.religion || undefined,
        placeOfBirth: formData.placeOfBirth || undefined,
        socialSecurityNumber: formData.socialSecurityNumber || undefined,
        address: formData.address ? {
          street: formData.address.split(',')[0]?.trim() || undefined,
          city: formData.address.split(',')[1]?.trim() || undefined,
          state: formData.address.split(',')[2]?.trim().split(' ')[0] || undefined,
          zip: formData.address.split(',')[2]?.trim().split(' ')[1] || undefined,
        } : undefined,
        physicalDescription: {
          height: formData.height || undefined,
          weight: formData.weight || undefined,
          hairColor: formData.hairColor || undefined,
          eyeColor: formData.eyeColor || undefined,
          tattoosScars: formData.tattoosScars || undefined,
        },
        
        // Store detailed fields for future use
        legalGuardian: formData.legalGuardian,
        guardianRelationship: formData.guardianRelationship,
        guardianContact: formData.guardianContact,
        guardianPhone: formData.guardianPhone,
        guardianEmail: formData.guardianEmail,
        probationOfficer: formData.probationOfficer,
        probationContact: formData.probationContact,
        probationPhone: formData.probationPhone,
        placementAuthority: formData.placementAuthority?.[0],
        estimatedStay: formData.estimatedStay,
        
        // Education details
        currentSchool: formData.currentSchool,
        grade: formData.grade,
        hasIEP: formData.hasIEP,
        academicStrengths: formData.academicStrengths,
        academicChallenges: formData.academicChallenges,
        educationGoals: formData.educationGoals,
        schoolContact: formData.schoolContact,
        schoolPhone: formData.schoolPhone,
        
        // Medical details
        physician: formData.physician,
        physicianPhone: formData.physicianPhone,
        insuranceProvider: formData.insuranceProvider,
        policyNumber: formData.policyNumber,
        allergies: formData.allergies,
        medicalConditions: formData.medicalConditions,
        medicalRestrictions: formData.medicalRestrictions,
        
        // Mental health details
        currentDiagnoses: formData.currentDiagnoses || formData.diagnoses,
        diagnoses: formData.currentDiagnoses || formData.diagnoses,
        traumaHistory: formData.traumaHistory,
        previousTreatment: formData.previousTreatment,
        currentCounseling: formData.currentCounseling,
        therapistName: formData.therapistName,
        therapistContact: formData.therapistContact,
        sessionFrequency: formData.sessionFrequency,
        sessionTime: formData.sessionTime,
        selfHarmHistory: formData.selfHarmHistory,
        lastIncidentDate: formData.lastIncidentDate,
        hasSafetyPlan: formData.hasSafetyPlan,
        
        // Background details
        priorPlacements: formData.priorPlacements,
        numPriorPlacements: formData.numPriorPlacements,
        lengthRecentPlacement: formData.lengthRecentPlacement,
        courtInvolvement: formData.courtInvolvement,
        
        // Behavior tracking
        onSubsystem: formData.onSubsystem,
        pointsInCurrentLevel: formData.pointsInCurrentLevel,
        dailyPointsForPrivileges: formData.dailyPointsForPrivileges,
        
        updatedAt: new Date()
      };
      
      // Update youth in local storage
      updateYouth(youth.id, updateData);
        
      toast.success("Youth profile updated successfully");
      
      // Call onSuccess callback
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      console.error("Error updating youth:", error);
      toast.error("Failed to update youth profile");
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
