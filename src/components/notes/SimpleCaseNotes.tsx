import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
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

  // Use Supabase hooks
  const { caseNotes: notes, loading: isLoading, createCaseNote } = useCaseNotes(youthId);
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
                  placeholder="Enter detailed case note information..."
                  rows={8}
                  className="resize-none"
                />
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
              <div className="flex mt-2 sm:mt-0">
                <div className="relative mr-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search notes..."
                    className="pl-10 h-9 w-[150px] sm:w-auto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <CardDescription>
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"}
              {searchTerm ? ` matching "${searchTerm}"` : ""}
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
                  <Card key={note.id} className="border-l-4 border-l-blue-500">
                    <Collapsible>
                      <CollapsibleTrigger
                        onClick={() => toggleNoteExpansion(note.id)}
                        className="w-full"
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {expandedNote === note.id ? (
                                <ChevronDown size={16} className="text-gray-500" />
                              ) : (
                                <ChevronRight size={16} className="text-gray-500" />
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
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <div className="prose prose-sm max-w-none">
                            <p className="whitespace-pre-wrap text-gray-700">{note.note}</p>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
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
