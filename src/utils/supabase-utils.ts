
import { supabase } from "@/integrations/supabase/client";
import { Youth, BehaviorPoints, ProgressNote, mapYouthFromSupabase, mapPointsFromSupabase, mapNoteFromSupabase } from "@/types/app-types";

// Functions to fetch data from Supabase
export const fetchYouth = async (youthId: string): Promise<Youth | null> => {
  const { data, error } = await supabase
    .from('youths')
    .select('*')
    .eq('id', youthId)
    .single();
  
  if (error || !data) {
    console.error("Error fetching youth:", error);
    return null;
  }

  return mapYouthFromSupabase(data);
};

export const fetchBehaviorPoints = async (youthId: string) => {
  const { data, error } = await supabase
    .from('points')
    .select('*')
    .eq('youth_id', youthId)
    .order('date', { ascending: false });
  
  if (error) {
    console.error("Error fetching behavior points:", error);
    return [];
  }

  return data.map(mapPointsFromSupabase);
};

export const fetchProgressNotes = async (youthId: string) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('youth_id', youthId)
    .order('date', { ascending: false });
  
  if (error) {
    console.error("Error fetching progress notes:", error);
    return [];
  }

  return data.map(mapNoteFromSupabase);
};

export const saveBehaviorPoints = async (youthId: string, pointData: Omit<BehaviorPoints, 'id' | 'createdAt'>) => {
  const formattedData = {
    youth_id: youthId,
    date: pointData.date,
    morningpoints: pointData.morningPoints,
    afternoonpoints: pointData.afternoonPoints,
    eveningpoints: pointData.eveningPoints,
    totalpoints: pointData.totalPoints,
    comments: pointData.comments
  };

  const { data, error } = await supabase
    .from('points')
    .insert([formattedData])
    .select();

  if (error) {
    console.error("Error saving behavior points:", error);
    throw error;
  }

  return data ? mapPointsFromSupabase(data[0]) : null;
};

export const saveProgressNote = async (youthId: string, noteData: Omit<ProgressNote, 'id' | 'createdAt'>) => {
  const formattedData = {
    youth_id: youthId,
    date: noteData.date,
    category: noteData.category,
    note: noteData.note,
    rating: noteData.rating,
    staff: noteData.staff
  };

  const { data, error } = await supabase
    .from('notes')
    .insert([formattedData])
    .select();

  if (error) {
    console.error("Error saving progress note:", error);
    throw error;
  }

  return data ? mapNoteFromSupabase(data[0]) : null;
};

export const saveAssessment = async (youthId: string, collection: string, documentId: string, data: any) => {
  const { error } = await supabase
    .from(`${collection}`)
    .upsert([{
      id: documentId,
      youth_id: youthId,
      ...data
    }]);

  if (error) {
    console.error(`Error saving to ${collection}:`, error);
    throw error;
  }

  return { id: documentId };
};

export const fetchAssessment = async (youthId: string, collection: string, documentId: string) => {
  const { data, error } = await supabase
    .from(`${collection}`)
    .select('*')
    .eq('id', documentId)
    .eq('youth_id', youthId)
    .single();

  if (error && error.code !== 'PGRST116') {  // PGRST116 is "no rows returned" error code
    console.error(`Error fetching from ${collection}:`, error);
    return null;
  }

  return data;
};
