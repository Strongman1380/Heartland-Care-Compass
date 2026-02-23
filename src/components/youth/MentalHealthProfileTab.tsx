import { useState } from "react";
import { Youth } from "@/integrations/firebase/services";
import { format } from "date-fns";
import { Edit3, Check, X } from "lucide-react";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface MentalHealthProfileTabProps {
  youth: Youth;
  onYouthUpdated?: (updated?: Youth) => void;
}

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "textarea" | "date" | "select" | "number";
  options?: { value: string; label: string }[];
}

const EditableField = ({ label, value, onSave, type = "text", options }: EditableFieldProps) => {
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
            {type === "select" && options ? (
              <Select value={editValue} onValueChange={setEditValue}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                type={type === "number" ? "number" : type}
                className="flex-1"
                disabled={isSaving}
              />
            )}

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

export const MentalHealthProfileTab = ({ youth, onYouthUpdated }: MentalHealthProfileTabProps) => {
  const { updateYouth } = useYouth();

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not available";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return format(date, "yyyy-MM-dd");
    } catch {
      return "";
    }
  };

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
        <h3 className="font-semibold text-red-800 mb-4">Mental Health Summary</h3>
        <div className="space-y-4">
          <EditableField
            label="Mental Health Info"
            value={youth.mentalHealthInfo}
            onSave={(value) => handleFieldUpdate('mentalHealthInfo', value)}
            type="textarea"
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Mental Health Details</h3>
        <div className="space-y-1">
          <EditableField
            label="Current Diagnoses"
            value={youth.currentDiagnoses}
            onSave={(value) => handleFieldUpdate('currentDiagnoses', value)}
          />
          <EditableField
            label="Previous Treatment"
            value={youth.previousTreatment}
            onSave={(value) => handleFieldUpdate('previousTreatment', value)}
          />
          <EditableField
            label="Therapist Name"
            value={youth.therapistName}
            onSave={(value) => handleFieldUpdate('therapistName', value)}
          />
          <EditableField
            label="Therapist Contact"
            value={youth.therapistContact}
            onSave={(value) => handleFieldUpdate('therapistContact', value)}
          />
          <EditableField
            label="Session Frequency"
            value={youth.sessionFrequency}
            onSave={(value) => handleFieldUpdate('sessionFrequency', value)}
          />
          <EditableField
            label="Session Time"
            value={youth.sessionTime}
            onSave={(value) => handleFieldUpdate('sessionTime', value)}
          />
          <EditableField
            label="Last Incident Date"
            value={formatDateForInput(youth.lastIncidentDate)}
            onSave={(value) => handleFieldUpdate('lastIncidentDate', value)}
            type="date"
          />
        </div>
      </div>
    </div>
  );
};
