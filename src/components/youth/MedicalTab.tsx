
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { YouthFormData } from "@/hooks/useYouthForm";

interface MedicalTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export const MedicalTab = ({ formData, handleChange }: MedicalTabProps) => {
  return (
    <div className="space-y-4">
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
    </div>
  );
};
