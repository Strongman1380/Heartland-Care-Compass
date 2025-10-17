-- Diagnostic: Check actual column names in youth table
-- Run this in Supabase SQL Editor to see the real column structure

-- Show all columns in the youth table with their exact names
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'youth'
ORDER BY ordinal_position;

-- Alternative way to see table structure
SELECT * FROM youth LIMIT 0;
