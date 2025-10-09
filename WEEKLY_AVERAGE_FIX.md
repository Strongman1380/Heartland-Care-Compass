# Weekly Average Calculation Fix

## Changes Made

### 1. Updated Week Structure (Thursday to Wednesday)
- Changed from Monday-Friday (5 days) to Thursday-Wednesday (7 days)
- This aligns with Heartland's weekend calendar where the week runs from Thursday of the previous week to Wednesday of the current week

### 2. Updated `startOfWeekThursday` Function
```typescript
const startOfWeekThursday = (d: Date) => {
  const day = d.getDay() // 0 Sun .. 6 Sat
  // Calculate days to go back to reach Thursday
  let diff: number
  if (day >= 4) {
    diff = 4 - day // Thu=0, Fri=-1, Sat=-2
  } else {
    diff = -(3 + day) // Sun=-3, Mon=-4, Tue=-5, Wed=-6
  }
  const res = new Date(d)
  res.setDate(d.getDate() + diff)
  res.setHours(0,0,0,0)
  return res
}
```

### 3. Updated Weekdays Array
```typescript
const weekdays = [
  { key: 'Thu', idx: 4 },
  { key: 'Fri', idx: 5 },
  { key: 'Sat', idx: 6 },
  { key: 'Sun', idx: 0 },
  { key: 'Mon', idx: 1 },
  { key: 'Tue', idx: 2 },
  { key: 'Wed', idx: 3 },
]
```

### 4. Updated Weekly Average Calculation
- Now calculates average across all 7 days (Thu-Wed)
- Rounds to the nearest tenth using `Math.round(avg * 10) / 10`
- Example: If scores are 3.5, 3.2, 3.8, 3.6, 3.4, 3.7, 3.9, the average would be 3.6 (rounded to nearest tenth)

### 5. Updated UI Elements
- Week range display now shows the full 7-day period
- Table columns updated to accommodate all 7 days
- Column span adjusted from 9 to 11 columns

## Example Week Structure

For October 2025:
- **Week starting Oct 2nd**: Thursday Oct 2 → Wednesday Oct 8
  - Thu 10/2, Fri 10/3, Sat 10/4, Sun 10/5, Mon 10/6, Tue 10/7, Wed 10/8

- **Week starting Oct 9th**: Thursday Oct 9 → Wednesday Oct 15
  - Thu 10/9, Fri 10/10, Sat 10/11, Sun 10/12, Mon 10/13, Tue 10/14, Wed 10/15

## Testing
1. Navigate to the School Scores section
2. Verify that the week displays Thursday through Wednesday
3. Enter scores for multiple days in the week
4. Confirm that the Weekly Average column shows the average rounded to the nearest tenth
5. Test navigation between weeks using Previous/Next buttons

## Technical Details
- The weekly average is calculated only from days that have scores entered
- Empty cells are ignored in the calculation
- The calculation remains dynamic - it updates as new scores are entered
- All existing auto-save functionality is preserved
