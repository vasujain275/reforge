import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

// Pages
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import DashboardWrapper from "@/pages/DashboardWrapper";
import LandingPage from "@/pages/Landing";

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <ThemeProvider defaultTheme="dark" storageKey="reforge-ui-theme">
        <Routes>
          {/* Main Layout wraps everything */}
          <Route element={<Layout />}>

            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
               <Route path="/dashboard/*" element={<DashboardWrapper />} />
            </Route>

          </Route>
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App;
