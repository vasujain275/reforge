import { QueryClientProvider } from "@tanstack/react-query";

import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { Suspense, lazy, useEffect, useState } from "react";
import { Route, BrowserRouter as Router, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { api } from "@/lib/api";

// Lazy load pages for code splitting
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const DashboardWrapper = lazy(() => import("@/pages/DashboardWrapper"));
const LandingPage = lazy(() => import("@/pages/Landing"));
const OnboardingPage = lazy(() => import("@/pages/OnboardingPage"));

// Loading fallback for lazy-loaded pages
function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm font-mono text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Initialization guard component
function InitializationGuard({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        const response = await api.get("/onboarding/status");
        const initialized = response.data.data.initialized;
        console.log("System initialization status:", initialized);
        setIsInitialized(initialized);
      } catch (error) {
        console.error("Failed to check initialization status:", error);
        // On error, assume initialized to avoid blocking
        setIsInitialized(true);
      }
    };

    checkInitialization();
  }, []); // Only check once on mount

  // Loading state
  if (isInitialized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm font-mono text-muted-foreground">Checking system status...</p>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if not initialized and not already there
  if (!isInitialized && location.pathname !== "/onboarding") {
    console.log("System not initialized, redirecting to onboarding");
    return <Navigate to="/onboarding" replace />;
  }

  // Redirect away from onboarding if already initialized
  if (isInitialized && location.pathname === "/onboarding") {
    console.log("System already initialized, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider defaultTheme="dark" storageKey="reforge-ui-theme">
          <Toaster position="top-right" richColors />
          <InitializationGuard>
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
              {/* Main Layout wraps everything */}
              <Route element={<Layout />}>

                {/* Public Routes */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                   <Route path="/dashboard/*" element={<DashboardWrapper />} />
                </Route>

              </Route>
            </Routes>
            </Suspense>
          </InitializationGuard>
      </ThemeProvider>
    </Router>
    </QueryClientProvider>
  );
}

export default App;
