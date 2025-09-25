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
import { type CaseNotes as CaseNote } from "@/integrations/supabase/services";

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
    note: "",
    staff: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm]);

  const filterNotes = () => {
    let filtered = [...notes];

    if (searchTerm) {
      filtered = filtered.filter(note =>
        note.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.staff?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotes(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.note.trim()) {
      toast.error("Case note content is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const noteDate = new Date(formData.date);

      const newNote = {
        youth_id: youthId,
        date: format(noteDate, 'yyyy-MM-dd'),
        summary: "Case Note", // Default summary
        note: formData.note.trim(),
        staff: formData.staff.trim() || "Staff Member",
      };

      await createCaseNote(newNote);

      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        note: "",
        staff: "",
      });
    } catch (error) {
      toast.error("Failed to add case note");
    } finally {
      setIsSubmitting(false);
    }
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

              <div>
                <Label htmlFor="note">Case Note Content</Label>
                <Textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Enter detailed case note information...

Examples:
• Behavioral observations
• Treatment progress
• Incident details
• Family interactions
• Academic updates

Use proper spacing and formatting - all formatting will be preserved in reports."
                  rows={10}
                  className="resize-none text-sm leading-relaxed"
                  style={{
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    lineHeight: '1.7',
                    padding: '12px',
                    whiteSpace: 'pre-wrap'
                  }}
                />
                <div className="text-xs text-gray-500 mt-2 flex items-start space-x-2">
                  <span>💡</span>
                  <span>All formatting including line breaks, spacing, and bullet points will be preserved</span>
                </div>
              </div>

              <div>
                <Label htmlFor="staff">Staff Name</Label>
                <Input
                  id="staff"
                  name="staff"
                  value={formData.staff}
                  onChange={handleInputChange}
                  placeholder="Your name"
                />
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
                            <div className="prose prose-sm max-w-none">
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
                            </div>
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
