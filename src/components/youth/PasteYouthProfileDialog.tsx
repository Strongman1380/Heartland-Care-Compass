import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { Youth } from '@/types/app-types';
import { parseYouthProfileText } from '@/services/aiService';

function normalizeValue(v?: string | null) {
  if (!v) return '';
  const s = v
    .replace(/[\u2018\u2019\u201C\u201D]/g, '"') // curly quotes -> straight
    .replace(/[\u2013\u2014]/g, '-')             // en/em dash -> hyphen
    .trim();
  if (/^\[(not documented|to be filled|tbd)\]$/i.test(s)) return '';
  if (/^(n\/a|na|none|unknown|unspecified|-|—)$/i.test(s)) return '';
  if (/^(unknown|not documented|not provided|not specified|unknown\/?not documented)$/i.test(s)) return '';
  if (/^(unknown\/?not documented)$/i.test(s)) return '';
  if (s.toLowerCase().includes('unknown') || s.toLowerCase().includes('not documented') || s.toLowerCase().includes('not provided')) {
    return '';
  }
  return s;
}

function parseBool(v?: string | null) {
  if (!v) return null;
  const s = normalizeValue(v).toLowerCase();
  if (["yes","y","true"].includes(s)) return true;
  if (["no","n","false"].includes(s)) return false;
  return null;
}

