
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { initializeStorage } from "@/utils/local-storage-utils";
import { initializePointSync } from "@/utils/pointSyncService";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AwardsProvider } from "@/contexts/AwardsContext";
import { PwaInstallBanner } from "@/components/layout/PwaInstallBanner";
import { BottomNav } from "@/components/layout/BottomNav";
import { AnalyticsTracker } from "@/components/common/AnalyticsTracker";
import { CommandPalette, useCommandPalette } from "@/components/common/CommandPalette";

// Lazy load heavy report and dashboard components
const MainDashboard = lazy(() => import("./pages/MainDashboard"));
const Index = lazy(() => import("./pages/Index"));
const ProgressNotesPage = lazy(() => import("./pages/ProgressNotesPage"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Reports = lazy(() => import("./pages/Reports"));
const AssessmentKPIDashboard = lazy(() => import("./pages/AssessmentKPIDashboard"));
const DataMigrationPage = lazy(() => import("./pages/DataMigrationPage"));
const DailyPoints = lazy(() => import("./pages/DailyPoints"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const IncidentReports = lazy(() => import("./pages/IncidentReports"));
const Referrals = lazy(() => import("./pages/Referrals"));
const ShiftScores = lazy(() => import("./pages/ShiftScores"));
const AdminFacility = lazy(() => import("./pages/AdminFacility"));
const AdminForms = lazy(() => import("./pages/AdminForms"));
const PoResponsePage = lazy(() => import("./pages/PoResponsePage"));
const DataUpload = lazy(() => import("./pages/DataUpload"));
const DataExportPage = lazy(() => import("./pages/DataExportPage"));
const YouthDetailPage = lazy(() => import("./pages/YouthDetailPage"));

const queryClient = new QueryClient();

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="space-y-4 w-full max-w-md p-8">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  </div>
);

const RoutedApp = () => {
  // Enable keyboard shortcuts
  useKeyboardShortcuts({ enabled: true });

  // Enable command palette
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  return (
    <AwardsProvider>
          <PwaInstallBanner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/po-response/:token" element={<PoResponsePage />} />
              <Route path="/" element={<ProtectedRoute><MainDashboard /></ProtectedRoute>} />
              <Route path="/youth-list" element={<ProtectedRoute><Index /></ProtectedRoute>} />
              <Route path="/youth/:id" element={<ProtectedRoute><YouthDetailPage /></ProtectedRoute>} />
              <Route path="/progress-notes" element={<ProtectedRoute><ProgressNotesPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/monthly-progress" element={<Navigate to="/reports" replace />} />
              <Route path="/court-report" element={<Navigate to="/reports" replace />} />
              <Route path="/daily-points" element={<ProtectedRoute><DailyPoints /></ProtectedRoute>} />
              <Route path="/assessment-kpi" element={<ProtectedRoute><AssessmentKPIDashboard /></ProtectedRoute>} />
              <Route path="/admin/facility" element={<ProtectedRoute requireAdmin><AdminFacility /></ProtectedRoute>} />
              <Route path="/admin/forms" element={<ProtectedRoute><AdminForms /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
              <Route path="/shift-scores" element={<ProtectedRoute><ShiftScores /></ProtectedRoute>} />
              <Route path="/incident-reports" element={<ProtectedRoute><IncidentReports /></ProtectedRoute>} />
              <Route path="/migrate-data" element={<ProtectedRoute requireAdmin><DataMigrationPage /></ProtectedRoute>} />
              <Route path="/data-upload" element={<ProtectedRoute><DataUpload /></ProtectedRoute>} />
              <Route path="/data-export" element={<ProtectedRoute><DataExportPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
          <BottomNav />
    </AwardsProvider>
  );
};

const AppContent = () => {
  useEffect(() => {
    // Initialize local storage
    initializeStorage();

    // Initialize point synchronization service
    initializePointSync();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="heartland-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={import.meta.env.BASE_URL}>
            <AnalyticsTracker />
            <RoutedApp />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default AppContent;
