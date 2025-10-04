# School Scores Recovery - Step-by-Step Guide

## 🚨 What Happened?

Your school scores disappeared because of an infinite loop bug that caused your browser to run out of resources. The good news is that **your data is likely still safe** in either localStorage or Supabase!

## ✅ Quick Fix Steps

### Step 1: Apply the Code Fix

The code has already been fixed in these files:
- ✅ `/src/utils/schoolScores.ts` - Fixed error handling and increased cooldown
- ✅ `/src/pages/SchoolScores.tsx` - Added error handling

### Step 2: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart it
npm run dev:full
```

### Step 3: Clear Browser Resources

1. **Close ALL tabs** of your application
2. **Clear browser cache**:
   - **Chrome/Edge**: Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files" 
   - Click "Clear data"
   - **DO NOT** clear "Cookies and other site data" (this would delete localStorage)

### Step 4: Check Your Data

**Option A: Use the localStorage Checker Tool**

1. Open the file `check-localStorage.html` in your browser
2. Click "🔍 Check Data"
3. You should see statistics about your scores
4. If data is found, click "💾 Export Data" to create a backup

**Option B: Check Manually**

1. Open your application
2. Press `F12` to open Developer Console
3. Go to **Application** tab
4. Click **Local Storage** → your site URL
5. Look for `heartland_school_scores`
6. If it has data, your scores are safe!

### Step 5: Reload the Application

1. Open your application in the browser
2. Navigate to **School** → **Scores**
3. Wait 10 seconds for the sync to complete
4. Your scores should now appear!

## 🔍 Troubleshooting

### Problem: Still seeing errors in console

**Solution:**
- Hard refresh the page: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- This forces the browser to reload all JavaScript files with the fixes

### Problem: Scores still not showing

**Check 1: Is data in localStorage?**
```javascript
// Run this in browser console:
JSON.parse(localStorage.getItem('heartland_school_scores'))
```
- If it returns an array with data → Data is safe, continue to Check 2
- If it returns `null` → Data is not in localStorage, go to Check 3

**Check 2: Is Supabase connected?**
```javascript
// Run this in browser console:
console.log(import.meta.env.VITE_SUPABASE_URL)
```
- Should show: `https://bxloqozxgptrfmjfsjsy.supabase.co`
- If undefined → Check your `.env` file

**Check 3: Is data in Supabase?**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Table Editor**
4. Open `school_scores` table
5. Check if data exists

### Problem: Data is in Supabase but not loading

**Solution:**
1. Clear localStorage completely:
   ```javascript
   // Run in browser console:
   localStorage.removeItem('heartland_school_scores')
   ```
2. Refresh the page
3. Wait 10 seconds for sync
4. Data should load from Supabase

### Problem: Data is lost completely

**Recovery Options:**

1. **Check browser history/cache**:
   - Some browsers keep cached versions
   - Try accessing an older cached version

2. **Check Supabase backups**:
   - Supabase keeps automatic backups
   - Contact Supabase support for point-in-time recovery

3. **Manual re-entry**:
   - If data is truly lost, you'll need to re-enter scores
   - The fix ensures this won't happen again

## 📊 Verify Everything is Working

After recovery, test these scenarios:

### Test 1: Enter a New Score
1. Go to School Scores page
2. Enter a score for any student
3. Wait 2 seconds (auto-save)
4. Check console - should see no errors
5. Refresh page - score should persist

### Test 2: Check Average Scores
1. Scores should show in the grid
2. Weekly averages should appear at the bottom
3. AI Insights should show statistics
4. Trend indicators should appear next to student names

### Test 3: Navigate Away and Back
1. Go to a different page
2. Come back to School Scores
3. All scores should still be there
4. No console errors

### Test 4: Check Console
Open Developer Console and verify:
- ✅ No `Uncaught (in promise)` errors
- ✅ No `ERR_INSUFFICIENT_RESOURCES` errors
- ✅ At most one warning: `School scores sync failed, using local cache` (only if Supabase is down)

## 🛡️ Prevention Measures Now in Place

The following safeguards prevent this from happening again:

1. **Proper Error Handling**: Errors are caught and logged, not crashed
2. **Sync Cooldown**: 10-second minimum between syncs prevents API spam
3. **Graceful Degradation**: Falls back to localStorage if Supabase fails
4. **Better Logging**: Warnings instead of silent failures

## 📞 Still Need Help?

If you're still having issues, gather this information:

1. **Browser Console Logs**:
   - Press F12 → Console tab
   - Take a screenshot of any errors

2. **localStorage Contents**:
   - Use the `check-localStorage.html` tool
   - Click "Export Data" to save a backup

3. **Supabase Status**:
   - Check if you can access Supabase dashboard
   - Verify the `school_scores` table exists

4. **Environment Variables**:
   - Check that `.env` file has correct Supabase credentials

Then create an issue with:
- Screenshots of console errors
- localStorage export file
- Description of what you've tried

## 🎯 Expected Outcome

After following these steps:
- ✅ School scores are visible in the grid
- ✅ Average scores are calculated and displayed
- ✅ No console errors
- ✅ Scores persist after page refresh
- ✅ New scores can be entered and saved
- ✅ AI insights work correctly

---

**Last Updated:** January 2025
**Status:** Fix Applied ✅