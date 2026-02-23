import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, FileText, Search, Users, ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes, useYouth } from "@/hooks/useSupabase";
import { type CaseNotes as CaseNote, type Youth } from "@/integrations/firebase/services";
import { exportHTMLToPDF } from "@/utils/export";
import { buildReportFilename } from "@/utils/reportFilenames";

interface CaseNotesProps {
  youthId: string;
  youth: any;
  onYouthChange?: (youthId: string) => void;
  onBackToSelection?: () => void;
}

type CaseNoteSections = {
  summary?: string;
  strengthsChallenges?: string;
  interventionsResponse?: string;
  planNextSteps?: string;
};

export const CaseNotes = ({ youthId, youth, onYouthChange, onBackToSelection }: CaseNotesProps) => {
  const [filteredNotes, setFilteredNotes] = useState<CaseNote[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [selectedYouth, setSelectedYouth] = useState<Youth | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Use Supabase hooks
  const { caseNotes: notes, loading: isLoading, createCaseNote } = useCaseNotes(youthId);
  const { youths } = useYouth();
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

  const toggleNoteExpansion = (noteId: string) => {
    setExpandedNote(expandedNote === noteId ? null : noteId);
  };

  const handleYouthChange = (newYouthId: string) => {
    if (onYouthChange) {
      onYouthChange(newYouthId);
    }
  };

  const handleExportNotes = async () => {
    try {
      const html = generateCaseNotesHTML();
      const filename = `${buildReportFilename(selectedYouth || youth, "Case Notes")}.pdf`;
      await exportHTMLToPDF(html, filename);
      toast.success("Case notes exported successfully!");
    } catch (error) {
      toast.error("Failed to export case notes");
    }
  };

  const handlePrintNotes = () => {
    const html = generateCaseNotesHTML();
    const printWindow = window.open('about:blank', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
    if (!printWindow) {
      toast.error("Please allow pop-ups to print case notes");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    const triggerPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      } catch (printError) {
        console.warn('Print error:', printError);
        printWindow.close();
      }
    };

    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 500);
    } else {
      printWindow.addEventListener('load', () => {
        setTimeout(triggerPrint, 500);
      }, { once: true });
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
          className="text-sm text-gray-800 leading-relaxed"
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

  const renderStructuredSection = (label: string, value?: string) => {
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

  const generateCaseNotesHTML = () => {
    const youthName = selectedYouth ? `${selectedYouth.firstName} ${selectedYouth.lastName}` : 'Unknown Youth';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const logoSrc = `${baseUrl}${import.meta.env.BASE_URL}files/BoysHomeLogo.png`;

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
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 10px;
              color: #b91c1c;
              border-bottom: 1px solid #eee;
              padding-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .note-meta {
              font-size: 12px;
              color: #666;
              font-weight: normal;
            }
            .note-content {
              display: grid;
              gap: 16px;
              margin-top: 15px;
            }
            .note-section h4 {
              margin: 0 0 6px 0;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #b91c1c;
            }
            .note-section p {
              margin: 0;
              padding: 12px;
              background: #fafafa;
              border-radius: 6px;
              border-left: 4px solid #b91c1c;
              font-size: 14px;
              line-height: 1.7;
              white-space: normal;
            }
            .summary-stats {
              background: #f0f9ff;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 20px;
              border-left: 4px solid #0ea5e9;
            }
            @media print {
              body { margin: 0; font-size: 12px; }
              .case-note {
                page-break-inside: avoid;
                margin-bottom: 20px;
                box-shadow: none;
                border: 1px solid #333;
              }
              .header { margin: 0 0 20px 0; }
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
            <p>Date range: ${filteredNotes.length > 0 ?
              `${format(parseISO(filteredNotes[filteredNotes.length - 1].date + 'T00:00:00'), 'MMM d, yyyy')} to ${format(parseISO(filteredNotes[0].date + 'T00:00:00'), 'MMM d, yyyy')}` :
              'No notes available'
            }</p>
          </div>

          ${filteredNotes.map((note) => {
              const structured = parseStructuredNote(note.note);
              const renderedSections = structured ? `
                ${renderStructuredSection('Summary of Discussion', structured.summary)}
                ${renderStructuredSection('Strengths & Challenges', structured.strengthsChallenges)}
                ${renderStructuredSection('Interventions / Response', structured.interventionsResponse)}
                ${renderStructuredSection('Plan / Next Steps', structured.planNextSteps)}
              ` : `<div class="note-section"><p>${(note.note || 'No content')
                .replace(/\n/g, '<br>')
                .replace(/  /g, '&nbsp;&nbsp;')
                .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;')}</p></div>`;

              return `
            <div class="case-note">
              <div class="note-header">
                <span>${note.summary || 'Case Note'}</span>
                <div class="note-meta">
                  <div>${format(parseISO(note.date + 'T00:00:00'), 'MMMM d, yyyy')}</div>
                  <div>by ${note.staff || 'Staff Member'}</div>
                </div>
              </div>
              <div class="note-content">${renderedSections}</div>
            </div>
          `;
            }).join('')}

          <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
            <p>Heartland Boys Home - Confidential Case Notes</p>
            <p>Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
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
          <p className="text-gray-600 mb-4">Document case notes for reports and record keeping.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          {onBackToSelection && (
            <Button variant="outline" size="sm" onClick={onBackToSelection}>
              <ArrowLeft size={16} className="mr-2" />
              Back to Selection
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePrintNotes}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportNotes}>
            <Download size={16} className="mr-2" />
            Export PDF
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
              
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="summary">Summary of Discussion</Label>
                  <Textarea
                    id="summary"
                    name="summary"
                    value={formData.summary}
                    onChange={handleInputChange}
                    placeholder="Key topics discussed, youth presentation, and overall tone of the conversation"
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
                    placeholder="Identify strengths that surfaced and challenges or barriers that need attention"
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
                    placeholder="Document interventions applied, staff support provided, and youth response"
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
                    placeholder="Outline follow-up actions, assigned responsibilities, and dates for review"
                    rows={4}
                    className="resize-none text-sm leading-relaxed"
                  />
                </div>
              </div>

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
                              {note.date ? format(parseISO(note.date + 'T00:00:00'), 'MMM dd, yyyy') : 'No date'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 sm:mt-0">
                            by {note.staff || 'Unknown Staff'}
                          </div>
                        </div>
                        
                        <CollapsibleContent className="mt-2">
                          <div className="bg-gray-50 p-4 rounded-md border border-blue-100">
                            {renderNoteSections(note)}
                          </div>
                          <div className="text-xs text-gray-500 mt-3 flex justify-between">
                            <span>Created: {note.createdAt ? format(new Date(note.createdAt), 'MMM dd, yyyy \'at\' h:mm a') : 'Unknown'}</span>
                            <span>ID: {note.id?.substring(0, 8)}...</span>
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
