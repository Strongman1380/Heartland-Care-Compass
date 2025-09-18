import { useState } from "react";
import { Youth } from "@/integrations/supabase/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface RatingsProfileTabProps {
  youth: Youth;
}

export const RatingsProfileTab = ({ youth }: RatingsProfileTabProps) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staffName, setStaffName] = useState("");
  const [comments, setComments] = useState({
    peerInteraction: "",
    adultInteraction: "",
    investmentLevel: "",
    dealAuthority: ""
  });

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleCommentChange = (field: keyof typeof comments, value: string) => {
    setComments(prev => ({ ...prev, [field]: value }));
  };

  const renderRatingBox = (title: string, value: number | null | undefined, commentField: keyof typeof comments) => {
    const rating = value ?? 0;

    return (
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-center">
            <div className="text-3xl font-bold text-primary bg-primary/10 rounded-lg px-4 py-2 min-w-[60px] text-center">
              {rating}
            </div>
            <div className="text-xs text-muted-foreground ml-2">/ 5</div>
          </div>

          <div>
            <Label htmlFor={`${commentField}-comment`} className="text-xs text-muted-foreground">
              Comments
            </Label>
            <Textarea
              id={`${commentField}-comment`}
              value={comments[commentField]}
              onChange={(e) => handleCommentChange(commentField, e.target.value)}
              placeholder={`Add notes about ${title.toLowerCase()}...`}
              rows={2}
              className="text-sm"
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Date and Staff Name Section */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Rating Session Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rating-date" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date
              </Label>
              <Input
                id="rating-date"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating-staff" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Staff Name
              </Label>
              <Input
                id="rating-staff"
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter staff name"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Behavioral Ratings Section */}
      <div>
        <h3 className="font-semibold text-red-800 mb-4">Behavioral Ratings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Each category is rated on a scale of 1-4, where 1 is the lowest and 4 is the highest performance.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderRatingBox("Peer Interaction", youth.peerInteraction, "peerInteraction")}
          {renderRatingBox("Adult Interaction", youth.adultInteraction, "adultInteraction")}
          {renderRatingBox("Investment Level", youth.investmentLevel, "investmentLevel")}
          {renderRatingBox("Deal Authority", youth.dealAuthority, "dealAuthority")}
        </div>
      </div>
    </div>
  );
};