
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YouthFormData } from "@/hooks/useYouthForm";

interface MentalHealthTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (name: string, value: string) => void;
  handleCheckboxChange: (name: string, checked: boolean) => void;
  setFormData: React.Dispatch<React.SetStateAction<YouthFormData>>;
}

export const MentalHealthTab = ({ 
  formData, 
  handleChange, 
  handleSelectChange, 
  handleCheckboxChange, 
  setFormData 
}: MentalHealthTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="diagnoses">Current Diagnoses</Label>
        <Textarea 
          id="diagnoses" 
          name="diagnoses" 
          value={formData.diagnoses} 
          onChange={handleChange} 
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Trauma History</Label>
        <div className="flex flex-wrap gap-4">
          {["None", "Physical Abuse", "Sexual Abuse", "Neglect", "Witness to Violence", "Other"].map((trauma) => (
            <div key={trauma} className="flex items-center space-x-2">
              <Checkbox 
                id={`trauma-${trauma}`}
                checked={formData.traumaHistory.includes(trauma)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({
                      ...prev, 
                      traumaHistory: [...prev.traumaHistory, trauma]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev, 
                      traumaHistory: prev.traumaHistory.filter(t => t !== trauma)
                    }));
                  }
                }}
              />
              <Label htmlFor={`trauma-${trauma}`}>{trauma}</Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="previousTreatment">Previous Treatment</Label>
        <Textarea 
          id="previousTreatment" 
          name="previousTreatment" 
          value={formData.previousTreatment} 
          onChange={handleChange} 
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Current Counseling</Label>
        <div className="flex flex-wrap gap-4">
          {["Individual", "Group", "Family", "None"].map((therapy) => (
            <div key={therapy} className="flex items-center space-x-2">
              <Checkbox 
                id={`therapy-${therapy}`}
                checked={formData.currentCounseling.includes(therapy)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({
                      ...prev, 
                      currentCounseling: [...prev.currentCounseling, therapy]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev, 
                      currentCounseling: prev.currentCounseling.filter(t => t !== therapy)
                    }));
                  }
                }}
              />
              <Label htmlFor={`therapy-${therapy}`}>{therapy}</Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="therapistName">Therapist Name</Label>
          <Input 
            id="therapistName" 
            name="therapistName" 
            value={formData.therapistName} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="therapistContact">Therapist Contact</Label>
          <Input 
            id="therapistContact" 
            name="therapistContact" 
            value={formData.therapistContact} 
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Session Frequency</Label>
          <Select name="sessionFrequency" defaultValue={formData.sessionFrequency} onValueChange={value => handleSelectChange("sessionFrequency", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Weekly">Weekly</SelectItem>
              <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="sessionTime">Day/Time</Label>
          <Input 
            id="sessionTime" 
            name="sessionTime" 
            value={formData.sessionTime} 
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Self-Harm History</Label>
        <Select name="selfHarmHistory" defaultValue={formData.selfHarmHistory} onValueChange={value => handleSelectChange("selfHarmHistory", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Select history" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="Ideation">Ideation</SelectItem>
            <SelectItem value="Attempts">Attempts</SelectItem>
          </SelectContent>
        </Select>
        
        {formData.selfHarmHistory !== "None" && (
          <div className="mt-2">
            <Label htmlFor="selfHarmDate">Date of Last Incident</Label>
            <Input 
              id="selfHarmDate" 
              name="selfHarmDate" 
              type="date"
              value={formData.selfHarmDate} 
              onChange={handleChange} 
            />
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="safetyPlan" 
          checked={formData.safetyPlan}
          onCheckedChange={(checked) => {
            handleCheckboxChange("safetyPlan", checked === true);
          }}
        />
        <Label htmlFor="safetyPlan">Safety Plan in Place</Label>
      </div>
    </div>
  );
};
