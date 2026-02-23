-- Create School Incidents Tables for Heartland Youth Compass
-- This script creates the missing tables that the School Incident Reports dashboard needs

-- Main school incidents table
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for tracking involved residents in incidents
CREATE TABLE IF NOT EXISTS public.school_incident_involved (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id TEXT NOT NULL REFERENCES public.school_incidents(incident_id) ON DELETE CASCADE,
    resident_id UUID REFERENCES public.youth(id) ON DELETE CASCADE,
    name TEXT,
    role_in_incident TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_incidents_date_time ON public.school_incidents(date_time DESC);
CREATE INDEX IF NOT EXISTS idx_school_incidents_severity ON public.school_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_school_incidents_incident_type ON public.school_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_school_incident_involved_incident_id ON public.school_incident_involved(incident_id);
CREATE INDEX IF NOT EXISTS idx_school_incident_involved_resident_id ON public.school_incident_involved(resident_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at timestamps
DROP TRIGGER IF EXISTS update_school_incidents_updated_at ON public.school_incidents;
CREATE TRIGGER update_school_incidents_updated_at
    BEFORE UPDATE ON public.school_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_school_incident_involved_updated_at ON public.school_incident_involved;
CREATE TRIGGER update_school_incident_involved_updated_at
    BEFORE UPDATE ON public.school_incident_involved
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.school_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_incident_involved ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust based on your auth requirements)
-- Allow authenticated users to read all incidents
CREATE POLICY "Allow authenticated users to read school incidents" ON public.school_incidents
    FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert incidents
CREATE POLICY "Allow authenticated users to insert school incidents" ON public.school_incidents
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update incidents
CREATE POLICY "Allow authenticated users to update school incidents" ON public.school_incidents
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated users to delete incidents
CREATE POLICY "Allow authenticated users to delete school incidents" ON public.school_incidents
    FOR DELETE TO authenticated USING (true);

-- Similar policies for involved residents table
CREATE POLICY "Allow authenticated users to read school incident involved" ON public.school_incident_involved
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert school incident involved" ON public.school_incident_involved
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update school incident involved" ON public.school_incident_involved
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete school incident involved" ON public.school_incident_involved
    FOR DELETE TO authenticated USING (true);

-- Insert some sample data for testing (optional)
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
    staff_signatures
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
    '[{"name": "Sarah Johnson", "signed_at": "2024-10-05T14:45:00Z"}]'
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
    '[{"name": "Mike Davis", "signed_at": "2024-10-04T10:30:00Z"}, {"name": "Lisa Chen", "signed_at": "2024-10-04T10:35:00Z"}]'
)
ON CONFLICT (incident_id) DO NOTHING;

-- Success message
SELECT 'School incidents tables created successfully!' as message;