
import { useState } from "react";
import { Youth } from "@/integrations/firebase/services";
import { format } from "date-fns";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";

interface PersonalInfoProfileTabProps {
  youth: Youth;
  onYouthUpdated?: (updated?: Youth) => void;
}

interface EditableFieldProps {
  label: string;
  value: string | number | null;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "date" | "select";
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
                type={type}
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

export const PersonalInfoProfileTab = ({ youth, onYouthUpdated }: PersonalInfoProfileTabProps) => {
  const { updateYouth } = useYouth();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      return format(date, "MMMM d, yyyy");
    } catch {
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

    // Special handling for date fields
    if (field === 'dob' || field === 'admissionDate') {
      updateData[field] = value || null;
    }

    // Special handling for level (convert to number)
    if (field === 'level') {
      updateData[field] = parseInt(value) || 1;
    }

    const updated = await updateYouth(youth.id, updateData);

    if (onYouthUpdated) {
      onYouthUpdated(updated);
    }
  };

  const levelOptions = [
    { value: "1", label: "Level 1" },
    { value: "2", label: "Level 2" },
    { value: "3", label: "Level 3" },
    { value: "4", label: "Level 4" },
    { value: "5", label: "Level 5" },
    { value: "6", label: "Level 6" }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-red-800 mb-4">Basic Information</h3>
          <div className="space-y-1">
            <EditableField
              label="First Name"
              value={youth.firstName}
              onSave={(value) => handleFieldUpdate('firstName', value)}
            />
            <EditableField
              label="Last Name"
              value={youth.lastName}
              onSave={(value) => handleFieldUpdate('lastName', value)}
            />
            <EditableField
              label="Date of Birth"
              value={formatDateForInput(youth.dob)}
              onSave={(value) => handleFieldUpdate('dob', value)}
              type="date"
            />
            {youth.age && (
              <EditableField
                label="Age"
                value={youth.age}
                onSave={(value) => handleFieldUpdate('age', value)}
              />
            )}
            {youth.sex && (
              <EditableField
                label="Sex"
                value={youth.sex}
                onSave={(value) => handleFieldUpdate('sex', value)}
              />
            )}
            {youth.race && (
              <EditableField
                label="Race"
                value={youth.race}
                onSave={(value) => handleFieldUpdate('race', value)}
              />
            )}
            {youth.socialSecurityNumber && (
              <EditableField
                label="SSN"
                value={youth.socialSecurityNumber}
                onSave={(value) => handleFieldUpdate('socialSecurityNumber', value)}
              />
            )}
            {youth.placeOfBirth && (
              <EditableField
                label="Place of Birth"
                value={youth.placeOfBirth}
                onSave={(value) => handleFieldUpdate('placeOfBirth', value)}
              />
            )}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-red-800 mb-4">Placement Information</h3>
          <div className="space-y-1">
            <EditableField
              label="Admission Date"
              value={formatDateForInput(youth.admissionDate)}
              onSave={(value) => handleFieldUpdate('admissionDate', value)}
              type="date"
            />
            <EditableField
              label="Current Level"
              value={youth.level?.toString()}
              onSave={(value) => handleFieldUpdate('level', value)}
              type="select"
              options={levelOptions}
            />
            {youth.pointTotal != null && youth.pointTotal !== 0 && (
              <EditableField
                label="Point Total"
                value={youth.pointTotal}
                onSave={(value) => handleFieldUpdate('pointTotal', value)}
              />
            )}
            {youth.legalStatus && (
              <EditableField
                label="Legal Status"
                value={youth.legalStatus}
                onSave={(value) => handleFieldUpdate('legalStatus', value)}
              />
            )}
            {youth.religion && (
              <EditableField
                label="Religion"
                value={youth.religion}
                onSave={(value) => handleFieldUpdate('religion', value)}
              />
            )}
            {youth.referralSource && (
              <EditableField
                label="Referral Source"
                value={youth.referralSource}
                onSave={(value) => handleFieldUpdate('referralSource', value)}
              />
            )}
            {youth.referralReason && (
              <EditableField
                label="Referral Reason"
                value={youth.referralReason}
                onSave={(value) => handleFieldUpdate('referralReason', value)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
