import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, FileText, Search, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes, useYouth } from "@/hooks/useSupabase";
import { type CaseNotes as CaseNote, type Youth } from "@/integrations/supabase/services";

interface CaseNotesProps {
  youthId: string;
  youth: any;
  onYouthChange?: (youthId: string) => void;
  onBackToSelection?: () => void;
}

export const CaseNotes = ({ youthId, youth, onYouthChange, onBackToSelection }: CaseNotesProps) => {
  const [filteredNotes, setFilteredNotes] = useState<CaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  
  // Use Supabase hooks
  const { caseNotes: notes, loading: isLoading, createCaseNote } = useCaseNotes(youthId);
  const { youths } = useYouth();
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    summary: "",
    note: "",
    staff: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm]);

  useEffect(() => {
    // Find and set the selected youth when youthId changes
    const youth = youths.find(y => y.id === youthId);
    setSelectedYouth(youth || null);
  }, [youthId, youths]);

  const filterNotes = () => {
    let filtered = [...notes];
    
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.summary?.toLowerCase().includes(searchTerm.toLowerCase())
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
        summary: formData.summary.trim() || "Case Note",
        note: formData.note.trim(),
        staff: formData.staff.trim() || "Staff Member",
      };
      
      await createCaseNote(newNote);
      
      // Reset form
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        summary: "",
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

  const handleYouthChange = (newYouthId: string) => {
    if (onYouthChange) {
      onYouthChange(newYouthId);
    }
  };

  const handleExportNotes = () => {
    // PDF export functionality
    toast.info("Export Feature Coming Soon", {
      description: "The PDF export feature will be available in the next update."
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Case Notes</h2>
          <p className="text-gray-600 mb-4">Document case notes for reports and record keeping.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          {onBackToSelection && (
            <Button variant="outline" size="sm" onClick={onBackToSelection}>
              <ArrowLeft size={16} className="mr-2" />
              Back to Selection
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportNotes}>
            <FileText size={16} className="mr-2" />
            Export Notes
          </Button>
        </div>
      </div>

      {/* Youth Quick Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Users className="text-gray-500" size={20} />
            <div className="flex-1">
              <Label htmlFor="youth-select" className="text-sm font-medium">
                Current Youth: {selectedYouth ? `${selectedYouth.firstName} ${selectedYouth.lastName}` : 'Loading...'}
              </Label>
              <Select value={youthId} onValueChange={handleYouthChange}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Select a different youth..." />
                </SelectTrigger>
                <SelectContent>
                  {youths.map((youth) => (
                    <SelectItem key={youth.id} value={youth.id}>
                      {youth.firstName} {youth.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <Label htmlFor="summary">Case Note Summary</Label>
                <Input
                  id="summary"
                  name="summary"
                  value={formData.summary}
                  onChange={handleInputChange}
                  placeholder="Brief summary of the case note..."
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
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading notes...</p>
              </div>
            ) : filteredNotes.length > 0 ? (
              <div className="space-y-4">
                {filteredNotes.map((note) => (
                  <Collapsible 
                    key={note.id}
                    open={expandedNote === note.id}
                    onOpenChange={() => toggleNoteExpansion(note.id || "")}
                    className="border rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start p-3 cursor-pointer">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          {expandedNote === note.id ? 
                            <ChevronDown size={16} /> : 
                            <ChevronRight size={16} />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      
                      <div className="flex-1 ml-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">
                              {note.summary || "Case Note"}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {note.date ? format(new Date(note.date), 'MMM dd, yyyy') : 'No date'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                            by {note.staff || 'Unknown Staff'}
                          </div>
                        </div>
                        
                        <CollapsibleContent className="mt-2">
                          <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                            {note.note || 'No content'}
                          </div>
                          <div className="text-xs text-gray-500 mt-2">
                            Created: {note.createdAt ? format(new Date(note.createdAt), 'MMM dd, yyyy HH:mm') : 'Unknown'}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </div>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600 mb-2">No case notes found</p>
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'Try adjusting your search terms' : 'Add your first case note to get started'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};