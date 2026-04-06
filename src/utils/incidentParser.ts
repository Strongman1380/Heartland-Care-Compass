import { 
  FacilityIncidentFormData, 
  FacilityIncidentType, 
  NotificationType, 
  SubjectType, 
  InvolvedYouth, 
  Witness,
  DocumentationType
} from '@/types/facility-incident-types';

const INCIDENT_TYPE_KEYWORDS: Record<string, FacilityIncidentType> = {
  'verbal altercation': 'Verbal Altercation',
  'verbal': 'Verbal Altercation',
  'threat': 'Threats / Intimidation',
  'intimidation': 'Threats / Intimidation',
  'defiance': 'Defiance / Noncompliance',
  'noncompliance': 'Defiance / Noncompliance',
  'disrespect': 'Disrespect Toward Staff',
  'bullying': 'Bullying / Harassment',
  'harassment': 'Bullying / Harassment',
  'sexual misconduct': 'Sexualized Behavior / Sexual Misconduct',
  'sexualized': 'Sexualized Behavior / Sexual Misconduct',
  'self-harm threat': 'Self-Harm Threat',
  'self harm threat': 'Self-Harm Threat',
  'self-harm attempt': 'Self-Harm Attempt',
  'self harm attempt': 'Self-Harm Attempt',
  'suicidal': 'Suicidal Ideation / Suicide Threat',
  'suicide threat': 'Suicidal Ideation / Suicide Threat',
  'mental health crisis': 'Mental Health Crisis',
  'crisis': 'Mental Health Crisis',
  'aggression toward staff': 'Aggression Toward Staff',
  'aggressive staff': 'Aggression Toward Staff',
  'contraband possession': 'Contraband Possession',
  'contraband': 'Contraband Possession',
  'vape': 'Vape / Tobacco Use',
  'tobacco': 'Vape / Tobacco Use',
  'smoking': 'Vape / Tobacco Use',
  'drug': 'Drug / Alcohol Use or Suspicion',
  'alcohol': 'Drug / Alcohol Use or Suspicion',
  'intoxicated': 'Drug / Alcohol Use or Suspicion',
  'ua refusal': 'UA Refusal / Failed UA',
  'failed ua': 'UA Refusal / Failed UA',
  'room search': 'Room Search / Contraband Discovery',
  'boundary violation': 'Boundary Violation',
  'inappropriate language': 'Inappropriate Language / Slurs',
  'slurs': 'Inappropriate Language / Slurs',
  'disorderly': 'Disorderly Conduct / Major Disruption',
  'disruption': 'Disorderly Conduct / Major Disruption',
  'elopement attempt': 'Elopement Attempt',
  'runaway attempt': 'Elopement Attempt',
  'awol': 'AWOL / Unauthorized Absence',
  'unauthorized absence': 'AWOL / Unauthorized Absence',
  'restricted area': 'Restricted Area Violation',
  'rule violation': 'Rule Violation',
  'broken rule': 'Rule Violation',
  'school incident': 'School Incident',
  'property misuse': 'Property Misuse / Tampering',
  'tampering': 'Property Misuse / Tampering',
  'medical concern': 'Medical Concern',
  'medical': 'Medical Concern',
  'emergency transport': 'Emergency Medical Transport',
  'hospital': 'Emergency Medical Transport',
  'medication error': 'Medication Error',
  'refusal of care': 'Refusal of Care',
  'law enforcement': 'Law Enforcement Contact',
  'police': 'Law Enforcement Contact',
  'abuse allegation': 'Abuse Allegation',
  'neglect allegation': 'Neglect Allegation',
  'peer conflict': 'Peer Conflict',
  'peer fighting': 'Peer Conflict',
  'staff concern': 'Staff Concern / Suspicious Behavior',
  'safety hazard': 'Safety Hazard',
  'false allegation': 'False Allegation',
  'technology misuse': 'Technology Misuse',
  'computer misuse': 'Technology Misuse',
  'gang': 'Gang-Related Behavior',
  'weapon': 'Possession of Weapon / Dangerous Item',
  'dangerous item': 'Possession of Weapon / Dangerous Item',
  'theft': 'Theft',
  'trespasser': 'Trespasser',
  'property damage': 'Property Damage',
  'injury': 'Injury',
  'physical altercation': 'Physical Altercation',
  'fighting': 'Physical Altercation',
  'medication refusal': 'Medication Refusal',
  'fire': 'Fire/Alarm',
  'alarm': 'Fire/Alarm',
  'runaway': 'Runaway',
  'arrest': 'Arrest',
};

