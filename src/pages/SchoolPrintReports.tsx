import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useYouth } from '@/hooks/useSupabase'
import { getScoresForRange } from '@/utils/schoolScores'
import { listSchoolIncidents } from '@/utils/academicStore'
import { exportElementToPDF } from '@/utils/export'
import { SchoolIncidentReport } from '@/types/school-incident-types'
import { format, addDays, subDays } from 'date-fns'
import { FileText, Calendar, TrendingUp, FileDown, Loader2, Sparkles } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { aiService } from '@/services/aiService'
import { buildReportFilename } from '@/utils/reportFilenames'

// Helper to get Thursday-to-Wednesday week
const getThursdayWeek = (referenceDate: Date = new Date()) => {
  const day = referenceDate.getDay() // 0=Sun, 4=Thu
  let daysToLastThursday = (day + 3) % 7 // Days back to last Thursday
  if (daysToLastThursday === 0 && day !== 4) daysToLastThursday = 7
  
  const lastThursday = subDays(referenceDate, daysToLastThursday)
  const nextWednesday = addDays(lastThursday, 6)
  
  return {
    start: format(lastThursday, 'yyyy-MM-dd'),
    end: format(nextWednesday, 'yyyy-MM-dd'),
    startDate: lastThursday,
    endDate: nextWednesday
  }
}

type ReportType = 'weekly-average' | 'student-progress' | 'all-students-progress' | 'incident-summary'

const STUDENT_ORDER = ['Chance', 'Curtis', 'Dagen', 'Elijah', 'Jaeden', 'Jason', 'Nano', 'Paytin', 'TJ', 'Tristan'] as const

