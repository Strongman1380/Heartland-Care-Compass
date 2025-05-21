import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { AlertCircle, Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { fetchBehaviorPoints, fetchProgressNotes } from "@/utils/supabase-utils";
import { BehaviorPoints, ProgressNote } from "@/types/app-types";

interface KpiDashboardProps {
  youthId: string;
  youth: any;
}

export const KpiDashboard = ({ youthId, youth }: KpiDashboardProps) => {
  const [timeframe, setTimeframe] = useState<"week" | "month" | "quarter">("week");
  const [isLoading, setIsLoading] = useState(true);
  const [pointsData, setPointsData] = useState<BehaviorPoints[]>([]);
  const [notesData, setNotesData] = useState<ProgressNote[]>([]);
  const [pointsChartData, setPointsChartData] = useState<any[]>([]);
  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [ratingsData, setRatingsData] = useState<any[]>([]);
  
  // KPI metrics
  const [kpiMetrics, setKpiMetrics] = useState({
    avgPointsPerDay: 0,
    pointTrend: 0, // positive number = upward trend, negative = downward
    daysOnTarget: 0,
    totalDays: 0,
    lowRatingCount: 0
  });
  
  useEffect(() => {
    fetchData();
  }, [youthId]);
  
  useEffect(() => {
    if (pointsData.length > 0 || notesData.length > 0) {
      processData();
    }
  }, [pointsData, notesData, timeframe]);
  
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch points data
      const points = await fetchBehaviorPoints(youthId);
      setPointsData(points);
      
      // Fetch notes data
      const notes = await fetchProgressNotes(youthId);
      setNotesData(notes);
    } catch (error) {
      console.error("Error fetching KPI data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const processData = () => {
    // Get date range based on selected timeframe
    let startDate = new Date();
    const endDate = new Date();
    
    switch (timeframe) {
      case "week":
        startDate = subDays(endDate, 7);
        break;
      case "month":
        startDate = startOfMonth(endDate);
        break;
      case "quarter":
        startDate = subDays(endDate, 90);
        break;
    }
    
    // Filter data to selected timeframe
    const filteredPointsData = pointsData.filter(point => 
      point.date >= startDate && point.date <= endDate
    );
    
    const filteredNotesData = notesData.filter(note => 
      note.date >= startDate && note.date <= endDate
    );
    
    // Process points data for chart
    const chartData = filteredPointsData.map(point => ({
      date: format(point.date as Date, 'MM/dd'),
      points: point.totalPoints,
      threshold: youth.level === 1 ? 80 : youth.level === 2 ? 85 : youth.level === 3 ? 90 : 95
    }));
    
    setPointsChartData(chartData);
    
    // Process notes data by category
    const categoryCounts: Record<string, number> = {};
    filteredNotesData.forEach(note => {
      const category = note.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
      name,
      value
    }));
    
    setCategoriesData(categoryData);
    
    // Process notes data by rating
    const ratingCounts = [0, 0, 0, 0, 0]; // Ratings 1-5
    filteredNotesData.forEach(note => {
      if (note.rating >= 1 && note.rating <= 5) {
        ratingCounts[note.rating - 1]++;
      }
    });
    
    const ratingData = [
      { name: "1 - Very Poor", value: ratingCounts[0] },
      { name: "2 - Poor", value: ratingCounts[1] },
      { name: "3 - Average", value: ratingCounts[2] },
      { name: "4 - Good", value: ratingCounts[3] },
      { name: "5 - Excellent", value: ratingCounts[4] }
    ];
    
    setRatingsData(ratingData);
    
    // Calculate KPI metrics
    if (filteredPointsData.length > 0) {
      // Average points per day
      const totalPoints = filteredPointsData.reduce((sum, day) => sum + day.totalPoints, 0);
      const avgPoints = totalPoints / filteredPointsData.length;
      
      // Point trend (compare first half to second half)
      const midpoint = Math.floor(filteredPointsData.length / 2);
      const firstHalfAvg = filteredPointsData.slice(0, midpoint).reduce((sum, day) => sum + day.totalPoints, 0) / midpoint || 0;
      const secondHalfAvg = filteredPointsData.slice(midpoint).reduce((sum, day) => sum + day.totalPoints, 0) / (filteredPointsData.length - midpoint) || 0;
      const trend = secondHalfAvg - firstHalfAvg;
      
      // Days on target
      const threshold = youth.level === 1 ? 80 : youth.level === 2 ? 85 : youth.level === 3 ? 90 : 95;
      const daysOnTarget = filteredPointsData.filter(day => day.totalPoints >= threshold).length;
      
      // Low ratings count
      const lowRatings = filteredNotesData.filter(note => note.rating <= 2).length;
      
      setKpiMetrics({
        avgPointsPerDay: avgPoints,
        pointTrend: trend,
        daysOnTarget: daysOnTarget,
        totalDays: filteredPointsData.length,
        lowRatingCount: lowRatings
      });
    }
  };

  const getCategoryColors = () => {
    return ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c", "#d0ed57", "#ffc658"];
  };
  
  const getRatingColors = () => {
    return ["#ff6b6b", "#ffa06b", "#ffd76b", "#6bafff", "#6bffaf"];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start flex-col sm:flex-row">
        <div>
          <h2 className="text-2xl font-bold mb-2">Progress Dashboard</h2>
          <p className="text-gray-600 mb-4">Track behavior trends and progress metrics for {youth.firstName}.</p>
        </div>
        
        <div>
          <Select value={timeframe} onValueChange={(value) => setTimeframe(value as any)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Daily Point Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {kpiMetrics.avgPointsPerDay.toFixed(1)}
                <span className="text-sm font-normal text-gray-500 ml-1">/ 105</span>
              </div>
              
              <div className="flex items-center">
                {kpiMetrics.pointTrend > 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <TrendingUp size={14} className="mr-1" />
                    +{kpiMetrics.pointTrend.toFixed(1)}
                  </Badge>
                ) : kpiMetrics.pointTrend < 0 ? (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <TrendingDown size={14} className="mr-1" />
                    {kpiMetrics.pointTrend.toFixed(1)}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-gray-50">
                    Stable
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Days Meeting Target</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {kpiMetrics.daysOnTarget}
                <span className="text-sm font-normal text-gray-500 ml-1">/ {kpiMetrics.totalDays}</span>
              </div>
              
              <div>
                {kpiMetrics.totalDays > 0 && (
                  <Badge variant="outline" className={
                    kpiMetrics.daysOnTarget / kpiMetrics.totalDays >= 0.8 
                      ? "bg-green-50 text-green-700 border-green-200"
                      : kpiMetrics.daysOnTarget / kpiMetrics.totalDays >= 0.6
                      ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }>
                    {Math.round((kpiMetrics.daysOnTarget / kpiMetrics.totalDays) * 100)}%
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Current Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">
                Level {youth.level}
              </div>
              
              <div>
                {youth.level === 1 && (
                  <Badge className="bg-red-100 text-red-800">Entry</Badge>
                )}
                {youth.level === 2 && (
                  <Badge className="bg-yellow-100 text-yellow-800">Intermediate</Badge>
                )}
                {youth.level === 3 && (
                  <Badge className="bg-blue-100 text-blue-800">Advanced</Badge>
                )}
                {youth.level === 4 && (
                  <Badge className="bg-green-100 text-green-800">Honor</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Low Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold">
                {kpiMetrics.lowRatingCount}
                <span className="text-sm font-normal text-gray-500 ml-1">incidents</span>
              </div>
              
              {kpiMetrics.lowRatingCount > 2 && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <AlertCircle size={14} className="mr-1" />
                  Attention
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Behavior Point Trends</CardTitle>
            <CardDescription>Daily point totals over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {pointsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pointsChartData}>
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 105]} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="points" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ r: 3 }} 
                      activeDot={{ r: 5 }}
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
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">No point data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Progress Notes Analysis</CardTitle>
            <CardDescription>Distribution by category and rating</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Notes by Category</h4>
                <div className="h-[180px]">
                  {categoriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoriesData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          fill="#8884d8"
                          label={(entry) => entry.name}
                        >
                          {categoriesData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getCategoryColors()[index % getCategoryColors().length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No notes data available</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">Notes by Rating</h4>
                <div className="h-[180px]">
                  {ratingsData.some(item => item.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ratingsData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={false} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value">
                          {ratingsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getRatingColors()[index]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No ratings data available</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {ratingsData.map((entry, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <div 
                        className="w-3 h-3 mr-1 rounded-full" 
                        style={{ backgroundColor: getRatingColors()[index] }}
                      ></div>
                      <span>{entry.name.split('-')[0].trim()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional KPI panels for behavior patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Weekly Point Consistency</CardTitle>
            <CardDescription>Stability of daily point earnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* This would be populated with actual data in a real implementation */}
              <div className="text-center py-4">
                <p className="text-gray-500">Not enough data to analyze consistency</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Observations & Insights</CardTitle>
            <CardDescription>AI-generated insights based on data patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pointsData.length === 0 ? (
                <p className="text-gray-500">Add more data to generate insights</p>
              ) : (
                <>
                  {kpiMetrics.totalDays > 0 && kpiMetrics.daysOnTarget / kpiMetrics.totalDays < 0.6 && (
                    <div className="p-3 border-l-4 border-amber-500 bg-amber-50 rounded-r-md">
                      <h4 className="font-medium text-amber-800">Point Threshold Alert</h4>
                      <p className="text-sm text-amber-700">
                        Youth is meeting point threshold on only {Math.round((kpiMetrics.daysOnTarget / kpiMetrics.totalDays) * 100)}% of days.
                        Consider reviewing behavioral expectations and incentives.
                      </p>
                    </div>
                  )}
                  
                  {kpiMetrics.pointTrend > 3 && (
                    <div className="p-3 border-l-4 border-green-500 bg-green-50 rounded-r-md">
                      <h4 className="font-medium text-green-800">Positive Trend Detected</h4>
                      <p className="text-sm text-green-700">
                        Youth's point average is trending positively (+{kpiMetrics.pointTrend.toFixed(1)} points).
                        Consider acknowledgment and positive reinforcement.
                      </p>
                    </div>
                  )}
                  
                  {kpiMetrics.pointTrend < -3 && (
                    <div className="p-3 border-l-4 border-red-500 bg-red-50 rounded-r-md">
                      <h4 className="font-medium text-red-800">Negative Trend Alert</h4>
                      <p className="text-sm text-red-700">
                        Youth's point average is trending downward ({kpiMetrics.pointTrend.toFixed(1)} points).
                        Consider a check-in meeting to address concerns.
                      </p>
                    </div>
                  )}
                  
                  {kpiMetrics.lowRatingCount >= 3 && (
                    <div className="p-3 border-l-4 border-purple-500 bg-purple-50 rounded-r-md">
                      <h4 className="font-medium text-purple-800">Multiple Low Ratings</h4>
                      <p className="text-sm text-purple-700">
                        {kpiMetrics.lowRatingCount} low ratings (1-2) recorded recently.
                        Consider targeted intervention in problem areas.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
