import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Youth as LocalYouth } from '@/types/app-types';
import { useYouthForm, YouthFormData } from '@/hooks/useYouthForm';
import { resolveProfessionals, professionalsToLegacyFields } from '@/utils/professionalUtils';
import { PersonalInfoTab } from './PersonalInfoTab';
import { BackgroundTab } from './BackgroundTab';
import { EducationTab } from './EducationTab';
import { MedicalTab } from './MedicalTab';
import { MentalHealthTab } from './MentalHealthTab';
import { updateYouth as updateYouthLocal } from '@/utils/local-storage-utils';
import { format } from 'date-fns';

interface Props {
  youth: LocalYouth;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LocalEditYouthDialog({ youth, open, onClose, onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState('personal');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { formData, setFormData, handleChange, handleSelectChange, handleCheckboxChange, handleProfessionalsChange } = useYouthForm();

  useEffect(() => {
    if (!youth || !open) return;
    const populated: YouthFormData = {
      firstName: youth.firstName || '',
      lastName: youth.lastName || '',
      dob: youth.dob ? format(youth.dob, 'yyyy-MM-dd') : '',
      age: youth.age?.toString() || '',
      idNumber: youth.idNumber || '',
      admissionDate: youth.admissionDate ? format(youth.admissionDate, 'yyyy-MM-dd') : '',
      currentLevel: youth.level || 1,
      level: String(youth.level ?? 1),
      legalGuardian: typeof youth.legalGuardian === 'string' ? youth.legalGuardian : (youth.legalGuardian as any)?.name || '',
      guardianRelationship: youth.guardianRelationship || '',
      guardianContact: youth.guardianContact || (youth.legalGuardian as any)?.phone || '',
      guardianPhone: youth.guardianPhone || '',
      guardianEmail: youth.guardianEmail || '',
      probationOfficer: typeof youth.probationOfficer === 'string' ? youth.probationOfficer : (youth.probationOfficer as any)?.name || '',
      probationContact: youth.probationContact || (youth.probationOfficer as any)?.email || '',
      probationPhone: youth.probationPhone || (youth.probationOfficer as any)?.phone || '',
      placementAuthority: youth.placementAuthority ? [youth.placementAuthority] : [],
      estimatedStay: youth.estimatedStay || '',
      referralSource: youth.referralSource || '',
      sex: (youth.sex as any) || '',
      race: youth.race || '',
      religion: youth.religion || '',
      placeOfBirth: youth.placeOfBirth || '',
      socialSecurityNumber: youth.socialSecurityNumber || '',
      address: youth.address ? `${youth.address.street || ''}, ${youth.address.city || ''}, ${youth.address.state || ''} ${youth.address.zip || ''}`.trim().replace(/^,\s*|,\s*$/g, '') : '',
      height: youth.physicalDescription?.height || '',
      weight: youth.physicalDescription?.weight || '',
      hairColor: youth.physicalDescription?.hairColor || '',
      eyeColor: youth.physicalDescription?.eyeColor || '',
      tattoosScars: youth.physicalDescription?.tattoosScars || '',
      referralReason: youth.referralReason || '',
      priorPlacements: youth.priorPlacements || [],
      numPriorPlacements: youth.numPriorPlacements || '',
      lengthRecentPlacement: youth.lengthRecentPlacement || '',
      courtInvolvement: youth.courtInvolvement || [],
      currentSchool: youth.currentSchool || '',
      grade: youth.grade || '',
      hasIEP: !!youth.hasIEP,
      academicStrengths: youth.academicStrengths || '',
      academicChallenges: youth.academicChallenges || '',
      educationGoals: youth.educationGoals || '',
      schoolContact: youth.schoolContact || '',
      schoolPhone: youth.schoolPhone || '',
      physician: youth.physician || '',
      physicianPhone: youth.physicianPhone || '',
      insuranceProvider: youth.insuranceProvider || '',
      policyNumber: youth.policyNumber || '',
      allergies: youth.allergies || '',
      medicalConditions: youth.medicalConditions || '',
      medicalRestrictions: youth.medicalRestrictions || '',
      currentDiagnoses: youth.currentDiagnoses || youth.diagnoses || '',
      diagnoses: youth.diagnoses || youth.currentDiagnoses || '',
      traumaHistory: youth.traumaHistory || [],
      previousTreatment: youth.previousTreatment || '',
      currentCounseling: youth.currentCounseling || [],
      therapistName: youth.therapistName || '',
      therapistContact: youth.therapistContact || '',
      sessionFrequency: youth.sessionFrequency || '',
      sessionTime: youth.sessionTime || '',
      selfHarmHistory: youth.selfHarmHistory || [],
      lastIncidentDate: youth.lastIncidentDate || '',
      hasSafetyPlan: !!youth.hasSafetyPlan,
      onSubsystem: !!youth.onSubsystem,
      pointsInCurrentLevel: youth.pointsInCurrentLevel || 0,
      dailyPointsForPrivileges: youth.dailyPointsForPrivileges || 0,
      professionals: resolveProfessionals(youth),
      motherName: typeof youth.mother === 'object' && youth.mother?.name ? youth.mother.name : '',
      motherPhone: typeof youth.mother === 'object' && youth.mother?.phone ? youth.mother.phone : '',
      fatherName: typeof youth.father === 'object' && youth.father?.name ? youth.father.name : '',
      fatherPhone: typeof youth.father === 'object' && youth.father?.phone ? youth.father.phone : '',
      nextOfKinName: typeof youth.nextOfKin === 'object' && youth.nextOfKin?.name ? youth.nextOfKin.name : '',
      nextOfKinRelationship: typeof youth.nextOfKin === 'object' && youth.nextOfKin?.relationship ? youth.nextOfKin.relationship : '',
      nextOfKinPhone: typeof youth.nextOfKin === 'object' && youth.nextOfKin?.phone ? youth.nextOfKin.phone : '',
      placingAgencyCounty: youth.placingAgencyCounty || '',
      caseworkerName: typeof youth.caseworker === 'object' && youth.caseworker?.name ? youth.caseworker.name : '',
      caseworkerPhone: typeof youth.caseworker === 'object' && youth.caseworker?.phone ? youth.caseworker.phone : '',
      guardianAdLitemName: typeof youth.guardianAdLitem === 'object' && youth.guardianAdLitem?.name ? youth.guardianAdLitem.name : '',
      attorney: youth.attorney || '',
      judge: youth.judge || '',
      hyrnaRiskLevel: '',
      hyrnaScore: '',
      hyrnaAssessmentDate: '',
    };
    setFormData(populated);
  }, [youth, open, setFormData]);

  const calculateAge = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (!formData.firstName || !formData.lastName) {
        toast.error('First and last name are required');
        return;
      }
      const age = calculateAge(formData.dob);
      const update = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dob: formData.dob ? new Date(formData.dob) : undefined,
        age: age ?? undefined,
        admissionDate: formData.admissionDate ? new Date(formData.admissionDate) : undefined,
        level: formData.level ? parseInt(formData.level) : 1,
        referralSource: formData.referralSource,
        referralReason: formData.referralReason,
        sex: formData.sex,
        race: formData.race,
        religion: formData.religion,
        placeOfBirth: formData.placeOfBirth,
        socialSecurityNumber: formData.socialSecurityNumber,
        address: formData.address ? {
          street: formData.address.split(',')[0]?.trim(),
          city: formData.address.split(',')[1]?.trim(),
          state: formData.address.split(',')[2]?.trim().split(' ')[0],
          zip: formData.address.split(',')[2]?.trim().split(' ')[1],
        } : undefined,
        physicalDescription: {
          height: formData.height,
          weight: formData.weight,
          hairColor: formData.hairColor,
          eyeColor: formData.eyeColor,
          tattoosScars: formData.tattoosScars,
        },
        legalGuardian: formData.legalGuardian,
        guardianRelationship: formData.guardianRelationship,
        guardianContact: formData.guardianContact,
        guardianPhone: formData.guardianPhone,
        guardianEmail: formData.guardianEmail,
        professionals: formData.professionals && formData.professionals.length > 0 ? formData.professionals : null,
        ...professionalsToLegacyFields(formData.professionals || []),
        placementAuthority: formData.placementAuthority?.[0],
        estimatedStay: formData.estimatedStay,
        currentSchool: formData.currentSchool,
        grade: formData.grade,
        hasIEP: formData.hasIEP,
        academicStrengths: formData.academicStrengths,
        academicChallenges: formData.academicChallenges,
        educationGoals: formData.educationGoals,
        schoolContact: formData.schoolContact,
        schoolPhone: formData.schoolPhone,
        physician: formData.physician,
        physicianPhone: formData.physicianPhone,
        insuranceProvider: formData.insuranceProvider,
        policyNumber: formData.policyNumber,
        allergies: formData.allergies,
        medicalConditions: formData.medicalConditions,
        medicalRestrictions: formData.medicalRestrictions,
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
        priorPlacements: formData.priorPlacements,
        numPriorPlacements: formData.numPriorPlacements,
        lengthRecentPlacement: formData.lengthRecentPlacement,
        courtInvolvement: formData.courtInvolvement,
        onSubsystem: formData.onSubsystem,
        pointsInCurrentLevel: formData.pointsInCurrentLevel,
        dailyPointsForPrivileges: formData.dailyPointsForPrivileges,
        updatedAt: new Date(),
      } as any;

      const updated = updateYouthLocal(youth.id, update);
      toast.success(`Updated ${updated.firstName} ${updated.lastName}`);
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      console.error('Local update error', e);
      toast.error('Failed to update youth profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'personal', label: 'Personal' },
    { id: 'background', label: 'Background' },
    { id: 'education', label: 'Education' },
    { id: 'medical', label: 'Medical' },
    { id: 'mental', label: 'Mental Health' },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Edit Youth Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 py-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 mb-4">
              {tabs.map(t => <TabsTrigger key={t.id} value={t.id}>{t.label}</TabsTrigger>)}
            </TabsList>
            <TabsContent value="personal">
              <PersonalInfoTab formData={formData} handleChange={handleChange} handleSelectChange={handleSelectChange} handleProfessionalsChange={handleProfessionalsChange} />
            </TabsContent>
            <TabsContent value="background">
              <BackgroundTab formData={formData} handleChange={handleChange} setFormData={setFormData} />
            </TabsContent>
            <TabsContent value="education">
              <EducationTab formData={formData} handleChange={handleChange} handleCheckboxChange={handleCheckboxChange} />
            </TabsContent>
            <TabsContent value="medical">
              <MedicalTab formData={formData} handleChange={handleChange} />
            </TabsContent>
            <TabsContent value="mental">
              <MentalHealthTab formData={formData} handleChange={handleChange} handleCheckboxChange={handleCheckboxChange} setFormData={setFormData} />
            </TabsContent>
          </Tabs>
          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Updating...' : 'Update Profile'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

