import { useState, useEffect } from "react";
import { Youth } from "@/integrations/supabase/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, FileText, Calendar, User, TrendingUp, AlertTriangle, Bug } from "lucide-react";
import { format } from "date-fns";
import { RealColorsAssessment } from "../assessment/RealColorsAssessment";
import { useDailyRatings } from "@/hooks/useSupabase";

interface AssessmentResultsTabProps {
  youth: Youth;
}

// Color styling function for Real Colors display
const getColorStyling = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'Gold': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    'Blue': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    'Green': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    'Orange': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' }
  };
  return colorMap[color] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
};

export const AssessmentResultsTab = ({ youth }: AssessmentResultsTabProps) => {
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [averageScores, setAverageScores] = useState({
    peerInteraction: 0,
    adultInteraction: 0,
    investmentLevel: 0,
    dealAuthority: 0
  });

  const { dailyRatings, loadDailyRatings } = useDailyRatings();

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "Not completed";
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return format(date, "MMMM d, yyyy");
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  // Calculate average scores from recent ratings
  const calculateAverageScores = () => {
    if (!dailyRatings || dailyRatings.length === 0) {
      return {
        peerInteraction: 0,
        adultInteraction: 0,
        investmentLevel: 0,
        dealAuthority: 0
      };
    }

    // Get the last 30 days of ratings for more accurate averages
    const recentRatings = dailyRatings.slice(0, 30);
    
    const totals = recentRatings.reduce((acc, rating) => {
      return {
        peerInteraction: acc.peerInteraction + (rating.peerInteraction || 0),
        adultInteraction: acc.adultInteraction + (rating.adultInteraction || 0),
        investmentLevel: acc.investmentLevel + (rating.investmentLevel || 0),
        dealAuthority: acc.dealAuthority + (rating.dealAuthority || 0)
      };
    }, { peerInteraction: 0, adultInteraction: 0, investmentLevel: 0, dealAuthority: 0 });

    const count = recentRatings.length;
    
    return {
      peerInteraction: count > 0 ? Math.round((totals.peerInteraction / count) * 10) / 10 : 0,
      adultInteraction: count > 0 ? Math.round((totals.adultInteraction / count) * 10) / 10 : 0,
      investmentLevel: count > 0 ? Math.round((totals.investmentLevel / count) * 10) / 10 : 0,
      dealAuthority: count > 0 ? Math.round((totals.dealAuthority / count) * 10) / 10 : 0
    };
  };

  // Load daily ratings and calculate averages when component mounts or youth changes
  useEffect(() => {
    const loadData = async () => {
      if (youth.id) {
        await loadDailyRatings(youth.id, 30); // Load last 30 ratings
      }
    };
    loadData();
  }, [youth.id, loadDailyRatings]);

  // Recalculate averages when daily ratings change
  useEffect(() => {
    const newAverages = calculateAverageScores();
    setAverageScores(newAverages);
  }, [dailyRatings]);



  return (
    <div className="space-y-6">
      {/* Real Colors Assessment Results */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Real Colors Personality Assessment
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAssessmentForm(!showAssessmentForm)}
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <FileText className="h-4 w-4 mr-2" />
              {youth.realColorsResult ? 'Retake Assessment' : 'Take Assessment'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {youth.realColorsResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Personality Type:</span>
                {youth.realColorsResult.includes('/') ? (
                  <div className="flex items-center gap-2">
                    {youth.realColorsResult.split('/').map((color, index) => {
                      const styling = getColorStyling(color.trim());
                      return (
                        <div key={color} className="flex items-center gap-1">
                          {index > 0 && <span className="text-gray-400">/</span>}
                          <Badge className={`${styling.bg} ${styling.text} ${styling.border} border`}>
                            {index === 0 ? 'Primary: ' : 'Secondary: '}{color.trim()}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Badge className={`${getColorStyling(youth.realColorsResult).bg} ${getColorStyling(youth.realColorsResult).text} ${getColorStyling(youth.realColorsResult).border} border`}>
                    Primary: {youth.realColorsResult}
                  </Badge>
                )}
              </div>
              <div className="text-sm text-gray-500">
                <Calendar className="h-4 w-4 inline mr-1" />
                Last Updated: {formatDate(youth.updatedAt)}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Palette className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No Real Colors Assessment Completed</p>
              <p className="text-sm">Click "Take Assessment" to complete the personality assessment for this youth.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Form */}
      {showAssessmentForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-700">Complete Real Colors Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <RealColorsAssessment selectedYouth={youth} />
          </CardContent>
        </Card>
      )}

      {/* Behavioral Score Averages */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg text-primary flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Behavioral Score Averages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{averageScores.peerInteraction}</div>
              <div className="text-sm text-blue-600 font-medium">Peer Interaction</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{averageScores.adultInteraction}</div>
              <div className="text-sm text-green-600 font-medium">Adult Interaction</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{averageScores.investmentLevel}</div>
              <div className="text-sm text-purple-600 font-medium">Investment Level</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{averageScores.dealAuthority}</div>
              <div className="text-sm text-orange-600 font-medium">Deal w/ Authority</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500 text-center">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            {dailyRatings && dailyRatings.length > 0 
              ? `Averages based on ${Math.min(dailyRatings.length, 30)} recent daily ratings (0-4 scale)`
              : "No daily ratings available yet - scores will appear after daily scoring entries"
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
};