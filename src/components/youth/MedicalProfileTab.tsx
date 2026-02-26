
import { useState } from "react";
import { Youth } from "@/integrations/firebase/services";
import { useYouth } from "@/hooks/useSupabase";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Pill, Edit3, Check, X, Plus, Trash2 } from "lucide-react";
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

// ─── Common allergy options ───────────────────────────────────────────────────
const COMMON_ALLERGIES = [
  "Penicillin",
  "Sulfa drugs",
  "Aspirin / NSAIDs",
  "Latex",
  "Peanuts",
  "Tree nuts",
  "Shellfish",
  "Fish",
  "Milk / Dairy",
  "Eggs",
  "Wheat / Gluten",
  "Soy",
  "Bee stings",
  "Dust / Pet dander",
];

// Parse a comma-separated allergies string into selected set + optional "other" text
// Case-insensitive lookup for common allergies
const COMMON_ALLERGIES_LOWER = new Map(COMMON_ALLERGIES.map((a) => [a.toLowerCase(), a]));

const parseAllergies = (raw: string | null): { selected: Set<string>; other: string } => {
  if (!raw?.trim()) return { selected: new Set(), other: "" };
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const selected = new Set<string>();
  let other = "";
  for (const part of parts) {
    const displayValue = COMMON_ALLERGIES_LOWER.get(part.toLowerCase());
    if (displayValue) {
      selected.add(displayValue);
    } else {
      other = other ? `${other}, ${part}` : part;
    }
  }
  return { selected, other };
};

// Serialize back to comma-separated string
const serializeAllergies = (selected: Set<string>, other: string): string => {
  const parts = [...selected];
  const otherTrimmed = other.trim();
  if (otherTrimmed) {
    // Append each "other" item
    otherTrimmed.split(",").map((s) => s.trim()).filter(Boolean).forEach((s) => parts.push(s));
  }
  return parts.join(", ");
};

// ─── Medication entry type ────────────────────────────────────────────────────
interface MedEntry { name: string; dose: string; frequency: string }

const parseMedications = (raw: string | null): MedEntry[] => {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is Record<string, unknown> => item != null && typeof item === "object" && !Array.isArray(item))
        .map((item) => ({
          name: (typeof item.name === "string" ? item.name.trim() : ""),
          dose: (typeof item.dose === "string" ? item.dose.trim() : ""),
          frequency: (typeof item.frequency === "string" ? item.frequency.trim() : ""),
        }))
        .filter((entry) => entry.name.length > 0);
    }
  } catch {
    // Legacy plain-text value — treat entire string as a single medication name
    return [{ name: raw.trim(), dose: "", frequency: "" }];
  }
  return [];
};

const serializeMedications = (meds: MedEntry[]): string => JSON.stringify(meds);

// ─── AllergyEditor ────────────────────────────────────────────────────────────
interface AllergyEditorProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
}

