
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
import { AlertCircle, ArrowRight, Calendar, Download, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchBehaviorPoints, saveBehaviorPoints } from "@/utils/supabase-utils";
import { BehaviorPoints } from "@/types/app-types";

interface BehaviorCardProps {
  youthId: string;
  youth: any;
}

// Level system data - dividing table values by 1000 for actual functional points
const levelsData = [
  { name: "Orientation", level: 0, cumulativePointsRequired: 120, dailyPointsForPrivileges: 10 }, // 120,000/1000, 10,000/1000
  { name: "Level 1", level: 1, cumulativePointsRequired: 840, dailyPointsForPrivileges: 20 }, // 840,000/1000, 20,000/1000
  { name: "Level 2", level: 2, cumulativePointsRequired: 2000, dailyPointsForPrivileges: 20 }, // 2,000,000/1000, 20,000/1000
  { name: "Level 3", level: 3, cumulativePointsRequired: 3060, dailyPointsForPrivileges: 30 }, // 3,060,000/1000, 30,000/1000
  { name: "Level 4", level: 4, cumulativePointsRequired: 4740, dailyPointsForPrivileges: 40 }, // 4,740,000/1000, 40,000/1000
  { name: "Level 5", level: 5, cumulativePointsRequired: 6840, dailyPointsForPrivileges: 50 }, // 6,840,000/1000, 50,000/1000
  { name: "Level 6", level: 6, cumulativePointsRequired: 9360, dailyPointsForPrivileges: 60 }, // 9,360,000/1000, 60,000/1000
  { name: "Level 7", level: 7, cumulativePointsRequired: 12300, dailyPointsForPrivileges: 70 }, // 12,300,000/1000, 70,000/1000
  { name: "Level 8", level: 8, cumulativePointsRequired: 15660, dailyPointsForPrivileges: 80 }, // 15,660,000/1000, 80,000/1000
  { name: "Level 9", level: 9, cumulativePointsRequired: 19440, dailyPointsForPrivileges: 90 }, // 19,440,000/1000, 90,000/1000
  { name: "Level 10", level: 10, cumulativePointsRequired: Infinity, dailyPointsForPrivileges: Infinity } // Final level
];

export const BehaviorCard = ({ youthId, youth }: BehaviorCardProps) => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pointEntries, setPointEntries] = useState<BehaviorPoints[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    dailyPoints: 0, // Single field for daily points (0-105)
    comments: "",
    onSubsystem: false,
  });
  const [weeklyAverages, setWeeklyAverages] = useState({
    averagePointsPerDay: 0,
    totalPointsThisWeek: 0,
    daysRecorded: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchPointEntries();
  }, [youthId]);

  const fetchPointEntries = async () => {
    try {
      setIsLoading(true);
      const entries = await fetchBehaviorPoints(youthId);
      setPointEntries(entries);
      calculateWeeklyAverages(entries);
    } catch (error) {
      console.error("Error fetching point entries:", error);
      toast.error("Failed to load behavior cards");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyAverages = (entries: BehaviorPoints[]) => {
    const startOfCurrentWeek = startOfWeek(new Date());
    const endOfCurrentWeek = endOfWeek(new Date());
    
    const thisWeekEntries = entries.filter(entry => {
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date);
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
      // Ensure points are between 0 and 105
      const clampedValue = Math.max(0, Math.min(105, numValue));
      setFormData(prev => ({ ...prev, [name]: clampedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubsystemChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, onSubsystem: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const pointEntry = {
        youth_id: youthId,
        date: selectedDate,
        morningPoints: 0, // Keep for compatibility but not used
        afternoonPoints: 0, // Keep for compatibility but not used  
        eveningPoints: 0, // Keep for compatibility but not used
        totalPoints: formData.dailyPoints,
        comments: formData.comments,
      };
      
      await saveBehaviorPoints(youthId, pointEntry);
      
      // Check if points meet privilege requirement
      if (formData.dailyPoints >= currentLevel.dailyPointsForPrivileges) {
        toast.success(`Great job! Points saved successfully. Privileges earned for tomorrow.`);
      } else {
        toast.warning(`Points saved, but below privilege requirement of ${currentLevel.dailyPointsForPrivileges} points.`);
      }
      
      // Reset form
      setFormData({
        dailyPoints: 0,
        comments: "",
        onSubsystem: formData.onSubsystem, // Keep subsystem status
      });
      
      fetchPointEntries();
    } catch (error) {
      console.error("Error saving behavior card:", error);
      toast.error("Oops! Something went wrong saving your points. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLevelUp = () => {
    // This would trigger level up logic
    toast.success(`Congratulations! Ready to advance to ${nextLevel?.name || 'next level'}!`);
  };

  const handleLevelDemotion = () => {
    // This would trigger level demotion logic
    toast.warning("Level demotion recorded. Points for current level reset to 0.");
  };

  const handlePrintCard = () => {
    window.print();
  };

  const getPointsByDate = (dateString: string) => {
    const entry = pointEntries.find(entry => format(entry.date as Date, 'yyyy-MM-dd') === dateString);
    return entry?.totalPoints || 0;
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
    // This would check if user has enough cumulative points for next level
    // For now, we'll simulate this
    return youth.pointTotal >= currentLevel.cumulativePointsRequired;
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
          <Button variant="outline" size="sm">
            <Download size={16} className="mr-2" />
            Export Data
          </Button>
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
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Required Daily Points for Privileges</Label>
                <p className="text-lg font-semibold">{currentLevel.dailyPointsForPrivileges} points</p>
              </div>
              
              {nextLevel && (
                <div>
                  <Label className="text-sm font-medium text-gray-500">Points for Next Level</Label>
                  <p className="text-lg font-semibold">
                    {youth.pointTotal || 0} / {currentLevel.cumulativePointsRequired}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, ((youth.pointTotal || 0) / currentLevel.cumulativePointsRequired) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Weekly Average</Label>
                <p className="text-lg font-semibold">
                  {weeklyAverages.averagePointsPerDay.toFixed(1)} points
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({weeklyAverages.daysRecorded}/7 days)
                  </span>
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={handleLevelUp}
                  disabled={!isEligibleForLevelUp() || !nextLevel}
                  className="flex-1"
                >
                  <TrendingUp size={14} className="mr-1" />
                  Level Up
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={handleLevelDemotion}
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
                      <Label htmlFor="dailyPoints">Daily Points Earned (0-105)</Label>
                      <Input
                        id="dailyPoints"
                        name="dailyPoints"
                        type="number"
                        min="0"
                        max="105"
                        value={formData.dailyPoints}
                        onChange={handleInputChange}
                        className="max-w-xs"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="totalPoints">Total Daily Points</Label>
                        <span className="text-xl font-bold">
                          {formData.dailyPoints}/105
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
                            width: `${Math.min(100, (formData.dailyPoints / 105) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        Required for privileges: {currentLevel.dailyPointsForPrivileges} points
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
                          Current points ({formData.dailyPoints}) are below the minimum required for privileges ({currentLevel.dailyPointsForPrivileges} points). 
                          This may affect tomorrow's privileges.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Button type="submit" disabled={isSubmitting} className="w-full">
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
                          <YAxis domain={[0, 105]} />
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <Tooltip formatter={(value) => [`${value} points`, 'Points']} />
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
                                Daily Points: {entry.totalPoints}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${entry.totalPoints >= currentLevel.dailyPointsForPrivileges ? 'text-green-600' : 'text-red-600'}`}>
                                {entry.totalPoints}/105
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
