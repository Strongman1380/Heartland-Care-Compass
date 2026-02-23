-- ============================================================================
-- MIGRATION: Add Individual Comment Fields for Behavioral Ratings
-- ============================================================================
-- This migration adds separate comment fields for each behavioral rating
-- category in the daily_ratings table.
-- 
-- Date: January 2025
-- ============================================================================

-- Add individual comment columns for each behavioral rating
ALTER TABLE public.daily_ratings 
ADD COLUMN IF NOT EXISTS "peerInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "adultInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "investmentLevelComment" TEXT,
ADD COLUMN IF NOT EXISTS "dealAuthorityComment" TEXT;

-- Update the CHECK constraints to allow 0-4 scale (currently it's 1-5)
-- Drop existing constraints
ALTER TABLE public.daily_ratings 
DROP CONSTRAINT IF EXISTS daily_ratings_peerInteraction_check,
DROP CONSTRAINT IF EXISTS daily_ratings_adultInteraction_check,
DROP CONSTRAINT IF EXISTS daily_ratings_investmentLevel_check,
DROP CONSTRAINT IF EXISTS daily_ratings_dealAuthority_check;

-- Add new constraints for 0-4 scale
ALTER TABLE public.daily_ratings 
ADD CONSTRAINT daily_ratings_peerInteraction_check 
  CHECK ("peerInteraction" >= 0 AND "peerInteraction" <= 4),
ADD CONSTRAINT daily_ratings_adultInteraction_check 
  CHECK ("adultInteraction" >= 0 AND "adultInteraction" <= 4),
ADD CONSTRAINT daily_ratings_investmentLevel_check 
  CHECK ("investmentLevel" >= 0 AND "investmentLevel" <= 4),
ADD CONSTRAINT daily_ratings_dealAuthority_check 
  CHECK ("dealAuthority" >= 0 AND "dealAuthority" <= 4);

-- Add comments to document the new columns
COMMENT ON COLUMN public.daily_ratings."peerInteractionComment" IS 'Notes about peer interaction rating (0-4 scale)';
COMMENT ON COLUMN public.daily_ratings."adultInteractionComment" IS 'Notes about adult interaction rating (0-4 scale)';
COMMENT ON COLUMN public.daily_ratings."investmentLevelComment" IS 'Notes about investment level rating (0-4 scale)';
COMMENT ON COLUMN public.daily_ratings."dealAuthorityComment" IS 'Notes about dealing with authority rating (0-4 scale)';

-- Note: The existing 'comments' column is kept for general notes about the daily rating
COMMENT ON COLUMN public.daily_ratings.comments IS 'General notes about the daily rating (legacy field)';