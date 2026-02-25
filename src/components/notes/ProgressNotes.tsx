
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ChevronDown, ChevronRight, FileText, Search, Trash2, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchProgressNotes, saveProgressNote } from "@/utils/local-storage-utils";
import { notesService } from '@/integrations/firebase/notesService'
import { caseNotesService } from '@/integrations/firebase/services'
import { ProgressNote } from "@/types/app-types";
import aiService from "@/services/aiService";
import { buildReportFilename } from "@/utils/reportFilenames";

interface ProgressNotesProps {
  youthId: string;
  youth: any;
}

type ProgressNoteSections = {
  summary?: string;
  strengthsChallenges?: string;
  interventionsResponse?: string;
  planNextSteps?: string;
};

type NoteType = 'session' | 'general' | 'shift';

export const ProgressNotes = ({ youthId, youth }: ProgressNotesProps) => {
  const [noteType, setNoteType] = useState<NoteType>('session');
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
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
    summary: "",
    strengthsChallenges: "",
    interventionsResponse: "",
    planNextSteps: "",
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

  const fetchNotes = async () => {
    try {
      setIsLoading(true);

      // Load localStorage notes immediately for fast display
      const localNotes = fetchProgressNotes(youthId);

      // Fetch from both Firebase sources in parallel
      const [remoteNotes, remoteCaseNotes] = await Promise.all([
        notesService.listForYouth(youthId).catch((err) => {
          console.warn('Failed to fetch from notes collection:', err);
          return [];
        }),
        caseNotesService.getByYouthId(youthId).catch((err) => {
          console.warn('Failed to fetch from case_notes collection:', err);
          return [];
        }),
      ]);

      // Convert remote notes (notes collection) to ProgressNote format
      const convertedRemote: ProgressNote[] = remoteNotes.map(r => ({
        id: r.id,
        youth_id: r.youth_id,
        date: new Date(r.created_at),
        note: r.text,
        staff: r.author_id || '',
        category: r.category || 'Progress Note',
        createdAt: new Date(r.created_at),
      }));

      // Convert case notes (case_notes subcollection) to ProgressNote format
      const convertedCaseNotes: ProgressNote[] = remoteCaseNotes.map(cn => ({
        id: cn.id,
        youth_id: cn.youth_id,
        date: cn.date ? new Date(cn.date + 'T00:00:00') : new Date(),
        note: cn.note || '',
        staff: cn.staff || '',
        category: 'Case Note',
        createdAt: cn.createdAt ? new Date(cn.createdAt) : new Date(),
      }));

      // Merge all sources, dedup by id
      const map = new Map<string, ProgressNote>();
      for (const n of localNotes) map.set(n.id || `local-${n.youth_id}-${String(n.date)}`, n);
      for (const n of convertedRemote) map.set(n.id, n);
      for (const n of convertedCaseNotes) map.set(n.id, n);

      const allNotes = Array.from(map.values()).sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA;
      });

      setNotes(allNotes);
      setFilteredNotes(allNotes);
    } catch (error) {
      console.error("Failed to load case notes:", error);
      toast.error("Failed to load case notes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotes = () => {
    let filtered = [...notes];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(note => {
        const staffMatch = note.staff?.toLowerCase().includes(term);
        const sections = parseStructuredNote(note.note);
        const textBlob = sections
          ? Object.values(sections).filter(Boolean).join(' ').toLowerCase()
          : (note.note || '').toLowerCase();
        return staffMatch || textBlob.includes(term);
      });
    }
    
    setFilteredNotes(filtered);
  };

  const sectionValues = () => [
    formData.summary,
    formData.strengthsChallenges,
    formData.interventionsResponse,
    formData.planNextSteps,
  ];

  const hasSectionContent = () => sectionValues().some(value => value.trim().length > 0);

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
    if (!formData.staff.trim() || !hasSectionContent()) return;
    
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
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
      }
      toast.error(error instanceof Error ? error.message : "Failed to save notes. Please try again.");
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
          summary: draftData.summary || "",
          strengthsChallenges: draftData.strengthsChallenges || "",
          interventionsResponse: draftData.interventionsResponse || "",
          planNextSteps: draftData.planNextSteps || ""
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

    if (!hasSectionContent()) {
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

      const newNote: Omit<ProgressNote, 'id' | 'createdAt'> = {
        youth_id: youthId,
        date: noteDate,
        category: "Progress Note",
        note: JSON.stringify(structuredNote),
        staff: formData.staff.trim(),
      };

      // Now properly await the save operation
      await saveProgressNote(youthId, newNote);

      toast.success("Case note added successfully");

      // Clear draft and reset form
      const draftKey = `notes-draft-${youthId}`;
      localStorage.removeItem(draftKey);

      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        staff: "",
        summary: "",
        strengthsChallenges: "",
        interventionsResponse: "",
        planNextSteps: "",
      });
      setHasUnsavedChanges(false);

      fetchNotes();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to add case note";
      toast.error(errorMessage);
      console.error("Error saving case note:", error);
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
      const ids = Array.from(selectedNotes);
      for (const id of ids) {
        if (id) {
          // Find the note to determine which collection it belongs to
          const note = notes.find(n => n.id === id);
          if (note?.category === 'Case Note') {
            await caseNotesService.delete(id);
          } else {
            await notesService.delete(id);
          }
        }
      }
      toast.success(`${selectedNotes.size} note(s) deleted successfully`);
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
      const filename = `${buildReportFilename(youth, "Case Notes")}.pdf`;

      await exportHTMLToPDF(html, filename);
      toast.success("Case notes exported successfully!");
    } catch (error) {
      console.error("Error exporting case notes:", error);
      toast.error("Failed to export case notes");
    }
  };

  const parseStructuredNote = (content?: string | null): ProgressNoteSections | null => {
    if (!content) return null;
    try {
      const parsed = JSON.parse(content);
      if (parsed?.formatVersion === 'v2' && parsed.sections) {
        return parsed.sections as ProgressNoteSections;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const renderNoteSections = (note: ProgressNote) => {
    const sections = parseStructuredNote(note.note);
    if (!sections) {
      return (
        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
          {note.note || 'No content'}
        </div>
      );
    }

    const ordered: Array<{ label: string; key: keyof ProgressNoteSections }> = [
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

  const generateProgressNotesHTML = (data: any) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const logoSrc = `${baseUrl}${import.meta.env.BASE_URL}files/BoysHomeLogo.png`;

    const renderSectionHTML = (label: string, value?: string) => {
      if (!value || value.trim().length === 0) return '';
      return `
        <div class="note-section">
          <h4>${label}</h4>
          <p>${value
            .trim()
            .replace(/\n/g, '<br>')
            .replace(/  /g, '&nbsp;&nbsp;')
            .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')}</p>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Case Notes Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; color: #333; }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #b91c1c;
              padding-bottom: 20px;
              background: linear-gradient(135deg, #b91c1c 0%, #dc2626 50%, #d97706 100%);
              color: white;
              padding: 20px;
              border-radius: 8px 8px 0 0;
              margin: -20px -20px 30px -20px;
            }
            .header img { height: 60px; margin-bottom: 15px; }
            .youth-info { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .note-item { margin-bottom: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; page-break-inside: avoid; background: white; }
            .note-date { font-weight: bold; color: #333; }
            .note-staff { color: #666; font-style: italic; }
            .note-content { margin-top: 16px; display: grid; gap: 14px; }
            .note-section h4 { margin: 0 0 6px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #b91c1c; }
            .note-section p { margin: 0; padding: 12px; background: #fafafa; border-left: 4px solid #b91c1c; border-radius: 6px; line-height: 1.7; }
            .summary { background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #0ea5e9; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoSrc}" alt="Heartland Boys Home Logo" />
            <h1>Heartland Boys Home</h1>
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
            ${data.notes.map((note: any) => {
              const sections = parseStructuredNote(note.note);
              const sectionHtml = sections ? `
                ${renderSectionHTML('Summary of Discussion', sections.summary)}
                ${renderSectionHTML('Strengths & Challenges', sections.strengthsChallenges)}
                ${renderSectionHTML('Interventions / Response', sections.interventionsResponse)}
                ${renderSectionHTML('Plan / Next Steps', sections.planNextSteps)}
              ` : `<div class="note-section"><p>${(note.note || 'No content')}</p></div>`;

              return `
              <div class="note-item">
                <div class="note-date">Date: ${note.date ? format(new Date(note.date), 'MMMM d, yyyy') : 'Not specified'}</div>
                <div class="note-staff">Staff: ${note.staff}</div>
                <div class="note-content">${sectionHtml}</div>
              </div>
            `;
            }).join('')}
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
                  />
                </div>

                <div>
                  <Label htmlFor="strengthsChallenges">Strengths & Challenges</Label>
                  <Textarea
                    id="strengthsChallenges"
                    name="strengthsChallenges"
                    value={formData.strengthsChallenges}
                    onChange={handleInputChange}
                    placeholder="Strengths demonstrated and challenges needing attention"
                    rows={4}
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
                  />
                </div>

                <div>
                  <Label htmlFor="planNextSteps">Plan / Next Steps</Label>
                  <Textarea
                    id="planNextSteps"
                    name="planNextSteps"
                    value={formData.planNextSteps}
                    onChange={handleInputChange}
                    placeholder="Follow-up actions, responsibilities, and timelines"
                    rows={4}
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
                {filteredNotes.map((note) => {
                  const sections = parseStructuredNote(note.note);
                  const summaryText = sections?.summary?.trim() || note.note || "Progress note recorded";
                  const preview = summaryText.length > 160 ? `${summaryText.slice(0, 160)}…` : summaryText;

                  return (
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
                                by {note.staff || 'Staff Member'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500 mt-1 sm:mt-0">
                              {note.date ? format(new Date(note.date), 'MMM d, yyyy') : 'No date'}
                            </span>
                          </div>
                          
                          <p className="mt-2 text-gray-700">
                            {preview}
                          </p>
                        </div>
                      </div>
                      
                      <CollapsibleContent>
                        <div className="px-4 pb-3 pt-1">
                          <div className="pl-6 border-l-2 border-gray-200 space-y-3">
                            {renderNoteSections(note)}
                            <div className="text-sm text-gray-500">
                              <p>Recorded by: {note.staff || 'Staff Member'}</p>
                              <p>Added: {note.createdAt ? format(new Date(note.createdAt), 'MMM d, yyyy h:mm a') : 'Unknown'}</p>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
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
