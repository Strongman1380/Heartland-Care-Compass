
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
    date: pointData.date instanceof Date ? pointData.date.toISOString() : pointData.date,
    morningpoints: pointData.morningPoints,
    afternoonpoints: pointData.afternoonPoints,
    eveningpoints: pointData.eveningPoints,
    totalpoints: pointData.totalPoints,
    comments: pointData.comments
  };

  const { data, error } = await supabase
    .from('points')
    .insert(formattedData)
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
    date: noteData.date instanceof Date ? noteData.date.toISOString() : noteData.date,
    category: noteData.category,
    note: noteData.note,
    rating: noteData.rating,
    staff: noteData.staff
  };

  const { data, error } = await supabase
    .from('notes')
    .insert(formattedData)
    .select();

  if (error) {
    console.error("Error saving progress note:", error);
    throw error;
  }

  return data ? mapNoteFromSupabase(data[0]) : null;
};

// Type definitions for different assessment types
export interface BehaviorWorksheetData {
  id: string;
  youth_id: string;
  events: any[];
  summary: string;
  skillstoImprove: string[];
  createdat: string;
  updatedat?: string;
}

export interface RiskAssessmentData {
  id: string;
  youth_id: string;
  assessmentdate: string;
  completedby: string;
  domains: any;
  traumahistory: string;
  strengths: string;
  recommendedlevel: number;
  overallrisklevel: string;
  interventiontargets: string[];
  createdat: string;
  updatedat?: string;
}

export interface SuccessPlanData {
  id: string;
  youth_id: string;
  goals: any[];
  strengths: string;
  supportnetwork: any[];
  resources: any[];
  challengestoaddress: string;
  createdat: string;
  updatedat?: string;
}

// These are the valid table names in our Supabase setup
// Updated to include the actual table names used in the components
type AssessmentTable = "worksheets" | "riskassessments" | "successplans" | "assessments" | "plans";

// Generic function to save assessment data
export const saveAssessment = async (
  youthId: string, 
  collection: AssessmentTable, 
  documentId: string, 
  data: any
) => {
  // Using any for the query to get around type restrictions
  const { error } = await supabase
    .from(collection as any)
    .upsert({
      id: documentId,
      youth_id: youthId,
      ...data
    });

  if (error) {
    console.error(`Error saving to ${collection}:`, error);
    throw error;
  }

  return { id: documentId };
};

// Typed function to fetch assessment data
export const fetchAssessment = async (
  youthId: string, 
  collection: AssessmentTable, 
  documentId: string
): Promise<BehaviorWorksheetData | RiskAssessmentData | SuccessPlanData | null> => {
  // Using any for the query to get around type restrictions
  const { data, error } = await supabase
    .from(collection as any)
    .select('*')
    .eq('id', documentId)
    .eq('youth_id', youthId)
    .single();

  if (error && error.code !== 'PGRST116') {  // PGRST116 is "no rows returned" error code
    console.error(`Error fetching from ${collection}:`, error);
    return null;
  }

  // Use "as unknown as" to safely convert the data to the expected type
  return data as unknown as (BehaviorWorksheetData | RiskAssessmentData | SuccessPlanData | null);
};
