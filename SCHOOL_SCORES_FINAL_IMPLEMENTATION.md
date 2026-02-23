# School Scores Update - Final Implementation

## Summary
Updated the School Scores section to align with Heartland's calendar week (Thursday to Wednesday) while **excluding Saturday and Sunday** since students do not attend school on weekends.

## What Changed

### Previous Version (Mon-Fri)
- Week: Monday to Friday (5 school days)
- Days displayed: Mon, Tue, Wed, Thu, Fri

### Current Version (Thu-Wed, excluding weekends)
- Week: Thursday to Wednesday (5 school days)
- Days displayed: **Thu, Fri, Mon, Tue, Wed**
- Weekends excluded: Saturday and Sunday are not shown

## Display Example

```
Week: 2025-10-02 to 2025-10-08 (excluding Sat/Sun)

| Youth    | Thu | Fri | Mon | Tue | Wed | Week Avg | 30-Day Avg | Trend |
|----------|-----|-----|-----|-----|-----|----------|------------|-------|
| Student  | 3.5 | 3.2 | 3.4 | 3.7 | 3.9 | 3.5      | 3.4        | ↑     |
```

## Weekly Average Calculation

The weekly average is calculated from the 5 school days:
- **Thursday** (previous week)
- **Friday** (previous week)
- **Monday** (current week)
- **Tuesday** (current week)
- **Wednesday** (current week)

Formula: `(Thu + Fri + Mon + Tue + Wed) / 5`, rounded to nearest tenth

Example: (3.5 + 3.2 + 3.4 + 3.7 + 3.9) / 5 = 3.54 → **3.5**

## Why This Structure?

1. **Heartland's Week Definition**: The organization defines their week as Thursday to Wednesday
2. **School Days Only**: Students don't attend school on weekends, so those days are excluded
3. **Cleaner Interface**: No empty weekend columns
4. **Accurate Averages**: Only includes days when students are actually in school
5. **Consistent Reporting**: Matches how the organization tracks student performance

## Technical Implementation

### Week Start Calculation
```typescript
const startOfWeekThursday = (d: Date) => {
  const day = d.getDay()
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

### Week Dates (Skipping Weekends)
```typescript
const weekDates = useMemo(() => {
  const dates: string[] = []
  dates.push(toISO(addDays(weekStart, 0))) // Thursday
  dates.push(toISO(addDays(weekStart, 1))) // Friday
  // Skip Saturday (day 2) and Sunday (day 3)
  dates.push(toISO(addDays(weekStart, 4))) // Monday
  dates.push(toISO(addDays(weekStart, 5))) // Tuesday
  dates.push(toISO(addDays(weekStart, 6))) // Wednesday
  return dates
}, [weekStart])
```

## Navigation Examples

When using "This Week" button on October 9, 2025 (Thursday):
- **Current week starts**: Oct 9 (Thursday)
- **Days shown**: Thu 10/9, Fri 10/10, Mon 10/13, Tue 10/14, Wed 10/15

When clicking "Previous Week":
- **Previous week starts**: Oct 2 (Thursday)
- **Days shown**: Thu 10/2, Fri 10/3, Mon 10/6, Tue 10/7, Wed 10/8

When clicking "Next Week":
- **Next week starts**: Oct 16 (Thursday)
- **Days shown**: Thu 10/16, Fri 10/17, Mon 10/20, Tue 10/21, Wed 10/22

## Deployment Info

- **Committed**: e24a0a3
- **Deployed**: Vercel Production
- **URL**: https://heartland-care-compass-ey8jd507d-strongman1380s-projects.vercel.app

## Related Documentation

- `WEEKLY_AVERAGE_FIX.md` - Technical details of the fix
- `WEEKLY_AVERAGE_VISUAL_COMPARISON.md` - Before/after comparison
- `CREATE_SCHOOL_SCORES_TABLE.md` - Original schema documentation
