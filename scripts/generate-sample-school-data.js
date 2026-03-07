// Script to generate sample school data for testing
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') })
dotenv.config({ path: join(__dirname, '.env') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper to get random number in range
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// Helper to get random element from array
const randomChoice = (arr) => arr[random(0, arr.length - 1)]

// Helper to format date as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to get weekday (1=Mon, 5=Fri)
const getWeekday = (date) => {
  const day = date.getDay()
  return day === 0 ? null : (day === 6 ? null : day) // Skip weekends
}

async function generateSampleData() {
  console.log('🎲 Generating Sample School Data...\n')
  console.log('=' .repeat(60))

  try {
    // Get all youth
    const { data: youthList, error: youthError } = await supabase
      .from('youth')
      .select('id, firstName, lastName')
      .order('firstName')

    if (youthError) throw youthError
    if (!youthList || youthList.length === 0) {
      console.error('❌ No youth found in database')
      process.exit(1)
    }

    console.log(`✓ Found ${youthList.length} youth in system\n`)

    // Generate data for the past 30 days
    const today = new Date()
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(today.getDate() - 30)

    // 1. Generate School Daily Scores
    console.log('📊 Generating School Daily Scores...')
    const schoolScores = []
    
    for (const youth of youthList) {
      // Each youth has a base performance level (0-4 scale, stored as 0-100)
      const basePerformance = random(50, 90) // 50-90 out of 100
      const variance = random(5, 15) // How much they vary day to day
      
      let currentDate = new Date(thirtyDaysAgo)
      while (currentDate <= today) {
        const weekday = getWeekday(currentDate)
        
        // Only add scores for weekdays (Mon-Fri)
        if (weekday) {
          // Add some randomness and trends
          const dayVariance = random(-variance, variance)
          let score = basePerformance + dayVariance
          
          // Ensure score is within bounds
          score = Math.max(0, Math.min(100, score))
          
          schoolScores.push({
            youth_id: youth.id,
            date: formatDate(currentDate),
            weekday: weekday,
            score: score
          })
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
    }

    if (schoolScores.length > 0) {
      const { error: scoresError } = await supabase
        .from('school_daily_scores')
        .upsert(schoolScores, { onConflict: 'youth_id,date' })
      
      if (scoresError) throw scoresError
      console.log(`✅ Created ${schoolScores.length} school daily scores`)
    }

    // 2. Generate Academic Credits
    console.log('\n🎓 Generating Academic Credits...')
    const credits = []
    const subjects = ['Math', 'English', 'Science', 'History', 'Physical Education']
    
    for (const youth of youthList) {
      // Each youth earns 1-3 credits over the 30 days
      const numCredits = random(1, 3)
      
      for (let i = 0; i < numCredits; i++) {
        const daysAgo = random(0, 30)
        const creditDate = new Date(today)
        creditDate.setDate(today.getDate() - daysAgo)
        
        credits.push({
          student_id: youth.id,
          date_earned: formatDate(creditDate),
          credit_value: randomChoice([0.25, 0.5, 1.0]),
          subject: randomChoice(subjects),
          notes: `Credit earned for ${randomChoice(['completing unit', 'passing exam', 'project completion'])}`
        })
      }
    }

    if (credits.length > 0) {
      const { error: creditsError } = await supabase
        .from('academic_credits')
        .insert(credits)
      
      if (creditsError) throw creditsError
      console.log(`✅ Created ${credits.length} academic credits`)
    }

    // 3. Generate Academic Grades
    console.log('\n📝 Generating Academic Grades...')
    const grades = []
    const assignments = [
      'Quiz', 'Test', 'Homework', 'Project', 'Essay', 
      'Lab Report', 'Presentation', 'Worksheet'
    ]
    
    for (const youth of youthList) {
      // Each youth has 5-10 grades over the 30 days
      const numGrades = random(5, 10)
      
      for (let i = 0; i < numGrades; i++) {
        const daysAgo = random(0, 30)
        const gradeDate = new Date(today)
        gradeDate.setDate(today.getDate() - daysAgo)
        
        // Grade based on their school score performance
        const baseGrade = random(60, 95)
        
        grades.push({
          student_id: youth.id,
          date_entered: formatDate(gradeDate),
          grade_value: baseGrade,
          subject: randomChoice(subjects),
          assignment_name: `${randomChoice(assignments)} ${random(1, 5)}`,
          notes: baseGrade >= 90 ? 'Excellent work!' : (baseGrade >= 80 ? 'Good effort' : 'Needs improvement')
        })
      }
    }

    if (grades.length > 0) {
      const { error: gradesError } = await supabase
        .from('academic_grades')
        .insert(grades)
      
      if (gradesError) throw gradesError
      console.log(`✅ Created ${grades.length} academic grades`)
    }

    // 4. Generate Academic Steps
    console.log('\n👣 Generating Academic Steps...')
    const steps = []
    
    for (const youth of youthList) {
      // Each youth completes steps 2-4 times over 30 days
      const numSteps = random(2, 4)
      
      for (let i = 0; i < numSteps; i++) {
        const daysAgo = random(0, 30)
        const stepDate = new Date(today)
        stepDate.setDate(today.getDate() - daysAgo)
        
        steps.push({
          student_id: youth.id,
          date_completed: formatDate(stepDate),
          steps_count: random(1, 5),
          subject: randomChoice(subjects),
          notes: `Completed ${random(1, 5)} learning objectives`
        })
      }
    }

    if (steps.length > 0) {
      const { error: stepsError } = await supabase
        .from('academic_steps_completed')
        .insert(steps)
      
      if (stepsError) throw stepsError
      console.log(`✅ Created ${steps.length} academic steps records`)
    }

    // 5. Generate School Incident Reports
    console.log('\n🚨 Generating School Incident Reports...')
    const incidents = []
    const incidentTypes = [
      'Disruption', 'Verbal Altercation', 'Refusal to Follow Directions',
      'Inappropriate Language', 'Tardy/Absence'
    ]
    const severities = ['Low', 'Medium', 'High']
    const locations = [
      'Classroom A', 'Classroom B', 'Cafeteria', 'Gymnasium', 
      'Library', 'Hallway', 'Computer Lab'
    ]
    
    // Generate 3-5 incidents over the 30 days
    const numIncidents = random(3, 5)
    
    for (let i = 0; i < numIncidents; i++) {
      const daysAgo = random(0, 30)
      const incidentDate = new Date(today)
      incidentDate.setDate(today.getDate() - daysAgo)
      incidentDate.setHours(random(8, 15), random(0, 59), 0, 0)
      
      const involvedYouth = randomChoice(youthList)
      const incidentType = randomChoice(incidentTypes)
      const severity = randomChoice(severities)
      
      incidents.push({
        date_time: incidentDate.toISOString(),
        reported_by: {
          staff_id: 'staff-001',
          name: randomChoice(['Mr. Johnson', 'Ms. Smith', 'Mr. Davis', 'Ms. Wilson']),
          role: 'Teacher'
        },
        location: randomChoice(locations),
        incident_type: incidentType,
        severity: severity,
        involved_residents: [{
          youth_id: involvedYouth.id,
          name: `${involvedYouth.firstName} ${involvedYouth.lastName}`,
          role: 'Primary'
        }],
        witnesses: [],
        summary: `${incidentType} incident involving ${involvedYouth.firstName}. ${
          severity === 'Low' ? 'Minor disruption, quickly resolved.' :
          severity === 'Medium' ? 'Moderate incident requiring intervention.' :
          'Significant incident requiring immediate attention.'
        }`,
        timeline: [
          { time: incidentDate.toISOString(), entry: 'Incident began' },
          { time: new Date(incidentDate.getTime() + 5 * 60000).toISOString(), entry: 'Staff intervened' },
          { time: new Date(incidentDate.getTime() + 15 * 60000).toISOString(), entry: 'Situation resolved' }
        ],
        actions_taken: `Student was ${
          severity === 'Low' ? 'given a verbal warning' :
          severity === 'Medium' ? 'removed from class and counseled' :
          'sent to office and parents contacted'
        }. Follow-up scheduled.`,
        medical_needed: false,
        staff_signatures: [{
          staff_id: 'staff-001',
          name: 'Staff Member',
          signed_at: new Date(incidentDate.getTime() + 30 * 60000).toISOString()
        }]
      })
    }

    if (incidents.length > 0) {
      const { error: incidentsError } = await supabase
        .from('school_incident_reports')
        .insert(incidents)
      
      if (incidentsError) throw incidentsError
      console.log(`✅ Created ${incidents.length} school incident reports`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ Sample Data Generation Complete!\n')
    console.log('📊 Summary:')
    console.log(`   - Youth: ${youthList.length}`)
    console.log(`   - School Daily Scores: ${schoolScores.length}`)
    console.log(`   - Academic Credits: ${credits.length}`)
    console.log(`   - Academic Grades: ${grades.length}`)
    console.log(`   - Academic Steps: ${steps.length}`)
    console.log(`   - Incident Reports: ${incidents.length}`)
    console.log('\n💡 Run check-school-data.js to verify the data was created')
    console.log('🌐 Or visit the School page in your application to see the data\n')

  } catch (error) {
    console.error('\n❌ Error generating sample data:', error)
    process.exit(1)
  }
}

// Run the generator
generateSampleData()