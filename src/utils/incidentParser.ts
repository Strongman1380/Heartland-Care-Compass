import { FacilityIncidentFormData, FacilityIncidentType, NotificationType, SubjectType } from '@/types/facility-incident-types';

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
  'location': 'location',
  'narrative': 'narrativeSummary',
  'summary': 'narrativeSummary',
  'staff': 'staffCompletingReport',
  'staff member': 'staffCompletingReport',
  'reporting staff': 'staffCompletingReport',
  'notifications': 'notifications',
  'notified': 'notifications',
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
  };

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  lines.forEach(line => {
    const colonIndex = line.indexOf(':');
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
      if (targetField === 'notifications') {
        const parts = value.split(',').map(p => p.trim().toLowerCase());
        parts.forEach(p => {
          Object.entries(NOTIFICATION_KEYWORDS).forEach(([kw, type]) => {
            if (p.includes(kw) && !result.notifications?.includes(type)) {
              result.notifications?.push(type);
            }
          });
        });
      } else if (targetField === 'incidentTypes') {
         // handle separately if needed, but FIELD_MAP doesn't have it yet to avoid conflict
      } else {
        (result as any)[targetField] = value;
      }
    }

    // Special handling for types in "Type: ..."
    if (field === 'type' || field === 'incident type') {
      const parts = value.split(',').map(p => p.trim().toLowerCase());
      parts.forEach(p => {
        Object.entries(INCIDENT_TYPE_KEYWORDS).forEach(([kw, type]) => {
          if (p.includes(kw) && !result.incidentTypes?.includes(type)) {
            result.incidentTypes?.push(type);
          }
        });
      });
    }

    // List items
    if (field.includes('violation')) {
      result.policyViolations?.push({ description: value });
    }
    if (field.includes('action')) {
      result.staffActions?.push({ description: value });
    }
    if (field.includes('recommend') || field.includes('follow up')) {
      result.followUpRecommendations?.push({ description: value });
    }
  });

  // Normalize Subject Type
  if (result.subjectType) {
    const st = result.subjectType.toLowerCase();
    if (st.includes('res')) result.subjectType = 'Resident';
    else if (st.includes('emp')) result.subjectType = 'Employee';
    else if (st.includes('non')) result.subjectType = 'Non-Resident';
  }

  return result;
}
