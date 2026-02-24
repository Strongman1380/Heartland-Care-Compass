
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Users, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useYouth } from "@/hooks/useSupabase";
import { saveProgressNote } from "@/utils/local-storage-utils";

interface GroupNotePanelProps {
  onBack: () => void;
}

type NoteType = "session" | "general";

export const GroupNotePanel = ({ onBack }: GroupNotePanelProps) => {
  const { youths, loading, loadYouths } = useYouth();
  const [selectedYouthIds, setSelectedYouthIds] = useState<Set<string>>(new Set());
  const [noteType, setNoteType] = useState<NoteType>("session");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staff, setStaff] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadYouths();
  }, []);

  const sortedYouths = useMemo(() => {
    return [...youths].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
  }, [youths]);

  const toggleYouth = (youthId: string) => {
    setSelectedYouthIds((prev) => {
      const next = new Set(prev);
      if (next.has(youthId)) {
        next.delete(youthId);
      } else {
        next.add(youthId);
      }
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedYouthIds(new Set(sortedYouths.map((y) => y.id)));
    } else {
      setSelectedYouthIds(new Set());
    }
  };

  const handleSubmit = async () => {
    if (selectedYouthIds.size === 0) {
      toast.error("Please select at least one youth");
      return;
    }
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

      const notePayload = {
        date: new Date(date),
        category: noteType === "session" ? "Session Note" : "General Note",
        note: JSON.stringify(structuredNote),
        staff: staff.trim(),
      };

      let saved = 0;
      let failed = 0;

      for (const youthId of selectedYouthIds) {
        try {
          await saveProgressNote(youthId, notePayload);
          saved++;
        } catch {
          failed++;
        }
      }

      if (failed === 0) {
        toast.success(`Group note saved for ${saved} youth${saved > 1 ? "s" : ""}`);
      } else {
        toast.warning(`Saved for ${saved}, failed for ${failed} youth(s)`);
      }

      // Reset form
      setNoteText("");
      setSelectedYouthIds(new Set());
    } catch (error) {
      toast.error("Failed to save group note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft size={16} className="mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Users size={20} className="text-red-700" />
          <h2 className="text-2xl font-bold">Group Note</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Youth selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Select Youth</CardTitle>
            <CardDescription>
              {selectedYouthIds.size} of {sortedYouths.length} selected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-200 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 pb-2 mb-2 border-b">
                  <Checkbox
                    id="group-select-all"
                    checked={selectedYouthIds.size === sortedYouths.length && sortedYouths.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor="group-select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </Label>
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-1">
                  {sortedYouths.map((youth) => (
                    <div
                      key={youth.id}
                      className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                        selectedYouthIds.has(youth.id)
                          ? "bg-red-50 border border-red-200"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                      onClick={() => toggleYouth(youth.id)}
                    >
                      <Checkbox
                        checked={selectedYouthIds.has(youth.id)}
                        onCheckedChange={() => toggleYouth(youth.id)}
                      />
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                        {youth.firstName.charAt(0)}{youth.lastName.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {youth.lastName}, {youth.firstName}
                      </span>
                      {selectedYouthIds.has(youth.id) && (
                        <Check size={14} className="ml-auto text-red-600" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Note form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Note Details</CardTitle>
            <CardDescription>
              This note will be created for each selected youth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="group-note-type">Note Type</Label>
                  <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                    <SelectTrigger id="group-note-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="session">Session Note</SelectItem>
                      <SelectItem value="general">General Note</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="group-note-date">Date</Label>
                  <Input
                    id="group-note-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="group-note-staff">Staff Name</Label>
                  <Input
                    id="group-note-staff"
                    value={staff}
                    onChange={(e) => setStaff(e.target.value)}
                    placeholder="Staff completing the note"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="group-note-text">Note</Label>
                <Textarea
                  id="group-note-text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter the note content that will be saved for each selected youth..."
                  rows={8}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedYouthIds.size === 0}
                className="w-full"
              >
                {isSubmitting
                  ? "Saving..."
                  : `Save Note for ${selectedYouthIds.size} Youth${selectedYouthIds.size !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
