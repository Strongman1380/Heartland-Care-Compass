import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useYouth } from '@/hooks/useSupabase'
import { upsertScore, getScore, getYouthStats, calculateOverallAverage, getScoresForRange, waitForSync, type YouthScoreStats } from '@/utils/schoolScores'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, Minus, Sparkles, Save, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// Helpers
const toISO = (d: Date) => format(d, 'yyyy-MM-dd')

const startOfWeekMon = (d: Date) => {
  const day = d.getDay() // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day // make Monday start
  const res = new Date(d)
  res.setDate(d.getDate() + diff)
  res.setHours(0,0,0,0)
  return res
}

const addDays = (d: Date, n: number) => {
  const res = new Date(d)
  res.setDate(d.getDate() + n)
  return res
}

const weekdays = [
  { key: 'Mon', idx: 1 },
  { key: 'Tue', idx: 2 },
  { key: 'Wed', idx: 3 },
  { key: 'Thu', idx: 4 },
  { key: 'Fri', idx: 5 },
]

type GridValue = { [youthId: string]: { [iso: string]: number | '' } }

const SchoolScores: React.FC = () => {
  const { youths, loadYouths, loading } = useYouth()
  const { toast } = useToast()
  const today = new Date()
  const [weekStart, setWeekStart] = useState<Date>(startOfWeekMon(today))
  const [grid, setGrid] = useState<GridValue>({})
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [youthStats, setYouthStats] = useState<Map<string, YouthScoreStats>>(new Map())
  const [aiInsights, setAiInsights] = useState<string>('')
  const [generatingInsights, setGeneratingInsights] = useState(false)

  useEffect(() => { loadYouths() }, [])

  // Custom sort order for students
  const studentOrder = ['Chance', 'Curtis', 'Dagen', 'Elijah', 'Jaeden', 'Jason', 'Nano', 'Paytin', 'TJ', 'Tristan']
  
  const sortedYouths = useMemo(() => {
    if (!youths || youths.length === 0) return []
    
    return [...youths].sort((a, b) => {
      const indexA = studentOrder.indexOf(a.firstName)
      const indexB = studentOrder.indexOf(b.firstName)
      
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

  const weekDates = useMemo(() => weekdays.map((_, i) => toISO(addDays(weekStart, i))), [weekStart])

  // Load existing scores and calculate stats
  useEffect(() => {
    if (!sortedYouths || sortedYouths.length === 0) return

    const startDate = weekDates[0]
    const endDate = weekDates[weekDates.length - 1]

    const loadScores = async () => {
      try {
        // Batch fetch all scores for the date range instead of individual queries
        const allScoresInRange = await getScoresForRange(startDate, endDate)

        console.log('Fetched scores from Supabase:', allScoresInRange)

        const statsMap = new Map<string, YouthScoreStats>()
        const updated: GridValue = {}

        // Initialize grid
        for (const y of sortedYouths) {
          updated[y.id] = {}
          for (let i = 0; i < weekdays.length; i++) {
            const iso = weekDates[i]
            updated[y.id][iso] = ''
          }
        }

        // Populate grid with fetched scores
        for (const score of allScoresInRange) {
          if (updated[score.youth_id]) {
            updated[score.youth_id][score.date] = score.score
          }
        }

        // Calculate stats for each youth (this will fetch all their scores)
        for (const y of sortedYouths) {
          const stats = await getYouthStats(y.id)
          if (stats) {
            statsMap.set(y.id, stats)
          }
        }

        setGrid(updated)
        setYouthStats(statsMap)

        console.log('School scores loaded from Supabase:', {
          youthCount: sortedYouths.length,
          dateRange: `${startDate} to ${endDate}`,
          scoresInRange: allScoresInRange.length,
          gridData: updated
        })
      } catch (error) {
        console.error('Error loading scores:', error)
      }
    }

    loadScores()
  }, [sortedYouths, weekDates.join('|')])

  // Auto-save functionality with debounce (0–4 rating scale)
  const autoSave = useCallback(async (youthId: string, iso: string, weekdayIdx: number, value: number) => {
    if (autoSaveEnabled && value >= 0 && value <= 4) {
      try {
        await upsertScore(youthId, iso, weekdayIdx, value)
        setLastSaved(new Date())

        // Recalculate stats for this youth
        const stats = await getYouthStats(youthId)
        if (stats) {
          setYouthStats(prev => new Map(prev).set(youthId, stats))
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
        // Log more details for debugging
        if (error instanceof Error) {
          console.error('Error details:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          })
        }
        toast({
          title: "Auto-save Failed",
          description: error instanceof Error ? error.message : "Failed to save score. Please try again.",
          variant: "destructive",
        })
      }
    }
  }, [autoSaveEnabled, toast])

  const handleChange = (youthId: string, iso: string, weekdayIdx: number, value: string) => {
    const numValue = value === '' ? '' : Number(value)
    
    setGrid(prev => ({
      ...prev,
      [youthId]: { ...(prev[youthId] || {}), [iso]: numValue },
    }))
    
    // Auto-save after a short delay (200ms for faster saves)
    if (numValue !== '' && typeof numValue === 'number') {
      setTimeout(() => autoSave(youthId, iso, weekdayIdx, numValue), 200)
    }
  }

  const handleManualSave = async () => {
    try {
      let savedCount = 0
      for (const y of sortedYouths) {
        for (let i = 0; i < weekdays.length; i++) {
          const iso = weekDates[i]
          const val = grid?.[y.id]?.[iso]
          if (val !== '' && typeof val === 'number') {
            await upsertScore(y.id, iso, weekdays[i].idx, val)
            savedCount++
          }
        }
      }

      setLastSaved(new Date())
      toast({
        title: "Scores Saved",
        description: `Successfully saved ${savedCount} score(s).`,
        duration: 3000,
      })

      // Recalculate all stats
      const statsMap = new Map<string, YouthScoreStats>()
      for (const y of sortedYouths) {
        const stats = await getYouthStats(y.id)
        if (stats) {
          statsMap.set(y.id, stats)
        }
      }
      setYouthStats(statsMap)
    } catch (error) {
      console.error('Manual save failed:', error)
      toast({
        title: "Save Failed",
        description: "Failed to save scores. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Calculate weekly averages for current view
  const calculateWeeklyAverages = () => {
    const averages = new Map<string, number>()
    
    for (const y of sortedYouths) {
      const scores: number[] = []
      for (let i = 0; i < weekdays.length; i++) {
        const iso = weekDates[i]
        const val = grid?.[y.id]?.[iso]
        if (val !== '' && typeof val === 'number') {
          scores.push(val)
        }
      }
      
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length
        averages.set(y.id, avg)
      }
    }
    
    return averages
  }

  const weeklyAverages = calculateWeeklyAverages()
  const [overallAverage, setOverallAverage] = useState<number | null>(null)

  // Calculate overall average on load
  useEffect(() => {
    const loadOverallAverage = async () => {
      const avg = await calculateOverallAverage(30)
      setOverallAverage(avg)
    }
    loadOverallAverage()
  }, [youthStats])

  // Rating helpers for 0–4 scale
  const ratingLabel = (val: number) => {
    if (val >= 3.5) return 'Exceeding Expectations'
    if (val >= 3.0) return 'Meeting Expectations'
    if (val >= 2.0) return 'Needs Improvement'
    return 'Unsatisfactory'
  }

  const ratingColor = (val: number) => {
    if (val >= 3.5) return 'text-green-600'
    if (val >= 3.0) return 'text-yellow-600'
    if (val >= 2.0) return 'text-orange-600'
    return 'text-red-600'
  }
  
  const ratingBgColor = (val: number) => {
    if (val >= 3.5) return 'bg-green-100'
    if (val >= 3.0) return 'bg-yellow-100'
    if (val >= 2.0) return 'bg-orange-100'
    return 'bg-red-100'
  }

  // Generate AI insights
  const generateAIInsights = async () => {
    setGeneratingInsights(true)
    
    try {
      // Gather data for AI analysis
      const insights: string[] = []
      const statsArray = Array.from(youthStats.values())
      
      if (statsArray.length === 0) {
        setAiInsights("No score data available yet. Start entering scores to see AI-powered insights!")
        setGeneratingInsights(false)
        return
      }
      
      // Overall program performance
      if (overallAverage !== null) {
        insights.push(`📊 **Program Overview**: 30-day average score is ${overallAverage.toFixed(1)} on a 0–4 scale.`)
        const label = ratingLabel(overallAverage)
        if (label === 'Exceeding Expectations') {
          insights.push('The program is performing at a high level; students consistently exceed expectations.')
        } else if (label === 'Meeting Expectations') {
          insights.push('Solid performance overall with opportunities for targeted enrichment.')
        } else if (label === 'Needs Improvement') {
          insights.push('Performance indicates a need for additional support and intervention strategies.')
        } else {
          insights.push('⚠️ Performance requires immediate attention and comprehensive intervention planning.')
        }
      }
      
      // Identify trends
      const improving = statsArray.filter(s => s.trend === 'improving')
      const declining = statsArray.filter(s => s.trend === 'declining')
      const stable = statsArray.filter(s => s.trend === 'stable')
      
      insights.push(`\n📈 **Trends**: ${improving.length} improving, ${stable.length} stable, ${declining.length} declining`)
      
      if (improving.length > 0) {
        const improvingYouths = improving.map(s => {
          const youth = sortedYouths.find(y => y.id === s.youthId)
          return youth ? `${youth.firstName} ${youth.lastName}` : 'Unknown'
        })
        insights.push(`✅ **Improving Students**: ${improvingYouths.join(', ')} - Continue current interventions and positive reinforcement.`)
      }
      
      if (declining.length > 0) {
        const decliningYouths = declining.map(s => {
          const youth = sortedYouths.find(y => y.id === s.youthId)
          return youth ? `${youth.firstName} ${youth.lastName}` : 'Unknown'
        })
        insights.push(`⚠️ **Students Needing Support**: ${decliningYouths.join(', ')} - Consider additional tutoring, modified assignments, or behavioral interventions.`)
      }
      
      // High performers
      const highPerformers = statsArray.filter(s => s.average >= 3.5)
      if (highPerformers.length > 0) {
        const names = highPerformers.map(s => {
          const youth = sortedYouths.find(y => y.id === s.youthId)
          return youth ? `${youth.firstName} ${youth.lastName}` : 'Unknown'
        })
        insights.push(`\n🌟 **Exceeding Expectations** (3.5–4.0): ${names.join(', ')} - Consider advanced coursework or leadership opportunities.`)
      }
      
      // Students needing intervention
      const needsIntervention = statsArray.filter(s => s.average < 2.0)
      if (needsIntervention.length > 0) {
        const names = needsIntervention.map(s => {
          const youth = sortedYouths.find(y => y.id === s.youthId)
          return youth ? `${youth.firstName} ${youth.lastName}` : 'Unknown'
        })
        insights.push(`\n🔔 **Immediate Intervention Needed** (<2.0): ${names.join(', ')} - Schedule IEP review, increase one-on-one support, and coordinate with behavioral team.`)
      }
      
      // Weekly performance for current view
      const currentWeekAvg = Array.from(weeklyAverages.values())
      if (currentWeekAvg.length > 0) {
        const weekAvg = currentWeekAvg.reduce((a, b) => a + b, 0) / currentWeekAvg.length
        insights.push(`\n📅 **Current Week Average**: ${weekAvg.toFixed(1)} (${format(weekStart, 'MMM dd')} - ${format(addDays(weekStart, 4), 'MMM dd')})`)
      }
      
      // Recommendations
      insights.push(`\n💡 **Recommendations**:`)
      insights.push(`• Review and adjust individualized education plans for students showing declining trends`)
      insights.push(`• Celebrate and reinforce positive progress with improving students`)
      insights.push(`• Consider peer tutoring programs pairing high performers with those needing support`)
      insights.push(`• Analyze correlation between behavioral points and academic scores for holistic intervention`)
      
      setAiInsights(insights.join('\n'))
      
      toast({
        title: "AI Insights Generated",
        description: "Analysis complete based on current score data.",
        duration: 3000,
      })
    } catch (error) {
      console.error('Error generating insights:', error)
      toast({
        title: "Error",
        description: "Failed to generate insights. Please try again.",
        variant: "destructive",
      })
    } finally {
      setGeneratingInsights(false)
    }
  }

  const shiftWeek = (delta: number) => setWeekStart(prev => addDays(prev, delta * 7))
  const isToday = (iso: string) => toISO(today) === iso

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <Minus className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Panel */}
      {(aiInsights || overallAverage !== null) && (
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                AI-Powered Insights & Analytics
              </span>
              <Button 
                onClick={generateAIInsights} 
                disabled={generatingInsights}
                variant="outline"
                size="sm"
                className="bg-white"
              >
                {generatingInsights ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Insights
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overallAverage !== null && (
              <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">30-Day Program Average</p>
                    <p className="text-3xl font-bold text-blue-800">{overallAverage.toFixed(1)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Performance Level</p>
                    <div className={`inline-block px-4 py-2 rounded-lg ${ratingBgColor(overallAverage)}`}>
                      <p className={`text-lg font-semibold ${ratingColor(overallAverage)}`}>
                        {ratingLabel(overallAverage)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {aiInsights && (
              <div className="prose prose-sm max-w-none">
                <div className="bg-white p-4 rounded-lg shadow-sm whitespace-pre-wrap text-sm">
                  {aiInsights}
                </div>
              </div>
            )}
            
            {!aiInsights && (
              <p className="text-sm text-gray-600 text-center py-4">
                Click "Generate Insights" to get AI-powered analysis of academic performance, trends, and recommendations.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Scores Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span>School Scores</span>
              {autoSaveEnabled && lastSaved && (
                <span className="text-sm font-normal text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Auto-saved {format(lastSaved, 'h:mm a')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-gray-600">Week start</span>
                <Input
                  type="date"
                  value={toISO(weekStart)}
                  onChange={(e) => {
                    const d = new Date(e.target.value)
                    setWeekStart(startOfWeekMon(d))
                  }}
                  className="w-40"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => shiftWeek(-1)}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(startOfWeekMon(new Date()))}>This Week</Button>
              <Button variant="outline" size="sm" onClick={() => shiftWeek(1)}>Next</Button>
              <Button onClick={handleManualSave} size="sm" className="bg-red-600 hover:bg-red-700">
                <Save className="w-4 h-4 mr-2" />
                Save All
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-2 text-xs text-gray-600">
            Scale: 0–4.0 — Exceeding Expectations (3.5–4.0), Meeting Expectations (3.0–3.4), Needs Improvement (2.0–2.9), Unsatisfactory (&lt;2.0)
          </div>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              <div className="font-medium">Week: {toISO(weekStart)} to {toISO(addDays(weekStart, 4))}</div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
                Auto-save
              </label>
            </div>
          </div>

          <div className="overflow-auto border rounded-lg bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 w-48">Youth</th>
                  {weekDates.map((iso, idx) => (
                    <th key={iso} className={`text-center px-3 py-2 w-24 ${isToday(iso) ? 'bg-yellow-50' : ''}`}>
                      <div className="font-semibold">{weekdays[idx].key}</div>
                      <div className="text-xs text-gray-500">{format(new Date(iso), 'M/d')}</div>
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 w-24 bg-blue-50">Week Avg</th>
                  <th className="text-center px-3 py-2 w-24 bg-green-50">30-Day Avg</th>
                  <th className="text-center px-3 py-2 w-20">Trend</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">Loading youths…</td></tr>
                ) : sortedYouths.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">No youths found.</td></tr>
                ) : (
                  sortedYouths.map(y => {
                    const weekAvg = weeklyAverages.get(y.id)
                    const stats = youthStats.get(y.id)
                    
                    return (
                      <tr key={y.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{y.firstName} {y.lastName}</td>
                        {weekDates.map((iso, idx) => (
                          <td key={iso} className={`px-3 py-2 ${isToday(iso) ? 'bg-yellow-50' : ''}`}>
                            <Input
                              type="number"
                              min={0}
                              max={4}
                              step={0.1}
                              value={grid?.[y.id]?.[iso] ?? ''}
                              onChange={e => handleChange(y.id, iso, weekdays[idx].idx, e.target.value)}
                              className="text-center"
                            />
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold bg-blue-50">
                          {weekAvg ? weekAvg.toFixed(1) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center font-semibold bg-green-50">
                          {stats ? stats.average : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {stats && getTrendIcon(stats.trend)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-gray-500 mt-3 space-y-1">
            <p>✓ Scores are automatically saved as you type (when auto-save is enabled)</p>
            <p>✓ All historical scores are preserved and used for trend analysis</p>
            <p>✓ Week Average: Current week only | 30-Day Average: Last 30 days of scores</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default SchoolScores
