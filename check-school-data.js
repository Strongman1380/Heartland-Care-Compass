// Script to check for existing school data in the database
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
  console.error('❌ Missing Supabase credentials in environment variables')
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓ Found' : '✗ Missing')
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Found' : '✗ Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchoolData() {
  console.log('🔍 Checking School Data in Database...\n')
  console.log('=' .repeat(60))

  try {
    // 1. Check school_daily_scores
    console.log('\n📊 SCHOOL DAILY SCORES')
    console.log('-'.repeat(60))
    const { data: dailyScores, error: dailyError, count: dailyCount } = await supabase
      .from('school_daily_scores')
      .select('*', { count: 'exact', head: false })
      .order('date', { ascending: false })
      .limit(10)

    if (dailyError) {
      console.error('❌ Error querying school_daily_scores:', dailyError.message)
    } else {
      console.log(`✓ Total records: ${dailyCount || 0}`)
      if (dailyScores && dailyScores.length > 0) {
        console.log(`✓ Showing latest ${dailyScores.length} records:\n`)
        dailyScores.forEach((score, idx) => {
          console.log(`  ${idx + 1}. Youth ID: ${score.youth_id.substring(0, 8)}...`)
          console.log(`     Date: ${score.date}, Weekday: ${score.weekday}, Score: ${score.score}`)
          console.log(`     Created: ${new Date(score.created_at).toLocaleString()}`)
        })
      } else {
        console.log('⚠️  No records found')
      }
    }

    // 2. Check academic_credits
    console.log('\n\n🎓 ACADEMIC CREDITS')
    console.log('-'.repeat(60))
    const { data: credits, error: creditsError, count: creditsCount } = await supabase
      .from('academic_credits')
      .select('*', { count: 'exact', head: false })
      .order('date_earned', { ascending: false })
      .limit(5)

    if (creditsError) {
      console.error('❌ Error querying academic_credits:', creditsError.message)
    } else {
      console.log(`✓ Total records: ${creditsCount || 0}`)
      if (credits && credits.length > 0) {
        console.log(`✓ Showing latest ${credits.length} records:\n`)
        credits.forEach((credit, idx) => {
          console.log(`  ${idx + 1}. Student ID: ${credit.student_id.substring(0, 8)}...`)
          console.log(`     Date Earned: ${credit.date_earned}, Credits: ${credit.credit_value}`)
          console.log(`     Subject: ${credit.subject || 'N/A'}`)
        })
      } else {
        console.log('⚠️  No records found')
      }
    }

    // 3. Check academic_grades
    console.log('\n\n📝 ACADEMIC GRADES')
    console.log('-'.repeat(60))
    const { data: grades, error: gradesError, count: gradesCount } = await supabase
      .from('academic_grades')
      .select('*', { count: 'exact', head: false })
      .order('date_entered', { ascending: false })
      .limit(5)

    if (gradesError) {
      console.error('❌ Error querying academic_grades:', gradesError.message)
    } else {
      console.log(`✓ Total records: ${gradesCount || 0}`)
      if (grades && grades.length > 0) {
        console.log(`✓ Showing latest ${grades.length} records:\n`)
        grades.forEach((grade, idx) => {
          console.log(`  ${idx + 1}. Student ID: ${grade.student_id.substring(0, 8)}...`)
          console.log(`     Date: ${grade.date_entered}, Grade: ${grade.grade_value}%`)
          console.log(`     Subject: ${grade.subject || 'N/A'}, Assignment: ${grade.assignment_name || 'N/A'}`)
        })
      } else {
        console.log('⚠️  No records found')
      }
    }

    // 4. Check academic_steps_completed
    console.log('\n\n👣 ACADEMIC STEPS COMPLETED')
    console.log('-'.repeat(60))
    const { data: steps, error: stepsError, count: stepsCount } = await supabase
      .from('academic_steps_completed')
      .select('*', { count: 'exact', head: false })
      .order('date_completed', { ascending: false })
      .limit(5)

    if (stepsError) {
      console.error('❌ Error querying academic_steps_completed:', stepsError.message)
    } else {
      console.log(`✓ Total records: ${stepsCount || 0}`)
      if (steps && steps.length > 0) {
        console.log(`✓ Showing latest ${steps.length} records:\n`)
        steps.forEach((step, idx) => {
          console.log(`  ${idx + 1}. Student ID: ${step.student_id.substring(0, 8)}...`)
          console.log(`     Date: ${step.date_completed}, Steps: ${step.steps_count}`)
          console.log(`     Subject: ${step.subject || 'N/A'}`)
        })
      } else {
        console.log('⚠️  No records found')
      }
    }

    // 5. Check school_incident_reports
    console.log('\n\n🚨 SCHOOL INCIDENT REPORTS')
    console.log('-'.repeat(60))
    const { data: incidents, error: incidentsError, count: incidentsCount } = await supabase
      .from('school_incident_reports')
      .select('*', { count: 'exact', head: false })
      .is('deleted_at', null)
      .order('date_time', { ascending: false })
      .limit(5)

    if (incidentsError) {
      console.error('❌ Error querying school_incident_reports:', incidentsError.message)
    } else {
      console.log(`✓ Total records: ${incidentsCount || 0}`)
      if (incidents && incidents.length > 0) {
        console.log(`✓ Showing latest ${incidents.length} records:\n`)
        incidents.forEach((incident, idx) => {
          console.log(`  ${idx + 1}. Incident ID: ${incident.incident_id}`)
          console.log(`     Date/Time: ${new Date(incident.date_time).toLocaleString()}`)
          console.log(`     Type: ${incident.incident_type}, Severity: ${incident.severity}`)
          console.log(`     Location: ${incident.location}`)
          console.log(`     Summary: ${incident.summary.substring(0, 60)}...`)
        })
      } else {
        console.log('⚠️  No records found')
      }
    }

    // 6. Summary by Youth
    console.log('\n\n👥 SUMMARY BY YOUTH')
    console.log('-'.repeat(60))
    const { data: youthList, error: youthError } = await supabase
      .from('youth')
      .select('id, firstName, lastName')
      .order('firstName')

    if (youthError) {
      console.error('❌ Error querying youth:', youthError.message)
    } else if (youthList && youthList.length > 0) {
      console.log(`✓ Found ${youthList.length} youth in system\n`)
      
      for (const youth of youthList) {
        const { count: scoresCount } = await supabase
          .from('school_daily_scores')
          .select('*', { count: 'exact', head: true })
          .eq('youth_id', youth.id)

        const { count: creditsCount } = await supabase
          .from('academic_credits')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', youth.id)

        const { count: gradesCount } = await supabase
          .from('academic_grades')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', youth.id)

        const { count: stepsCount } = await supabase
          .from('academic_steps_completed')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', youth.id)

        const totalRecords = (scoresCount || 0) + (creditsCount || 0) + (gradesCount || 0) + (stepsCount || 0)

        if (totalRecords > 0) {
          console.log(`  📌 ${youth.firstName} ${youth.lastName}:`)
          console.log(`     - Daily Scores: ${scoresCount || 0}`)
          console.log(`     - Credits: ${creditsCount || 0}`)
          console.log(`     - Grades: ${gradesCount || 0}`)
          console.log(`     - Steps: ${stepsCount || 0}`)
          console.log(`     - Total: ${totalRecords} records`)
        }
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Data check complete!\n')

  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run the check
checkSchoolData()