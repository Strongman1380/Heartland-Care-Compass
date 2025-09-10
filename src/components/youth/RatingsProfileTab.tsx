import { Youth } from "@/types/app-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RatingsProfileTabProps {
  youth: Youth;
}

export const RatingsProfileTab = ({ youth }: RatingsProfileTabProps) => {
  const renderRatingBox = (title: string, value: number | null | undefined) => {
    const rating = value ?? 0;
    
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center">
            <div className="text-3xl font-bold text-primary bg-primary/10 rounded-lg px-4 py-2 min-w-[60px] text-center">
              {rating}
            </div>
            <div className="text-xs text-muted-foreground ml-2">/ 5</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-red-800 mb-4">Behavioral Ratings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Each category is rated on a scale of 0-5, where 0 is the lowest and 5 is the highest performance.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {renderRatingBox("Peer Interaction", youth.peerInteraction)}
          {renderRatingBox("Adult Interaction", youth.adultInteraction)}
          {renderRatingBox("Investment Level", youth.investmentLevel)}
          {renderRatingBox("Deal Authority", youth.dealAuthority)}
        </div>
      </div>
    </div>
  );
};