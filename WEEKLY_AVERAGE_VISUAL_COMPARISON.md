# School Scores Weekly Average - Visual Comparison

## BEFORE (Monday-Friday, 5 days)
```
Week: 2025-10-06 to 2025-10-10

| Youth    | Mon | Tue | Wed | Thu | Fri | Week Avg | 30-Day Avg | Trend |
|----------|-----|-----|-----|-----|-----|----------|------------|-------|
| Student  | 3.5 | 3.2 | 3.8 | 3.6 | 3.4 | 3.5      | 3.4        | ↑     |

Week Avg = (3.5 + 3.2 + 3.8 + 3.6 + 3.4) / 5 = 3.5
```

## AFTER (Thursday-Wednesday, 5 school days - excluding weekends)
```
Week: 2025-10-02 to 2025-10-08 (excluding Sat/Sun)

| Youth    | Thu | Fri | Mon | Tue | Wed | Week Avg | 30-Day Avg | Trend |
|----------|-----|-----|-----|-----|-----|----------|------------|-------|
| Student  | 3.5 | 3.2 | 3.4 | 3.7 | 3.9 | 3.5      | 3.4        | ↑     |

Week Avg = (3.5 + 3.2 + 3.4 + 3.7 + 3.9) / 5 = 3.54 → 3.5 (rounded to nearest tenth)

Note: Saturday and Sunday are excluded as students do not attend school on weekends.
```

## Key Differences

### Week Structure
- **Before**: Started on Monday, ended on Friday (5 school days)
- **After**: Starts on Thursday, ends on Wednesday, **excluding Saturday and Sunday** (5 school days: Thu, Fri, Mon, Tue, Wed)

### Calculation
- **Before**: Average of Monday through Friday only
- **After**: Average of Thursday, Friday, Monday, Tuesday, Wednesday (weekends excluded)

### Display
- **Before**: Week range showed Mon-Fri (e.g., "Week: 2025-10-06 to 2025-10-10")
- **After**: Week range shows Thu-Wed excluding weekends (e.g., "Week: 2025-10-02 to 2025-10-08 (excluding Sat/Sun)")

### Rounding
- **Before**: Standard JavaScript rounding (could show many decimal places)
- **After**: Explicitly rounded to nearest tenth (e.g., 3.58 becomes 3.6)

## Example Weeks for October 2025

### Week 1: Oct 2-8 (School days: Thu, Fri, Mon, Tue, Wed)
- Thu 10/2, Fri 10/3, **[Weekend]**, Mon 10/6, Tue 10/7, Wed 10/8

### Week 2: Oct 9-15 (School days: Thu, Fri, Mon, Tue, Wed)
- Thu 10/9, Fri 10/10, **[Weekend]**, Mon 10/13, Tue 10/14, Wed 10/15

### Week 3: Oct 16-22 (School days: Thu, Fri, Mon, Tue, Wed)
- Thu 10/16, Fri 10/17, **[Weekend]**, Mon 10/20, Tue 10/21, Wed 10/22

### Week 4: Oct 23-29 (School days: Thu, Fri, Mon, Tue, Wed)
- Thu 10/23, Fri 10/24, **[Weekend]**, Mon 10/27, Tue 10/28, Wed 10/29

### Week 5: Oct 30 - Nov 5 (School days: Thu, Fri, Mon, Tue, Wed)
- Thu 10/30, Fri 10/31, **[Weekend]**, Mon 11/3, Tue 11/4, Wed 11/5

## Benefits

1. **Aligns with Heartland's Calendar**: Matches the actual week structure used by the organization (Thursday to Wednesday)
2. **School Days Only**: Excludes weekends when students don't attend school
3. **Consistent Calculations**: Weekly averages now match the organization's definition of a school week
4. **Realistic Tracking**: Only tracks scores for days when students are actually in school
5. **Precise Rounding**: Averages are consistently rounded to the nearest tenth for clearer reporting
6. **Clean Interface**: No empty weekend columns cluttering the view
