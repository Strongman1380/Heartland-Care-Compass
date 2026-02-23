-- Fix daily_ratings constraint to allow multiple entries per day
-- This migration removes the unique constraint to allow multiple behavioral ratings per youth per day

BEGIN;

-- Drop the unique constraint that prevents multiple entries per day
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.daily_ratings'::regclass
        AND conname = 'daily_ratings_youth_id_date_key'
    ) THEN
        ALTER TABLE public.daily_ratings 
        DROP CONSTRAINT daily_ratings_youth_id_date_key;
    END IF;
END $$;

-- Also drop the time_of_day constraint if it exists (from previous migration)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.daily_ratings'::regclass
        AND conname = 'daily_ratings_youth_date_slot_unique'
    ) THEN
        ALTER TABLE public.daily_ratings 
        DROP CONSTRAINT daily_ratings_youth_date_slot_unique;
    END IF;
END $$;

COMMIT;

