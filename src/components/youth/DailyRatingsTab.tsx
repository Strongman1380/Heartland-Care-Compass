import { useState, useEffect } from "react";
import { Youth, DailyRating } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CalendarDays } from "lucide-react";
import { format, subDays, startOfWeek, startOfMonth } from "date-fns";
// Supabase removed - using local storage only
import { useToast } from "@/hooks/use-toast";

interface DailyRatingsTabProps {
  youth: Youth;
}

interface RatingAverages {
  weekly: {
    peerInteraction: number;
    adultInteraction: number;
    investmentLevel: number;
    dealAuthority: number;
  };
  monthly: {
    peerInteraction: number;
    adultInteraction: number;
    investmentLevel: number;
    dealAuthority: number;
  };
}

export const DailyRatingsTab = ({ youth }: DailyRatingsTabProps) => {
  const [ratings, setRatings] = useState<DailyRating[]>([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [todayRating, setTodayRating] = useState<Partial<DailyRating>>({
    peerInteraction: 0,
    adultInteraction: 0,
    investmentLevel: 0,
    dealAuthority: 0,
    staff: "",
    comments: ""
  });
  const [averages, setAverages] = useState<RatingAverages>({
    weekly: { peerInteraction: 0, adultInteraction: 0, investmentLevel: 0, dealAuthority: 0 },
    monthly: { peerInteraction: 0, adultInteraction: 0, investmentLevel: 0, dealAuthority: 0 }
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchRatings = () => {
    try {
      // TODO: Implement daily ratings fetching from local storage
      const mappedRatings: DailyRating[] = [];
      setRatings(mappedRatings);
      
      // Calculate averages
      calculateAverages(mappedRatings);
      
      // Check if there's a rating for selected date
      const existingRating = mappedRatings.find(r => 
        r.date && format(r.date, "yyyy-MM-dd") === selectedDate
      );
      
      if (existingRating) {
        setTodayRating({
          peerInteraction: existingRating.peerInteraction || 0,
          adultInteraction: existingRating.adultInteraction || 0,
          investmentLevel: existingRating.investmentLevel || 0,
          dealAuthority: existingRating.dealAuthority || 0,
          staff: existingRating.staff || "",
          comments: existingRating.comments || ""
        });
      }
    } catch (error) {
      console.error("Error fetching ratings:", error);
      toast({
        title: "Error",
        description: "Failed to load ratings",
        variant: "destructive"
      });
    }
  };

  const calculateAverages = (ratingsData: DailyRating[]) => {
    const weekStart = startOfWeek(new Date());
    const monthStart = startOfMonth(new Date());
    
    const weeklyRatings = ratingsData.filter(r => r.date && r.date >= weekStart);
    const monthlyRatings = ratingsData.filter(r => r.date && r.date >= monthStart);
    
    const calcAvg = (ratings: DailyRating[], field: keyof DailyRating) => {
      const values = ratings.map(r => r[field] as number).filter(v => v !== null && v !== undefined);
      return values.length > 0 ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10 : 0;
    };
    
    setAverages({
      weekly: {
        peerInteraction: calcAvg(weeklyRatings, 'peerInteraction'),
        adultInteraction: calcAvg(weeklyRatings, 'adultInteraction'),
        investmentLevel: calcAvg(weeklyRatings, 'investmentLevel'),
        dealAuthority: calcAvg(weeklyRatings, 'dealAuthority')
      },
      monthly: {
        peerInteraction: calcAvg(monthlyRatings, 'peerInteraction'),
        adultInteraction: calcAvg(monthlyRatings, 'adultInteraction'),
        investmentLevel: calcAvg(monthlyRatings, 'investmentLevel'),
        dealAuthority: calcAvg(monthlyRatings, 'dealAuthority')
      }
    });
  };

  const handleSaveRating = () => {
    setLoading(true);
    try {
      // TODO: Save daily rating to local storage
      console.log('Saving daily rating:', {
        youth_id: youth.id,
        date: selectedDate,
        peer_interaction: todayRating.peerInteraction,
        adult_interaction: todayRating.adultInteraction,
        investment_level: todayRating.investmentLevel,
        deal_authority: todayRating.dealAuthority,
        staff: todayRating.staff,
        comments: todayRating.comments
      });

      toast({
        title: "Success",
        description: "Rating saved successfully"
      });
      
      fetchRatings();
    } catch (error) {
      console.error("Error saving rating:", error);
      toast({
        title: "Error",
        description: "Failed to save rating",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRatings();
  }, [youth.id, selectedDate]);

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

  const renderAverageBox = (title: string, weeklyAvg: number, monthlyAvg: number) => (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Weekly:</span>
            <span className="font-bold text-primary">{weeklyAvg}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Monthly:</span>
            <span className="font-bold text-primary">{monthlyAvg}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Daily Rating Input */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Rating Entry
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
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
                value={todayRating.staff || ""}
                onChange={(e) => setTodayRating({...todayRating, staff: e.target.value})}
                placeholder="Enter staff name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {renderRatingInput("Peer Interaction", todayRating.peerInteraction || 0, 
              (value) => setTodayRating({...todayRating, peerInteraction: value}))}
            {renderRatingInput("Adult Interaction", todayRating.adultInteraction || 0, 
              (value) => setTodayRating({...todayRating, adultInteraction: value}))}
            {renderRatingInput("Investment Level", todayRating.investmentLevel || 0, 
              (value) => setTodayRating({...todayRating, investmentLevel: value}))}
            {renderRatingInput("Deal Authority", todayRating.dealAuthority || 0, 
              (value) => setTodayRating({...todayRating, dealAuthority: value}))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comments">Comments</Label>
            <Textarea
              id="comments"
              value={todayRating.comments || ""}
              onChange={(e) => setTodayRating({...todayRating, comments: e.target.value})}
              placeholder="Optional comments about today's ratings..."
              rows={3}
            />
          </div>

          <Button onClick={handleSaveRating} disabled={loading} className="w-full">
            {loading ? "Saving..." : "Save Rating"}
          </Button>
        </CardContent>
      </Card>

      {/* Averages Display */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Rating Averages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderAverageBox("Peer Interaction", averages.weekly.peerInteraction, averages.monthly.peerInteraction)}
            {renderAverageBox("Adult Interaction", averages.weekly.adultInteraction, averages.monthly.adultInteraction)}
            {renderAverageBox("Investment Level", averages.weekly.investmentLevel, averages.monthly.investmentLevel)}
            {renderAverageBox("Deal Authority", averages.weekly.dealAuthority, averages.monthly.dealAuthority)}
          </div>
        </CardContent>
      </Card>

      {/* Recent Ratings History */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-xl text-primary">Recent Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No ratings recorded yet</p>
          ) : (
            <div className="space-y-3">
              {ratings.slice(0, 7).map((rating) => (
                <div key={rating.id} className="border rounded-lg p-3 bg-background/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm">
                      {rating.date ? format(rating.date, "MMM d, yyyy") : "No date"}
                    </span>
                    {rating.staff && (
                      <span className="text-xs text-muted-foreground">by {rating.staff}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>Peer: <span className="font-bold">{rating.peerInteraction || 0}</span></div>
                    <div>Adult: <span className="font-bold">{rating.adultInteraction || 0}</span></div>
                    <div>Investment: <span className="font-bold">{rating.investmentLevel || 0}</span></div>
                    <div>Deal Auth: <span className="font-bold">{rating.dealAuthority || 0}</span></div>
                  </div>
                  {rating.comments && (
                    <p className="text-xs text-muted-foreground mt-2">{rating.comments}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};