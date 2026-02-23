import { useState, useEffect, useMemo, useCallback } from "react";
import { Youth } from "@/integrations/firebase/services";
import { DailyRating } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Plus, Download, FileText, Sparkles, History, Trash2, AlertCircle, Edit, X, Check } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useDailyRatings } from "@/hooks/useSupabase";
import { queryData } from "@/services/aiService";
import { DpnReport } from "@/components/reports/DpnReport";

interface ConsolidatedScoringTabProps {
  youth: Youth;
  onRatingsUpdated?: () => void;
}

export const ConsolidatedScoringTab = ({ youth, onRatingsUpdated }: ConsolidatedScoringTabProps) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'day' | 'evening'>('day');
  const { toast } = useToast();
  const { dailyRatings, loadDailyRatings, saveDailyRating, getDailyRatingForDate, deleteDailyRating } = useDailyRatings();
  const [aiEnhancing, setAiEnhancing] = useState(false);

  // DPN Export State
  const [showDpnExport, setShowDpnExport] = useState(false);
  const [dpnStartDate, setDpnStartDate] = useState(format(startOfWeek(new Date()), "yyyy-MM-dd"));
  const [dpnEndDate, setDpnEndDate] = useState(format(endOfWeek(new Date()), "yyyy-MM-dd"));
  const [dpnVariant, setDpnVariant] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [triggerDpnExport, setTriggerDpnExport] = useState(false);

  // DPN History State
  const [showDpnHistory, setShowDpnHistory] = useState(false);
  const [editingRatingId, setEditingRatingId] = useState<string | null>(null);
  const [editingRating, setEditingRating] = useState<any>(null);



  // Daily Ratings State
  const [dailyRating, setDailyRating] = useState({
    peerInteraction: 0,
    peerInteractionComment: "",
    adultInteraction: 0,
    adultInteractionComment: "",
    investmentLevel: 0,
    investmentLevelComment: "",
    dealAuthority: 0,
    dealAuthorityComment: ""
  });


  const fetchExistingData = useCallback(async () => {
    try {
      // Fetch existing rating for the selected date from Supabase
      const existingRating = await getDailyRatingForDate(youth.id, selectedDate);

      if (existingRating) {
        // Load existing data
        console.log('Loading existing rating for date:', selectedDate, existingRating);
        setDailyRating({
          peerInteraction: existingRating.peerInteraction || 0,
          peerInteractionComment: existingRating.peerInteractionComment || "",
          adultInteraction: existingRating.adultInteraction || 0,
          adultInteractionComment: existingRating.adultInteractionComment || "",
          investmentLevel: existingRating.investmentLevel || 0,
          investmentLevelComment: existingRating.investmentLevelComment || "",
          dealAuthority: existingRating.dealAuthority || 0,
          dealAuthorityComment: existingRating.dealAuthorityComment || ""
        });
        setStaffName(existingRating.staff || "");
      } else {
        // No existing data for this date, reset to defaults
        console.log('No existing rating for date:', selectedDate);
        setDailyRating({
          peerInteraction: 0,
          peerInteractionComment: "",
          adultInteraction: 0,
          adultInteractionComment: "",
          investmentLevel: 0,
          investmentLevelComment: "",
          dealAuthority: 0,
          dealAuthorityComment: ""
        });
        setStaffName("");
      }
    } catch (error) {
      console.error("Error fetching existing data:", error);
      // Reset to defaults on error
      setDailyRating({
        peerInteraction: 0,
        peerInteractionComment: "",
        adultInteraction: 0,
        adultInteractionComment: "",
        investmentLevel: 0,
        investmentLevelComment: "",
        dealAuthority: 0,
        dealAuthorityComment: ""
      });
      setStaffName("");
    }
  }, [selectedDate, youth.id, getDailyRatingForDate]);

  useEffect(() => {
    // Fetch existing data when date or youth changes
    fetchExistingData();
  }, [fetchExistingData]);

  // Load all historical ratings for cumulative averages
  useEffect(() => {
    if (youth.id) {
      loadDailyRatings(youth.id);
    }
  }, [youth.id, loadDailyRatings]);

  const renderRatingInput = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    commentValue: string,
    onCommentChange: (value: string) => void
  ) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-primary">{label}</Label>
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onChange(num)}
            className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
              value === num
                ? "bg-primary text-primary-foreground border-primary"
                : "border-primary/20 hover:border-primary/40"
            }`}
          >
            {num}
          </button>
        ))}
      </div>
      <Textarea
        value={commentValue}
        onChange={(e) => onCommentChange(e.target.value)}
        placeholder={`Notes about ${label.toLowerCase()}...`}
        rows={2}
        className="text-sm"
      />
    </div>
  );

  // Derived averages for display (one decimal place)
  const dailyAverage = (() => {
    const vals = [
      dailyRating.peerInteraction,
      dailyRating.adultInteraction,
      dailyRating.investmentLevel,
      dailyRating.dealAuthority,
    ];
    const sum = vals.reduce((a, b) => a + Number(b || 0), 0);
    const avg = sum / vals.length;
    return Number.isFinite(avg) ? Number(avg.toFixed(1)) : 0;
  })();

  // Cumulative averages across all entries
  const cumulativeAverages = useMemo(() => {
    if (!dailyRatings || dailyRatings.length === 0) {
      return { peer: '0.0', adult: '0.0', invest: '0.0', auth: '0.0' };
    }
    const totals = dailyRatings.reduce((acc, r) => {
      acc.peer += Number(r.peerInteraction || 0);
      acc.adult += Number(r.adultInteraction || 0);
      acc.invest += Number(r.investmentLevel || 0);
      acc.auth += Number(r.dealAuthority || 0);
      return acc;
    }, { peer: 0, adult: 0, invest: 0, auth: 0 });
    const count = dailyRatings.length || 1;
    return {
      peer: (totals.peer / count).toFixed(1),
      adult: (totals.adult / count).toFixed(1),
      invest: (totals.invest / count).toFixed(1),
      auth: (totals.auth / count).toFixed(1),
    };
  }, [dailyRatings]);

  const enhanceCommentsWithAI = async () => {
    try {
      setAiEnhancing(true);
      const context = {
        youth: { id: youth.id, name: `${youth.firstName} ${youth.lastName}` },
        date: selectedDate,
        ratings: {
          peerInteraction: dailyRating.peerInteraction,
          adultInteraction: dailyRating.adultInteraction,
          investmentLevel: dailyRating.investmentLevel,
          dealAuthority: dailyRating.dealAuthority,
          average: dailyAverage,
        },
        comments: {
          peerInteraction: dailyRating.peerInteractionComment,
          adultInteraction: dailyRating.adultInteractionComment,
          investmentLevel: dailyRating.investmentLevelComment,
          dealAuthority: dailyRating.dealAuthorityComment,
        },
        scale: "0-4 (whole numbers)",
        guidance: "Generate concise, strengths-based, actionable notes per domain. 1-2 sentences each. Keep trauma-informed tone.",
      };

      const prompt = `Provide improved, concise comments for each behavioral domain based on the 0–4 ratings and current notes.
