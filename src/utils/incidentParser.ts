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
  'theft': 'Theft',
  'trespasser': 'Trespasser',
  'property damage': 'Property Damage',
  'injury': 'Injury',
  'physical altercation': 'Physical Altercation',
  'fighting': 'Physical Altercation',
  'medication refusal': 'Medication Refusal',
  'refused medication': 'Medication Refusal',
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
  'police': 'Sheriff',
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
        if (p === 'property' || p === 'damage') {
           if (!result.incidentTypes?.includes('Property Damage')) result.incidentTypes?.push('Property Damage');
        }
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
    else result.subjectType = 'Resident'; // Default
  } else {
    result.subjectType = 'Resident';
  }

  // Final scrub to ensure arrays are valid for checkboxes/tabs
  if (result.incidentTypes?.length === 0) result.incidentTypes = [];
  if (result.notifications?.length === 0) result.notifications = [];
  if (result.documentation?.length === 0) result.documentation = [];

  return result;
}
