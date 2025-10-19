# Youth Profile Save Issue - Analysis and Fix

## Status: ✅ FIXED

## Problem
Youth profile data doesn't persist after editing. Getting 400 errors from Supabase.

## Root Cause
**Type Mismatch**: EditYouthDialog is sending data types that don't match the Supabase schema.

### Schema Expectations (from types.ts):
- `legalGuardian`: `Json` (object)
- `probationOfficer`: `Json` (object)
- `father`: `Json` (object)
- `mother`: `Json` (object)
- `caseworker`: `Json` (object)
- `guardianAdLitem`: `Json` (object)
- `address`: `Json` (object)
- `physicalDescription`: `Json` (object)

### Current Issue:
EditYouthDialog sends:
- `legalGuardian`: string (should be Json object)
- `probationOfficer`: string (should be Json object)

## Solution - ✅ IMPLEMENTED

### Fix 1: ✅ Updated EditYouthDialog.tsx (line ~380-390)

Changed FROM:
```typescript
legalGuardian: formData.legalGuardian || null,
probationOfficer: formData.probationOfficer || null,
```

Change TO:
```typescript
legalGuardian: formData.legalGuardian ? {
  name: formData.legalGuardian,
  relationship: formData.guardianRelationship || null,
  contact: formData.guardianContact || null,
  phone: formData.guardianPhone || null,
  email: formData.guardianEmail || null
} : null,
probationOfficer: formData.probationOfficer ? {
  name: formData.probationOfficer,
  contact: formData.probationContact || null,
  phone: formData.probationPhone || null
} : null,
```

### Fix 2: ✅ Updated youth form data population (line ~68-91)

Changed FROM:
```typescript
legalGuardian: youth.legalGuardian || "",
probationOfficer: youth.probationOfficer || "",
```

Change TO:
```typescript
legalGuardian: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.name
  ? youth.legalGuardian.name
  : (typeof youth.legalGuardian === 'string' ? youth.legalGuardian : ""),
probationOfficer: typeof youth.probationOfficer === 'object' && youth.probationOfficer?.name
  ? youth.probationOfficer.name
  : (typeof youth.probationOfficer === 'string' ? youth.probationOfficer : ""),
guardianRelationship: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.relationship
  ? youth.legalGuardian.relationship
  : (youth.guardianRelationship || ""),
guardianContact: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.contact
  ? youth.legalGuardian.contact
  : (youth.guardianContact || ""),
guardianPhone: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.phone
  ? youth.legalGuardian.phone
  : (youth.guardianPhone || ""),
guardianEmail: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.email
  ? youth.legalGuardian.email
  : (youth.guardianEmail || ""),
probationContact: typeof youth.probationOfficer === 'object' && youth.probationOfficer?.contact
  ? youth.probationOfficer.contact
  : (youth.probationContact || ""),
probationPhone: typeof youth.probationOfficer === 'object' && youth.probationOfficer?.phone
  ? youth.probationOfficer.phone
  : (youth.probationPhone || ""),
```

### Fix 3: ✅ Updated AddYouthDialog.tsx (line ~300-314)

Applied the same Json object formatting to AddYouthDialog.tsx to ensure new youth profiles are created with the correct data structure.

### Fix 4: ✅ Added Missing Family/Legal Contact Fields

**Files Modified:**
- [src/hooks/useYouthForm.ts](src/hooks/useYouthForm.ts) - Added 13 new fields
- [src/components/youth/EditYouthDialog.tsx](src/components/youth/EditYouthDialog.tsx) - Save/load logic
- [src/components/youth/AddYouthDialog.tsx](src/components/youth/AddYouthDialog.tsx) - Save logic

**New Fields Added:**
- motherName, motherPhone (saved as `mother` Json)
- fatherName, fatherPhone (saved as `father` Json)
- nextOfKinName, nextOfKinRelationship, nextOfKinPhone (saved as `nextOfKin` Json)
- caseworkerName, caseworkerPhone (saved as `caseworker` Json)
- guardianAdLitemName (saved as `guardianAdLitem` Json)
- placingAgencyCounty, attorney, judge (saved as strings)

These fields now correctly save as Json objects matching the Supabase schema. See [SCHEMA_FIXES_COMPLETE.md](SCHEMA_FIXES_COMPLETE.md) for full details.

## Testing

To verify the fixes work:
1. Create/edit a youth profile
2. Add guardian information
3. Save the profile
4. Reload the page
5. Verify data persists

## Import Template

For the paste/import feature, here's the recommended format:

```
Youth Profile Information

Personal Information:
First Name: John
Last Name: Doe
Date of Birth: 01/15/2008
Age: 17
Sex: Male
Race: Caucasian
Religion: Christian
Place of Birth: Kansas City, MO
SSN: XXX-XX-XXXX

Physical Description:
Height: 5'9"
Weight: 150 lbs
Hair Color: Brown
Eye Color: Blue
Tattoos/Scars: None

Admission Information:
Admission Date: 07/23/2025
Level: 2
Estimated Stay: 6-12 months
Referral Source: County DHS
Referral Reason: Behavioral issues at home and school

Legal Guardian:
Name: Jane Doe
Relationship: Mother
Contact: jane.doe@email.com
Phone: (555) 123-4567

Probation Officer:
Name: Officer Smith
Contact: smith@countycourt.gov
Phone: (555) 987-6543

Education:
Current School: Lincoln High School
Grade: 11th
Has IEP: Yes
Academic Strengths: Math, Science
Academic Challenges: Reading comprehension
Education Goals: Graduate high school, attend community college

Medical Information:
Physician: Dr. Johnson
Physician Phone: (555) 555-5555
Insurance: Blue Cross Blue Shield
Policy Number: ABC123456
Allergies: Peanuts
Medical Conditions: Asthma
Medical Restrictions: No strenuous exercise

Mental Health:
Current Diagnoses: ADHD, Oppositional Defiant Disorder
Trauma History: Witnessed domestic violence
Previous Treatment: Outpatient therapy 2020-2022
Current Counseling: Individual therapy, Family therapy
Therapist: Dr. Williams
Therapist Contact: (555) 111-2222
Session Frequency: Weekly
Session Time: Thursdays 3PM
Self-Harm History: None
Has Safety Plan: Yes

Background:
Prior Placements: Foster care (6 months), Group home (3 months)
Number of Prior Placements: 2
Length of Recent Placement: 3 months
Court Involvement: Juvenile court - Status offense
```

This format allows AI to parse all fields correctly.
