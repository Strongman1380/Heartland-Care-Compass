-- Create table for Real Colors assessments
CREATE TABLE public.real_colors_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youth_id UUID NOT NULL REFERENCES public.youths(id) ON DELETE CASCADE,
  assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  primary_color TEXT NOT NULL CHECK (primary_color IN ('Gold', 'Blue', 'Green', 'Orange')),
  secondary_color TEXT CHECK (secondary_color IN ('Gold', 'Blue', 'Green', 'Orange')),
  insights TEXT,
  comments TEXT,
  observations TEXT,
  is_screening BOOLEAN DEFAULT FALSE,
  completed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.real_colors_assessments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow all operations on real_colors_assessments" 
ON public.real_colors_assessments 
FOR ALL 
USING (true);

-- Create trigger for timestamps
CREATE TRIGGER update_real_colors_assessments_updated_at
BEFORE UPDATE ON public.real_colors_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();