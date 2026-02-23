# Project Cleanup and Organization Plan

## Files to Remove (Unused/Redundant)

### Components - Likely Unused:
1. `src/components/home/YouthCard.tsx` - Replaced by new list layout
2. `src/components/behavior/BehaviorCard.tsx` - Check if EnhancedBehaviorCard replaces it
3. `src/components/notes/SimpleCaseNotes.tsx` - Check if EnhancedCaseNotes replaces it
4. `src/components/notes/ProgressNotes.tsx` - Might be redundant
5. `src/components/youth/LocalEditYouthDialog.tsx` - Redundant if EditYouthDialog is used
6. `src/components/youth/ComprehensiveYouthProfile.tsx` - Check if YouthProfile replaces it
7. `src/components/common/SupabaseTest.tsx` - Debug/test file
8. `src/components/debug/SupabaseTest.tsx` - Duplicate test component
9. `src/components/debug/SupabaseDiagnostic.tsx` - Debug component

### Reports - Potentially Redundant:
1. `src/components/reports/HeartlandMonthlyProgressReport.tsx` - Check vs MonthlyProgressReport.tsx
2. `src/components/reports/DpnReport.tsx` - Check if used
3. `src/components/reports/ProgressEvaluationReport.tsx` - Check if used
4. `src/components/reports/ReportGenerationForm.tsx` - Check if used
5. `src/components/reports/ReportTemplates.tsx` - Check if used

### Pages - Test/Debug:
1. `src/pages/SupabaseTest.tsx` - Test page
2. `src/pages/DataMigrationPage.tsx` - Migration utility (archive after use)

### Utils - Potentially Unused:
1. `src/utils/mockData.ts` - Mock data for testing
2. `src/utils/db-init.ts` - Initial DB setup (archive)
3. `src/utils/createSchoolIncidentsTable.ts` - Migration script

### Contexts - Redundant:
1. `src/contexts/AuthContext.tsx` - If SupabaseAuthContext is used instead

### Libraries - Unused:
1. `src/lib/firebase.ts` - If migrated to Supabase fully

## Recommended Folder Structure

```
src/
├── components/
│   ├── admin/          ✓ Keep as-is
│   ├── ai/             ✓ Keep as-is
│   ├── analysis/       ✓ Keep as-is
│   ├── assessment/     ✓ Keep as-is
│   ├── behavior/       → Clean up duplicates
│   ├── common/         → Remove test files
│   ├── dashboard/      ✓ Keep as-is
│   ├── debug/          → REMOVE (move to /dev folder)
│   ├── home/           → Clean up YouthCard
│   ├── incidents/      ✓ Keep as-is
│   ├── layout/         ✓ Keep as-is
│   ├── migration/      → Move to /scripts
│   ├── notes/          → Clean up duplicates
│   ├── planning/       ✓ Keep as-is
│   ├── reports/        → Clean up unused reports
│   ├── school/         ✓ Keep as-is
│   ├── ui/             ✓ Keep as-is (shadcn components)
│   └── youth/          → Clean up duplicates
├── contexts/           → Remove redundant auth context
├── hooks/              ✓ Keep as-is
├── integrations/       ✓ Keep as-is
├── lib/                → Remove firebase if unused
├── pages/              → Remove test pages
├── schemas/            ✓ Keep as-is
├── services/           ✓ Keep as-is
├── types/              ✓ Keep as-is
└── utils/              → Clean up migration scripts
```

## New Folders to Create

1. `/scripts/` - For migration and setup scripts
2. `/dev/` - For debug/test components
3. `/archived/` - For old unused files (don't delete immediately)

## Next Steps

1. Verify each file is unused before deleting
2. Move debug/test files to separate folder
3. Archive migration scripts
4. Clean up redundant components
5. Update imports after cleanup
