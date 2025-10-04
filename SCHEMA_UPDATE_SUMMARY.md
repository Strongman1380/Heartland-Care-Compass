# Behavioral Ratings Schema Update Summary

## Quick Answer

✅ **The `daily_ratings` table EXISTS** in your Supabase database  
⚠️ **BUT it's missing 4 comment columns** that your UI is trying to use

## What You Need to Do

Run this SQL in your Supabase SQL Editor:

```sql
-- Add individual comment columns for each behavioral rating
ALTER TABLE public.daily_ratings 
ADD COLUMN IF NOT EXISTS "peerInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "adultInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "investmentLevelComment" TEXT,
ADD COLUMN IF NOT EXISTS "dealAuthorityComment" TEXT;

-- Update the CHECK constraints to allow 0-4 scale
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
```

## Files Created/Updated

### 1. Migration File (NEW)
**`migrations/005_add_behavioral_rating_comments.sql`**
- Contains the SQL to add missing columns
- Updates constraints from 1-5 to 0-4 scale
- Safe to run on existing database

### 2. Complete Schema (UPDATED)
**`COMPLETE_DATABASE_SCHEMA.sql`**
- Updated with the new column definitions
- Use this if setting up a fresh database

### 3. Supabase Schema (UPDATED)
**`supabase-schema.sql`**
- Updated with the new column definitions
- Matches the complete schema

### 4. Documentation (NEW)
**`BEHAVIORAL_RATINGS_SCHEMA.md`**
- Complete documentation of the behavioral ratings schema
- Explains each column and the rating scale
- Includes verification steps

## Current vs. Required Schema

### What You Have Now:
```sql
CREATE TABLE public.daily_ratings (
    id UUID PRIMARY KEY,
    youth_id UUID REFERENCES youth(id),
    date DATE,
    "peerInteraction" INTEGER CHECK (1-5),      -- Wrong scale!
    "adultInteraction" INTEGER CHECK (1-5),     -- Wrong scale!
    "investmentLevel" INTEGER CHECK (1-5),      -- Wrong scale!
    "dealAuthority" INTEGER CHECK (1-5),        -- Wrong scale!
    staff TEXT,
    comments TEXT,                               -- Only 1 comment field
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    UNIQUE(youth_id, date)
);
```

### What You Need:
```sql
CREATE TABLE public.daily_ratings (
    id UUID PRIMARY KEY,
    youth_id UUID REFERENCES youth(id),
    date DATE,
    "peerInteraction" INTEGER CHECK (0-4),      -- ✅ Correct scale
    "adultInteraction" INTEGER CHECK (0-4),     -- ✅ Correct scale
    "investmentLevel" INTEGER CHECK (0-4),      -- ✅ Correct scale
    "dealAuthority" INTEGER CHECK (0-4),        -- ✅ Correct scale
    "peerInteractionComment" TEXT,              -- ✅ NEW
    "adultInteractionComment" TEXT,             -- ✅ NEW
    "investmentLevelComment" TEXT,              -- ✅ NEW
    "dealAuthorityComment" TEXT,                -- ✅ NEW
    staff TEXT,
    comments TEXT,
    "createdAt" TIMESTAMP,
    "updatedAt" TIMESTAMP,
    UNIQUE(youth_id, date)
);
```

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to https://supabase.com
- Select your project
- Click on "SQL Editor" in the left sidebar

### 2. Run the Migration
- Click "New Query"
- Copy the SQL from `migrations/005_add_behavioral_rating_comments.sql`
- Paste it into the editor
- Click "Run" (or press Cmd/Ctrl + Enter)

### 3. Verify the Changes
Run this query to check the table structure:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'daily_ratings'
ORDER BY ordinal_position;
```

You should see all 4 new comment columns.

### 4. Test in Your Application
- Go to the Consolidated Scoring tab for any youth
- Enter behavioral ratings (0-4 scale)
- Add comments in each field
- Click "Submit DPN"
- Verify the data saves correctly

## Why This Was Needed

Your UI (shown in the screenshot) has individual comment fields for each behavioral rating:
- "Notes about peer interaction..."
- "Notes about adult interaction..."
- "Notes about investment level..."
- "Notes about deal w/ authority..."

But the database only had a single `comments` field, so these individual comments weren't being saved.

## Impact

- **No data loss** - Existing ratings are preserved
- **Backward compatible** - Old `comments` field still exists
- **Safe migration** - Uses `IF NOT EXISTS` to prevent errors
- **Immediate benefit** - Comments will now save properly

## Questions?

See `BEHAVIORAL_RATINGS_SCHEMA.md` for complete documentation including:
- Detailed column descriptions
- Rating scale explanation
- TypeScript types
- Related tables
- Troubleshooting tips

---

**Ready to apply?** Just copy the SQL from `migrations/005_add_behavioral_rating_comments.sql` and run it in Supabase! 🚀