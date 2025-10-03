
import { useState } from "react";
import { Youth } from "@/integrations/supabase/services";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3, Check, X } from "lucide-react";
import { toast } from "sonner";

interface BackgroundProfileTabProps {
  youth: Youth;
  onYouthUpdated?: () => void;
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

export const BackgroundProfileTab = ({ youth, onYouthUpdated }: BackgroundProfileTabProps) => {
  const { updateYouth } = useYouth();

  const handleFieldUpdate = async (field: string, value: string) => {
    const updateData: any = { [field]: value || null };
    await updateYouth(youth.id, updateData);

    if (onYouthUpdated) {
      onYouthUpdated();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-4">Referral Information</h3>
        <div className="space-y-4">
          <EditableField
            label="Referral Source"
            value={youth.referralSource}
            onSave={(value) => handleFieldUpdate('referralSource', value)}
          />
          <EditableField
            label="Referral Reason"
            value={youth.referralReason}
            onSave={(value) => handleFieldUpdate('referralReason', value)}
            type="textarea"
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Placement History</h3>
        <div className="space-y-1">
          <EditableField
            label="Placement Authority"
            value={youth.placementAuthority}
            onSave={(value) => handleFieldUpdate('placementAuthority', value)}
          />
          <EditableField
            label="Estimated Stay"
            value={youth.estimatedStay}
            onSave={(value) => handleFieldUpdate('estimatedStay', value)}
          />
          <EditableField
            label="Number of Prior Placements"
            value={youth.numPriorPlacements}
            onSave={(value) => handleFieldUpdate('numPriorPlacements', value)}
          />
          <EditableField
            label="Length Recent Placement"
            value={youth.lengthRecentPlacement}
            onSave={(value) => handleFieldUpdate('lengthRecentPlacement', value)}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Guardian Information</h3>
        <div className="space-y-1">
          <EditableField
            label="Legal Guardian"
            value={youth.legalGuardian}
            onSave={(value) => handleFieldUpdate('legalGuardian', value)}
          />
          <EditableField
            label="Guardian Relationship"
            value={youth.guardianRelationship}
            onSave={(value) => handleFieldUpdate('guardianRelationship', value)}
          />
          <EditableField
            label="Guardian Contact"
            value={youth.guardianContact}
            onSave={(value) => handleFieldUpdate('guardianContact', value)}
          />
          <EditableField
            label="Guardian Phone"
            value={youth.guardianPhone}
            onSave={(value) => handleFieldUpdate('guardianPhone', value)}
          />
          <EditableField
            label="Guardian Email"
            value={youth.guardianEmail}
            onSave={(value) => handleFieldUpdate('guardianEmail', value)}
          />
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Legal Information</h3>
        <div className="space-y-1">
          <EditableField
            label="Probation Officer"
            value={youth.probationOfficer}
            onSave={(value) => handleFieldUpdate('probationOfficer', value)}
          />
          <EditableField
            label="Probation Contact"
            value={youth.probationContact}
            onSave={(value) => handleFieldUpdate('probationContact', value)}
          />
          <EditableField
            label="Probation Phone"
            value={youth.probationPhone}
            onSave={(value) => handleFieldUpdate('probationPhone', value)}
          />
          <EditableField
            label="Placing Agency County"
            value={youth.placingAgencyCounty}
            onSave={(value) => handleFieldUpdate('placingAgencyCounty', value)}
          />
        </div>
      </div>
    </div>
  );
};