function parseDate(v?: string | null): Date | null {
  if (!v) return null;
  const t = normalizeValue(v);
  // Accept formats like MM/DD/YYYY
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

function assignBooleanOrText(target: any, key: string, raw: string) {
  if (raw === undefined || raw === null) {
    target[key] = null;
    return;
  }
  const bool = parseBool(raw);
  target[key] = bool !== null ? bool : normalizeValue(raw) || null;
}

// Very lightweight line parser for the provided bullet format
function parseYouthFromText(raw: string): Partial<Youth> & { firstName: string; lastName: string } {
  const data: any = {};
  const address: any = {};
  const phys: any = {};
  const mother: any = {};
  const father: any = {};
  const guardian: any = {};
  const nok: any = {};
  const po: any = {};
  const caseworker: any = {};
  const gal: any = {};
  const dischargePlan: any = {};
  const esc: any = {};
  const community: any = {};
  const treatmentFocus: any = {};

  const lines = raw
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*[•\-\u2022]\s*/, '').trim())
    .filter(Boolean);

  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    const value = normalizeValue(m[2]);

    switch (key.toLowerCase()) {
      case 'first name': data.firstName = value; break;
      case 'last name': data.lastName = value; break;
      case 'dob':
      case 'date of birth': data.dob = parseDate(value); break;
      case 'gender': data.sex = (value as any) || null; break;
      case 'age': data.age = Number(value) || null; break;
      case 'sex': data.sex = (value as any) || null; break;
      case 'social security number': data.socialSecurityNumber = value || null; break;
      case 'place of birth': data.placeOfBirth = value || null; break;
      case 'race': data.race = value || null; break;

      case 'street address': address.street = value; break;
      case 'city': address.city = value; break;
      case 'state': address.state = value; break;
      case 'zip code':
      case 'zipcode':
      case 'zip': address.zip = value; break;
      case 'address': {
        // Parse single-line address into parts if possible
        const parts = value.split(',');
        if (parts.length >= 3) {
          address.street = parts[0].trim();
          address.city = parts[1].trim();
          const stz = parts.slice(2).join(',').trim();
          const m2 = stz.match(/([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)/);
          if (m2) { address.state = m2[1]; address.zip = m2[2]; }
          else address.state = stz;
        }
        break;
      }

      case 'height': phys.height = value; break;
      case 'weight': phys.weight = value; break;
      case 'hair color': phys.hairColor = value; break;
      case 'eye color': phys.eyeColor = value; break;
      case 'tattoos/scars': phys.tattoosScars = value; break;

      case 'admission date': data.admissionDate = parseDate(value); break;
      case 'admission time': data.admissionTime = value || null; break;
      case 'rcs in': data.rcsIn = value || null; break;
      case 'discharge date': data.dischargeDate = parseDate(value); break;
      case 'discharge time': data.dischargeTime = value || null; break;
      case 'rcs out': data.rcsOut = value || null; break;

      case 'mother name': mother.name = value; break;
      case 'mother phone': mother.phone = value; break;
      case 'father name': father.name = value; break;
      case 'father phone': father.phone = value; break;
      case 'legal guardian name':
      case 'legal guardian': guardian.name = value; break;
      case 'legal guardian phone': guardian.phone = value; break;
      case 'next of kin name': nok.name = value; break;
      case 'next of kin relationship': nok.relationship = value; break;
      case 'next of kin phone': nok.phone = value; break;

      case 'placing agency/county': data.placingAgencyCounty = value; break;
      case 'probation officer name':
      case 'probation officer': po.name = value; break;
      case 'probation officer phone': po.phone = value; break;
      case 'probation officer email': po.email = value; break;
      case 'caseworker name':
      case 'caseworker': caseworker.name = value || null; break;
      case 'caseworker phone': caseworker.phone = value || null; break;
      case 'guardian ad litem name':
      case 'guardian ad litem': gal.name = value || null; break;
      case 'guardian ad litem phone': gal.phone = value || null; break;
      case 'attorney': data.attorney = value || null; break;
      case 'judge': data.judge = value || null; break;

      case 'allergies': data.allergies = value || null; break;
      case 'current medications': data.currentMedications = value || null; break;
      case 'significant health conditions': data.significantHealthConditions = value || null; break;
      case 'physician name': data.physician = value || null; break;
      case 'physician phone': data.physicianPhone = value || null; break;
      case 'insurance provider': data.insuranceProvider = value || null; break;
      case 'policy number': data.policyNumber = value || null; break;
      case 'medical conditions': data.medicalConditions = value || null; break;
      case 'medical restrictions': data.medicalRestrictions = value || null; break;

      case 'religion': data.religion = value || null; break;
      case 'last school attended': data.lastSchoolAttended = value || null; break;
      case 'has iep':
      case 'iep': data.hasIEP = parseBool(value); break;
      case 'current grade':
      case 'grade':
        data.currentGrade = value || null;
        (data as any).grade = value || null;
        break;
      case 'current school':
      case 'school': data.currentSchool = value || null; break;
      case 'academic strengths': data.academicStrengths = value || null; break;
      case 'academic challenges': data.academicChallenges = value || null; break;
      case 'education goals': data.educationGoals = value || null; break;
      case 'school contact': data.schoolContact = value || null; break;
      case 'school phone': data.schoolPhone = value || null; break;

      case 'get along with others': data.getAlongWithOthers = value || null; break;
      case 'strengths/talents': data.strengthsTalents = value || null; break;
      case 'interests': data.interests = value || null; break;
      case 'behavior problems': data.behaviorProblems = value || null; break;
      case 'dislikes about self': data.dislikesAboutSelf = value || null; break;
      case 'anger triggers': data.angerTriggers = value || null; break;
      case 'history of physically hurting others': data.historyPhysicallyHurting = parseBool(value); break;
      case 'history of vandalism': data.historyVandalism = parseBool(value); break;
      case 'gang involvement': data.gangInvolvement = parseBool(value); break;
      case 'family history of violent crimes': data.familyViolentCrimes = parseBool(value); break;

      case 'tobacco use (past 6–12 months)':
      case 'tobacco use (past 6-12 months)': data.tobaccoPast6To12Months = parseBool(value); break;
      case 'alcohol use (past 6–12 months)':
      case 'alcohol use (past 6-12 months)': data.alcoholPast6To12Months = parseBool(value); break;
      case 'drugs/vaping/marijuana use (past 6–12 months)':
      case 'drugs/vaping/marijuana use (past 6-12 months)': data.drugsVapingMarijuanaPast6To12Months = parseBool(value); break;
      case 'drug testing dates': data.drugTestingDates = value || null; break;

      case 'day treatment services': assignBooleanOrText(community, 'dayTreatmentServices', value); break;
      case 'intensive in-home services': assignBooleanOrText(community, 'intensiveInHomeServices', value); break;
      case 'day school placement': assignBooleanOrText(community, 'daySchoolPlacement', value); break;
      case 'one-on-one school counselor': assignBooleanOrText(community, 'oneOnOneSchoolCounselor', value); break;
      case 'mental health support services': assignBooleanOrText(community, 'mentalHealthSupportServices', value); break;
      case 'other community resources': community.other = value || null; break;

      case 'current diagnoses': data.currentDiagnoses = value || null; break;
      case 'diagnoses': data.diagnoses = value || null; break;
      case 'trauma history': data.traumaHistory = value ? [value] : null; break;
      case 'previous treatment': data.previousTreatment = value || null; break;
      case 'current counseling': data.currentCounseling = value ? [value] : [];
        break;
      case 'therapist name': data.therapistName = value || null; break;
      case 'therapist contact': data.therapistContact = value || null; break;
      case 'session frequency': data.sessionFrequency = value || null; break;
      case 'session time': data.sessionTime = value || null; break;
      case 'self-harm history': data.selfHarmHistory = value ? [value] : []; break;
      case 'last incident date': data.lastIncidentDate = value || null; break;
      case 'has safety plan': data.hasSafetyPlan = parseBool(value); break;

      case 'excessive dependency': assignBooleanOrText(treatmentFocus, 'excessiveDependency', value); break;
      case 'withdrawal/isolation': assignBooleanOrText(treatmentFocus, 'withdrawalIsolation', value); break;
      case 'parent-child relationship': assignBooleanOrText(treatmentFocus, 'parentChildRelationship', value); break;
      case 'peer relationship': assignBooleanOrText(treatmentFocus, 'peerRelationship', value); break;
      case 'acceptance of authority': assignBooleanOrText(treatmentFocus, 'acceptanceOfAuthority', value); break;
      case 'lying': assignBooleanOrText(treatmentFocus, 'lying', value); break;
      case 'poor academic achievement': assignBooleanOrText(treatmentFocus, 'poorAcademicAchievement', value); break;
      case 'poor self-esteem': assignBooleanOrText(treatmentFocus, 'poorSelfEsteem', value); break;
      case 'manipulative behavior': assignBooleanOrText(treatmentFocus, 'manipulative', value); break;
      case 'property destruction': assignBooleanOrText(treatmentFocus, 'propertyDestruction', value); break;
      case 'hyperactivity': assignBooleanOrText(treatmentFocus, 'hyperactivity', value); break;
      case 'anxiety': assignBooleanOrText(treatmentFocus, 'anxiety', value); break;
      case 'verbal aggression': assignBooleanOrText(treatmentFocus, 'verbalAggression', value); break;
      case 'assaultive behavior': assignBooleanOrText(treatmentFocus, 'assaultive', value); break;
      case 'depression': assignBooleanOrText(treatmentFocus, 'depression', value); break;
      case 'stealing': assignBooleanOrText(treatmentFocus, 'stealing', value); break;

      case 'parents (discharge plan)': dischargePlan.parents = value || null; break;
      case 'relative name': dischargePlan.relative = { ...(dischargePlan.relative||{}), name: value || null }; break;
      case 'relative relationship': dischargePlan.relative = { ...(dischargePlan.relative||{}), relationship: value || null }; break;
      case 'regular foster care': dischargePlan.regularFosterCare = parseBool(value); break;
      case 'estimated length of stay (months)':
      case 'estimated length of stay': {
        // Keep original text at root as human-readable range
        data.estimatedStay = value || null;
        // Try to derive a numeric months value if it's a single number, otherwise leave null
        const justNumber = value.match(/\b(\d+)\b/);
        dischargePlan.estimatedLengthOfStayMonths = justNumber ? Number(justNumber[1]) : null;
        break;
      }

      case 'legal guardian info': esc.legalGuardianInfo = value || null; break;
      case 'parents notified': esc.parentsNotified = parseBool(value); break;
      case 'immediate needs': esc.immediateNeeds = value || null; break;
      case 'placing agency individual': esc.placingAgencyIndividual = value || null; break;
      case 'placement date': esc.placementDate = parseDate(value); break;
      case 'placement time': esc.placementTime = value || null; break;
      case 'reason for placement': esc.reasonForPlacement = value || null; break;
      case 'intake worker observation': esc.intakeWorkerObservation = value || null; break;
      case 'orientation completed by': esc.orientationCompletedBy = value || null; break;
      case 'orientation date': esc.orientationDate = parseDate(value); break;
      case 'orientation time': esc.orientationTime = value || null; break;

      case 'profile photo': data.profilePhoto = value || null; break;
      default:
        break;
    }
  }

  if (Object.keys(address).length) data.address = address;
  if (Object.keys(phys).length) data.physicalDescription = phys;
  if (Object.keys(mother).length) data.mother = mother;
  if (Object.keys(father).length) data.father = father;
  if (Object.keys(guardian).length) data.legalGuardian = guardian;
  if (Object.keys(nok).length) data.nextOfKin = nok;
  if (Object.keys(po).length) data.probationOfficer = po;
  if (Object.keys(caseworker).length) data.caseworker = caseworker;
  if (Object.keys(gal).length) data.guardianAdLitem = gal;

  // Build professionals array from parsed legacy fields
  const professionals: any[] = [];
  if (po.name) professionals.push({ type: 'probationOfficer', name: po.name, phone: po.phone || null, email: po.email || null });
  if (caseworker.name) professionals.push({ type: 'caseworker', name: caseworker.name, phone: caseworker.phone || null, email: null });
  if (gal.name) professionals.push({ type: 'guardianAdLitem', name: gal.name, phone: gal.phone || null, email: null });
  if (data.attorney) professionals.push({ type: 'attorney', name: data.attorney, phone: null, email: null });
  if (data.judge) professionals.push({ type: 'judge', name: data.judge, phone: null, email: null });
  if (professionals.length > 0) data.professionals = professionals;

  if (Object.keys(community).length) data.communityResources = community;
  if (Object.keys(treatmentFocus).length) data.treatmentFocus = treatmentFocus;
  if (Object.keys(dischargePlan).length) data.dischargePlan = dischargePlan;
  if (Object.keys(esc).length) data.emergencyShelterCare = esc;

  // Defaults if not present
  data.level = (data.level ?? 1);
  data.pointTotal = (data.pointTotal ?? 0);

  if (!data.firstName || !data.lastName) {
    throw new Error('First Name and Last Name are required in the pasted text.');
  }
  return data as any;
}

