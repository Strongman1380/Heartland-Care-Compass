
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YouthProfile } from "@/components/youth/YouthProfile";
import { BehaviorCard } from "@/components/behavior/BehaviorCard";
import { EnhancedCaseNotes } from "@/components/notes/EnhancedCaseNotes";
import { RiskAssessment } from "@/components/assessment/RiskAssessment";
import { RealColorsAssessment } from "@/components/assessment/RealColorsAssessment";
import { SuccessPlan } from "@/components/planning/SuccessPlan";
import { User, CheckSquare, FileText, Shield, ArrowLeft, ClipboardCheck, Palette, Target } from "lucide-react";
import { Youth } from "@/integrations/supabase/services";
import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchAssessment } from "@/utils/local-storage-utils";
import { useDailyRatings } from "@/hooks/useSupabase";

// Format points for display (with commas)
const formatPoints = (points: number) => {
  if (points === Infinity) return "N/A";
  return points.toLocaleString();
};

// Get risk level color
const getRiskLevelColor = (riskLevel: string) => {
  switch (riskLevel?.toLowerCase()) {
    case 'very high':
      return 'text-red-700 bg-red-100';
    case 'high':
      return 'text-red-600 bg-red-50';
    case 'medium high':
      return 'text-orange-600 bg-orange-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'low medium':
      return 'text-yellow-500 bg-yellow-25';
    case 'low':
      return 'text-blue-600 bg-blue-50';
    case 'very low':
      return 'text-green-600 bg-green-50';
    // Legacy support for old "moderate" level
    case 'moderate':
      return 'text-yellow-600 bg-yellow-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

interface YouthDetailViewProps {
  selectedYouth: Youth;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onBackToHome: () => void;
  onYouthUpdated: () => void;
}

export const YouthDetailView = ({
  selectedYouth,
  activeTab,
  onTabChange,
  onBackToHome,
  onYouthUpdated
}: YouthDetailViewProps) => {
  const [riskLevel, setRiskLevel] = useState<string | null>(null);

  // Use the daily ratings hook to get actual data
  const { dailyRatings, loadDailyRatings, loading: ratingsLoading } = useDailyRatings(selectedYouth.id);

  // Memoized calculation of behavioral averages - only recalculates when dailyRatings actually change
  const behavioralAverages = useMemo(() => {
    if (dailyRatings.length === 0) {
      return {
        peerInteraction: 0,
        adultInteraction: 0,
        investmentLevel: 0,
        dealAuthority: 0,
      };
    }

    const totals = dailyRatings.reduce((acc, rating) => {
      acc.peerInteraction += rating.peerInteraction || 0;
      acc.adultInteraction += rating.adultInteraction || 0;
      acc.investmentLevel += rating.investmentLevel || 0;
      acc.dealAuthority += rating.dealAuthority || 0;
      return acc;
    }, { peerInteraction: 0, adultInteraction: 0, investmentLevel: 0, dealAuthority: 0 });

    const count = dailyRatings.length;
    return {
      peerInteraction: totals.peerInteraction / count,
      adultInteraction: totals.adultInteraction / count,
      investmentLevel: totals.investmentLevel / count,
      dealAuthority: totals.dealAuthority / count,
    };
  }, [dailyRatings]);

  // Check if we have data to show loading state
  const hasRatingsData = dailyRatings.length > 0;

  // Memoized formatted values to prevent string conversion on every render
  const formattedAverages = useMemo(() => ({
    peerInteraction: behavioralAverages.peerInteraction.toFixed(1),
    adultInteraction: behavioralAverages.adultInteraction.toFixed(1),
    investmentLevel: behavioralAverages.investmentLevel.toFixed(1),
    dealAuthority: behavioralAverages.dealAuthority.toFixed(1),
  }), [behavioralAverages]);

  // Memoized formatted points
  const formattedPoints = useMemo(() => formatPoints(selectedYouth.pointTotal || 0), [selectedYouth.pointTotal]);

  // Load daily ratings when youth changes
  useEffect(() => {
    if (selectedYouth.id) {
      loadDailyRatings(selectedYouth.id);
    }
  }, [selectedYouth.id, loadDailyRatings]);

  // Memoized function to refresh daily ratings and behavioral averages
  const handleRatingsUpdated = useCallback(() => {
    if (selectedYouth.id) {
      loadDailyRatings(selectedYouth.id);
    }
  }, [selectedYouth.id, loadDailyRatings]);

  // Memoized risk level fetching function
  const fetchRiskLevel = useCallback(async () => {
    try {
      const riskAssessment = await fetchAssessment(selectedYouth.id, 'riskassessments', 'riskNeeds');
      if (riskAssessment?.overallrisklevel) {
        setRiskLevel(riskAssessment.overallrisklevel);
      } else {
        setRiskLevel(null);
      }
    } catch (error) {
      console.error('Error fetching risk assessment:', error);
      setRiskLevel(null);
    }
  }, [selectedYouth.id]);

  // Fetch risk assessment data when component mounts or youth changes
  useEffect(() => {
    fetchRiskLevel();
  }, [fetchRiskLevel]);
  return (
    <>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="outline" 
            onClick={onBackToHome}
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Youth List
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
              {selectedYouth.firstName} {selectedYouth.lastName}
            </h1>
            <div className="flex flex-col items-center justify-center gap-2 mt-2">
              <div className="flex items-center gap-3">
                <p className="text-red-600">Level {selectedYouth.level} • {formattedPoints} Points</p>
                {riskLevel && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(riskLevel)}`}>
                    {riskLevel} Risk
                  </span>
                )}
              </div>

              {/* Behavioral Ratings Averages */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {ratingsLoading ? (
                  <span className="text-xs text-gray-500 italic">
                    Loading behavioral averages...
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Peer:</span>
                      <span className="text-blue-600 font-semibold">{formattedAverages.peerInteraction}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Adult:</span>
                      <span className="text-green-600 font-semibold">{formattedAverages.adultInteraction}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Invest:</span>
                      <span className="text-purple-600 font-semibold">{formattedAverages.investmentLevel}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="font-medium">Auth:</span>
                      <span className="text-orange-600 font-semibold">{formattedAverages.dealAuthority}</span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {hasRatingsData
                        ? `Averages based on ${dailyRatings.length} recent daily rating${dailyRatings.length === 1 ? '' : 's'} (0-4 scale)`
                        : 'No daily ratings yet — showing baseline averages (0-4 scale)'}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="w-32"></div> {/* Spacer for layout balance */}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
        <TabsList className="bg-white p-1 shadow-lg rounded-lg overflow-x-auto flex w-full justify-start md:justify-center border-2 border-yellow-300">
          <TabsTrigger value="profile" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <User size={16} />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="behavior" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <CheckSquare size={16} />
            <span>Daily Points</span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <FileText size={16} />
            <span>Case Notes</span>
          </TabsTrigger>
          <TabsTrigger value="assessment" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <Shield size={16} />
            <span>Risk Assessment</span>
          </TabsTrigger>
          <TabsTrigger value="colors" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <Palette size={16} />
            <span>Real Colors</span>
          </TabsTrigger>
          <TabsTrigger value="success-plan" className="flex items-center gap-2 data-[state=active]:bg-yellow-400 data-[state=active]:text-red-900">
            <Target size={16} />
            <span>Success Plan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <YouthProfile
            youth={selectedYouth}
            onBack={onBackToHome}
            onYouthUpdated={onYouthUpdated}
            onRatingsUpdated={handleRatingsUpdated}
          />
        </TabsContent>
        
        <TabsContent value="behavior">
          <BehaviorCard youthId={selectedYouth.id} youth={selectedYouth} onYouthUpdated={onYouthUpdated} />
        </TabsContent>
        
        <TabsContent value="notes">
          <EnhancedCaseNotes youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
        
        <TabsContent value="assessment">
          <RiskAssessment youthId={selectedYouth.id} youth={selectedYouth} onAssessmentUpdated={() => {
            // Refresh risk level when assessment is saved
            const fetchRiskLevel = async () => {
              try {
                const riskAssessment = await fetchAssessment(selectedYouth.id, 'riskassessments', 'riskNeeds');
                if (riskAssessment?.overallrisklevel) {
                  setRiskLevel(riskAssessment.overallrisklevel);
                } else {
                  setRiskLevel(null);
                }
              } catch (error) {
                console.error('Error fetching updated risk assessment:', error);
              }
            };
            fetchRiskLevel();
          }} />
        </TabsContent>
        
        <TabsContent value="colors">
          <RealColorsAssessment selectedYouth={selectedYouth} />
        </TabsContent>
        
        <TabsContent value="success-plan">
          <SuccessPlan youthId={selectedYouth.id} youth={selectedYouth} />
        </TabsContent>
        
      </Tabs>
    </>
  );
};