const AllergyEditor = ({ value, onSave }: AllergyEditorProps) => {
  const initial = parseAllergies(value);
  const [selected, setSelected] = useState<Set<string>>(initial.selected);
  const [other, setOther] = useState(initial.other);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toggle = (allergy: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(allergy) ? next.delete(allergy) : next.add(allergy);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const serialized = serializeAllergies(selected, other);
      await onSave(serialized);
      setIsEditing(false);
      toast.success("Allergies updated");
    } catch {
      toast.error("Failed to update allergies");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    const reset = parseAllergies(value);
    setSelected(reset.selected);
    setOther(reset.other);
    setIsEditing(false);
  };

  const displayValue = serializeAllergies(selected, other);

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between group hover:bg-gray-50 p-2 rounded">
        <span className="font-medium text-gray-700 min-w-[120px]">Allergies:</span>
        <div className="flex items-start flex-1 ml-2">
          <span className="flex-1 text-gray-900">{displayValue || "None specified"}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            className="opacity-0 group-hover:opacity-100 transition-opacity px-2 shrink-0"
          >
            <Edit3 size={14} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4 space-y-4 bg-gray-50">
      <span className="font-medium text-gray-700">Allergies</span>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {COMMON_ALLERGIES.map((allergy) => (
          <div key={allergy} className="flex items-center gap-2">
            <Checkbox
              id={`allergy-${allergy}`}
              checked={selected.has(allergy)}
              onCheckedChange={() => toggle(allergy)}
            />
            <Label htmlFor={`allergy-${allergy}`} className="text-sm cursor-pointer">
              {allergy}
            </Label>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-sm text-gray-600">Other (comma-separated)</Label>
        <Input
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="e.g. Morphine, Codeine"
          disabled={isSaving}
        />
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Check size={14} className="mr-1" /> Save
        </Button>
        <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving}>
          <X size={14} className="mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
};

// ─── MedicationsEditor ────────────────────────────────────────────────────────
interface MedicationsEditorProps {
  value: string | null;
  onSave: (value: string) => Promise<void>;
}

const BLANK_MED: MedEntry = { name: "", dose: "", frequency: "" };

const MedicationsEditor = ({ value, onSave }: MedicationsEditorProps) => {
  const [meds, setMeds] = useState<MedEntry[]>(parseMedications(value));
  const [newMed, setNewMed] = useState<MedEntry>(BLANK_MED);
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const persist = async (updated: MedEntry[]) => {
    try {
      setIsSaving(true);
      await onSave(serializeMedications(updated));
      setMeds(updated);
      toast.success("Medications updated");
    } catch {
      toast.error("Failed to update medications");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = async () => {
    if (!newMed.name.trim()) {
      toast.error("Medication name is required");
      return;
    }
    const updated = [...meds, { ...newMed, name: newMed.name.trim() }];
    await persist(updated);
    setNewMed(BLANK_MED);
    setIsAdding(false);
  };

  const handleRemove = async (index: number) => {
    const updated = meds.filter((_, i) => i !== index);
    await persist(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-700">Current Medications</span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="h-7 px-2 text-xs"
        >
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>

      {meds.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 px-2">No medications on file.</p>
      )}

      {meds.length > 0 && (
        <div className="divide-y border rounded-md">
          {meds.map((med, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{med.name}</span>
                {med.dose && <span className="text-gray-500 ml-2">— {med.dose}</span>}
                {med.frequency && <span className="text-gray-400 ml-2">({med.frequency})</span>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemove(i)}
                disabled={isSaving}
                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="border rounded-md p-3 space-y-2 bg-gray-50">
          <p className="text-xs font-medium text-gray-600">New medication</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Name *</Label>
              <Input
                value={newMed.name}
                onChange={(e) => setNewMed((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Sertraline"
                className="h-8 text-sm"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label className="text-xs">Dose</Label>
              <Input
                value={newMed.dose}
                onChange={(e) => setNewMed((p) => ({ ...p, dose: e.target.value }))}
                placeholder="e.g. 50 mg"
                className="h-8 text-sm"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label className="text-xs">Frequency</Label>
              <Input
                value={newMed.frequency}
                onChange={(e) => setNewMed((p) => ({ ...p, frequency: e.target.value }))}
                placeholder="e.g. Once daily"
                className="h-8 text-sm"
                disabled={isSaving}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={isSaving}>
              <Check size={14} className="mr-1" /> Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setIsAdding(false); setNewMed(BLANK_MED); }}
              disabled={isSaving}
            >
              <X size={14} className="mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── EditableField (unchanged) ────────────────────────────────────────────────
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
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="px-2">
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
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="px-3">
                <Check size={14} className="mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving} className="px-3">
                <X size={14} className="mr-1" /> Cancel
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
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="px-2">
              <Check size={14} />
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} disabled={isSaving} className="px-2">
              <X size={14} />
            </Button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-gray-900">{value || "Not specified"}</span>
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

// ─── MedicalProfileTab ────────────────────────────────────────────────────────
export const MedicalProfileTab = ({ youth, onYouthUpdated }: MedicalProfileTabProps) => {
  const { updateYouth } = useYouth();

  const handleFieldUpdate = async (field: string, value: string) => {
    // Coerce empty or serialized-empty values to null
    let normalizedValue: string | null = value || null;
    if (normalizedValue === "[]") normalizedValue = null;
    const updateData: Record<string, string | null> = { [field]: normalizedValue };
    const updated = await updateYouth(youth.id, updateData);
    if (onYouthUpdated) onYouthUpdated(updated);
  };

  // Format medications for the alert card at top
  const medicationDisplay = (() => {
    const meds = parseMedications(youth.currentMedications);
    if (meds.length === 0) return null;
    return meds.map((m) => [m.name, m.dose, m.frequency].filter(Boolean).join(" ")).join(" • ");
  })();

  return (
    <div className="space-y-6">
      {(youth.allergies?.trim() || medicationDisplay) && (
        <div className="space-y-2">
          {youth.allergies?.trim() && (
            <Alert className="border-red-300 bg-red-50 text-red-800">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              <AlertDescription>
                <span className="font-semibold">Allergies:</span> {youth.allergies}
              </AlertDescription>
            </Alert>
          )}
          {medicationDisplay && (
            <Alert className="border-blue-300 bg-blue-50 text-blue-800">
              <Pill className="h-4 w-4 text-blue-700" />
              <AlertDescription>
                <span className="font-semibold">Current Medications:</span> {medicationDisplay}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

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

          {/* Structured allergy selector */}
          <div className="py-1">
            <AllergyEditor
              value={youth.allergies}
              onSave={(value) => handleFieldUpdate('allergies', value)}
            />
          </div>

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

          {/* Structured medications list */}
          <div className="py-2 px-2">
            <MedicationsEditor
              value={youth.currentMedications}
              onSave={(value) => handleFieldUpdate('currentMedications', value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
