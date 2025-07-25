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
    morningPoints: 0,
    afternoonPoints: 0,
    eveningPoints: 0,
    comments: ""
  });

  // Progress Note State
  const [progressNote, setProgressNote] = useState({
    category: "",
    note: "",
    rating: 0
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
          morningPoints: pointsData.morningpoints || 0,
          afternoonPoints: pointsData.afternoonpoints || 0,
          eveningPoints: pointsData.eveningpoints || 0,
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

  const handleSaveAll = async () => {
    setLoading(true);
    try {
      const totalPoints = dailyPoints.morningPoints + dailyPoints.afternoonPoints + dailyPoints.eveningPoints;

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

      // Save daily points
      const { error: pointsError } = await supabase
        .from("points")
        .upsert({
          youth_id: youth.id,
          date: selectedDate,
          morningpoints: dailyPoints.morningPoints,
          afternoonpoints: dailyPoints.afternoonPoints,
          eveningpoints: dailyPoints.eveningPoints,
          totalpoints: totalPoints,
          comments: dailyPoints.comments
        });

      if (pointsError) throw pointsError;

      // Update youth's total points
      const { error: updateError } = await supabase
        .from("youths")
        .update({ pointtotal: (youth.pointTotal || 0) + totalPoints })
        .eq("id", youth.id);

      if (updateError) throw updateError;

      // Save progress note if provided
      if (progressNote.note.trim() && progressNote.category) {
        const { error: noteError } = await supabase
          .from("notes")
          .insert({
            youth_id: youth.id,
            date: selectedDate,
            category: progressNote.category,
            note: progressNote.note,
            rating: progressNote.rating,
            staff: staffName
          });

        if (noteError) throw noteError;
      }

      toast({
        title: "Success",
        description: "All scoring data saved successfully"
      });

      // Reset forms
      setDailyRating({
        peerInteraction: 0,
        adultInteraction: 0,
        investmentLevel: 0,
        dealAuthority: 0,
        comments: ""
      });
      setDailyPoints({
        morningPoints: 0,
        afternoonPoints: 0,
        eveningPoints: 0,
        comments: ""
      });
      setProgressNote({
        category: "",
        note: "",
        rating: 0
      });

    } catch (error) {
      console.error("Error saving data:", error);
      toast({
        title: "Error",
        description: "Failed to save scoring data",
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
        </CardContent>
      </Card>

      {/* Daily Points */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Daily Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="morning">Morning Points</Label>
              <Input
                id="morning"
                type="number"
                min="0"
                max="100"
                value={dailyPoints.morningPoints}
                onChange={(e) => setDailyPoints({...dailyPoints, morningPoints: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="afternoon">Afternoon Points</Label>
              <Input
                id="afternoon"
                type="number"
                min="0"
                max="100"
                value={dailyPoints.afternoonPoints}
                onChange={(e) => setDailyPoints({...dailyPoints, afternoonPoints: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evening">Evening Points</Label>
              <Input
                id="evening"
                type="number"
                min="0"
                max="100"
                value={dailyPoints.eveningPoints}
                onChange={(e) => setDailyPoints({...dailyPoints, eveningPoints: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="bg-primary/10 p-3 rounded-lg">
            <p className="text-sm font-medium">
              Total Daily Points: {dailyPoints.morningPoints + dailyPoints.afternoonPoints + dailyPoints.eveningPoints}
            </p>
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
        </CardContent>
      </Card>

      {/* Progress Note */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Progress Note (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={progressNote.category} onValueChange={(value) => setProgressNote({...progressNote, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Behavioral">Behavioral</SelectItem>
                  <SelectItem value="Academic">Academic</SelectItem>
                  <SelectItem value="Social">Social</SelectItem>
                  <SelectItem value="Medical">Medical</SelectItem>
                  <SelectItem value="Family">Family</SelectItem>
                  <SelectItem value="Goals">Goals</SelectItem>
                  <SelectItem value="Incident">Incident</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-rating">Overall Rating (0-5)</Label>
              <Select value={progressNote.rating.toString()} onValueChange={(value) => setProgressNote({...progressNote, rating: parseInt(value)})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0 - Poor</SelectItem>
                  <SelectItem value="1">1 - Below Average</SelectItem>
                  <SelectItem value="2">2 - Average</SelectItem>
                  <SelectItem value="3">3 - Good</SelectItem>
                  <SelectItem value="4">4 - Very Good</SelectItem>
                  <SelectItem value="5">5 - Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Progress Note</Label>
            <Textarea
              id="note"
              value={progressNote.note}
              onChange={(e) => setProgressNote({...progressNote, note: e.target.value})}
              placeholder="Enter detailed progress note..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button 
          onClick={handleSaveAll} 
          disabled={loading || !staffName.trim()} 
          size="lg"
          className="min-w-[200px]"
        >
          <Save className="mr-2 h-4 w-4" />
          {loading ? "Saving..." : "Save All Data"}
        </Button>
      </div>
    </div>
  );
};