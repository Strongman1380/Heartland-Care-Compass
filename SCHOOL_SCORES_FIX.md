# School Scores Issue - Fix Documentation

## Problem Summary

The school scores disappeared and average scores were not showing due to an **infinite loop of API calls** that caused browser resource exhaustion.

### Root Cause

The issue was in `/src/utils/schoolScores.ts` at line 94. The error handling for the Supabase sync was not properly catching errors inside the async function, causing:

1. **Hundreds of uncaught promise errors** (`Uncaught (in promise) Object`)
2. **Browser resource exhaustion** (`ERR_INSUFFICIENT_RESOURCES`)
3. **Failed API calls** to Supabase that kept retrying
4. **Inability to load scores** from localStorage due to the browser being overwhelmed

### Console Errors Observed

```
schoolScores.ts:94 Uncaught (in promise) Object (repeated hundreds of times)
youth:1 Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES (repeated hundreds of times)
bxloqozxgptrfmjfsjsy.supabase.co/rest/v1/school_scores?... Failed to load resource: net::ERR_INSUFFICIENT_RESOURCES
```

## Changes Made

### 1. Fixed Error Handling in `schoolScores.ts`

**Before:**
```typescript
try {
  void (async () => {
    const remote = await schoolScoresService.range(startISO, endISO)
    // ... processing code
  })()
} catch (error) {
  console.error('School scores sync error:', error);
}
```

**After:**
```typescript
// Fire and forget with proper error handling
(async () => {
  try {
    const remote = await schoolScoresService.range(startISO, endISO)
    // ... processing code
  } catch (error) {
    // Silently fail - we'll use local cache
    console.warn('School scores sync failed, using local cache:', error);
  }
})()
```

**Why this fixes it:** The error handling is now **inside** the async function, so errors are properly caught and don't propagate as uncaught promise rejections.

### 2. Increased Sync Cooldown Period

**Before:**
```typescript
const SYNC_COOLDOWN = 2000; // 2 seconds
```

**After:**
```typescript
const SYNC_COOLDOWN = 10000; // 10 seconds between syncs for same range to prevent resource exhaustion
```

**Why this helps:** Prevents rapid-fire API calls that can overwhelm the browser and Supabase.

### 3. Added Error Handling in SchoolScores.tsx

Added try-catch block around the `loadScores` function to prevent any errors from breaking the component.

## How to Recover Your Data

### Option 1: Refresh the Browser (Recommended)

1. **Close all tabs** of the application
2. **Clear browser cache** (optional but recommended):
   - Chrome/Edge: Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Click "Clear data"
3. **Reopen the application**
4. Navigate to School > Scores

The scores should now load from localStorage if they're still there.

### Option 2: Check localStorage Manually

1. Open Developer Console (`F12` or right-click > Inspect)
2. Go to **Application** tab
3. Expand **Local Storage** in the left sidebar
4. Click on your site URL
5. Look for the key `heartland_school_scores`
6. If it exists and has data, the scores are still there

### Option 3: Restore from Supabase

If the data is in Supabase but not showing locally:

1. The fix will automatically sync from Supabase on next page load
2. Wait for the sync to complete (up to 10 seconds)
3. Scores should appear in the grid

## Testing the Fix

After deploying these changes:

1. **Open the School Scores page**
2. **Check the browser console** - you should see:
   - No more `Uncaught (in promise)` errors
   - At most one warning: `School scores sync failed, using local cache` (if Supabase is unreachable)
3. **Verify scores load** from localStorage
4. **Enter a new score** and verify it saves
5. **Refresh the page** and verify scores persist

## Prevention

The following safeguards are now in place:

1. ✅ **Proper async error handling** - errors won't crash the app
2. ✅ **Sync cooldown** - prevents API spam
3. ✅ **Graceful degradation** - falls back to localStorage if Supabase fails
4. ✅ **Error logging** - warnings instead of crashes

## Next Steps

1. **Deploy the fix** to your environment
2. **Test thoroughly** with the steps above
3. **Monitor console** for any remaining errors
4. **Verify data integrity** - check that all scores are present

## If Scores Are Still Missing

If scores are still not showing after the fix:

1. **Check Supabase directly**:
   - Go to your Supabase dashboard
   - Navigate to Table Editor
   - Open the `school_scores` table
   - Verify data exists

2. **Check localStorage**:
   - Follow Option 2 above
   - If empty, data may need to be re-entered or restored from backup

3. **Contact support** with:
   - Browser console logs
   - localStorage contents
   - Supabase table screenshot

## Technical Details

### Data Flow

```
User enters score
    ↓
Auto-save triggered (200ms debounce)
    ↓
upsertScore() called
    ↓
├─→ Save to Supabase (async, fire-and-forget)
└─→ Save to localStorage (immediate)
    ↓
Page refresh
    ↓
getScoresForRange() called
    ↓
├─→ Sync from Supabase (with 10s cooldown)
└─→ Read from localStorage (immediate)
```

### Why localStorage + Supabase?

- **localStorage**: Fast, immediate access, works offline
- **Supabase**: Persistent, shared across devices, backup
- **Hybrid approach**: Best of both worlds with graceful fallback

---

**Date Fixed:** January 2025
**Files Modified:**
- `/src/utils/schoolScores.ts` - Fixed async error handling, increased sync cooldown
- `/src/pages/SchoolScores.tsx` - Added error handling in loadScores
- `/src/utils/academicStore.ts` - Fixed async error handling in listSchoolIncidents
- `/src/utils/local-storage-utils.ts` - Fixed async error handling in fetchProgressNotes
- `/src/utils/alertService.ts` - Fixed async error handling in loadAlerts
- `/src/integrations/supabase/schoolScoresService.ts` - Fixed table name from 'school_scores' to 'school_daily_scores'