const NOTIFICATION_KEYWORDS: Record<string, NotificationType> = {
  'home director': 'Home Director',
  'director': 'Home Director',
  'business manager': 'Business Manager',
  'supervisor': 'Supervisor',
  'case worker': 'Case Worker',
  'caseworker': 'Case Worker',
  'physician': 'Physician',
  'doctor': 'Physician',
  'service coordinator': 'Service Coordinator',
  'psychiatrist': 'Psychiatrist',
  'family': 'Family',
  'probation officer': 'Probation Officer',
  'p.o.': 'Probation Officer',
  'sheriff': 'Sheriff',
  'police notified': 'Sheriff',
};

const DOCUMENTATION_KEYWORDS: Record<string, DocumentationType> = {
  'photograph': 'Photographs',
  'photo': 'Photographs',
  'physical inspection': 'Physical Inspection',
  'property inspection': 'Property Inspection',
  'witness statement': 'Statement of Witness',
  'statement of witness': 'Statement of Witness',
  'damage report': 'Property Damage Report',
  'police report': 'Police Report',
  'missing person': 'Missing Person Report',
};

const FIELD_MAP: Record<string, keyof FacilityIncidentFormData> = {
  'subject type': 'subjectType',
  'subject': 'subjectType',
  'last name': 'lastName',
  'first name': 'firstName',
  'initial': 'initial',
  'description': 'incidentDescription',
  'incident description': 'incidentDescription',
  'date': 'dateOfIncident',
  'incident date': 'dateOfIncident',
  'time': 'timeOfIncident',
  'incident time': 'timeOfIncident',
  'report date': 'reportDate',
  'report time': 'reportTime',
  'location': 'location',
  'narrative': 'narrativeSummary',
  'summary': 'narrativeSummary',
  'staff': 'staffCompletingReport',
  'staff member': 'staffCompletingReport',
  'reporting staff': 'staffCompletingReport',
  'notifications': 'notifications',
  'notified': 'notifications',
  'submitted by': 'submittedBy',
  'reviewed by': 'reviewedBy',
  'signature date': 'signatureDate',
  'subject address': 'subjectAddress',
  'subject phone': 'subjectPhone',
  'supplementary': 'supplementaryInfo',
  'additional info': 'supplementaryInfo',
  'documentation': 'documentation',
};

