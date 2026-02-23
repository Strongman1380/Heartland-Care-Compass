-- Fix Youth Add/Delete Issues
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/bxloqozxgptrfmjfsjsy/sql
-- This will fix the RLS policies that are preventing deletion

-- ====================================
-- STEP 1: Drop ALL existing policies (including any you might have)
-- ====================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'youth') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.youth', r.policyname);
    END LOOP;
END $$;

COMMIT;

-- ====================================
-- STEP 2: Enable RLS
-- ====================================
ALTER TABLE public.youth ENABLE ROW LEVEL SECURITY;

-- ====================================
-- STEP 3: Create permissive policies
-- ====================================

-- Allow anyone to SELECT (read) youth profiles
CREATE POLICY "Allow public to read youth profiles"
ON public.youth
FOR SELECT
TO public
USING (true);

-- Allow anyone to INSERT (create) youth profiles
CREATE POLICY "Allow public to create youth profiles"
ON public.youth
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to UPDATE (edit) youth profiles
CREATE POLICY "Allow public to update youth profiles"
ON public.youth
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Allow anyone to DELETE youth profiles
CREATE POLICY "Allow public to delete youth profiles"
ON public.youth
FOR DELETE
TO public
USING (true);

-- ====================================
-- STEP 4: Verify policies are created
-- ====================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'youth';

-- ====================================
-- STEP 5: Test INSERT
-- ====================================
-- This should work now (columns are quoted because they use camelCase)
INSERT INTO youth ("firstName", "lastName")
VALUES ('Test', 'User')
RETURNING *;

-- ====================================
-- STEP 6: Clean up test data
-- ====================================
-- Delete the test user (columns must be quoted)
DELETE FROM youth
WHERE "firstName" = 'Test' AND "lastName" = 'User';

-- ====================================
-- VERIFICATION
-- ====================================
-- Run this to confirm RLS is enabled and policies exist
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'youth';

-- Show all policies
SELECT 
  policyname as "Policy Name",
  cmd as "Command",
  permissive as "Type"
FROM pg_policies
WHERE tablename = 'youth'
ORDER BY cmd;
