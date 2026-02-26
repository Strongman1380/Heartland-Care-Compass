import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, CheckCircle2 } from "lucide-react";
import { fetchAssessment } from "@/utils/local-storage-utils";
import { Youth } from "@/integrations/firebase/types";

interface TopSuccessPlanGoalsProps {
  youth: Youth;
}

export const TopSuccessPlanGoals = ({ youth }: TopSuccessPlanGoalsProps) => {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGoals = () => {
      try {
        setLoading(true);
        const assessment = fetchAssessment(youth.id, 'successplans', 'heartlandSuccessPlan');
        
        if (assessment && assessment.data && assessment.data.treatmentobjectives) {
          const obj = assessment.data.treatmentobjectives;
          const activeGoals = [];
          
          if (obj.behavioralObjective1) {
            activeGoals.push({ objective: obj.behavioralObjective1, type: 'Behavioral' });
          }
          if (obj.behavioralObjective2) {
            activeGoals.push({ objective: obj.behavioralObjective2, type: 'Behavioral' });
          }
          if (obj.socialSkillsFocus) {
            activeGoals.push({ objective: obj.socialSkillsFocus, type: 'Social Skills' });
          }
          if (obj.academicGoals) {
            activeGoals.push({ objective: obj.academicGoals, type: 'Academic' });
          }
          if (obj.familyEngagementGoals) {
            activeGoals.push({ objective: obj.familyEngagementGoals, type: 'Family' });
          }
          if (obj.independentLivingSkills) {
            activeGoals.push({ objective: obj.independentLivingSkills, type: 'Life Skills' });
          }
          if (obj.emotionalRegulationStrategies) {
            activeGoals.push({ objective: obj.emotionalRegulationStrategies, type: 'Emotional' });
          }
          
          if (activeGoals.length > 0) {
            setGoals(activeGoals.slice(0, 3));
            return;
          }
        }
        
        // Fallback to youth.treatmentGoals if no success plan goals found
        if (youth.treatmentGoals) {
          const fallbackGoals = youth.treatmentGoals
            .split(/[\n,]+/)
            .map(g => g.trim())
            .filter(g => g.length > 0)
            .map(g => ({ objective: g, type: 'General' }));
            
          setGoals(fallbackGoals.slice(0, 3));
        } else {
          setGoals([]);
        }
      } catch (error) {
        console.error("Error fetching success plan goals:", error);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };

    if (youth) {
      loadGoals();
    }
  }, [youth?.id, youth?.treatmentGoals]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Top Success Plan Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-10 bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Top Success Plan Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 italic">No active goals found in Success Plan.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-100 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
          <Target className="h-4 w-4" />
          Top Success Plan Goals
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {goals.map((goal, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-800 line-clamp-2" title={goal.objective}>
                  {goal.objective || 'Unnamed Goal'}
                </span>
                <span className="text-xs text-gray-500 mt-0.5">
                  {goal.type} Goal
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
