import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/context/AuthContext";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";

// Pages (to be implemented)
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import DashboardWrapper from "@/pages/DashboardWrapper"; // Wrapper to clean up App.tsx imports
import LandingPage from "@/pages/Landing";

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider defaultTheme="dark" storageKey="reforge-ui-theme">
          <Layout>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <DashboardWrapper />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
