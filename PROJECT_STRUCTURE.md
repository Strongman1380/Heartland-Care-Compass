# Heartland Care Compass - Project Structure

## 📁 Current Organized Structure

### `/src/components/` - React Components

#### **Admin** (`admin/`)
- `AIStatusMonitor.tsx` - Monitors AI service status

#### **AI** (`ai/`)
- `AIAssistButton.tsx` - Quick AI assistance button
- `AIQueryInterface.tsx` - AI query interface

#### **Analysis** (`analysis/`)
- `BehaviorAnalysis.tsx` - Behavioral data analysis

#### **Assessment** (`assessment/`)
- `ComprehensivePlacementAssessment.tsx` - Full placement assessment
- `QuickISPAssessment.tsx` - Quick ISP assessment
- `RapidPlacementAssessment.tsx` - Rapid assessment form
- `RealColorsAssessment.tsx` - Real Colors personality assessment
- `RiskAssessment.tsx` - Risk evaluation

#### **Behavior** (`behavior/`)
- `EnhancedBehaviorCard.tsx` - ✅ ACTIVE - Enhanced behavior tracking card
- ~~`BehaviorCard.tsx`~~ - ⚠️ Check if can be removed

#### **Common** (`common/`)
- `YouthSelector.tsx` - ✅ ACTIVE - Alphabetically sorted youth selection list

#### **Dashboard** (`dashboard/`)
- `KpiDashboard.tsx` - KPI metrics dashboard
- `YouthDashboard.tsx` - Individual youth dashboard

#### **Home** (`home/`)
- `EmptyYouthState.tsx` - Empty state component
- `WelcomeSection.tsx` - Welcome banner
- `YouthDetailView.tsx` - ✅ ACTIVE - Detailed youth view
- `YouthSelectionView.tsx` - ✅ ACTIVE - Youth list with badges (UPDATED)

#### **Incidents** (`incidents/`)
- `FileUpload.tsx` - File upload component
- `IncidentFormTabs.tsx` - Tabbed incident form
- `IncidentReportForm.tsx` - Incident report form
- `SignatureCanvas.tsx` - Digital signature capture

#### **Layout** (`layout/`)
- `Header.tsx` - Main navigation header
- `ProtectedRoute.tsx` - Auth-protected routes

#### **Migration** (`migration/`)
- `DataMigration.tsx` - Data migration utilities

#### **Notes** (`notes/`)
- `EnhancedCaseNotes.tsx` - ✅ ACTIVE - Enhanced case notes with AI
- `CaseNotes.tsx` - Case notes component
- ~~`ProgressNotes.tsx`~~ - ⚠️ Check if redundant
- ~~`SimpleCaseNotes.tsx`~~ - ⚠️ Check if replaced by Enhanced

#### **Planning** (`planning/`)
- `SuccessPlan.tsx` - ✅ ACTIVE - Tabbed success plan

#### **Reports** (`reports/`)
- `MonthlyProgressReport.tsx` - ✅ ACTIVE - Tabbed monthly report with AI (UPDATED)
- `CourtReport.tsx` - ✅ ACTIVE - Tabbed court report with AI (UPDATED)
- `DpnReport.tsx` - DPN report template
- `ProgressEvaluationReport.tsx` - Progress evaluation
- `RecentReports.tsx` - Recent reports list
- `ReportCenter.tsx` - Central report hub
- `ReportHeader.tsx` - Common report header
- `ReportsTab.tsx` - Reports tab component
- `reportTemplateData.ts` - Report template data
- ~~`HeartlandMonthlyProgressReport.tsx`~~ - ⚠️ Check vs MonthlyProgressReport
- ~~`ReportGenerationForm.tsx`~~ - ⚠️ Check if used
- ~~`ReportTemplates.tsx`~~ - ⚠️ Check if used

#### **School** (`school/`)
- `SchoolIncidentForm.tsx` - School incident reporting

#### **UI** (`ui/`)
- Shadcn/UI component library (40+ components)
- All standard UI components (buttons, cards, forms, etc.)

#### **Youth** (`youth/`)
- `YouthProfile.tsx` - ✅ ACTIVE - Main youth profile view
- `YouthProfilesTable.tsx` - Youth profiles table
- `AddYouthDialog.tsx` - Add new youth dialog
- `EditYouthDialog.tsx` - ✅ ACTIVE - Edit youth dialog
- `PasteYouthProfileDialog.tsx` - Import youth data
- Various profile tabs (Background, Education, Medical, Mental Health, etc.)
- ~~`LocalEditYouthDialog.tsx`~~ - ⚠️ Check if redundant
- ~~`ComprehensiveYouthProfile.tsx`~~ - ⚠️ Check if replaced

