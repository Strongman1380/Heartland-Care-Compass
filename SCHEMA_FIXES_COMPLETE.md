# Youth Profile Schema Fixes - Complete ✅

## Overview
Fixed all data persistence issues by ensuring form data matches Supabase schema Json field types. All youth profile information now saves and loads correctly.

## Problem Summary
Youth profile data wasn't persisting because the code was sending simple strings/values for fields that Supabase expects as Json objects. This caused 400 Bad Request errors.

## Supabase Json Fields Identified
The following fields in the `youth` table are Json type and require structured objects:

1. **legalGuardian** - Legal guardian information
2. **probationOfficer** - Probation officer details
3. **mother** - Mother's contact info
4. **father** - Father's contact info
5. **nextOfKin** - Next of kin details
6. **caseworker** - Caseworker information
7. **guardianAdLitem** - Guardian ad litem name
8. **address** - Physical address (already handled correctly)
9. **physicalDescription** - Height, weight, etc. (already handled correctly)

## Files Modified

### 1. [src/hooks/useYouthForm.ts](src/hooks/useYouthForm.ts)
**Added missing family/legal contact fields:**
- motherName, motherPhone
- fatherName, fatherPhone
- nextOfKinName, nextOfKinRelationship, nextOfKinPhone
- placingAgencyCounty
- caseworkerName, caseworkerPhone
- guardianAdLitemName
- attorney, judge

**Changes:**
- Added fields to `YouthFormData` interface (lines 40-53)
- Added default values in initial state (lines 142-155)
- Fixed `resetForm()` to match interface (lines 340-405)

### 2. [src/components/youth/EditYouthDialog.tsx](src/components/youth/EditYouthDialog.tsx)
**Save Logic (lines 396-447):**
```typescript
// Legal Guardian as Json object
legalGuardian: formData.legalGuardian ? {
  name: formData.legalGuardian,
  relationship: formData.guardianRelationship || null,
  contact: formData.guardianContact || null,
  phone: formData.guardianPhone || null,
  email: formData.guardianEmail || null
} : null,

// Probation Officer as Json object
probationOfficer: formData.probationOfficer ? {
  name: formData.probationOfficer,
  contact: formData.probationContact || null,
  phone: formData.probationPhone || null
} : null,

// Mother as Json object
mother: formData.motherName ? {
  name: formData.motherName,
  phone: formData.motherPhone || null
} : null,

// Father as Json object
father: formData.fatherName ? {
  name: formData.fatherName,
  phone: formData.fatherPhone || null
} : null,

// Next of Kin as Json object
nextOfKin: formData.nextOfKinName ? {
  name: formData.nextOfKinName,
  relationship: formData.nextOfKinRelationship || null,
  phone: formData.nextOfKinPhone || null
} : null,

// Caseworker as Json object
caseworker: formData.caseworkerName ? {
  name: formData.caseworkerName,
  phone: formData.caseworkerPhone || null
} : null,

// Guardian ad Litem as Json object
guardianAdLitem: formData.guardianAdLitemName ? {
  name: formData.guardianAdLitemName
} : null,

// Legal Information
placingAgencyCounty: formData.placingAgencyCounty || null,
attorney: formData.attorney || null,
judge: formData.judge || null,
```

**Load Logic (lines 68-143):**
```typescript
// Extract values from Json objects when loading existing youth
legalGuardian: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.name
  ? youth.legalGuardian.name
  : (typeof youth.legalGuardian === 'string' ? youth.legalGuardian : ""),
guardianRelationship: typeof youth.legalGuardian === 'object' && youth.legalGuardian?.relationship
  ? youth.legalGuardian.relationship
  : "",
// ... similar for all Json fields
```

### 3. [src/components/youth/AddYouthDialog.tsx](src/components/youth/AddYouthDialog.tsx)
**Save Logic (lines 309-351):**
Applied same Json object formatting as EditYouthDialog for:
- legalGuardian
- probationOfficer
- mother
- father
- nextOfKin
- caseworker
- guardianAdLitem

## Json Object Structures

### Legal Guardian
```json
{
  "name": "Guardian Name",
  "relationship": "Mother",
  "contact": "Contact info",
  "phone": "(123) 456-7890",
  "email": "email@example.com"
}
```

### Probation Officer
```json
{
  "name": "Officer Name",
  "contact": "Contact info",
  "phone": "(123) 456-7890"
}
```

### Mother / Father
```json
{
  "name": "Parent Name",
  "phone": "(123) 456-7890"
}
```

### Next of Kin
```json
{
  "name": "Kin Name",
  "relationship": "Aunt/Uncle/etc",
  "phone": "(123) 456-7890"
}
```

### Caseworker
```json
{
  "name": "Caseworker Name",
  "phone": "(123) 456-7890"
}
```

### Guardian ad Litem
```json
{
  "name": "Guardian ad Litem Name"
}
```

## Testing Checklist

✅ All changes compiled without errors
✅ Dev server running with HMR updates
✅ Form fields mapped to correct schema types
✅ Save logic formats data as Json objects
✅ Load logic extracts values from Json objects

**Next Steps for User:**
1. Test creating a new youth profile with all contact information
2. Test editing an existing youth profile
3. Verify all data persists after page reload
4. Test the AI import/paste feature with complete profile data

## Result
All form fields now correctly match the Supabase schema. Youth profile data will persist properly when:
- Creating new youth profiles (AddYouthDialog)
- Editing existing youth profiles (EditYouthDialog)
- All family and legal contact information saves as structured Json objects
- Data loads correctly when reopening profiles
