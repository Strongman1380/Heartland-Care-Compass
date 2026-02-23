
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useYouth } from "@/hooks/useSupabase";
import { type Youth } from "@/integrations/firebase/services";
import { useYouthForm, YouthFormData } from "@/hooks/useYouthForm";
import { resolveProfessionals, professionalsToLegacyFields } from "@/utils/professionalUtils";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { BackgroundTab } from "./BackgroundTab";
import { EducationTab } from "./EducationTab";
import { MedicalTab } from "./MedicalTab";
import { MentalHealthTab } from "./MentalHealthTab";
import { format } from "date-fns";
import { parseYouthProfileText } from "@/services/aiService";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { mapImportedProfileToFormPatch } from "@/utils/youthProfileImport";

interface EditYouthDialogProps {
  youth: Youth;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditYouthDialog = ({ youth, open, onClose, onSuccess }: EditYouthDialogProps) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Import feature state
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
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
    handleProfessionalsChange,
    clearDraft,
  } = useYouthForm();

  // Populate form data when youth changes
  useEffect(() => {
    if (youth && open) {
      // Ensure any previous draft does not overwrite the loaded profile
      try { clearDraft(); } catch {}
      const populatedData: YouthFormData = {
        // Personal Information
        firstName: youth.firstName || "",
        lastName: youth.lastName || "",
        // Use stored ISO/date string directly; avoid formatting invalid Date
        dob: youth.dob ? (typeof youth.dob === 'string' ? youth.dob.slice(0, 10) : '') : "",
        age: youth.age?.toString() || "",
        idNumber: youth.idNumber || "",
        // Use stored ISO/date string directly; avoid formatting invalid Date
        admissionDate: youth.admissionDate ? (typeof youth.admissionDate === 'string' ? youth.admissionDate.slice(0, 10) : '') : "",
        currentLevel: youth.level || 1,
        level: youth.level?.toString() || "1",
        legalGuardian: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.name
          ? youth.legalGuardian.name
          : (typeof youth.legalGuardian === 'string' ? youth.legalGuardian : ""),
        guardianRelationship: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.relationship
          ? youth.legalGuardian.relationship
          : "",
        guardianContact: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.contact
          ? youth.legalGuardian.contact
          : "",
        guardianPhone: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.phone
          ? youth.legalGuardian.phone
          : "",
        guardianEmail: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.email
          ? youth.legalGuardian.email
          : "",
        probationOfficer: typeof youth.probationOfficer === 'object' && youth.probationOfficer?.name
          ? youth.probationOfficer.name
          : (typeof youth.probationOfficer === 'string' ? youth.probationOfficer : ""),
        probationContact: typeof youth.probationOfficer === 'object' && youth.probationOfficer?.contact
          ? youth.probationOfficer.contact
          : "",
        probationPhone: typeof youth.probationOfficer === 'object' && youth.probationOfficer?.phone
          ? youth.probationOfficer.phone
          : "",
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

        // Family & Legal Contact Information
        motherName: typeof youth.mother === 'object' && youth.mother?.name
          ? youth.mother.name
          : "",
        motherPhone: typeof youth.mother === 'object' && youth.mother?.phone
          ? youth.mother.phone
          : "",
        fatherName: typeof youth.father === 'object' && youth.father?.name
          ? youth.father.name
          : "",
        fatherPhone: typeof youth.father === 'object' && youth.father?.phone
          ? youth.father.phone
          : "",
        nextOfKinName: typeof youth.nextOfKin === 'object' && youth.nextOfKin?.name
          ? youth.nextOfKin.name
          : "",
        nextOfKinRelationship: typeof youth.nextOfKin === 'object' && youth.nextOfKin?.relationship
          ? youth.nextOfKin.relationship
          : "",
        nextOfKinPhone: typeof youth.nextOfKin === 'object' && youth.nextOfKin?.phone
          ? youth.nextOfKin.phone
          : "",
        placingAgencyCounty: youth.placingAgencyCounty || "",
        caseworkerName: typeof youth.caseworker === 'object' && youth.caseworker?.name
          ? youth.caseworker.name
          : "",
        caseworkerPhone: typeof youth.caseworker === 'object' && youth.caseworker?.phone
          ? youth.caseworker.phone
          : "",
        guardianAdLitemName: typeof youth.guardianAdLitem === 'object' && youth.guardianAdLitem?.name
          ? youth.guardianAdLitem.name
          : "",
        attorney: youth.attorney || "",
        judge: youth.judge || "",
        professionals: resolveProfessionals(youth),

        // Background Information
        referralReason: youth.referralReason || "",
        priorPlacements: youth.priorPlacements || [],
        numPriorPlacements: youth.numPriorPlacements || "",
        lengthRecentPlacement: youth.lengthRecentPlacement || "",
        courtInvolvement: youth.courtInvolvement || [],
        
        // Education Information - parse from educationInfo string if available
        currentSchool: youth.currentSchool || "",
        grade: youth.grade || (youth as any).currentGrade || "",
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

        // HYRNA Risk Assessment
        hyrnaRiskLevel: youth.hyrnaRiskLevel || "",
        hyrnaScore: youth.hyrnaScore?.toString() || "",
        hyrnaAssessmentDate: youth.hyrnaAssessmentDate || "",
        realColorsResult: youth.realColorsResult || "",

        // Admin fields
        admissionTime: youth.admissionTime || "",
        rcsIn: youth.rcsIn || "",
        rcsOut: youth.rcsOut || "",

        // Additional education
        lastSchoolAttended: youth.lastSchoolAttended || "",

        // Additional medical
        currentMedications: youth.currentMedications || "",
        significantHealthConditions: youth.significantHealthConditions || "",

        // Behavioral / Psychosocial
        getAlongWithOthers: youth.getAlongWithOthers || "",
        strengthsTalents: youth.strengthsTalents || "",
        interests: youth.interests || "",
        dislikesAboutSelf: youth.dislikesAboutSelf || "",
        angerTriggers: youth.angerTriggers || "",
        behaviorProblems: youth.behaviorProblems || "",
        socialStrengths: youth.socialStrengths || "",
        socialDeficiencies: youth.socialDeficiencies || "",

        // Risk & Recovery
        tobaccoPast6To12Months: youth.tobaccoPast6To12Months || false,
        alcoholPast6To12Months: youth.alcoholPast6To12Months || false,
        drugsVapingMarijuanaPast6To12Months: youth.drugsVapingMarijuanaPast6To12Months || false,
        gangInvolvement: youth.gangInvolvement || false,
        historyPhysicallyHurting: youth.historyPhysicallyHurting || false,
        historyVandalism: youth.historyVandalism || false,
        familyViolentCrimes: youth.familyViolentCrimes || false,
        drugTestingDates: youth.drugTestingDates || "",

        // Treatment Focus & Goals
        treatmentFocus: youth.treatmentFocus || {
          excessiveDependency: false, withdrawalIsolation: false,
          parentChildRelationship: false, peerRelationship: false,
          acceptanceOfAuthority: false, lying: false,
          poorAcademicAchievement: false, poorSelfEsteem: false,
          manipulative: false, propertyDestruction: false,
          hyperactivity: false, anxiety: false,
          verbalAggression: false, assaultive: false,
          depression: false, stealing: false,
        },
        treatmentGoals: youth.treatmentGoals || "",

        // Community Resources
        communityResources: youth.communityResources || {
          dayTreatmentServices: false, intensiveInHomeServices: false,
          daySchoolPlacement: false, oneOnOneSchoolCounselor: false,
          mentalHealthSupportServices: false, other: "",
        },

        // Discharge Planning
        dischargeDate: youth.dischargeDate || "",
        dischargeTime: youth.dischargeTime || "",
        dischargeCategory: youth.dischargeCategory || "",
        dischargeReason: youth.dischargeReason || "",
        dischargeNotes: youth.dischargeNotes || "",
        dischargedBy: youth.dischargedBy || "",
        estimatedLengthOfStayMonths: youth.estimatedLengthOfStayMonths || "",
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

  const handleImportProfile = async () => {
    if (!importText.trim()) {
      toast.error("Please paste some profile text to import");
      return;
    }

    setIsImporting(true);
    setImportStatus('idle');

    try {
      const response = await parseYouthProfileText(importText);

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to parse profile text");
      }

      const parsedData = response.data.parsedData || response.data;
      const importPatch = mapImportedProfileToFormPatch(parsedData);
      setFormData((prev) => ({ ...prev, ...importPatch }));
      setImportStatus('success');
      
      // Show warnings if any
      const warnings = Array.isArray(parsedData.warnings) ? parsedData.warnings : [];
      const confidence = typeof parsedData.confidence === "number" ? parsedData.confidence : undefined;
      if (warnings.length > 0) {
        toast.warning("Import completed with warnings", {
          description: warnings.join(", ")
        });
      } else {
        toast.success("Profile data imported successfully!", {
          description: `Confidence: ${confidence !== undefined ? Math.round(confidence * 100) : 'N/A'}%`
        });
      }

      // Clear import text and switch to personal tab
      setImportText("");
      setActiveTab("personal");
    } catch (error) {
      console.error("Import error:", error);
      setImportStatus('error');
      toast.error("Failed to import profile", {
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      setIsImporting(false);
    }
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
      
      // Normalize level to a valid number (avoid NaN)
      let normalizedLevel: number;
      if (typeof level === 'string') {
        if (level.toLowerCase() === 'orientation') {
          normalizedLevel = 0;
        } else {
          const parsed = parseInt(level, 10);
          normalizedLevel = Number.isFinite(parsed) ? parsed : (typeof youth.level === 'number' ? youth.level : 1);
        }
      } else {
        normalizedLevel = typeof level === 'number' ? level : (typeof youth.level === 'number' ? youth.level : 1);
      }

      // Create the update data object - ensuring all dates are strings for Supabase
      const updateData = {
        firstName,
        lastName,
        dob: dob || null,
        age: age || null,
        admissionDate: admissionDate || null,
        level: normalizedLevel,
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
        physicalDescription: (formData.height || formData.weight || formData.hairColor || formData.eyeColor || formData.tattoosScars) ? {
          height: formData.height || null,
          weight: formData.weight || null,
          hairColor: formData.hairColor || null,
          eyeColor: formData.eyeColor || null,
          tattoosScars: formData.tattoosScars || null,
        } : null,
        
        // Legal Guardian as Json object
        legalGuardian: formData.legalGuardian ? {
          name: formData.legalGuardian,
          relationship: formData.guardianRelationship || null,
          contact: formData.guardianContact || null,
          phone: formData.guardianPhone || null,
          email: formData.guardianEmail || null
        } : null,

        // Professionals array (new canonical source)
        professionals: formData.professionals && formData.professionals.length > 0 ? formData.professionals : null,
        // Also write legacy fields for backward compatibility
        ...professionalsToLegacyFields(formData.professionals || []),

        // Mother as Json object
        mother: formData.motherName ? {
          name: formData.motherName,
          phone: formData.motherPhone || null
        } : null,

        // Father as Json object
        father: formData.fatherName ? {
          name: formData.fatherName,
          phone: formData.fatherPhone || null
        } : null,

        // Next of Kin as Json object
        nextOfKin: formData.nextOfKinName ? {
          name: formData.nextOfKinName,
          relationship: formData.nextOfKinRelationship || null,
          phone: formData.nextOfKinPhone || null
        } : null,

        // Legal Information
        placingAgencyCounty: formData.placingAgencyCounty || null,
        placementAuthority: formData.placementAuthority?.[0] || null,
        estimatedStay: formData.estimatedStay || null,
        
        // Education details
        currentSchool: formData.currentSchool || null,
        // Keep both columns in sync
        grade: formData.grade || null,
        currentGrade: formData.grade || null,
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
        traumaHistory: formData.traumaHistory && formData.traumaHistory.length > 0 ? formData.traumaHistory : null,
        previousTreatment: formData.previousTreatment || null,
        currentCounseling: formData.currentCounseling && formData.currentCounseling.length > 0 ? formData.currentCounseling : null,
        therapistName: formData.therapistName || null,
        therapistContact: formData.therapistContact || null,
        sessionFrequency: formData.sessionFrequency || null,
        sessionTime: formData.sessionTime || null,
        selfHarmHistory: formData.selfHarmHistory && formData.selfHarmHistory.length > 0 ? formData.selfHarmHistory : null,
        lastIncidentDate: formData.lastIncidentDate && formData.lastIncidentDate !== 'Not applicable' && formData.lastIncidentDate !== 'N/A' ? formData.lastIncidentDate : null,
        hasSafetyPlan: formData.hasSafetyPlan || false,

        // Background details
        priorPlacements: formData.priorPlacements && formData.priorPlacements.length > 0 ? formData.priorPlacements : null,
        numPriorPlacements: formData.numPriorPlacements || null,
        lengthRecentPlacement: formData.lengthRecentPlacement || null,
        courtInvolvement: formData.courtInvolvement && formData.courtInvolvement.length > 0 ? formData.courtInvolvement : null,
        
        // Behavior tracking
        onSubsystem: !!formData.onSubsystem,
        pointsInCurrentLevel: formData.pointsInCurrentLevel !== undefined ? Number(formData.pointsInCurrentLevel) : 0,
        dailyPointsForPrivileges: formData.dailyPointsForPrivileges !== undefined ? Number(formData.dailyPointsForPrivileges) : 0,
        
        // HYRNA Risk Assessment
        hyrnaRiskLevel: formData.hyrnaRiskLevel === '' ? null : formData.hyrnaRiskLevel,
        hyrnaScore: formData.hyrnaScore === '' ? null : parseInt(formData.hyrnaScore) || null,
        hyrnaAssessmentDate: formData.hyrnaAssessmentDate === '' ? null : formData.hyrnaAssessmentDate,
        
        // Preserve Real Colors assessment data
        realColorsResult: formData.realColorsResult || youth.realColorsResult || null,

        // Admin fields
        admissionTime: formData.admissionTime || null,
        rcsIn: formData.rcsIn || null,
        rcsOut: formData.rcsOut || null,

        // Additional education
        lastSchoolAttended: formData.lastSchoolAttended || null,

        // Additional medical
        currentMedications: formData.currentMedications || null,
        significantHealthConditions: formData.significantHealthConditions || null,

        // Behavioral / Psychosocial
        getAlongWithOthers: formData.getAlongWithOthers || null,
        strengthsTalents: formData.strengthsTalents || null,
        interests: formData.interests || null,
        dislikesAboutSelf: formData.dislikesAboutSelf || null,
        angerTriggers: formData.angerTriggers || null,
        behaviorProblems: formData.behaviorProblems || null,
        socialStrengths: formData.socialStrengths || null,
        socialDeficiencies: formData.socialDeficiencies || null,

        // Risk & Recovery
        tobaccoPast6To12Months: !!formData.tobaccoPast6To12Months,
        alcoholPast6To12Months: !!formData.alcoholPast6To12Months,
        drugsVapingMarijuanaPast6To12Months: !!formData.drugsVapingMarijuanaPast6To12Months,
        gangInvolvement: !!formData.gangInvolvement,
        historyPhysicallyHurting: !!formData.historyPhysicallyHurting,
        historyVandalism: !!formData.historyVandalism,
        familyViolentCrimes: !!formData.familyViolentCrimes,
        drugTestingDates: formData.drugTestingDates || null,

        // Treatment Focus & Goals
        treatmentFocus: formData.treatmentFocus && Object.values(formData.treatmentFocus).some(Boolean) ? formData.treatmentFocus : null,
        treatmentGoals: formData.treatmentGoals || null,

        // Community Resources
        communityResources: formData.communityResources && (
          Object.values(formData.communityResources).some(v => v === true || (typeof v === "string" && v.length > 0))
        ) ? formData.communityResources : null,

        // Discharge Planning
        dischargeDate: formData.dischargeDate || null,
        dischargeTime: formData.dischargeTime || null,
        dischargeCategory: formData.dischargeCategory || null,
        dischargeReason: formData.dischargeReason || null,
        dischargeNotes: formData.dischargeNotes || null,
        dischargedBy: formData.dischargedBy || null,
        estimatedLengthOfStayMonths: formData.estimatedLengthOfStayMonths || null,

        // updatedAt is handled automatically by Supabase trigger
      };
      
      // Validate required fields
      if (!updateData.firstName || !updateData.lastName) {
        toast.error("First name and last name are required");
        return;
      }

      // Log the update data for debugging
      console.log('Update Data being sent:', JSON.stringify(updateData, null, 2));

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
    { id: "import", label: "Import" },
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
            <TabsList className="grid grid-cols-6 mb-4">
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
            
            <TabsContent value="import">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 mb-1">AI-Powered Profile Import</h3>
                      <p className="text-sm text-blue-700">
                        Paste any youth profile text below (from documents, emails, forms, etc.) and our AI will automatically extract and populate the profile fields.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-text">Profile Text</Label>
                  <Textarea
                    id="import-text"
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Paste youth profile information here...&#10;&#10;Example:&#10;Name: John Doe&#10;DOB: 01/15/2008&#10;Address: 123 Main St, Springfield, IL 62701&#10;Guardian: Jane Doe (Mother)&#10;School: Springfield High School, Grade 10&#10;Medical: Allergic to penicillin&#10;..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    The AI will intelligently parse the text and map it to the appropriate fields. You can review and edit the imported data before saving.
                  </p>
                </div>

                {importStatus === 'success' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800">Profile data imported successfully! Review the other tabs to verify.</p>
                  </div>
                )}

                {importStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-sm text-red-800">Failed to import profile. Please check the text format and try again.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleImportProfile}
                    disabled={isImporting || !importText.trim()}
                    className="bg-[#823131] hover:bg-[#6b2828] text-white border-[#823131]"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import Profile Data
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImportText("");
                      setImportStatus('idle');
                    }}
                    disabled={isImporting}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="personal">
              <PersonalInfoTab
                formData={formData}
                handleChange={handleChange}
                handleSelectChange={handleSelectChange}
                handleProfessionalsChange={handleProfessionalsChange}
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
                handleSelectChange={handleSelectChange}
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
