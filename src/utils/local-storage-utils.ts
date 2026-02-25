import { Youth, BehaviorPoints, ProgressNote, CaseNote, DailyRating } from "@/types/app-types";
import { notesService } from '@/integrations/firebase/notesService'
import { v4 as uuidv4 } from '@/utils/uuid';

// Storage keys
export const STORAGE_KEYS = {
  YOUTHS: 'heartland_youths',
  POINTS: 'heartland_points',
  NOTES: 'heartland_notes', // Keep for backward compatibility
  CASE_NOTES: 'heartland_case_notes',
  ASSESSMENTS: 'heartland_assessments',
  RATINGS: 'heartland_ratings',
  VERSION: 'heartland_data_version',
  DPN_COMMENTS: 'heartland_dpn_comments'
};

// Data version - increment this when you want to force refresh the youth data
const CURRENT_DATA_VERSION = '2024-12-19-v2';

// Helper to initialize storage
export const initializeStorage = () => {
  const existingYouths = getItem<Youth[]>(STORAGE_KEYS.YOUTHS);
  const currentVersion = getItem<string>(STORAGE_KEYS.VERSION);
  
  // Initialize empty storage if no data exists
  if (!existingYouths || currentVersion !== CURRENT_DATA_VERSION) {
    console.log('Initializing storage...');
    
    // Initialize with empty arrays
    setItem(STORAGE_KEYS.YOUTHS, []);
    setItem(STORAGE_KEYS.POINTS, []);
    setItem(STORAGE_KEYS.NOTES, []);
    setItem(STORAGE_KEYS.CASE_NOTES, []);
    setItem(STORAGE_KEYS.ASSESSMENTS, []);
    setItem(STORAGE_KEYS.RATINGS, []);
    setItem(STORAGE_KEYS.VERSION, CURRENT_DATA_VERSION);

    return true;
  }

  return false;
};

// Helper functions for localStorage
export const getItem = <T>(key: string): T | null => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error getting item from localStorage: ${key}`, error);
    return null;
  }
};

export const setItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting item in localStorage: ${key}`, error);
  }
};

// Youth functions
export const fetchAllYouths = (): Youth[] => {
  return getItem<Youth[]>(STORAGE_KEYS.YOUTHS) || [];
};

export const fetchYouth = (youthId: string): Youth | null => {
  const youths = fetchAllYouths();
  return youths.find(youth => youth.id === youthId) || null;
};

export const saveYouth = (youth: Omit<Youth, 'id' | 'createdAt' | 'updatedAt'>): Youth => {
  const youths = fetchAllYouths();
  const now = new Date();
  
  const newYouth: Youth = {
    ...youth,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now
  };
  
  youths.push(newYouth);
  setItem(STORAGE_KEYS.YOUTHS, youths);
  return newYouth;
};

export const updateYouth = (youthId: string, updates: Partial<Youth>): Youth => {
  const youths = fetchAllYouths();
  const index = youths.findIndex(y => y.id === youthId);
  
  if (index !== -1) {
    const updatedYouth = {
      ...youths[index],
      ...updates,
      updatedAt: new Date()
    };
    
    youths[index] = updatedYouth;
    setItem(STORAGE_KEYS.YOUTHS, youths);
    return updatedYouth;
  }
  
  throw new Error(`Youth with ID ${youthId} not found`);
};

export const deleteYouth = (youthId: string): void => {
  const youths = fetchAllYouths();
  const filteredYouths = youths.filter(y => y.id !== youthId);
  setItem(STORAGE_KEYS.YOUTHS, filteredYouths);
};

// Behavior Points functions
export const fetchBehaviorPoints = (youthId: string): BehaviorPoints[] => {
  const allPoints = getItem<BehaviorPoints[]>(STORAGE_KEYS.POINTS) || [];
  return allPoints
    .filter(points => points.youth_id === youthId)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // descending order
    });
};

