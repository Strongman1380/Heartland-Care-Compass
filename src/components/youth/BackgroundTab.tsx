
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { YouthFormData } from "@/hooks/useYouthForm";

interface BackgroundTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  setFormData: React.Dispatch<React.SetStateAction<YouthFormData>>;
}

export const BackgroundTab = ({ formData, handleChange, setFormData }: BackgroundTabProps) => {
  return (
    <div className="space-y-4">
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
    </div>
  );
};
