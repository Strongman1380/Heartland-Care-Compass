-- Migration: Add realColorsResult column to youth table
-- Date: 2024-12-19
-- Description: Add support for Real Colors diagnostic tool results

ALTER TABLE public.youth ADD COLUMN IF NOT EXISTS "realColorsResult" TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN public.youth."realColorsResult" IS 'Real Colors personality assessment result (e.g., "Blue", "Gold", "Blue/Gold")';