export const saveBehaviorPoints = (
  youthId: string, 
  pointData: Omit<BehaviorPoints, 'id' | 'createdAt' | 'youth_id'>
): BehaviorPoints => {
  const allPoints = getItem<BehaviorPoints[]>(STORAGE_KEYS.POINTS) || [];
  
  const newPoints: BehaviorPoints = {
    id: uuidv4(),
    youth_id: youthId,
    ...pointData,
    createdAt: new Date()
  };
  
  allPoints.push(newPoints);
  setItem(STORAGE_KEYS.POINTS, allPoints);
  return newPoints;
};

// Progress Notes functions
export const fetchProgressNotes = (youthId: string): ProgressNote[] => {
  // Hydrate from Supabase in background and merge
  (async () => {
    try {
      const remote = await notesService.listForYouth(youthId)
      if (remote && remote.length) {
        const merged = remote.map(r => ({
          id: r.id,
          youth_id: r.youth_id,
          date: r.created_at,
          note: r.text,
          staff: r.author_id || '',
          category: r.category || 'Progress Note',
          createdAt: new Date(r.created_at)
        })) as any as ProgressNote[]
        const local = getItem<ProgressNote[]>(STORAGE_KEYS.NOTES) || [];
        const map = new Map<string, ProgressNote>()
        for (const n of local) map.set(n.id || `${n.youth_id}|${String(n.date)}`, n)
        for (const n of merged) map.set(n.id || `${n.youth_id}|${String(n.date)}`, n)
        setItem(STORAGE_KEYS.NOTES, Array.from(map.values()))
      }
    } catch (error) {
      // Silently fail - we'll use local cache
      console.warn('Progress notes sync failed, using local cache:', error)
    }
  })()
  const allNotes = getItem<ProgressNote[]>(STORAGE_KEYS.NOTES) || [];
  return allNotes
    .filter(note => note.youth_id === youthId)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // descending order
    });
};

export const saveProgressNote = async (
  youthId: string,
  noteData: Omit<ProgressNote, 'id' | 'createdAt' | 'youth_id'>
): Promise<ProgressNote> => {
  const allNotes = getItem<ProgressNote[]>(STORAGE_KEYS.NOTES) || [];

  const newNote: ProgressNote = {
    id: uuidv4(),
    youth_id: youthId,
    ...noteData,
    createdAt: new Date()
  };

  // Persist to Supabase - throw error if it fails so UI can handle it
  try {
    await notesService.save({
      id: newNote.id,
      youth_id: youthId,
      author_id: newNote.staff || null,
      text: typeof newNote.note === 'string' ? newNote.note : JSON.stringify(newNote.note),
      category: newNote.category || 'Progress Note'
    } as any);
  } catch (error) {
    console.error('Failed to save progress note to Supabase:', error);
    // Still save to localStorage as fallback
    allNotes.push(newNote);
    setItem(STORAGE_KEYS.NOTES, allNotes);
    throw new Error('Failed to save progress note to database. Note saved locally only.');
  }

  allNotes.push(newNote);
  setItem(STORAGE_KEYS.NOTES, allNotes);
  return newNote;
};

// Case Notes functions
export const fetchCaseNotes = (youthId: string): CaseNote[] => {
  const allNotes = getItem<CaseNote[]>(STORAGE_KEYS.CASE_NOTES) || [];
  return allNotes
    .filter(note => note.youth_id === youthId)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // descending order
    });
};

export const saveCaseNote = (
  youthId: string, 
  noteData: Omit<CaseNote, 'id' | 'createdAt' | 'youth_id'>
): CaseNote => {
  const allNotes = getItem<CaseNote[]>(STORAGE_KEYS.CASE_NOTES) || [];
  
  const newNote: CaseNote = {
    id: uuidv4(),
    youth_id: youthId,
    ...noteData,
    createdAt: new Date()
  };
  
  allNotes.push(newNote);
  setItem(STORAGE_KEYS.CASE_NOTES, allNotes);
  return newNote;
};

// Daily Ratings functions
export const fetchDailyRatings = (youthId: string): DailyRating[] => {
  const allRatings = getItem<DailyRating[]>(STORAGE_KEYS.RATINGS) || [];
  return allRatings
    .filter(rating => rating.youth_id === youthId)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // descending order
    });
};

