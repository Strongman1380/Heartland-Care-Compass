
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
import { ArrowLeft, Users, ChevronDown, ChevronUp, Check } from "lucide-react";
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
  const [expandedYouthIds, setExpandedYouthIds] = useState<Set<string>>(new Set());
  const [individualNotes, setIndividualNotes] = useState<Record<string, string>>({});
  
  const [noteType, setNoteType] = useState<NoteType>("session");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staff, setStaff] = useState("");
  const [masterNoteText, setMasterNoteText] = useState("");
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

  const toggleExpandYouth = (youthId: string) => {
    setExpandedYouthIds((prev) => {
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
      const allIds = sortedYouths.map((y) => y.id);
      setSelectedYouthIds(new Set(allIds));
    } else {
      setSelectedYouthIds(new Set());
    }
  };

  const updateMasterNote = (text: string) => {
    setMasterNoteText(text);
    // Optional: Update all selected youths' notes when master note changes?
    // User requested "toggle all of them if I want or if I want to do one single one I can"
    // Valid strategy: Master note is a template. Individual notes override it if set.
    // Or: Master note writes to all selected keys in individualNotes.
    
    setIndividualNotes(prev => {
      const next = { ...prev };
      selectedYouthIds.forEach(id => {
        next[id] = text;
      });
      return next;
    });
  };

  const updateIndividualNote = (youthId: string, text: string) => {
    setIndividualNotes(prev => ({
      ...prev,
      [youthId]: text
    }));
    // If we edit an individual note, we should probably ensure they are selected so it gets saved
    if (!selectedYouthIds.has(youthId)) {
      toggleYouth(youthId);
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

    // Check if at least one selected youth has a note
    const hasAnyNote = Array.from(selectedYouthIds).some(id => 
      (individualNotes[id] || masterNoteText).trim().length > 0
    );

    if (!hasAnyNote) {
      toast.error("Please enter a note for at least one selected youth");
      return;
    }

    try {
      setIsSubmitting(true);
      let saved = 0;
      let failed = 0;

      for (const youthId of selectedYouthIds) {
        // Use individual note if present, otherwise fallback to master note
        const noteContent = individualNotes[youthId] !== undefined 
          ? individualNotes[youthId] 
          : masterNoteText;

        if (!noteContent.trim()) continue; // Skip empty notes? Or save empty?

        const structuredNote = {
          formatVersion: "v2",
          noteType,
          sections: {
            summary: noteContent.trim(),
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
      setMasterNoteText("");
      setIndividualNotes({});
      setSelectedYouthIds(new Set());
      setExpandedYouthIds(new Set());
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Panel (Top/Left) */}
        <Card className="lg:col-span-12">
           <CardHeader>
            <CardTitle className="text-base">Note Configuration</CardTitle>
            <CardDescription>Configure common details for the group note</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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

                <div className="flex items-end">
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
            </div>
          </CardContent>
        </Card>

        {/* Master Note Input */}
        <Card className="lg:col-span-12 bg-slate-50 border-dashed">
          <CardContent className="pt-6">
             <Label htmlFor="master-note" className="text-base font-semibold text-slate-700">Master Note (Applies to all selected)</Label>
             <p className="text-xs text-slate-500 mb-2">Typing here will update the note for all currently selected youth below.</p>
             <Textarea
                id="master-note"
                value={masterNoteText}
                onChange={(e) => updateMasterNote(e.target.value)}
                placeholder="Enter a common note for all selected youth..."
                rows={3}
                className="bg-white"
              />
          </CardContent>
        </Card>

        {/* Youth selection & Individual Notes */}
        <Card className="lg:col-span-12">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Youth Notes</CardTitle>
                <CardDescription>
                  {selectedYouthIds.size} of {sortedYouths.length} selected
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                 <Checkbox
                    id="group-select-all"
                    checked={selectedYouthIds.size === sortedYouths.length && sortedYouths.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <Label htmlFor="group-select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-200 rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedYouths.map((youth) => {
                  const isExpanded = expandedYouthIds.has(youth.id);
                  const isSelected = selectedYouthIds.has(youth.id);
                  const currentNote = individualNotes[youth.id] !== undefined ? individualNotes[youth.id] : "";

                  return (
                    <div
                      key={youth.id}
                      className={`border rounded-md transition-all ${
                        isSelected ? "border-red-200 bg-red-50/30" : "border-slate-200"
                      }`}
                    >
                      {/* Header Row */}
                      <div 
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleExpandYouth(youth.id)}
                      >
                         <div onClick={(e) => e.stopPropagation()}>
                           <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleYouth(youth.id)}
                          />
                         </div>
                        
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-red-500 to-yellow-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                          {youth.firstName.charAt(0)}{youth.lastName.charAt(0)}
                        </div>
                        
                        <div className="flex-1">
                           <span className="text-sm font-medium text-gray-900 block">
                            {youth.lastName}, {youth.firstName}
                          </span>
                          {currentNote && !isExpanded && (
                             <p className="text-xs text-slate-500 truncate max-w-[500px]">{currentNote}</p>
                          )}
                        </div>

                        {isSelected && <Check size={16} className="text-red-600 mr-2" />}
                        {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-3 pt-0 border-t border-slate-100 bg-white rounded-b-md">
                           <Label className="text-xs text-slate-500 mb-1.5 block">Note for {youth.firstName}</Label>
                           <Textarea 
                              value={currentNote}
                              onChange={(e) => updateIndividualNote(youth.id, e.target.value)}
                              placeholder={`Enter note specifically for ${youth.firstName}...`}
                              className="min-h-[100px]"
                           />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
