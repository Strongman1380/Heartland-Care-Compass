-- ============================================================================
-- HEARTLAND CARE COMPASS - COMPLETE DATABASE SCHEMA
-- ============================================================================
-- This file contains ALL database schemas in the correct order
-- Run this entire file in your Supabase SQL Editor to set up everything
-- 
-- Version: 1.0
-- Date: January 2025
-- ============================================================================

-- ============================================================================
-- PART 1: CORE SCHEMA (Youth and Behavior Tracking)
-- ============================================================================

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
    "dailyPointsForPrivileges" INTEGER,
    "realColorsResult" TEXT
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
    "peerInteraction" INTEGER CHECK ("peerInteraction" >= 0 AND "peerInteraction" <= 4),
    "adultInteraction" INTEGER CHECK ("adultInteraction" >= 0 AND "adultInteraction" <= 4),
    "investmentLevel" INTEGER CHECK ("investmentLevel" >= 0 AND "investmentLevel" <= 4),
    "dealAuthority" INTEGER CHECK ("dealAuthority" >= 0 AND "dealAuthority" <= 4),
    "peerInteractionComment" TEXT,
    "adultInteractionComment" TEXT,
    "investmentLevelComment" TEXT,
    "dealAuthorityComment" TEXT,
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

-- Add comment for Real Colors column
COMMENT ON COLUMN public.youth."realColorsResult" IS 'Real Colors personality assessment result (e.g., "Blue", "Gold", "Blue/Gold")';

-- ============================================================================
-- PART 2: SCHOOL MODULE TABLES
-- ============================================================================

-- 1. SCHOOL DAILY SCORES TABLE
CREATE TABLE IF NOT EXISTS school_daily_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 5), -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(youth_id, date)
);

CREATE INDEX idx_school_daily_scores_youth_id ON school_daily_scores(youth_id);
CREATE INDEX idx_school_daily_scores_date ON school_daily_scores(date DESC);
CREATE INDEX idx_school_daily_scores_youth_date ON school_daily_scores(youth_id, date DESC);

-- 2. ACADEMIC CREDITS TABLE
CREATE TABLE IF NOT EXISTS academic_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date_earned DATE NOT NULL,
    credit_value DECIMAL(5,2) NOT NULL CHECK (credit_value >= 0),
    subject VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_academic_credits_student_id ON academic_credits(student_id);
CREATE INDEX idx_academic_credits_date_earned ON academic_credits(date_earned DESC);

-- 3. ACADEMIC GRADES TABLE
CREATE TABLE IF NOT EXISTS academic_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date_entered DATE NOT NULL,
    grade_value INTEGER NOT NULL CHECK (grade_value >= 0 AND grade_value <= 100),
    subject VARCHAR(100),
    assignment_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_academic_grades_student_id ON academic_grades(student_id);
CREATE INDEX idx_academic_grades_date_entered ON academic_grades(date_entered DESC);

-- 4. ACADEMIC STEPS COMPLETED TABLE
CREATE TABLE IF NOT EXISTS academic_steps_completed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date_completed DATE NOT NULL,
    steps_count INTEGER NOT NULL CHECK (steps_count >= 0),
    subject VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_academic_steps_student_id ON academic_steps_completed(student_id);
CREATE INDEX idx_academic_steps_date_completed ON academic_steps_completed(date_completed DESC);

-- 5. SCHOOL INCIDENT REPORTS TABLE
CREATE TABLE IF NOT EXISTS school_incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_by JSONB NOT NULL,
    location VARCHAR(255) NOT NULL,
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'Aggression', 'Disruption', 'Property Damage', 'Verbal Altercation',
        'Physical Altercation', 'Refusal to Follow Directions', 'Inappropriate Language',
        'Tardy/Absence', 'Academic Dishonesty', 'Other'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    involved_residents JSONB NOT NULL DEFAULT '[]'::JSONB,
    witnesses JSONB NOT NULL DEFAULT '[]'::JSONB,
    summary TEXT NOT NULL,
    timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
    actions_taken TEXT NOT NULL,
    medical_needed BOOLEAN NOT NULL DEFAULT FALSE,
    medical_details TEXT,
    attachments JSONB NOT NULL DEFAULT '[]'::JSONB,
    staff_signatures JSONB NOT NULL DEFAULT '[]'::JSONB,
    follow_up JSONB,
    confidential_notes TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(255)
);

