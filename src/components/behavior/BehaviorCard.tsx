import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Calendar, Download, FileText, TrendingUp, TrendingDown, Users, History } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchBehaviorPoints, saveBehaviorPoints } from "@/utils/supabase-utils";
import { BehaviorPoints } from "@/types/app-types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface BehaviorCardProps {
  youthId: string;
  youth: any;
}

// Level system data - using full thousands for internal calculations
const levelsData = [
  { name: "Orientation", level: 0, cumulativePointsRequired: 120000, dailyPointsForPrivileges: 10000 },
  { name: "Level 1", level: 1, cumulativePointsRequired: 840000, dailyPointsForPrivileges: 20000 },
  { name: "Level 2", level: 2, cumulativePointsRequired: 2000000, dailyPointsForPrivileges: 20000 },
  { name: "Level 3", level: 3, cumulativePointsRequired: 3060000, dailyPointsForPrivileges: 30000 },
  { name: "Level 4", level: 4, cumulativePointsRequired: 4740000, dailyPointsForPrivileges: 40000 },
  { name: "Level 5", level: 5, cumulativePointsRequired: 6840000, dailyPointsForPrivileges: 50000 },
  { name: "Level 6", level: 6, cumulativePointsRequired: 9360000, dailyPointsForPrivileges: 60000 },
  { name: "Level 7", level: 7, cumulativePointsRequired: 12300000, dailyPointsForPrivileges: 70000 },
  { name: "Level 8", level: 8, cumulativePointsRequired: 15660000, dailyPointsForPrivileges: 80000 },
  { name: "Level 9", level: 9, cumulativePointsRequired: 19440000, dailyPointsForPrivileges: 90000 },
  { name: "Level 10", level: 10, cumulativePointsRequired: Infinity, dailyPointsForPrivileges: Infinity }
];

const MAX_DAILY_POINTS = 105000;

interface SubsystemHistoryEntry {
  status: 'on' | 'off';
  date: string;
  recordedBy: string;
}

