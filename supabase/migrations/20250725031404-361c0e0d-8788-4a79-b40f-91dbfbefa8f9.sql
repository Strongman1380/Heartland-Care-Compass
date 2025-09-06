-- Fix security definer function search path
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_daily_ratings_updated_at
    BEFORE UPDATE ON public.daily_ratings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();