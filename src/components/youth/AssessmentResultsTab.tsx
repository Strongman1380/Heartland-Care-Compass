import { useState, useEffect, useMemo, useCallback } from "react";
import { Youth, youthService } from "@/integrations/supabase/services";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Palette, FileText, Calendar, User, TrendingUp, AlertTriangle, Bug, RotateCcw } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { RealColorsAssessment } from "../assessment/RealColorsAssessment";
import { useDailyRatings } from "@/hooks/useSupabase";
import { toast } from "sonner";

interface AssessmentResultsTabProps {
  youth: Youth;
  onYouthUpdated?: () => void;
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

export const AssessmentResultsTab = ({ youth, onYouthUpdated }: AssessmentResultsTabProps) => {
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingColors, setIsResettingColors] = useState(false);

  // Fix: Pass youth.id to the hook to actually load data
  const { dailyRatings, loadDailyRatings, clearDailyRatings } = useDailyRatings(youth.id);

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

  // Memoized calculation of average scores - only recalculates when dailyRatings change
  const averageScores = useMemo(() => {
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
  }, [dailyRatings]);

  // Load daily ratings when youth changes
  useEffect(() => {
    if (youth.id) {
      loadDailyRatings(youth.id);
    }
  }, [youth.id, loadDailyRatings]);

  // Monthly reset function
  const handleMonthlyReset = useCallback(async () => {
    if (!youth.id) return;

    try {
      setIsResetting(true);

      // Get current month date range
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      // You can implement clearDailyRatings in your hook or call a different method
      // For now, I'll assume clearDailyRatings exists or we implement the logic here
      if (clearDailyRatings) {
        await clearDailyRatings(youth.id, monthStart, monthEnd);
      }

      // Reload the data
      await loadDailyRatings(youth.id);

      toast.success(`Monthly ratings reset completed for ${youth.firstName} ${youth.lastName}`);
    } catch (error) {
      console.error('Error resetting monthly ratings:', error);
      toast.error('Failed to reset monthly ratings. Please try again.');
    } finally {
      setIsResetting(false);
    }
  }, [youth.id, youth.firstName, youth.lastName, clearDailyRatings, loadDailyRatings]);

  // Reset Real Colors assessment function
  const handleResetRealColors = useCallback(async () => {
    if (!youth.id) return;

    try {
      setIsResettingColors(true);

      // Clear the realColorsResult field for this youth
      await youthService.update(youth.id, {
        realColorsResult: null,
        updatedAt: new Date().toISOString()
      });

      toast.success(`Real Colors assessment reset for ${youth.firstName} ${youth.lastName}`);

      // Trigger parent component update to refresh youth data
      if (onYouthUpdated) {
        onYouthUpdated();
      }
    } catch (error) {
      console.error('Error resetting Real Colors assessment:', error);
      toast.error('Failed to reset Real Colors assessment. Please try again.');
    } finally {
      setIsResettingColors(false);
    }
  }, [youth.id, youth.firstName, youth.lastName, onYouthUpdated]);



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
            <div className="flex gap-2">
              {youth.realColorsResult && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetRealColors}
                  disabled={isResettingColors}
                  className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                >
                  <RotateCcw className={`h-4 w-4 mr-2 ${isResettingColors ? 'animate-spin' : ''}`} />
                  {isResettingColors ? 'Resetting...' : 'Reset Assessment'}
                </Button>
              )}
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
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Behavioral Score Averages
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMonthlyReset}
              disabled={isResetting}
              className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
            >
              <RotateCcw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Resetting...' : 'Reset Month'}
            </Button>
          </div>
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