
// Application-specific types that work with the Supabase schema

export interface Youth {
  id: string;
  firstName: string;
  lastName: string;
  dob?: Date | null;
  age?: number | null;
  admissionDate?: Date | null;
  level: number;
  pointTotal: number;
  referralSource?: string | null;
  referralReason?: string | null;
  educationInfo?: string | null;
  medicalInfo?: string | null;
  mentalHealthInfo?: string | null;
  legalStatus?: string | null;
  peerInteraction?: number | null; // 0-5 rating
  adultInteraction?: number | null; // 0-5 rating
  investmentLevel?: number | null; // 0-5 rating
  dealAuthority?: number | null; // 0-5 rating
  hyrnaRiskLevel?: string | null; // Low, Medium, High
  hyrnaScore?: number | null; // Risk assessment score
  hyrnaAssessmentDate?: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface BehaviorPoints {
  id: string;
  youth_id: string;
  date?: Date | null;
  morningPoints: number;
  afternoonPoints: number;
  eveningPoints: number;
  totalPoints: number;
  comments?: string | null;
  createdAt?: Date | null;
}

export interface ProgressNote {
  id: string;
  youth_id: string;
  date?: Date | null;
  category?: string | null;
  note?: string | null;
  rating?: number | null;
  staff?: string | null;
  createdAt?: Date | null;
}

export interface DailyRating {
  id: string;
  youth_id: string;
  date?: Date | null;
  peerInteraction?: number | null; // 0-5 rating
  adultInteraction?: number | null; // 0-5 rating
  investmentLevel?: number | null; // 0-5 rating
  dealAuthority?: number | null; // 0-5 rating
  staff?: string | null;
  comments?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

// Helper functions to convert between Supabase and app types
export const mapYouthFromSupabase = (data: any): Youth => {
  return {
    id: data.id,
    firstName: data.firstname,
    lastName: data.lastname,
    dob: data.dob ? new Date(data.dob) : null,
    age: data.age,
    admissionDate: data.admissiondate ? new Date(data.admissiondate) : null,
    level: data.level || 1,
    pointTotal: data.pointtotal || 0,
    referralSource: data.referralsource,
    referralReason: data.referralreason,
    educationInfo: data.educationinfo,
    medicalInfo: data.medicalinfo,
    mentalHealthInfo: data.mentalhealthinfo,
    legalStatus: data.legalstatus,
    peerInteraction: data.peerinteraction,
    adultInteraction: data.adultinteraction,
    investmentLevel: data.investmentlevel,
    dealAuthority: data.dealauthority,
    hyrnaRiskLevel: data.hyrnarisklevel,
    hyrnaScore: data.hyrnascore,
    hyrnaAssessmentDate: data.hyrnaassessmentdate ? new Date(data.hyrnaassessmentdate) : null,
    createdAt: data.createdat ? new Date(data.createdat) : null,
    updatedAt: data.updatedat ? new Date(data.updatedat) : null
  };
};

export const mapPointsFromSupabase = (data: any): BehaviorPoints => {
  return {
    id: data.id,
    youth_id: data.youth_id,
    date: data.date ? new Date(data.date) : null,
    morningPoints: data.morningpoints || 0,
    afternoonPoints: data.afternoonpoints || 0,
    eveningPoints: data.eveningpoints || 0,
    totalPoints: data.totalpoints || 0,
    comments: data.comments,
    createdAt: data.createdat ? new Date(data.createdat) : null
  };
};

export const mapNoteFromSupabase = (data: any): ProgressNote => {
  return {
    id: data.id,
    youth_id: data.youth_id,
    date: data.date ? new Date(data.date) : null,
    category: data.category,
    note: data.note,
    rating: data.rating,
    staff: data.staff,
    createdAt: data.createdat ? new Date(data.createdat) : null
  };
};

export const mapDailyRatingFromSupabase = (data: any): DailyRating => {
  return {
    id: data.id,
    youth_id: data.youth_id,
    date: data.date ? new Date(data.date) : null,
    peerInteraction: data.peer_interaction,
    adultInteraction: data.adult_interaction,
    investmentLevel: data.investment_level,
    dealAuthority: data.deal_authority,
    staff: data.staff,
    comments: data.comments,
    createdAt: data.created_at ? new Date(data.created_at) : null,
    updatedAt: data.updated_at ? new Date(data.updated_at) : null
  };
};
