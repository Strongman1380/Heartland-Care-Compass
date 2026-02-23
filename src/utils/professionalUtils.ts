import { Professional, ProfessionalType } from '@/types/app-types';

export const PROFESSIONAL_TYPE_LABELS: Record<ProfessionalType, string> = {
  caseworker: 'Caseworker',
  probationOfficer: 'Probation Officer',
  attorney: 'Attorney',
  judge: 'Judge',
  guardianAdLitem: 'Guardian ad Litem',
};

export const PROFESSIONAL_TYPES: ProfessionalType[] = [
  'caseworker',
  'probationOfficer',
  'attorney',
  'judge',
  'guardianAdLitem',
];

/**
 * Resolves the canonical list of professionals from a Youth record.
 * Reads from `professionals` array first; if empty, falls back to legacy fields.
 */
export function resolveProfessionals(youth: any): Professional[] {
  if (youth?.professionals && Array.isArray(youth.professionals) && youth.professionals.length > 0) {
    return youth.professionals;
  }

  const result: Professional[] = [];

  if (youth?.probationOfficer) {
    const po = typeof youth.probationOfficer === 'object'
      ? youth.probationOfficer
      : { name: youth.probationOfficer };
    if (po.name) {
      result.push({
        type: 'probationOfficer',
        name: po.name,
        phone: po.phone || youth.probationPhone || null,
        email: po.email || null,
      });
    }
  }

  if (youth?.caseworker) {
    const cw = typeof youth.caseworker === 'object'
      ? youth.caseworker
      : { name: youth.caseworker };
    if (cw.name) {
      result.push({
        type: 'caseworker',
        name: cw.name,
        phone: cw.phone || null,
        email: null,
      });
    }
  }

  if (youth?.guardianAdLitem) {
    const gal = typeof youth.guardianAdLitem === 'object'
      ? youth.guardianAdLitem
      : { name: youth.guardianAdLitem };
    if (gal.name) {
      result.push({
        type: 'guardianAdLitem',
        name: gal.name,
        phone: gal.phone || null,
        email: null,
      });
    }
  }

  if (youth?.attorney) {
    result.push({ type: 'attorney', name: youth.attorney, phone: null, email: null });
  }

  if (youth?.judge) {
    result.push({ type: 'judge', name: youth.judge, phone: null, email: null });
  }

  return result;
}

/**
 * Find a specific professional by type.
 */
export function findProfessional(youth: any, type: ProfessionalType): Professional | undefined {
  return resolveProfessionals(youth).find(p => p.type === type);
}

/**
 * Convert professionals array back to legacy fields for backward compat writes.
 */
export function professionalsToLegacyFields(professionals: Professional[]): Record<string, any> {
  const legacy: Record<string, any> = {
    probationOfficer: null,
    caseworker: null,
    guardianAdLitem: null,
    attorney: null,
    judge: null,
  };

  for (const p of professionals) {
    switch (p.type) {
      case 'probationOfficer':
        legacy.probationOfficer = { name: p.name, phone: p.phone || null, email: p.email || null, contact: p.phone || null };
        break;
      case 'caseworker':
        legacy.caseworker = { name: p.name, phone: p.phone || null };
        break;
      case 'guardianAdLitem':
        legacy.guardianAdLitem = { name: p.name, phone: p.phone || null };
        break;
      case 'attorney':
        legacy.attorney = p.name;
        break;
      case 'judge':
        legacy.judge = p.name;
        break;
    }
  }

  return legacy;
}
