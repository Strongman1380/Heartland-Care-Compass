
// Application types for the local storage version

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