export const BehaviorCard = ({ youthId, youth }: BehaviorCardProps) => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pointEntries, setPointEntries] = useState<BehaviorPoints[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    dailyPoints: 0, // This will now be in thousands (e.g., 15000)
    comments: "",
    onSubsystem: false,
  });
  const [pointsError, setPointsError] = useState("");
  // Removed weekly average display from Level Information
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [subsystemHistory, setSubsystemHistory] = useState<SubsystemHistoryEntry[]>([
    { status: 'off', date: new Date().toLocaleString(), recordedBy: 'System' }
  ]);
  const [showSubsystemLog, setShowSubsystemLog] = useState(false);

  // Handle case where youth is null or undefined
  if (!youth) {
    return (
      <div className="space-y-6">
        <Card className="border-2 border-yellow-300">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Users className="h-16 w-16 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-800">No Youth Selected</CardTitle>
            <CardDescription className="text-red-600 text-lg">
              Please select a youth from the system to record behavior points.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-red-700 mb-4">
              Use the "Add Youth" button in the header to create a new youth profile, 
              or select an existing youth to begin tracking their daily points.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current level data
  const getCurrentLevel = () => {
    return levelsData.find(level => level.level === youth.level) || levelsData[0];
  };

  const getNextLevel = () => {
    const nextLevelIndex = youth.level + 1;
    return levelsData.find(level => level.level === nextLevelIndex);
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();

  // Format points for display (with commas)
  const formatPoints = (points: number) => {
    if (points === Infinity) return "N/A";
    return points.toLocaleString();
  };

  // Validate points input
  const validatePointsInput = (value: string): string => {
    const points = parseInt(value.trim(), 10);
    
    if (isNaN(points) || value.trim() === '') {
      return "Please enter a valid number for daily points.";
    }
    
    if (points < 0) {
      return "Points cannot be negative. Please enter 0 or a positive value in thousands. 😊";
    }
    
    if (points > 0) {
      if (points < 1000) {
        return `Positive points must be 1000 or more. Did you mean ${points * 1000}? Please use multiples of 1000. 👍`;
      }
      if (points % 1000 !== 0) {
        return "Points must be in multiples of 1,000 (e.g., 1000, 25000). Please adjust your entry. ✨";
      }
    }
    
    if (points > MAX_DAILY_POINTS) {
      return `Points cannot exceed ${formatPoints(MAX_DAILY_POINTS)}. Please check your entry. 🤔`;
    }
    
    return "";
  };

  useEffect(() => {
    if (youthId) {
      fetchPointEntries();
      setFormData(prev => ({ ...prev, onSubsystem: youth.onSubsystem || false }));
    }
  }, [youthId, youth]);

  const fetchPointEntries = async () => {
    try {
      setIsLoading(true);
      const entries = await fetchBehaviorPoints(youthId);
      setPointEntries(entries);
    } catch (error) {
      console.error("Error fetching point entries:", error);
      toast.error("Failed to load behavior cards");
    } finally {
      setIsLoading(false);
    }
  };

  // Weekly averages removed

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "dailyPoints") {
      const numValue = parseInt(value) || 0;
      setFormData(prev => ({ ...prev, [name]: numValue }));
      
      // Clear previous error and validate
      setPointsError("");
      if (value.trim()) {
        const error = validatePointsInput(value);
        setPointsError(error);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubsystemChange = (checked: boolean) => {
    const newStatusText = checked ? 'ON' : 'OFF';
    const confirmationMessage = `You are about to change ${youth.firstName} ${youth.lastName}'s subsystem status to '${newStatusText}' as of ${new Date().toLocaleString()}. This will be recorded. Proceed?`;
    
    if (confirm(confirmationMessage)) {
      setFormData(prev => ({ ...prev, onSubsystem: checked }));
      
      const historyEntry: SubsystemHistoryEntry = {
        status: checked ? 'on' : 'off',
        date: new Date().toLocaleString(),
        recordedBy: 'System User'
      };
      
      setSubsystemHistory(prev => [...prev, historyEntry]);
      
      toast.success(`Subsystem status for ${youth.firstName} ${youth.lastName} changed to ${newStatusText} and recorded.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate points before submission
    const error = validatePointsInput(formData.dailyPoints.toString());
    if (error) {
      setPointsError(error);
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const pointEntry = {
        youth_id: youthId,
        date: selectedDate,
        morningPoints: 0,
        afternoonPoints: 0,
        eveningPoints: 0,
        totalPoints: formData.dailyPoints, // Direct thousands input
        comments: formData.comments,
      };
      
      await saveBehaviorPoints(youthId, pointEntry);
      
      // Update youth's total points - add the daily points directly (already in thousands)
      const currentTotal = youth.pointtotal || 0;
      const newTotal = currentTotal + formData.dailyPoints;
      const { error: updateError } = await supabase
        .from("youths")
        .update({ pointtotal: newTotal })
        .eq("id", youthId);
        
      if (!updateError) {
        youth.pointtotal = newTotal; // Update local state
        console.log(`Updated youth total points: ${currentTotal} + ${formData.dailyPoints} = ${newTotal}`);
      } else {
        console.error("Error updating youth total:", updateError);
      }
      
      // Check if points meet privilege requirement
      if (formData.dailyPoints >= currentLevel.dailyPointsForPrivileges) {
        toast.success(`Great job! ${formatPoints(formData.dailyPoints)} points saved successfully. Privileges earned for tomorrow. 🎉`);
      } else {
        toast.warning(`Points saved (${formatPoints(formData.dailyPoints)}), but below privilege requirement of ${formatPoints(currentLevel.dailyPointsForPrivileges)} points.`);
      }
      
      // Reset form
      setFormData({
        dailyPoints: 0,
        comments: "",
        onSubsystem: formData.onSubsystem,
      });
      setPointsError("");
      
      fetchPointEntries();
    } catch (error) {
      console.error("Error saving behavior card:", error);
      toast.error("Oops! Something went wrong saving your points. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLevelUp = async () => {
    if (nextLevel) {
      try {
        // Update youth level and reset points
        const { error } = await supabase
          .from("youths")
          .update({ 
            level: youth.level + 1,
            pointtotal: 0  // Reset points to 0 when leveling up
          })
          .eq("id", youthId);

        if (error) throw error;

        toast.success(`Congratulations! Advanced to ${nextLevel.name}! Points reset to 0.`);
        
        // Update the local youth object to reflect the changes
        youth.level = youth.level + 1;
        youth.pointtotal = 0;
        
        // Force component re-render by updating form data
        setFormData(prev => ({ ...prev, dailyPoints: 0 }));
      } catch (error) {
        console.error("Error updating level:", error);
        toast.error("Failed to update level");
      }
    }
  };

  const handleLevelDemotion = async () => {
    if (youth.level > 1) {
      try {
        // Update youth level and reset points
        const { error } = await supabase
          .from("youths")
          .update({ 
            level: youth.level - 1,
            pointtotal: 0  // Reset points to 0 when demoting
          })
          .eq("id", youthId);

        if (error) throw error;

        const previousLevel = levelsData.find(level => level.level === youth.level - 1);
        toast.warning(`Demoted to ${previousLevel?.name || `Level ${youth.level - 1}`}. Points reset to 0.`);
        
        // Update the local youth object to reflect the changes
        youth.level = youth.level - 1;
        youth.pointtotal = 0;
        
        // Force component re-render by updating form data
        setFormData(prev => ({ ...prev, dailyPoints: 0 }));
      } catch (error) {
        console.error("Error updating level:", error);
        toast.error("Failed to update level");
      }
    }
  };

  const handlePrintCard = () => {
    window.print();
  };

  const getPointsByDate = (dateString: string) => {
    const entry = pointEntries.find(entry => format(entry.date as Date, 'yyyy-MM-dd') === dateString);
    return entry ? entry.totalPoints : 0;
  };

  // Chart data for the weekly view
  const generateChartData = () => {
    const start = startOfWeek(new Date(), { weekStartsOn: 0 });
    const end = endOfWeek(new Date(), { weekStartsOn: 0 });
    
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dateString = format(day, 'yyyy-MM-dd');
      const points = getPointsByDate(dateString);
      
      return {
        day: format(day, 'EEE'),
        fullDate: format(day, 'MMM d'),
        points,
        threshold: currentLevel.dailyPointsForPrivileges,
      };
    });
  };

  // Load a sample week of data (points, ratings, notes) for demo purposes
  const [loadingSample, setLoadingSample] = useState(false);
  const loadSampleWeek = async () => {
    try {
      setLoadingSample(true);
      const start = startOfWeek(new Date(), { weekStartsOn: 0 });
      const end = endOfWeek(new Date(), { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start, end });

      const samplePoints = [20000, 35000, 45000, 30000, 50000, 25000, 40000];
      const sampleRatings = [
        { peer: 3, adult: 3, invest: 3, auth: 3 },
        { peer: 4, adult: 3, invest: 3, auth: 3 },
        { peer: 4, adult: 4, invest: 4, auth: 4 },
        { peer: 3, adult: 3, invest: 4, auth: 3 },
        { peer: 5, adult: 4, invest: 4, auth: 4 },
        { peer: 3, adult: 3, invest: 3, auth: 3 },
        { peer: 4, adult: 4, invest: 4, auth: 4 },
      ];
      const sampleComments = [
        "Participated in group session respectfully.",
        "Needed one redirect during chores.",
        "Helped peer with activity; positive attitude.",
        "Minor conflict resolved with staff support.",
        "Excellent effort in schoolwork today.",
        "Quiet day; followed directions.",
        "Strong participation and respect for authority.",
      ];

      const pointsRows = days.map((d, i) => ({
        youth_id: youthId,
        date: format(d, 'yyyy-MM-dd'),
        morningpoints: 0,
        afternoonpoints: 0,
        eveningpoints: 0,
        totalpoints: samplePoints[i],
        comments: sampleComments[i],
        createdat: new Date().toISOString(),
      }));

      const ratingsRows = days.map((d, i) => ({
        youth_id: youthId,
        date: format(d, 'yyyy-MM-dd'),
        peer_interaction: sampleRatings[i].peer,
        adult_interaction: sampleRatings[i].adult,
        investment_level: sampleRatings[i].invest,
        deal_authority: sampleRatings[i].auth,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        staff: 'Demo',
        comments: sampleComments[i],
      }));

      const notesRows = [0,2,4,6].map((idx) => ({
        youth_id: youthId,
        date: format(days[idx], 'yyyy-MM-dd'),
        category: idx % 4 === 0 ? 'Counseling' : 'Group',
        note: sampleComments[idx],
        rating: 4,
        staff: 'Demo',
        createdat: new Date().toISOString(),
      }));

      const [pIns, rIns, nIns] = await Promise.all([
        supabase.from('points').insert(pointsRows),
        supabase.from('daily_ratings').insert(ratingsRows),
        supabase.from('notes').insert(notesRows),
      ]);

      if (pIns.error) throw pIns.error;
      if (rIns.error) throw rIns.error;
      if (nIns.error) throw nIns.error;

      toast.success('Sample week data loaded.');
      fetchPointEntries();
    } catch (e) {
      console.error('Error loading sample data', e);
      toast.error('Failed to load sample data');
    } finally {
      setLoadingSample(false);
    }
  };

  const isEligibleForLevelUp = () => {
    // Points are already stored in thousands in the database
    const youthTotal = youth.pointtotal || 0;
    return youthTotal >= currentLevel.cumulativePointsRequired;
  };

  const renderSubsystemLog = () => {
    return (
      <Dialog open={showSubsystemLog} onOpenChange={setShowSubsystemLog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History size={16} className="mr-2" />
            Subsystem Log
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subsystem Change Log</DialogTitle>
            <DialogDescription>
              Review the history of subsystem status changes for {youth.firstName} {youth.lastName}.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {subsystemHistory.length > 0 ? (
              <ul className="space-y-2">
                {[...subsystemHistory].reverse().map((entry, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                    <span className={`font-medium ${entry.status === 'on' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">
                      {entry.date} - by {entry.recordedBy}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-center">No subsystem changes recorded yet.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const getLastSubsystemChange = () => {
    if (subsystemHistory.length === 0) return "(No subsystem history)";
    const lastEntry = subsystemHistory[subsystemHistory.length - 1];
    const statusText = lastEntry.status === 'on' ? 'On Subsystem' : 'Off Subsystem';
    const datePart = lastEntry.date.split(',')[0];
    return `(${statusText} since ${datePart})`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Behavior Point System</h2>
          <p className="text-gray-600 mb-4">Record daily behavior points and track progress over time.</p>
        </div>
        
        <div className="flex space-x-2 mb-4 sm:mb-0">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileText size={16} className="mr-2" />
            Print Card
          </Button>
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export Data
          </Button>
          {renderSubsystemLog()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader className="bg-blue-50">
            <CardTitle>Level Information</CardTitle>
            <CardDescription>Current status and requirements</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-500">Current Level</Label>
                <p className="text-2xl font-bold">
                  {currentLevel.name}
                  {formData.onSubsystem && <span className="text-sm text-orange-600 ml-2">(Subsystem)</span>}
                </p>
                <p className="text-xs text-gray-500 mt-1">{getLastSubsystemChange()}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Required Daily Points for Privileges</Label>
                <p className="text-lg font-semibold">{formatPoints(currentLevel.dailyPointsForPrivileges)} points</p>
              </div>
              
              {nextLevel && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Points for Next Level</Label>
                  <p className="text-lg font-semibold">
                    {formatPoints(youth.pointtotal || 0)} / {formatPoints(currentLevel.cumulativePointsRequired)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isEligibleForLevelUp() ? 'bg-green-500 animate-pulse' : 'bg-blue-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, ((youth.pointtotal || 0) / currentLevel.cumulativePointsRequired) * 100)}%` 
                      }}
                    ></div>
                  </div>
                  {isEligibleForLevelUp() && (
                    <p className="text-xs text-green-600 font-medium mt-1 animate-pulse">
                      🎉 Ready to level up!
                    </p>
                  )}
                </div>
              )}
              
              {/* Weekly Average removed from Level Information */}

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={handleLevelUp}
                  disabled={!nextLevel}
                  className={`flex-1 ${isEligibleForLevelUp() && nextLevel ? 'bg-green-600 hover:bg-green-700 text-white animate-pulse' : ''}`}
                >
                  <TrendingUp size={14} className="mr-1" />
                  Level Up
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleLevelDemotion}
                  disabled={youth.level <= 1}
                  className="flex-1"
                >
                  <TrendingDown size={14} className="mr-1" />
                  Demote
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2">
          <Tabs defaultValue="daily" onValueChange={setActiveTab}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Behavior Card</CardTitle>
                <TabsList>
                  <TabsTrigger value="daily">Daily Entry</TabsTrigger>
                  <TabsTrigger value="weekly">Weekly View</TabsTrigger>
                </TabsList>
              </div>
              <CardDescription>
                {activeTab === "daily" 
                  ? "Record points earned for the day" 
                  : "View point trends over the past week"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TabsContent value="daily" className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={format(selectedDate, 'yyyy-MM-dd')}
                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                        className="max-w-xs"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="dailyPoints">Daily Points Earned (e.g., 1000, 15000, up to 105000)</Label>
                      <Input
                        id="dailyPoints"
                        name="dailyPoints"
                        type="number"
                        placeholder="Enter points in thousands"
                        value={formData.dailyPoints || ''}
                        onChange={handleInputChange}
                        className="max-w-xs"
                      />
                      {pointsError && (
                        <p className="text-red-500 text-sm mt-1 font-medium">{pointsError}</p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="totalPoints">Total Daily Points</Label>
                        <span className="text-xl font-bold">
                          {formatPoints(formData.dailyPoints)} / {formatPoints(MAX_DAILY_POINTS)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full ${
                            formData.dailyPoints >= currentLevel.dailyPointsForPrivileges 
                              ? "bg-green-500" 
                              : "bg-red-500"
                          }`}
                          style={{ 
                            width: `${Math.min(100, (formData.dailyPoints / MAX_DAILY_POINTS) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        Required for privileges: {formatPoints(currentLevel.dailyPointsForPrivileges)} points
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="comments">Comments</Label>
                      <Textarea
                        id="comments"
                        name="comments"
                        placeholder="Add notes about behavior, concerns, or achievements..."
                        value={formData.comments}
                        onChange={handleInputChange}
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="subsystem"
                        checked={formData.onSubsystem}
                        onCheckedChange={handleSubsystemChange}
                      />
                      <Label htmlFor="subsystem" className="text-sm font-medium">
                        On Subsystem
                      </Label>
                    </div>
                    
                    {formData.dailyPoints < currentLevel.dailyPointsForPrivileges && formData.dailyPoints > 0 && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Below Privilege Requirement</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          Current points ({formatPoints(formData.dailyPoints)}) are below the minimum required for privileges ({formatPoints(currentLevel.dailyPointsForPrivileges)} points). 
                          This may affect tomorrow's privileges.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button type="submit" disabled={isSubmitting || !!pointsError} className="w-full">
                      {isSubmitting ? "Saving..." : "Save Behavior Card"}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="weekly">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                      <p className="font-medium">Current Week: {format(startOfWeek(new Date()), 'MMM d')} - {format(endOfWeek(new Date()), 'MMM d, yyyy')}</p>
                      
                      <div className="flex items-center mt-2 sm:mt-0 gap-2">
                        <Calendar size={16} className="mr-1.5 text-gray-500" />
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          View Previous Weeks
                        </Button>
                        {pointEntries.length === 0 && (
                          <Button size="sm" className="h-8 px-2 text-xs" onClick={loadSampleWeek} disabled={loadingSample}>
                            {loadingSample ? 'Loading…' : 'Load Demo Week'}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: 250 }}>
                      <ResponsiveContainer>
                        <LineChart data={generateChartData()}>
                          <XAxis dataKey="day" />
                          <YAxis domain={[0, MAX_DAILY_POINTS]} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip formatter={(value) => [`${formatPoints(Number(value))} points`, 'Points']} />
                          <Line 
                            type="monotone" 
                            dataKey="points" 
                            stroke="#0066CC" 
                            strokeWidth={2} 
                            dot={{ r: 4 }} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="threshold" 
                            stroke="#FF6B6B" 
                            strokeWidth={2} 
                            strokeDasharray="5 5" 
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="flex items-center justify-center space-x-6 mt-2">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
                        <span className="text-sm">Daily Points</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                        <span className="text-sm">Privilege Threshold</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Recent Point History</h3>
                    <div className="space-y-2">
                      {isLoading ? (
                        <p className="text-gray-500 text-center">Loading point history...</p>
                      ) : pointEntries.length > 0 ? (
                        pointEntries.slice(0, 5).map((entry, index) => (
                          <div key={entry.id || index} className="flex items-center justify-between p-3 bg-white border rounded-md">
                            <div>
                              <p className="font-medium">{format(entry.date as Date, 'MMM d, yyyy')}</p>
                              <p className="text-sm text-gray-500">
                                Points: {formatPoints(entry.totalPoints)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${entry.totalPoints >= currentLevel.dailyPointsForPrivileges ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPoints(entry.totalPoints)}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center">No point history available</p>
                      )}
                    </div>
                    
                    {pointEntries.length > 5 && (
                      <Button variant="ghost" size="sm" className="mt-2 w-full">
                        View All Point History
                        <ArrowRight size={14} className="ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};
