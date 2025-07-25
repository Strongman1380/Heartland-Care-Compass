-- Create daily ratings table for tracking 0-5 scores
CREATE TABLE public.daily_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  youth_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  peer_interaction INTEGER CHECK (peer_interaction >= 0 AND peer_interaction <= 5),
  adult_interaction INTEGER CHECK (adult_interaction >= 0 AND adult_interaction <= 5),
  investment_level INTEGER CHECK (investment_level >= 0 AND investment_level <= 5),
  deal_authority INTEGER CHECK (deal_authority >= 0 AND deal_authority <= 5),
  staff TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(youth_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_ratings ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
CREATE POLICY "Allow all operations on daily_ratings" 
ON public.daily_ratings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_ratings_updated_at
    BEFORE UPDATE ON public.daily_ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();