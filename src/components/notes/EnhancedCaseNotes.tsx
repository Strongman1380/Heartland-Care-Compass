import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, FileText, Search, Download, Printer, Sparkles, Loader2, Edit2, X, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes, useYouth } from "@/hooks/useSupabase";
import { type CaseNotes as CaseNote, type Youth } from "@/integrations/supabase/services";
import { exportElementToPDF } from "@/utils/export";
import aiService from "@/services/aiService";

interface EnhancedCaseNotesProps {
  youthId: string;
  youth: any;
  onYouthChange?: (youthId: string) => void;
  onBackToSelection?: () => void;
}

type NoteType = 'session' | 'general' | 'shift';

type SessionNoteSections = {
  summary: string;
  strengthsChallenges: string;
  interventionsResponse: string;
  planNextSteps: string;
};

type SimpleNoteData = {
  summary: string;
};

export const EnhancedCaseNotes = ({ youthId, youth, onYouthChange, onBackToSelection }: EnhancedCaseNotesProps) => {
  const [filteredNotes, setFilteredNotes] = useState<CaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const [noteType, setNoteType] = useState<NoteType>('session');
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');

  // AI enhancement state
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);

  // Use Supabase hooks
  const { caseNotes: notes, loading: isLoading, createCaseNote, updateCaseNote, deleteCaseNote } = useCaseNotes(youthId);
  const { youths } = useYouth();

  // Edit state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);

  // Export/Print state
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Session note form data
  const [sessionFormData, setSessionFormData] = useState<SessionNoteSections & { date: string; staff: string }>({
    date: format(new Date(), 'yyyy-MM-dd'),
    staff: "",
    summary: "",
    strengthsChallenges: "",
    interventionsResponse: "",
    planNextSteps: "",
  });

  // General/Shift note form data
  const [simpleFormData, setSimpleFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    staff: "",
    summary: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm]);

  useEffect(() => {
    const youth = youths.find(y => y.id === youthId);
    setSelectedYouth(youth || null);
  }, [youthId, youths]);

  useEffect(() => {
    // Check AI service status
    aiService.checkAIStatus().then(setAiStatus);
  }, []);

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

  // AI Enhancement Functions
  const enhanceTextField = async (fieldName: string, currentValue: string, fieldType: 'session' | 'simple') => {
    if (!currentValue.trim()) {
      toast.error("Please enter some text first before enhancing");
      return;
    }

    setIsEnhancing(fieldName);

    try {
      const prompt = getEnhancementPrompt(fieldName, currentValue);
      const response = await aiService.queryData(prompt, {
        youth,
        currentText: currentValue,
        fieldType: fieldName
      });

      if (response.success && response.data?.answer) {
        const enhancedText = response.data.answer;

        if (fieldType === 'session') {
          setSessionFormData(prev => ({
            ...prev,
            [fieldName]: enhancedText
          }));
        } else {
          setSimpleFormData(prev => ({
            ...prev,
            summary: enhancedText
          }));
        }

        toast.success("Text enhanced with AI!");
      } else {
        throw new Error(response.error || 'Failed to enhance text');
      }
    } catch (error: any) {
      console.error('AI enhancement error:', error);
      toast.error(`Failed to enhance: ${error.message}`);
    } finally {
      setIsEnhancing(null);
    }
  };

  const getEnhancementPrompt = (fieldName: string, currentValue: string): string => {
    const prompts: Record<string, string> = {
      summary: `Take these brief notes and expand them into a clear, professional paragraph for ${youth.firstName}'s session summary. Keep the original facts and meaning, just add appropriate detail and structure:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written sentences that capture the key points in a clinical tone.`,

      strengthsChallenges: `Take these brief notes about strengths and challenges for ${youth.firstName} and expand them into a clear paragraph. Add appropriate clinical detail while keeping the original points:\n\n"${currentValue}"\n\nExpand this into 2-3 sentences with professional clinical language.`,

      interventionsResponse: `Take these brief notes about interventions and expand them into a clear paragraph describing what was done and how ${youth.firstName} responded:\n\n"${currentValue}"\n\nExpand this into 2-3 sentences that clearly describe the interventions and youth's response.`,

      planNextSteps: `Take these brief notes about next steps and expand them into a clear, actionable paragraph for ${youth.firstName}'s treatment plan:\n\n"${currentValue}"\n\nExpand this into 2-3 sentences with specific, measurable next steps.`,

      general_summary: `Take these brief notes and expand them into a clear, professional paragraph for ${youth.firstName}'s case note:\n\n"${currentValue}"\n\nExpand this into 2-3 well-written sentences that capture the key information.`,

      shift_summary: `Take these brief notes and expand them into a clear paragraph summarizing the shift for ${youth.firstName}:\n\n"${currentValue}"\n\nExpand this into 2-3 sentences that capture the key events and observations.`
    };

    return prompts[fieldName] || prompts.general_summary;
  };

  const handleSessionInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSessionFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSimpleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSimpleFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      let newNote: any;

      if (noteType === 'session') {
        // Session note validation
        const hasContent = [
          sessionFormData.summary,
          sessionFormData.strengthsChallenges,
          sessionFormData.interventionsResponse,
          sessionFormData.planNextSteps,
        ].some(section => section.trim().length > 0);

        if (!hasContent) {
          toast.error("Please complete at least one section of the session note");
          return;
        }

        const structuredNote = {
          formatVersion: "v3",
          noteType: "session",
          sections: {
            summary: sessionFormData.summary.trim(),
            strengthsChallenges: sessionFormData.strengthsChallenges.trim(),
            interventionsResponse: sessionFormData.interventionsResponse.trim(),
            planNextSteps: sessionFormData.planNextSteps.trim(),
          },
        };

        newNote = {
          youth_id: youthId,
          date: sessionFormData.date, // Keep as-is, no need to re-format
          summary: sessionFormData.summary.trim() || "Session Note",
          note: JSON.stringify(structuredNote),
          staff: sessionFormData.staff.trim() || "Staff Member",
        };

        // Reset session form
        setSessionFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          staff: "",
          summary: "",
          strengthsChallenges: "",
          interventionsResponse: "",
          planNextSteps: "",
        });
      } else {
        // General or Shift note validation
        if (!simpleFormData.summary.trim()) {
          toast.error(`Please enter a summary for the ${noteType} note`);
          return;
        }

        const simpleNote = {
          formatVersion: "v3",
          noteType: noteType,
          summary: simpleFormData.summary.trim(),
        };

        newNote = {
          youth_id: youthId,
          date: simpleFormData.date, // Keep as-is, no need to re-format
          summary: simpleFormData.summary.trim().substring(0, 100) + (simpleFormData.summary.length > 100 ? '...' : ''),
          note: JSON.stringify(simpleNote),
          staff: simpleFormData.staff.trim() || "Staff Member",
        };

        // Reset simple form
        setSimpleFormData({
          date: format(new Date(), 'yyyy-MM-dd'),
          staff: "",
          summary: "",
        });
      }

      await createCaseNote(newNote);
      toast.success(`${noteType === 'session' ? 'Session' : noteType === 'general' ? 'General' : 'Shift'} note added successfully!`);

      // Switch to history tab after saving
      setActiveTab('history');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error("Failed to add case note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  const startEditing = (note: CaseNote) => {
    setEditingNoteId(note.id!);
    const parsed = parseNote(note.note);

    if (parsed?.noteType === 'session') {
      setEditFormData({
        date: note.date,
        staff: note.staff,
        noteType: 'session',
        ...parsed.sections
      });
    } else {
      setEditFormData({
        date: note.date,
        staff: note.staff,
        noteType: parsed?.noteType || 'general',
        summary: parsed?.summary || note.note || ''
      });
    }
    setExpandedNote(note.id!);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditFormData(null);
  };

  const saveEdit = async (noteId: string) => {
    try {
      setIsSubmitting(true);

      let updatedNote: any;

      if (editFormData.noteType === 'session') {
        const structuredNote = {
          formatVersion: "v3",
          noteType: "session",
          sections: {
            summary: editFormData.summary?.trim() || '',
            strengthsChallenges: editFormData.strengthsChallenges?.trim() || '',
            interventionsResponse: editFormData.interventionsResponse?.trim() || '',
            planNextSteps: editFormData.planNextSteps?.trim() || '',
          },
        };

        updatedNote = {
          date: editFormData.date,
          summary: editFormData.summary?.trim() || "Session Note",
          note: JSON.stringify(structuredNote),
          staff: editFormData.staff?.trim() || "Staff Member",
        };
      } else {
        const simpleNote = {
          formatVersion: "v3",
          noteType: editFormData.noteType,
          summary: editFormData.summary?.trim() || '',
        };

        updatedNote = {
          date: editFormData.date,
          summary: editFormData.summary?.trim().substring(0, 100) + (editFormData.summary.length > 100 ? '...' : ''),
          note: JSON.stringify(simpleNote),
          staff: editFormData.staff?.trim() || "Staff Member",
        };
      }

      await updateCaseNote(noteId, updatedNote);
      toast.success("Case note updated successfully!");
      setEditingNoteId(null);
      setEditFormData(null);
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error("Failed to update case note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInputChange = (field: string, value: string) => {
    setEditFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDelete = async (noteId: string, noteSummary: string) => {
    // Confirm deletion
    const preview = noteSummary.substring(0, 100) + (noteSummary.length > 100 ? '...' : '');
    if (!window.confirm(`Are you sure you want to delete this case note?\n\n"${preview}"\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      await deleteCaseNote(noteId);
      // Close the expanded note if it was open
      if (expandedNote === noteId) {
        setExpandedNote(null);
      }
      // Cancel editing if this note was being edited
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setEditFormData(null);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      // Error toast is already shown by the hook
    }
  };

  const generateNotesHTML = () => {
    const youthName = selectedYouth ? `${selectedYouth.firstName} ${selectedYouth.lastName}` : 'Unknown Youth';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const logoSrc = `${baseUrl}${import.meta.env.BASE_URL}files/BoysHomeLogo.png`;

    const renderNoteHTML = (note: CaseNote) => {
      const parsed = parseNote(note.note);
      const noteTypeBadge = parsed?.noteType === 'session' ? 'Session Note' :
                           parsed?.noteType === 'shift' ? 'Shift Summary' :
                           parsed?.noteType === 'general' ? 'General Note' : 'Case Note';

      let contentHTML = '';

      if (parsed?.noteType === 'session') {
        if (parsed.sections.summary) {
          contentHTML += `
            <div class="note-section">
              <h4>Session Summary</h4>
              <p>${parsed.sections.summary.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}</p>
            </div>
          `;
        }
        if (parsed.sections.strengthsChallenges) {
          contentHTML += `
            <div class="note-section">
              <h4>Strengths & Challenges</h4>
              <p>${parsed.sections.strengthsChallenges.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}</p>
            </div>
          `;
        }
        if (parsed.sections.interventionsResponse) {
          contentHTML += `
            <div class="note-section">
              <h4>Interventions & Response</h4>
              <p>${parsed.sections.interventionsResponse.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}</p>
            </div>
          `;
        }
        if (parsed.sections.planNextSteps) {
          contentHTML += `
            <div class="note-section">
              <h4>Plan & Next Steps</h4>
              <p>${parsed.sections.planNextSteps.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}</p>
            </div>
          `;
        }
      } else if (parsed?.summary) {
        contentHTML = `
          <div class="note-section">
            <p>${parsed.summary.replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}</p>
          </div>
        `;
      } else {
        contentHTML = `
          <div class="note-section">
            <p>${(note.note || 'No content').replace(/\n/g, '<br>').replace(/  /g, '&nbsp;&nbsp;')}</p>
          </div>
        `;
      }

      return `
        <div class="case-note">
          <div class="note-header">
            <div>
              <span class="note-type-badge">${noteTypeBadge}</span>
              <h3>${note.summary || 'Case Note'}</h3>
            </div>
            <div class="note-meta">
              <div>${format(parseISO(note.date + 'T00:00:00'), 'MMMM d, yyyy')}</div>
              <div>by ${note.staff || 'Staff Member'}</div>
            </div>
          </div>
          <div class="note-content">
            ${contentHTML}
          </div>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Case Notes - ${youthName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              line-height: 1.6;
              color: #333;
              background: white;
            }
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
            .header img {
              height: 60px;
              margin-bottom: 15px;
            }
            .youth-info {
              background-color: #f5f5f5;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .case-note {
              margin-bottom: 30px;
              page-break-inside: avoid;
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 20px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .note-header {
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #f0f0f0;
            }
            .note-header > div:first-child {
              margin-bottom: 8px;
            }
            .note-type-badge {
              display: inline-block;
              background: #3b82f6;
              color: white;
              padding: 3px 10px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 5px;
            }
            .note-header h3 {
              margin: 5px 0 0 0;
              font-size: 18px;
              color: #b91c1c;
            }
            .note-meta {
              font-size: 12px;
              color: #666;
            }
            .note-meta > div {
              margin-top: 3px;
            }
            .note-content {
              margin-top: 15px;
            }
            .note-section {
              margin-bottom: 15px;
            }
            .note-section:last-child {
              margin-bottom: 0;
            }
            .note-section h4 {
              margin: 0 0 8px 0;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #b91c1c;
              font-weight: 600;
            }
            .note-section p {
              margin: 0;
              padding: 12px;
              background: #fafafa;
              border-radius: 6px;
              border-left: 4px solid #b91c1c;
              font-size: 14px;
              line-height: 1.7;
              white-space: pre-wrap;
            }
            .summary-stats {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #0ea5e9;
            }
            @media print {
              body {
                margin: 0;
                font-size: 12px;
              }
              .case-note {
                page-break-inside: avoid;
                margin-bottom: 20px;
                box-shadow: none;
                border: 1px solid #333;
              }
              .header {
                margin: 0 0 20px 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${logoSrc}" alt="Heartland Boys Home Logo" />
            <h1>Heartland Boys Home</h1>
            <h2>Case Notes Report</h2>
            <p>Generated on ${format(new Date(), 'MMMM d, yyyy')}</p>
          </div>

          <div class="youth-info">
            <h3>Youth Information</h3>
            <p><strong>Name:</strong> ${youthName}</p>
            <p><strong>Report Date:</strong> ${format(new Date(), 'MMMM d, yyyy')}</p>
            <p><strong>Total Notes:</strong> ${filteredNotes.length}</p>
          </div>

          <div class="summary-stats">
            <h3>Summary</h3>
            <p>This report contains ${filteredNotes.length} case note${filteredNotes.length !== 1 ? 's' : ''} for ${youthName}.</p>
            ${filteredNotes.length > 0 ? `
              <p>Date range: ${format(parseISO(filteredNotes[filteredNotes.length - 1].date + 'T00:00:00'), 'MMM d, yyyy')} to ${format(parseISO(filteredNotes[0].date + 'T00:00:00'), 'MMM d, yyyy')}</p>
            ` : ''}
          </div>

          ${filteredNotes.map(note => renderNoteHTML(note)).join('')}

          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Heartland Boys Home - Confidential Case Notes</p>
            <p>Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPDF = async () => {
    if (!printRef.current) {
      toast.error("Unable to generate PDF. Please try again.");
      return;
    }

    try {
      setIsExporting(true);
      const html = generateNotesHTML();

      // Create a temporary container for the HTML
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = html;
      tempContainer.style.width = '816px'; // Letter width in pixels at 96 DPI
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);

      const filename = `${selectedYouth?.firstName}_${selectedYouth?.lastName}_Case_Notes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      await exportElementToPDF(tempContainer, filename);

      document.body.removeChild(tempContainer);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const html = generateNotesHTML();
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      toast.error("Please allow pop-ups to print case notes");
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    };
  };

  const parseNote = (content?: string | null): any => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  };

  const renderEditForm = (note: CaseNote) => {
    if (!editFormData) return null;

    if (editFormData.noteType === 'session') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(e) => handleEditInputChange('date', e.target.value)}
              />
            </div>
            <div>
              <Label>Staff Name</Label>
              <Input
                value={editFormData.staff}
                onChange={(e) => handleEditInputChange('staff', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>Session Summary</Label>
            <Textarea
              value={editFormData.summary || ''}
              onChange={(e) => handleEditInputChange('summary', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Strengths & Challenges</Label>
            <Textarea
              value={editFormData.strengthsChallenges || ''}
              onChange={(e) => handleEditInputChange('strengthsChallenges', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Interventions & Response</Label>
            <Textarea
              value={editFormData.interventionsResponse || ''}
              onChange={(e) => handleEditInputChange('interventionsResponse', e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label>Plan & Next Steps</Label>
            <Textarea
              value={editFormData.planNextSteps || ''}
              onChange={(e) => handleEditInputChange('planNextSteps', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveEdit(note.id!)}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      );
    } else {
      // General or Shift note edit
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editFormData.date}
                onChange={(e) => handleEditInputChange('date', e.target.value)}
              />
            </div>
            <div>
              <Label>Staff Name</Label>
              <Input
                value={editFormData.staff}
                onChange={(e) => handleEditInputChange('staff', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label>{editFormData.noteType === 'shift' ? 'Shift Summary' : 'General Note'}</Label>
            <Textarea
              value={editFormData.summary || ''}
              onChange={(e) => handleEditInputChange('summary', e.target.value)}
              rows={6}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={cancelEditing}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => saveEdit(note.id!)}
              disabled={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      );
    }
  };

  const renderNoteContent = (note: CaseNote) => {
    // If editing this note, show edit form
    if (editingNoteId === note.id) {
      return renderEditForm(note);
    }

    const parsed = parseNote(note.note);

    if (!parsed) {
      return <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>;
    }

    if (parsed.noteType === 'session') {
      return (
        <div className="space-y-4">
          {parsed.sections.summary && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Session Summary</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.sections.summary}</p>
            </div>
          )}
          {parsed.sections.strengthsChallenges && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Strengths & Challenges</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.sections.strengthsChallenges}</p>
            </div>
          )}
          {parsed.sections.interventionsResponse && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Interventions & Response</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.sections.interventionsResponse}</p>
            </div>
          )}
          {parsed.sections.planNextSteps && (
            <div>
              <h4 className="font-semibold text-sm mb-1">Plan & Next Steps</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.sections.planNextSteps}</p>
            </div>
          )}
        </div>
      );
    } else {
      // General or Shift note
      return (
        <div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{parsed.summary}</p>
        </div>
      );
    }
  };

  const getNoteTypeBadge = (note: CaseNote) => {
    const parsed = parseNote(note.note);
    const type = parsed?.noteType || 'legacy';

    const badges: Record<string, { label: string; variant: any }> = {
      session: { label: 'Session', variant: 'default' },
      general: { label: 'General', variant: 'secondary' },
      shift: { label: 'Shift', variant: 'outline' },
      legacy: { label: 'Note', variant: 'outline' }
    };

    const badge = badges[type] || badges.legacy;
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Case Notes</h2>
          <p className="text-sm text-gray-600">
            {selectedYouth?.firstName} {selectedYouth?.lastName}
          </p>
        </div>
        {aiStatus?.available && (
          <Badge variant="default" className="gap-1">
            <Sparkles className="w-3 h-3" />
            AI Enhanced
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'history')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create Note</TabsTrigger>
          <TabsTrigger value="history">
            Note History ({notes.length})
          </TabsTrigger>
        </TabsList>

        {/* CREATE NOTE TAB */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Case Note</CardTitle>
              <CardDescription>Select note type and complete the form</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Note Type Selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={noteType === 'session' ? 'default' : 'outline'}
                  onClick={() => setNoteType('session')}
                  className="flex-1"
                >
                  Session Note
                </Button>
                <Button
                  type="button"
                  variant={noteType === 'general' ? 'default' : 'outline'}
                  onClick={() => setNoteType('general')}
                  className="flex-1"
                >
                  General Note
                </Button>
                <Button
                  type="button"
                  variant={noteType === 'shift' ? 'default' : 'outline'}
                  onClick={() => setNoteType('shift')}
                  className="flex-1"
                >
                  Shift Summary
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Common Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={noteType === 'session' ? sessionFormData.date : simpleFormData.date}
                      onChange={noteType === 'session' ? handleSessionInputChange : handleSimpleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="staff">Staff Name</Label>
                    <Input
                      id="staff"
                      name="staff"
                      value={noteType === 'session' ? sessionFormData.staff : simpleFormData.staff}
                      onChange={noteType === 'session' ? handleSessionInputChange : handleSimpleInputChange}
                      placeholder="Your name"
                      required
                    />
                  </div>
                </div>

                {/* SESSION NOTE FIELDS */}
                {noteType === 'session' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="summary">Session Summary</Label>
                        {aiStatus?.available && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => enhanceTextField('summary', sessionFormData.summary, 'session')}
                            disabled={isEnhancing === 'summary' || !sessionFormData.summary.trim()}
                          >
                            {isEnhancing === 'summary' ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Enhance
                          </Button>
                        )}
                      </div>
                      <Textarea
                        id="summary"
                        name="summary"
                        value={sessionFormData.summary}
                        onChange={handleSessionInputChange}
                        placeholder="Brief overview of the session..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="strengthsChallenges">Strengths & Challenges</Label>
                        {aiStatus?.available && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => enhanceTextField('strengthsChallenges', sessionFormData.strengthsChallenges, 'session')}
                            disabled={isEnhancing === 'strengthsChallenges' || !sessionFormData.strengthsChallenges.trim()}
                          >
                            {isEnhancing === 'strengthsChallenges' ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Enhance
                          </Button>
                        )}
                      </div>
                      <Textarea
                        id="strengthsChallenges"
                        name="strengthsChallenges"
                        value={sessionFormData.strengthsChallenges}
                        onChange={handleSessionInputChange}
                        placeholder="Observed strengths and challenges during session..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="interventionsResponse">Interventions & Response</Label>
                        {aiStatus?.available && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => enhanceTextField('interventionsResponse', sessionFormData.interventionsResponse, 'session')}
                            disabled={isEnhancing === 'interventionsResponse' || !sessionFormData.interventionsResponse.trim()}
                          >
                            {isEnhancing === 'interventionsResponse' ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Enhance
                          </Button>
                        )}
                      </div>
                      <Textarea
                        id="interventionsResponse"
                        name="interventionsResponse"
                        value={sessionFormData.interventionsResponse}
                        onChange={handleSessionInputChange}
                        placeholder="Interventions used and youth's response..."
                        rows={3}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="planNextSteps">Plan & Next Steps</Label>
                        {aiStatus?.available && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => enhanceTextField('planNextSteps', sessionFormData.planNextSteps, 'session')}
                            disabled={isEnhancing === 'planNextSteps' || !sessionFormData.planNextSteps.trim()}
                          >
                            {isEnhancing === 'planNextSteps' ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                              <Sparkles className="w-4 h-4 mr-1" />
                            )}
                            Enhance
                          </Button>
                        )}
                      </div>
                      <Textarea
                        id="planNextSteps"
                        name="planNextSteps"
                        value={sessionFormData.planNextSteps}
                        onChange={handleSessionInputChange}
                        placeholder="Treatment plan and next steps..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                {/* GENERAL/SHIFT NOTE FIELDS */}
                {(noteType === 'general' || noteType === 'shift') && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="summary">
                        {noteType === 'shift' ? 'Shift Summary' : 'General Note'}
                      </Label>
                      {aiStatus?.available && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => enhanceTextField(noteType === 'shift' ? 'shift_summary' : 'general_summary', simpleFormData.summary, 'simple')}
                          disabled={isEnhancing !== null || !simpleFormData.summary.trim()}
                        >
                          {isEnhancing ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-1" />
                          )}
                          Enhance
                        </Button>
                      )}
                    </div>
                    <Textarea
                      id="summary"
                      name="summary"
                      value={simpleFormData.summary}
                      onChange={handleSimpleInputChange}
                      placeholder={
                        noteType === 'shift'
                          ? "Summary of shift activities, observations, and important events..."
                          : "General case note information..."
                      }
                      rows={6}
                      required
                    />
                    {noteType === 'shift' && (
                      <p className="text-xs text-gray-500 mt-1">
                        Tip: You can copy information from DPNs into this section
                      </p>
                    )}
                  </div>
                )}

                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Saving..." : `Save ${noteType === 'session' ? 'Session' : noteType === 'general' ? 'General' : 'Shift'} Note`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Note History</CardTitle>
                  <CardDescription>View all case notes for this youth</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPDF}
                    disabled={isExporting || filteredNotes.length === 0}
                  >
                    {isExporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    disabled={filteredNotes.length === 0}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Notes List */}
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading notes...</p>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    {searchTerm ? 'No notes found matching your search' : 'No case notes yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotes.map((note) => (
                    <Collapsible
                      key={note.id}
                      open={expandedNote === note.id}
                      onOpenChange={() => toggleNoteExpansion(note.id!)}
                    >
                      <Card>
                        <CollapsibleTrigger className="w-full" asChild>
                          <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                {expandedNote === note.id ? (
                                  <ChevronDown className="w-5 h-5 mt-0.5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 mt-0.5 text-gray-400" />
                                )}
                                <div className="text-left flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {getNoteTypeBadge(note)}
                                    <span className="text-sm font-medium">
                                      {format(parseISO(note.date + 'T00:00:00'), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="text-xs text-gray-500">by {note.staff}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {note.summary}
                                  </p>
                                </div>
                              </div>
                              {editingNoteId !== note.id && (
                                <div className="flex gap-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditing(note);
                                    }}
                                    title="Edit note"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(note.id!, note.summary || 'Case note');
                                    }}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Delete note"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 pt-2 border-t">
                            {renderNoteContent(note)}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedCaseNotes;
