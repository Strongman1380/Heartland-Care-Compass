import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Professional, ProfessionalType } from "@/types/app-types";
import { PROFESSIONAL_TYPES, PROFESSIONAL_TYPE_LABELS } from "@/utils/professionalUtils";

interface ProfessionalsSectionProps {
  professionals: Professional[];
  onChange: (professionals: Professional[]) => void;
}

export const ProfessionalsSection = ({ professionals, onChange }: ProfessionalsSectionProps) => {
  const addedTypes = new Set(professionals.map(p => p.type));
  const availableTypes = PROFESSIONAL_TYPES.filter(t => !addedTypes.has(t));

  const handleAdd = (type: ProfessionalType) => {
    onChange([...professionals, { type, name: "", phone: null, email: null }]);
  };

  const handleUpdate = (index: number, field: keyof Professional, value: string) => {
    const updated = professionals.map((p, i) => {
      if (i !== index) return p;
      return { ...p, [field]: value || null };
    });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    onChange(professionals.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Professionals</Label>
        {availableTypes.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Professional
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
        <p className="text-sm text-gray-500 italic">No professionals added yet</p>
      )}

      {professionals.map((prof, index) => (
        <div key={`${prof.type}-${index}`} className="border rounded-lg p-3 space-y-2 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-red-700">
              {PROFESSIONAL_TYPE_LABELS[prof.type]}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemove(index)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Name</Label>
              <Input
                value={prof.name || ""}
                onChange={(e) => handleUpdate(index, "name", e.target.value)}
                placeholder="Full name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Phone</Label>
              <Input
                value={prof.phone || ""}
                onChange={(e) => handleUpdate(index, "phone", e.target.value)}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Email</Label>
              <Input
                value={prof.email || ""}
                onChange={(e) => handleUpdate(index, "email", e.target.value)}
                placeholder="Email address"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
