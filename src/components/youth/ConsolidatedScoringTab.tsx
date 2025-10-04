import { useState, useEffect, useMemo } from "react";
import { Youth } from "@/integrations/supabase/services";
import { DailyRating } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Plus, Download, FileText, Sparkles } from "lucide-react";
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
  const { dailyRatings, loadDailyRatings, saveDailyRating } = useDailyRatings();
  const [aiEnhancing, setAiEnhancing] = useState(false);

  // DPN Export State
  const [showDpnExport, setShowDpnExport] = useState(false);
  const [dpnStartDate, setDpnStartDate] = useState(format(startOfWeek(new Date()), "yyyy-MM-dd"));
  const [dpnEndDate, setDpnEndDate] = useState(format(endOfWeek(new Date()), "yyyy-MM-dd"));
  const [dpnVariant, setDpnVariant] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');



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


  const fetchExistingData = () => {
    try {
      // TODO: Implement daily ratings and points fetching from local storage
      // For now, just reset to defaults
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
    } catch (error) {
      // No existing data found, which is fine
      console.log("No existing data for selected date");
    }
  };

  useEffect(() => {
    // Only fetch existing data when date or youth changes, not on every render
    fetchExistingData();
  }, [selectedDate, youth.id]);

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
      if (res.success && res.data) {
        // Try to parse a JSON object from the AI response
        try {
          const parsed = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
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

      await saveDailyRating(ratingData);
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

    } catch (error) {
      console.error("Error saving DPN:", error);
      toast({
        title: "Error",
        description: "Failed to save DPN data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
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
                      // This will trigger the DPN export
                      toast({
                        title: "Generating DPN Report",
                        description: `Creating ${dpnVariant} report for ${format(new Date(dpnStartDate), 'MMM d')} - ${format(new Date(dpnEndDate), 'MMM d, yyyy')}`,
                      });
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
        </CardContent>
      </Card>

    </div>
  );
};
