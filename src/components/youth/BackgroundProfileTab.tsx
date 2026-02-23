
import { useState } from "react";
import { Youth } from "@/integrations/firebase/services";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Edit3, Check, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Professional } from "@/types/app-types";
import { resolveProfessionals, professionalsToLegacyFields, PROFESSIONAL_TYPES, PROFESSIONAL_TYPE_LABELS } from "@/utils/professionalUtils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BackgroundProfileTabProps {
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

const ProfessionalsProfileSection = ({ youth, onYouthUpdated }: { youth: Youth; onYouthUpdated?: (updated?: Youth) => void }) => {
  const { updateYouth } = useYouth();
  const [professionals, setProfessionals] = useState<Professional[]>(() => resolveProfessionals(youth));
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Professional | null>(null);

  const addedTypes = new Set(professionals.map(p => p.type));
  const availableTypes = PROFESSIONAL_TYPES.filter(t => !addedTypes.has(t));

  const saveProfessionals = async (updated: Professional[]) => {
    const updateData: any = {
      professionals: updated.length > 0 ? updated : null,
      ...professionalsToLegacyFields(updated),
    };
    const result = await updateYouth(youth.id, updateData);
    setProfessionals(updated);
    if (onYouthUpdated) onYouthUpdated(result);
  };

  const handleAdd = async (type: typeof PROFESSIONAL_TYPES[number]) => {
    const newProf: Professional = { type, name: "", phone: null, email: null };
    const updated = [...professionals, newProf];
    setProfessionals(updated);
    setEditingIndex(updated.length - 1);
    setEditValues(newProf);
  };

  const handleRemove = async (index: number) => {
    const updated = professionals.filter((_, i) => i !== index);
    await saveProfessionals(updated);
    toast.success("Professional removed");
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditValues({ ...professionals[index] });
  };

  const handleCancelEdit = () => {
    // If the entry has no name (was just added), remove it
    if (editingIndex !== null && !professionals[editingIndex].name) {
      setProfessionals(prev => prev.filter((_, i) => i !== editingIndex));
    }
    setEditingIndex(null);
    setEditValues(null);
  };

  const handleSaveEdit = async () => {
    if (editingIndex === null || !editValues) return;
    if (!editValues.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const updated = professionals.map((p, i) => i === editingIndex ? editValues : p);
    await saveProfessionals(updated);
    setEditingIndex(null);
    setEditValues(null);
    toast.success("Professional updated");
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700 text-sm">Professionals</span>
        {availableTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {availableTypes.map(type => (
                <DropdownMenuItem key={type} onClick={() => handleAdd(type)}>
                  {PROFESSIONAL_TYPE_LABELS[type]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {professionals.length === 0 && (
        <p className="text-sm text-gray-500 italic py-2">No professionals added</p>
      )}

      {professionals.map((prof, index) => (
        <div key={`${prof.type}-${index}`} className="border rounded-lg p-3 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">
              {PROFESSIONAL_TYPE_LABELS[prof.type]}
            </span>
            <div className="flex gap-1">
              {editingIndex === index ? (
                <>
                  <Button size="sm" variant="ghost" onClick={handleSaveEdit} className="px-2">
                    <Check size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="px-2">
                    <X size={14} />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => handleStartEdit(index)} className="px-2 opacity-0 group-hover:opacity-100">
                    <Edit3 size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(index)} className="px-2 text-red-500 hover:text-red-700">
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>

          {editingIndex === index && editValues ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                value={editValues.name}
                onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
                placeholder="Name"
              />
              <Input
                value={editValues.phone || ""}
                onChange={(e) => setEditValues({ ...editValues, phone: e.target.value || null })}
                placeholder="Phone"
              />
              <Input
                value={editValues.email || ""}
                onChange={(e) => setEditValues({ ...editValues, email: e.target.value || null })}
                placeholder="Email"
              />
            </div>
          ) : (
            <div className="text-sm text-gray-900">
              <span className="font-medium">{prof.name || "Not specified"}</span>
              {prof.phone && <span className="text-gray-600 ml-3">{prof.phone}</span>}
              {prof.email && <span className="text-gray-600 ml-3">{prof.email}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export const BackgroundProfileTab = ({ youth, onYouthUpdated }: BackgroundProfileTabProps) => {
  const { updateYouth } = useYouth();

  const formatEntityDisplay = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value === "object") {
      const entity = value as { name?: string | null };
      return entity.name || null;
    }
    return null;
  };

  const handleFieldUpdate = async (field: string, value: string) => {
    const updateData: any = { [field]: value || null };
    const updated = await updateYouth(youth.id, updateData);

    if (onYouthUpdated) {
      onYouthUpdated(updated);
    }
  };

  const handleEntityNameUpdate = async (
    field: "legalGuardian" | "probationOfficer",
    value: string
  ) => {
    const currentValue = youth[field];
    let updateData: any;

    if (currentValue && typeof currentValue === "object") {
      updateData = {
        [field]: {
          ...(currentValue as Record<string, unknown>),
          name: value || null,
        },
      };
    } else {
      updateData = { [field]: value || null };
    }

    const updated = await updateYouth(youth.id, updateData);
    if (onYouthUpdated) {
      onYouthUpdated(updated);
    }
  };

  return (
    <div className="space-y-6">
      {(youth.referralSource || youth.referralReason) && (
        <div>
          <h3 className="font-semibold text-red-800 mb-4">Referral Information</h3>
          <div className="space-y-4">
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
                type="textarea"
              />
            )}
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Placement History</h3>
        <div className="space-y-1">
          {youth.placementAuthority && (
            <EditableField
              label="Placement Authority"
              value={youth.placementAuthority}
              onSave={(value) => handleFieldUpdate('placementAuthority', value)}
            />
          )}
          {youth.estimatedStay && (
            <EditableField
              label="Estimated Stay"
              value={youth.estimatedStay}
              onSave={(value) => handleFieldUpdate('estimatedStay', value)}
            />
          )}
          {youth.numPriorPlacements && (
            <EditableField
              label="Number of Prior Placements"
              value={youth.numPriorPlacements}
              onSave={(value) => handleFieldUpdate('numPriorPlacements', value)}
            />
          )}
          {youth.lengthRecentPlacement && (
            <EditableField
              label="Length Recent Placement"
              value={youth.lengthRecentPlacement}
              onSave={(value) => handleFieldUpdate('lengthRecentPlacement', value)}
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Guardian Information</h3>
        <div className="space-y-1">
          {formatEntityDisplay(youth.legalGuardian) && (
            <EditableField
              label="Legal Guardian"
              value={formatEntityDisplay(youth.legalGuardian)}
              onSave={(value) => handleEntityNameUpdate('legalGuardian', value)}
            />
          )}
          {youth.guardianRelationship && (
            <EditableField
              label="Guardian Relationship"
              value={youth.guardianRelationship}
              onSave={(value) => handleFieldUpdate('guardianRelationship', value)}
            />
          )}
          {youth.guardianContact && (
            <EditableField
              label="Guardian Contact"
              value={youth.guardianContact}
              onSave={(value) => handleFieldUpdate('guardianContact', value)}
            />
          )}
          {youth.guardianPhone && (
            <EditableField
              label="Guardian Phone"
              value={youth.guardianPhone}
              onSave={(value) => handleFieldUpdate('guardianPhone', value)}
            />
          )}
          {youth.guardianEmail && (
            <EditableField
              label="Guardian Email"
              value={youth.guardianEmail}
              onSave={(value) => handleFieldUpdate('guardianEmail', value)}
            />
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-red-800 mb-4">Legal & Placement Information</h3>
        <div className="space-y-3">
          {youth.placingAgencyCounty && (
            <EditableField
              label="Placing Agency County"
              value={youth.placingAgencyCounty}
              onSave={(value) => handleFieldUpdate('placingAgencyCounty', value)}
            />
          )}

          <ProfessionalsProfileSection youth={youth} onYouthUpdated={onYouthUpdated} />
        </div>
      </div>
    </div>
  );
};
