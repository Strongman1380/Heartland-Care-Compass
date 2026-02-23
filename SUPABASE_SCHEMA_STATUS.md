# Supabase Schema Status - Youth Table

## ✅ NO MIGRATION NEEDED!

Your Supabase `youth` table schema is already correct and includes all the necessary Json fields. The code fixes we made simply ensure that the application properly formats data to match the existing schema.

## Current Schema Status

### Json Fields (Already Configured ✅)
All these fields are already set up as `jsonb` type in your Supabase database:

```sql
-- Contact Information (Json objects)
legalGuardian       jsonb    -- Legal guardian info
probationOfficer    jsonb    -- Probation officer info
mother             jsonb    -- Mother's contact info
father             jsonb    -- Father's contact info
nextOfKin          jsonb    -- Next of kin info
caseworker         jsonb    -- Caseworker info
guardianAdLitem    jsonb    -- Guardian ad litem info

-- Other Json Fields
address            jsonb    -- Physical address
physicalDescription jsonb    -- Height, weight, etc.
dischargePlan      jsonb
emergencyShelterCare jsonb
treatmentFocus     jsonb
communityResources jsonb
```

### String Fields (Already Configured ✅)
```sql
attorney              text
judge                 text
placingAgencyCounty   text
```

### Legacy String Fields (For Backward Compatibility)
These exist for backward compatibility and are now deprecated in favor of Json objects:
```sql
-- Deprecated - now stored in legalGuardian Json
guardianContact      text
guardianEmail        text
guardianPhone        text
guardianRelationship text

-- Deprecated - now stored in probationOfficer Json
probationContact     text
probationPhone       text
```

## Why No Migration Is Needed

The schema was already correctly designed with Json fields. The issue was that the **application code** was sending strings instead of Json objects. We fixed the code, not the schema.

### What We Fixed (Application Side)

**Before (Incorrect):**
```typescript
// Sending a string - causes 400 error
legalGuardian: "Jane Doe"
```

**After (Correct):**
```typescript
// Sending a Json object - matches schema
legalGuardian: {
  name: "Jane Doe",
  relationship: "Mother",
  contact: "jane.doe@email.com",
  phone: "(555) 123-4567",
  email: "jane.doe@email.com"
}
```

## Verification Query (Optional)

If you want to verify your schema in Supabase SQL Editor, run this query:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'youth'
  AND column_name IN (
    'legalGuardian',
    'probationOfficer',
    'mother',
    'father',
    'nextOfKin',
    'caseworker',
    'guardianAdLitem',
    'address',
    'physicalDescription',
    'attorney',
    'judge',
    'placingAgencyCounty'
  )
ORDER BY column_name;
```

Expected output should show:
- `legalGuardian`, `probationOfficer`, `mother`, `father`, `nextOfKin`, `caseworker`, `guardianAdLitem`, `address`, `physicalDescription` as **jsonb**
- `attorney`, `judge`, `placingAgencyCounty` as **text** (or **character varying**)

## Data Migration (If You Have Existing Data)

If you have existing youth records with data in the **legacy string fields** (`guardianContact`, `guardianPhone`, etc.), you can optionally migrate that data into the Json objects:

```sql
-- Optional: Migrate legacy guardian data to Json format
UPDATE youth
SET legalGuardian = jsonb_build_object(
  'name', COALESCE((legalGuardian::jsonb->>'name'), legalGuardian::text),
  'relationship', guardianRelationship,
  'contact', guardianContact,
  'phone', guardianPhone,
  'email', guardianEmail
)
WHERE legalGuardian IS NOT NULL
  OR guardianRelationship IS NOT NULL
  OR guardianContact IS NOT NULL
  OR guardianPhone IS NOT NULL
  OR guardianEmail IS NOT NULL;

-- Optional: Migrate legacy probation officer data to Json format
UPDATE youth
SET probationOfficer = jsonb_build_object(
  'name', COALESCE((probationOfficer::jsonb->>'name'), probationOfficer::text),
  'contact', probationContact,
  'phone', probationPhone
)
WHERE probationOfficer IS NOT NULL
  OR probationContact IS NOT NULL
  OR probationPhone IS NOT NULL;
```

**Note:** Only run the migration SQL if you have existing data in the legacy fields. New records created after our code fixes will automatically use the correct Json format.

## Summary

✅ **Your database schema is correct**
✅ **All Json fields exist and are properly typed**
✅ **All string fields exist**
✅ **No schema changes needed**
✅ **The code now properly formats data to match the schema**

The fixes we made ensure that when you save a youth profile, the data is sent in the correct format that matches your existing Supabase schema.
