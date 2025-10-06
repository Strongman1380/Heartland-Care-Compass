-- Minimal Academic Tables Creation Script
-- Run this in Supabase SQL Editor

-- Create academic_credits table
CREATE TABLE IF NOT EXISTS public.academic_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
  date_earned DATE NOT NULL,
  credit_value NUMERIC(4,2) NOT NULL CHECK (credit_value >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Create academic_steps table
CREATE TABLE IF NOT EXISTS public.academic_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
  date_completed DATE NOT NULL,
  steps_count INTEGER NOT NULL CHECK (steps_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security and create policies
ALTER TABLE public.academic_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on academic_credits" ON public.academic_credits FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_grades" ON public.academic_grades FOR ALL USING (true);
CREATE POLICY "Allow all operations on academic_steps" ON public.academic_steps FOR ALL USING (true);