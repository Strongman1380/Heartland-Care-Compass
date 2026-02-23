# Daily Ratings 409/400 Conflict Error Fix - Multiple Entries Per Day

## Problem
When saving daily behavioral ratings, users were encountering **409 Conflict** and **400 Bad Request** errors:
```
Failed to load resource: the server responded with a status of 409
Failed to load resource: the server responded with a status of 400
Daily rating insert error / Daily rating upsert error
Error saving DPN
```

## Root Cause
1. The database had a `UNIQUE(youth_id, date)` constraint on the `daily_ratings` table
2. This prevented saving multiple behavioral ratings for the same youth on the same day
3. Users need to be able to enter multiple ratings per day (e.g., morning check-in, afternoon incident, evening review)
4. A previous migration attempted to add `time_of_day` column but it wasn't applied to production
5. The service layer was trying to use upsert with a constraint that didn't exist

## Solution

### Approach: Allow Multiple Entries Per Day
Instead of trying to enforce one entry per day or per time slot, we're removing the unique constraint entirely to allow truly multiple entries per day. This gives maximum flexibility.

### 1. Updated Service Layer
Updated the `upsert` method in `src/integrations/supabase/services.ts` to allow multiple inserts:

**New Implementation:**
```typescript
async upsert(dailyRating: DailyRatingsInsert & { time_of_day?: 'morning' | 'day' | 'evening' }): Promise<DailyRatings> {
  // Remove time_of_day as it may not exist in the database yet
  const { time_of_day, ...payload } = dailyRating as any;

  // If there's an id, update the existing record
  if ('id' in payload && payload.id) {
    const { data, error } = await supabase
      .from('daily_ratings')
      .update(payload)
      .eq('id', payload.id)
      .select()
      .single();

    if (error) {
      console.error('Daily rating update error:', error);
      throw error;
    }
    return data;
  }

  // Otherwise, insert a new record (allows multiple entries per day)
  const { data, error } = await supabase
    .from('daily_ratings')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Daily rating insert error:', error);
    throw error;
  }
  return data;
}
```

### 2. Updated getByDate Method
Changed to get the most recent rating for a date:

```typescript
async getByDate(youthId: string, date: string, timeOfDay?: 'morning' | 'day' | 'evening'): Promise<DailyRatings | null> {
  // Get the most recent rating for this date
  const { data, error } = await supabase
    .from('daily_ratings')
    .select('*')
    .eq('youth_id', youthId)
    .eq('date', date)
    .order('createdAt', { ascending: false })
    .limit(1)
    .maybeSingle();
  // ...
}
```

### 3. Removed time_of_day from TypeScript Types
Cleaned up the TypeScript types to match the actual database schema (without time_of_day).

### 4. Updated Migration
Simplified `migrations/007_fix_daily_ratings_constraint.sql` to just remove constraints:

```sql
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
```

## Database Migration Required

**IMPORTANT:** You must apply the migration to your production Supabase database:

1. Go to Supabase Dashboard → SQL Editor
2. Run the following SQL:

```sql
## 🚨 **IMPORTANT: Database Migration Required**

You **MUST** apply this SQL migration in your Supabase dashboard:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. **Run this SQL:**

```sql
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
```

### After Migration
Once you run the migration:
- ✅ No more 409/400 errors
- ✅ **Multiple ratings per day are now allowed**
- ✅ Each rating is a separate entry with its own timestamp
- ✅ System retrieves the most recent rating when loading
- ✅ Each rating can be edited independently if needed

## Benefits

1. **True Multiple Entries**: Staff can enter as many behavioral ratings as needed per day
2. **Timestamped**: Each entry has its own creation timestamp for tracking
3. **No Conflicts**: No unique constraints to cause errors
4. **Flexibility**: Perfect for documenting multiple incidents or check-ins throughout the day
5. **Historical Record**: All entries are preserved for reporting and analysis

## Use Cases

Now you can:
- Enter morning behavioral assessment
- Add notes after a specific incident during the day
- Record evening check-in ratings
- Document multiple interventions
- Track behavioral changes throughout the day

## Testing

After applying the migration:
1. Go to a youth profile
2. Enter behavioral ratings
3. Click "Save Behavioral Ratings"
4. Verify no console errors
5. **Enter ratings again for the same date** - should create a new entry successfully
6. Check that multiple entries are saved (you can query the database or check reports)

## Related Files

- `src/integrations/supabase/types.ts` - Cleaned up TypeScript types (removed time_of_day)
- `src/integrations/supabase/services.ts` - Updated upsert to allow multiple inserts, getByDate to get most recent
- `migrations/007_fix_daily_ratings_constraint.sql` - Migration to remove unique constraints

