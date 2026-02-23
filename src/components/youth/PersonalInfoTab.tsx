
import React, { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, User, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { YouthFormData } from "@/hooks/useYouthForm";
import { printYouthProfile } from "@/utils/profileExport";
import { Youth, Professional } from "@/types/app-types";
import { ProfessionalsSection } from "./ProfessionalsSection";

interface PersonalInfoTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handlePhotoUpload?: (photoData: string) => void;
  handleProfessionalsChange?: (professionals: Professional[]) => void;
  profilePhoto?: string | null;
}

export const PersonalInfoTab = ({ formData, handleChange, handleSelectChange, handlePhotoUpload, handleProfessionalsChange, profilePhoto }: PersonalInfoTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Get the placement authority value, ensuring it's never an empty string
  const placementAuthorityValue = formData.placementAuthority[0] && formData.placementAuthority[0].trim() !== "" ? formData.placementAuthority[0] : undefined;
  // Get the level value, ensuring it's never an empty string
  const levelValue = formData.level && formData.level.trim() !== "" ? formData.level : undefined;
  // Get the estimated stay value, ensuring it's never an empty string
  const estimatedStayValue = formData.estimatedStay && formData.estimatedStay.trim() !== "" ? formData.estimatedStay : undefined;
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Photo must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        handlePhotoUpload?.(base64String);
        toast.success("Photo uploaded successfully");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportProfile = async () => {
    try {
      // Convert YouthFormData to Youth type for the PDF generator
      const youthData: Youth = {
        id: formData.id || 'temp-id',
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        dob: formData.dob || '',
        age: formData.age || 0,
        sex: formData.sex || '',
        race: formData.race || '',
        placeOfBirth: formData.placeOfBirth || '',
        address: {
          street: formData.address || '',
          city: formData.city || '',
          state: formData.state || '',
          zip: formData.zip || ''
        },
        phoneNumber: formData.phoneNumber || '',
        email: formData.email || '',
        admissionDate: formData.admissionDate || '',
        admissionTime: formData.admissionTime || '',
        rcsIn: formData.rcsIn || '',
        level: formData.level || '',
        legalStatus: formData.legalStatus || '',
        legalGuardian: formData.legalGuardian || '',
        mother: {
          name: formData.motherName || '',
          phone: formData.motherPhone || ''
        },
        father: {
          name: formData.fatherName || '',
          phone: formData.fatherPhone || ''
        },
        nextOfKin: {
          name: formData.nextOfKinName || '',
          relationship: formData.nextOfKinRelationship || '',
          phone: formData.nextOfKinPhone || ''
        },
        emergencyContact: formData.emergencyContact || '',
        probationOfficer: formData.probationOfficer || '',
        probationContact: formData.probationContact || '',
        guardianAdLitem: formData.guardianAdLitem || '',
        attorney: formData.attorney || '',
        judge: formData.judge || '',
        placingAgencyCounty: formData.placingAgencyCounty || '',
        referralSource: formData.referralSource || '',
        physicalDescription: {
          height: formData.height || '',
          weight: formData.weight || '',
          hairColor: formData.hairColor || '',
          eyeColor: formData.eyeColor || '',
          tattoosScars: formData.tattoosScars || ''
        },
        physician: formData.physician || '',
        physicianPhone: formData.physicianPhone || '',
        insuranceProvider: formData.insuranceProvider || '',
        policyNumber: formData.policyNumber || '',
        allergies: formData.allergies || '',
        currentMedications: formData.currentMedications || '',
        medicalConditions: formData.medicalConditions || '',
        medicalRestrictions: formData.medicalRestrictions || '',
        significantHealthConditions: formData.significantHealthConditions || '',
        schoolName: formData.schoolName || '',
        schoolPhone: formData.schoolPhone || '',
        gradeLevel: formData.gradeLevel || '',
        iepStatus: formData.iepStatus || '',
        academicStrengths: formData.academicStrengths || '',
        academicChallenges: formData.academicChallenges || '',
        educationGoals: formData.educationGoals || '',
        currentDiagnoses: formData.currentDiagnoses || '',
        currentTherapist: formData.currentTherapist || '',
        therapistPhone: formData.therapistPhone || '',
        sessionTime: formData.sessionTime || '',
        previousTreatment: formData.previousTreatment || '',
        traumaHistory: formData.traumaHistory || [],
        selfHarmHistory: formData.selfHarmHistory || [],
        hasSafetyPlan: formData.hasSafetyPlan || false,
        strengthsTalents: formData.strengthsTalents || '',
        behaviorProblems: formData.behaviorProblems || '',
        triggers: formData.triggers || '',
        tobaccoPast6To12Months: formData.tobaccoPast6To12Months || false,
        alcoholPast6To12Months: formData.alcoholPast6To12Months || false,
        drugsVapingMarijuanaPast6To12Months: formData.drugsVapingMarijuanaPast6To12Months || false,
        drugTestingDates: formData.drugTestingDates || '',
        dischargePlan: {
          parents: formData.dischargeToParents || '',
          relative: {
            name: formData.dischargeRelativeName || '',
            relationship: formData.dischargeRelativeRelationship || ''
          },
          regularFosterCare: formData.regularFosterCare || false,
          estimatedLengthOfStayMonths: formData.estimatedStay ? parseInt(formData.estimatedStay) : undefined
        },
        religion: formData.religion || '',
        interests: formData.interests || '',
        specialNeeds: formData.specialNeeds || '',
        additionalNotes: formData.additionalNotes || '',
        profilePhoto: profilePhoto || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      printYouthProfile(youthData);
    } catch (error) {
      console.error('Error printing profile:', error);
      toast.error("Failed to open print dialog. Please allow popups.");
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Header with Export Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Personal Information</h3>
        <Button
          variant="outline"
          onClick={handleExportProfile}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Profile
        </Button>
      </div>

      {/* Photo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
              {profilePhoto ? (
                <img 
                  src={profilePhoto} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-10 w-10 text-gray-400" />
              )}
            </div>
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <Camera className="h-4 w-4" />
                Upload Photo
              </Button>
              <p className="text-xs text-gray-500">Max file size: 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="idNumber">Youth ID Number</Label>
          <Input 
            id="idNumber" 
            name="idNumber" 
            value={formData.idNumber} 
            onChange={handleChange}
            className="bg-gray-50"
            placeholder="Auto-generated ID"
          />
        </div>
        
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
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Select name="level" value={levelValue} onValueChange={value => handleSelectChange("level", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Orientation</SelectItem>
              <SelectItem value="1">Level 1</SelectItem>
              <SelectItem value="2">Level 2</SelectItem>
              <SelectItem value="3">Level 3</SelectItem>
              <SelectItem value="4">Level 4</SelectItem>
              <SelectItem value="5">Level 5</SelectItem>
              <SelectItem value="6">Level 6</SelectItem>
              <SelectItem value="7">Level 7</SelectItem>
              <SelectItem value="8">Level 8</SelectItem>
              <SelectItem value="9">Level 9</SelectItem>
              <SelectItem value="10">Level 10</SelectItem>
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
          <Label htmlFor="guardianContact">Guardian Contact Phone</Label>
          <Input 
            id="guardianContact" 
            name="guardianContact" 
            value={formData.guardianContact} 
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
          <Label htmlFor="probationContact">Probation Officer Contact</Label>
          <Input 
            id="probationContact" 
            name="probationContact" 
            value={formData.probationContact} 
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Placement Authority</Label>
          <Select 
            name="placementAuthority" 
            value={placementAuthorityValue} 
            onValueChange={value => handleSelectChange("placementAuthority", value)}
          >
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
          <Select name="estimatedStay" value={estimatedStayValue} onValueChange={value => handleSelectChange("estimatedStay", value)}>
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
    </div>
  </CardContent>
</Card>

      {/* Additional Comprehensive Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sex">Sex</Label>
                <Select name="sex" value={formData.sex || undefined} onValueChange={value => handleSelectChange("sex", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="race">Race/Ethnicity</Label>
                <Input
                  id="race"
                  name="race"
                  value={formData.race}
                  placeholder="e.g., Caucasian, Hispanic, etc."
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="religion">Religion</Label>
                <Input
                  id="religion"
                  name="religion"
                  value={formData.religion}
                  placeholder="Religious preference"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <Input
                  id="placeOfBirth"
                  name="placeOfBirth"
                  value={formData.placeOfBirth}
                  placeholder="City, State"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="socialSecurityNumber">Social Security Number</Label>
                <Input
                  id="socialSecurityNumber"
                  name="socialSecurityNumber"
                  value={formData.socialSecurityNumber}
                  placeholder="XXX-XX-XXXX"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Home Address</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                placeholder="Street Address, City, State, ZIP"
                rows={3}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  name="height"
                  value={formData.height}
                  placeholder="e.g., 5'8&quot;"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  placeholder="e.g., 150 lbs"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hairColor">Hair Color</Label>
                <Input
                  id="hairColor"
                  name="hairColor"
                  value={formData.hairColor}
                  placeholder="e.g., Brown"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eyeColor">Eye Color</Label>
                <Input
                  id="eyeColor"
                  name="eyeColor"
                  value={formData.eyeColor}
                  placeholder="e.g., Blue"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tattoosScars">Tattoos/Scars/Identifying Marks</Label>
              <Textarea
                id="tattoosScars"
                name="tattoosScars"
                value={formData.tattoosScars}
                placeholder="Describe any tattoos, scars, or identifying marks"
                rows={3}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Contact & Family Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="motherName">Mother's Name</Label>
                <Input
                  id="motherName"
                  name="motherName"
                  value={formData.motherName}
                  placeholder="Full name"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="motherPhone">Mother's Phone</Label>
                <Input
                  id="motherPhone"
                  name="motherPhone"
                  value={formData.motherPhone}
                  placeholder="(XXX) XXX-XXXX"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fatherName">Father's Name</Label>
                <Input
                  id="fatherName"
                  name="fatherName"
                  value={formData.fatherName}
                  placeholder="Full name"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fatherPhone">Father's Phone</Label>
                <Input
                  id="fatherPhone"
                  name="fatherPhone"
                  value={formData.fatherPhone}
                  placeholder="(XXX) XXX-XXXX"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nextOfKinName">Next of Kin Name</Label>
                <Input
                  id="nextOfKinName"
                  name="nextOfKinName"
                  value={formData.nextOfKinName}
                  placeholder="Full name"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextOfKinRelationship">Relationship</Label>
                <Input
                  id="nextOfKinRelationship"
                  name="nextOfKinRelationship"
                  value={formData.nextOfKinRelationship}
                  placeholder="e.g., Aunt, Uncle"
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextOfKinPhone">Next of Kin Phone</Label>
                <Input
                  id="nextOfKinPhone"
                  name="nextOfKinPhone"
                  value={formData.nextOfKinPhone}
                  placeholder="(XXX) XXX-XXXX"
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal and Placement Information */}
      <Card>
        <CardHeader>
          <CardTitle>Legal & Placement Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="placingAgencyCounty">Placing Agency/County</Label>
              <Input
                id="placingAgencyCounty"
                name="placingAgencyCounty"
                value={formData.placingAgencyCounty}
                placeholder="Agency or county name"
                onChange={handleChange}
              />
            </div>

            <ProfessionalsSection
              professionals={formData.professionals || []}
              onChange={handleProfessionalsChange || (() => {})}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
