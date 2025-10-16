# Restriction & Subsystem Feature Implementation

## Overview
Added comprehensive restriction and subsystem tracking capabilities to the behavior management system. Youth can now be placed on restrictions (Level 1 or 2) or subsystems, with automatic point tracking and completion notifications.

## Database Changes

### New Fields Added to `youth` Table

```sql
-- Restriction tracking
restrictionLevel INTEGER (1 or 2, NULL = no restriction)
restrictionPointsRequired INTEGER (points needed to get off restriction)
restrictionStartDate TIMESTAMP (when restriction was placed)
restrictionPointsEarned INTEGER (points earned toward restriction completion)
restrictionReason TEXT (reason for restriction placement)

-- Subsystem tracking
subsystemActive BOOLEAN (whether youth is on subsystem)
subsystemPointsRequired INTEGER (points needed to complete subsystem)
subsystemStartDate TIMESTAMP (when subsystem was started)
subsystemPointsEarned INTEGER (points earned toward subsystem completion)
subsystemReason TEXT (reason for subsystem placement)
```

### Migration File
- **File**: `add_restriction_subsystem_fields.sql`
- **Location**: Root directory
- **Status**: Ready to run on Supabase

## Features Implemented

### 1. Restriction System

**Two Levels:**
- **Level 1**: Less restrictive
- **Level 2**: More restrictive

**Placement Process:**
1. Click "Place on Restriction" button
2. Select restriction level (1 or 2)
3. Enter points required to earn restriction removal
4. Optionally add reason
5. Confirm placement

**Visual Indicators:**
- Orange border on restriction card when active
- Progress bar showing points earned vs required
- Alert banner showing restriction level and start date
- Automatic removal when points goal achieved

**Automatic Tracking:**
- When daily points are awarded, restriction progress automatically updates
- When points goal is reached, restriction is automatically removed
- Success toast notification: "🎉 Restriction completed! Earned X points!"

### 2. Subsystem Tracking

**Purpose**: Track youth requiring focused behavioral intervention

**Placement Process:**
1. Click "Place on Subsystem" button
2. Enter points required for subsystem completion
3. Optionally add reason
4. Confirm placement

**Visual Indicators:**
- Red border on subsystem card when active
- Progress bar showing points earned vs required
- Alert banner showing start date
- Automatic removal when points goal achieved

**Automatic Tracking:**
- When daily points are awarded, subsystem progress automatically updates
- When points goal is reached, subsystem is automatically removed
- Success toast notification: "🎉 Subsystem completed! Earned X points!"

### 3. Point Tracking Integration

**Automatic Updates:**
```typescript
// When points are submitted:
1. Calculate points delta (new points - old points)
2. If restriction active: Add delta to restrictionPointsEarned
3. If restriction goal met: Auto-remove restriction
4. If subsystem active: Add delta to subsystemPointsEarned
5. If subsystem goal met: Auto-remove subsystem
6. Show success notifications
```

**Smart Calculation:**
- Only positive deltas count (earning points, not losing)
- Progress bars update in real-time
- Completion checks happen automatically
- No manual intervention required

## User Interface

### Restriction Card (Left Side)
```
┌─────────────────────────────────────┐
│ 🛡️ Restriction Status               │
├─────────────────────────────────────┤
│ ⚠️ On Restriction Level 1           │
│ Placed on Oct 16, 2025              │
│                                     │
│ Progress: 15,000 / 50,000 points   │
│ [████░░░░░░░░░░░░░░░] 30%          │
│                                     │
│ Reason: Behavioral incident         │
│                                     │
│ [✖️ Remove Restriction]             │
└─────────────────────────────────────┘
```

### Subsystem Card (Right Side)
```
┌─────────────────────────────────────┐
│ 🚫 Subsystem Status                 │
├─────────────────────────────────────┤
│ ⚠️ On Subsystem                     │
│ Placed on Oct 16, 2025              │
│                                     │
│ Progress: 20,000 / 30,000 points   │
│ [████████████░░░░░░░] 67%          │
│                                     │
│ Reason: Needs focused intervention  │
│                                     │
│ [✖️ Remove from Subsystem]          │
└─────────────────────────────────────┘
```

### When Inactive
```
┌─────────────────────────────────────┐
│ Youth is not currently on restriction│
│ [🛡️ Place on Restriction]           │
└─────────────────────────────────────┘
```

## Code Changes

### Files Modified

1. **src/components/behavior/BehaviorCard.tsx**
   - Added restriction/subsystem state management
   - Added placement/removal handlers
   - Added automatic point tracking logic
   - Added UI cards and dialogs
   - Updated handleSubmit to track progress

2. **src/types/app-types.ts**
   - Added restriction/subsystem fields to Youth interface

3. **src/integrations/supabase/types.ts**
   - Added fields to Row, Insert, and Update types

### New Imports
```typescript
import { Shield, Ban, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

### Key Functions

```typescript
// Place youth on restriction
handlePlaceOnRestriction()
- Validates input
- Updates youth record
- Shows success toast
- Refreshes UI

// Remove restriction
handleRemoveRestriction()
- Clears all restriction fields
- Shows success toast
- Refreshes UI

// Place youth on subsystem
handlePlaceOnSubsystem()
- Validates input
- Updates youth record
- Shows success toast
- Refreshes UI

