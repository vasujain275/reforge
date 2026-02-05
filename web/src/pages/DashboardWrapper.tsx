import DashboardLayout from "@/components/DashboardLayout";
import RequireAdmin from "@/components/RequireAdmin";
import { Suspense, lazy } from "react";
import { Route, Routes } from "react-router-dom";

// Lazy load dashboard pages for code splitting
const DashboardHome = lazy(() => import("./dashboard/DashboardHome"));
const ProblemsPage = lazy(() => import("./dashboard/ProblemsPage"));
const NewProblemPage = lazy(() => import("./dashboard/NewProblemPage"));
const EditProblemPage = lazy(() => import("./dashboard/EditProblemPage"));
const SessionsPage = lazy(() => import("./dashboard/SessionsPage"));
const NewSessionPage = lazy(() => import("./dashboard/NewSessionPage"));
const SessionDetailPage = lazy(() => import("./dashboard/SessionDetailPage"));
const AttemptsPage = lazy(() => import("./dashboard/AttemptsPage"));
const RecordAttemptPage = lazy(() => import("./dashboard/RecordAttemptPage"));
const PatternsPage = lazy(() => import("./dashboard/PatternsPage"));
const SettingsPage = lazy(() => import("./dashboard/SettingsPage"));
const SecurityPage = lazy(() => import("./dashboard/SecurityPage"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));

// Loading fallback for lazy-loaded pages
function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function DashboardWrapper() {
  return (
    <Suspense fallback={<PageLoadingFallback />}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="problems" element={<ProblemsPage />} />
          <Route path="problems/new" element={<NewProblemPage />} />
          <Route path="problems/:id/edit" element={<EditProblemPage />} />
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/new" element={<NewSessionPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="attempts" element={<AttemptsPage />} />
          <Route path="attempts/new" element={<RecordAttemptPage />} />
          <Route path="patterns" element={<PatternsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/security" element={<SecurityPage />} />
          
          {/* Admin Routes (Protected - Requires Admin Role) */}
          <Route element={<RequireAdmin />}>
            <Route path="admin/*" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
