
import { useState } from "react";
import { Youth } from "@/integrations/supabase/services";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";

interface EducationProfileTabProps {
  youth: Youth;
  onYouthUpdated?: () => void;
}

interface EditableFieldProps {
  label: string;
  value: string | number | boolean | null;
  onSave: (value: string | boolean) => Promise<void>;
  type?: "text" | "textarea" | "checkbox";
}

const EditableField = ({ label, value, onSave, type = "text" }: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(
    type === "checkbox" ? (value as boolean) : (value?.toString() || "")
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const currentValue = type === "checkbox" ? (value as boolean) : (value?.toString() || "");
    if (editValue === currentValue) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      await onSave(editValue);
      setIsEditing(false);
      toast.success(`${label} updated successfully`);
    } catch (error) {
      toast.error(`Failed to update ${label.toLowerCase()}`);
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(type === "checkbox" ? (value as boolean) : (value?.toString() || ""));
    setIsEditing(false);
  };

  if (type === "textarea") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-gray-700">{label}:</span>
          {!isEditing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="px-2"
            >
              <Edit3 size={14} />
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editValue as string}
              onChange={(e) => setEditValue(e.target.value)}
              className="min-h-[100px]"
              disabled={isSaving}
              placeholder={`Enter ${label.toLowerCase()}...`}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3"
              >
                <Check size={14} className="mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3"
              >
                <X size={14} className="mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-md min-h-[50px]">
            {value || `No ${label.toLowerCase()} available`}
          </div>
        )}
      </div>
    );
  }

  if (type === "checkbox") {
    return (
      <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded">
        <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>

        <div className="flex items-center flex-1 ml-2">
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
              <Checkbox
                checked={editValue as boolean}
                onCheckedChange={setEditValue}
                disabled={isSaving}
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="px-2"
              >
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-2"
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center flex-1">
                <Checkbox checked={value as boolean} disabled />
                <span className="ml-2 text-gray-900">
                  {(value as boolean) ? "Yes" : "No"}
                </span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 transition-opacity px-2"
              >
                <Edit3 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded">
      <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>

      <div className="flex items-center flex-1 ml-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editValue as string}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1"
              disabled={isSaving}
            />
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="px-2"
            >
              <Check size={14} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-2"
            >
              <X size={14} />
            </Button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-gray-900">
              {value || "Not specified"}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(true)}
              className="opacity-0 group-hover:opacity-100 transition-opacity px-2"
            >
              <Edit3 size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export const EducationProfileTab = ({ youth, onYouthUpdated }: EducationProfileTabProps) => {
  const { updateYouth } = useYouth();

  const handleFieldUpdate = async (field: string, value: string | boolean) => {
    const updateData: any = { [field]: value };
    await updateYouth(youth.id, updateData);

    if (onYouthUpdated) {
      onYouthUpdated();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-4">Education Information</h3>
        <div className="space-y-4">
          <EditableField
            label="Education Info"
            value={youth.educationInfo}
            onSave={(value) => handleFieldUpdate('educationInfo', value)}
            type="textarea"
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Detailed Education Information</h3>
        <div className="space-y-1">
          <EditableField
            label="Current School"
            value={youth.currentSchool}
            onSave={(value) => handleFieldUpdate('currentSchool', value)}
          />
          <EditableField
            label="Grade"
            value={youth.grade}
            onSave={(value) => handleFieldUpdate('grade', value)}
          />
          <EditableField
            label="Has IEP"
            value={youth.hasIEP}
            onSave={(value) => handleFieldUpdate('hasIEP', value)}
            type="checkbox"
          />
          <EditableField
            label="Academic Strengths"
            value={youth.academicStrengths}
            onSave={(value) => handleFieldUpdate('academicStrengths', value)}
          />
          <EditableField
            label="Academic Challenges"
            value={youth.academicChallenges}
            onSave={(value) => handleFieldUpdate('academicChallenges', value)}
          />
          <EditableField
            label="Education Goals"
            value={youth.educationGoals}
            onSave={(value) => handleFieldUpdate('educationGoals', value)}
          />
          <EditableField
            label="School Contact"
            value={youth.schoolContact}
            onSave={(value) => handleFieldUpdate('schoolContact', value)}
          />
          <EditableField
            label="School Phone"
            value={youth.schoolPhone}
            onSave={(value) => handleFieldUpdate('schoolPhone', value)}
          />
          <EditableField
            label="Last School Attended"
            value={youth.lastSchoolAttended}
            onSave={(value) => handleFieldUpdate('lastSchoolAttended', value)}
          />
        </div>
      </div>
    </div>
  );
};
