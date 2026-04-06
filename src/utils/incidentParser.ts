import { FacilityIncidentFormData, FacilityIncidentType, NotificationType, SubjectType, InvolvedYouth, Witness } from '@/types/facility-incident-types';

const INCIDENT_TYPE_KEYWORDS: Record<string, FacilityIncidentType> = {
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
  'sheriff': 'Sheriff',
  'police': 'Sheriff',
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
};

export function parseIncidentText(text: string): Partial<FacilityIncidentFormData> {
  // 1. Try JSON first
  try {
    const data = JSON.parse(text);
    if (data && typeof data === 'object') {
      return data as Partial<FacilityIncidentFormData>;
    }
  } catch (e) {
    // Not JSON, continue to text parsing
  }

  const result: Partial<FacilityIncidentFormData> = {
    incidentTypes: [],
    notifications: [],
    policyViolations: [],
    staffActions: [],
    followUpRecommendations: [],
    youthInvolved: [],
    witnesses: [],
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  let lastField: keyof FacilityIncidentFormData | null = null;

  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
    
    // Handle multiline continuation (for narrative/supplementary)
    if (colonIndex === -1 && lastField) {
      if (lastField === 'narrativeSummary' || lastField === 'supplementaryInfo' || lastField === 'incidentDescription') {
        result[lastField] = (result[lastField] || '') + '\n' + line;
        return;
      }
    }

    if (colonIndex === -1) {
      // Check for keywords in bare lines (like incident types)
      const lowerLine = line.toLowerCase();
      Object.entries(INCIDENT_TYPE_KEYWORDS).forEach(([kw, type]) => {
        if (lowerLine.includes(kw) && !result.incidentTypes?.includes(type)) {
          result.incidentTypes?.push(type);
        }
      });
      return;
    }

    const field = line.slice(0, colonIndex).toLowerCase().trim();
    const value = line.slice(colonIndex + 1).trim();

    // Direct mapping
    const targetField = FIELD_MAP[field];
    if (targetField) {
      lastField = targetField;
      if (targetField === 'notifications') {
        const parts = value.split(',').map(p => p.trim().toLowerCase());
        parts.forEach(p => {
          Object.entries(NOTIFICATION_KEYWORDS).forEach(([kw, type]) => {
            if (p.includes(kw) && !result.notifications?.includes(type)) {
              result.notifications?.push(type);
            }
          });
        });
      } else {
        (result as any)[targetField] = value;
      }
    }

    // Special handling for incident types
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

    // List items (Violations, Actions, Follow-up)
    if (field.includes('violation')) {
      result.policyViolations?.push({ description: value });
    }
    if (field.includes('action')) {
      result.staffActions?.push({ description: value });
    }
    if (field.includes('recommend') || field.includes('follow up')) {
      result.followUpRecommendations?.push({ description: value });
    }

    // Youth Involved extraction
    // Format: "Youth Involved: John Doe (15, primary), Jane Smith (secondary)"
    if (field.includes('youth involved')) {
      const youthParts = value.split(';').length > 1 ? value.split(';') : value.split(',');
      youthParts.forEach(p => {
        const match = p.match(/^(.*?)(?:\((.*?)\))?$/);
        if (match) {
          const name = match[1].trim();
          const extra = match[2] || '';
          const age = extra.match(/\d+/)?.[0] || '';
          let role: any = 'secondary';
          if (extra.toLowerCase().includes('primary')) role = 'primary';
          else if (extra.toLowerCase().includes('witness')) role = 'witness';
          else if (extra.toLowerCase().includes('victim')) role = 'victim';

          if (name) {
            result.youthInvolved?.push({ name, age, role });
          }
        }
      });
    }

    // Witness extraction
    // Format: "Witnesses: Alice Smith, Bob Jones (555-0100)"
    if (field.includes('witnesses')) {
      const witnessParts = value.split(/[,;]/);
      witnessParts.forEach(p => {
        const match = p.match(/^(.*?)(?:\((.*?)\))?$/);
        if (match) {
          const name = match[1].trim();
          const phone = match[2]?.trim() || '';
          if (name) {
            result.witnesses?.push({ name, phone, address: '', cityState: '' });
          }
        }
      });
    }
  });

  // Normalize Subject Type
  if (result.subjectType) {
    const st = String(result.subjectType).toLowerCase();
    if (st.includes('res')) result.subjectType = 'Resident';
    else if (st.includes('emp')) result.subjectType = 'Employee';
    else if (st.includes('non')) result.subjectType = 'Non-Resident';
  }

  // Cleanup lists if they only contain empty objects
  if (result.policyViolations?.length === 0) delete result.policyViolations;
  if (result.staffActions?.length === 0) delete result.staffActions;
  if (result.followUpRecommendations?.length === 0) delete result.followUpRecommendations;
  if (result.youthInvolved?.length === 0) delete result.youthInvolved;
  if (result.witnesses?.length === 0) delete result.witnesses;

  return result;
}
