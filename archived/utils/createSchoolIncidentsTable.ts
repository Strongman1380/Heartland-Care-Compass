import { supabase } from '@/integrations/supabase/client';

export async function createSchoolIncidentsTable() {
  try {
    // First, let's try to create the table using raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create School Incidents Table
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

        -- Create RLS policies
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
      `
    });

    if (error) {
      console.error('Error creating table with RPC:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception creating table:', error);
    return { success: false, error: String(error) };
  }
}

// Alternative approach: Try to insert sample data to test if table exists
export async function testAndCreateTable() {
  try {
    // First test if table exists by trying a simple query
    const { data, error } = await supabase
      .from('school_incidents')
      .select('incident_id')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, we need to create it
      console.log('Table does not exist, needs to be created manually');
      return { 
        success: false, 
        error: 'Table does not exist. Please run the SQL script in Supabase.',
        needsTableCreation: true
      };
    }

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, tableExists: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}