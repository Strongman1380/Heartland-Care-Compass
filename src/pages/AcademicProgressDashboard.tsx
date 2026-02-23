import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { GraduationCap, TrendingUp, Target, Award, Calendar, RefreshCw, ArrowUpRight, ArrowDownRight, Minus, Info, BookOpen, Users, Activity, Star, BarChart3, PieChart, LineChart } from 'lucide-react'
import { useYouth } from '@/hooks/useSupabase'
import { useIsMobile } from '@/hooks/use-mobile'
import { listCredits, listGrades, listSteps, parseYmd, truncateDecimal, saveCredit, saveGrade, saveStep } from '@/utils/academicStore'
import { subDays, format } from 'date-fns'
import { useToast } from '@/hooks/use-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'

const HEARTLAND_CHART_COLORS = {
  burgundy: '#b91c1c',
  burgundySoft: '#dc2626',
  amber: '#d97706',
  amberSoft: '#f59e0b',
  neutral: '#6b7280',
  grid: '#e6ddd0',
}

export default function AcademicProgressDashboard() {
  const { youths, loadYouths } = useYouth()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dateRange, setDateRange] = useState<'all' | '7' | '30' | '90' | '180' | '365'>('30')
  const [selectedStudent, setSelectedStudent] = useState<'all' | string>('all')
  const [dataVersion, setDataVersion] = useState(0)

  // Academic data state
  const [credits, setCredits] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [steps, setSteps] = useState<any[]>([])

  // Quick entry state
  const [entryStudent, setEntryStudent] = useState<string>('')
  const [entryDate, setEntryDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [entryCredits, setEntryCredits] = useState<string>('')
  const [entryGrade, setEntryGrade] = useState<string>('')
  const [entryCourseName, setEntryCourseName] = useState<string>('')
  const [entrySteps, setEntrySteps] = useState<string>('')

  const loadAcademicData = useCallback(async () => {
    try {
      console.log('Loading academic data...')
      const [creditsData, gradesData, stepsData] = await Promise.all([
        listCredits().catch(err => {
          console.error('Failed to load credits:', err)
          return []
        }),
        listGrades().catch(err => {
          console.error('Failed to load grades:', err)
          return []
        }),
        listSteps().catch(err => {
          console.error('Failed to load steps:', err)
          return []
        })
      ])
      
      console.log('Academic data loaded:', {
        credits: creditsData.length,
        grades: gradesData.length,
        steps: stepsData.length
      })
      
      setCredits(creditsData)
      setGrades(gradesData)
      setSteps(stepsData)
      setDataVersion(prev => prev + 1)
    } catch (error) {
      console.error('Failed to load academic data:', error)
      // Set empty arrays as fallback
      setCredits([])
      setGrades([])
      setSteps([])
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([loadYouths(), loadAcademicData()])
      toast({
        title: "Refreshed",
        description: "Dashboard data has been refreshed successfully.",
      })
    } catch (error) {
      console.error('Refresh failed:', error)
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh dashboard data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRefreshing(false)
    }
  }, [loadYouths, loadAcademicData, toast])

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)
      try {
        console.log('Initializing Academic Progress Dashboard...')
        
        // Load youths first
        await loadYouths()
        console.log('Youths loaded successfully')
        
        // Then load academic data
        await loadAcademicData()
        console.log('Academic data loaded successfully')
        
      } catch (error) {
        console.error('Failed to initialize data:', error)
        toast({
          title: "Initialization Failed",
          description: "Failed to load dashboard data. Some features may not work properly.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
        console.log('Dashboard initialization complete')
      }
    }
    initializeData()
  }, []) // Remove dependencies to prevent infinite re-renders

  const getFilteredData = useCallback(() => {
    const selectedId = selectedStudent === 'all' ? null : String(selectedStudent)
    let filteredCredits = credits
    let filteredGrades = grades
    let filteredSteps = steps

    if (dateRange !== 'all') {
      const daysBack = parseInt(dateRange)
      const cutoffDate = subDays(new Date(), daysBack)
      filteredCredits = credits.filter(c => parseYmd(c.date_earned) >= cutoffDate)
      filteredGrades = grades.filter(g => parseYmd(g.date_entered) >= cutoffDate)
      filteredSteps = steps.filter(s => parseYmd(s.date_completed) >= cutoffDate)
    }

    if (selectedId != null) {
      filteredCredits = filteredCredits.filter(c => String(c.student_id) === selectedId)
      filteredGrades = filteredGrades.filter(g => String(g.student_id) === selectedId)
      filteredSteps = filteredSteps.filter(s => String(s.student_id) === selectedId)
    }

    return { filteredCredits, filteredGrades, filteredSteps }
  }, [credits, grades, steps, dateRange, selectedStudent, dataVersion])

  const getOverallMetrics = useCallback(() => {
    const { filteredCredits, filteredGrades, filteredSteps } = getFilteredData()
    const totalCredits = filteredCredits.reduce((sum, c) => sum + (Number(c.credit_value) || 0), 0)
    const avgGrade = filteredGrades.length > 0
      ? filteredGrades.reduce((sum, g) => sum + (Number(g.grade_value) || 0), 0) / filteredGrades.length
      : 0
    const totalSteps = filteredSteps.reduce((sum, s) => sum + (Number(s.steps_count) || 0), 0)

    const studentsWithCredits = new Set(filteredCredits.map(c => c.student_id)).size
    const studentsWithGrades = new Set(filteredGrades.map(g => g.student_id)).size
    const studentsWithSteps = new Set(filteredSteps.map(s => s.student_id)).size

    return {
      totalCredits: truncateDecimal(totalCredits, 2),
      avgGrade: truncateDecimal(avgGrade, 2),
      totalSteps: truncateDecimal(totalSteps, 0),
      studentsWithCredits,
      studentsWithGrades,
      studentsWithSteps,
      avgCreditsPerStudent: studentsWithCredits > 0 ? truncateDecimal(totalCredits / studentsWithCredits, 2) : 0,
      avgStepsPerStudent: studentsWithSteps > 0 ? truncateDecimal(totalSteps / studentsWithSteps, 0) : 0,
    }
  }, [getFilteredData])

  const studentComparison = useMemo(() => {
    if (!youths || youths.length === 0) {
      console.log('No youths available for comparison')
      return []
    }
    
    const { filteredCredits, filteredGrades, filteredSteps } = getFilteredData()
    return youths.map(y => {
      const studentCredits = filteredCredits.filter(c => String(c.student_id) === String(y.id))
      const studentGrades = filteredGrades.filter(g => String(g.student_id) === String(y.id))
      const studentSteps = filteredSteps.filter(s => String(s.student_id) === String(y.id))

      const totalCredits = studentCredits.reduce((sum, c) => sum + (Number(c.credit_value) || 0), 0)
      const avgGrade = studentGrades.length > 0
        ? studentGrades.reduce((sum, g) => sum + (Number(g.grade_value) || 0), 0) / studentGrades.length
        : 0
      const totalSteps = studentSteps.reduce((sum, s) => sum + (Number(s.steps_count) || 0), 0)

      return {
        id: y.id,
        name: `${y.firstName} ${y.lastName}`,
        credits: truncateDecimal(totalCredits, 2),
        avgGrade: truncateDecimal(avgGrade, 2),
        steps: truncateDecimal(totalSteps, 0),
        coursesCompleted: studentCredits.length,
      }
    }).filter(s => s.credits > 0 || s.avgGrade > 0 || s.steps > 0)
      .sort((a, b) => b.credits - a.credits)
  }, [youths, dateRange, selectedStudent, dataVersion])

  const overall = useMemo(() => getOverallMetrics(), [getOverallMetrics])

  // Chart data preparation
  const chartData = useMemo(() => {
    return studentComparison.map(student => ({
      name: student.name.split(' ')[0], // First name only for chart labels
      fullName: student.name,
      credits: student.credits,
      grade: student.avgGrade,
      steps: student.steps,
      courses: student.coursesCompleted,
    }))
  }, [studentComparison])

  const gradeDistribution = useMemo(() => {
    const { filteredGrades } = getFilteredData()
    const distribution = {
      excellent: filteredGrades.filter(g => Number(g.grade_value) >= 90).length,
      good: filteredGrades.filter(g => Number(g.grade_value) >= 80 && Number(g.grade_value) < 90).length,
      average: filteredGrades.filter(g => Number(g.grade_value) >= 70 && Number(g.grade_value) < 80).length,
      needsImprovement: filteredGrades.filter(g => Number(g.grade_value) < 70).length,
    }
    return [
      { name: 'Excellent (90-100%)', value: distribution.excellent, color: HEARTLAND_CHART_COLORS.amber },
      { name: 'Good (80-89%)', value: distribution.good, color: HEARTLAND_CHART_COLORS.burgundySoft },
      { name: 'Average (70-79%)', value: distribution.average, color: HEARTLAND_CHART_COLORS.amberSoft },
      { name: 'Needs Improvement (0-69%)', value: distribution.needsImprovement, color: HEARTLAND_CHART_COLORS.burgundy },
    ].filter(item => item.value > 0)
  }, [getFilteredData])

  const chartConfig = {
    credits: {
      label: "Credits",
      color: HEARTLAND_CHART_COLORS.burgundySoft,
    },
    grade: {
      label: "Grade %",
      color: HEARTLAND_CHART_COLORS.amber,
    },
    steps: {
      label: "Steps",
      color: HEARTLAND_CHART_COLORS.amberSoft,
    },
  }

  const Trend: React.FC<{ delta?: number | null }> = ({ delta }) => {
    if (delta == null) return null
    if (delta > 0) return (<span className="ml-2 inline-flex items-center text-emerald-600 text-xs"><ArrowUpRight className="w-3 h-3 mr-0.5"/>+{delta}</span>)
    if (delta < 0) return (<span className="ml-2 inline-flex items-center text-rose-600 text-xs"><ArrowDownRight className="w-3 h-3 mr-0.5"/>{delta}</span>)
    return (<span className="ml-2 inline-flex items-center text-slate-500 text-xs"><Minus className="w-3 h-3 mr-0.5"/>0.00</span>)
  }

  const handleQuickSave = async () => {
    try {
      if (!entryStudent) {
        toast({ title: 'Select a student', variant: 'destructive' })
        return
      }
      const sid = String(entryStudent)
      const date = entryDate
      let saved = 0
      
      const savePromises = []
      
      if (entryCredits !== '' && !Number.isNaN(Number(entryCredits))) {
        savePromises.push(saveCredit({ student_id: sid, date_earned: date, credit_value: Number(entryCredits) }))
        saved++
      }
      if (entryGrade !== '' && !Number.isNaN(Number(entryGrade))) {
        savePromises.push(saveGrade({
          student_id: sid,
          date_entered: date,
          grade_value: Number(entryGrade),
          course_name: entryCourseName.trim() || undefined
        }))
        saved++
      }
      if (entrySteps !== '' && !Number.isNaN(Number(entrySteps))) {
        savePromises.push(saveStep({ student_id: sid, date_completed: date, steps_count: Number(entrySteps) }))
        saved++
      }
      
      if (saved === 0) {
        toast({ title: 'Enter at least one value to save', variant: 'destructive' })
        return
      }
      
      // Wait for all saves to complete
      await Promise.all(savePromises)
      
      // Refresh the academic data
      await loadAcademicData()
      
      toast({ title: 'Saved', description: 'Academic entries saved successfully.' })
      
      // Clear inputs but keep student/date
      setEntryCredits('')
      setEntryGrade('')
      setEntryCourseName('')
      setEntrySteps('')
    } catch (e) {
      console.error('Save failed:', e)
      toast({ title: 'Save failed', description: 'Failed to save academic entries. Please try again.', variant: 'destructive' })
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-slate-50 rounded-lg border">
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading Academic Progress Dashboard...</p>
          <p className="mt-2 text-xs text-slate-500">Loading students and academic data...</p>
        </div>
      </div>
    )
  }

  // Show a message if no students are loaded
  if (!youths || youths.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-red-600" />
                <span>Academic Progress Dashboard</span>
              </h1>
              <p className="text-slate-600 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Track credits, grades, and student progress</span>
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRefresh} variant="outline" className="h-10" disabled={isRefreshing}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-slate-100 rounded-full">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Students Found</h3>
                <p className="text-slate-600 mb-4">
                  No students are currently loaded. This could be due to a connection issue or no students being registered in the system.
                </p>
                <Button onClick={handleRefresh} className="bg-red-600 hover:bg-red-700" disabled={isRefreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Loading...' : 'Try Again'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-red-600" />
              <span>Academic Progress Dashboard</span>
            </h1>
            <p className="text-slate-600 flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Track credits, grades, and student progress</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline" className="h-10" disabled={isRefreshing}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Entry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Entry</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Student</label>
              <Select value={entryStudent} onValueChange={(v: any) => setEntryStudent(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {youths && youths.length > 0 ? (
                    youths.map(y => (
                      <SelectItem key={y.id} value={String(y.id)}>
                        {y.firstName} {y.lastName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No students available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Credits</label>
              <Input type="number" placeholder="e.g. 0.5" value={entryCredits} onChange={e => setEntryCredits(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Grade %</label>
              <Input type="number" placeholder="0-100" value={entryGrade} onChange={e => setEntryGrade(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Class Name</label>
              <Input type="text" placeholder="e.g. Math 101" value={entryCourseName} onChange={e => setEntryCourseName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Steps</label>
              <div className="flex gap-2">
                <Input type="number" placeholder="e.g. 10" value={entrySteps} onChange={e => setEntrySteps(e.target.value)} />
                <Button onClick={handleQuickSave} className="bg-red-600 hover:bg-red-700">Save</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Date Range</label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="180">Last 6 months</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Student Filter</label>
              <Select value={selectedStudent} onValueChange={(v: any) => setSelectedStudent(v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {youths && youths.length > 0 ? (
                    youths.map(y => (
                      <SelectItem key={y.id} value={String(y.id)}>
                        {y.firstName} {y.lastName}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No students available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual KPI Cards */}
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Credits KPI */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <Award className="h-4 w-4 text-blue-600" />
                </div>
                Total Credits
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Total credits earned across all students in the selected period
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 mb-2">{overall.totalCredits}</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((overall.totalCredits / 10) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-slate-500">
                  {overall.studentsWithCredits} students
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Students earning credits</span>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{overall.studentsWithCredits}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Grade KPI */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                Average Grade
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Average grade percentage across all students and courses
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">{overall.avgGrade}%</div>
              <div className="mb-3">
                <Progress
                  value={overall.avgGrade}
                  className="h-3 mb-2"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0%</span>
                  <span className={`font-medium ${
                    overall.avgGrade >= 90 ? 'text-green-600' :
                    overall.avgGrade >= 80 ? 'text-blue-600' :
                    overall.avgGrade >= 70 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {overall.avgGrade >= 90 ? 'Excellent' :
                     overall.avgGrade >= 80 ? 'Good' :
                     overall.avgGrade >= 70 ? 'Average' : 'Needs Improvement'}
                  </span>
                  <span>100%</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Students with grades</span>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{overall.studentsWithGrades}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Steps KPI */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 bg-orange-100 rounded-lg">
                  <Target className="h-4 w-4 text-orange-600" />
                </div>
                Total Steps
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Total progress steps completed by all students
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600 mb-2">{overall.totalSteps}</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((overall.totalSteps / 100) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-slate-500">
                  {overall.studentsWithSteps} students
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Students completing steps</span>
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{overall.studentsWithSteps}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Credits per Student KPI */}
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 rounded-lg">
                  <Star className="h-4 w-4 text-purple-600" />
                </div>
                Avg Credits / Student
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Average credits per student in selection
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 mb-2">{overall.avgCreditsPerStudent}</div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((overall.avgCreditsPerStudent / 5) * 100, 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-slate-500">
                  per student
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Active students</span>
                <div className="flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-slate-400" />
                  <span className="font-medium">{overall.studentsWithCredits}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Enhanced Student Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            Student Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentComparison.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No student data available for the selected filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {studentComparison.map(row => (
                <Card key={row.id} className="border-l-4 border-l-blue-500 bg-gradient-to-r from-slate-50 to-white">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-slate-800">{row.name}</h3>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          row.avgGrade >= 90 ? 'bg-green-500' :
                          row.avgGrade >= 80 ? 'bg-blue-500' :
                          row.avgGrade >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="text-xs text-slate-500">
                          {row.avgGrade >= 90 ? 'Excellent' :
                           row.avgGrade >= 80 ? 'Good' :
                           row.avgGrade >= 70 ? 'Average' : 'Needs Support'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* Credits Section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            Credits Earned
                          </span>
                          <span className="text-sm font-medium text-blue-600">{row.credits}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((row.credits / 5) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Grade Section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Average Grade
                          </span>
                          <span className={`text-sm font-medium ${
                            row.avgGrade >= 90 ? 'text-green-600' :
                            row.avgGrade >= 80 ? 'text-blue-600' :
                            row.avgGrade >= 70 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {row.avgGrade}%
                          </span>
                        </div>
                        <Progress value={row.avgGrade} className="h-2" />
                      </div>

                      {/* Steps Section */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-600 flex items-center gap-1">
                            <Target className="w-3 h-3" />
                            Progress Steps
                          </span>
                          <span className="text-sm font-medium text-orange-600">{row.steps}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-orange-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((row.steps / 50) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Courses Completed */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <span className="text-sm text-slate-600 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Courses Completed
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-purple-600">{row.coursesCompleted}</span>
                          <div className="flex">
                            {Array.from({ length: Math.min(row.coursesCompleted, 5) }).map((_, i) => (
                              <div key={i} className="w-2 h-2 bg-purple-400 rounded-full -ml-0.5 first:ml-0"></div>
                            ))}
                            {row.coursesCompleted > 5 && (
                              <span className="text-xs text-purple-500 ml-1">+{row.coursesCompleted - 5}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comprehensive Visual Analytics Dashboard */}
      {studentComparison.length > 0 && (
        <>
          {/* Multi-Metric Performance Overview */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Student Performance Radar Chart */}
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  Student Performance Radar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={chartData.slice(0, 6)} margin={isMobile ? { top: 10, right: 30, bottom: 10, left: 30 } : { top: 20, right: 80, bottom: 20, left: 80 }}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 10 }}
                        tickCount={5}
                      />
                      <Radar
                        name="Credits"
                        dataKey="credits"
                        stroke={HEARTLAND_CHART_COLORS.burgundySoft}
                        fill={HEARTLAND_CHART_COLORS.burgundySoft}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <Radar
                        name="Grade %"
                        dataKey="grade"
                        stroke={HEARTLAND_CHART_COLORS.amber}
                        fill={HEARTLAND_CHART_COLORS.amber}
                        fillOpacity={0.2}
                        strokeWidth={2}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Grade Distribution Donut Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-600" />
                  Grade Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={gradeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={isMobile ? 30 : 50}
                        outerRadius={isMobile ? 70 : 120}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value, name) => [`${value} students`, name]}
                      />
                      <ChartLegend
                        content={<ChartLegendContent />}
                        verticalAlign="bottom"
                        height={80}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Credits vs Steps Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Credits vs Steps Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(0, 8)} margin={isMobile ? { top: 10, right: 10, left: 0, bottom: 40 } : { top: 20, right: 30, left: 20, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={HEARTLAND_CHART_COLORS.grid} />
                      <XAxis
                        dataKey="name"
                        stroke={HEARTLAND_CHART_COLORS.neutral}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        stroke={HEARTLAND_CHART_COLORS.neutral}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="credits"
                        fill={HEARTLAND_CHART_COLORS.burgundySoft}
                        radius={[2, 2, 0, 0]}
                        name="Credits Earned"
                      />
                      <Bar
                        dataKey="steps"
                        fill={HEARTLAND_CHART_COLORS.amberSoft}
                        radius={[2, 2, 0, 0]}
                        name="Steps Completed"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Performance Trend Indicators */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={chartData.slice(0, 8)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={HEARTLAND_CHART_COLORS.grid} />
                      <XAxis
                        dataKey="name"
                        stroke={HEARTLAND_CHART_COLORS.neutral}
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke={HEARTLAND_CHART_COLORS.neutral}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Line
                        type="monotone"
                        dataKey="grade"
                        stroke={HEARTLAND_CHART_COLORS.amber}
                        strokeWidth={3}
                        dot={{ fill: HEARTLAND_CHART_COLORS.amber, strokeWidth: 2, r: 4 }}
                        name="Average Grade %"
                      />
                      <Line
                        type="monotone"
                        dataKey="courses"
                        stroke={HEARTLAND_CHART_COLORS.burgundy}
                        strokeWidth={3}
                        dot={{ fill: HEARTLAND_CHART_COLORS.burgundy, strokeWidth: 2, r: 4 }}
                        name="Courses Completed"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Summary Statistics with Visual Indicators */}
          <Card className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Academic Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-blue-100">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {overall.studentsWithCredits + overall.studentsWithGrades + overall.studentsWithSteps}
                  </div>
                  <div className="text-sm text-slate-600">Active Students</div>
                  <div className="mt-2 flex justify-center">
                    <div className="w-8 h-1 bg-blue-200 rounded-full">
                      <div className="w-full h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(((overall.studentsWithCredits + overall.studentsWithGrades + overall.studentsWithSteps) / youths.length) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-green-100">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {studentComparison.length}
                  </div>
                  <div className="text-sm text-slate-600">Students w/ Data</div>
                  <div className="mt-2 flex justify-center">
                    <div className="w-8 h-1 bg-green-200 rounded-full">
                      <div className="w-full h-full bg-green-500 rounded-full" style={{ width: `${(studentComparison.length / youths.length) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-purple-100">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {overall.totalCredits > 0 ? (overall.totalSteps / overall.totalCredits).toFixed(1) : '0'}
                  </div>
                  <div className="text-sm text-slate-600">Steps per Credit</div>
                  <div className="mt-2 flex justify-center">
                    <div className="w-8 h-1 bg-purple-200 rounded-full">
                      <div className="w-full h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((overall.totalSteps / Math.max(overall.totalCredits * 10, 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-orange-100">
                  <div className="text-2xl font-bold text-orange-600 mb-1">
                    {overall.studentsWithGrades > 0 ? (overall.totalSteps / overall.studentsWithGrades).toFixed(0) : '0'}
                  </div>
                  <div className="text-sm text-slate-600">Avg Steps/Student</div>
                  <div className="mt-2 flex justify-center">
                    <div className="w-8 h-1 bg-orange-200 rounded-full">
                      <div className="w-full h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((overall.totalSteps / Math.max(overall.studentsWithGrades * 10, 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-red-100">
                  <div className="text-2xl font-bold text-red-600 mb-1">
                    {overall.avgGrade.toFixed(0)}%
                  </div>
                  <div className="text-sm text-slate-600">Avg Grade</div>
                  <div className="mt-2 flex justify-center">
                    <div className="w-8 h-1 bg-red-200 rounded-full">
                      <div className="w-full h-full bg-red-500 rounded-full" style={{ width: `${overall.avgGrade}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="text-center p-4 bg-white rounded-lg shadow-sm border border-teal-100">
                  <div className="text-2xl font-bold text-teal-600 mb-1">
                    {overall.totalCredits.toFixed(1)}
                  </div>
                  <div className="text-sm text-slate-600">Total Credits</div>
                  <div className="mt-2 flex justify-center">
                    <div className="w-8 h-1 bg-teal-200 rounded-full">
                      <div className="w-full h-full bg-teal-500 rounded-full" style={{ width: `${Math.min((overall.totalCredits / 20) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
