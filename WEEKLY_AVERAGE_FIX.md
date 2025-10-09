# Weekly Average Calculation Fix

## Changes Made

### 1. Updated Week Structure (Thursday to Wednesday, excluding weekends)
- Changed from Monday-Friday (5 days) to Thursday-Wednesday, **excluding Saturday and Sunday** (5 school days)
- This aligns with Heartland's weekend calendar where the week runs from Thursday to Wednesday, but students only attend school Thu-Fri and Mon-Wed

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
  { key: 'Mon', idx: 1 },
  { key: 'Tue', idx: 2 },
  { key: 'Wed', idx: 3 },
]
```

### 4. Updated Week Dates Calculation
```typescript
const weekDates = useMemo(() => {
  const dates: string[] = []
  dates.push(toISO(addDays(weekStart, 0))) // Thursday
  dates.push(toISO(addDays(weekStart, 1))) // Friday
  // Skip Saturday (day 2) and Sunday (day 3) - no school
  dates.push(toISO(addDays(weekStart, 4))) // Monday
  dates.push(toISO(addDays(weekStart, 5))) // Tuesday
  dates.push(toISO(addDays(weekStart, 6))) // Wednesday
  return dates
}, [weekStart])
```

### 5. Updated Weekly Average Calculation
- Now calculates average across 5 school days (Thu, Fri, Mon, Tue, Wed)
- Rounds to the nearest tenth using `Math.round(avg * 10) / 10`
- Example: If scores are 3.5, 3.2, 3.8, 3.6, 3.4, 3.7, 3.9, the average would be 3.6 (rounded to nearest tenth)

### 5. Updated UI Elements
- Week range display now shows the full 7-day period
- Table columns updated to accommodate all 7 days
- Column span adjusted from 9 to 11 columns

## Example Week Structure

For October 2025:
- **Week starting Oct 2nd**: Thursday Oct 2 → Wednesday Oct 8 (school days only)
  - Thu 10/2, Fri 10/3, **[Weekend: Sat 10/4, Sun 10/5]**, Mon 10/6, Tue 10/7, Wed 10/8

- **Week starting Oct 9th**: Thursday Oct 9 → Wednesday Oct 15 (school days only)
  - Thu 10/9, Fri 10/10, **[Weekend: Sat 10/11, Sun 10/12]**, Mon 10/13, Tue 10/14, Wed 10/15

## Testing
1. Navigate to the School Scores section
2. Verify that the week displays Thursday, Friday, Monday, Tuesday, Wednesday (no Sat/Sun)
3. Enter scores for multiple days in the week
4. Confirm that the Weekly Average column shows the average rounded to the nearest tenth
5. Test navigation between weeks using Previous/Next buttons

## Technical Details
- The weekly average is calculated only from school days (Thu, Fri, Mon, Tue, Wed)
- Saturday and Sunday are excluded as students do not attend school on weekends
- Empty cells are ignored in the calculation
- The calculation remains dynamic - it updates as new scores are entered
- All existing auto-save functionality is preserved
