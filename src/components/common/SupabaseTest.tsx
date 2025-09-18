import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabaseUtils, youthService } from '@/integrations/supabase/services'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export const SupabaseTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle')
  const [stats, setStats] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setConnectionStatus('testing')
    setError(null)
    
    try {
      // Test basic connection
      const isConnected = await supabaseUtils.testConnection()
      
      if (!isConnected) {
        throw new Error('Failed to connect to Supabase')
      }

      // Get database stats
      const dbStats = await supabaseUtils.getStats()
      setStats(dbStats)
      
      setConnectionStatus('connected')
    } catch (err) {
      console.error('Supabase connection test failed:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setConnectionStatus('failed')
    }
  }

  const createTestYouth = async () => {
    try {
      const testYouth = await youthService.create({
        firstName: 'Test',
        lastName: 'Youth',
        level: 1,
        pointTotal: 0
      })
      
      console.log('Test youth created:', testYouth)
      
      // Refresh stats
      const dbStats = await supabaseUtils.getStats()
      setStats(dbStats)
      
      alert('Test youth created successfully!')
    } catch (err) {
      console.error('Failed to create test youth:', err)
      alert('Failed to create test youth: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const upsertChanceThaller = async () => {
    try {
      // Try to find existing youth by name
      const existing = (await youthService.searchByName('Chance'))
        .find(y => y.firstName.toLowerCase() === 'chance' && y.lastName.toLowerCase() === 'thaller') || null

      const payload: any = {
        firstName: 'Chance',
        lastName: 'Thaller',
        dob: '2010-02-15',
        age: 15,
        sex: 'M',
        socialSecurityNumber: '505-57-1422',
        placeOfBirth: 'Lincoln, NE',
        race: 'Caucasian',
        address: {
          street: '6733 Francis St', city: 'Lincoln', state: 'NE', zip: '68505'
        },
        physicalDescription: {
          height: "5'9\"", weight: '130 lbs', hairColor: 'Blonde', eyeColor: 'Blue', tattoosScars: 'None noted'
        },
        admissionDate: '2025-07-29',
        admissionTime: '08:30 AM',
        rcsIn: null,
        dischargeDate: null,
        dischargeTime: null,
        rcsOut: null,
        mother: { name: 'Kathy Thaller', phone: '(402) 450-4367' },
        father: { name: 'Harry “Joe” Thaller', phone: '(402) 450-1470' },
        legalGuardian: { name: 'Kathy Thaller', phone: '(402) 450-4367' },
        nextOfKin: { name: 'Kathy Thaller', relationship: 'Mother', phone: '(402) 450-4367' },
        placingAgencyCounty: 'Lancaster County Probation, District 3J',
        probationOfficer: { name: 'Jared MacLeod', phone: '(402) 318-9666', email: 'jared.macleod@nejudicial.gov' },
        caseworker: { name: null, phone: null },
        guardianAdLitem: { name: null, phone: null },
        attorney: 'Jacinta Dai-Klabunde',
        judge: 'Judge Heideman',
        allergies: 'None reported',
        currentMedications: 'None',
        significantHealthConditions: 'ADHD',
        physician: null,
        physicianPhone: null,
        insuranceProvider: 'UMR / Molina Healthcare',
        policyNumber: '27967601 / Medicaid# 01980250401',
        medicalConditions: 'ADHD',
        medicalRestrictions: 'None noted',
        religion: 'Christian',
        lastSchoolAttended: 'Lincoln Northeast High School (Transition Program)',
        hasIEP: true,
        currentGrade: '9th',
        currentSchool: 'Lincoln Northeast HS',
        academicStrengths: 'Math, Sports involvement',
        academicChallenges: 'Focus, consistency, attendance',
        educationGoals: 'Remain on track for graduation',
        schoolContact: null,
        schoolPhone: null,
        getAlongWithOthers: 'Inconsistent; better when not peer-influenced',
        strengthsTalents: 'Sports (baseball, football), personable, humorous',
        interests: 'Fishing, cooking, video games',
        behaviorProblems: 'ADHD-related impulsivity, verbal aggression, lying, hyperactivity, property destruction, manipulative tendencies',
        dislikesAboutSelf: null,
        angerTriggers: 'Repeated questions, people talking about him',
        historyPhysicallyHurting: false,
        historyVandalism: true,
        gangInvolvement: false,
        familyViolentCrimes: false,
        tobaccoPast6To12Months: false,
        alcoholPast6To12Months: false,
        drugsVapingMarijuanaPast6To12Months: true,
        drugTestingDates: 'Positive during probation (exact dates in PO file)',
        communityResources: {
          dayTreatmentServices: false,
          intensiveInHomeServices: 'Yes (MST)',
          daySchoolPlacement: 'Yes (alternative school program)',
          oneOnOneSchoolCounselor: null,
          mentalHealthSupportServices: 'Counseling via Bloom Counseling eval',
          other: 'GPS monitoring (multiple times)'
        },
        // Mental health
        currentDiagnoses: 'ADHD',
        diagnoses: 'ADHD (formal)',
        traumaHistory: null,
        previousTreatment: 'Evaluated at Bloom Counseling',
        currentCounseling: ['None active'],
        therapistName: null,
        therapistContact: null,
        sessionFrequency: null,
        sessionTime: null,
        selfHarmHistory: [],
        lastIncidentDate: null,
        hasSafetyPlan: false,
        // Treatment focus areas
        treatmentFocus: {
          excessiveDependency: false,
          withdrawalIsolation: 'Occasional',
          parentChildRelationship: 'Strained but engaged',
          peerRelationship: 'Negative peer influence',
          acceptanceOfAuthority: 'Struggles, defiant',
          lying: true,
          poorAcademicAchievement: true,
          poorSelfEsteem: null,
          manipulativeBehavior: true,
          propertyDestruction: true,
          hyperactivity: true,
          anxiety: null,
          verbalAggression: true,
          assaultiveBehavior: false,
          depression: null,
          stealing: null
        },
        // Discharge plan
        dischargePlan: {
          parents: 'Return to mother (Kathy Thaller)',
          relativeName: null,
          relativeRelationship: null,
          regularFosterCare: false,
          estimatedLengthOfStayMonths: '6–8 months'
        },
        // Emergency shelter care
        emergencyShelterCare: {
          legalGuardianInfo: 'Kathy Thaller, (402) 450-4367',
          parentsNotified: true,
          immediateNeeds: 'Structure, accountability, educational stability',
          placingAgencyIndividual: 'Jared MacLeod, Probation Officer',
          placementDate: '2025-07-29',
          placementTime: '08:30 AM',
          reasonForPlacement: 'Non-compliance with probation/home placement; requires structured care',
          intakeWorkerObservation: null,
          orientationCompletedBy: null,
          orientationDate: '2025-07-29',
          orientationTime: null
        },
        estimatedStay: '6–8 months',
        level: existing?.level ?? 1,
        pointTotal: existing?.pointTotal ?? 0
      }

      let result
      if (existing) {
        result = await youthService.update(existing.id, payload)
      } else {
        result = await youthService.create(payload)
      }

      // Refresh stats
      const dbStats = await supabaseUtils.getStats()
      setStats(dbStats)

      alert(`Chance Thaller ${existing ? 'updated' : 'created'} successfully.`)
      console.log('Chance Thaller upsert:', result)
    } catch (err) {
      console.error('Failed to upsert Chance Thaller:', err)
      alert('Failed to upsert Chance Thaller: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  useEffect(() => {
    // Auto-test connection on component mount
    testConnection()
  }, [])

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Badge variant="secondary">Testing...</Badge>
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Connected</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Not Tested</Badge>
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Supabase Connection Test
        </CardTitle>
        <CardDescription>
          Test the connection to your Supabase database
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          {getStatusBadge()}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {stats && (
          <div className="space-y-2">
            <h4 className="font-medium">Database Stats:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Youth: {stats.youth}</div>
              <div>Behavior Points: {stats.behaviorPoints}</div>
              <div>Case Notes: {stats.caseNotes}</div>
              <div>Daily Ratings: {stats.dailyRatings}</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={testConnection} 
            disabled={connectionStatus === 'testing'}
            variant="outline"
            size="sm"
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </Button>
          
          {connectionStatus === 'connected' && (
            <Button 
              onClick={createTestYouth}
              size="sm"
            >
              Create Test Youth
            </Button>
          )}
          {connectionStatus === 'connected' && (
            <Button onClick={upsertChanceThaller} size="sm" variant="default">
              Create/Update Chance Thaller
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SupabaseTest
