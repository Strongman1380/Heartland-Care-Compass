import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { parseYouthProfileText } from "@/services/aiService";
import { toast } from "sonner";
import { useYouth } from "@/hooks/useSupabase";
import { useYouthForm } from "@/hooks/useYouthForm";
import { mapImportedProfileToFormPatch } from "@/utils/youthProfileImport";
import { professionalsToLegacyFields } from "@/utils/professionalUtils";
import { PersonalInfoTab } from "./PersonalInfoTab";
import { BackgroundTab } from "./BackgroundTab";
import { EducationTab } from "./EducationTab";
import { MedicalTab } from "./MedicalTab";
import { MentalHealthTab } from "./MentalHealthTab";

interface AddYouthDialogProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddYouthDialog = ({ onClose, onSuccess }: AddYouthDialogProps) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Import feature state
  const [importText, setImportText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  // Use Supabase hook for youth operations
  const { createYouth, youths } = useYouth();
  
  const {
    formData,
    setFormData,
    handleChange,
    handleSelectChange,
    handleCheckboxChange,
    handleArrayItemChange,
    addArrayItem,
    handleProfessionalsChange,
    hasUnsavedChanges,
    isAutoSaving,
    clearDraft,
    resetForm,
  } = useYouthForm();

  // Generate unique ID when dialog opens
  const generateUniqueId = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const existingIds = youths.map(youth => youth.idNumber).filter(Boolean);
    
    // Find the highest number for the current year
    let maxNumber = 0;
    const yearPrefix = `HBH-${currentYear}-`;
    
    existingIds.forEach(id => {
      if (id && id.startsWith(yearPrefix)) {
        const numberPart = id.split('-')[2];
        const num = parseInt(numberPart, 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    // Generate next sequential number
    const nextNumber = maxNumber + 1;
    return `${yearPrefix}${nextNumber.toString().padStart(3, '0')}`;
  }, [youths]);

  // Auto-populate ID when component mounts
  useEffect(() => {
    if (!formData.idNumber) {
      const newId = generateUniqueId();
      setFormData(prev => ({ ...prev, idNumber: newId }));
    }
  }, [youths, setFormData, generateUniqueId]);

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
      const parsedData: any = (response as any).data.parsedData || response.data;
      const importPatch = mapImportedProfileToFormPatch(parsedData);
      setFormData((prev) => ({ ...prev, ...importPatch }));
      setImportStatus('success');

      const warnings = Array.isArray(parsedData.warnings) ? parsedData.warnings : [];
      const confidence = typeof parsedData.confidence === "number" ? parsedData.confidence : undefined;

      if (warnings.length > 0) {
        toast.warning("Import completed with warnings", { description: parsedData.warnings.join(", ") });
      } else {
        toast.success("Profile data imported successfully!", { description: `Confidence: ${confidence !== undefined ? Math.round(confidence * 100) : 'N/A'}%` });
      }

      setImportText("");
      setActiveTab("personal");
    } catch (error) {
      console.error("Import error:", error);
      setImportStatus('error');
      toast.error("Failed to import profile", { description: error instanceof Error ? error.message : "Unknown error occurred" });
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
        formData.lastSchoolAttended && `Previously attended: ${formData.lastSchoolAttended}`,
        formData.academicStrengths && `Strengths: ${formData.academicStrengths}`,
        formData.academicChallenges && `Challenges: ${formData.academicChallenges}`
      ].filter(Boolean).join('; ');

      // Combine medical information
      const medicalInfo = [
        formData.medicalConditions,
        formData.allergies && formData.allergies !== 'None' && formData.allergies !== 'N/A' && `Allergies: ${formData.allergies}`,
        formData.currentMedications && formData.currentMedications !== 'None' && `Medications: ${formData.currentMedications}`,
        formData.significantHealthConditions && formData.significantHealthConditions !== 'None' && `Conditions: ${formData.significantHealthConditions}`,
        formData.medicalRestrictions && `Restrictions: ${formData.medicalRestrictions}`,
        formData.insuranceProvider && `Insurance: ${formData.insuranceProvider}`,
      ].filter(Boolean).join('; ');

      // Combine mental health information
      const mentalHealthInfo = [
        formData.currentDiagnoses || formData.diagnoses,
        formData.traumaHistory?.length > 0 && `Trauma history: ${formData.traumaHistory.join(', ')}`,
        formData.selfHarmHistory?.length > 0 && `Self-harm history: ${formData.selfHarmHistory.join(', ')}`,
        formData.previousTreatment && `Previous treatment: ${formData.previousTreatment}`,
        formData.therapistName && `Therapist: ${formData.therapistName}`,
      ].filter(Boolean).join('; ');
      
      // Normalize level (support 'orientation' => 0)
      let normalizedLevel: number = 1;
      if (typeof level === 'string') {
        if (level.toLowerCase() === 'orientation' || level === '0') {
          normalizedLevel = 0;
        } else {
          const parsed = parseInt(level, 10);
          normalizedLevel = Number.isFinite(parsed) ? parsed : 1;
        }
      }

      // Create the youth object with detailed fields
      const youthData = {
        firstName,
        lastName,
        dob: dob || null,
        age: age || null,
        idNumber: formData.idNumber,
        admissionDate: admissionDate || null,
        admissionTime: formData.admissionTime || null,
        rcsIn: formData.rcsIn || null,
        rcsOut: formData.rcsOut || null,
        level: normalizedLevel,
        pointTotal: 0,
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

        // Flat guardian fields for legacy compatibility
        guardianRelationship: formData.guardianRelationship || null,
        guardianContact: formData.guardianContact || null,
        guardianPhone: formData.guardianPhone || null,
        guardianEmail: formData.guardianEmail || null,

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
        lastSchoolAttended: formData.lastSchoolAttended || null,
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
        currentMedications: formData.currentMedications || null,
        significantHealthConditions: formData.significantHealthConditions || null,
        medicalConditions: formData.medicalConditions || formData.significantHealthConditions || null,
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
        tobaccoPast6To12Months: formData.tobaccoPast6To12Months ?? false,
        alcoholPast6To12Months: formData.alcoholPast6To12Months ?? false,
        drugsVapingMarijuanaPast6To12Months: formData.drugsVapingMarijuanaPast6To12Months ?? false,
        gangInvolvement: formData.gangInvolvement ?? false,
        historyPhysicallyHurting: formData.historyPhysicallyHurting ?? false,
        historyVandalism: formData.historyVandalism ?? false,
        familyViolentCrimes: formData.familyViolentCrimes ?? false,
        drugTestingDates: formData.drugTestingDates || null,

        // Treatment Focus & Goals
        treatmentFocus: Object.values(formData.treatmentFocus).some(Boolean) ? formData.treatmentFocus : null,
        treatmentGoals: formData.treatmentGoals || null,

        // Community Resources
        communityResources: Object.values(formData.communityResources).some(v => v === true || (typeof v === 'string' && v.length > 0)) ? formData.communityResources : null,

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
        hyrnaRiskLevel: formData.hyrnaRiskLevel || null,
        hyrnaScore: formData.hyrnaScore ? Number(formData.hyrnaScore) : null,
        hyrnaAssessmentDate: formData.hyrnaAssessmentDate || null,
        realColorsResult: formData.realColorsResult || null,

        // Discharge Planning
        dischargeDate: formData.dischargeDate || null,
        dischargeTime: formData.dischargeTime || null,
        dischargeCategory: formData.dischargeCategory || null,
        dischargeReason: formData.dischargeReason || null,
        dischargeNotes: formData.dischargeNotes || null,
        dischargedBy: formData.dischargedBy || null,
      };
      
      // Save to Supabase
      await createYouth(youthData);

      // Clear draft after successful save
      clearDraft();

      // Call onSuccess callback if provided, otherwise just close
      if (onSuccess) {
        onSuccess();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Error adding youth:", error);
      toast.error("Failed to add youth profile");
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
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add New Youth</DialogTitle>
          {/* Auto-save status */}
          {hasUnsavedChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200 mt-2">
              {isAutoSaving ? (
                <>
                  <div className="animate-spin h-3 w-3 border border-amber-600 border-t-transparent rounded-full" />
                  <span>Auto-saving draft...</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 bg-amber-500 rounded-full" />
                  <span>Draft saved automatically (unsaved changes)</span>
                </>
              )}
            </div>
          )}
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
                        Paste any youth profile text below and the system will extract and populate the fields.
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
                    placeholder="Paste youth profile information here..."
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    You can review and edit imported data before saving.
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
