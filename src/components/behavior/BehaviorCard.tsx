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
import { useBehaviorPoints, useYouth } from "@/hooks/useSupabase";
import { type BehaviorPoints } from "@/integrations/supabase/services";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { calculatePointsNeededForNextLevel, syncYouthTotalPoints } from "@/utils/pointCalculations";
import { syncYouthPoints } from "@/utils/pointSyncService";
import { alertService } from "@/utils/alertService";

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
  const [isLoading, setIsLoading] = useState(true);
  
  // Use Supabase hooks
  const { behaviorPoints: pointEntries, saveBehaviorPoints, loadBehaviorPoints } = useBehaviorPoints(youthId);
  const { updateYouth } = useYouth();
  const [formData, setFormData] = useState({
    dailyPoints: 0, // This will now be in thousands (e.g., 15000)
    comments: "",
    onSubsystem: false,
    staffName: "",
    peerInteraction: 0,
    adultInteraction: 0,
    investmentLevel: 0,
    dealAuthority: 0,
    peerInteractionComment: "",
    adultInteractionComment: "",
    investmentLevelComment: "",
    dealAuthorityComment: "",
  });
  const [pointsError, setPointsError] = useState("");
  const [weeklyAverages, setWeeklyAverages] = useState({
    averagePointsPerDay: 0,
    totalPointsThisWeek: 0,
    daysRecorded: 0,
  });
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
      loadBehaviorPoints(youthId);
      setFormData(prev => ({ ...prev, onSubsystem: youth.onSubsystem || false }));
    }
  }, [youthId, youth]);

  useEffect(() => {
    if (pointEntries.length > 0) {
      calculateWeeklyAverages(pointEntries);
      setIsLoading(false);
    }
  }, [pointEntries]);

  const calculateWeeklyAverages = (entries: BehaviorPoints[]) => {
    const startOfCurrentWeek = startOfWeek(new Date());
    const endOfCurrentWeek = endOfWeek(new Date());
    
    const thisWeekEntries = entries.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfCurrentWeek && entryDate <= endOfCurrentWeek;
    });
    
    const totalPoints = thisWeekEntries.reduce((sum, entry) => sum + entry.totalPoints, 0);
    const daysRecorded = thisWeekEntries.length;
    const averagePointsPerDay = daysRecorded > 0 ? totalPoints / daysRecorded : 0;
    
    setWeeklyAverages({
      averagePointsPerDay,
      totalPointsThisWeek: totalPoints,
      daysRecorded,
    });
  };

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
        date: format(selectedDate, 'yyyy-MM-dd'),
        morningPoints: 0,
        afternoonPoints: 0,
        eveningPoints: 0,
        totalPoints: formData.dailyPoints, // Direct thousands input
        comments: formData.comments,
      };
      
      await saveBehaviorPoints(pointEntry);
      
      // Update youth's subsystem status if changed
      if (formData.onSubsystem !== youth.onSubsystem) {
        await updateYouth(youthId, { onSubsystem: formData.onSubsystem });
      }
    } catch (error) {
      console.error("Error syncing youth points:", error);
      
      // Fallback to manual update if sync service fails
      const currentTotal = youth.pointTotal || 0;
      const newTotal = currentTotal + formData.dailyPoints;
      updateYouth(youthId, { pointTotal: newTotal });
      youth.pointTotal = newTotal;
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
      staffName: "",
      peerInteraction: 0,
      adultInteraction: 0,
      investmentLevel: 0,
      dealAuthority: 0,
      peerInteractionComment: "",
      adultInteractionComment: "",
      investmentLevelComment: "",
      dealAuthorityComment: "",
    });
    setPointsError("");
    
    loadBehaviorPoints(youthId);
  };

  const handleLevelUp = () => {
    if (nextLevel) {
      try {
        // Update youth level and reset points
        updateYouth(youthId, { 
          level: youth.level + 1,
          pointTotal: 0  // Reset points to 0 when leveling up
        });

        toast.success(`Congratulations! Advanced to ${nextLevel.name}! Points reset to 0.`);
        
        // Update the local youth object to reflect the changes
        youth.level = youth.level + 1;
        youth.pointTotal = 0;
        
        // Force component re-render by updating form data
        setFormData(prev => ({ ...prev, dailyPoints: 0 }));
      } catch (error) {
        console.error("Error updating level:", error);
        toast.error("Failed to update level");
      }
    }
  };

  const handleLevelDemotion = () => {
    if (youth.level > 1) {
      try {
        // Update youth level and reset points
        updateYouth(youthId, { 
          level: youth.level - 1,
          pointTotal: 0  // Reset points to 0 when demoting
        });

        const previousLevel = levelsData.find(level => level.level === youth.level - 1);
        toast.warning(`Demoted to ${previousLevel?.name || `Level ${youth.level - 1}`}. Points reset to 0.`);
        
        // Update the local youth object to reflect the changes
        youth.level = youth.level - 1;
        youth.pointTotal = 0;
        
        // Force component re-render by updating form data
        setFormData(prev => ({ ...prev, dailyPoints: 0 }));
      } catch (error) {
        console.error("Error updating level:", error);
        toast.error("Failed to update level");
      }
    }
  };

  const handlePrintCard = () => {
    generateIndividualizedReport();
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportData = async () => {
    try {
      const entries = pointEntries;
      const csvData = generateCSVData(entries);
      downloadCSV(csvData, `${youth.firstName}_${youth.lastName}_behavior_data.csv`);
      toast.success("Behavior data exported successfully!");
    } catch (error) {
      console.error("Error exporting data:", error);
      toast.error("Failed to export behavior data");
    }
  };

  const generateCSVData = (entries: BehaviorPoints[]) => {
    const headers = ['Date', 'Morning Points', 'Afternoon Points', 'Evening Points', 'Total Points', 'Comments'];
    const rows = entries.map(entry => [
      format(new Date(entry.date), 'yyyy-MM-dd'),
      entry.morningPoints || 0,
      entry.afternoonPoints || 0,
      entry.eveningPoints || 0,
      entry.totalPoints || 0,
      `"${(entry.comments || '').replace(/"/g, '""')}"`
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateIndividualizedReport = () => {
    const reportData = {
      youth: youth,
      currentDate: format(new Date(), 'MMMM dd, yyyy'),
      currentTime: format(new Date(), 'h:mm a'),
      dailyPoints: formData.dailyPoints,
      totalPoints: youth.pointTotal || 0,
      currentLevel: currentLevel,
      weeklyAverages: weeklyAverages,
      recentEntries: pointEntries.slice(-7), // Last 7 entries
      comments: formData.comments,
      onSubsystem: formData.onSubsystem
    };
    
    // Store report data for printing
    (window as any).__behaviorReportData = reportData;
  };

  const getPointsByDate = (dateString: string) => {
    const entry = pointEntries.find(entry => format(new Date(entry.date), 'yyyy-MM-dd') === dateString);
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
          <Button variant="outline" size="sm" onClick={handlePrintCard}>
            <FileText size={16} className="mr-2" />
            Print Card
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
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
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Weekly Average</Label>
                <p className="text-lg font-semibold">
                  {formatPoints(weeklyAverages.averagePointsPerDay)} points
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({weeklyAverages.daysRecorded}/7 days)
                  </span>
                </p>
              </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          name="date"
                          type="date"
                          value={format(selectedDate, 'yyyy-MM-dd')}
                          onChange={(e) => {
                            // Fix timezone issue by creating date in local timezone
                            const dateValue = e.target.value;
                            if (dateValue) {
                              // Parse the date string and create a local date
                              const [year, month, day] = dateValue.split('-').map(Number);
                              const localDate = new Date(year, month - 1, day); // month is 0-indexed
                              setSelectedDate(localDate);
                            }
                          }}
                          className="max-w-xs"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="staffName">Staff Name</Label>
                        <Input
                          id="staffName"
                          name="staffName"
                          type="text"
                          placeholder="Enter staff name"
                          value={formData.staffName || ''}
                          onChange={handleInputChange}
                          className="max-w-xs"
                        />
                      </div>
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
                    
                    {false && (
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
                    )}

                    {/* Peer Interaction and Adult Interaction Ratings */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-primary">Behavioral Ratings</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-primary">Peer Interaction</Label>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setFormData({...formData, peerInteraction: num})}
                                className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                                  formData.peerInteraction === num
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-primary/20 hover:border-primary/40"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          {false && (
                            <div>
                              <Label htmlFor="peerInteractionComment" className="text-xs text-muted-foreground">
                                Peer Interaction Comments
                              </Label>
                              <Textarea
                                id="peerInteractionComment"
                                name="peerInteractionComment"
                                value={formData.peerInteractionComment || ''}
                                onChange={handleInputChange}
                                placeholder="Add notes about peer interaction..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-primary">Adult Interaction</Label>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setFormData({...formData, adultInteraction: num})}
                                className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                                  formData.adultInteraction === num
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-primary/20 hover:border-primary/40"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          {false && (
                            <div>
                              <Label htmlFor="adultInteractionComment" className="text-xs text-muted-foreground">
                                Adult Interaction Comments
                              </Label>
                              <Textarea
                                id="adultInteractionComment"
                                name="adultInteractionComment"
                                value={formData.adultInteractionComment || ''}
                                onChange={handleInputChange}
                                placeholder="Add notes about adult interaction..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Investment Level and Deal Authority */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-primary">Investment Level</Label>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setFormData({...formData, investmentLevel: num})}
                                className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                                  formData.investmentLevel === num
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-primary/20 hover:border-primary/40"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          {false && (
                            <div>
                              <Label htmlFor="investmentLevelComment" className="text-xs text-muted-foreground">
                                Investment Level Comments
                              </Label>
                              <Textarea
                                id="investmentLevelComment"
                                name="investmentLevelComment"
                                value={formData.investmentLevelComment || ''}
                                onChange={handleInputChange}
                                placeholder="Add notes about investment level..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium text-primary">Deal Authority</Label>
                          <div className="flex gap-2">
                            {[0, 1, 2, 3, 4].map(num => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setFormData({...formData, dealAuthority: num})}
                                className={`w-8 h-8 rounded-full border-2 text-sm font-medium transition-colors ${
                                  formData.dealAuthority === num
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "border-primary/20 hover:border-primary/40"
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                          {false && (
                            <div>
                              <Label htmlFor="dealAuthorityComment" className="text-xs text-muted-foreground">
                                Deal Authority Comments
                              </Label>
                              <Textarea
                                id="dealAuthorityComment"
                                name="dealAuthorityComment"
                                value={formData.dealAuthorityComment || ''}
                                onChange={handleInputChange}
                                placeholder="Add notes about dealing with authority..."
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      <Button type="submit" disabled={isSubmitting || !!pointsError} className="w-full">
                        {isSubmitting ? "Saving..." : "Submit Daily Points"}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="weekly">
                <div className="space-y-4">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                      <p className="font-medium">Current Week: {format(startOfWeek(new Date()), 'MMM d')} - {format(endOfWeek(new Date()), 'MMM d, yyyy')}</p>
                      
                      <div className="flex items-center mt-2 sm:mt-0">
                        <Calendar size={16} className="mr-1.5 text-gray-500" />
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                          View Previous Weeks
                        </Button>
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
                              <p className="font-medium">{format(new Date(entry.date), 'MMM d, yyyy')}</p>
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

      {/* Print-only individualized report section */}
      <div className="print-only" style={{ display: 'none' }}>
        <div className="print-report">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Heartland Care Compass</h1>
            <h2 className="text-xl">Daily Behavior Report</h2>
            <p className="text-gray-600">Generated on {format(new Date(), 'MMMM dd, yyyy')} at {format(new Date(), 'h:mm a')}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-bold text-lg mb-2">Youth Information</h3>
              <p><strong>Name:</strong> {youth.firstName} {youth.lastName}</p>
              <p><strong>Current Level:</strong> {currentLevel.name}</p>
              <p><strong>Total Points:</strong> {formatPoints(youth.pointTotal || 0)}</p>
              <p><strong>Subsystem Status:</strong> {formData.onSubsystem ? 'ON' : 'OFF'}</p>
            </div>
            
            <div>
              <h3 className="font-bold text-lg mb-2">Today's Performance</h3>
              <p><strong>Date:</strong> {format(selectedDate, 'MMMM dd, yyyy')}</p>
              <p><strong>Points Earned:</strong> {formatPoints(formData.dailyPoints)}</p>
              <p><strong>Privilege Threshold:</strong> {formatPoints(currentLevel.dailyPointsForPrivileges)}</p>
              <p><strong>Status:</strong> {formData.dailyPoints >= currentLevel.dailyPointsForPrivileges ? 
                <span className="text-green-600 font-bold">Privileges Earned ✓</span> : 
                <span className="text-red-600 font-bold">Below Threshold</span>}
              </p>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Weekly Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p><strong>Days Recorded:</strong> {weeklyAverages.daysRecorded}</p>
              </div>
              <div>
                <p><strong>Weekly Total:</strong> {formatPoints(weeklyAverages.totalPointsThisWeek)}</p>
              </div>
              <div>
                <p><strong>Daily Average:</strong> {formatPoints(Math.round(weeklyAverages.averagePointsPerDay))}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">Recent Point History (Last 7 Days)</h3>
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Date</th>
                  <th className="border border-gray-300 p-2 text-left">Points Earned</th>
                  <th className="border border-gray-300 p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {pointEntries.slice(-7).map((entry, index) => (
                  <tr key={entry.id || index}>
                    <td className="border border-gray-300 p-2">{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                    <td className="border border-gray-300 p-2">{formatPoints(entry.totalPoints)}</td>
                    <td className="border border-gray-300 p-2">
                      {entry.totalPoints >= currentLevel.dailyPointsForPrivileges ? 
                        <span className="text-green-600">✓ Privileges</span> : 
                        <span className="text-red-600">Below Threshold</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {formData.comments && (
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2">Comments</h3>
              <p className="border border-gray-300 p-3 rounded">{formData.comments}</p>
            </div>
          )}
          
          <div className="mt-8 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p><strong>Staff Signature:</strong> _________________________</p>
                <p className="text-sm text-gray-600 mt-1">Date: _______________</p>
              </div>
              <div>
                <p><strong>Supervisor Review:</strong> _________________________</p>
                <p className="text-sm text-gray-600 mt-1">Date: _______________</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