CREATE INDEX idx_school_incident_reports_incident_id ON school_incident_reports(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_date_time ON school_incident_reports(date_time DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_incident_type ON school_incident_reports(incident_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_severity ON school_incident_reports(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_created_at ON school_incident_reports(created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX idx_school_incident_reports_search ON school_incident_reports USING gin(
    to_tsvector('english', 
        COALESCE(summary, '') || ' ' || 
        COALESCE(actions_taken, '') || ' ' || 
        COALESCE(location, '')
    )
) WHERE deleted_at IS NULL;

-- 6. LEGACY INCIDENT REPORTS TABLE
CREATE TABLE IF NOT EXISTS academic_incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.youth(id) ON DELETE SET NULL,
    student_name VARCHAR(255),
    incident_type VARCHAR(100),
    incident_summary TEXT,
    staff_name VARCHAR(255),
    date_of_incident DATE NOT NULL,
    involved_students JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_academic_incident_reports_student_id ON academic_incident_reports(student_id);
CREATE INDEX idx_academic_incident_reports_date ON academic_incident_reports(date_of_incident DESC);

-- ============================================================================
-- PART 3: TRIGGERS FOR SCHOOL TABLES
-- ============================================================================

CREATE OR REPLACE FUNCTION update_school_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_school_daily_scores_updated_at
    BEFORE UPDATE ON school_daily_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_school_updated_at();

CREATE TRIGGER trigger_update_academic_credits_updated_at
    BEFORE UPDATE ON academic_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_school_updated_at();

CREATE TRIGGER trigger_update_academic_grades_updated_at
    BEFORE UPDATE ON academic_grades
    FOR EACH ROW
    EXECUTE FUNCTION update_school_updated_at();

CREATE TRIGGER trigger_update_academic_steps_updated_at
    BEFORE UPDATE ON academic_steps_completed
    FOR EACH ROW
    EXECUTE FUNCTION update_school_updated_at();

CREATE TRIGGER trigger_update_school_incident_reports_updated_at
    BEFORE UPDATE ON school_incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_school_updated_at();

CREATE TRIGGER trigger_update_academic_incident_reports_updated_at
    BEFORE UPDATE ON academic_incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_school_updated_at();

-- Function to generate school incident number
CREATE OR REPLACE FUNCTION generate_school_incident_number()
RETURNS TEXT AS $$
DECLARE
    year_part TEXT;
    sequence_part TEXT;
    next_number INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(incident_id FROM 10) AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM school_incident_reports
    WHERE incident_id LIKE 'HHH-' || year_part || '-%';
    sequence_part := LPAD(next_number::TEXT, 4, '0');
    RETURN 'HHH-' || year_part || '-' || sequence_part;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_school_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.incident_id IS NULL OR NEW.incident_id = '' THEN
        NEW.incident_id := generate_school_incident_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_school_incident_number
    BEFORE INSERT ON school_incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_school_incident_number();

-- ============================================================================
-- PART 4: ROW LEVEL SECURITY FOR SCHOOL TABLES
-- ============================================================================

ALTER TABLE school_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_steps_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on school_daily_scores" ON school_daily_scores FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_credits" ON academic_credits FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_grades" ON academic_grades FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_steps_completed" ON academic_steps_completed FOR ALL USING (true);
CREATE POLICY "Allow all operations on school_incident_reports" ON school_incident_reports FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_incident_reports" ON academic_incident_reports FOR ALL USING (true);

-- ============================================================================
-- PART 5: HELPFUL VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW v_recent_school_scores AS
SELECT 
    sds.id,
    sds.youth_id,
    y."firstName" || ' ' || y."lastName" AS youth_name,
    sds.date,
    sds.weekday,
    sds.score,
    sds.created_at,
    sds.updated_at
FROM school_daily_scores sds
JOIN youth y ON sds.youth_id = y.id
ORDER BY sds.date DESC, youth_name;

CREATE OR REPLACE VIEW v_youth_academic_summary AS
SELECT 
    y.id AS youth_id,
    y."firstName" || ' ' || y."lastName" AS youth_name,
    COUNT(DISTINCT sds.id) AS total_school_scores,
    AVG(sds.score) AS avg_school_score,
    COUNT(DISTINCT ac.id) AS total_credits,
    SUM(ac.credit_value) AS total_credit_value,
    COUNT(DISTINCT ag.id) AS total_grades,
    AVG(ag.grade_value) AS avg_grade,
    COUNT(DISTINCT asc.id) AS total_steps_entries,
    SUM(asc.steps_count) AS total_steps
FROM youth y
LEFT JOIN school_daily_scores sds ON y.id = sds.youth_id
LEFT JOIN academic_credits ac ON y.id = ac.student_id
LEFT JOIN academic_grades ag ON y.id = ag.student_id
LEFT JOIN academic_steps_completed asc ON y.id = asc.student_id
GROUP BY y.id, y."firstName", y."lastName";

CREATE OR REPLACE VIEW v_school_incidents_summary AS
SELECT 
    sir.id,
    sir.incident_id,
    sir.date_time,
    sir.location,
    sir.incident_type,
    sir.severity,
    sir.summary,
    sir.medical_needed,
    sir.reported_by->>'name' AS reported_by_name,
    jsonb_array_length(sir.involved_residents) AS num_residents_involved,
    jsonb_array_length(sir.witnesses) AS num_witnesses,
    jsonb_array_length(sir.staff_signatures) AS num_signatures,
    sir.created_at,
    sir.updated_at
FROM school_incident_reports sir
WHERE sir.deleted_at IS NULL
ORDER BY sir.date_time DESC;

-- ============================================================================
-- PART 6: TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE school_daily_scores IS 'Daily school performance scores for youth (Monday-Friday)';
COMMENT ON TABLE academic_credits IS 'Academic credits earned by students';
COMMENT ON TABLE academic_grades IS 'Academic grades and assignment scores';
COMMENT ON TABLE academic_steps_completed IS 'Academic steps/milestones completed by students';
COMMENT ON TABLE school_incident_reports IS 'Comprehensive school incident reports with structured data';
COMMENT ON TABLE academic_incident_reports IS 'Legacy incident reports (for backwards compatibility)';

COMMENT ON COLUMN school_daily_scores.weekday IS '1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday';
COMMENT ON COLUMN school_daily_scores.score IS 'Daily school performance score (0-100)';
COMMENT ON COLUMN school_incident_reports.incident_id IS 'Format: HHH-YYYY-#### (auto-generated)';

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- All tables, indexes, triggers, views, and policies have been created.
-- You can now use the School tab and all other features of the application.
-- ============================================================================