export const saveDailyRating = (
  youthId: string, 
  ratingData: Omit<DailyRating, 'id' | 'createdAt' | 'updatedAt' | 'youth_id'>
): DailyRating => {
  const allRatings = getItem<DailyRating[]>(STORAGE_KEYS.RATINGS) || [];
  const now = new Date();
  
  const newRating: DailyRating = {
    id: uuidv4(),
    youth_id: youthId,
    ...ratingData,
    createdAt: now,
    updatedAt: now
  };
  
  allRatings.push(newRating);
  setItem(STORAGE_KEYS.RATINGS, allRatings);
  return newRating;
};

export const updateDailyRating = (
  ratingId: string, 
  updates: Partial<DailyRating>
): DailyRating => {
  const allRatings = getItem<DailyRating[]>(STORAGE_KEYS.RATINGS) || [];
  const index = allRatings.findIndex(r => r.id === ratingId);
  
  if (index !== -1) {
    const updatedRating = {
      ...allRatings[index],
      ...updates,
      updatedAt: new Date()
    };
    
    allRatings[index] = updatedRating;
    setItem(STORAGE_KEYS.RATINGS, allRatings);
    return updatedRating;
  }
  
  throw new Error(`Rating with ID ${ratingId} not found`);
};

// Generic assessment functions
type AssessmentTable = "worksheets" | "riskassessments" | "successplans" | "assessments" | "plans";

export const saveAssessment = (
  youthId: string, 
  collection: AssessmentTable, 
  documentId: string, 
  data: any
) => {
  const allAssessments = getItem<any[]>(STORAGE_KEYS.ASSESSMENTS) || [];
  const { createdat, updatedat, ...rest } = data || {};
  const nowIso = new Date().toISOString();

  const newAssessment = {
    id: documentId || uuidv4(),
    youth_id: youthId,
    collection, // save collection type for filtering
    createdat: createdat ?? nowIso,
    updatedat: nowIso,
    ...rest
  };
  
  // Remove existing if update
  const filteredAssessments = allAssessments.filter(
    a => !(a.id === documentId && a.youth_id === youthId && a.collection === collection)
  );
  
  filteredAssessments.push(newAssessment);
  setItem(STORAGE_KEYS.ASSESSMENTS, filteredAssessments);
  
  return { id: newAssessment.id };
};

export const fetchAssessment = (
  youthId: string, 
  collection: AssessmentTable, 
  documentId: string
) => {
  const allAssessments = getItem<any[]>(STORAGE_KEYS.ASSESSMENTS) || [];
  
  const assessment = allAssessments.find(
    a => a.id === documentId && a.youth_id === youthId && a.collection === collection
  );
  
  return assessment || null;
};

// Clear all data (for testing)
export const clearAllData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

// DPN comments storage (for weekly/bi-weekly notes aggregation)
export interface DpnComments {
  id: string;
  youth_id: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  variant: 'weekly' | 'biweekly' | 'monthly';
  peer: string;
  adult: string;
  investment: string;
  authority: string;
  strengths?: string;
  deficiencies?: string;
  createdAt: string;
}

export const saveDpnComments = (entry: Omit<DpnComments, 'id' | 'createdAt'>): DpnComments => {
  const all = getItem<DpnComments[]>(STORAGE_KEYS.DPN_COMMENTS) || [];
  const newEntry: DpnComments = {
    ...entry,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
  };
  all.push(newEntry);
  setItem(STORAGE_KEYS.DPN_COMMENTS, all);
  return newEntry;
};

export const fetchDpnCommentsByYouth = (youthId: string): DpnComments[] => {
  const all = getItem<DpnComments[]>(STORAGE_KEYS.DPN_COMMENTS) || [];
  return all.filter(e => e.youth_id === youthId);
};

export const fetchDpnCommentsInRange = (youthId: string, start: Date, end: Date): DpnComments[] => {
  return fetchDpnCommentsByYouth(youthId).filter(e => {
    const s = new Date(e.periodStart).getTime();
    const en = new Date(e.periodEnd).getTime();
    return s >= start.getTime() && en <= end.getTime();
  });
};
