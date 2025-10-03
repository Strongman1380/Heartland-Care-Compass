# Heartland Care Compass - Database Setup Guide

This guide will help you set up all the necessary database tables in Supabase for the Heartland Care Compass application.

## Overview

The application uses Supabase (PostgreSQL) for data persistence. Currently, some features are using localStorage as a temporary solution, but this guide will help you migrate everything to Supabase.

## Database Schema Files

### 1. **supabase-schema.sql** - Core Tables
This is the main schema file that creates the foundational tables:
- `youth` - Youth profiles and information
- `behavior_points` - Daily behavior point tracking
- `case_notes` - Case notes for youth
- `daily_ratings` - Daily ratings (peer interaction, adult interaction, etc.)

### 2. **migrations/001_add_real_colors_result.sql** - Real Colors Assessment
Adds support for the Real Colors personality assessment tool:
- Adds `realColorsResult` column to the `youth` table

### 3. **migrations/002_incident_reports.sql** - Incident Reporting System
Creates a comprehensive incident reporting system with:
- `incident_reports` - Main incident reports table
- `incident_audit_logs` - Audit trail for all incident report actions
- `incident_drafts` - Auto-save drafts of incident reports
- `encryption_keys` - Encryption key management for sensitive data
- `incident_attachments` - File attachments for incidents
- `user_roles` - User role management for access control

### 4. **migrations/003_school_tables.sql** - School Module (NEW)
Creates all tables for the School tab functionality:
- `school_daily_scores` - Daily school performance scores (Mon-Fri)
- `academic_credits` - Credits earned by students
- `academic_grades` - Grades and assignment scores
- `academic_steps_completed` - Academic milestones/steps completed
- `school_incident_reports` - School-specific incident reports
- `academic_incident_reports` - Legacy incident reports (backwards compatibility)

## Installation Instructions

### Step 1: Access Supabase SQL Editor

