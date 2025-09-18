import { youthService, type Youth as SupabaseYouth } from '@/integrations/supabase/services';
import type { Youth as LocalYouth } from '@/types/app-types';
import { setItem, STORAGE_KEYS, fetchAllYouths } from '@/utils/local-storage-utils';

const toDate = (v: any): Date | null => (v ? new Date(v) : null);

const mapToLocal = (y: SupabaseYouth): LocalYouth => {
  const anyY: any = y as any;
  const mapped: any = {
    ...anyY,
    dob: toDate(anyY.dob),
    admissionDate: toDate(anyY.admissionDate),
    dischargeDate: toDate(anyY.dischargeDate),
    hyrnaAssessmentDate: toDate(anyY.hyrnaAssessmentDate),
    createdAt: toDate(anyY.createdAt || null),
    updatedAt: toDate(anyY.updatedAt || null),
  };
  return mapped as LocalYouth;
};

export async function syncSupabaseYouthsToLocal(): Promise<{ imported: number }>{
  const supabaseList = await youthService.getAll();
  const locals = fetchAllYouths();

  // Merge by id, prefer Supabase copy
  const byId = new Map<string, LocalYouth>();
  for (const s of supabaseList) byId.set(s.id, mapToLocal(s));
  for (const l of locals) if (!byId.has(l.id)) byId.set(l.id, l);

  const merged = Array.from(byId.values());
  setItem(STORAGE_KEYS.YOUTHS, merged);
  return { imported: supabaseList.length };
}

