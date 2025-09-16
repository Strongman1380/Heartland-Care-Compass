# Supabase Migration Guide

This guide explains how to migrate your Heartland Care Compass application from local storage to Supabase cloud database.

## Overview

The application has been updated to support Supabase as the primary database backend, providing:
- Cloud-based data storage
- Real-time synchronization
- Better performance and reliability
- Data backup and recovery
- Multi-user support capabilities

## What's Changed

### 1. Database Backend
- **Before**: Data stored in browser's local storage
- **After**: Data stored in Supabase PostgreSQL database

### 2. Updated Components
The following components have been updated to use Supabase:
- Youth profiles management
- Behavior points tracking
- Case notes
- All CRUD operations

### 3. New Features
- **Data Migration Tool**: Automatically migrate existing local data to Supabase
- **Real-time Updates**: Changes sync across sessions
- **Better Performance**: Faster data loading and searching
- **Data Persistence**: Data survives browser cache clears

## Migration Process

### Step 1: Set Up Supabase
1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from the project settings
4. Update your environment variables:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

### Step 2: Database Setup
The database tables will be automatically created when you first use the application. The schema includes:

- **youths**: Youth profile information
- **behavior_points**: Daily behavior point records
- **case_notes**: Case notes and documentation

### Step 3: Migrate Existing Data
1. Navigate to the "Migrate Data" page in the application
2. Review your local data summary
3. Click "Start Migration" to transfer your data
4. Monitor the migration progress
5. Review the migration results

### Step 4: Verify Migration
After migration:
1. Check that all youth profiles are visible
2. Verify behavior points data
3. Confirm case notes are accessible
4. Test creating new records

## Using the Migration Tool

### Accessing the Migration Tool
- Navigate to `/migrate-data` in your application
- Or click "Migrate Data" in the navigation menu

### Migration Features
- **Data Preview**: See how much data will be migrated
- **Progress Tracking**: Real-time migration progress
- **Error Handling**: Detailed error reporting
- **Safe Migration**: Original local data remains unchanged

### Migration Results
The tool provides detailed results including:
- Number of youth profiles migrated
- Number of behavior point records migrated
- Number of case notes migrated
- Any errors encountered during migration

## Technical Details

### Database Schema

#### Youths Table
```sql
CREATE TABLE youths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  dob DATE,
  age INTEGER,
  -- ... additional fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Behavior Points Table
```sql
CREATE TABLE behavior_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID REFERENCES youths(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  morningPoints INTEGER DEFAULT 0,
  afternoonPoints INTEGER DEFAULT 0,
  eveningPoints INTEGER DEFAULT 0,
  totalPoints INTEGER DEFAULT 0,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Case Notes Table
```sql
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youth_id UUID REFERENCES youths(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  summary TEXT,
  note TEXT,
  staff TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Integration
The application uses custom hooks for Supabase integration:
- `useYouth()`: Youth profile operations
- `useBehaviorPoints()`: Behavior points management
- `useCaseNotes()`: Case notes operations

## Troubleshooting

### Common Issues

#### Migration Fails
- **Check Internet Connection**: Ensure stable internet during migration
- **Verify Supabase Credentials**: Confirm URL and API key are correct
- **Check Browser Console**: Look for detailed error messages

#### Data Not Appearing
- **Refresh the Page**: Sometimes data needs a refresh to appear
- **Check Supabase Dashboard**: Verify data exists in Supabase tables
- **Clear Browser Cache**: Clear cache and reload the application

#### Performance Issues
- **Check Network**: Slow internet can affect performance
- **Supabase Status**: Check Supabase status page for service issues

### Getting Help
If you encounter issues:
1. Check the browser console for error messages
2. Review the migration results for specific errors
3. Verify your Supabase project configuration
4. Contact support with specific error details

## Best Practices

### Data Management
- **Regular Backups**: Supabase provides automatic backups
- **Monitor Usage**: Keep track of database usage in Supabase dashboard
- **Test Changes**: Test in development before production changes

### Security
- **Environment Variables**: Keep Supabase credentials secure
- **Row Level Security**: Consider implementing RLS for multi-user scenarios
- **API Key Management**: Rotate API keys periodically

### Performance
- **Indexing**: Database indexes are automatically created for common queries
- **Pagination**: Large datasets are automatically paginated
- **Caching**: The application implements intelligent caching

## Future Enhancements

With Supabase integration, future enhancements may include:
- Real-time collaboration features
- Advanced reporting and analytics
- Mobile application support
- Integration with external systems
- Enhanced security and user management

## Support

For technical support or questions about the migration:
- Review this documentation
- Check the application's error logs
- Consult Supabase documentation
- Contact the development team

---

**Note**: This migration is designed to be safe and reversible. Your original local data remains unchanged during the migration process.