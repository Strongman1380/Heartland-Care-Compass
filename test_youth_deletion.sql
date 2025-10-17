-- TEST: Verify Youth Deletion Works
-- Run this in Supabase SQL Editor after deleting "Paytin"

-- Check if Paytin still exists in the database
SELECT id, firstName, lastName, createdAt
FROM youth
WHERE firstName = 'Paytin' OR lastName LIKE '%aytin%';

-- If the query returns results, the youth was NOT actually deleted
-- despite the console saying it was successful

-- Check RLS policies on youth table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'youth';

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'youth';

-- If RLS is enabled but no DELETE policy exists, that's the problem!
