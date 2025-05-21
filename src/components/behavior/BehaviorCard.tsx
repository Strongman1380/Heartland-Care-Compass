
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { collection, addDoc, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { firestore } from "@/pages/Index";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowRight, Calendar, Download, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BehaviorCardProps {
  youthId: string;
  youth: any;
}

interface PointEntry {
  id?: string;
  date: Date | Timestamp;
  morningPoints: number;
  afternoonPoints: number;
  eveningPoints: number;
  totalPoints: number;
  comments: string;
  createdAt: Date | Timestamp;
}

export const BehaviorCard = ({ youthId, youth }: BehaviorCardProps) => {
  const [activeTab, setActiveTab] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pointEntries, setPointEntries] = useState<PointEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    morningPoints: 0,
    afternoonPoints: 0,
    eveningPoints: 0,
    comments: "",
  });
  const [weeklyAverages, setWeeklyAverages] = useState({
    averagePointsPerDay: 0,
    totalPointsThisWeek: 0,
    daysRecorded: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Point thresholds by level
  const levelThresholds = {
    1: 80, // Level 1 needs 80 points to maintain
    2: 85, // Level 2 needs 85 points to maintain
    3: 90, // Level 3 needs 90 points to maintain
    4: 95, // Level 4 needs 95 points to maintain
  };

  useEffect(() => {
    fetchPointEntries();
  }, [youthId]);

  const fetchPointEntries = async () => {
    try {
      setIsLoading(true);
      
      const entriesRef = collection(firestore, `youths/${youthId}/points`);
      const q = query(entriesRef, orderBy("date", "desc"));
      const querySnapshot = await getDocs(q);
      
      const entries = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate()
      }));
      
      setPointEntries(entries as PointEntry[]);
      calculateWeeklyAverages(entries as PointEntry[]);
    } catch (error) {
      console.error("Error fetching point entries:", error);
      toast.error("Failed to load behavior cards");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateWeeklyAverages = (entries: PointEntry[]) => {
    const startOfCurrentWeek = startOfWeek(new Date());
    const endOfCurrentWeek = endOfWeek(new Date());
    
    const thisWeekEntries = entries.filter(entry => {
      const entryDate = entry.date as Date;
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
    
    if (name === "morningPoints" || name === "afternoonPoints" || name === "eveningPoints") {
      const numValue = parseInt(value) || 0;
      // Ensure points are between 0 and 35 for each period
      const clampedValue = Math.max(0, Math.min(35, numValue));
      setFormData(prev => ({ ...prev, [name]: clampedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const totalPoints = 
        (formData.morningPoints || 0) + 
        (formData.afternoonPoints || 0) + 
        (formData.eveningPoints || 0);
      
      const pointEntry: PointEntry = {
        date: selectedDate,
        morningPoints: formData.morningPoints || 0,
        afternoonPoints: formData.afternoonPoints || 0,
        eveningPoints: formData.eveningPoints || 0,
        totalPoints,
        comments: formData.comments,
        createdAt: Timestamp.now(),
      };
      
      await addDoc(collection(firestore, `youths/${youthId}/points`), {
        ...pointEntry,
        date: Timestamp.fromDate(selectedDate),
        createdAt: Timestamp.now(),
      });
      
      toast.success("Behavior card saved successfully");
      
      // Check if points are below threshold for current level
      const threshold = levelThresholds[youth.level as keyof typeof levelThresholds] || 80;
      if (totalPoints < threshold) {
        toast.warning(`Points (${totalPoints}) are below threshold for Level ${youth.level} (${threshold} points required)`);
      }
      
      // Reset form and refresh data
      setFormData({
        morningPoints: 0,
        afternoonPoints: 0,
        eveningPoints: 0,
        comments: "",
      });
      
      fetchPointEntries();
    } catch (error) {
      console.error("Error saving behavior card:", error);
      toast.error("Failed to save behavior card");
    } finally {
      setIsSubmitting(false);
    }
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
        threshold: levelThresholds[youth.level as keyof typeof levelThresholds] || 80,
      };
    });
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
                <p className="text-2xl font-bold">{youth.level}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Required Daily Points</Label>
                <p className="text-lg font-semibold">{levelThresholds[youth.level as keyof typeof levelThresholds] || 80} points</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-500">Weekly Average</Label>
                <p className="text-lg font-semibold">
                  {weeklyAverages.averagePointsPerDay.toFixed(1)} points
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({weeklyAverages.daysRecorded}/7 days)
                  </span>
                </p>
              </div>
              
              {weeklyAverages.averagePointsPerDay > 0 && (
                <div className="p-3 rounded-md bg-gray-50">
                  <p className="text-sm">
                    {weeklyAverages.averagePointsPerDay >= levelThresholds[youth.level as keyof typeof levelThresholds] 
                      ? "✅ Meeting level requirements" 
                      : "❌ Below level requirements"}
                  </p>
                </div>
              )}
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
                  ? "Record points for each period of the day" 
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
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="morningPoints">Morning Points (0-35)</Label>
                        <Input
                          id="morningPoints"
                          name="morningPoints"
                          type="number"
                          min="0"
                          max="35"
                          value={formData.morningPoints}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="afternoonPoints">Afternoon Points (0-35)</Label>
                        <Input
                          id="afternoonPoints"
                          name="afternoonPoints"
                          type="number"
                          min="0"
                          max="35"
                          value={formData.afternoonPoints}
                          onChange={handleInputChange}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="eveningPoints">Evening Points (0-35)</Label>
                        <Input
                          id="eveningPoints"
                          name="eveningPoints"
                          type="number"
                          min="0"
                          max="35"
                          value={formData.eveningPoints}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="totalPoints">Total Daily Points</Label>
                        <span className="text-xl font-bold">
                          {(formData.morningPoints || 0) + 
                           (formData.afternoonPoints || 0) + 
                           (formData.eveningPoints || 0)}/105
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className={`h-4 rounded-full ${
                            ((formData.morningPoints || 0) + 
                             (formData.afternoonPoints || 0) + 
                             (formData.eveningPoints || 0)) >= (levelThresholds[youth.level as keyof typeof levelThresholds] || 80) 
                              ? "bg-green-500" 
                              : "bg-red-500"
                          }`}
                          style={{ 
                            width: `${Math.min(
                              100, 
                              (((formData.morningPoints || 0) + 
                                (formData.afternoonPoints || 0) + 
                                (formData.eveningPoints || 0)) / 105) * 100
                            )}%` 
                          }}
                        ></div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-1">
                        Required: {levelThresholds[youth.level as keyof typeof levelThresholds] || 80} points for Level {youth.level}
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
                    
                    {((formData.morningPoints || 0) + 
                      (formData.afternoonPoints || 0) + 
                      (formData.eveningPoints || 0)) < (levelThresholds[youth.level as keyof typeof levelThresholds] || 80) && (
                      <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Below Level Requirement</AlertTitle>
                        <AlertDescription className="text-amber-700">
                          Current points are below the minimum required for Level {youth.level}. 
                          This may affect privileges.
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
                        <span className="text-sm">Level Threshold</span>
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
                                M: {entry.morningPoints}, A: {entry.afternoonPoints}, E: {entry.eveningPoints}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${entry.totalPoints >= (levelThresholds[youth.level as keyof typeof levelThresholds] || 80) ? 'text-green-600' : 'text-red-600'}`}>
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
