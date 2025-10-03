import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, ChevronRight, FileText, Search, Download, Printer, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCaseNotes, useYouth } from "@/hooks/useSupabase";
import { type CaseNotes as CaseNote, type Youth } from "@/integrations/supabase/services";
import { exportHTMLToPDF } from "@/utils/export";
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
  const printRef = useRef<HTMLDivElement>(null);

  // AI enhancement state
  const [isEnhancing, setIsEnhancing] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);

  // Use Supabase hooks
  const { caseNotes: notes, loading: isLoading, createCaseNote } = useCaseNotes(youthId);
  const { youths } = useYouth();

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
      summary: `Enhance and elaborate on this session summary for ${youth.firstName}. Make it more detailed and professional while maintaining the original meaning and facts:\n\n"${currentValue}"\n\nProvide an enhanced version that is clear, professional, and clinically appropriate.`,

      strengthsChallenges: `Enhance and elaborate on these strengths and challenges for ${youth.firstName}. Expand on the points mentioned while maintaining clinical professionalism:\n\n"${currentValue}"\n\nProvide an enhanced version with more detail and clinical insight.`,

      interventionsResponse: `Enhance and elaborate on this description of interventions and youth response for ${youth.firstName}. Make it more detailed and clinically sound:\n\n"${currentValue}"\n\nProvide an enhanced version that clearly describes interventions used and the youth's response.`,

      planNextSteps: `Enhance and elaborate on this treatment plan and next steps for ${youth.firstName}. Make it more actionable and specific:\n\n"${currentValue}"\n\nProvide an enhanced version with clear, measurable next steps and goals.`,

      general_summary: `Enhance and elaborate on this general case note for ${youth.firstName}. Make it more detailed, professional, and clinically appropriate:\n\n"${currentValue}"\n\nProvide an enhanced version that is comprehensive yet concise.`,

      shift_summary: `Enhance and elaborate on this shift summary for ${youth.firstName}. Make it more detailed while maintaining brevity:\n\n"${currentValue}"\n\nProvide an enhanced version that captures key events and observations from the shift.`
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
          date: format(new Date(sessionFormData.date), 'yyyy-MM-dd'),
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
          date: format(new Date(simpleFormData.date), 'yyyy-MM-dd'),
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

  const parseNote = (content?: string | null): any => {
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  };

  const renderNoteContent = (note: CaseNote) => {
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
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm">
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
                        <CollapsibleTrigger className="w-full">
                          <div className="p-4 hover:bg-gray-50 transition-colors">
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
                                      {format(new Date(note.date), 'MMM dd, yyyy')}
                                    </span>
                                    <span className="text-xs text-gray-500">by {note.staff}</span>
                                  </div>
                                  <p className="text-sm text-gray-600 line-clamp-2">
                                    {note.summary}
                                  </p>
                                </div>
                              </div>
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