export function PasteYouthProfileDialog({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImport = async () => {
    try {
      setSaving(true);
      let parsed: any;
      try {
        const response = await parseYouthProfileText(text);
        if (response.success && response.data) {
          parsed = (response as any).data.parsedData || response.data;
        } else {
          parsed = parseYouthFromText(text);
        }
      } catch {
        parsed = parseYouthFromText(text);
      }

      if (!parsed.firstName || !parsed.lastName) {
        throw new Error('Import could not confidently identify first and last name.');
      }

      await upsertSupabase(parsed);
      toast.success(`Saved profile for ${parsed.firstName} ${parsed.lastName}`);
      setOpen(false);
      setText('');
      onImported && onImported();
    } catch (e: any) {
      console.error('Import error', e);
      toast.error(e?.message || 'Failed to import profile');
    } finally {
      setSaving(false);
    }
  };

  // Try to upsert to Supabase too so dashboard sees the profile
  const upsertSupabase = async (parsed: any) => {
    try {
      const { youthService } = await import('@/integrations/firebase/services');
      const matches = await youthService.searchByName(`${parsed.firstName} ${parsed.lastName}`);
      const existing = matches.find((y: any) => y.firstName?.toLowerCase() === parsed.firstName.toLowerCase() && y.lastName?.toLowerCase() === parsed.lastName.toLowerCase());

      const iso = (d?: Date | null) => (d ? new Date(d).toISOString().split('T')[0] : null);
      const sup = {
        firstName: parsed.firstName,
        lastName: parsed.lastName,
        dob: iso(parsed.dob),
        age: parsed.age ?? null,
        sex: parsed.sex ?? null,
        socialSecurityNumber: parsed.socialSecurityNumber ?? null,
        placeOfBirth: parsed.placeOfBirth ?? null,
        race: parsed.race ?? null,
        address: parsed.address ?? null,
        physicalDescription: parsed.physicalDescription ?? null,
        admissionDate: iso(parsed.admissionDate ?? null),
        admissionTime: parsed.admissionTime ?? null,
        rcsIn: parsed.rcsIn ?? null,
        dischargeDate: iso(parsed.dischargeDate ?? null),
        dischargeTime: parsed.dischargeTime ?? null,
        rcsOut: parsed.rcsOut ?? null,
        mother: parsed.mother ?? null,
        father: parsed.father ?? null,
        legalGuardian: parsed.legalGuardian ?? null,
        nextOfKin: parsed.nextOfKin ?? null,
        placingAgencyCounty: parsed.placingAgencyCounty ?? null,
        probationOfficer: parsed.probationOfficer ?? null,
        caseworker: parsed.caseworker ?? null,
        guardianAdLitem: parsed.guardianAdLitem ?? null,
        attorney: parsed.attorney ?? null,
        judge: parsed.judge ?? null,
        professionals: parsed.professionals ?? null,
        allergies: parsed.allergies ?? null,
        currentMedications: parsed.currentMedications ?? null,
        significantHealthConditions: parsed.significantHealthConditions ?? null,
        religion: parsed.religion ?? null,
        lastSchoolAttended: parsed.lastSchoolAttended ?? null,
        hasIEP: parsed.hasIEP ?? null,
        currentGrade: parsed.currentGrade ?? null,
        currentSchool: parsed.currentSchool ?? null,
        academicStrengths: parsed.academicStrengths ?? null,
        academicChallenges: parsed.academicChallenges ?? null,
        educationGoals: parsed.educationGoals ?? null,
        schoolContact: parsed.schoolContact ?? null,
        schoolPhone: parsed.schoolPhone ?? null,
        getAlongWithOthers: parsed.getAlongWithOthers ?? null,
        strengthsTalents: parsed.strengthsTalents ?? null,
        interests: parsed.interests ?? null,
        behaviorProblems: parsed.behaviorProblems ?? null,
        dislikesAboutSelf: parsed.dislikesAboutSelf ?? null,
        angerTriggers: parsed.angerTriggers ?? null,
        historyPhysicallyHurting: parsed.historyPhysicallyHurting ?? null,
        historyVandalism: parsed.historyVandalism ?? null,
        gangInvolvement: parsed.gangInvolvement ?? null,
        familyViolentCrimes: parsed.familyViolentCrimes ?? null,
        tobaccoPast6To12Months: parsed.tobaccoPast6To12Months ?? null,
        alcoholPast6To12Months: parsed.alcoholPast6To12Months ?? null,
        drugsVapingMarijuanaPast6To12Months: parsed.drugsVapingMarijuanaPast6To12Months ?? null,
        drugTestingDates: parsed.drugTestingDates ?? null,
        communityResources: parsed.communityResources ?? null,
        treatmentFocus: parsed.treatmentFocus ?? null,
        dischargePlan: parsed.dischargePlan ?? null,
        emergencyShelterCare: parsed.emergencyShelterCare ?? null,
        profilePhoto: parsed.profilePhoto ?? null,
        level: parsed.level ?? 1,
        pointTotal: parsed.pointTotal ?? 0,
        estimatedStay: parsed.estimatedStay ?? null,
      } as any;

      if (existing) {
        await youthService.update(existing.id, sup);
      } else {
        await youthService.create(sup);
      }
    } catch (e) {
      console.error('Supabase upsert failed:', e);
      throw e;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">Paste Youth Profile</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Paste Youth Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Paste the youth information block here. The system will parse it and update the existing profile if the name matches, or create a new one.</p>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={18} placeholder="Paste the profile text here..." />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={saving || !text.trim()}>{saving ? 'Importing...' : 'Import Profile'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
