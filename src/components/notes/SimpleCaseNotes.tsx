import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronRight, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes } from "@/hooks/useSupabase";
import { type CaseNotes as CaseNote } from "@/integrations/firebase/services";

type CaseNoteSections = {
  summary?: string;
  strengthsChallenges?: string;
  interventionsResponse?: string;
  planNextSteps?: string;
};

interface SimpleCaseNotesProps {
  youthId: string;
}

export const SimpleCaseNotes = ({ youthId }: SimpleCaseNotesProps) => {
  const [filteredNotes, setFilteredNotes] = useState<CaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use Supabase hooks
  const { caseNotes: notes, loading: isLoading, createCaseNote, deleteCaseNote } = useCaseNotes(youthId);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    staff: "",
    summary: "",
    strengthsChallenges: "",
    interventionsResponse: "",
    planNextSteps: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm]);

  const filterNotes = () => {
    let filtered = [...notes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(note => {
        const structured = parseStructuredNote(note.note);
        const textBlob = structured
          ? Object.values(structured).filter(Boolean).join(' ').toLowerCase()
          : (note.note || '').toLowerCase();
        const summaryMatch = note.summary?.toLowerCase().includes(term);
        const staffMatch = note.staff?.toLowerCase().includes(term);
        return staffMatch || summaryMatch || textBlob.includes(term);
      });
    }

    setFilteredNotes(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasContent = [
      formData.summary,
      formData.strengthsChallenges,
      formData.interventionsResponse,
      formData.planNextSteps,
    ].some(section => section.trim().length > 0);

    if (!hasContent) {
      toast.error("Please complete at least one section of the case note");
      return;
    }

    try {
      setIsSubmitting(true);

      const noteDate = new Date(formData.date);
      const structuredNote = {
        formatVersion: "v2",
        sections: {
          summary: formData.summary.trim(),
          strengthsChallenges: formData.strengthsChallenges.trim(),
          interventionsResponse: formData.interventionsResponse.trim(),
          planNextSteps: formData.planNextSteps.trim(),
        },
      };

      const newNote = {
        youth_id: youthId,
        date: format(noteDate, 'yyyy-MM-dd'),
        summary: formData.summary.trim() || "Case Note",
        note: JSON.stringify(structuredNote),
        staff: formData.staff.trim() || "Staff Member",
      };

      await createCaseNote(newNote);

      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        staff: "",
        summary: "",
        strengthsChallenges: "",
        interventionsResponse: "",
        planNextSteps: "",
      });
    } catch (error) {
      toast.error("Failed to add case note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parseStructuredNote = (content?: string | null): CaseNoteSections | null => {
    if (!content) return null;
    try {
      const parsed = JSON.parse(content);
      if (parsed?.formatVersion === 'v2' && parsed.sections) {
        return parsed.sections as CaseNoteSections;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const renderNoteSections = (note: CaseNote) => {
    const sections = parseStructuredNote(note.note);
    if (!sections) {
      return (
        <div
          className="text-gray-700 leading-relaxed"
          style={{
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            overflowWrap: 'break-word'
          }}
          dangerouslySetInnerHTML={{
            __html: (note.note || 'No content')
              .replace(/\n/g, '<br>')
              .replace(/  /g, '&nbsp;&nbsp;')
              .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')
          }}
        />
      );
    }

    const ordered: Array<{ label: string; key: keyof CaseNoteSections }> = [
      { label: 'Summary of Discussion', key: 'summary' },
      { label: 'Strengths & Challenges', key: 'strengthsChallenges' },
      { label: 'Interventions / Response', key: 'interventionsResponse' },
      { label: 'Plan / Next Steps', key: 'planNextSteps' },
    ];

    return (
      <div className="space-y-4">
        {ordered.map(({ label, key }) => {
          const value = sections[key];
          if (!value || value.trim().length === 0) return null;
          return (
            <div key={key}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-red-700">
                {label}
              </p>
              <div className="mt-1 rounded-md border border-red-100 bg-red-50/40 px-3 py-2 text-sm text-gray-800 whitespace-pre-wrap">
                {value}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNotes(new Set());
  };

  const toggleNoteSelection = (noteId: string) => {
    const newSelected = new Set(selectedNotes);
    if (newSelected.has(noteId)) {
      newSelected.delete(noteId);
    } else {
      newSelected.add(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const selectAllNotes = () => {
    if (selectedNotes.size === filteredNotes.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(filteredNotes.map(note => note.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotes.size === 0) {
      toast.error("No notes selected for deletion");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedNotes.size} selected note${selectedNotes.size > 1 ? 's' : ''}? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      
      // Delete each selected note
      for (const noteId of selectedNotes) {
        await deleteCaseNote(noteId);
      }

      toast.success(`Successfully deleted ${selectedNotes.size} note${selectedNotes.size > 1 ? 's' : ''}`);
      
      // Reset selection state
      setSelectedNotes(new Set());
      setIsSelectionMode(false);
    } catch (error) {
      toast.error("Failed to delete selected notes");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Case Note</CardTitle>
            <CardDescription>Document case information and observations</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="max-w-full"
                />
              </div>

              <div className="grid gap-4">
                <div>
                  <Label htmlFor="staff">Staff Name</Label>
                  <Input
                    id="staff"
                    name="staff"
                    value={formData.staff}
                    onChange={handleInputChange}
                    placeholder="Staff completing the note"
                  />
                </div>

                <div>
                  <Label htmlFor="summary">Summary of Discussion</Label>
                  <Textarea
                    id="summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    placeholder="Key discussion points, youth presentation, and tone"
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <Label htmlFor="strengthsChallenges">Strengths & Challenges</Label>
                  <Textarea
                    id="strengthsChallenges"
                    name="strengthsChallenges"
                    value={formData.strengthsChallenges}
                    onChange={handleInputChange}
                    placeholder="Strengths observed and challenges needing attention"
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <Label htmlFor="interventionsResponse">Interventions / Response</Label>
                  <Textarea
                    id="interventionsResponse"
                    name="interventionsResponse"
                    value={formData.interventionsResponse}
                    onChange={handleInputChange}
                    placeholder="Supports provided and youth response"
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>

                <div>
                  <Label htmlFor="planNextSteps">Plan / Next Steps</Label>
                  <Textarea
                    id="planNextSteps"
                    name="planNextSteps"
                    value={formData.planNextSteps}
                    onChange={handleInputChange}
                    placeholder="Follow-up items, responsibilities, and timelines"
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Saving..." : "Add Case Note"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between">
              <CardTitle>Note History</CardTitle>
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search notes..."
                    className="pl-10 h-9 w-[150px] sm:w-auto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {!isSelectionMode ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSelectionMode}
                    disabled={filteredNotes.length === 0}
                  >
                    Select
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllNotes}
                      disabled={filteredNotes.length === 0}
                    >
                      {selectedNotes.size === filteredNotes.length ? "Deselect All" : "Select All"}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={selectedNotes.size === 0 || isDeleting}
                    >
                      <Trash2 size={16} className="mr-1" />
                      {isDeleting ? "Deleting..." : `Delete (${selectedNotes.size})`}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectionMode}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <CardDescription>
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
              {searchTerm ? ` matching "${searchTerm}"` : ""}
              {isSelectionMode && selectedNotes.size > 0 && (
                <span className="ml-2 text-blue-600 font-medium">
                  • {selectedNotes.size} selected
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading case notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "No notes found matching your search." : "No case notes yet."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <Card 
                    key={note.id} 
                    className={`border-l-4 border-l-blue-500 ${
                      isSelectionMode && selectedNotes.has(note.id) 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : ''
                    }`}
                  >
                    <Collapsible>
                      <div className="flex items-start">
                        {isSelectionMode && (
                          <div className="p-4 pr-2">
                            <Checkbox
                              checked={selectedNotes.has(note.id)}
                              onCheckedChange={() => toggleNoteSelection(note.id)}
                              className="mt-1"
                            />
                          </div>
                        )}
                        <CollapsibleTrigger
                          onClick={() => !isSelectionMode && toggleNoteExpansion(note.id)}
                          className="flex-1"
                          disabled={isSelectionMode}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {!isSelectionMode && (
                                  expandedNote === note.id ? (
                                    <ChevronDown size={16} className="text-gray-500" />
                                  ) : (
                                    <ChevronRight size={16} className="text-gray-500" />
                                  )
                                )}
                                <div>
                                  <CardTitle className="text-lg text-left">
                                    {format(new Date(note.date), 'MMM d, yyyy')}
                                  </CardTitle>
                                  <CardDescription className="text-left text-gray-600">
                                    {note.summary || parseStructuredNote(note.note)?.summary || 'Case Note'}
                                  </CardDescription>
                                  <CardDescription className="text-left">
                                    by {note.staff || 'Staff Member'}
                                  </CardDescription>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                      </div>
                      {!isSelectionMode && (
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            {renderNoteSections(note)}
                          </CardContent>
                        </CollapsibleContent>
                      )}
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
