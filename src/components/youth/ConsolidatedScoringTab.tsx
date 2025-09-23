import { useState, useEffect } from "react";
import { Youth } from "@/integrations/supabase/services";
import { DailyRating } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Plus, Download, FileText } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useDailyRatings } from "@/hooks/useSupabase";
import { DpnReport } from "@/components/reports/DpnReport";

interface ConsolidatedScoringTabProps {
  youth: Youth;
  onRatingsUpdated?: () => void;
}

export const ConsolidatedScoringTab = ({ youth, onRatingsUpdated }: ConsolidatedScoringTabProps) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");
  const { toast } = useToast();
  const { saveDailyRating } = useDailyRatings();

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

  const handleSaveDPN = async () => {
    setLoading(true);
    try {
      // Save daily ratings to Supabase
      const ratingData = {
        youth_id: youth.id,
        date: selectedDate,
        peerInteraction: dailyRating.peerInteraction,
        adultInteraction: dailyRating.adultInteraction,
        investmentLevel: dailyRating.investmentLevel,
        dealAuthority: dailyRating.dealAuthority,
        staff: staffName,
        comments: [
          dailyRating.peerInteractionComment,
          dailyRating.adultInteractionComment,
          dailyRating.investmentLevelComment,
          dailyRating.dealAuthorityComment
        ].filter(Boolean).join(' | ')
      };

      await saveDailyRating(ratingData);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
