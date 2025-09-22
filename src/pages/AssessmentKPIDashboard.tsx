import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, FileText, AlertTriangle, CheckCircle, ArrowLeft, Palette } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { youthService, behaviorPointsService, caseNotesService, type Youth, type BehaviorPoints, type CaseNotes } from '@/integrations/supabase/services';

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
  completionRate: number;
  improvementTrend: number;
  lastMonthAssessments: number;
  realColorsAssessments: number;
}

const GroupHomeKPIDashboard = () => {
  const navigate = useNavigate();
  
  // State for all data
  const [youths, setYouths] = useState<Youth[]>([]);
  const [allBehaviorPoints, setAllBehaviorPoints] = useState<BehaviorPoints[]>([]);
  const [allCaseNotes, setAllCaseNotes] = useState<CaseNotes[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics>({
    totalAssessments: 0,
    totalYouth: 0,
    averageRiskLevel: 'Low',
    completionRate: 0,
    improvementTrend: 0,
    lastMonthAssessments: 0,
    realColorsAssessments: 0
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
  }, [youths, allBehaviorPoints, allCaseNotes, timeframe, isLoading]);


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

    // Completion stats (using case notes as proxy for completed assessments)
    const youthWithAssessments = new Set(allCaseNotes.map(n => n.youth_id));
    const completionRate = totalYouth > 0 ? (youthWithAssessments.size / totalYouth) * 100 : 0;

    // Real Colors distribution (empty for now)
    const colorDistribution = [];

    // Recent assessments (last month) - using case notes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthAssessments = allCaseNotes
      .filter(note => new Date(note.createdAt || note.date) >= lastMonth).length;

    // Calculate improvement trend
    const recentPoints = pointTrends.slice(-2);
    const improvementTrend = recentPoints.length === 2 
      ? ((parseFloat(String(recentPoints[1].averagePoints)) - parseFloat(String(recentPoints[0].averagePoints))) / parseFloat(String(recentPoints[0].averagePoints))) * 100
      : 0;

    // Level trends - track level ups and downs by week
    const levelTrends = [];

    setKpiMetrics({
      totalAssessments: allCaseNotes.length, // Using case notes as proxy
      totalYouth,
      averageRiskLevel: Object.keys(riskCounts).reduce((a, b) => riskCounts[a] > riskCounts[b] ? a : b, 'Low'),
      completionRate,
      improvementTrend,
      lastMonthAssessments,
      realColorsAssessments: 0 // No real colors assessments yet
    });

    setChartData({
      assessmentTrends: assessmentTrends as any,
      riskLevelDistribution: riskLevelDistribution as any,
      pointTrends: pointTrends as any,
      completionStats: [
        { name: 'Completed Assessments', value: youthWithAssessments.size },
        { name: 'Pending Assessments', value: totalYouth - youthWithAssessments.size }
      ] as any,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
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
                {kpiMetrics.completionRate.toFixed(1)}% assessed
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
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.completionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Youth with assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement Trend</CardTitle>
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
                Point average change
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Assessment Trends</TabsTrigger>
            <TabsTrigger value="risk">Risk Distribution</TabsTrigger>
            <TabsTrigger value="points">Point Trends</TabsTrigger>
            <TabsTrigger value="completion">Completion Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Trends Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData.assessmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="assessments" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
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

          <TabsContent value="completion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Completion Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.completionStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
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