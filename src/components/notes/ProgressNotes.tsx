
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, ChevronDown, ChevronRight, FileText, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProgressNotes, saveProgressNote } from "@/utils/local-storage-utils";
import { ProgressNote } from "@/types/app-types";

interface ProgressNotesProps {
  youthId: string;
  youth: any;
}

export const ProgressNotes = ({ youthId, youth }: ProgressNotesProps) => {
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<ProgressNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    staff: "",
    note: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [youthId]);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm]);

  const fetchNotes = () => {
    try {
      setIsLoading(true);
      const fetchedNotes = fetchProgressNotes(youthId);
      setNotes(fetchedNotes);
      setFilteredNotes(fetchedNotes);
    } catch (error) {
      toast.error("Failed to load case notes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];
    
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.staff.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredNotes(filtered);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Mark as having unsaved changes and trigger auto-save
    setHasUnsavedChanges(true);
    triggerAutoSave();
  };

  // Auto-save functionality
  const triggerAutoSave = () => {
    // Clear existing timer
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }
    
    // Set new timer for 2 seconds after user stops typing
    const timer = setTimeout(() => {
      autoSave();
    }, 2000);
    
    setAutoSaveTimer(timer);
  };

  const autoSave = async () => {
    if (!hasUnsavedChanges || isAutoSaving) return;
    
    // Don't auto-save if required fields are empty
    if (!formData.staff.trim() || !formData.note.trim()) return;
    
    try {
      setIsAutoSaving(true);
      
      // Save to localStorage as draft
      const draftKey = `notes-draft-${youthId}`;
      localStorage.setItem(draftKey, JSON.stringify({
        ...formData,
        savedAt: new Date().toISOString()
      }));
      
      setHasUnsavedChanges(false);
      
      // Show subtle success indicator
      toast.success("Draft auto-saved", { duration: 1000 });
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  // Load draft on component mount
  useEffect(() => {
    const draftKey = `notes-draft-${youthId}`;
    const draft = localStorage.getItem(draftKey);
    
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        setFormData(prev => ({
          ...prev,
          staff: draftData.staff || "",
          note: draftData.note || ""
        }));
        setHasUnsavedChanges(true);
        toast.info("Draft loaded from auto-save", { duration: 2000 });
      } catch (error) {
        console.error("Failed to load draft:", error);
      }
    }
  }, [youthId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [autoSaveTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staff.trim()) {
      toast.error("Staff name is required");
      return;
    }
    
    if (!formData.note.trim()) {
      toast.error("Case note content is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const noteDate = new Date(formData.date);
      
      const newNote: Omit<ProgressNote, 'id' | 'createdAt'> = {
        youth_id: youthId,
        date: noteDate,
        category: "Progress Note",
        note: formData.note.trim() || "Progress note recorded",
        staff: formData.staff.trim(),
      };
      
      saveProgressNote(youthId, newNote);
      
      toast.success("Case note added successfully");
      
      // Clear draft and reset form
      const draftKey = `notes-draft-${youthId}`;
      localStorage.removeItem(draftKey);
      
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        staff: "",
        note: "",
      });
      setHasUnsavedChanges(false);
      
      fetchNotes();
    } catch (error) {
      toast.error("Failed to add case note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  const handleNoteSelection = (noteId: string, checked: boolean) => {
    const newSelected = new Set(selectedNotes);
    if (checked) {
      newSelected.add(noteId);
    } else {
      newSelected.delete(noteId);
    }
    setSelectedNotes(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allNoteIds = new Set(filteredNotes.map(note => note.id || ""));
      setSelectedNotes(allNoteIds);
    } else {
      setSelectedNotes(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedNotes.size === 0) {
      toast.error("No notes selected for deletion");
      return;
    }

    try {
      setIsDeleting(true);
      
      // Get all notes from localStorage (not just for this youth)
      const allNotes = JSON.parse(localStorage.getItem('heartland_notes') || '[]');
      
      // Filter out selected notes
      const remainingNotes = allNotes.filter((note: any) => !selectedNotes.has(note.id || ""));
      
      // Save the filtered notes back to localStorage
      localStorage.setItem('heartland_notes', JSON.stringify(remainingNotes));
      
      toast.success(`${selectedNotes.size} note(s) deleted successfully`);
      
      // Clear selection and refresh notes
      setSelectedNotes(new Set());
      fetchNotes();
    } catch (error) {
      toast.error("Failed to delete selected notes");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportNotes = async () => {
    try {
      const { exportHTMLToPDF } = await import('@/utils/export');

      const exportData = {
        youth: youth,
        notes: filteredNotes,
        exportDate: new Date().toLocaleDateString(),
        totalNotes: filteredNotes.length
      };

      const html = generateProgressNotesHTML(exportData);
      const filename = `${youth.firstName}_${youth.lastName}_Case_Notes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast.success("Case notes exported successfully!");
    } catch (error) {
      console.error("Error exporting case notes:", error);
      toast.error("Failed to export case notes");
    }
  };

  const generateProgressNotesHTML = (data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Case Notes Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .youth-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .note-item { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .note-date { font-weight: bold; color: #333; }
            .note-staff { color: #666; font-style: italic; }
            .note-content { margin-top: 10px; }
            .summary { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Heartland Care Compass</h1>
            <h2>Case Notes Report</h2>
            <p>Generated on ${data.exportDate}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${data.youth.firstName} ${data.youth.lastName}</p>
            <p><strong>Date of Birth:</strong> ${data.youth.dateOfBirth || 'Not specified'}</p>
            <p><strong>Current Level:</strong> ${data.youth.currentLevel || 'Not specified'}</p>
          </div>

          <div class="summary">
            <h3>Summary</h3>
            <p><strong>Total Case Notes:</strong> ${data.totalNotes}</p>
            <p><strong>Date Range:</strong> ${data.notes.length > 0 ?
              `${data.notes[data.notes.length - 1].date} to ${data.notes[0].date}` :
              'No notes available'}</p>
          </div>

          <div class="notes-section">
            <h3>Case Notes</h3>
            ${data.notes.map((note: any) => `
              <div class="note-item">
                <div class="note-date">Date: ${note.date}</div>
                <div class="note-staff">Staff: ${note.staff}</div>
                <div class="note-content">${note.note}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Case Notes</h2>
          <p className="text-gray-600 mb-4">Record and track observations, behaviors, and incidents.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          {selectedNotes.size > 0 && (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 size={16} className="mr-2" />
              {isDeleting ? "Deleting..." : `Delete ${selectedNotes.size} Selected`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExportNotes}>
            <FileText size={16} className="mr-2" />
            Export Notes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add Case Note</CardTitle>
            <CardDescription className="flex items-center gap-2">
              Record observations, progress, or incidents
              {hasUnsavedChanges && (
                <span className="text-orange-600 text-sm font-medium flex items-center gap-1">
                  • Unsaved changes
                  {isAutoSaving && <span className="text-xs">(saving...)</span>}
                </span>
              )}
            </CardDescription>
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
                <Label htmlFor="staff">Staff Name</Label>
                <Input
                  id="staff"
                  name="staff"
                  value={formData.staff}
                  onChange={handleInputChange}
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <Label htmlFor="note">Case Note</Label>
                <Textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  placeholder="Enter your case note here..."
                  rows={4}
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
              <div className="flex items-center space-x-3">
                <CardTitle>Note History</CardTitle>
                {filteredNotes.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all"
                      checked={selectedNotes.size === filteredNotes.length && filteredNotes.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <Label htmlFor="select-all" className="text-sm text-gray-600">
                      Select All
                    </Label>
                  </div>
                )}
              </div>
              <div className="flex mt-2 sm:mt-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search by staff name..."
                    className="pl-10 h-9 w-[200px] sm:w-auto"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <CardDescription>
              {filteredNotes.length} {filteredNotes.length === 1 ? "note" : "notes"} 
              {searchTerm ? ` matching "${searchTerm}"` : ""}
              {selectedNotes.size > 0 && ` • ${selectedNotes.size} selected`}
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
                    <div className="flex items-start p-3">
                      <div className="flex items-center space-x-2 mr-2">
                        <Checkbox
                          checked={selectedNotes.has(note.id || "")}
                          onCheckedChange={(checked) => handleNoteSelection(note.id || "", checked as boolean)}
                        />
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="p-1 h-auto cursor-pointer">
                            {expandedNote === note.id ? 
                              <ChevronDown size={16} /> : 
                              <ChevronRight size={16} />
                            }
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-blue-100 text-blue-800">
                              Case Note
                            </Badge>
                            <span className="text-sm text-gray-600">
                              by {note.staff}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 mt-1 sm:mt-0">
                            {format(note.date as Date, 'MMM d, yyyy')}
                          </span>
                        </div>
                        
                        <p className="mt-2 text-gray-700">
                          {note.note || "Progress note recorded"}
                        </p>
                      </div>
                    </div>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-3 pt-1">
                        <div className="pl-6 border-l-2 border-gray-200">
                          <p className="text-gray-800">{note.note || "Progress note recorded for this date"}</p>
                          <div className="mt-3 text-sm text-gray-500">
                            <p>Recorded by: {note.staff}</p>
                            <p>Added: {format(note.createdAt as Date, 'MMM d, yyyy h:mm a')}</p>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {notes.length === 0 ? "No case notes have been added yet." : "No notes match your search criteria."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
