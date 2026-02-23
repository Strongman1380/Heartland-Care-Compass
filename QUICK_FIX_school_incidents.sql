-- Quick fix for School Incidents table
-- Copy and paste this into your Supabase SQL Editor

-- Create the main school_incidents table
CREATE TABLE IF NOT EXISTS public.school_incidents (
    incident_id TEXT PRIMARY KEY,
    date_time TIMESTAMPTZ NOT NULL,
    reported_by JSONB NOT NULL DEFAULT '{}',
    location TEXT NOT NULL,
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    summary TEXT NOT NULL,
    timeline JSONB NOT NULL DEFAULT '[]',
    actions_taken TEXT,
    medical_needed BOOLEAN NOT NULL DEFAULT false,
    medical_details TEXT,
    attachments JSONB NOT NULL DEFAULT '[]',
    staff_signatures JSONB NOT NULL DEFAULT '[]',
    follow_up JSONB,
    confidential_notes TEXT,
    involved_residents JSONB NOT NULL DEFAULT '[]',
    witnesses JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_incidents_date_time ON public.school_incidents(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_school_incidents_severity ON public.school_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_school_incidents_incident_type ON public.school_incidents(incident_type);

-- Enable Row Level Security
ALTER TABLE public.school_incidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
DROP POLICY IF EXISTS "Allow authenticated users to read school incidents" ON public.school_incidents;
CREATE POLICY "Allow authenticated users to read school incidents" ON public.school_incidents
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert school incidents" ON public.school_incidents;
CREATE POLICY "Allow authenticated users to insert school incidents" ON public.school_incidents
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update school incidents" ON public.school_incidents;
CREATE POLICY "Allow authenticated users to update school incidents" ON public.school_incidents
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete school incidents" ON public.school_incidents;
CREATE POLICY "Allow authenticated users to delete school incidents" ON public.school_incidents
    FOR DELETE TO authenticated USING (true);

-- Insert sample data for testing
INSERT INTO public.school_incidents (
    incident_id,
    date_time,
    reported_by,
    location,
    incident_type,
    severity,
    summary,
    timeline,
    actions_taken,
    medical_needed,
    attachments,
    staff_signatures,
    involved_residents,
    witnesses
) VALUES 
(
    'HHH-2024-0001',
    '2024-10-05 14:30:00+00',
    '{"name": "Sarah Johnson", "role": "Teacher"}',
    'Classroom 101',
    'Behavioral',
    'Medium',
    'Student disruption during math class',
    '[{"time": "14:30", "entry": "Student began disrupting class"}, {"time": "14:35", "entry": "Verbal warning given"}, {"time": "14:40", "entry": "Student removed from classroom"}]',
    'Student was removed from classroom and given a 10-minute cool-down period. Discussed appropriate classroom behavior.',
    false,
    '[]',
    '[{"name": "Sarah Johnson", "signed_at": "2024-10-05T14:45:00Z"}]',
    '[{"name": "John Doe", "role_in_incident": "primary"}]',
    '[{"name": "Jane Smith", "role": "Teacher Assistant", "statement": "Witnessed the entire incident"}]'
),
(
    'HHH-2024-0002',
    '2024-10-04 10:15:00+00',
    '{"name": "Mike Davis", "role": "Counselor"}',
    'Cafeteria',
    'Physical Altercation',
    'High',
    'Minor altercation between two students during lunch',
    '[{"time": "10:15", "entry": "Altercation began"}, {"time": "10:16", "entry": "Staff intervened"}, {"time": "10:20", "entry": "Students separated and calmed"}]',
    'Both students were separated immediately. Individual counseling sessions scheduled. Parents notified.',
    false,
    '[]',
    '[{"name": "Mike Davis", "signed_at": "2024-10-04T10:30:00Z"}, {"name": "Lisa Chen", "signed_at": "2024-10-04T10:35:00Z"}]',
    '[{"name": "Student A", "role_in_incident": "primary"}, {"name": "Student B", "role_in_incident": "primary"}]',
    '[{"name": "Lunch Monitor", "role": "Staff", "statement": "Saw the altercation start over seating"}]'
)
ON CONFLICT (incident_id) DO NOTHING;

-- Success message
SELECT 'School incidents table created successfully with sample data!' as message;