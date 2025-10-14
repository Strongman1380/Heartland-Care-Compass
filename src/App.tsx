
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeStorage } from "@/utils/local-storage-utils";
import { initializePointSync } from "@/utils/pointSyncService";
import Index from "./pages/Index";
import ProgressNotesPage from "./pages/ProgressNotesPage";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import AssessmentKPIDashboard from "./pages/AssessmentKPIDashboard";
import DataMigrationPage from "./pages/DataMigrationPage";
import { MonthlyProgressReportPage } from "./pages/MonthlyProgressReportPage";
import { CourtReportPage } from "./pages/CourtReportPage";
import DailyPoints from "./pages/DailyPoints";
import BehaviorAnalysisPage from "./pages/BehaviorAnalysisPage";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import School from "./pages/School";
import SchoolScores from "./pages/SchoolScores";
import AcademicProgressDashboard from "./pages/AcademicProgressDashboard";
import SchoolIncidentReports from "./pages/SchoolIncidentReports";
import SchoolPrintReports from "./pages/SchoolPrintReports";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    // Initialize local storage
    initializeStorage();
    
    // Initialize point synchronization service
    initializePointSync();
  }, []);
  
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/progress-notes" element={<ProtectedRoute><ProgressNotesPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/monthly-progress" element={<ProtectedRoute><MonthlyProgressReportPage /></ProtectedRoute>} />
          <Route path="/court-report" element={<ProtectedRoute><CourtReportPage /></ProtectedRoute>} />
          <Route path="/daily-points" element={<ProtectedRoute><DailyPoints /></ProtectedRoute>} />
          <Route path="/behavior-analysis" element={<ProtectedRoute><BehaviorAnalysisPage /></ProtectedRoute>} />
          <Route path="/assessment-kpi" element={<ProtectedRoute><AssessmentKPIDashboard /></ProtectedRoute>} />

          <Route path="/school" element={<ProtectedRoute><School /></ProtectedRoute>}>
            <Route index element={<Navigate to="scores" replace />} />
            <Route path="scores" element={<SchoolScores />} />
            <Route path="dashboard" element={<AcademicProgressDashboard />} />
            <Route path="incidents" element={<SchoolIncidentReports />} />
            <Route path="print-reports" element={<SchoolPrintReports />} />
          </Route>

          <Route path="/migrate-data" element={<ProtectedRoute><DataMigrationPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
