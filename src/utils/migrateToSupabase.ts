import { STORAGE_KEYS, getItem } from '@/utils/local-storage-utils'
import type { Youth as LocalYouth, BehaviorPoints as LocalBehaviorPoints, CaseNote as LocalCaseNote } from '@/types/app-types'
import { youthService, behaviorPointsService, caseNotesService } from '@/integrations/firebase/services'

export type MigrationResult = {
  success: boolean
  message: string
  details: {
    youthMigrated: number
    behaviorPointsMigrated: number
    caseNotesMigrated: number
    errors: string[]
  }
}

export function checkLocalStorageData() {
  const youths = (getItem<LocalYouth[]>(STORAGE_KEYS.YOUTHS) || [])
  const points = (getItem<LocalBehaviorPoints[]>(STORAGE_KEYS.POINTS) || [])
  const caseNotes = (getItem<LocalCaseNote[]>(STORAGE_KEYS.CASE_NOTES) || [])

  return {
    hasData: youths.length > 0 || points.length > 0 || caseNotes.length > 0,
    youthCount: youths.length,
    behaviorPointsCount: points.length,
    caseNotesCount: caseNotes.length,
  }
}

// Map local Youth shape to Supabase youth insert/update payload
function mapYouth(local: LocalYouth) {
  // Normalize date fields to ISO strings
  const toIso = (d?: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : null)

  return {
    id: local.id, // preserve ID so related records continue to match
    firstName: local.firstName,
    lastName: local.lastName,
    dob: toIso(local.dob) as string | null,
    age: local.age ?? null,
    admissionDate: toIso(local.admissionDate) as string | null,
    level: typeof local.level === 'number' ? local.level : 1,
    referralSource: local.referralSource ?? null,
    referralReason: local.referralReason ?? null,

    // Detailed personal/contact
    sex: (local.sex as any) ?? null,
    race: local.race ?? null,
    religion: local.religion ?? null,
    placeOfBirth: local.placeOfBirth ?? null,
    socialSecurityNumber: local.socialSecurityNumber ?? null,
    address: local.address ? {
      street: local.address.street ?? null,
      city: local.address.city ?? null,
      state: local.address.state ?? null,
      zip: local.address.zip ?? null,
    } : null,
    physicalDescription: local.physicalDescription ? {
      height: local.physicalDescription.height ?? null,
      weight: local.physicalDescription.weight ?? null,
      hairColor: local.physicalDescription.hairColor ?? null,
      eyeColor: local.physicalDescription.eyeColor ?? null,
      tattoosScars: local.physicalDescription.tattoosScars ?? null,
    } : null,

    // Guardianship and contacts
    legalGuardian: local.legalGuardian ? {
      name: local.legalGuardian.name ?? null,
      phone: local.legalGuardian.phone ?? null,
      contact: local.legalGuardian.contact ?? null,
      relationship: local.legalGuardian.relationship ?? null,
    } : null,
    guardianRelationship: local.guardianRelationship ?? null,
    guardianContact: local.guardianContact ?? null,
    guardianPhone: local.guardianPhone ?? null,
    guardianEmail: local.guardianEmail ?? null,
    probationOfficer: local.probationOfficer ? {
      name: local.probationOfficer.name ?? null,
      phone: local.probationOfficer.phone ?? null,
      email: local.probationOfficer.email ?? null,
      contact: local.probationOfficer.contact ?? null,
    } : null,
    probationContact: local.probationContact ?? null,
    probationPhone: local.probationPhone ?? null,
    placementAuthority: local.placementAuthority ?? null,
    estimatedStay: local.estimatedStay ?? null,

    // Education
    currentSchool: local.currentSchool ?? null,
    grade: local.grade ?? null,
    hasIEP: local.hasIEP ?? null,
    academicStrengths: local.academicStrengths ?? null,
    academicChallenges: local.academicChallenges ?? null,
    educationGoals: local.educationGoals ?? null,
    schoolContact: local.schoolContact ?? null,
    schoolPhone: local.schoolPhone ?? null,

    // Medical
    physician: local.physician ?? null,
    physicianPhone: local.physicianPhone ?? null,
    insuranceProvider: local.insuranceProvider ?? null,
    policyNumber: local.policyNumber ?? null,
    medicalConditions: local.medicalConditions ?? null,
    medicalRestrictions: local.medicalRestrictions ?? null,
    allergies: local.allergies ?? null,

    // Mental health
    currentDiagnoses: local.currentDiagnoses ?? null,
    diagnoses: local.diagnoses ?? null,
    traumaHistory: local.traumaHistory ?? null,
    previousTreatment: local.previousTreatment ?? null,
    currentCounseling: local.currentCounseling ?? null,
    therapistName: local.therapistName ?? null,
    therapistContact: local.therapistContact ?? null,
    sessionFrequency: local.sessionFrequency ?? null,
    sessionTime: local.sessionTime ?? null,
    selfHarmHistory: local.selfHarmHistory ?? null,
    lastIncidentDate: local.lastIncidentDate ?? null,
    hasSafetyPlan: local.hasSafetyPlan ?? null,

    // Behavior tracking
    onSubsystem: local.onSubsystem ?? null,
    pointsInCurrentLevel: local.pointsInCurrentLevel ?? null,
    dailyPointsForPrivileges: local.dailyPointsForPrivileges ?? null,

    // HYRNA
    hyrnaRiskLevel: local.hyrnaRiskLevel ?? null,
    hyrnaScore: local.hyrnaScore ?? null,
    hyrnaAssessmentDate: local.hyrnaAssessmentDate ? new Date(local.hyrnaAssessmentDate).toISOString().slice(0,10) : null,
  } as const
}

