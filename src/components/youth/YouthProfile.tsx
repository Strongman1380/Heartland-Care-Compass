import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit } from "lucide-react";
import { format } from "date-fns";
import { Youth } from "@/integrations/supabase/services";
import { useDailyRatings } from "@/hooks/useSupabase";
import { PersonalInfoProfileTab } from "./PersonalInfoProfileTab";
import { BackgroundProfileTab } from "./BackgroundProfileTab";
import { EducationProfileTab } from "./EducationProfileTab";
import { MedicalProfileTab } from "./MedicalProfileTab";
import { MentalHealthProfileTab } from "./MentalHealthProfileTab";
import { ConsolidatedScoringTab } from "./ConsolidatedScoringTab";
import { AssessmentResultsTab } from "./AssessmentResultsTab";
import { EditYouthDialog } from "./EditYouthDialog";

interface YouthProfileProps {
  youth: Youth;
  onBack?: () => void;
  onYouthUpdated?: () => void;
  onRatingsUpdated?: () => void;
}

export const YouthProfile = ({ youth, onBack, onYouthUpdated, onRatingsUpdated }: YouthProfileProps) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [averageScores, setAverageScores] = useState({
    peerInteraction: 0,
    adultInteraction: 0,
    investmentLevel: 0,
    dealAuthority: 0
  });

  const { dailyRatings, loadDailyRatings } = useDailyRatings();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    try {
      const date = new Date(dateString);
      return format(date, "MMMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };

  // Function to get color styling for Real Colors display
  const getColorStyling = (color: string) => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      'Gold': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
      'Blue': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
      'Green': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      'Orange': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' }
    };
    return colorMap[color] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' };
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

  // Load daily ratings when component mounts or youth changes
  useEffect(() => {
    const loadData = async () => {
      if (youth.id) {
        await loadDailyRatings(youth.id, 30); // Load last 30 ratings
      }
    };
    loadData();
  }, [youth.id, loadDailyRatings]);

  // Recalculate averages when daily ratings change or when ratings are updated
  useEffect(() => {
    const newAverages = calculateAverageScores();
    setAverageScores(newAverages);
  }, [dailyRatings]);

  // Handle ratings updated callback
  const handleRatingsUpdated = async () => {
    if (onRatingsUpdated) {
      onRatingsUpdated();
    }
    // Reload daily ratings to get fresh averages
    if (youth.id) {
      await loadDailyRatings(youth.id, 30);
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    if (onYouthUpdated) {
      onYouthUpdated();
    }
  };

  // Helper function to safely render risk level
  const renderRiskLevel = () => {
    try {
      if (youth.hyrnaRiskLevel && typeof youth.hyrnaRiskLevel === 'string' && youth.hyrnaRiskLevel.trim() !== '') {
        const riskLevel = youth.hyrnaRiskLevel.trim().toLowerCase();
        let bgColor = 'bg-green-100';
        let textColor = 'text-green-800';
        let borderColor = 'border-green-300';
        let displayText = youth.hyrnaRiskLevel;
        
        if (riskLevel === 'high') {
          bgColor = 'bg-red-100';
          textColor = 'text-red-800';
          borderColor = 'border-red-300';
        } else if (riskLevel === 'medium') {
          bgColor = 'bg-yellow-100';
          textColor = 'text-yellow-800';
          borderColor = 'border-yellow-300';
        } else if (riskLevel === 'not-assessed') {
          bgColor = 'bg-gray-100';
          textColor = 'text-gray-800';
          borderColor = 'border-gray-300';
          displayText = 'Not Assessed';
        }
        
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-red-700">Risk Level:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${bgColor} ${textColor} ${borderColor}`}>
              {displayText}
            </span>
          </div>
        );
      }
      return null;
    } catch (e) {
      console.error("Error displaying risk level:", e);
      return null;
    }
  };

  return (
    <div>
      {onBack && (
        <Button variant="outline" onClick={onBack} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      )}

      <Card className="border-2 border-red-300">
        <CardHeader className="bg-gradient-to-r from-red-50 via-yellow-50 to-red-50">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl text-red-800 mb-2">
                {youth.firstName} {youth.lastName}
              </CardTitle>
              <div className="text-sm text-red-600 mb-3">
                <span className="font-semibold">Youth ID:</span> 
                <span className="font-mono ml-2">{youth.id}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-red-700">
                <div>
                  <span className="font-semibold">Age:</span> {youth.age || "Not specified"}
                </div>
                <div>
                  <span className="font-semibold">Level:</span> {youth.level}
                </div>
                <div>
                  <span className="font-semibold">Points:</span> {youth.pointTotal || 0}
                </div>
                <div>
                  <span className="font-semibold">Admitted:</span> {formatDate(youth.admissionDate)}
                </div>
              </div>
              
              {/* Real Colors and Risk Level */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {youth.realColorsResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-700">Personality:</span>
                    {youth.realColorsResult.includes('/') ? (
                      <div className="flex items-center gap-1">
                        {youth.realColorsResult.split('/').map((color, index) => {
                          const styling = getColorStyling(color.trim());
                          return (
                            <div key={color} className="flex items-center">
                              {index > 0 && <span className="text-red-400 mx-1">/</span>}
                              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styling.bg} ${styling.text} ${styling.border}`}>
                                {color.trim()}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getColorStyling(youth.realColorsResult).bg} ${getColorStyling(youth.realColorsResult).text} ${getColorStyling(youth.realColorsResult).border}`}>
                        {youth.realColorsResult}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Risk Level - using the safe render function */}
                {renderRiskLevel()}
                
                {(averageScores.peerInteraction > 0 || averageScores.adultInteraction > 0 || averageScores.investmentLevel > 0 || averageScores.dealAuthority > 0) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-700">Avg Scores:</span>
                    <div className="flex gap-1 text-xs">
                      {averageScores.peerInteraction > 0 && <span className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded">P:{averageScores.peerInteraction}</span>}
                      {averageScores.adultInteraction > 0 && <span className="bg-green-100 text-green-800 px-1 py-0.5 rounded">A:{averageScores.adultInteraction}</span>}
                      {averageScores.investmentLevel > 0 && <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded">I:{averageScores.investmentLevel}</span>}
                      {averageScores.dealAuthority > 0 && <span className="bg-orange-100 text-orange-800 px-1 py-0.5 rounded">D:{averageScores.dealAuthority}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue="scoring" className="space-y-6">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="scoring" className="bg-primary/10 text-primary font-medium">Quick Scoring</TabsTrigger>
              <TabsTrigger value="assessments" className="bg-blue/10 text-blue font-medium">Assessments</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="background">Background</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="mental-health">Mental Health</TabsTrigger>
            </TabsList>

            <TabsContent value="scoring">
              <ConsolidatedScoringTab youth={youth} onRatingsUpdated={handleRatingsUpdated} />
            </TabsContent>

            <TabsContent value="assessments">
              <AssessmentResultsTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="personal">
              <PersonalInfoProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="background">
              <BackgroundProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="education">
              <EducationProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="medical">
              <MedicalProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>

            <TabsContent value="mental-health">
              <MentalHealthProfileTab youth={youth} onYouthUpdated={onYouthUpdated} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {editDialogOpen && (
        <EditYouthDialog
          youth={youth}
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
};
