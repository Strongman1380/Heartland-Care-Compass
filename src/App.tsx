
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { initializeStorage } from "@/utils/local-storage-utils";
import { initializePointSync } from "@/utils/pointSyncService";
import MainDashboard from "./pages/MainDashboard";
import Index from "./pages/Index";
import ProgressNotesPage from "./pages/ProgressNotesPage";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import AssessmentKPIDashboard from "./pages/AssessmentKPIDashboard";
import DataMigrationPage from "./pages/DataMigrationPage";
import DailyPoints from "./pages/DailyPoints";

import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AwardsProvider } from "@/contexts/AwardsContext";
import IncidentReports from "./pages/IncidentReports";
import Referrals from "./pages/Referrals";
import ShiftScores from "./pages/ShiftScores";
import AdminFacility from "./pages/AdminFacility";
import AdminForms from "./pages/AdminForms";
import PoResponsePage from "./pages/PoResponsePage";
import { PwaInstallBanner } from "@/components/layout/PwaInstallBanner";
import DataUpload from "./pages/DataUpload";
import YouthDetailPage from "./pages/YouthDetailPage";

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
        <AwardsProvider>
        <PwaInstallBanner />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AwardsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
