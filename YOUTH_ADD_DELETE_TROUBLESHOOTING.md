# Youth Add/Delete Troubleshooting Guide

## Issue
Unable to add new youth profiles or delete existing youth profiles.

## Common Causes & Solutions

### 1. **Supabase Row Level Security (RLS) Policies**

The most common cause is missing or incorrect RLS policies in Supabase.

#### Check RLS Policies:
1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **Policies**
4. Check the `youth` table policies

#### Required Policies:

```sql
-- Allow INSERT (Add Youth)
CREATE POLICY "Allow public insert on youth" ON public.youth
FOR INSERT
TO public
WITH CHECK (true);

-- Allow DELETE (Delete Youth)
CREATE POLICY "Allow public delete on youth" ON public.youth
FOR DELETE
TO public
USING (true);

-- Allow SELECT (View Youth)
CREATE POLICY "Allow public select on youth" ON public.youth
FOR SELECT
TO public
USING (true);

-- Allow UPDATE (Edit Youth)
CREATE POLICY "Allow public update on youth" ON public.youth
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);
```

### 2. **Check Browser Console for Errors**

1. Open your application in the browser
2. Press `F12` or `Cmd+Option+I` (Mac) to open Developer Tools
3. Go to the **Console** tab
4. Try to add or delete a youth
5. Look for any error messages (they will be red)

Common errors:
- `new row violates row-level security policy` → RLS policy issue
- `duplicate key value violates unique constraint` → ID generation issue
- `null value in column "firstName" violates not-null constraint` → Missing required field

### 3. **Verify Supabase Connection**

Check if Supabase is properly configured:

```typescript
// In browser console, run:
localStorage.getItem('sb-bxloqozxgptrfmjfsjsy-auth-token')
```

If this returns `null`, you need to check your Supabase configuration in `.env`:
```
VITE_SUPABASE_URL=https://bxloqozxgptrfmjfsjsy.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. **Check Network Tab**

1. Open Developer Tools (`F12`)
2. Go to **Network** tab
3. Try to add/delete a youth
4. Look for requests to `supabase.co`
5. Click on the failed request and check:
   - **Status Code**: Should be 201 for create, 204 for delete
   - **Response**: Will show the error message

### 5. **Test with SQL Editor**

Go to Supabase Dashboard → SQL Editor and run:

```sql
-- Test INSERT
INSERT INTO youth (firstName, lastName)
VALUES ('Test', 'User')
RETURNING *;

-- Test DELETE (replace 'youth-id' with actual ID)
DELETE FROM youth
WHERE firstName = 'Test' AND lastName = 'User';
```

If these work, the issue is in the frontend. If they fail, it's a database/RLS issue.

### 6. **Check for JavaScript Errors**

Look for these common issues:

#### AddYouthDialog not opening:
- Check if the button has `onClick` handler
- Check if dialog state is managed correctly
- Look for `isAddYouthDialogOpen` state

#### Delete not working:
- Check if delete button is calling `handleDeleteYouth`
- Check if confirmation dialog appears
- Check if `deleteYouth` function is called

### 7. **Verify Supabase Table Exists**

In Supabase Dashboard → Table Editor:
- Confirm the `youth` table exists
- Check that `firstName` and `lastName` columns exist
- Verify column types match the TypeScript types

### 8. **Check for Disabled Buttons**

Sometimes buttons are disabled due to loading states:

```tsx
// In AddYouthDialog, check:
<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Adding..." : "Add Youth"}
</Button>

// Make sure isSubmitting isn't stuck as true
```

## Quick Fix Commands

### Reset RLS Policies (Run in Supabase SQL Editor):

```sql
-- Drop existing policies
DROP POLICY IF EXISTS "Allow public insert on youth" ON public.youth;
DROP POLICY IF EXISTS "Allow public delete on youth" ON public.youth;
DROP POLICY IF EXISTS "Allow public select on youth" ON public.youth;
DROP POLICY IF EXISTS "Allow public update on youth" ON public.youth;

-- Recreate with full access
CREATE POLICY "Enable all access for youth" ON public.youth
FOR ALL
TO public
USING (true)
WITH CHECK (true);
```

### Enable RLS (if disabled):

```sql
ALTER TABLE public.youth ENABLE ROW LEVEL SECURITY;
```

## Testing Steps

1. **Test Add Youth**:
   - Click "Add New Youth" button
   - Fill in First Name and Last Name (required)
   - Click "Add Youth"
   - Check if youth appears in the list
   - Check browser console for errors

2. **Test Delete Youth**:
   - Click delete button (trash icon) on a youth card
   - Confirm deletion in the dialog
   - Check if youth is removed from the list
   - Check browser console for errors

## Files to Check

1. `src/components/youth/AddYouthDialog.tsx` - Add youth logic
2. `src/hooks/useSupabase.ts` - createYouth and deleteYouth functions
3. `src/integrations/supabase/services.ts` - youthService.create() and delete()
4. `src/pages/Index.tsx` - Youth list and delete handlers
5. `.env` - Supabase credentials

## Still Not Working?

If you've tried all the above and it still doesn't work:

1. **Check Supabase Logs**: 
   - Go to Supabase Dashboard → Logs
   - Look for any database errors

2. **Test with cURL**:
   ```bash
   curl -X POST 'https://bxloqozxgptrfmjfsjsy.supabase.co/rest/v1/youth' \
   -H "apikey: YOUR_ANON_KEY" \
   -H "Authorization: Bearer YOUR_ANON_KEY" \
   -H "Content-Type: application/json" \
   -d '{"firstName":"Test","lastName":"User"}'
   ```

3. **Clear Browser Cache**:
   - Clear localStorage: `localStorage.clear()`
   - Refresh the page

4. **Check Supabase Service Status**: https://status.supabase.com/

## Next Steps

After implementing the fixes above:
1. Test adding a new youth
2. Test deleting a youth
3. Commit changes to Git
4. Deploy to Vercel
