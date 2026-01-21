import DashboardLayout from "@/components/DashboardLayout";
import { Route, Routes } from "react-router-dom";
import AttemptsPage from "./dashboard/AttemptsPage";
import DashboardHome from "./dashboard/DashboardHome";
import EditProblemPage from "./dashboard/EditProblemPage";
import NewProblemPage from "./dashboard/NewProblemPage";
import NewSessionPage from "./dashboard/NewSessionPage";
import PatternsPage from "./dashboard/PatternsPage";
import ProblemsPage from "./dashboard/ProblemsPage";
import RecordAttemptPage from "./dashboard/RecordAttemptPage";
import SessionDetailPage from "./dashboard/SessionDetailPage";
import SessionsPage from "./dashboard/SessionsPage";
import SettingsPage from "./dashboard/SettingsPage";

export default function DashboardWrapper() {
  return (
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
      </Route>
    </Routes>
  );
}
