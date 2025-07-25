
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Profiles from "./pages/Profiles";
import DailyPoints from "./pages/DailyPoints";
import ProgressNotesPage from "./pages/ProgressNotesPage";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import AssessmentKPIDashboard from "./pages/AssessmentKPIDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/daily-points" element={<DailyPoints />} />
          <Route path="/progress-notes" element={<ProgressNotesPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/assessment-kpi" element={<AssessmentKPIDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
