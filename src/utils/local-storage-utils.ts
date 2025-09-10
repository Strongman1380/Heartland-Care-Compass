import { Youth, BehaviorPoints, ProgressNote, DailyRating } from "@/types/app-types";
import { v4 as uuidv4 } from '@/utils/uuid';
import { seedMockData } from '@/utils/mockData';

// Storage keys
export const STORAGE_KEYS = {
  YOUTHS: 'heartland_youths',
  POINTS: 'heartland_points',
  NOTES: 'heartland_notes',
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
    setItem(STORAGE_KEYS.ASSESSMENTS, []);
    setItem(STORAGE_KEYS.RATINGS, []);
    setItem(STORAGE_KEYS.VERSION, CURRENT_DATA_VERSION);

    // Optionally seed mock data once to help with local troubleshooting
    try {
      const alreadySeeded = localStorage.getItem('heartland_mock_seeded') === 'true';
      if (!alreadySeeded) {
        seedMockData();
        localStorage.setItem('heartland_mock_seeded', 'true');
        console.log('Mock data seeded');
      }
    } catch (e) {
      console.warn('Mock data seeding skipped:', e);
    }
    return true;
  }
  // If storage exists but is empty, seed mock data once to help with troubleshooting
  try {
    const alreadySeeded = localStorage.getItem('heartland_mock_seeded') === 'true';
    if ((!existingYouths || existingYouths.length === 0) && !alreadySeeded) {
      seedMockData();
      localStorage.setItem('heartland_mock_seeded', 'true');
      console.log('Mock data seeded (post-initialization)');
      return true;
    }
  } catch (e) {
    console.warn('Mock data seeding (post-init) skipped:', e);
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
  const allNotes = getItem<ProgressNote[]>(STORAGE_KEYS.NOTES) || [];
  return allNotes
    .filter(note => note.youth_id === youthId)
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA; // descending order
    });
};

export const saveProgressNote = (
  youthId: string, 
  noteData: Omit<ProgressNote, 'id' | 'createdAt' | 'youth_id'>
): ProgressNote => {
  const allNotes = getItem<ProgressNote[]>(STORAGE_KEYS.NOTES) || [];
  
  const newNote: ProgressNote = {
    id: uuidv4(),
    youth_id: youthId,
    ...noteData,
    createdAt: new Date()
  };
  
  allNotes.push(newNote);
  setItem(STORAGE_KEYS.NOTES, allNotes);
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
  
  const newAssessment = {
    id: documentId || uuidv4(),
    youth_id: youthId,
    collection, // save collection type for filtering
    ...data,
    createdat: new Date().toISOString(),
    updatedat: new Date().toISOString()
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
