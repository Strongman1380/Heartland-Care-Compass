# Create School Scores Table in Supabase

## 🎯 Quick Fix for Missing Table Error

You're seeing this error:
```
"Could not find the table 'public.school_daily_scores' in the schema cache"
```

This means the database table hasn't been created yet. Here's how to fix it:

---

## ✅ **Option 1: Run the Migration in Supabase (Recommended)**

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase dashboard: https://supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy and Run the Migration

Copy the entire contents of this file:
```
/migrations/003_school_tables.sql
```

Or use the quick SQL below to create just the `school_daily_scores` table:

```sql
-- Create school_daily_scores table
CREATE TABLE IF NOT EXISTS school_daily_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youth_id UUID NOT NULL REFERENCES public.youth(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weekday INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 5), -- 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one score per youth per day
    UNIQUE(youth_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_daily_scores_youth_id ON school_daily_scores(youth_id);
CREATE INDEX IF NOT EXISTS idx_school_daily_scores_date ON school_daily_scores(date DESC);
CREATE INDEX IF NOT EXISTS idx_school_daily_scores_youth_date ON school_daily_scores(youth_id, date DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE school_daily_scores ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read/write
CREATE POLICY "Allow authenticated users full access to school_daily_scores"
ON school_daily_scores
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

### Step 3: Click "Run" or press Ctrl+Enter

The table will be created instantly.

### Step 4: Verify the Table Exists

Run this query to confirm:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'school_daily_scores';
```

You should see `school_daily_scores` in the results.

---

## ✅ **Option 2: Use localStorage Only (Temporary)**

If you don't want to use Supabase right now, the app will work fine with just localStorage. The error you're seeing is harmless - it's just a warning that Supabase sync failed, but the app falls back to localStorage automatically.

**What this means:**
- ✅ School scores will save to localStorage
- ✅ Scores will persist across page refreshes
- ✅ App functions normally
- ❌ Scores won't sync across devices
- ❌ No cloud backup

**To use this option:** Just ignore the console warnings. Your scores are being saved locally.

---

## 🔍 **After Creating the Table**

Once the table is created in Supabase:

1. **Refresh your app** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Check the console** - the 404 errors should be gone
3. **Enter a new score** - it will now save to both localStorage AND Supabase
4. **Verify sync** - check the Supabase dashboard to see the data

---

## 📊 **Current Status**

### ✅ **Already Fixed:**
- Infinite loop bug (no more resource exhaustion)
- Async error handling (errors are caught properly)
- Table name mismatch (code now uses correct table name)

### ⚠️ **Needs Action:**
- Create the `school_daily_scores` table in Supabase (or use localStorage only)

---

## 🆘 **Troubleshooting**

### If you get "youth table doesn't exist" error:

You need to run the core schema first:

1. Run `/supabase-schema.sql` first (creates the `youth` table)
2. Then run the school tables migration

### If you get permission errors:

Make sure you're logged into Supabase and have admin access to your project.

### If the table exists but you still get 404 errors:

1. Check if RLS (Row Level Security) is blocking access
2. Make sure you're authenticated in the app
3. Try refreshing the Supabase schema cache (restart the Supabase project)

---

## 📝 **Summary**

**The good news:** The critical bug is fixed! Your app is no longer crashing.

**The remaining issue:** The Supabase table needs to be created (or you can just use localStorage).

**Recommendation:** Create the table in Supabase for cloud backup and multi-device sync, but the app works fine with just localStorage if you prefer.