1. Log in to your Supabase project at [https://supabase.com](https://supabase.com)
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query** to create a new SQL query

### Step 2: Run the Schemas in Order

**IMPORTANT:** Run these files in the exact order listed below to avoid dependency errors.

#### A. Run Core Schema (Required - Run First)

```sql
-- Copy and paste the entire contents of: supabase-schema.sql
```

This creates the foundational `youth` table and related tables that other schemas depend on.

#### B. Run Real Colors Migration (Optional)

```sql
-- Copy and paste the entire contents of: migrations/001_add_real_colors_result.sql
```

This adds Real Colors assessment support to the youth table.

#### C. Run Incident Reports Migration (Optional)

```sql
-- Copy and paste the entire contents of: migrations/002_incident_reports.sql
```

This creates the comprehensive incident reporting system.

#### D. Run School Tables Migration (Required for School Tab)

```sql
-- Copy and paste the entire contents of: migrations/003_school_tables.sql
```

This creates all the tables needed for the School tab functionality including:
- School daily scores
- Academic tracking (credits, grades, steps)
- School incident reports

### Step 3: Verify Installation

After running all the schemas, verify the tables were created:

```sql
-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these tables:
- `youth`
- `behavior_points`
- `case_notes`
- `daily_ratings`
- `school_daily_scores` ✓ (School Tab)
- `academic_credits` ✓ (School Tab)
- `academic_grades` ✓ (School Tab)
- `academic_steps_completed` ✓ (School Tab)
- `school_incident_reports` ✓ (School Tab)
- `academic_incident_reports` ✓ (School Tab)
- `incident_reports` (if you ran migration 002)
- `incident_audit_logs` (if you ran migration 002)
- `incident_drafts` (if you ran migration 002)
- `encryption_keys` (if you ran migration 002)
- `incident_attachments` (if you ran migration 002)
- `user_roles` (if you ran migration 002)

## School Tab Tables - Detailed Information

### school_daily_scores
Stores daily school performance scores for each youth (Monday-Friday only).

**Columns:**
- `id` - UUID primary key
- `youth_id` - Reference to youth table
- `date` - Date of the score
- `weekday` - Day of week (1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri)
- `score` - Performance score (0-100)
- `created_at`, `updated_at` - Timestamps

**Unique Constraint:** One score per youth per day

### academic_credits
Tracks academic credits earned by students.

**Columns:**
- `id` - UUID primary key
- `student_id` - Reference to youth table
- `date_earned` - Date credit was earned
- `credit_value` - Decimal value of credits (e.g., 0.25, 0.5, 1.0)
- `subject` - Subject area (optional)
- `notes` - Additional notes
- `created_at`, `updated_at` - Timestamps

### academic_grades
Stores grades and assignment scores.

**Columns:**
- `id` - UUID primary key
- `student_id` - Reference to youth table
- `date_entered` - Date grade was entered
- `grade_value` - Percentage grade (0-100)
- `subject` - Subject area (optional)
- `assignment_name` - Name of assignment (optional)
- `notes` - Additional notes
- `created_at`, `updated_at` - Timestamps

### academic_steps_completed
Tracks academic steps/milestones completed.

**Columns:**
- `id` - UUID primary key
- `student_id` - Reference to youth table
- `date_completed` - Date steps were completed
- `steps_count` - Number of steps completed
- `subject` - Subject area (optional)
- `notes` - Additional notes
- `created_at`, `updated_at` - Timestamps

### school_incident_reports
Comprehensive school incident reports with structured data.

**Columns:**
- `id` - UUID primary key
- `incident_id` - Unique incident number (Format: HHH-YYYY-####, auto-generated)
- `date_time` - When the incident occurred
- `reported_by` - JSONB: Staff member who reported (staff_id, name, role)
- `location` - Where the incident occurred
- `incident_type` - Type of incident (Aggression, Disruption, etc.)
- `severity` - Severity level (Low, Medium, High, Critical)
- `involved_residents` - JSONB array of residents involved
- `witnesses` - JSONB array of witnesses
- `summary` - Brief summary of incident
- `timeline` - JSONB array of timeline entries
- `actions_taken` - Description of interventions
- `medical_needed` - Boolean flag
- `medical_details` - Medical information if needed
- `attachments` - JSONB array of file attachments
- `staff_signatures` - JSONB array of staff signatures
- `follow_up` - JSONB object for follow-up tasks
- `confidential_notes` - Confidential notes
- `created_at`, `updated_at` - Timestamps
- `deleted_at`, `deleted_by` - Soft delete support

## Helpful Views

The schema also creates several helpful views for reporting:

### v_recent_school_scores
Shows recent school scores with youth names.

```sql
SELECT * FROM v_recent_school_scores LIMIT 10;
```

### v_youth_academic_summary
Provides a summary of all academic data for each youth.

```sql
SELECT * FROM v_youth_academic_summary;
```

### v_school_incidents_summary
Shows a summary of all school incidents.

```sql
SELECT * FROM v_school_incidents_summary;
```

## Data Migration from localStorage

After setting up the database, you'll need to update your application code to use Supabase instead of localStorage. The current localStorage keys are:

- `heartland_school_scores` → `school_daily_scores` table
- `academic:credits` → `academic_credits` table
- `academic:grades` → `academic_grades` table
- `academic:steps` → `academic_steps_completed` table
- `academic:school-incidents` → `school_incident_reports` table
- `academic:incidents` → `academic_incident_reports` table

## Security Notes

1. **Row Level Security (RLS)** is enabled on all tables
2. Current policies allow all operations - you should customize these based on your security requirements
3. For production, update the encryption key in the `encryption_keys` table (if using incident reports)
4. Consider implementing user authentication and role-based access control

## Troubleshooting

### Error: relation "youth" does not exist
**Solution:** Run `supabase-schema.sql` first before any migrations.

### Error: duplicate key value violates unique constraint
**Solution:** The table already exists. You can either:
- Drop the table first: `DROP TABLE table_name CASCADE;`
- Or skip that migration if the table is already set up correctly

### Error: permission denied
**Solution:** Make sure you're running the SQL as a superuser in Supabase SQL Editor.

## Next Steps

After setting up the database:

1. Update your Supabase connection configuration in the app
2. Test the School tab functionality to ensure data is being saved
3. Migrate any existing localStorage data to Supabase (if needed)
4. Set up proper RLS policies for production use
5. Configure user roles and permissions

## Support

If you encounter any issues:
1. Check the Supabase logs in the Dashboard
2. Verify your Supabase connection string is correct
3. Ensure all migrations ran successfully
4. Check the browser console for any errors

---

**Last Updated:** January 2025
**Schema Version:** 003