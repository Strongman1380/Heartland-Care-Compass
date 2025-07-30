import { useState, useEffect } from "react";
import { Youth, DailyRating, mapDailyRatingFromSupabase } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Save, Plus } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConsolidatedScoringTabProps {
  youth: Youth;
}

export const ConsolidatedScoringTab = ({ youth }: ConsolidatedScoringTabProps) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [loading, setLoading] = useState(false);
  const [staffName, setStaffName] = useState("");
  const { toast } = useToast();

  // Daily Ratings State
  const [dailyRating, setDailyRating] = useState({
    peerInteraction: 0,
    adultInteraction: 0,
    investmentLevel: 0,
    dealAuthority: 0,
    comments: ""
  });

  // Daily Points State
  const [dailyPoints, setDailyPoints] = useState({
    totalPoints: 0,
    comments: ""
  });

  const fetchExistingData = async () => {
    try {
      // Fetch existing daily rating
      const { data: ratingData } = await supabase
        .from("daily_ratings")
        .select("*")
        .eq("youth_id", youth.id)
        .eq("date", selectedDate)
        .single();

      if (ratingData) {
        const rating = mapDailyRatingFromSupabase(ratingData);
        setDailyRating({
          peerInteraction: rating.peerInteraction || 0,
          adultInteraction: rating.adultInteraction || 0,
          investmentLevel: rating.investmentLevel || 0,
          dealAuthority: rating.dealAuthority || 0,
          comments: rating.comments || ""
        });
        setStaffName(rating.staff || "");
      }

      // Fetch existing points
      const { data: pointsData } = await supabase
        .from("points")
        .select("*")
        .eq("youth_id", youth.id)
        .eq("date", selectedDate)
        .single();

      if (pointsData) {
        setDailyPoints({
          totalPoints: pointsData.totalpoints || 0,
          comments: pointsData.comments || ""
        });
      }
    } catch (error) {
      // No existing data found, which is fine
      console.log("No existing data for selected date");
    }
  };

  useEffect(() => {
    fetchExistingData();
  }, [selectedDate, youth.id]);

  const renderRatingInput = (label: string, value: number, onChange: (value: number) => void) => (
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
    </div>
  );

  const handleSaveDPN = async () => {
    setLoading(true);
    try {
      // Save daily ratings
      const { error: ratingError } = await supabase
        .from("daily_ratings")
        .upsert({
          youth_id: youth.id,
          date: selectedDate,
          peer_interaction: dailyRating.peerInteraction,
          adult_interaction: dailyRating.adultInteraction,
          investment_level: dailyRating.investmentLevel,
          deal_authority: dailyRating.dealAuthority,
          staff: staffName,
          comments: dailyRating.comments
        });

      if (ratingError) throw ratingError;

      toast({
        title: "Success",
        description: "DPN (Daily Point Number) saved successfully"
      });

      // Reset daily ratings form only
      setDailyRating({
        peerInteraction: 0,
        adultInteraction: 0,
        investmentLevel: 0,
        dealAuthority: 0,
        comments: ""
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

  const handleSaveDailyPoints = async () => {
    setLoading(true);
    try {
      // Save daily points
      const { error: pointsError } = await supabase
        .from("points")
        .upsert({
          youth_id: youth.id,
          date: selectedDate,
          morningpoints: 0,
          afternoonpoints: 0,
          eveningpoints: 0,
          totalpoints: dailyPoints.totalPoints,
          comments: dailyPoints.comments
        });

      if (pointsError) throw pointsError;

      // Update youth's total points
      const { error: updateError } = await supabase
        .from("youths")
        .update({ pointtotal: (youth.pointTotal || 0) + dailyPoints.totalPoints })
        .eq("id", youth.id);

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Daily Points Total saved successfully"
      });

      // Reset daily points form only
      setDailyPoints({
        totalPoints: 0,
        comments: ""
      });

    } catch (error) {
      console.error("Error saving daily points:", error);
      toast({
        title: "Error",
        description: "Failed to save daily points data",
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
            {renderRatingInput("Peer Interaction", dailyRating.peerInteraction, 
              (value) => setDailyRating({...dailyRating, peerInteraction: value}))}
            {renderRatingInput("Adult Interaction", dailyRating.adultInteraction, 
              (value) => setDailyRating({...dailyRating, adultInteraction: value}))}
            {renderRatingInput("Investment Level", dailyRating.investmentLevel, 
              (value) => setDailyRating({...dailyRating, investmentLevel: value}))}
            {renderRatingInput("Deal Authority", dailyRating.dealAuthority, 
              (value) => setDailyRating({...dailyRating, dealAuthority: value}))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating-comments">Behavioral Comments</Label>
            <Textarea
              id="rating-comments"
              value={dailyRating.comments}
              onChange={(e) => setDailyRating({...dailyRating, comments: e.target.value})}
              placeholder="Comments about behavioral ratings..."
              rows={2}
            />
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
        </CardContent>
      </Card>

      {/* Daily Points */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Daily Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="total-points">Total Day Points</Label>
            <Input
              id="total-points"
              type="number"
              min="0"
              max="300"
              value={dailyPoints.totalPoints}
              onChange={(e) => setDailyPoints({...dailyPoints, totalPoints: parseInt(e.target.value) || 0})}
              className="text-lg font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="points-comments">Points Comments</Label>
            <Textarea
              id="points-comments"
              value={dailyPoints.comments}
              onChange={(e) => setDailyPoints({...dailyPoints, comments: e.target.value})}
              placeholder="Comments about daily points..."
              rows={2}
            />
          </div>
          
          {/* Daily Points Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button 
              onClick={handleSaveDailyPoints} 
              disabled={loading || dailyPoints.totalPoints === 0} 
              size="lg"
              className="min-w-[180px]"
            >
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Submit Daily Points"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};