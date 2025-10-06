-- Migration: Fix School Daily Scores Unique Constraint
-- Description: Change unique constraint to allow one score per youth per date per weekday
-- Version: 006
-- Date: 2025-10-06

-- Drop the existing unique constraint
ALTER TABLE school_daily_scores DROP CONSTRAINT IF EXISTS school_daily_scores_youth_id_date_key;

-- Add the correct unique constraint (one score per youth per date per weekday)
ALTER TABLE school_daily_scores ADD CONSTRAINT school_daily_scores_youth_id_date_weekday_key UNIQUE (youth_id, date, weekday);

-- Update the upsert conflict target in the service (this is just documentation, the actual change is in the service file)
-- The service should use: onConflict: 'youth_id,date,weekday'
