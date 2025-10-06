-- Minimal School Incidents Tables (Quick Setup)
-- Run this in your Supabase SQL Editor to fix the 404 errors

-- Main school incidents table
CREATE TABLE IF NOT EXISTS public.school_incidents (
    incident_id TEXT PRIMARY KEY,
    date_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reported_by JSONB NOT NULL DEFAULT '{}',
    location TEXT NOT NULL DEFAULT '',
    incident_type TEXT NOT NULL DEFAULT '',
    severity TEXT NOT NULL DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    summary TEXT NOT NULL DEFAULT '',
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

-- Table for involved residents
CREATE TABLE IF NOT EXISTS public.school_incident_involved (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id TEXT NOT NULL REFERENCES public.school_incidents(incident_id) ON DELETE CASCADE,
    resident_id UUID REFERENCES public.youth(id) ON DELETE CASCADE,
    name TEXT,
    role_in_incident TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.school_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_incident_involved ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Allow all for authenticated users" ON public.school_incidents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.school_incident_involved FOR ALL TO authenticated USING (true) WITH CHECK (true);

SELECT 'School incidents tables created successfully!' as message;