import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Youth } from "@/integrations/firebase/services";

const DISCHARGE_CATEGORIES = [
  { value: "successful", label: "Successful Discharge / Completion of Program" },
  { value: "maximum_benefit", label: "Maximum Benefit" },
  { value: "unsuccessful", label: "Unsuccessful Discharge" },
] as const;

const UNSUCCESSFUL_REASONS = [
  { value: "aggression", label: "Aggression" },
  { value: "continued_non_compliance", label: "Continued Non-Compliance" },
  { value: "failure_to_move_forward", label: "Failure to Move Forward" },
  { value: "continued_substance_abuse", label: "Continued Substance Abuse" },
  { value: "continued_program_violations", label: "Continued Significant Program Violations" },
] as const;

interface DischargeDialogProps {
  youth: Youth | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (data: {
    dischargeCategory: string;
    dischargeReason: string;
    dischargeNotes: string;
  }) => void;
}

export const DischargeDialog = ({ youth, open, onClose, onConfirm }: DischargeDialogProps) => {
  const [category, setCategory] = useState("");
  const [unsuccessfulReason, setUnsuccessfulReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleClose = () => {
    setCategory("");
    setUnsuccessfulReason("");
    setNotes("");
    onClose();
  };

  const handleConfirm = () => {
    const reasonLabel = category === "unsuccessful"
      ? UNSUCCESSFUL_REASONS.find(r => r.value === unsuccessfulReason)?.label || unsuccessfulReason
      : DISCHARGE_CATEGORIES.find(c => c.value === category)?.label || category;

    onConfirm({
      dischargeCategory: category,
      dischargeReason: reasonLabel,
      dischargeNotes: notes,
    });
    handleClose();
  };

  const isValid = category && (category !== "unsuccessful" || unsuccessfulReason);

  if (!youth) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Discharge {youth.firstName} {youth.lastName}</DialogTitle>
          <DialogDescription>
            This will discharge the youth from the program. Their data will be preserved but they will be removed from the active list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="text-sm font-semibold mb-2 block">Discharge Category</Label>
            <RadioGroup value={category} onValueChange={(v) => { setCategory(v); setUnsuccessfulReason(""); }}>
              {DISCHARGE_CATEGORIES.map((c) => (
                <div key={c.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={c.value} id={c.value} />
                  <Label htmlFor={c.value} className="cursor-pointer">{c.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {category === "unsuccessful" && (
            <div className="ml-6 border-l-2 border-red-200 pl-4">
              <Label className="text-sm font-semibold mb-2 block">Reason</Label>
              <RadioGroup value={unsuccessfulReason} onValueChange={setUnsuccessfulReason}>
                {UNSUCCESSFUL_REASONS.map((r) => (
                  <div key={r.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="cursor-pointer">{r.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          <div>
            <Label htmlFor="discharge-notes" className="text-sm font-semibold mb-2 block">Notes (optional)</Label>
            <Textarea
              id="discharge-notes"
              placeholder="Additional notes about the discharge..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Confirm Discharge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
