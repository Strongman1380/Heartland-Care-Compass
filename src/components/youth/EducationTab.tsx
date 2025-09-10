
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { YouthFormData } from "@/hooks/useYouthForm";

interface EducationTabProps {
  formData: YouthFormData;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleCheckboxChange: (name: string, checked: boolean) => void;
}

export const EducationTab = ({ formData, handleChange, handleCheckboxChange }: EducationTabProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="currentSchool">Current School</Label>
          <Input 
            id="currentSchool" 
            name="currentSchool" 
            value={formData.currentSchool} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="grade">Grade</Label>
          <Input 
            id="grade" 
            name="grade" 
            value={formData.grade} 
            onChange={handleChange} 
          />
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="hasIEP" 
          checked={formData.hasIEP}
          onCheckedChange={(checked) => {
            handleCheckboxChange("hasIEP", checked === true);
          }}
        />
        <Label htmlFor="hasIEP">Has IEP</Label>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="academicStrengths">Academic Strengths</Label>
        <Textarea 
          id="academicStrengths" 
          name="academicStrengths" 
          value={formData.academicStrengths} 
          onChange={handleChange} 
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="academicChallenges">Academic Challenges</Label>
        <Textarea 
          id="academicChallenges" 
          name="academicChallenges" 
          value={formData.academicChallenges} 
          onChange={handleChange} 
          rows={2}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="educationGoals">Educational Goals</Label>
        <Textarea 
          id="educationGoals" 
          name="educationGoals" 
          value={formData.educationGoals} 
          onChange={handleChange} 
          rows={2}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="schoolContact">School Contact Person</Label>
          <Input 
            id="schoolContact" 
            name="schoolContact" 
            value={formData.schoolContact} 
            onChange={handleChange} 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="schoolPhone">School Phone</Label>
          <Input 
            id="schoolPhone" 
            name="schoolPhone" 
            value={formData.schoolPhone} 
            onChange={handleChange} 
          />
        </div>
      </div>
    </div>
  );
};
