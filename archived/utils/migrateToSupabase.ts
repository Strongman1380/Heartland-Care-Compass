import { youthService, behaviorPointsService, caseNotesService } from '@/integrations/supabase/services'
import { fetchAllYouths, fetchBehaviorPoints, fetchCaseNotes } from '@/utils/local-storage-utils'
import { format } from 'date-fns'

export interface MigrationResult {
  success: boolean
  message: string
  details: {
    youthMigrated: number
    behaviorPointsMigrated: number
    caseNotesMigrated: number
    errors: string[]
  }
}

export const migrateLocalStorageToSupabase = async (): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    message: '',
    details: {
      youthMigrated: 0,
      behaviorPointsMigrated: 0,
      caseNotesMigrated: 0,
      errors: []
    }
  }

  try {
    console.log('Starting migration from local storage to Supabase...')

    // Step 1: Migrate Youth profiles
    console.log('Migrating youth profiles...')
    const localYouths = fetchAllYouths()
    
    for (const youth of localYouths) {
      try {
        // Convert local youth data to Supabase format
        const supabaseYouth = {
          firstName: youth.firstName,
          lastName: youth.lastName,
          dob: youth.dob ? format(new Date(youth.dob), 'yyyy-MM-dd') : null,
          age: youth.age || null,
          sex: youth.sex || null,
          socialSecurityNumber: youth.socialSecurityNumber || null,
          placeOfBirth: youth.placeOfBirth || null,
          race: youth.race || null,
          address: youth.address || null,
          physicalDescription: youth.physicalDescription || null,
          admissionDate: youth.admissionDate ? format(new Date(youth.admissionDate), 'yyyy-MM-dd') : null,
          admissionTime: youth.admissionTime || null,
          rcsIn: youth.rcsIn || null,
          dischargeDate: youth.dischargeDate ? format(new Date(youth.dischargeDate), 'yyyy-MM-dd') : null,
          dischargeTime: youth.dischargeTime || null,
          rcsOut: youth.rcsOut || null,
          mother: youth.mother || null,
          father: youth.father || null,
          legalGuardian: youth.legalGuardian || null,
          nextOfKin: youth.nextOfKin || null,
          placingAgencyCounty: youth.placingAgencyCounty || null,
          probationOfficer: youth.probationOfficer || null,
          caseworker: youth.caseworker || null,
          guardianAdLitem: youth.guardianAdLitem || null,
          attorney: youth.attorney || null,
          judge: youth.judge || null,
          allergies: youth.allergies || null,
          currentMedications: youth.currentMedications || null,
          significantHealthConditions: youth.significantHealthConditions || null,
          religion: youth.religion || null,
          lastSchoolAttended: youth.lastSchoolAttended || null,
          hasIEP: youth.hasIEP || false,
          currentGrade: youth.currentGrade || null,
          getAlongWithOthers: youth.getAlongWithOthers || null,
          strengthsTalents: youth.strengthsTalents || null,
          interests: youth.interests || null,
          behaviorProblems: youth.behaviorProblems || null,
          dislikesAboutSelf: youth.dislikesAboutSelf || null,
          angerTriggers: youth.angerTriggers || null,
          historyPhysicallyHurting: youth.historyPhysicallyHurting || false,
          historyVandalism: youth.historyVandalism || false,
          gangInvolvement: youth.gangInvolvement || false,
          familyViolentCrimes: youth.familyViolentCrimes || false,
          tobaccoPast6To12Months: youth.tobaccoPast6To12Months || false,
          alcoholPast6To12Months: youth.alcoholPast6To12Months || false,
          drugsVapingMarijuanaPast6To12Months: youth.drugsVapingMarijuanaPast6To12Months || false,
          drugTestingDates: youth.drugTestingDates || null,
          communityResources: youth.communityResources || null,
          treatmentFocus: youth.treatmentFocus || null,
          dischargePlan: youth.dischargePlan || null,
          emergencyShelterCare: youth.emergencyShelterCare ? {
            ...youth.emergencyShelterCare,
            placementDate: youth.emergencyShelterCare.placementDate ? format(new Date(youth.emergencyShelterCare.placementDate), 'yyyy-MM-dd') : null,
            orientationDate: youth.emergencyShelterCare.orientationDate ? format(new Date(youth.emergencyShelterCare.orientationDate), 'yyyy-MM-dd') : null
          } : null,
          profilePhoto: youth.profilePhoto || null,
          level: youth.level || 1,
          pointTotal: youth.pointTotal || 0,
          referralSource: youth.referralSource || null,
          referralReason: youth.referralReason || null,
          educationInfo: youth.educationInfo || null,
          medicalInfo: youth.medicalInfo || null,
          mentalHealthInfo: youth.mentalHealthInfo || null,
          legalStatus: youth.legalStatus || null,
          peerInteraction: youth.peerInteraction || null,
          adultInteraction: youth.adultInteraction || null,
          investmentLevel: youth.investmentLevel || null,
          dealAuthority: youth.dealAuthority || null,
          hyrnaRiskLevel: youth.hyrnaRiskLevel || null,
          hyrnaScore: youth.hyrnaScore || null,
          hyrnaAssessmentDate: youth.hyrnaAssessmentDate ? format(new Date(youth.hyrnaAssessmentDate), 'yyyy-MM-dd') : null,
          idNumber: youth.idNumber || null,
          guardianRelationship: youth.guardianRelationship || null,
          guardianContact: youth.guardianContact || null,
          guardianPhone: youth.guardianPhone || null,
          guardianEmail: youth.guardianEmail || null,
          probationContact: youth.probationContact || null,
          probationPhone: youth.probationPhone || null,
          placementAuthority: youth.placementAuthority || null,
          estimatedStay: youth.estimatedStay || null,
          priorPlacements: youth.priorPlacements || null,
          numPriorPlacements: youth.numPriorPlacements || null,
          lengthRecentPlacement: youth.lengthRecentPlacement || null,
          courtInvolvement: youth.courtInvolvement || null,
          currentSchool: youth.currentSchool || null,
          grade: youth.grade || null,
          academicStrengths: youth.academicStrengths || null,
          academicChallenges: youth.academicChallenges || null,
          educationGoals: youth.educationGoals || null,
          schoolContact: youth.schoolContact || null,
          schoolPhone: youth.schoolPhone || null,
          physician: youth.physician || null,
          physicianPhone: youth.physicianPhone || null,
          insuranceProvider: youth.insuranceProvider || null,
          policyNumber: youth.policyNumber || null,
          medicalConditions: youth.medicalConditions || null,
          medicalRestrictions: youth.medicalRestrictions || null,
          currentDiagnoses: youth.currentDiagnoses || null,
          diagnoses: youth.diagnoses || null,
          traumaHistory: youth.traumaHistory || null,
          previousTreatment: youth.previousTreatment || null,
          currentCounseling: youth.currentCounseling || null,
          therapistName: youth.therapistName || null,
          therapistContact: youth.therapistContact || null,
          sessionFrequency: youth.sessionFrequency || null,
          sessionTime: youth.sessionTime || null,
          selfHarmHistory: youth.selfHarmHistory || null,
          lastIncidentDate: youth.lastIncidentDate ? format(new Date(youth.lastIncidentDate), 'yyyy-MM-dd') : null,
          hasSafetyPlan: youth.hasSafetyPlan || false,
          onSubsystem: youth.onSubsystem || false,
          pointsInCurrentLevel: youth.pointsInCurrentLevel || null,
          dailyPointsForPrivileges: youth.dailyPointsForPrivileges || null
        }

        const createdYouth = await youthService.create(supabaseYouth)
        result.details.youthMigrated++
        console.log(`Migrated youth: ${youth.firstName} ${youth.lastName}`)

        // Step 2: Migrate behavior points for this youth
        try {
          const behaviorPoints = fetchBehaviorPoints(youth.id)
          for (const points of behaviorPoints) {
            const supabasePoints = {
              youth_id: createdYouth.id,
              date: format(new Date(points.date), 'yyyy-MM-dd'),
              morningPoints: points.morningPoints || 0,
              afternoonPoints: points.afternoonPoints || 0,
              eveningPoints: points.eveningPoints || 0,
              totalPoints: points.totalPoints || 0,
              comments: points.comments || null
            }
            await behaviorPointsService.upsert(supabasePoints)
            result.details.behaviorPointsMigrated++
          }
        } catch (error) {
          console.warn(`Failed to migrate behavior points for ${youth.firstName} ${youth.lastName}:`, error)
          result.details.errors.push(`Behavior points migration failed for ${youth.firstName} ${youth.lastName}`)
        }

        // Step 3: Migrate case notes for this youth
        try {
          const caseNotes = fetchCaseNotes(youth.id)
          for (const note of caseNotes) {
            const supabaseNote = {
              youth_id: createdYouth.id,
              date: format(new Date(note.date), 'yyyy-MM-dd'),
              summary: note.summary || null,
              note: note.note || null,
              staff: note.staff || null
            }
            await caseNotesService.create(supabaseNote)
            result.details.caseNotesMigrated++
          }
        } catch (error) {
          console.warn(`Failed to migrate case notes for ${youth.firstName} ${youth.lastName}:`, error)
          result.details.errors.push(`Case notes migration failed for ${youth.firstName} ${youth.lastName}`)
        }

      } catch (error) {
        console.error(`Failed to migrate youth ${youth.firstName} ${youth.lastName}:`, error)
        result.details.errors.push(`Youth migration failed for ${youth.firstName} ${youth.lastName}: ${error}`)
      }
    }

    result.success = true
    result.message = `Migration completed successfully! Migrated ${result.details.youthMigrated} youth profiles, ${result.details.behaviorPointsMigrated} behavior point records, and ${result.details.caseNotesMigrated} case notes.`
    
    if (result.details.errors.length > 0) {
      result.message += ` ${result.details.errors.length} errors occurred during migration.`
    }

    console.log('Migration completed:', result)
    return result

  } catch (error) {
    result.success = false
    result.message = `Migration failed: ${error}`
    result.details.errors.push(`General migration error: ${error}`)
    console.error('Migration failed:', error)
    return result
  }
}