const SchoolPrintReports: React.FC = () => {
  const { youths, loadYouths } = useYouth()
  const { toast } = useToast()
  const printRef = useRef<HTMLDivElement>(null)
  const combinedRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [schoolIncidents, setSchoolIncidents] = useState<SchoolIncidentReport[]>([])
  const [generatingAI, setGeneratingAI] = useState(false)
  
  const [reportType, setReportType] = useState<ReportType>('weekly-average')
  const [selectedYouthId, setSelectedYouthId] = useState<string>('')
  
  // Date range for reports
  const defaultWeek = getThursdayWeek()
  const [startDate, setStartDate] = useState(defaultWeek.start)
  const [endDate, setEndDate] = useState(defaultWeek.end)
  
  // Student progress report fields
  const [progressNotes, setProgressNotes] = useState('')
  const [strengths, setStrengths] = useState('')
  const [areasForImprovement, setAreasForImprovement] = useState('')
  const [recommendations, setRecommendations] = useState('')
  const [weeklyAnalysis, setWeeklyAnalysis] = useState('')
  
  useEffect(() => {
    loadYouths()
  }, [loadYouths])

  useEffect(() => {
    const loadIncidents = () => {
      try {
        const items = listSchoolIncidents()
        console.log('Loaded school incidents:', items) // Debug log
        // Ensure items is an array before filtering
        const itemsArray = Array.isArray(items) ? items : []
        // Filter out soft-deleted incidents
        const activeIncidents = itemsArray.filter(incident => !incident.deleted_at)
        setSchoolIncidents(activeIncidents)
      } catch (err) {
        console.error('Failed to load school incidents', err)
        setSchoolIncidents([]) // Ensure we set an empty array on error
        toast({
          title: 'Unable to load incidents',
          description: 'There was a problem reading saved incident reports.',
          variant: 'destructive',
        })
      }
    }

    loadIncidents()

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'academic:school-incidents') {
        loadIncidents()
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [toast])

  const sortedYouths = React.useMemo(() => {
    if (!youths || youths.length === 0) return []
    
    return [...youths].sort((a, b) => {
      const indexA = STUDENT_ORDER.indexOf(a.firstName as typeof STUDENT_ORDER[number])
      const indexB = STUDENT_ORDER.indexOf(b.firstName as typeof STUDENT_ORDER[number])
      
      // If both are in the custom order, sort by that order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      
      // If only A is in the custom order, it comes first
      if (indexA !== -1) return -1
      
      // If only B is in the custom order, it comes first
      if (indexB !== -1) return 1
      
      // If neither is in the custom order, sort alphabetically by first name
      return a.firstName.localeCompare(b.firstName)
    })
  }, [youths])
  
  // Auto-populate student progress data
  useEffect(() => {
    if (reportType === 'student-progress' && selectedYouthId) {
      const youth = youths.find(y => y.id === selectedYouthId)
      if (youth) {
        setStrengths(youth.academicStrengths || '')
        setAreasForImprovement(youth.academicChallenges || '')
      }
    }
  }, [reportType, selectedYouthId, youths])
  
  // Generate AI analysis for individual student
  const generateAIAnalysis = async () => {
    if (!selectedYouthId) {
      toast({
        title: 'No student selected',
        description: 'Please select a student first.',
        variant: 'destructive',
      })
      return
    }

    if (!studentProgress || studentProgress.scores.length === 0) {
      toast({
        title: 'No data available',
        description: 'Cannot generate analysis without school score data.',
        variant: 'destructive',
      })
      return
    }

    setGeneratingAI(true)
    try {
      const youth = studentProgress.youth
      const scores = studentProgress.scores
      const average = studentProgress.average
      
      // Get related incidents for context
      const youthIncidents = filteredIncidents.filter(
        inc => inc.involved_residents?.some(r => r.resident_id === selectedYouthId)
      )

      const prompt = `Generate a comprehensive academic progress analysis for ${youth.firstName} ${youth.lastName}.

Current Academic Performance:
- Weekly Average: ${average} out of 4.0
- Days Recorded: ${scores.length}
- Daily Scores: ${scores.map(s => `${format(new Date(s.date), 'MMM dd')}: ${s.score}`).join(', ')}
- Current Grade: ${youth.currentGrade || 'Not specified'}
- School: ${youth.currentSchool || 'Not specified'}
- Has IEP: ${youth.hasIEP ? 'Yes' : 'No'}

${youthIncidents.length > 0 ? `Recent Incidents: ${youthIncidents.length} incidents during this period` : 'No incidents during this period'}

Based on this data, provide:
1. **Progress Notes** (2-3 sentences): Overall academic performance summary
2. **Academic Strengths** (2-3 bullet points): What the student is doing well
3. **Areas for Improvement** (2-3 bullet points): Specific areas needing attention
4. **Recommendations** (3-4 actionable items): Concrete next steps for teachers/staff

Format your response as JSON with these exact keys: progressNotes, strengths, areasForImprovement, recommendations`

      const response = await aiService.queryData(prompt, {
        youth,
        scores,
        incidents: youthIncidents
      })

      if (response.success && response.data?.answer) {
        try {
          // Try to parse as JSON first
          const analysis = JSON.parse(response.data.answer)
          setProgressNotes(analysis.progressNotes || '')
          setStrengths(analysis.strengths || '')
          setAreasForImprovement(analysis.areasForImprovement || '')
          setRecommendations(analysis.recommendations || '')
        } catch {
          // If not JSON, use as progress notes
          setProgressNotes(response.data.answer)
        }

        toast({
          title: 'Analysis Generated',
          description: 'AI has generated the academic analysis.',
        })
      }
    } catch (error: any) {
      console.error('AI analysis error:', error)
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not generate AI analysis.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingAI(false)
    }
  }

  // Generate AI analysis for weekly report
  const generateWeeklyAIAnalysis = async () => {
    if (weeklyAverages.length === 0) {
      toast({
        title: 'No data available',
        description: 'Cannot generate analysis without school score data.',
        variant: 'destructive',
      })
      return
    }

    setGeneratingAI(true)
    try {
      const prompt = `Generate a comprehensive weekly academic performance analysis for Heartland Boys Home.

Program Overview:
- Overall Program Average: ${overallAverage}
- Number of Students: ${weeklyAverages.length}
- Report Period: ${formatRangeDate(startDate)} - ${formatRangeDate(endDate)}

Student Performance:
${weeklyAverages.map(item => `- ${item.name}: ${item.average} avg (${item.daysRecorded} days)`).join('\n')}

${filteredIncidents.length > 0 ? `School Incidents This Week: ${filteredIncidents.length}` : 'No school incidents this week'}

Provide a professional analysis including:
1. Overall program performance trends
2. Students excelling and those needing additional support
3. Notable improvements or concerns
4. Recommendations for staff and programming

Write 3-4 paragraphs in a professional tone suitable for program directors.`

      const response = await aiService.queryData(prompt, {
        averages: weeklyAverages,
        overallAverage,
        incidents: filteredIncidents
      })

      if (response.success && response.data?.answer) {
        setWeeklyAnalysis(response.data.answer)
        toast({
          title: 'Analysis Generated',
          description: 'AI has generated the weekly analysis.',
        })
      }
    } catch (error: any) {
      console.error('AI analysis error:', error)
      toast({
        title: 'Generation Failed',
        description: error.message || 'Could not generate AI analysis.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingAI(false)
    }
  }
  
  const handleDownloadPDF = async () => {
    if (!printRef.current) {
      toast({
        title: 'Nothing to export',
        description: 'The report content is not ready yet.',
        variant: 'destructive',
      })
      return
    }

    try {
      setDownloading(true)
      const selectedYouth = youths.find(y => y.id === selectedYouthId)
      const reportTypeLabel = reportType === 'weekly-average'
        ? 'School Weekly Average Report'
        : reportType === 'student-progress'
          ? 'School Student Progress Report'
          : reportType === 'all-students-progress'
            ? 'School All Students Progress Report'
            : 'School Incident Summary Report'
      const filename = `${buildReportFilename(
        selectedYouth || { firstName: 'All Youth', lastName: 'All Youth' },
        reportTypeLabel
      )}.pdf`
      await exportElementToPDF(printRef.current, filename)
      toast({
        title: 'PDF ready',
        description: 'Your report has been downloaded.',
      })
    } catch (err) {
      console.error('Failed to export report PDF', err)
      toast({
        title: 'Export failed',
        description: 'We could not generate the PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDownloading(false)
    }
  }

  const handleDownloadAllReports = async () => {
    if (!combinedRef.current) {
      toast({
        title: 'Nothing to export',
        description: 'Report content is still loading.',
        variant: 'destructive',
      })
      return
    }

    try {
      setDownloadingAll(true)
      const filename = `${buildReportFilename(
        { firstName: 'All Youth', lastName: 'All Youth' },
        'School Combined Reports'
      )}.pdf`
      await exportElementToPDF(combinedRef.current, filename)
      toast({
        title: 'Combined PDF ready',
        description: 'All school reports have been downloaded.',
      })
    } catch (err) {
      console.error('Failed to export combined school reports', err)
      toast({
        title: 'Export failed',
        description: 'We could not generate the combined PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setDownloadingAll(false)
    }
  }
  
  const handleSetThisWeek = () => {
    const week = getThursdayWeek()
    setStartDate(week.start)
    setEndDate(week.end)
  }
  
  const handleSetLastWeek = () => {
    const lastWeekRef = subDays(new Date(), 7)
    const week = getThursdayWeek(lastWeekRef)
    setStartDate(week.start)
    setEndDate(week.end)
  }
  
  const weeklyAverages = React.useMemo(() => {
    if (!sortedYouths || sortedYouths.length === 0) return []

    const scores = getScoresForRange(startDate, endDate)
    // Ensure scores is an array before iterating
    const scoresArray = Array.isArray(scores) ? scores : []
    const youthAverages = new Map<string, { total: number; count: number; name: string; firstName: string }>()

    for (const score of scoresArray) {
      const youth = sortedYouths.find(y => y.id === score.youth_id)
      if (!youth) continue

      const existing = youthAverages.get(score.youth_id) || {
        total: 0,
        count: 0,
        name: `${youth.firstName} ${youth.lastName}`,
        firstName: youth.firstName,
      }

      existing.total += score.score
      existing.count += 1
      youthAverages.set(score.youth_id, existing)
    }

    const results = Array.from(youthAverages.entries()).map(([id, data]) => ({
      youthId: id,
      name: data.name,
      firstName: data.firstName,
      average: data.count > 0 ? (data.total / data.count).toFixed(1) : 'N/A',
      daysRecorded: data.count,
    }))

    return results.sort((a, b) => {
      const indexA = STUDENT_ORDER.indexOf(a.firstName as typeof STUDENT_ORDER[number])
      const indexB = STUDENT_ORDER.indexOf(b.firstName as typeof STUDENT_ORDER[number])

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.name.localeCompare(b.name)
    })
  }, [sortedYouths, startDate, endDate])

  const studentProgress = React.useMemo(() => {
    if (!selectedYouthId) return null

    const youth = sortedYouths.find(y => y.id === selectedYouthId)
    if (!youth) return null

    const allScores = getScoresForRange(startDate, endDate)
    // Ensure we have an array before filtering
    const scoresArray = Array.isArray(allScores) ? allScores : []
    const scores = scoresArray.filter(s => s.youth_id === selectedYouthId)
    const total = scores.reduce((sum, s) => sum + s.score, 0)
    const average = scores.length > 0 ? (total / scores.length).toFixed(1) : 'N/A'

    return {
      youth,
      scores,
      average,
      daysRecorded: scores.length,
    }
  }, [selectedYouthId, sortedYouths, startDate, endDate])
  const filteredIncidents = React.useMemo(() => {
    if (!schoolIncidents || schoolIncidents.length === 0) return []

    const sorted = [...schoolIncidents].sort(
      (a, b) => new Date(b.date_time).getTime() - new Date(a.date_time).getTime()
    )

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return sorted
    }

    const endOfDay = new Date(end)
    endOfDay.setHours(23, 59, 59, 999)

    return sorted.filter((incident) => {
      const incidentDate = new Date(incident.date_time)
      return incidentDate >= start && incidentDate <= endOfDay
    })
  }, [schoolIncidents, startDate, endDate])
  
  const overallAverage = weeklyAverages.length > 0
    ? (weeklyAverages.reduce((sum, item) => sum + (parseFloat(item.average) || 0), 0) / weeklyAverages.length).toFixed(1)
    : 'N/A'

  const hasAnyReportData = weeklyAverages.length > 0 || !!studentProgress || filteredIncidents.length > 0

  const formatRangeDate = (value: string) => {
    const parsed = new Date(value)
    if (isNaN(parsed.getTime())) return 'N/A'
    return format(parsed, 'MMM dd, yyyy')
  }

  const renderHeader = () => (
    <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-red-600">
      <div className="flex items-center gap-3">
        <img
          src="/files/BoysHomeLogo.png"
          alt="Heartland Boys Home"
          className="h-12 w-auto object-contain"
        />
        <div>
          <h1 className="text-xl font-bold text-red-800">Heartland Boys Home</h1>
          <p className="text-xs text-gray-600">Academic Services</p>
        </div>
      </div>
      <div className="text-right text-xs text-gray-600">
        <p>Report Date: {format(new Date(), 'MMMM dd, yyyy')}</p>
        <p>Period: {formatRangeDate(startDate)} - {formatRangeDate(endDate)}</p>
      </div>
    </div>
  )

  const renderWeeklyAverageSection = () => (
    <section className="mt-2 no-break">
      <h2 className="text-lg font-bold text-red-800 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Weekly Average School Performance Report
      </h2>

      <div className="mb-4">
        <div className="bg-red-50 p-3 rounded-lg mb-3">
          <p className="text-sm text-gray-600">Overall Program Average</p>
          <p className="text-2xl font-bold text-red-800">{overallAverage}</p>
        </div>
      </div>

      {weeklyAverages.length === 0 ? (
        <p className="text-sm text-gray-600">No school scores were recorded during this period.</p>
      ) : (
        <>
          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-1.5 text-left text-sm">Student Name</th>
                <th className="border border-gray-300 px-3 py-1.5 text-center text-sm">Days</th>
                <th className="border border-gray-300 px-3 py-1.5 text-center text-sm">Avg</th>
                <th className="border border-gray-300 px-3 py-1.5 text-center text-sm">Performance</th>
              </tr>
            </thead>
            <tbody>
              {weeklyAverages.map((item) => {
                const avg = parseFloat(item.average)
                // 0-4 scale: 3.5-4 = Exceeding, 3-3.5 = Meeting, 2-3 = Needs Improvement, <2 = Unsatisfactory
                const performance = avg >= 3.5 ? 'Exceeding Expectations' : avg >= 3 ? 'Meeting Expectations' : avg >= 2 ? 'Needs Improvement' : 'Unsatisfactory'
                const performanceColor = avg >= 3.5 ? 'text-green-700' : avg >= 3 ? 'text-yellow-600' : avg >= 2 ? 'text-orange-600' : 'text-red-700'

                return (
                  <tr key={item.youthId}>
                    <td className="border border-gray-300 px-3 py-1.5 text-sm">{item.name}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center text-sm">{item.daysRecorded}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-sm">{item.average}</td>
                    <td className={`border border-gray-300 px-3 py-1.5 text-center font-medium text-sm ${performanceColor}`}>
                      {performance}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="text-xs text-gray-600 mt-3">
            <p className="font-semibold mb-1.5">Performance Scale (0-4 rating):</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li className="text-green-700 font-medium">Exceeding Expectations: 3.5-4.0</li>
              <li className="text-yellow-600 font-medium">Meeting Expectations: 3.0-3.4</li>
              <li className="text-orange-600 font-medium">Needs Improvement: 2.0-2.9</li>
              <li className="text-red-700 font-medium">Unsatisfactory: Below 2.0</li>
            </ul>
          </div>

          {/* AI-Generated Weekly Analysis */}
          {weeklyAnalysis && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200 no-break">
              <h3 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Program Analysis & Insights
              </h3>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {weeklyAnalysis}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )

  const renderStudentProgressSection = () => {
    if (!studentProgress) {
      if (!selectedYouthId) {
        return (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-600">
            Select a student above to generate their academic progress report.
          </div>
        )
      }

      return (
        <p className="text-sm text-gray-600">
          No academic scores were found for this student during the selected period.
        </p>
      )
    }

    return (
      <section className="mt-2">
        <h2 className="text-xl font-bold text-red-800 mb-4">
          Student Academic Progress Report
        </h2>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Student Name</p>
            <p className="font-semibold">{studentProgress.youth.firstName} {studentProgress.youth.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Level</p>
            <p className="font-semibold">Level {studentProgress.youth.level}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date of Birth</p>
            <p className="font-semibold">{studentProgress.youth.dob ? format(new Date(studentProgress.youth.dob), 'MMM dd, yyyy') : 'N/A'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current School</p>
            <p className="font-semibold">{studentProgress.youth.currentSchool || 'N/A'}</p>
          </div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-gray-600">Weekly Average Score</p>
          <p className="text-3xl font-bold text-red-800">{studentProgress.average}</p>
          <p className="text-sm text-gray-600 mt-1">Based on {studentProgress.daysRecorded} recorded day{studentProgress.daysRecorded === 1 ? '' : 's'}</p>
        </div>

        {studentProgress.scores.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Daily Scores</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">Date</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Score</th>
                </tr>
              </thead>
              <tbody>
                {studentProgress.scores.map((score) => (
                  <tr key={score.id}>
                    <td className="border border-gray-300 px-4 py-2">
                      {format(new Date(score.date), 'EEEE, MMM dd, yyyy')}
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                      {score.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {strengths && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Academic Strengths</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{strengths}</p>
          </div>
        )}

        {areasForImprovement && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Areas for Improvement</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{areasForImprovement}</p>
          </div>
        )}

        {progressNotes && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Progress Notes</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{progressNotes}</p>
          </div>
        )}

        {recommendations && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Recommendations</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{recommendations}</p>
          </div>
        )}

        <div className="mt-8 pt-4 border-t">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-2">Teacher/Staff Signature</p>
              <div className="border-b border-gray-400 h-8"></div>
              <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Supervisor Signature</p>
              <div className="border-b border-gray-400 h-8"></div>
              <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const renderAllStudentsProgressSection = () => {
    if (!sortedYouths || sortedYouths.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-sm text-gray-600">
          No students found in the system.
        </div>
      )
    }

    // Get scores for all students
    const allScores = getScoresForRange(startDate, endDate)
    // Ensure we have an array before filtering
    const scoresArray = Array.isArray(allScores) ? allScores : []
    const studentData = sortedYouths.map(youth => {
      const youthScores = scoresArray.filter(s => s.youth_id === youth.id)
      const total = youthScores.reduce((sum, s) => sum + s.score, 0)
      const average = youthScores.length > 0 ? (total / youthScores.length).toFixed(1) : 'N/A'
      
      return {
        youth,
        scores: youthScores,
        average,
        daysRecorded: youthScores.length,
      }
    })

    return (
      <section className="mt-2">
        <h2 className="text-xl font-bold text-red-800 mb-4">
          All Students Academic Progress Report
        </h2>

        <div className="mb-6">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Total Students</p>
            <p className="text-3xl font-bold text-red-800">{sortedYouths.length}</p>
          </div>
        </div>

        {studentData.map((student, index) => (
          <div key={student.youth.id} className={`mb-8 pb-6 ${index < studentData.length - 1 ? 'border-b-2 border-gray-200' : ''}`}>
            <h3 className="text-lg font-bold text-red-700 mb-4">
              {student.youth.firstName} {student.youth.lastName}
            </h3>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Current Level</p>
                <p className="font-semibold">Level {student.youth.level}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current School</p>
                <p className="font-semibold">{student.youth.currentSchool || 'N/A'}</p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600">Weekly Average Score</p>
              <p className="text-2xl font-bold text-red-800">{student.average}</p>
              <p className="text-sm text-gray-600 mt-1">
                Based on {student.daysRecorded} recorded day{student.daysRecorded === 1 ? '' : 's'}
              </p>
            </div>

            {student.scores.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold mb-2 text-sm">Daily Scores</h4>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 px-3 py-1 text-left">Date</th>
                      <th className="border border-gray-300 px-3 py-1 text-center">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {student.scores.map((score) => (
                      <tr key={score.id}>
                        <td className="border border-gray-300 px-3 py-1">
                          {format(new Date(score.date), 'EEE, MMM dd, yyyy')}
                        </td>
                        <td className="border border-gray-300 px-3 py-1 text-center font-semibold">
                          {score.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {student.youth.academicStrengths && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1 text-sm">Academic Strengths</h4>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{student.youth.academicStrengths}</p>
              </div>
            )}

            {student.youth.academicChallenges && (
              <div className="mb-3">
                <h4 className="font-semibold mb-1 text-sm">Areas for Improvement</h4>
                <p className="text-gray-700 text-sm whitespace-pre-wrap">{student.youth.academicChallenges}</p>
              </div>
            )}
          </div>
        ))}

        <div className="mt-8 pt-4 border-t">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-gray-600 mb-2">Teacher/Staff Signature</p>
              <div className="border-b border-gray-400 h-8"></div>
              <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Supervisor Signature</p>
              <div className="border-b border-gray-400 h-8"></div>
              <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const renderIncidentSummarySection = () => (
    <section className="mt-2">
      <h2 className="text-xl font-bold text-red-800 mb-4">
        School Incident Reports Summary
      </h2>

      <div className="mb-6">
        <div className="bg-red-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Total Incidents Reported</p>
          <p className="text-3xl font-bold text-red-800">{filteredIncidents.length}</p>
        </div>
      </div>

      {filteredIncidents.length === 0 ? (
        <p className="text-gray-600 text-center py-8">No incidents reported during this period.</p>
      ) : (
        <div className="space-y-6">
          {filteredIncidents.map((incident, index) => (
            <div key={incident.incident_id} className="border border-gray-300 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-lg">Incident #{index + 1}: {incident.incident_id}</h3>
                  <p className="text-sm text-gray-600">
                    {format(new Date(incident.date_time), 'EEEE, MMMM dd, yyyy - h:mm a')}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  incident.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                  incident.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                  incident.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {incident.severity}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium">{incident.incident_type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Location</p>
                  <p className="font-medium">{incident.location}</p>
                </div>
              </div>

              <div className="mb-3">
                <p className="text-sm text-gray-600">Summary</p>
                <p className="text-gray-700">{incident.summary}</p>
              </div>

              {incident.involved_residents && incident.involved_residents.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm text-gray-600">Students Involved</p>
                  <ul className="list-disc list-inside">
                    {incident.involved_residents.map((resident, idx) => (
                      <li key={idx} className="text-sm">
                        {resident.name} ({resident.role_in_incident})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {incident.actions_taken && (
                <div>
                  <p className="text-sm text-gray-600">Actions Taken</p>
                  <p className="text-gray-700 text-sm">{incident.actions_taken}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 pt-4 border-t">
        <p className="text-sm text-gray-600 mb-4">Report prepared by:</p>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-sm text-gray-600 mb-2">Staff Signature</p>
            <div className="border-b border-gray-400 h-8"></div>
            <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">Supervisor Signature</p>
            <div className="border-b border-gray-400 h-8"></div>
            <p className="text-xs text-gray-500 mt-1">Date: _______________</p>
          </div>
        </div>
      </div>
    </section>
  )
  
  return (
    <div>
      {/* Control Panel - Hidden when printing */}
      <Card className="mb-6 print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            School Print Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div>
            <Label htmlFor="report-type">Report Type</Label>
            <Select value={reportType} onValueChange={(val) => setReportType(val as ReportType)}>
              <SelectTrigger id="report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly-average">Weekly Average Report</SelectItem>
                <SelectItem value="student-progress">Individual Student Progress Report</SelectItem>
                <SelectItem value="all-students-progress">All Students Progress Report</SelectItem>
                <SelectItem value="incident-summary">School Incident Reports Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date (Thursday)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date (Wednesday)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSetThisWeek}>
              <Calendar className="w-4 h-4 mr-2" />
              This Week
            </Button>
            <Button variant="outline" onClick={handleSetLastWeek}>
              <Calendar className="w-4 h-4 mr-2" />
              Last Week
            </Button>
          </div>
          
          {/* Student Selection for Progress Report */}
          {reportType === 'student-progress' && (
            <div>
              <Label htmlFor="student-select">Select Student</Label>
              <Select value={selectedYouthId} onValueChange={setSelectedYouthId}>
                <SelectTrigger id="student-select">
                  <SelectValue placeholder="Choose a student..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedYouths.map(youth => (
                    <SelectItem key={youth.id} value={youth.id}>
                      {youth.firstName} {youth.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Additional fields for Student Progress Report */}
          {reportType === 'student-progress' && selectedYouthId && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">Fill in the fields below or use AI to generate analysis</p>
                <Button 
                  onClick={generateAIAnalysis}
                  disabled={generatingAI || !studentProgress}
                  variant="outline"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {generatingAI ? 'Generating...' : 'Generate AI Analysis'}
                </Button>
              </div>
              <div>
                <Label htmlFor="strengths">Academic Strengths</Label>
                <Textarea
                  id="strengths"
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="List student's academic strengths..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="improvements">Areas for Improvement</Label>
                <Textarea
                  id="improvements"
                  value={areasForImprovement}
                  onChange={(e) => setAreasForImprovement(e.target.value)}
                  placeholder="List areas where student can improve..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="progress-notes">Progress Notes</Label>
                <Textarea
                  id="progress-notes"
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="Additional notes about student's progress..."
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Recommendations for continued success..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          {/* Generate AI Analysis Button for Weekly Report */}
          {reportType === 'weekly-average' && weeklyAverages.length > 0 && (
            <div className="border-t pt-4">
              <Button 
                onClick={generateWeeklyAIAnalysis}
                disabled={generatingAI}
                variant="outline"
                className="w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generatingAI ? 'Generating Weekly Analysis...' : 'Generate AI Weekly Analysis'}
              </Button>
              {weeklyAnalysis && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Generated Analysis (will appear in report):</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{weeklyAnalysis}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Export Buttons */}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              onClick={handleDownloadPDF}
              className="bg-red-600 hover:bg-red-700"
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Download PDF
            </Button>
            <Button
              onClick={handleDownloadAllReports}
              variant="outline"
              disabled={downloadingAll || !hasAnyReportData}
            >
              {downloadingAll ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Download All Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Printable Report Area */}
      <div ref={printRef} className="print:block">
        <div className="bg-white p-6 rounded-lg shadow-sm print:shadow-none print-report">
          {renderHeader()}
          {reportType === 'weekly-average' && renderWeeklyAverageSection()}
          {reportType === 'student-progress' && renderStudentProgressSection()}
          {reportType === 'all-students-progress' && renderAllStudentsProgressSection()}
          {reportType === 'incident-summary' && renderIncidentSummarySection()}
        </div>
      </div>

      {/* Combined printable content (hidden) */}
      <div
        ref={combinedRef}
        style={{ position: 'fixed', left: '-9999px', top: 0, width: '816px', pointerEvents: 'none', opacity: 0 }}
        aria-hidden="true"
      >
        <div className="bg-white p-8 rounded-lg print-report">
          {renderHeader()}
          {renderWeeklyAverageSection()}
          {renderAllStudentsProgressSection()}
          {renderIncidentSummarySection()}
        </div>
      </div>
    </div>
  )
}

export default SchoolPrintReports
