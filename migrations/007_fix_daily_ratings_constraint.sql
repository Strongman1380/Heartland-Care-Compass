-- Fix daily_ratings constraint and add time_of_day column
-- This migration ensures the time_of_day column exists and the correct unique constraint is in place

BEGIN;

-- Add time_of_day column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'daily_ratings' 
        AND column_name = 'time_of_day'
    ) THEN
        ALTER TABLE public.daily_ratings 
        ADD COLUMN time_of_day text NOT NULL DEFAULT 'day'
        CHECK (time_of_day IN ('morning','day','evening'));
    END IF;
END $$;

-- Drop old unique constraint if it exists
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

-- Add new unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'public.daily_ratings'::regclass
        AND conname = 'daily_ratings_youth_date_slot_unique'
    ) THEN
        ALTER TABLE public.daily_ratings 
        ADD CONSTRAINT daily_ratings_youth_date_slot_unique 
        UNIQUE (youth_id, date, time_of_day);
    END IF;
END $$;

COMMIT;