export async function migrateLocalStorageToSupabase(): Promise<MigrationResult> {
  const errors: string[] = []
  let youthMigrated = 0
  let behaviorPointsMigrated = 0
  let caseNotesMigrated = 0

  const youths = (getItem<LocalYouth[]>(STORAGE_KEYS.YOUTHS) || [])
  const points = (getItem<LocalBehaviorPoints[]>(STORAGE_KEYS.POINTS) || [])
  const caseNotes = (getItem<LocalCaseNote[]>(STORAGE_KEYS.CASE_NOTES) || [])

  try {
    // Migrate youth
    for (const y of youths) {
      try {
        // Check if exists first
        const existing = await youthService.getById(y.id)
        const payload = mapYouth(y) as any
        if (existing) {
          await youthService.update(y.id, payload)
        } else {
          await youthService.create(payload)
        }
        youthMigrated++
      } catch (e: any) {
        errors.push(`Youth ${y.firstName} ${y.lastName}: ${e?.message || e}`)
      }
    }

    // Migrate behavior points
    for (const p of points) {
      try {
        await behaviorPointsService.upsert({
          id: p.id,
          youth_id: p.youth_id,
          date: p.date ? new Date(p.date).toISOString().slice(0,10) : null,
          morningPoints: Number(p.morningPoints ?? 0),
          afternoonPoints: Number(p.afternoonPoints ?? 0),
          eveningPoints: Number(p.eveningPoints ?? 0),
          totalPoints: Number(p.totalPoints ?? 0),
          comments: p.comments ?? null,
        } as any)
        behaviorPointsMigrated++
      } catch (e: any) {
        errors.push(`Behavior points ${p.id}: ${e?.message || e}`)
      }
    }

    // Migrate case notes
    for (const n of caseNotes) {
      try {
        await caseNotesService.create({
          id: n.id,
          youth_id: n.youth_id,
          date: n.date ? new Date(n.date).toISOString().slice(0,10) : null,
          summary: n.summary ?? null,
          note: n.note ?? null,
          staff: n.staff ?? null,
        } as any)
        caseNotesMigrated++
      } catch (e: any) {
        // If duplicate id, try update
        try {
          await caseNotesService.update(n.id, {
            date: n.date ? new Date(n.date).toISOString().slice(0,10) : null,
            summary: n.summary ?? null,
            note: n.note ?? null,
            staff: n.staff ?? null,
          } as any)
          caseNotesMigrated++
        } catch (e2: any) {
          errors.push(`Case note ${n.id}: ${e2?.message || e2}`)
        }
      }
    }

    const success = errors.length === 0
    return {
      success,
      message: success ? 'Migration completed successfully' : 'Migration completed with some errors',
      details: {
        youthMigrated,
        behaviorPointsMigrated,
        caseNotesMigrated,
        errors,
      }
    }
  } catch (e: any) {
    return {
      success: false,
      message: e?.message || 'Migration failed',
      details: {
        youthMigrated,
        behaviorPointsMigrated,
        caseNotesMigrated,
        errors: [...errors, e?.message || String(e)],
      }
    }
  }
}

