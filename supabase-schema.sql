-- Heartland Care Compass Database Schema for Supabase
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create youth table
CREATE TABLE IF NOT EXISTS public.youth (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    dob DATE,
    age INTEGER,
    sex TEXT,
    "socialSecurityNumber" TEXT,
    "placeOfBirth" TEXT,
    race TEXT,
    address JSONB,
    "physicalDescription" JSONB,
    "admissionDate" DATE,
    "admissionTime" TIME,
    "rcsIn" TEXT,
    "dischargeDate" DATE,
    "dischargeTime" TIME,
    "rcsOut" TEXT,
    mother JSONB,
    father JSONB,
    "legalGuardian" JSONB,
    "nextOfKin" JSONB,
    "placingAgencyCounty" TEXT,
    "probationOfficer" JSONB,
    caseworker JSONB,
    "guardianAdLitem" JSONB,
    attorney TEXT,
    judge TEXT,
    allergies TEXT,
    "currentMedications" TEXT,
    "significantHealthConditions" TEXT,
    religion TEXT,
    "lastSchoolAttended" TEXT,
    "hasIEP" BOOLEAN,
    "currentGrade" TEXT,
    "getAlongWithOthers" TEXT,
    "strengthsTalents" TEXT,
    interests TEXT,
    "behaviorProblems" TEXT,
    "dislikesAboutSelf" TEXT,
    "angerTriggers" TEXT,
    "historyPhysicallyHurting" BOOLEAN,
    "historyVandalism" BOOLEAN,
    "gangInvolvement" BOOLEAN,
    "familyViolentCrimes" BOOLEAN,
    "tobaccoPast6To12Months" BOOLEAN,
    "alcoholPast6To12Months" BOOLEAN,
    "drugsVapingMarijuanaPast6To12Months" BOOLEAN,
    "drugTestingDates" TEXT,
    "communityResources" JSONB,
    "treatmentFocus" JSONB,
    "dischargePlan" JSONB,
    "emergencyShelterCare" JSONB,
    "profilePhoto" TEXT,
    level INTEGER DEFAULT 1,
    "pointTotal" INTEGER DEFAULT 0,
    "referralSource" TEXT,
    "referralReason" TEXT,
    "educationInfo" TEXT,
    "medicalInfo" TEXT,
    "mentalHealthInfo" TEXT,
    "legalStatus" TEXT,
    "peerInteraction" INTEGER,
    "adultInteraction" INTEGER,
    "investmentLevel" INTEGER,
    "dealAuthority" INTEGER,
    "hyrnaRiskLevel" TEXT,
    "hyrnaScore" INTEGER,
    "hyrnaAssessmentDate" DATE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "idNumber" TEXT,
    "guardianRelationship" TEXT,
    "guardianContact" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "probationContact" TEXT,
    "probationPhone" TEXT,
    "placementAuthority" TEXT,
    "estimatedStay" TEXT,
    "priorPlacements" TEXT[],
    "numPriorPlacements" TEXT,
    "lengthRecentPlacement" TEXT,
    "courtInvolvement" TEXT[],
    "currentSchool" TEXT,
    grade TEXT,
    "academicStrengths" TEXT,
    "academicChallenges" TEXT,
    "educationGoals" TEXT,
    "schoolContact" TEXT,
    "schoolPhone" TEXT,
    physician TEXT,
    "physicianPhone" TEXT,
    "insuranceProvider" TEXT,
    "policyNumber" TEXT,
    "medicalConditions" TEXT,
    "medicalRestrictions" TEXT,
    "currentDiagnoses" TEXT,
    diagnoses TEXT,
    "traumaHistory" TEXT[],
    "previousTreatment" TEXT,
    "currentCounseling" TEXT[],
    "therapistName" TEXT,
    "therapistContact" TEXT,
    "sessionFrequency" TEXT,
    "sessionTime" TEXT,
    "selfHarmHistory" TEXT[],
    "lastIncidentDate" DATE,
    "hasSafetyPlan" BOOLEAN,
    "onSubsystem" BOOLEAN,
    "pointsInCurrentLevel" INTEGER,
    "dailyPointsForPrivileges" INTEGER
);

-- Create behavior_points table
CREATE TABLE IF NOT EXISTS public.behavior_points (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE,
    "morningPoints" INTEGER DEFAULT 0,
    "afternoonPoints" INTEGER DEFAULT 0,
    "eveningPoints" INTEGER DEFAULT 0,
    "totalPoints" INTEGER DEFAULT 0,
    comments TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(youth_id, date)
);

-- Create case_notes table
CREATE TABLE IF NOT EXISTS public.case_notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE,
    summary TEXT,
    note TEXT,
    staff TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create daily_ratings table
CREATE TABLE IF NOT EXISTS public.daily_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE,
    "peerInteraction" INTEGER CHECK ("peerInteraction" >= 1 AND "peerInteraction" <= 5),
    "adultInteraction" INTEGER CHECK ("adultInteraction" >= 1 AND "adultInteraction" <= 5),
    "investmentLevel" INTEGER CHECK ("investmentLevel" >= 1 AND "investmentLevel" <= 5),
    "dealAuthority" INTEGER CHECK ("dealAuthority" >= 1 AND "dealAuthority" <= 5),
    staff TEXT,
    comments TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(youth_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_youth_created_at ON public.youth("createdAt");
CREATE INDEX IF NOT EXISTS idx_youth_level ON public.youth(level);
CREATE INDEX IF NOT EXISTS idx_behavior_points_youth_date ON public.behavior_points(youth_id, date);
CREATE INDEX IF NOT EXISTS idx_case_notes_youth_date ON public.case_notes(youth_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_ratings_youth_date ON public.daily_ratings(youth_id, date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_youth_updated_at BEFORE UPDATE ON public.youth
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_ratings_updated_at BEFORE UPDATE ON public.daily_ratings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.youth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_ratings ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - you can restrict later)
CREATE POLICY "Allow all operations on youth" ON public.youth FOR ALL USING (true);
CREATE POLICY "Allow all operations on behavior_points" ON public.behavior_points FOR ALL USING (true);
CREATE POLICY "Allow all operations on case_notes" ON public.case_notes FOR ALL USING (true);
CREATE POLICY "Allow all operations on daily_ratings" ON public.daily_ratings FOR ALL USING (true);