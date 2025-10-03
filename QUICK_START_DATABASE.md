# Quick Start - Database Setup

## 🚀 Fastest Way to Set Up Your Database

### Option 1: Run Everything at Once (Recommended)

1. **Open Supabase SQL Editor**
   - Go to [https://supabase.com](https://supabase.com)
   - Select your project
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Copy and Run the Complete Schema**
   - Open the file: `COMPLETE_DATABASE_SCHEMA.sql`
   - Copy the **entire contents**
   - Paste into the Supabase SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

3. **Done!** ✅
   - All tables are now created
   - School tab will now save data to Supabase
   - All features are ready to use

### Option 2: Run Individual Files (If you need more control)

Run these files **in order** in the Supabase SQL Editor:

1. `supabase-schema.sql` - Core tables (youth, behavior, etc.)
2. `migrations/001_add_real_colors_result.sql` - Real Colors support
3. `migrations/003_school_tables.sql` - School module tables

## 📋 What Gets Created

### Core Tables
- ✅ `youth` - Youth profiles
- ✅ `behavior_points` - Daily behavior tracking
- ✅ `case_notes` - Case notes
- ✅ `daily_ratings` - Daily ratings

### School Tables (What You Need!)
- ✅ `school_daily_scores` - Daily school scores (Mon-Fri)
- ✅ `academic_credits` - Credits earned
- ✅ `academic_grades` - Grades and assignments
- ✅ `academic_steps_completed` - Steps/milestones
- ✅ `school_incident_reports` - School incident reports
- ✅ `academic_incident_reports` - Legacy incidents

### Bonus Features
- ✅ Auto-generated incident numbers (HHH-2025-0001)
- ✅ Automatic timestamps (created_at, updated_at)
- ✅ Helpful views for reporting
- ✅ Full-text search on incidents
- ✅ Row-level security enabled

## 🔍 Verify Installation

Run this query in Supabase SQL Editor to check all tables were created:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'youth',
    'school_daily_scores',
    'academic_credits',
    'academic_grades',
    'academic_steps_completed',
    'school_incident_reports',
    'academic_incident_reports'
  )
ORDER BY table_name;
```

You should see **7 tables** listed.

## 🎯 Test Your Setup

### Test School Scores
```sql
-- Insert a test score
INSERT INTO school_daily_scores (youth_id, date, weekday, score)
SELECT 
    id,
    CURRENT_DATE,
    EXTRACT(DOW FROM CURRENT_DATE)::INTEGER,
    85
FROM youth
LIMIT 1;

-- View the score
SELECT * FROM v_recent_school_scores LIMIT 5;
```

### Test School Incident
```sql
-- Insert a test incident
INSERT INTO school_incident_reports (
    date_time,
    reported_by,
    location,
    incident_type,
    severity,
    summary,
    actions_taken
) VALUES (
    NOW(),
    '{"staff_id": "1", "name": "Test Staff", "role": "Teacher"}'::jsonb,
    'Classroom A',
    'Disruption',
    'Low',
    'Test incident for verification',
    'Verbal warning given'
);

-- View the incident (note the auto-generated incident_id)
SELECT incident_id, summary, incident_type FROM school_incident_reports;
```

## ⚠️ Troubleshooting

### "relation 'youth' does not exist"
**Fix:** Run `supabase-schema.sql` first, or use `COMPLETE_DATABASE_SCHEMA.sql`

### "permission denied"
**Fix:** Make sure you're logged into Supabase and using the SQL Editor (not the API)

### "duplicate key value"
**Fix:** Table already exists. Either:
- Skip that migration, or
- Drop the table first: `DROP TABLE table_name CASCADE;`

### Scores still not saving?
**Check:**
1. ✅ Database tables created successfully
2. ✅ Supabase connection configured in your app
3. ✅ Check browser console for errors
4. ✅ Verify Supabase API keys are correct

## 📚 Next Steps

1. **Update App Configuration**
   - Ensure Supabase URL and API key are set correctly
   - Check `.env` or environment variables

2. **Test the School Tab**
   - Enter some scores
   - Create an incident report
   - Verify data persists after refresh

3. **Migrate Existing Data** (if needed)
   - Export localStorage data
   - Import into Supabase tables

4. **Customize Security** (for production)
   - Update RLS policies
   - Set up user roles
   - Configure authentication

## 📖 Full Documentation

For detailed information, see:
- `DATABASE_SETUP.md` - Complete setup guide
- `COMPLETE_DATABASE_SCHEMA.sql` - Full schema with comments
- `migrations/` folder - Individual migration files

---

**Need Help?** Check the Supabase logs in your dashboard or the browser console for error messages.