export function parseIncidentText(text: string): Partial<FacilityIncidentFormData> {
  // 1. Try JSON first
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object') {
      return data as Partial<FacilityIncidentFormData>;
    }
  } catch (e) {}

  const result: Partial<FacilityIncidentFormData> = {
    incidentTypes: [],
    notifications: [],
    policyViolations: [],
    staffActions: [],
    followUpRecommendations: [],
    youthInvolved: [],
    witnesses: [],
    documentation: [],
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let lastField: keyof FacilityIncidentFormData | null = null;

  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    
    // Check for drop-down matches in bare lines (no colon)
    if (colonIndex === -1) {
      const lower = line.toLowerCase();
      
      // Multi-line continuation (narrative/supplementary)
      if (lastField === 'narrativeSummary' || lastField === 'supplementaryInfo') {
        result[lastField] = (result[lastField] || '') + '\n' + line;
        return;
      }

      // Check for keywords in lines that are just types
      Object.entries(INCIDENT_TYPE_KEYWORDS).forEach(([kw, type]) => {
        if (lower.includes(kw) && !result.incidentTypes?.includes(type)) {
          result.incidentTypes?.push(type);
        }
      });
      Object.entries(DOCUMENTATION_KEYWORDS).forEach(([kw, type]) => {
        if (lower.includes(kw) && !result.documentation?.includes(type)) {
          result.documentation?.push(type);
        }
      });
      return;
    }

    const field = line.slice(0, colonIndex).toLowerCase().trim();
    const value = line.slice(colonIndex + 1).trim();

    // Map direct fields
    const targetField = FIELD_MAP[field];
    if (targetField) {
      lastField = targetField;
      if (targetField === 'notifications' || field === 'notified') {
        const parts = value.split(/[,\s]+/).map(p => p.trim().toLowerCase());
        parts.forEach(p => {
          Object.entries(NOTIFICATION_KEYWORDS).forEach(([kw, type]) => {
            if (p.includes(kw) && !result.notifications?.includes(type)) {
              result.notifications?.push(type);
            }
          });
        });
      } else if (targetField === 'documentation') {
        const parts = value.split(/[,\s]+/).map(p => p.trim().toLowerCase());
        parts.forEach(p => {
          Object.entries(DOCUMENTATION_KEYWORDS).forEach(([kw, type]) => {
            if (p.includes(kw) && !result.documentation?.includes(type)) {
              result.documentation?.push(type);
            }
          });
        });
      } else {
        (result as any)[targetField] = value;
      }
    }

    // Special logic for drop-downs
    if (field === 'type' || field === 'incident type') {
      const parts = value.split(/[,\s]+/).map(p => p.trim().toLowerCase());
      parts.forEach(p => {
        Object.entries(INCIDENT_TYPE_KEYWORDS).forEach(([kw, type]) => {
          if (p.includes(kw) && !result.incidentTypes?.includes(type)) {
            result.incidentTypes?.push(type);
          }
        });
      });
    }

    // List categories (Violations, Actions, Follow-up)
    if (field.includes('violation')) result.policyViolations?.push({ description: value });
    if (field.includes('action')) result.staffActions?.push({ description: value });
    if (field.includes('recommend') || field.includes('follow up')) result.followUpRecommendations?.push({ description: value });

    // Youth extraction
    if (field.includes('youth involved')) {
      const p = value.split(/[;,]/);
      p.forEach(y => {
        const m = y.match(/^(.*?)(?:\((.*?)\))?$/);
        if (m) {
          const name = m[1].trim();
          const extra = (m[2] || '').toLowerCase();
          const age = extra.match(/\d+/)?.[0] || '';
          let role: any = 'secondary';
          if (extra.includes('primary')) role = 'primary';
          else if (extra.includes('witness')) role = 'witness';
          else if (extra.includes('victim')) role = 'victim';
          if (name) result.youthInvolved?.push({ name, age, role });
        }
      });
    }

    // Witness extraction
    if (field.includes('witnesses') || field === 'witness') {
      const p = value.split(/[;,]/);
      p.forEach(w => {
        const m = w.match(/^(.*?)(?:\((.*?)\))?$/);
        if (m) {
          const name = m[1].trim();
          const phone = m[2]?.trim() || '';
          if (name) result.witnesses?.push({ name, phone, address: '', cityState: '' });
        }
      });
    }
  });

  // Strict Subject Type Normalization
  if (result.subjectType) {
    const st = String(result.subjectType).toLowerCase();
    if (st.startsWith('res')) result.subjectType = 'Resident';
    else if (st.startsWith('emp') || st.includes('staff')) result.subjectType = 'Employee';
    else if (st.startsWith('non')) result.subjectType = 'Non-Resident';
  } else {
    result.subjectType = 'Resident';
  }

  // Final scrub to ensure arrays are valid for checkboxes/tabs
  if (result.incidentTypes?.length === 0) result.incidentTypes = [];
  if (result.notifications?.length === 0) result.notifications = [];
  if (result.documentation?.length === 0) result.documentation = [];

  return result;
}
