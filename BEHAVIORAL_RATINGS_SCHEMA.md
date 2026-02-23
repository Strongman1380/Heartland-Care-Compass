# Behavioral Ratings Schema Documentation

## Overview
The Behavioral Ratings feature tracks daily assessments of youth behavior across four key domains using a 0-4 scale. This document explains the database schema and how to set it up in Supabase.

## Screenshot Reference
The UI shown in your screenshot displays:
- **Behavioral Ratings (0-4 Scale)** section
- Four rating categories with individual comment fields:
  1. **Peer Interaction** - How the youth interacts with peers
  2. **Adult Interaction** - How the youth interacts with adults/staff
  3. **Investment Level** - The youth's engagement and investment in activities
  4. **Deal w/ Authority** - How the youth responds to authority figures

## Database Table: `daily_ratings`

### Current Schema Status
✅ **Table EXISTS** in your database  
⚠️ **Missing Columns** - Individual comment fields need to be added

### Complete Table Structure

```sql
CREATE TABLE IF NOT EXISTS public.daily_ratings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE,
    
    -- Rating values (0-4 scale)
    "peerInteraction" INTEGER CHECK ("peerInteraction" >= 0 AND "peerInteraction" <= 4),
    "adultInteraction" INTEGER CHECK ("adultInteraction" >= 0 AND "adultInteraction" <= 4),
    "investmentLevel" INTEGER CHECK ("investmentLevel" >= 0 AND "investmentLevel" <= 4),
    "dealAuthority" INTEGER CHECK ("dealAuthority" >= 0 AND "dealAuthority" <= 4),
    
    -- Individual comment fields for each rating
    "peerInteractionComment" TEXT,
    "adultInteractionComment" TEXT,
    "investmentLevelComment" TEXT,
    "dealAuthorityComment" TEXT,
    
    -- General fields
    staff TEXT,
    comments TEXT,  -- Legacy general comments field
    
    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(youth_id, date)
);
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `youth_id` | UUID | Foreign key to youth table |
| `date` | DATE | Date of the rating |
| `peerInteraction` | INTEGER (0-4) | Rating for peer interaction |
| `adultInteraction` | INTEGER (0-4) | Rating for adult interaction |
| `investmentLevel` | INTEGER (0-4) | Rating for investment/engagement level |
| `dealAuthority` | INTEGER (0-4) | Rating for dealing with authority |
| `peerInteractionComment` | TEXT | Notes about peer interaction |
| `adultInteractionComment` | TEXT | Notes about adult interaction |
| `investmentLevelComment` | TEXT | Notes about investment level |
| `dealAuthorityComment` | TEXT | Notes about dealing with authority |
| `staff` | TEXT | Staff member who entered the rating |
| `comments` | TEXT | General notes (legacy field) |
| `createdAt` | TIMESTAMP | When the record was created |
| `updatedAt` | TIMESTAMP | When the record was last updated |

### Rating Scale (0-4)

The behavioral ratings use a 0-4 scale where:
- **0** = Poor/Concerning behavior
- **1** = Below average
- **2** = Average/Acceptable
- **3** = Good/Above average
- **4** = Excellent/Exemplary

## Migration Required

### If Your Table Already Exists

If you already have the `daily_ratings` table but it's missing the comment columns, run this migration:

**File:** `migrations/005_add_behavioral_rating_comments.sql`

```sql
-- Add individual comment columns for each behavioral rating
ALTER TABLE public.daily_ratings 
ADD COLUMN IF NOT EXISTS "peerInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "adultInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "investmentLevelComment" TEXT,
ADD COLUMN IF NOT EXISTS "dealAuthorityComment" TEXT;

-- Update the CHECK constraints to allow 0-4 scale (if currently 1-5)
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

### If Starting Fresh

If you're setting up the database from scratch, use the complete schema file:

**File:** `COMPLETE_DATABASE_SCHEMA.sql`

This file contains all tables including the updated `daily_ratings` table with all necessary columns.

## How to Apply the Migration in Supabase

### Option 1: Using Supabase SQL Editor (Recommended)

1. **Open Supabase Dashboard**
   - Go to your project at https://supabase.com
   - Navigate to the SQL Editor

2. **Run the Migration**
   - Copy the contents of `migrations/005_add_behavioral_rating_comments.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

3. **Verify the Changes**
   ```sql
   -- Check the table structure
   SELECT column_name, data_type, character_maximum_length
   FROM information_schema.columns
   WHERE table_name = 'daily_ratings'
   ORDER BY ordinal_position;
   ```

### Option 2: Using Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or apply a specific migration
supabase migration up
```

## Indexes

The following index exists for performance:

```sql
CREATE INDEX IF NOT EXISTS idx_daily_ratings_youth_date 
ON public.daily_ratings(youth_id, date);
```

This index optimizes queries that filter by youth and date, which is the most common access pattern.

## Row Level Security (RLS)

The table has RLS enabled with a permissive policy:

```sql
ALTER TABLE public.daily_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations on daily_ratings" 
ON public.daily_ratings FOR ALL USING (true);
```

**Note:** You may want to restrict this policy based on your authentication requirements.

## Related Tables

The `daily_ratings` table is part of a larger schema that includes:

- **`youth`** - Main youth profile table (parent table)
- **`behavior_points`** - Daily behavior point tracking
- **`case_notes`** - Case notes and session documentation

## TypeScript Types

The application uses these TypeScript types (from `@/integrations/supabase/services`):

```typescript
interface DailyRatings {
  id?: string;
  youth_id: string;
  date: string;
  peerInteraction?: number;
  adultInteraction?: number;
  investmentLevel?: number;
  dealAuthority?: number;
  peerInteractionComment?: string;
  adultInteractionComment?: string;
  investmentLevelComment?: string;
  dealAuthorityComment?: string;
  staff?: string;
  comments?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

## Usage in the Application

The behavioral ratings are used in several components:

1. **ConsolidatedScoringTab.tsx** - Main data entry interface (shown in your screenshot)
2. **DailyRatingsTab.tsx** - Historical view and analytics
3. **YouthProfile.tsx** - Summary display on youth profile
4. **AssessmentResultsTab.tsx** - Assessment reporting

## Verification Checklist

After running the migration, verify:

- [ ] Table `daily_ratings` exists
- [ ] All 4 rating columns exist with CHECK constraints (0-4)
- [ ] All 4 comment columns exist (TEXT type)
- [ ] Index `idx_daily_ratings_youth_date` exists
- [ ] RLS is enabled
- [ ] Trigger for `updatedAt` is working

## Support

If you encounter any issues:

1. Check the Supabase logs for error messages
2. Verify your database user has sufficient permissions
3. Ensure no existing data violates the new constraints
4. Review the complete schema in `COMPLETE_DATABASE_SCHEMA.sql`

---

**Last Updated:** January 2025  
**Schema Version:** 1.1