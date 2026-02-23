-- Create Academic Tables for Heartland Care Compass
-- This script creates the missing academic tables that the Academic Progress Dashboard needs

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create academic_credits table
CREATE TABLE IF NOT EXISTS public.academic_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
  date_earned DATE NOT NULL,
  credit_value NUMERIC(4,2) NOT NULL CHECK (credit_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for academic_credits
CREATE INDEX IF NOT EXISTS idx_academic_credits_student_date ON public.academic_credits(student_id, date_earned DESC);

-- Create academic_grades table
CREATE TABLE IF NOT EXISTS public.academic_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
  date_entered DATE NOT NULL,
  grade_value NUMERIC(5,2) NOT NULL CHECK (grade_value BETWEEN 0 AND 100),
  course_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for academic_grades
CREATE INDEX IF NOT EXISTS idx_academic_grades_student_date ON public.academic_grades(student_id, date_entered DESC);

-- Create academic_steps table
CREATE TABLE IF NOT EXISTS public.academic_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
  date_completed DATE NOT NULL,
  steps_count INTEGER NOT NULL CHECK (steps_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for academic_steps
CREATE INDEX IF NOT EXISTS idx_academic_steps_student_date ON public.academic_steps(student_id, date_completed DESC);

-- Enable Row Level Security
ALTER TABLE public.academic_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_steps ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can restrict later if needed)
CREATE POLICY IF NOT EXISTS "Allow all operations on academic_credits" 
  ON public.academic_credits FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on academic_grades" 
  ON public.academic_grades FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on academic_steps" 
  ON public.academic_steps FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER IF NOT EXISTS update_academic_credits_updated_at 
  BEFORE UPDATE ON public.academic_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_academic_grades_updated_at 
  BEFORE UPDATE ON public.academic_grades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_academic_steps_updated_at 
  BEFORE UPDATE ON public.academic_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- You can remove this section if you don't want sample data

-- Sample academic credits (only if youth table has data)
INSERT INTO public.academic_credits (student_id, date_earned, credit_value)
SELECT 
  id, 
  CURRENT_DATE - INTERVAL '30 days', 
  0.5
FROM public.youth 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample academic grades (only if youth table has data)
INSERT INTO public.academic_grades (student_id, date_entered, grade_value, course_name)
SELECT 
  id, 
  CURRENT_DATE - INTERVAL '15 days', 
  85.5,
  'Mathematics'
FROM public.youth 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample academic steps (only if youth table has data)
INSERT INTO public.academic_steps (student_id, date_completed, steps_count)
SELECT 
  id, 
  CURRENT_DATE - INTERVAL '7 days', 
  5
FROM public.youth 
LIMIT 1
ON CONFLICT DO NOTHING;