# Daily Ratings 409 Conflict Error Fix

## Problem
When saving daily behavioral ratings, users were encountering a **409 Conflict** error:
```
Failed to load resource: the server responded with a status of 409
Daily rating insert error: Object
Error saving DPN: Object
```

## Root Cause
1. The database had a `UNIQUE(youth_id, date)` constraint on the `daily_ratings` table
2. A migration (005_daily_ratings_timeslots.sql) was created to add `time_of_day` column and update the constraint to `UNIQUE(youth_id, date, time_of_day)`
3. However, the migration may not have been applied to the production database
4. The TypeScript types in `src/integrations/supabase/types.ts` were not updated to include the `time_of_day` column
5. The service layer was stripping out the `time_of_day` field and using `insert` instead of `upsert`, causing conflicts when trying to save a second rating for the same youth on the same date

## Solution

### 1. Updated TypeScript Types
Added `time_of_day` field to the daily_ratings table types in `src/integrations/supabase/types.ts`:

```typescript
Row: {
  // ... other fields
  time_of_day: string
  // ... other fields
}
Insert: {
  // ... other fields
  time_of_day?: string
  // ... other fields
}
Update: {
  // ... other fields
  time_of_day?: string
  // ... other fields
}
```

### 2. Fixed Service Layer
Updated the `upsert` method in `src/integrations/supabase/services.ts`:

**Before:**
```typescript
async upsert(dailyRating: DailyRatingsInsert & { time_of_day?: 'morning' | 'day' | 'evening' }): Promise<DailyRatings> {
  // Removed time_of_day from payload
  const { time_of_day, ...cleanPayload } = dailyRating as any;
  
  // Used insert which fails on duplicates
  const { data, error } = await supabase
    .from('daily_ratings')
    .insert(cleanPayload)
    .select()
    .single()
  // ...
}
```

**After:**
```typescript
async upsert(dailyRating: DailyRatingsInsert & { time_of_day?: 'morning' | 'day' | 'evening' }): Promise<DailyRatings> {
  // Include time_of_day with default value
  const payload = {
    ...dailyRating,
    time_of_day: dailyRating.time_of_day || 'day'
  };

  // Use upsert with correct conflict resolution
  const { data, error } = await supabase
    .from('daily_ratings')
    .upsert(payload, {
      onConflict: 'youth_id,date,time_of_day'
    })
    .select()
    .single()
  // ...
}
```

### 3. Updated getByDate Method
Enhanced the `getByDate` method to properly filter by `time_of_day`:

```typescript
async getByDate(youthId: string, date: string, timeOfDay?: 'morning' | 'day' | 'evening'): Promise<DailyRatings | null> {
  let query = supabase
    .from('daily_ratings')
    .select('*')
    .eq('youth_id', youthId)
    .eq('date', date);

  // Filter by time_of_day (default to 'day')
  if (timeOfDay) {
    query = query.eq('time_of_day', timeOfDay);
  } else {
    query = query.eq('time_of_day', 'day');
  }

  const { data, error } = await query.maybeSingle();
  // ...
}
```

### 4. Created Migration
Created `migrations/007_fix_daily_ratings_constraint.sql` to ensure the database schema is correct:
- Adds `time_of_day` column if it doesn't exist (default: 'day')
- Drops old `UNIQUE(youth_id, date)` constraint
- Adds new `UNIQUE(youth_id, date, time_of_day)` constraint

## Database Migration Required

**IMPORTANT:** You must apply the migration to your production Supabase database:

1. Go to Supabase Dashboard → SQL Editor
2. Run the following SQL:

```sql
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
```

## Benefits

1. **No More Conflicts**: The `upsert` operation will now update existing records instead of failing with 409 errors
2. **Multiple Entries Per Day**: The system now properly supports morning, day, and evening ratings for the same youth on the same date
3. **Type Safety**: TypeScript types now match the database schema
4. **Proper Default**: All existing and new ratings default to 'day' time slot

## Testing

After applying the migration and deploying the code:

1. Navigate to a youth profile
2. Enter behavioral ratings for a specific date
3. Click "Save Behavioral Ratings"
4. Verify no 409 errors in console
5. Try saving again for the same date - it should update the existing entry instead of creating a duplicate

## Related Files

- `src/integrations/supabase/types.ts` - Updated TypeScript types
- `src/integrations/supabase/services.ts` - Fixed upsert and getByDate methods
- `migrations/005_daily_ratings_timeslots.sql` - Original migration (may not have been applied)
- `migrations/007_fix_daily_ratings_constraint.sql` - New migration with safety checks
