
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { saveProgressNote } from "@/utils/local-storage-utils";

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  youthId: string;
  youthName: string;
}

type NoteType = "session" | "general";

export const QuickNoteDialog = ({
  open,
  onOpenChange,
  youthId,
  youthName,
}: QuickNoteDialogProps) => {
  const [noteType, setNoteType] = useState<NoteType>("session");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staff, setStaff] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setNoteType("session");
    setDate(format(new Date(), "yyyy-MM-dd"));
    setStaff("");
    setNoteText("");
  };

  const handleSave = async () => {
    if (!staff.trim()) {
      toast.error("Staff name is required");
      return;
    }
    if (!noteText.trim()) {
      toast.error("Please enter a note");
      return;
    }

    try {
      setIsSubmitting(true);

      const structuredNote = {
        formatVersion: "v2",
        noteType,
        sections: {
          summary: noteText.trim(),
          strengthsChallenges: "",
          interventionsResponse: "",
          planNextSteps: "",
        },
      };

      await saveProgressNote(youthId, {
        date: new Date(date),
        category: noteType === "session" ? "Session Note" : "General Note",
        note: JSON.stringify(structuredNote),
        staff: staff.trim(),
      });

      toast.success(`${noteType === "session" ? "Session" : "General"} note saved for ${youthName}`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to save note";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
          <DialogDescription>
            Add a note for {youthName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="quick-note-type">Note Type</Label>
            <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
              <SelectTrigger id="quick-note-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">Session Note</SelectItem>
                <SelectItem value="general">General Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="quick-note-date">Date</Label>
            <Input
              id="quick-note-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="quick-note-staff">Staff Name</Label>
            <Input
              id="quick-note-staff"
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              placeholder="Staff completing the note"
            />
          </div>

          <div>
            <Label htmlFor="quick-note-text">Note</Label>
            <Textarea
              id="quick-note-text"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter your note here..."
              rows={5}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
