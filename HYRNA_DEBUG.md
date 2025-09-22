// HYRNA_DEBUG.md
# HYRNA Risk Assessment Debug Guide

## Overview
This document provides guidance on debugging HYRNA risk assessment data display issues in the Heartland Care Compass application.

## Identified Issue
After debugging, we found that HYRNA data fields are showing as `null` with type `object` instead of their expected types:

```
HYRNA Debug Information:
hyrnaRiskLevel: null (object)
hyrnaScore: null (object)
hyrnaAssessmentDate: null (object)
```

This type mismatch causes the display conditions to fail, resulting in "No HYRNA Assessment Completed" being shown even when data might be present.

## Common Issues

1. **Data Type Mismatch**
   - `hyrnaRiskLevel` should be a string but was an object
   - `hyrnaScore` should be a number but was an object
   - `hyrnaAssessmentDate` should be a date string but was an object

2. **Empty vs. Null Values**
   - The code wasn't properly handling both empty strings (`""`) and `null` values
   - Supabase JSON handling may be converting values to objects instead of primitive types

3. **Null Object Handling**
   - `null` values with `object` type need special handling in type checking

## Implemented Fixes

1. **Improved Condition Checks**
   - Added robust type checking for all HYRNA fields
   - Separated condition logic for better debugging
   - Added more detailed debug output showing condition results

2. **Proper Type Handling**
   - Added explicit handling for object type nulls
   - Used non-null assertions where appropriate

3. **Component Updates**
   - Fixed AssessmentResultsTab to properly display HYRNA data
   - Updated YouthProfile to handle HYRNA data in header section
   - Enhanced MentalHealthProfileTab with better HYRNA data display

4. **Data Saving**
   - Fixed EditYouthDialog to properly handle empty string vs. null values
   - Added validation for HYRNA score input

## Additional Diagnostics

If HYRNA data still isn't displaying properly:

1. Check how data is being saved to Supabase by monitoring network requests
2. Verify data types in Supabase table schema
3. Use the Debug button to examine raw data values and condition evaluation results
4. Try entering new HYRNA data and see if it displays correctly

## Conclusion
The main issue was type checking for HYRNA data fields, particularly handling null values with object type. By adding more robust type checking and debug information, we've fixed the display issues and provided better diagnostics for future troubleshooting.