export const checkLocalStorageData = () => {
  try {
    const youths = fetchAllYouths()
    
    // Check if this is just automatically seeded mock data
    const isMockSeeded = localStorage.getItem('heartland_mock_seeded') === 'true'
    const hasRealData = youths.length > 0 && !isMockSeeded
    
    // If only mock data exists, don't count it as real data to migrate
    if (isMockSeeded && youths.length > 0) {
      // Check if there's any data that wasn't part of the initial seeding
      // This is a basic check - in a real scenario you might track creation timestamps
      const realYouths = youths.filter(youth => {
        // Check if this youth has recent data or non-default values that suggest real use
        return youth.updatedAt && new Date(youth.updatedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // Updated in last 24 hours
      })
      
      if (realYouths.length === 0) {
        return {
          hasData: false,
          youthCount: 0,
          behaviorPointsCount: 0,
          caseNotesCount: 0
        }
      }
    }

    let totalBehaviorPoints = 0
    let totalCaseNotes = 0

    youths.forEach(youth => {
      try {
        const behaviorPoints = fetchBehaviorPoints(youth.id)
        totalBehaviorPoints += behaviorPoints.length
      } catch (error) {
        console.warn(`Could not fetch behavior points for ${youth.firstName} ${youth.lastName}`)
      }

      try {
        const caseNotes = fetchCaseNotes(youth.id)
        totalCaseNotes += caseNotes.length
      } catch (error) {
        console.warn(`Could not fetch case notes for ${youth.firstName} ${youth.lastName}`)
      }
    })

    return {
      hasData: hasRealData,
      youthCount: youths.length,
      behaviorPointsCount: totalBehaviorPoints,
      caseNotesCount: totalCaseNotes
    }
  } catch (error) {
    console.error('Error checking local storage data:', error)
    return {
      hasData: false,
      youthCount: 0,
      behaviorPointsCount: 0,
      caseNotesCount: 0
    }
  }
}