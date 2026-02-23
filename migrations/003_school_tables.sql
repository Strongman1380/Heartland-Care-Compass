-- Migration: School Module Tables
-- Description: Creates tables for school scores, academic tracking, and school incident reports
-- Version: 003
-- Date: 2025-01-XX

-- ============================================================================
-- 1. SCHOOL DAILY SCORES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_daily_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 5), -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one score per youth per day
    UNIQUE(youth_id, date)
);

-- Indexes for school_daily_scores
CREATE INDEX idx_school_daily_scores_youth_id ON school_daily_scores(youth_id);
CREATE INDEX idx_school_daily_scores_date ON school_daily_scores(date DESC);
CREATE INDEX idx_school_daily_scores_youth_date ON school_daily_scores(youth_id, date DESC);

-- ============================================================================
-- 2. ACADEMIC CREDITS TABLE
-- ============================================================================

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

-- Indexes for academic_credits
CREATE INDEX idx_academic_credits_student_id ON academic_credits(student_id);
CREATE INDEX idx_academic_credits_date_earned ON academic_credits(date_earned DESC);

-- ============================================================================
-- 3. ACADEMIC GRADES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date_entered DATE NOT NULL,
    grade_value INTEGER NOT NULL CHECK (grade_value >= 0 AND grade_value <= 100), -- percentage 0-100
    subject VARCHAR(100),
    assignment_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for academic_grades
CREATE INDEX idx_academic_grades_student_id ON academic_grades(student_id);
CREATE INDEX idx_academic_grades_date_entered ON academic_grades(date_entered DESC);

-- ============================================================================
-- 4. ACADEMIC STEPS COMPLETED TABLE
-- ============================================================================

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

-- Indexes for academic_steps_completed
CREATE INDEX idx_academic_steps_student_id ON academic_steps_completed(student_id);
CREATE INDEX idx_academic_steps_date_completed ON academic_steps_completed(date_completed DESC);

-- ============================================================================
-- 5. SCHOOL INCIDENT REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS school_incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id VARCHAR(50) UNIQUE NOT NULL, -- Format: HHH-YYYY-####
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Information
    date_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reported_by JSONB NOT NULL, -- StaffMember: { staff_id, name, role }
    location VARCHAR(255) NOT NULL,
    
    -- Incident Classification
    incident_type VARCHAR(50) NOT NULL CHECK (incident_type IN (
        'Aggression', 'Disruption', 'Property Damage', 'Verbal Altercation',
        'Physical Altercation', 'Refusal to Follow Directions', 'Inappropriate Language',
        'Tardy/Absence', 'Academic Dishonesty', 'Other'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    
    -- People Involved (stored as JSONB arrays)
    involved_residents JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of InvolvedResident
    witnesses JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of Witness
    
    -- Incident Details
    summary TEXT NOT NULL,
    timeline JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of TimelineEntry: { time, entry }
    actions_taken TEXT NOT NULL,
    
    -- Medical & Safety
    medical_needed BOOLEAN NOT NULL DEFAULT FALSE,
    medical_details TEXT,
    
    -- Documentation
    attachments JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of { filename, url, uploaded_at }
    
    -- Signatures & Approval
    staff_signatures JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of StaffSignature: { staff_id, name, signed_at }
    
    -- Follow-up
    follow_up JSONB, -- FollowUp: { assigned_to, due_date, follow_up_notes, completed, completed_at }
    
    -- Confidential Notes
    confidential_notes TEXT,
    
    -- Soft delete
    deleted_at TIMESTAMP WITH TIME ZONE,
    deleted_by VARCHAR(255)
);

-- Indexes for school_incident_reports
CREATE INDEX idx_school_incident_reports_incident_id ON school_incident_reports(incident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_date_time ON school_incident_reports(date_time DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_incident_type ON school_incident_reports(incident_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_severity ON school_incident_reports(severity) WHERE deleted_at IS NULL;
CREATE INDEX idx_school_incident_reports_created_at ON school_incident_reports(created_at DESC) WHERE deleted_at IS NULL;

-- Full-text search index for school incidents
CREATE INDEX idx_school_incident_reports_search ON school_incident_reports USING gin(
    to_tsvector('english', 
        COALESCE(summary, '') || ' ' || 
        COALESCE(actions_taken, '') || ' ' || 
        COALESCE(location, '')
    )
) WHERE deleted_at IS NULL;

-- ============================================================================
-- 6. LEGACY INCIDENT REPORTS TABLE (for backwards compatibility)
-- ============================================================================

CREATE TABLE IF NOT EXISTS academic_incident_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.youth(id) ON DELETE SET NULL,
    student_name VARCHAR(255),
    incident_type VARCHAR(100),
    incident_summary TEXT,
    staff_name VARCHAR(255),
    date_of_incident DATE NOT NULL,
    involved_students JSONB DEFAULT '[]'::JSONB, -- Array of { id, name }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for academic_incident_reports
CREATE INDEX idx_academic_incident_reports_student_id ON academic_incident_reports(student_id);
CREATE INDEX idx_academic_incident_reports_date ON academic_incident_reports(date_of_incident DESC);

-- ============================================================================
-- 7. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp for school tables
CREATE OR REPLACE FUNCTION update_school_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
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
    
    -- Get the next sequence number for this year
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

-- Function to auto-generate school incident number on insert
CREATE OR REPLACE FUNCTION set_school_incident_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.incident_id IS NULL OR NEW.incident_id = '' THEN
        NEW.incident_id := generate_school_incident_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set school incident number
CREATE TRIGGER trigger_set_school_incident_number
    BEFORE INSERT ON school_incident_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_school_incident_number();

-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all school tables
ALTER TABLE school_daily_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_steps_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_incident_reports ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all operations for now (you can restrict later based on user roles)
CREATE POLICY "Allow all operations on school_daily_scores" ON school_daily_scores FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_credits" ON academic_credits FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_grades" ON academic_grades FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_steps_completed" ON academic_steps_completed FOR ALL USING (true);
CREATE POLICY "Allow all operations on school_incident_reports" ON school_incident_reports FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_incident_reports" ON academic_incident_reports FOR ALL USING (true);

-- ============================================================================
-- 9. HELPFUL VIEWS
-- ============================================================================

-- View: Recent school scores with youth information
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

-- View: Youth academic summary
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

-- View: School incident reports with summary
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
-- 10. COMMENTS FOR DOCUMENTATION
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
COMMENT ON COLUMN school_incident_reports.involved_residents IS 'JSONB array of residents involved: [{ resident_id, name, role_in_incident }]';
COMMENT ON COLUMN school_incident_reports.witnesses IS 'JSONB array of witnesses: [{ name, role, statement }]';
COMMENT ON COLUMN school_incident_reports.timeline IS 'JSONB array of timeline entries: [{ time, entry }]';
COMMENT ON COLUMN school_incident_reports.staff_signatures IS 'JSONB array of staff signatures: [{ staff_id, name, signed_at }]';