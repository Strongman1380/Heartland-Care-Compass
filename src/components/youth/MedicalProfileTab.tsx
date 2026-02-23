
import { useState } from "react";
import { Youth } from "@/integrations/firebase/services";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";

interface MedicalProfileTabProps {
  youth: Youth;
  onYouthUpdated?: (updated?: Youth) => void;
}

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "textarea";
}

const EditableField = ({ label, value, onSave, type = "text" }: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value?.toString() || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === (value?.toString() || "")) {
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
    setEditValue(value?.toString() || "");
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
              value={editValue}
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

  return (
    <div className="flex items-center justify-between group hover:bg-gray-50 p-2 rounded">
      <span className="font-medium text-gray-700 min-w-[120px]">{label}:</span>

      <div className="flex items-center flex-1 ml-2">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={editValue}
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

export const MedicalProfileTab = ({ youth, onYouthUpdated }: MedicalProfileTabProps) => {
  const { updateYouth } = useYouth();

  const handleFieldUpdate = async (field: string, value: string) => {
    const updateData: any = { [field]: value || null };
    const updated = await updateYouth(youth.id, updateData);

    if (onYouthUpdated) {
      onYouthUpdated(updated);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-4">Medical Summary</h3>
        <div className="space-y-4">
          <EditableField
            label="Medical Info"
            value={youth.medicalInfo}
            onSave={(value) => handleFieldUpdate('medicalInfo', value)}
            type="textarea"
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Medical Information</h3>
        <div className="space-y-1">
          <EditableField
            label="Physician"
            value={youth.physician}
            onSave={(value) => handleFieldUpdate('physician', value)}
          />
          <EditableField
            label="Physician Phone"
            value={youth.physicianPhone}
            onSave={(value) => handleFieldUpdate('physicianPhone', value)}
          />
          <EditableField
            label="Insurance Provider"
            value={youth.insuranceProvider}
            onSave={(value) => handleFieldUpdate('insuranceProvider', value)}
          />
          <EditableField
            label="Policy Number"
            value={youth.policyNumber}
            onSave={(value) => handleFieldUpdate('policyNumber', value)}
          />
          <EditableField
            label="Allergies"
            value={youth.allergies}
            onSave={(value) => handleFieldUpdate('allergies', value)}
          />
          <EditableField
            label="Medical Conditions"
            value={youth.medicalConditions}
            onSave={(value) => handleFieldUpdate('medicalConditions', value)}
          />
          <EditableField
            label="Medical Restrictions"
            value={youth.medicalRestrictions}
            onSave={(value) => handleFieldUpdate('medicalRestrictions', value)}
          />
          <EditableField
            label="Current Medications"
            value={youth.currentMedications}
            onSave={(value) => handleFieldUpdate('currentMedications', value)}
          />
        </div>
      </div>
    </div>
  );
};