### `/src/pages/` - Page Components

- `Index.tsx` - ✅ ACTIVE - Home page with youth list (UPDATED)
- `Dashboard.tsx` - Dashboard page
- `Profiles.tsx` - Youth profiles page
- `Reports.tsx` - Reports hub
- `DailyPoints.tsx` - Daily points tracking
- `CaseNotesPage.tsx` - Case notes page
- `ProgressNotesPage.tsx` - Progress notes
- `IncidentReports.tsx` - Incident reports
- `School.tsx` - School main page
- `SchoolScores.tsx` - School scores
- `SchoolIncidentReports.tsx` - School incidents
- `SchoolLayout.tsx` - School layout wrapper
- `SchoolPrintReports.tsx` - School print reports
- `MonthlyProgressReportPage.tsx` - Monthly report page
- `CourtReportPage.tsx` - Court report page
- `BehaviorAnalysisPage.tsx` - Behavior analysis
- `AcademicProgressDashboard.tsx` - Academic dashboard
- `AssessmentKPIDashboard.tsx` - Assessment KPIs
- `Alerts.tsx` - Alerts page
- `Auth.tsx` - Authentication page
- `DataMigrationPage.tsx` - ⚠️ Migration utility (can archive)
- `NotFound.tsx` - 404 page

### `/src/hooks/` - Custom React Hooks

- `useYouthForm.ts` - Youth form management
- `use-toast.ts` - Toast notifications
- `use-mobile.tsx` - Mobile detection

- `draftsService.ts` - Draft management
- `notesService.ts` - Notes handling
- `schoolIncidentsService.ts` - School incidents
- `schoolScoresService.ts` - School scores

### `/src/utils/` - Utility Functions

- `local-storage-utils.ts` - LocalStorage helpers
- `export.ts` - PDF/export utilities
- `pointCalculations.ts` - Point calculations
- `pointSyncService.ts` - Point synchronization
- `schoolScores.ts` - School score utilities
- `academicStore.ts` - Academic data store
- `alertService.ts` - Alert utilities
- `levelSystem.ts` - Level system logic
- `profileExport.ts` - Profile export
- `report-service.ts` - Report generation
- `uuid.ts` - UUID generation

### `/src/services/` - Business Logic Services

- `aiService.ts` - ✅ ACTIVE - AI integration (OpenAI)

### `/src/contexts/` - React Contexts

- `SupabaseAuthContext.tsx` - ✅ ACTIVE - Supabase authentication
- ~~`AuthContext.tsx`~~ - ⚠️ Check if redundant

### `/src/lib/` - Core Libraries

- `api.ts` - API functions
- `utils.ts` - General utilities
- `aiClient.ts` - AI client setup
- ~~`firebase.ts`~~ - ⚠️ Check if fully migrated to Supabase

## 📦 Archived Files

### `/archived/components/`
- `YouthCard.tsx` - Replaced by list view
- `debug/` folder - Test/debug components
- `SupabaseTest.tsx` - Test component

### `/archived/pages/`
- `SupabaseTest.tsx` - Test page

### `/archived/utils/`
- `migrateToSupabase.ts` - Migration script (completed)

## ✅ Recent Updates (Latest Session)

1. **Reports Enhanced**
   - Monthly Progress Report → Tabbed interface with AI auto-populate
   - Court Report → Tabbed interface with AI auto-populate
   - AI reads case notes and generates professional summaries

2. **Youth Lists Reorganized**
   - Dashboard youth selector → Vertical list with alphabetical sorting
   - Youth Profiles page → Vertical list with colored info badges
   - Removed card grid layout

3. **Info Badges Added**
   - Age, Level, Points, Grade, Admission Date, Length of Stay
   - Color-coded for easy visual scanning
   - Wraps responsively on mobile

## 🎯 Key Active Components

- `YouthSelectionView.tsx` - Main youth selection (Home page)
- `YouthSelector.tsx` - Youth selector (Dashboard)
- `MonthlyProgressReport.tsx` - Monthly report with AI
- `CourtReport.tsx` - Court report with AI
- `EnhancedCaseNotes.tsx` - Case notes with AI
- `SuccessPlan.tsx` - Success planning
- `YouthProfile.tsx` - Youth profile management

## 🔄 Sorting & Organization

All youth lists now automatically sort alphabetically by:
1. Last name (primary)
2. First name (secondary)

Uses `useMemo` for efficient re-sorting when youth are added/deleted.
