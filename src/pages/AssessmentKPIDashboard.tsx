import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, FileText, AlertTriangle, Heart, Brain, MessageSquare, Shield, ArrowLeft, Palette } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { youthService, behaviorPointsService, caseNotesService, dailyRatingsService, type Youth, type BehaviorPoints, type CaseNotes, type DailyRatings } from '@/integrations/supabase/services';

interface AssessmentData {
  worksheets: any[];
  riskassessments: any[];
  notes: any[];
  points: any[];
  daily_ratings: any[];
  youths: any[];
  realColorsAssessments: any[];
}

interface KPIMetrics {
  totalAssessments: number;
  totalYouth: number;
  averageRiskLevel: string;
  improvementTrend: number;
  lastMonthAssessments: number;
  realColorsAssessments: number;
  behavioralAverages: {
    peerInteraction: number;
    adultInteraction: number;
    investmentLevel: number;
    dealAuthority: number;
  };
  averagePointsPerDay: number;
  activeIncidents: number;
}

const GroupHomeKPIDashboard = () => {
  const navigate = useNavigate();
  
  // State for all data
  const [youths, setYouths] = useState<Youth[]>([]);
  const [allBehaviorPoints, setAllBehaviorPoints] = useState<BehaviorPoints[]>([]);
  const [allCaseNotes, setAllCaseNotes] = useState<CaseNotes[]>([]);
  const [allDailyRatings, setAllDailyRatings] = useState<DailyRatings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics>({
    totalAssessments: 0,
    totalYouth: 0,
    averageRiskLevel: 'Low',
    improvementTrend: 0,
    lastMonthAssessments: 0,
    realColorsAssessments: 0,
    behavioralAverages: {
      peerInteraction: 0,
      adultInteraction: 0,
      investmentLevel: 0,
      dealAuthority: 0
    },
    averagePointsPerDay: 0,
    activeIncidents: 0
  });
  const [timeframe, setTimeframe] = useState('month');
  const [chartData, setChartData] = useState({
    assessmentTrends: [],
    riskLevelDistribution: [],
    pointTrends: [],
    completionStats: [],
    levelTrends: [],
    colorDistribution: []
  });

  // Fetch all data
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [youthData, pointsData, notesData] = await Promise.all([
        youthService.getAll(),
        behaviorPointsService.getAll(),
        caseNotesService.getAll()
      ]);
      
      setYouths(youthData);
      setAllBehaviorPoints(pointsData);
      setAllCaseNotes(notesData);

      // Fetch daily ratings for all youth
      const ratingsPromises = youthData.map(youth => 
        dailyRatingsService.getByYouthId(youth.id).catch(() => [])
      );
      const ratingsResults = await Promise.all(ratingsPromises);
      const allRatings = ratingsResults.flat();
      setAllDailyRatings(allRatings);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!isLoading && youths.length > 0) {
      processKPIData();
    }
  }, [youths, allBehaviorPoints, allCaseNotes, allDailyRatings, timeframe, isLoading]);


  const processKPIData = () => {
    const now = new Date();
    const getTimeframeDate = () => {
      const date = new Date();
      switch (timeframe) {
        case 'week': return new Date(date.setDate(date.getDate() - 7));
        case 'month': return new Date(date.setMonth(date.getMonth() - 1));
        case 'quarter': return new Date(date.setMonth(date.getMonth() - 3));
        default: return new Date(date.setMonth(date.getMonth() - 1));
      }
    };

    const timeframeDate = getTimeframeDate();
    
    // Calculate behavioral rating averages across all youth
    const behavioralTotals = {
      peerInteraction: 0,
      adultInteraction: 0,
      investmentLevel: 0,
      dealAuthority: 0,
      count: 0
    };

    allDailyRatings.forEach(rating => {
      if (rating.peerInteraction !== null && rating.peerInteraction !== undefined) {
        behavioralTotals.peerInteraction += rating.peerInteraction;
        behavioralTotals.adultInteraction += rating.adultInteraction || 0;
        behavioralTotals.investmentLevel += rating.investmentLevel || 0;
        behavioralTotals.dealAuthority += rating.dealAuthority || 0;
        behavioralTotals.count++;
      }
    });

    const behavioralAverages = {
      peerInteraction: behavioralTotals.count > 0 ? Math.round((behavioralTotals.peerInteraction / behavioralTotals.count) * 10) / 10 : 0,
      adultInteraction: behavioralTotals.count > 0 ? Math.round((behavioralTotals.adultInteraction / behavioralTotals.count) * 10) / 10 : 0,
      investmentLevel: behavioralTotals.count > 0 ? Math.round((behavioralTotals.investmentLevel / behavioralTotals.count) * 10) / 10 : 0,
      dealAuthority: behavioralTotals.count > 0 ? Math.round((behavioralTotals.dealAuthority / behavioralTotals.count) * 10) / 10 : 0
    };
    
    // Calculate KPI metrics using real Supabase data
    const totalAssessments = allCaseNotes.length; // Use case notes as proxy for assessments
    const totalYouth = youths.length;
    
    // Risk level distribution from HYRNA assessments
    const riskCounts = { 
      'Very Low': 0, 
      'Low': 0, 
      'Low Medium': 0, 
      'Medium': 0, 
      'Medium High': 0, 
      'High': 0, 
      'Very High': 0 
    };
    
    youths.forEach(youth => {
      const riskLevel = youth.hyrnaRiskLevel || 'Medium'; // Default to Medium if not set
      // Handle legacy "Moderate" level
      const normalizedLevel = riskLevel === 'Moderate' ? 'Medium' : riskLevel;
      if (normalizedLevel in riskCounts) {
        riskCounts[normalizedLevel as keyof typeof riskCounts]++;
      }
    });
    
    const riskLevelDistribution = [
      { name: 'Very Low', value: riskCounts['Very Low'], percentage: totalYouth > 0 ? ((riskCounts['Very Low'] / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'Low', value: riskCounts['Low'], percentage: totalYouth > 0 ? ((riskCounts['Low'] / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'Low Medium', value: riskCounts['Low Medium'], percentage: totalYouth > 0 ? ((riskCounts['Low Medium'] / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'Medium', value: riskCounts['Medium'], percentage: totalYouth > 0 ? ((riskCounts['Medium'] / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'Medium High', value: riskCounts['Medium High'], percentage: totalYouth > 0 ? ((riskCounts['Medium High'] / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'High', value: riskCounts['High'], percentage: totalYouth > 0 ? ((riskCounts['High'] / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'Very High', value: riskCounts['Very High'], percentage: totalYouth > 0 ? ((riskCounts['Very High'] / totalYouth) * 100).toFixed(1) : '0' }
    ];

    // Assessment trends over time (using case notes as proxy for assessments)
    const assessmentsByMonth = {};
    allCaseNotes.forEach(note => {
      const date = new Date(note.createdAt || note.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      assessmentsByMonth[monthKey] = (assessmentsByMonth[monthKey] || 0) + 1;
    });

    const assessmentTrends = Object.entries(assessmentsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({
        month,
        assessments: count
      }));

    // Point trends for improvement tracking
    const pointsByMonth = {};
    allBehaviorPoints.forEach(point => {
      const date = new Date(point.createdAt || point.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!pointsByMonth[monthKey]) {
        pointsByMonth[monthKey] = { total: 0, count: 0 };
      }
      pointsByMonth[monthKey].total += point.totalPoints || 0;
      pointsByMonth[monthKey].count += 1;
    });

    const pointTrends = Object.entries(pointsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]: [string, any]) => ({
        month,
        averagePoints: data.count > 0 ? ((data.total / data.count) / 1000).toFixed(1) : '0' // Convert to thousands
      }));

    // Calculate average points per day for current timeframe
    const recentPoints = allBehaviorPoints.filter(point => 
      new Date(point.createdAt || point.date) >= timeframeDate
    );
    const averagePointsPerDay = recentPoints.length > 0 
      ? Math.round(recentPoints.reduce((sum, point) => sum + (point.totalPoints || 0), 0) / recentPoints.length)
      : 0;

    // Count active incidents (case notes in last 30 days that might indicate incidents)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeIncidents = allCaseNotes.filter(note => 
      new Date(note.createdAt || note.date) >= thirtyDaysAgo &&
      (note.note?.toLowerCase().includes('incident') || 
       note.note?.toLowerCase().includes('behavior') ||
       note.note?.toLowerCase().includes('issue') ||
       note.summary?.toLowerCase().includes('incident'))
    ).length;

    // Real Colors distribution (empty for now)
    const colorDistribution = [];

    // Recent assessments (last month) - using case notes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthAssessments = allCaseNotes
      .filter(note => new Date(note.createdAt || note.date) >= lastMonth).length;

    // Calculate improvement trend
    const recentPointsData = pointTrends.slice(-2);
    const improvementTrend = recentPointsData.length === 2 
      ? ((parseFloat(String(recentPointsData[1].averagePoints)) - parseFloat(String(recentPointsData[0].averagePoints))) / parseFloat(String(recentPointsData[0].averagePoints))) * 100
      : 0;

    // Level trends - track level ups and downs by week
    const levelTrends = [];

    setKpiMetrics({
      totalAssessments: allCaseNotes.length, // Using case notes as proxy
      totalYouth,
      averageRiskLevel: Object.keys(riskCounts).reduce((a, b) => riskCounts[a] > riskCounts[b] ? a : b, 'Low'),
      improvementTrend,
      lastMonthAssessments,
      realColorsAssessments: 0, // No real colors assessments yet
      behavioralAverages,
      averagePointsPerDay,
      activeIncidents
    });

    setChartData({
      assessmentTrends: assessmentTrends as any,
      riskLevelDistribution: riskLevelDistribution as any,
      pointTrends: pointTrends as any,
      completionStats: [] as any, // Remove completion stats
      levelTrends: levelTrends as any,
      colorDistribution: colorDistribution as any
    });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'very low': return '#22c55e';
      case 'low': return '#3b82f6';
      case 'low medium': return '#eab308';
      case 'medium': return '#f59e0b';
      case 'medium high': return '#ea580c';
      case 'high': return '#ef4444';
      case 'very high': return '#dc2626';
      // Legacy support
      case 'moderate': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading assessment data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Group Home KPI Dashboard</h1>
              <p className="text-muted-foreground mt-2">Comprehensive performance metrics and insights for residential care management</p>
            </div>
          </div>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Past Week</SelectItem>
              <SelectItem value="month">Past Month</SelectItem>
              <SelectItem value="quarter">Past Quarter</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.totalAssessments}</div>
              <p className="text-xs text-muted-foreground">
                {kpiMetrics.lastMonthAssessments} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Youth</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.totalYouth}</div>
              <p className="text-xs text-muted-foreground">
                Group home residents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Peer Interaction</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.behavioralAverages.peerInteraction.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Group average (0-4 scale)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Adult Interaction</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.behavioralAverages.adultInteraction.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Group average (0-4 scale)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investment Level</CardTitle>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.behavioralAverages.investmentLevel.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Group average (0-4 scale)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deal with Authority</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.behavioralAverages.dealAuthority.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Group average (0-4 scale)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Risk Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <Badge 
                  variant="outline" 
                  style={{ 
                    backgroundColor: getRiskLevelColor(kpiMetrics.averageRiskLevel),
                    color: 'white',
                    border: 'none'
                  }}
                >
                  {kpiMetrics.averageRiskLevel}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Most common level
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Trend</CardTitle>
              {kpiMetrics.improvementTrend >= 0 ? 
                <TrendingUp className="h-4 w-4 text-green-600" /> : 
                <TrendingDown className="h-4 w-4 text-red-600" />
              }
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${kpiMetrics.improvementTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {kpiMetrics.improvementTrend >= 0 ? '+' : ''}{kpiMetrics.improvementTrend.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Month over month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="behavioral" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="behavioral">Behavioral Ratings</TabsTrigger>
            <TabsTrigger value="risk">Risk Distribution</TabsTrigger>
            <TabsTrigger value="points">Point Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="behavioral" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Group Home Behavioral Rating Averages</CardTitle>
                <p className="text-sm text-muted-foreground">Average ratings across all youth for the four behavioral categories (0-4 scale)</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { category: 'Peer Interaction', value: kpiMetrics.behavioralAverages.peerInteraction },
                    { category: 'Adult Interaction', value: kpiMetrics.behavioralAverages.adultInteraction },
                    { category: 'Investment Level', value: kpiMetrics.behavioralAverages.investmentLevel },
                    { category: 'Deal with Authority', value: kpiMetrics.behavioralAverages.dealAuthority }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis domain={[0, 4]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.riskLevelDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.riskLevelDistribution.map((entry: any, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskLevelColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="points" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Average Points Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.pointTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="averagePoints" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GroupHomeKPIDashboard;