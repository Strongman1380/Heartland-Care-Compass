
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { 
  LEVELS_DATA, 
  getCurrentLevel, 
  getNextLevel, 
  canLevelUp, 
  meetsPrivilegeRequirement,
  processLevelUp,
  processLevelDemotion 
} from "@/utils/levelSystem";

interface EnhancedBehaviorCardProps {
  youthId: string;
  initialLevel?: number;
  initialPoints?: number;
  initialSubsystem?: boolean;
}

export const EnhancedBehaviorCard = ({ 
  youthId, 
  initialLevel = 0, 
  initialPoints = 0, 
  initialSubsystem = false 
}: EnhancedBehaviorCardProps) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyPoints, setDailyPoints] = useState(0);
  const [comments, setComments] = useState("");
  const [currentLevelIndex, setCurrentLevelIndex] = useState(initialLevel);
  const [pointsInCurrentLevel, setPointsInCurrentLevel] = useState(initialPoints);
  const [onSubsystem, setOnSubsystem] = useState(initialSubsystem);
  const [isLoading, setIsLoading] = useState(false);

  const currentLevel = getCurrentLevel(currentLevelIndex);
  const nextLevel = getNextLevel(currentLevelIndex);
  const hasPrivileges = meetsPrivilegeRequirement(currentLevelIndex, dailyPoints);
  const canAdvance = canLevelUp(currentLevelIndex, pointsInCurrentLevel);
  const progressPercentage = Math.min((pointsInCurrentLevel / currentLevel.cumulativePointsRequired) * 100, 100);

  const handleSaveBehaviorCard = async () => {
    if (dailyPoints < 0 || dailyPoints > 105) {
      toast.error("Daily points must be between 0 and 105");
      return;
    }

    setIsLoading(true);
    try {
      // Add daily points to current level total
      const newPointsTotal = pointsInCurrentLevel + dailyPoints;
      setPointsInCurrentLevel(newPointsTotal);

      // Save behavior entry (you can implement actual saving to Supabase here)
      console.log("Saving behavior entry:", {
        youthId,
        date,
        dailyPoints,
        comments,
        hasPrivileges,
        newPointsTotal
      });

      toast.success("Behavior card saved successfully!");
      
      // Reset form
      setDailyPoints(0);
      setComments("");
    } catch (error) {
      console.error("Error saving behavior card:", error);
      toast.error("Failed to save behavior card");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelUp = async () => {
    const result = processLevelUp(currentLevelIndex, pointsInCurrentLevel);
    if (result) {
      try {
        // Update level in database
        const { error } = await supabase
          .from("youths")
          .update({ level: result.newLevelIndex })
          .eq("id", youthId);

        if (error) throw error;

        setCurrentLevelIndex(result.newLevelIndex);
        setPointsInCurrentLevel(result.pointsInNewLevel);
        
        const newLevel = getCurrentLevel(result.newLevelIndex);
        toast.success(`Congratulations! Advanced to ${newLevel.name}!`);
      } catch (error) {
        console.error("Error updating level:", error);
        toast.error("Failed to update level in database");
      }
    }
  };

  const handleLevelDemotion = async () => {
    const result = processLevelDemotion(currentLevelIndex);
    if (result) {
      try {
        // Update level in database
        const { error } = await supabase
          .from("youths")
          .update({ level: result.newLevelIndex })
          .eq("id", youthId);

        if (error) throw error;

        setCurrentLevelIndex(result.newLevelIndex);
        setPointsInCurrentLevel(result.pointsInNewLevel);
        
        const newLevel = getCurrentLevel(result.newLevelIndex);
        toast.error(`Demoted to ${newLevel.name}`);
      } catch (error) {
        console.error("Error updating level:", error);
        toast.error("Failed to update level in database");
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Behavior Card */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Behavior Card</CardTitle>
                <CardDescription>Record daily points and track progress</CardDescription>
              </div>
              {onSubsystem && (
                <Badge variant="destructive">Subsystem</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date Input */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="daily-points">Daily Points Earned (0-105)</Label>
                <Input
                  id="daily-points"
                  type="number"
                  min="0"
                  max="105"
                  value={dailyPoints}
                  onChange={(e) => setDailyPoints(Number(e.target.value))}
                />
              </div>
            </div>

            {/* Points Summary */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span>Total Daily Points:</span>
                <span className="font-semibold">{dailyPoints}/105</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Points in Current Level:</span>
                <span className="font-semibold">
                  {pointsInCurrentLevel} / {currentLevel.cumulativePointsRequired}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Required daily points for privileges:</span>
                <span className={`font-semibold ${hasPrivileges ? 'text-green-600' : 'text-red-600'}`}>
                  {currentLevel.dailyPointsForPrivileges}
                </span>
              </div>
            </div>

            {/* Privilege Warning */}
            {!hasPrivileges && dailyPoints > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Below Level Requirement: Current daily points are below the minimum required for privileges.
                </AlertDescription>
              </Alert>
            )}

            {/* Level Controls */}
            <div className="flex gap-2">
              <Button
                onClick={handleLevelUp}
                disabled={!canAdvance}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Level Up
              </Button>
              <Button
                onClick={handleLevelDemotion}
                disabled={currentLevelIndex === 0}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <TrendingDown className="h-4 w-4" />
                Level Demotion
              </Button>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add notes about behavior, concerns, or achievements..."
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={4}
              />
            </div>

            {/* Subsystem Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="subsystem"
                checked={onSubsystem}
                onCheckedChange={(checked) => setOnSubsystem(checked === true)}
              />
              <Label htmlFor="subsystem">On Subsystem</Label>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveBehaviorCard} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Saving..." : "Save Behavior Card"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Level Information Panel */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Level Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Current Level:</span>
                <Badge variant="outline">{currentLevel.name}</Badge>
              </div>
              {nextLevel && (
                <div className="flex justify-between items-center">
                  <span>Next Level:</span>
                  <Badge variant="secondary">{nextLevel.name}</Badge>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span>Daily Privilege Requirement:</span>
                <span className="font-semibold">{currentLevel.dailyPointsForPrivileges}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to Next Level</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
            </div>

            {/* Level Up Eligibility */}
            {canAdvance && (
              <Alert className="border-green-200 bg-green-50">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Ready to level up! You have enough points to advance.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
