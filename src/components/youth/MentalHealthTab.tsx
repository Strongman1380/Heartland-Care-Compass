import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { YouthFormData } from "@/hooks/useYouthForm";

interface MentalHealthTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCheckboxChange: (name: string, checked: boolean) => void;
  handleSelectChange: (name: string, value: string) => void;
  setFormData: React.Dispatch<React.SetStateAction<YouthFormData>>;
}

export const MentalHealthTab = ({ formData, handleChange, handleCheckboxChange, setFormData }: MentalHealthTabProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentDiagnoses">Current Diagnoses</Label>
        <Textarea 
          id="currentDiagnoses" 
          name="currentDiagnoses" 
          value={formData.currentDiagnoses} 
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
          {["Individual", "Group", "Family", "None"].map((counseling) => (
            <div key={counseling} className="flex items-center space-x-2">
              <Checkbox 
                id={`counseling-${counseling}`}
                checked={formData.currentCounseling.includes(counseling)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({
                      ...prev, 
                      currentCounseling: [...prev.currentCounseling, counseling]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev, 
                      currentCounseling: prev.currentCounseling.filter(c => c !== counseling)
                    }));
                  }
                }}
              />
              <Label htmlFor={`counseling-${counseling}`}>{counseling}</Label>
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
          <Label htmlFor="sessionFrequency">Session Frequency</Label>
          <Input 
            id="sessionFrequency" 
            name="sessionFrequency" 
            value={formData.sessionFrequency} 
            onChange={handleChange} 
          />
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
        <div className="flex flex-wrap gap-4">
          {["None", "Ideation", "Attempts"].map((selfHarm) => (
            <div key={selfHarm} className="flex items-center space-x-2">
              <Checkbox 
                id={`selfharm-${selfHarm}`}
                checked={formData.selfHarmHistory.includes(selfHarm)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setFormData(prev => ({
                      ...prev, 
                      selfHarmHistory: [...prev.selfHarmHistory, selfHarm]
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev, 
                      selfHarmHistory: prev.selfHarmHistory.filter(s => s !== selfHarm)
                    }));
                  }
                }}
              />
              <Label htmlFor={`selfharm-${selfHarm}`}>{selfHarm}</Label>
            </div>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="lastIncidentDate">Date of Last Incident</Label>
          <Input 
            id="lastIncidentDate" 
            name="lastIncidentDate" 
            type="date"
            value={formData.lastIncidentDate} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="flex items-center space-x-2 mt-6">
          <Checkbox 
            id="hasSafetyPlan" 
            checked={formData.hasSafetyPlan}
            onCheckedChange={(checked) => {
              handleCheckboxChange("hasSafetyPlan", checked === true);
            }}
          />
          <Label htmlFor="hasSafetyPlan">Safety Plan in Place</Label>
        </div>
      </div>

      {/* Subsystem Status */}
      <div className="border-t pt-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="onSubsystem" 
            checked={formData.onSubsystem}
            onCheckedChange={(checked) => {
              handleCheckboxChange("onSubsystem", checked === true);
            }}
          />
          <Label htmlFor="onSubsystem" className="font-semibold">On Subsystem</Label>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Check if youth is currently on subsystem status for behavioral monitoring
        </p>
      </div>
    </div>
  );
};