Domains: peerInteraction, adultInteraction, investmentLevel, dealAuthority.
Return JSON with keys for each domain.
Youth: ${context.youth.name}
Date: ${selectedDate}
Ratings: ${JSON.stringify(context.ratings)}
CurrentComments: ${JSON.stringify(context.comments)}`;

      const res = await queryData(prompt, context);

      let suggestions: any = null;
      if (res.success && res.data?.answer) {
        // Try to parse a JSON object from the AI response
        try {
          const parsed = typeof res.data.answer === 'string' ? JSON.parse(res.data.answer) : res.data.answer;
          suggestions = parsed;
        } catch {
          // If not JSON, try a simple heuristic split
          suggestions = {};
        }
      }

      // Fallback template if AI unavailable
      const fallbackFor = (domain: string, score: number) => {
        const labels = [
          'Unsatisfactory',
          'Needs Improvement',
          'Needs Improvement',
          'Meeting Expectations',
          'Exceeding Expectations',
        ];
        const lvl = labels[Math.max(0, Math.min(4, Math.round(score)))];
        switch (domain) {
          case 'peerInteraction':
            return `${lvl}: Engaged peers ${score >= 3 ? 'positively' : 'with prompts'}. Continue ${score >= 3 ? 'leadership and pro-social modeling' : 'teaching replacement skills and coaching turn-taking'}.`;
          case 'adultInteraction':
            return `${lvl}: ${score >= 3 ? 'Respectful and responsive' : 'Needed reminders to follow directions'}. Reinforce ${score >= 3 ? 'assertive communication' : 'clear expectations and check-for-understanding'}.`;
          case 'investmentLevel':
            return `${lvl}: ${score >= 3 ? 'On-task and motivated' : 'Variable engagement'}. Use ${score >= 3 ? 'goal-setting and stretch tasks' : 'chunking, choice, and brief breaks'} to support progress.`;
          case 'dealAuthority':
            return `${lvl}: ${score >= 3 ? 'Accepted feedback and limits' : 'Struggled with redirection at times'}. Practice ${score >= 3 ? 'self-advocacy and reflection' : 'calm-down strategies and pre-teaching of expectations'}.`;
          default:
            return '';
        }
      };

      setDailyRating(dr => ({
        ...dr,
        peerInteractionComment: suggestions?.peerInteraction || fallbackFor('peerInteraction', dr.peerInteraction),
        adultInteractionComment: suggestions?.adultInteraction || fallbackFor('adultInteraction', dr.adultInteraction),
        investmentLevelComment: suggestions?.investmentLevel || fallbackFor('investmentLevel', dr.investmentLevel),
        dealAuthorityComment: suggestions?.dealAuthority || fallbackFor('dealAuthority', dr.dealAuthority),
      }));

      toast({ title: 'Comments enhanced', description: 'AI suggestions applied per domain.' });
    } catch (e) {
      toast({ title: 'AI not available', description: 'Using fallback suggestions.', variant: 'default' });
    } finally {
      setAiEnhancing(false);
    }
  };

  const handleSaveDPN = async () => {
    // Validate required fields
    if (!staffName.trim()) {
      toast({
        title: "Validation Error",
        description: "Staff name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Save daily ratings to Supabase
      const ratingData = {
        youth_id: youth.id,
        date: selectedDate,
        time_of_day: timeOfDay,
        peerInteraction: dailyRating.peerInteraction,
        peerInteractionComment: dailyRating.peerInteractionComment,
        adultInteraction: dailyRating.adultInteraction,
        adultInteractionComment: dailyRating.adultInteractionComment,
        investmentLevel: dailyRating.investmentLevel,
        investmentLevelComment: dailyRating.investmentLevelComment,
        dealAuthority: dailyRating.dealAuthority,
        dealAuthorityComment: dailyRating.dealAuthorityComment,
        staff: staffName,
        comments: [
          dailyRating.peerInteractionComment,
          dailyRating.adultInteractionComment,
          dailyRating.investmentLevelComment,
          dailyRating.dealAuthorityComment
        ].filter(Boolean).join(' | ')
      };

      console.log('Saving daily rating:', ratingData);
      const saved = await saveDailyRating(ratingData);
      console.log('Daily rating saved successfully:', saved);

      // Refresh cumulative averages after save
      if (youth.id) {
        await loadDailyRatings(youth.id);
      }

      // Call the callback to refresh behavioral averages in parent component
      if (onRatingsUpdated) {
        onRatingsUpdated();
      }

      // Reset daily ratings form only
      setDailyRating({
        peerInteraction: 0,
        peerInteractionComment: "",
        adultInteraction: 0,
        adultInteractionComment: "",
        investmentLevel: 0,
        investmentLevelComment: "",
        dealAuthority: 0,
        dealAuthorityComment: ""
      });
      setStaffName("");

      toast({
        title: "Success",
        description: "Behavioral ratings saved successfully",
      });

    } catch (error) {
      console.error("Error saving DPN:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save DPN data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit rating
  const handleEditRating = (rating: any) => {
    setEditingRatingId(rating.id);
    // Ensure date is in yyyy-MM-dd format for the date input
    const dateStr = rating.date.includes('T')
      ? rating.date.split('T')[0]
      : rating.date;
    setEditingRating({...rating, date: dateStr});
  };

  const handleCancelEdit = () => {
    setEditingRatingId(null);
    setEditingRating(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRating) return;

    try {
      await saveDailyRating({
        youth_id: editingRating.youth_id,
        date: editingRating.date,
        peerInteraction: editingRating.peerInteraction,
        peerInteractionComment: editingRating.peerInteractionComment,
        adultInteraction: editingRating.adultInteraction,
        adultInteractionComment: editingRating.adultInteractionComment,
        investmentLevel: editingRating.investmentLevel,
        investmentLevelComment: editingRating.investmentLevelComment,
        dealAuthority: editingRating.dealAuthority,
        dealAuthorityComment: editingRating.dealAuthorityComment,
        staff: editingRating.staff,
        comments: editingRating.comments
      });

      setEditingRatingId(null);
      setEditingRating(null);

      toast({
        title: "Success",
        description: "DPN entry updated successfully",
      });
    } catch (error) {
      console.error("Error updating DPN:", error);
      toast({
        title: "Error",
        description: "Failed to update DPN entry",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Date and Staff */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Scoring Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot">Time of Day</Label>
              <Select value={timeOfDay} onValueChange={(v: any) => setTimeOfDay(v)}>
                <SelectTrigger id="slot">
                  <SelectValue placeholder="Select slot" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff">Staff Member</Label>
              <Input
                id="staff"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Behavioral Ratings */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Behavioral Ratings (0-4 Scale)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderRatingInput(
              "Peer Interaction",
              dailyRating.peerInteraction,
              (value) => setDailyRating({...dailyRating, peerInteraction: value}),
              dailyRating.peerInteractionComment,
              (value) => setDailyRating({...dailyRating, peerInteractionComment: value})
            )}
            {renderRatingInput(
              "Adult Interaction",
              dailyRating.adultInteraction,
              (value) => setDailyRating({...dailyRating, adultInteraction: value}),
              dailyRating.adultInteractionComment,
              (value) => setDailyRating({...dailyRating, adultInteractionComment: value})
            )}
            {renderRatingInput(
              "Investment Level",
              dailyRating.investmentLevel,
              (value) => setDailyRating({...dailyRating, investmentLevel: value}),
              dailyRating.investmentLevelComment,
              (value) => setDailyRating({...dailyRating, investmentLevelComment: value})
            )}
            {renderRatingInput(
              "Deal w/ Authority",
              dailyRating.dealAuthority,
              (value) => setDailyRating({...dailyRating, dealAuthority: value}),
              dailyRating.dealAuthorityComment,
              (value) => setDailyRating({...dailyRating, dealAuthorityComment: value})
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">Average shown is the mean of the four domains, rounded to one decimal.</div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={enhanceCommentsWithAI}
              disabled={aiEnhancing}
              className="gap-2"
            >
              <Sparkles className={`h-4 w-4 ${aiEnhancing ? 'animate-spin' : ''}`} />
              {aiEnhancing ? 'Enhancing…' : 'Enhance Comments'}
            </Button>
          </div>
          
          {/* DPN Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSaveDPN} 
              disabled={loading || !staffName.trim()} 
              size="lg"
              variant="outline"
              className="min-w-[150px]"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Submit DPN"}
            </Button>
          </div>

          {/* DPN Export Section */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">Export DPN Report</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDpnExport(!showDpnExport)}
                className="text-xs"
              >
                <FileText className="mr-2 h-3 w-3" />
                {showDpnExport ? 'Hide Export' : 'Show Export Options'}
              </Button>
            </div>

            {showDpnExport && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="dpn-start-date" className="text-xs font-medium">Start Date</Label>
                    <Input
                      id="dpn-start-date"
                      type="date"
                      value={dpnStartDate}
                      onChange={(e) => setDpnStartDate(e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dpn-end-date" className="text-xs font-medium">End Date</Label>
                    <Input
                      id="dpn-end-date"
                      type="date"
                      value={dpnEndDate}
                      onChange={(e) => setDpnEndDate(e.target.value)}
                      className="text-sm h-8"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dpn-variant" className="text-xs font-medium">Report Type</Label>
                    <Select value={dpnVariant} onValueChange={(value: 'weekly' | 'biweekly' | 'monthly') => setDpnVariant(value)}>
                      <SelectTrigger className="text-sm h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => {
                      // Trigger the DPN export
                      toast({
                        title: "Generating DPN Report",
                        description: `Creating ${dpnVariant} report for ${format(new Date(dpnStartDate), 'MMM d')} - ${format(new Date(dpnEndDate), 'MMM d, yyyy')}`,
                      });
                      setTriggerDpnExport(true);
                    }}
                    className="text-xs"
                  >
                    <Download className="mr-2 h-3 w-3" />
                    Export DPN Report
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* DPN History Section */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-900">View All DPN Entries</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDpnHistory(!showDpnHistory)}
                className="text-xs"
              >
                <History className="mr-2 h-3 w-3" />
                {showDpnHistory ? 'Hide History' : 'Show History'}
              </Button>
            </div>

            {showDpnHistory && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg max-h-[600px] overflow-y-auto">
                {(() => {
                  // Sort ratings by date (newest first)
                  const sortedRatings = [...dailyRatings]
                    .filter(r => r.youth_id === youth.id)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  // Identify potential duplicates (same date)
                  const dateGroups = sortedRatings.reduce((acc, rating) => {
                    const dateKey = rating.date;
                    if (!acc[dateKey]) acc[dateKey] = [];
                    acc[dateKey].push(rating);
                    return acc;
                  }, {} as Record<string, typeof dailyRatings>);

                  if (sortedRatings.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <History className="mx-auto h-12 w-12 mb-2 opacity-50" />
                        <p>No DPN entries found for this youth</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
                        <span>Total Entries: <strong>{sortedRatings.length}</strong></span>
                        <span>Dates with Multiple Entries: <strong>{Object.values(dateGroups).filter(g => g.length > 1).length}</strong></span>
                      </div>

                      {sortedRatings.map((rating, index) => {
                        const isDuplicate = dateGroups[rating.date]?.length > 1;
                        const duplicateIndex = dateGroups[rating.date]?.indexOf(rating) + 1;
                        const isEditing = editingRatingId === rating.id;
                        const displayRating = isEditing ? editingRating : rating;

                        return (
                          <div
                            key={rating.id}
                            className={`bg-white p-4 rounded-lg border-2 ${
                              isDuplicate ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'
                            } ${isEditing ? 'ring-2 ring-blue-400' : ''}`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {isEditing ? (
                                    <Input
                                      type="date"
                                      value={editingRating.date}
                                      onChange={(e) => setEditingRating({...editingRating, date: e.target.value})}
                                      className="w-40 h-7 text-xs"
                                    />
                                  ) : (
                                    <h5 className="font-semibold text-sm">
                                      {(() => {
                                        // Parse date without timezone conversion
                                        const dateStr = rating.date.includes('T') ? rating.date.split('T')[0] : rating.date;
                                        const [year, month, day] = dateStr.split('-');
                                        const date = new Date(Number(year), Number(month) - 1, Number(day));
                                        return format(date, 'MMM dd, yyyy');
                                      })()}
                                    </h5>
                                  )}
                                  {isDuplicate && (
                                    <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <AlertCircle className="h-3 w-3" />
                                      Duplicate #{duplicateIndex}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {isEditing ? (
                                    <Input
                                      type="text"
                                      placeholder="Staff name"
                                      value={editingRating.staff || ''}
                                      onChange={(e) => setEditingRating({...editingRating, staff: e.target.value})}
                                      className="w-48 h-6 text-xs"
                                    />
                                  ) : (
                                    <p>
                                      Staff: {rating.staff || 'Not specified'} •
                                      Created: {rating.createdAt ? format(new Date(rating.createdAt), 'MMM dd, yyyy h:mm a') : 'Unknown'}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {isEditing ? (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleSaveEdit}
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleCancelEdit}
                                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEditRating(rating)}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to delete this DPN entry from ${format(new Date(rating.date), 'MMM dd, yyyy')}?`)) {
                                          await deleteDailyRating(rating.id);
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div>
                                <span className="text-gray-600">Peer Interaction:</span>
                                {isEditing ? (
                                  <div className="space-y-1 mt-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="4"
                                      value={editingRating.peerInteraction ?? 0}
                                      onChange={(e) => setEditingRating({...editingRating, peerInteraction: Number(e.target.value)})}
                                      className="h-7 text-xs"
                                    />
                                    <Textarea
                                      value={editingRating.peerInteractionComment || ''}
                                      onChange={(e) => setEditingRating({...editingRating, peerInteractionComment: e.target.value})}
                                      className="text-xs h-16"
                                      placeholder="Comment..."
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-semibold">{rating.peerInteraction ?? 'N/A'}</p>
                                    {rating.peerInteractionComment && (
                                      <p className="text-gray-500 mt-1 italic">{rating.peerInteractionComment}</p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600">Adult Interaction:</span>
                                {isEditing ? (
                                  <div className="space-y-1 mt-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="4"
                                      value={editingRating.adultInteraction ?? 0}
                                      onChange={(e) => setEditingRating({...editingRating, adultInteraction: Number(e.target.value)})}
                                      className="h-7 text-xs"
                                    />
                                    <Textarea
                                      value={editingRating.adultInteractionComment || ''}
                                      onChange={(e) => setEditingRating({...editingRating, adultInteractionComment: e.target.value})}
                                      className="text-xs h-16"
                                      placeholder="Comment..."
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-semibold">{rating.adultInteraction ?? 'N/A'}</p>
                                    {rating.adultInteractionComment && (
                                      <p className="text-gray-500 mt-1 italic">{rating.adultInteractionComment}</p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600">Investment Level:</span>
                                {isEditing ? (
                                  <div className="space-y-1 mt-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="4"
                                      value={editingRating.investmentLevel ?? 0}
                                      onChange={(e) => setEditingRating({...editingRating, investmentLevel: Number(e.target.value)})}
                                      className="h-7 text-xs"
                                    />
                                    <Textarea
                                      value={editingRating.investmentLevelComment || ''}
                                      onChange={(e) => setEditingRating({...editingRating, investmentLevelComment: e.target.value})}
                                      className="text-xs h-16"
                                      placeholder="Comment..."
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-semibold">{rating.investmentLevel ?? 'N/A'}</p>
                                    {rating.investmentLevelComment && (
                                      <p className="text-gray-500 mt-1 italic">{rating.investmentLevelComment}</p>
                                    )}
                                  </>
                                )}
                              </div>
                              <div>
                                <span className="text-gray-600">Deal w/ Authority:</span>
                                {isEditing ? (
                                  <div className="space-y-1 mt-1">
                                    <Input
                                      type="number"
                                      min="0"
                                      max="4"
                                      value={editingRating.dealAuthority ?? 0}
                                      onChange={(e) => setEditingRating({...editingRating, dealAuthority: Number(e.target.value)})}
                                      className="h-7 text-xs"
                                    />
                                    <Textarea
                                      value={editingRating.dealAuthorityComment || ''}
                                      onChange={(e) => setEditingRating({...editingRating, dealAuthorityComment: e.target.value})}
                                      className="text-xs h-16"
                                      placeholder="Comment..."
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-semibold">{rating.dealAuthority ?? 'N/A'}</p>
                                    {rating.dealAuthorityComment && (
                                      <p className="text-gray-500 mt-1 italic">{rating.dealAuthorityComment}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {rating.comments && (
                              <div className="mt-3 pt-3 border-t text-xs">
                                <span className="text-gray-600">Additional Comments:</span>
                                <p className="text-gray-700 mt-1">{rating.comments}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden DPN Report Component for Export */}
      {triggerDpnExport && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
          <DpnReport
            youth={youth}
            variant={dpnVariant}
            customStartDate={dpnStartDate}
            customEndDate={dpnEndDate}
            onAutoExportComplete={() => {
              setTriggerDpnExport(false);
              toast({
                title: "DPN Report Generated",
                description: "Your report has been downloaded successfully",
              });
            }}
          />
        </div>
      )}
    </div>
  );
};