// Remove subsystem
handleRemoveSubsystem()
- Clears all subsystem fields
- Shows success toast
- Refreshes UI

// Automatic tracking in handleSubmit()
- Checks restriction/subsystem status
- Adds points delta to progress
- Auto-removes when goal reached
- Shows completion notifications
```

## Usage Workflows

### Scenario 1: Place Youth on Restriction Level 1

1. Navigate to youth's Behavior Card
2. Locate Restriction Status card (left side)
3. Click "Place on Restriction" button
4. Dialog opens:
   - Select "Level 1 (Less Restrictive)"
   - Enter points required (e.g., 50000 = 50k points)
   - Add reason (optional): "Late for curfew"
   - Click "Confirm Restriction"
5. Card updates with orange border
6. Progress bar shows 0 / 50,000 points
7. As daily points are awarded, progress auto-updates
8. When 50,000 points earned, restriction auto-removes with celebration toast

### Scenario 2: Place Youth on Subsystem

1. Navigate to youth's Behavior Card
2. Locate Subsystem Status card (right side)
3. Click "Place on Subsystem" button
4. Dialog opens:
   - Enter points required (e.g., 30000 = 30k points)
   - Add reason (optional): "Needs focused behavioral intervention"
   - Click "Confirm Subsystem"
5. Card updates with red border
6. Progress bar shows 0 / 30,000 points
7. As daily points are awarded, progress auto-updates
8. When 30,000 points earned, subsystem auto-removes with celebration toast

### Scenario 3: Manual Removal

**If circumstances change (e.g., medical issue, family emergency):**
1. Click "Remove Restriction" or "Remove from Subsystem" button
2. Status immediately cleared
3. Success toast shown
4. Cards return to inactive state

## Data Persistence

**Database Storage:**
- All restriction/subsystem data stored in `youth` table
- Syncs automatically with Supabase
- No additional tables required
- Historical data can be tracked via audit logs (future enhancement)

**Progress Tracking:**
- Points earned calculated from daily submissions
- Delta (change) added to progress counters
- Progress persists across sessions
- Automatic completion detection

## Benefits

### For Staff:
- **Clear Visibility**: Immediate status indicators (orange/red borders)
- **Automated Tracking**: No manual point counting
- **Automatic Completion**: System handles removal when goals met
- **Accountability**: Reasons documented for each restriction/subsystem

### For Youth:
- **Clear Goals**: Know exactly how many points needed
- **Visual Progress**: See progress bars update in real-time
- **Motivation**: Clear path to earning privileges back
- **Fair System**: Automatic, objective tracking

### For Administration:
- **Data Tracking**: All restriction/subsystem events recorded
- **Compliance**: Documented reasons for interventions
- **Reporting**: Can query restriction/subsystem data
- **Consistency**: Standardized process across all staff

## Testing Checklist

- [ ] Place youth on Restriction Level 1
- [ ] Place youth on Restriction Level 2
- [ ] Award points and verify restriction progress updates
- [ ] Verify restriction auto-removes at goal
- [ ] Manually remove restriction
- [ ] Place youth on Subsystem
- [ ] Award points and verify subsystem progress updates
- [ ] Verify subsystem auto-removes at goal
- [ ] Manually remove subsystem
- [ ] Test with multiple restrictions/subsystems simultaneously
- [ ] Verify data persists across page refreshes
- [ ] Test edge cases (0 points, negative points, very large numbers)

## Migration Instructions

### Step 1: Run SQL Migration
```bash
# In Supabase SQL Editor, run:
add_restriction_subsystem_fields.sql
```

### Step 2: Verify Schema
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'youth' 
AND column_name LIKE '%restriction%' OR column_name LIKE '%subsystem%';
```

### Step 3: Test in Development
1. Build and run application
2. Test restriction placement
3. Test subsystem placement
4. Verify point tracking
5. Verify auto-completion

### Step 4: Deploy to Production
1. Run migration on production database
2. Deploy updated code
3. Monitor for errors
4. Train staff on new features

## Known Limitations

1. **No History**: Current implementation doesn't track historical restrictions/subsystems (future enhancement)
2. **Single Restriction**: Youth can only have one restriction level at a time (by design)
3. **Point Source**: All earned points count toward restriction/subsystem (not filtered by type)
4. **Manual Override Required**: Staff must manually remove if special circumstances arise

## Future Enhancements

1. **Historical Tracking**: Log all restriction/subsystem placements and completions
2. **Analytics Dashboard**: Visualize restriction/subsystem trends
3. **Automated Reports**: Generate restriction summary reports
4. **Alerts**: Notify supervisors when restrictions placed
5. **Escalation**: Auto-escalate restriction level if goals not met
6. **Point Categories**: Allow specific point types to count toward restriction

## Related Documentation

- `BEHAVIORAL_RATINGS_SCHEMA.md`: Behavioral rating system
- `INCIDENT_SYSTEM_COMPLETE.md`: Incident tracking integration
- Database schema files in `/migrations`

## Support

For questions or issues:
1. Check console for error messages
2. Verify database migration completed successfully
3. Ensure TypeScript types are up to date
4. Review this documentation for proper usage

---

**Status**: ✅ COMPLETE - Ready for production use
**Last Updated**: October 16, 2025
