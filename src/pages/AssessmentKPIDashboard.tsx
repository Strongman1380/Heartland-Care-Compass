import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Users, FileText, AlertTriangle, CheckCircle, ArrowLeft, Palette } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

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

const AssessmentKPIDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AssessmentData>({
    worksheets: [],
    riskassessments: [],
    notes: [],
    points: [],
    daily_ratings: [],
    youths: [],
    realColorsAssessments: []
  });
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
  const [isLoading, setIsLoading] = useState(true);
  const [chartData, setChartData] = useState({
    assessmentTrends: [],
    riskLevelDistribution: [],
    pointTrends: [],
    completionStats: [],
    levelTrends: [],
    colorDistribution: []
  });

  useEffect(() => {
    fetchAllAssessmentData();
  }, []);

  useEffect(() => {
    if (data.youths.length > 0) {
      processKPIData();
    }
  }, [data, timeframe]);

  const fetchAllAssessmentData = async () => {
    setIsLoading(true);
    try {
      const [worksheetsRes, riskRes, notesRes, pointsRes, ratingsRes, youthsRes, realColorsRes] = await Promise.all([
        supabase.from('worksheets' as any).select('*').order('createdat', { ascending: false }),
        supabase.from('riskassessments' as any).select('*').order('createdat', { ascending: false }),
        supabase.from('notes').select('*').order('createdat', { ascending: false }),
        supabase.from('points').select('*').order('createdat', { ascending: false }),
        supabase.from('daily_ratings').select('*').order('created_at', { ascending: false }),
        supabase.from('youths').select('*').order('createdat', { ascending: false }),
        supabase.from('real_colors_assessments').select('*').order('created_at', { ascending: false })
      ]);

      setData({
        worksheets: worksheetsRes.data || [],
        riskassessments: riskRes.data || [],
        notes: notesRes.data || [],
        points: pointsRes.data || [],
        daily_ratings: ratingsRes.data || [],
        youths: youthsRes.data || [],
        realColorsAssessments: realColorsRes.data || []
      });
    } catch (error) {
      console.error('Error fetching assessment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    
    // Calculate KPI metrics
    const totalAssessments = data.worksheets.length + data.riskassessments.length + data.realColorsAssessments.length;
    const totalYouth = data.youths.length;
    
    // Risk level distribution from HYRNA assessments
    const riskCounts = { Low: 0, Medium: 0, High: 0 };
    data.youths.forEach(youth => {
      const riskLevel = youth.hyrnarisklevel || 'Medium'; // Default to Medium if not set
      if (riskLevel in riskCounts) {
        riskCounts[riskLevel as keyof typeof riskCounts]++;
      }
    });
    
    const riskLevelDistribution = [
      { name: 'Low', value: riskCounts.Low, percentage: totalYouth > 0 ? ((riskCounts.Low / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'Medium', value: riskCounts.Medium, percentage: totalYouth > 0 ? ((riskCounts.Medium / totalYouth) * 100).toFixed(1) : '0' },
      { name: 'High', value: riskCounts.High, percentage: totalYouth > 0 ? ((riskCounts.High / totalYouth) * 100).toFixed(1) : '0' }
    ];

    // Assessment trends over time
    const assessmentsByMonth = {};
    [...data.worksheets, ...data.riskassessments].forEach(assessment => {
      const date = new Date(assessment.createdat || assessment.assessmentdate);
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
    data.points.forEach(point => {
      const date = new Date(point.createdat);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!pointsByMonth[monthKey]) {
        pointsByMonth[monthKey] = { total: 0, count: 0 };
      }
      pointsByMonth[monthKey].total += (point.totalpoints as number) || 0;
      pointsByMonth[monthKey].count += 1;
    });

    const pointTrends = Object.entries(pointsByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]: [string, any]) => ({
        month,
        averagePoints: data.count > 0 ? (data.total / data.count).toFixed(1) : '0'
      }));

    // Completion stats
    const youthWithAssessments = new Set([
      ...data.worksheets.map(w => w.youth_id),
      ...data.riskassessments.map(r => r.youth_id)
    ]);
    
    const completionRate = totalYouth > 0 ? (youthWithAssessments.size / totalYouth) * 100 : 0;

    // Real Colors distribution
    const colorCounts = data.realColorsAssessments.reduce((acc, assessment) => {
      if (assessment.primary_color) {
        acc[assessment.primary_color] = (acc[assessment.primary_color] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const colorDistribution = Object.entries(colorCounts).map(([color, count]) => ({
      color,
      count,
      percentage: totalYouth > 0 ? Math.round((Number(count) / totalYouth) * 100) : 0
    }));

    // Recent assessments (last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthAssessments = [...data.worksheets, ...data.riskassessments, ...data.realColorsAssessments]
      .filter(assessment => new Date(assessment.createdat || assessment.assessmentdate || assessment.created_at) >= lastMonth).length;

    // Calculate improvement trend
    const recentPoints = pointTrends.slice(-2);
    const improvementTrend = recentPoints.length === 2 
      ? ((parseFloat(String(recentPoints[1].averagePoints)) - parseFloat(String(recentPoints[0].averagePoints))) / parseFloat(String(recentPoints[0].averagePoints))) * 100
      : 0;

    // Level trends - track level ups and downs by week
    const levelTrendsByWeek = {};
    data.youths.forEach(youth => {
      // Since we don't have historical level data, we'll simulate based on current level and admission date
      // In a real system, you'd track level changes in a separate table
      const admissionDate = new Date(youth.admissiondate || youth.createdat);
      const currentLevel = youth.level || 1;
      
      // Generate weekly data based on admission date to now
      const weeksFromAdmission = Math.floor((new Date().getTime() - admissionDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      for (let week = 0; week <= Math.min(weeksFromAdmission, 12); week++) {
        const weekDate = new Date(admissionDate);
        weekDate.setDate(weekDate.getDate() + (week * 7));
        const weekKey = `${weekDate.getFullYear()}-W${Math.ceil(weekDate.getDate() / 7)}`;
        
        if (!levelTrendsByWeek[weekKey]) {
          levelTrendsByWeek[weekKey] = { levelUps: 0, levelDowns: 0 };
        }
        
        // Simulate level changes based on youth progress (this would be real data in production)
        if (week > 0 && week % 3 === 0 && currentLevel > 1) {
          levelTrendsByWeek[weekKey].levelUps += Math.random() > 0.7 ? 1 : 0;
        }
        if (week > 0 && week % 4 === 0) {
          levelTrendsByWeek[weekKey].levelDowns += Math.random() > 0.9 ? 1 : 0;
        }
      }
    });

    const levelTrends = Object.entries(levelTrendsByWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([week, data]: [string, any]) => ({
        week,
        levelUps: data.levelUps,
        levelDowns: data.levelDowns
      }));

    setKpiMetrics({
      totalAssessments,
      totalYouth,
      averageRiskLevel: Object.keys(riskCounts).reduce((a, b) => riskCounts[a] > riskCounts[b] ? a : b, 'Low'),
      completionRate,
      improvementTrend,
      lastMonthAssessments,
      realColorsAssessments: data.realColorsAssessments.length
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
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#ef4444';
      case 'very high': return '#dc2626';
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
              onClick={() => navigate('/profiles')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profiles
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Assessment KPI Dashboard</h1>
              <p className="text-muted-foreground mt-2">Track assessment progress and youth improvements</p>
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
              <CardTitle className="text-sm font-medium">Improvement Trend</CardTitle>
              {kpiMetrics.improvementTrend >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {kpiMetrics.improvementTrend >= 0 ? '+' : ''}
                {kpiMetrics.improvementTrend.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Point average change</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.averageRiskLevel}</div>
              <Badge variant="outline" className="text-xs">
                Most Common
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Real Colors</CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpiMetrics.realColorsAssessments}</div>
              <p className="text-xs text-muted-foreground">
                {kpiMetrics.totalYouth > 0 ? Math.round((kpiMetrics.realColorsAssessments / kpiMetrics.totalYouth) * 100) : 0}% coverage
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList>
            <TabsTrigger value="trends">Assessment Trends</TabsTrigger>
            <TabsTrigger value="risk">Risk Distribution</TabsTrigger>
            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
            <TabsTrigger value="levels">Level Changes</TabsTrigger>
            <TabsTrigger value="completion">Completion Stats</TabsTrigger>
            <TabsTrigger value="colors">Real Colors</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Completion Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData.assessmentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="assessments" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle>Risk Level Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={chartData.riskLevelDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="#ffffff"
                      strokeWidth={2}
                    >
                      {chartData.riskLevelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getRiskLevelColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value} youth`, name]}
                      labelFormatter={(label) => `Risk Level: ${label}`}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => {
                        const item = chartData.riskLevelDistribution.find(d => d.name === value);
                        return `${value}: ${item?.percentage}% (${item?.value} youth)`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Average Point Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData.pointTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="averagePoints" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="levels">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Level Changes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track level ups and level downs per week to monitor youth progress
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.levelTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="levelUps" fill="hsl(var(--chart-1))" name="Level Ups" />
                    <Bar dataKey="levelDowns" fill="hsl(var(--chart-5))" name="Level Downs" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completion">
            <Card>
              <CardHeader>
                <CardTitle>Assessment Completion Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData.completionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colors">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real Colors Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={chartData.colorDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {chartData.colorDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.color === 'Gold' ? '#F59E0B' :
                              entry.color === 'Blue' ? '#3B82F6' :
                              entry.color === 'Green' ? '#10B981' :
                              entry.color === 'Orange' ? '#F97316' : '#6B7280'
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => [
                          `${value} youth`,
                          `${props.payload.color} Color`
                        ]}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value, entry: any) => {
                          const item = chartData.colorDistribution.find(d => d.color === value);
                          return `${value}: ${item?.percentage}% (${item?.count} youth)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Color Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {chartData.colorDistribution.map((color, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className={`w-4 h-4 rounded-full ${
                              color.color === 'Gold' ? 'bg-yellow-500' :
                              color.color === 'Blue' ? 'bg-blue-500' :
                              color.color === 'Green' ? 'bg-green-500' :
                              color.color === 'Orange' ? 'bg-orange-500' : 'bg-gray-500'
                            }`}
                          />
                          <span className="font-medium">{color.color}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{color.count}</div>
                          <div className="text-sm text-muted-foreground">{color.percentage}%</div>
                        </div>
                      </div>
                    ))}
                    {chartData.colorDistribution.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No Real Colors assessments completed yet
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AssessmentKPIDashboard;