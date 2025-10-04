# 🚀 Quick Start: Fix Behavioral Ratings Schema

## The Problem
Your UI has 4 separate comment fields for behavioral ratings, but your database only has 1 comment field. This means the individual comments aren't being saved! 😱

## The Solution (2 Minutes)

### Step 1: Copy This SQL
```sql
-- Add the missing comment columns
ALTER TABLE public.daily_ratings 
ADD COLUMN IF NOT EXISTS "peerInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "adultInteractionComment" TEXT,
ADD COLUMN IF NOT EXISTS "investmentLevelComment" TEXT,
ADD COLUMN IF NOT EXISTS "dealAuthorityComment" TEXT;

-- Fix the rating scale from 1-5 to 0-4
ALTER TABLE public.daily_ratings 
DROP CONSTRAINT IF EXISTS daily_ratings_peerInteraction_check,
DROP CONSTRAINT IF EXISTS daily_ratings_adultInteraction_check,
DROP CONSTRAINT IF EXISTS daily_ratings_investmentLevel_check,
DROP CONSTRAINT IF EXISTS daily_ratings_dealAuthority_check;

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

### Step 2: Run in Supabase
1. Open https://supabase.com
2. Go to your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Paste the SQL above
6. Click **Run** (or press Cmd/Ctrl + Enter)

### Step 3: Verify
Run this to check it worked:
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'daily_ratings'
AND column_name LIKE '%Comment';
```

You should see:
- peerInteractionComment
- adultInteractionComment
- investmentLevelComment
- dealAuthorityComment

## Done! ✅

Your behavioral ratings comments will now save properly!

## Visual Reference

### Before (Missing Columns):
```
daily_ratings table:
├── id
├── youth_id
├── date
├── peerInteraction (0-4)
├── adultInteraction (0-4)
├── investmentLevel (0-4)
├── dealAuthority (0-4)
├── staff
├── comments ← Only 1 comment field! ❌
├── createdAt
└── updatedAt
```

### After (Complete):
```
daily_ratings table:
├── id
├── youth_id
├── date
├── peerInteraction (0-4)
├── adultInteraction (0-4)
├── investmentLevel (0-4)
├── dealAuthority (0-4)
├── peerInteractionComment ← NEW! ✅
├── adultInteractionComment ← NEW! ✅
├── investmentLevelComment ← NEW! ✅
├── dealAuthorityComment ← NEW! ✅
├── staff
├── comments (legacy)
├── createdAt
└── updatedAt
```

## What This Fixes

| UI Field | Database Column | Status |
|----------|----------------|--------|
| Peer Interaction rating | `peerInteraction` | ✅ Already exists |
| Peer Interaction notes | `peerInteractionComment` | ✅ **ADDED** |
| Adult Interaction rating | `adultInteraction` | ✅ Already exists |
| Adult Interaction notes | `adultInteractionComment` | ✅ **ADDED** |
| Investment Level rating | `investmentLevel` | ✅ Already exists |
| Investment Level notes | `investmentLevelComment` | ✅ **ADDED** |
| Deal w/ Authority rating | `dealAuthority` | ✅ Already exists |
| Deal w/ Authority notes | `dealAuthorityComment` | ✅ **ADDED** |

## Need More Info?

- **Full Documentation**: See `BEHAVIORAL_RATINGS_SCHEMA.md`
- **Migration File**: See `migrations/005_add_behavioral_rating_comments.sql`
- **Complete Schema**: See `COMPLETE_DATABASE_SCHEMA.sql`

---

**That's it!** Your schema is now complete and matches your UI. 🎉