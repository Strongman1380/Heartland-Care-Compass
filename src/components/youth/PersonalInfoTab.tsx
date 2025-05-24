
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YouthFormData } from "@/hooks/useYouthForm";

interface PersonalInfoTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
}

export const PersonalInfoTab = ({ formData, handleChange, handleSelectChange }: PersonalInfoTabProps) => {
  // Get the placement authority value, ensuring it's never an empty string
  const placementAuthorityValue = formData.placementAuthority[0] && formData.placementAuthority[0].trim() !== "" ? formData.placementAuthority[0] : undefined;
  // Get the level value, ensuring it's never an empty string
  const levelValue = formData.level && formData.level.trim() !== "" ? formData.level : undefined;
  // Get the estimated stay value, ensuring it's never an empty string
  const estimatedStayValue = formData.estimatedStay && formData.estimatedStay.trim() !== "" ? formData.estimatedStay : undefined;
  
  return (
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
          <Select name="level" value={levelValue} onValueChange={value => handleSelectChange("level", value)}>
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
  );
};
