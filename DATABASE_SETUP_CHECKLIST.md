# Database Setup Checklist ✅

Use this checklist to set up your Supabase database for the School tab.

## Pre-Setup

- [ ] I have a Supabase account
- [ ] I have created a Supabase project
- [ ] I know my Supabase project URL
- [ ] I know my Supabase API key (anon/public)

## Setup Steps

### Step 1: Access Supabase SQL Editor
- [ ] Logged into Supabase at https://supabase.com
- [ ] Selected my project
- [ ] Clicked "SQL Editor" in the left sidebar
- [ ] Clicked "New Query" button

### Step 2: Run the Database Schema
- [ ] Opened the file `COMPLETE_DATABASE_SCHEMA.sql`
- [ ] Copied the **entire contents** of the file
- [ ] Pasted into the Supabase SQL Editor
- [ ] Clicked "Run" (or pressed Cmd/Ctrl + Enter)
- [ ] Saw "Success" message (no errors)

### Step 3: Verify Tables Were Created
- [ ] Ran this verification query:
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
- [ ] Saw 7 tables listed in the results

### Step 4: Test the Setup
- [ ] Ran this test query to insert a test incident:
```sql
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
    'Test Location',
    'Disruption',
    'Low',
    'Test incident - can be deleted',
    'Test action'
);
```
- [ ] Ran this query to see the test incident:
```sql
SELECT incident_id, summary FROM school_incident_reports;
```
- [ ] Saw the test incident with an auto-generated incident_id (like HHH-2025-0001)

### Step 5: Configure Your App
- [ ] Located my Supabase project settings
- [ ] Copied the Project URL
- [ ] Copied the anon/public API key
- [ ] Updated my app's environment variables or config file with:
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_ANON_KEY

### Step 6: Test the School Tab
- [ ] Opened the School tab in my app
- [ ] Entered a test score for a student
- [ ] Refreshed the page
- [ ] Verified the score is still there (not lost)
- [ ] Created a test incident report
- [ ] Verified the incident was saved

### Step 7: Clean Up Test Data (Optional)
- [ ] Deleted the test incident:
```sql
DELETE FROM school_incident_reports 
WHERE summary = 'Test incident - can be deleted';
```

## Troubleshooting Checklist

If something didn't work, check these:

### Database Issues
- [ ] Checked Supabase logs for error messages
- [ ] Verified I'm using the SQL Editor (not the API)
- [ ] Confirmed I have the correct permissions
- [ ] Tried running the schema again

### App Connection Issues
- [ ] Verified Supabase URL is correct
- [ ] Verified API key is correct
- [ ] Checked browser console for errors
- [ ] Confirmed app is using Supabase (not localStorage)

### Data Not Saving
- [ ] Confirmed tables exist in Supabase
- [ ] Checked RLS policies are set to allow operations
- [ ] Verified youth records exist (needed for foreign keys)
- [ ] Checked network tab for failed API calls

## Success Criteria ✅

You're done when:
- ✅ All 7 tables exist in Supabase
- ✅ Test incident was created successfully
- ✅ App is connected to Supabase
- ✅ School scores save and persist
- ✅ Incident reports save and persist
- ✅ Data survives page refresh

## What You've Accomplished 🎉

Once this checklist is complete, you have:
- ✅ A fully functional Supabase database
- ✅ All School tab tables created
- ✅ Auto-generated incident numbers
- ✅ Automatic timestamps
- ✅ Data persistence and backup
- ✅ Multi-user support ready
- ✅ Reporting views available

## Next Steps (Optional)

After basic setup works:
- [ ] Set up user authentication
- [ ] Customize RLS policies for security
- [ ] Create user roles (staff, supervisor, admin)
- [ ] Set up automated backups
- [ ] Configure data retention policies
- [ ] Add custom reporting queries

## Files Reference

- 📖 **QUICK_START_DATABASE.md** - Quick start guide
- 📚 **DATABASE_SETUP.md** - Detailed documentation
- 📄 **DATABASE_FILES_SUMMARY.md** - Overview of all files
- ⭐ **COMPLETE_DATABASE_SCHEMA.sql** - The schema to run
- 📋 **DATABASE_SETUP_CHECKLIST.md** - This checklist

---

**Current Status:** [ ] Not Started | [ ] In Progress | [ ] Complete

**Date Completed:** _______________

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________