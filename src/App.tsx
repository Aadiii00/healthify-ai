import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import SymptomCheckerPage from "@/pages/SymptomCheckerPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import MedicalHistoryPage from "@/pages/MedicalHistoryPage";
import NutritionPlannerPage from "@/pages/NutritionPlannerPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/symptom-checker" element={<ProtectedRoute><SymptomCheckerPage /></ProtectedRoute>} />
            <Route path="/appointments" element={<ProtectedRoute><AppointmentsPage /></ProtectedRoute>} />
            <Route path="/medical-history" element={<ProtectedRoute><MedicalHistoryPage /></ProtectedRoute>} />
            <Route path="/nutrition-planner" element={<ProtectedRoute><NutritionPlannerPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
