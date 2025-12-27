import DashboardLayout from "@/components/DashboardLayout";
import { Route, Routes } from "react-router-dom";
import DashboardHome from "./dashboard/DashboardHome";
import NewProblemPage from "./dashboard/NewProblemPage";
import NewSessionPage from "./dashboard/NewSessionPage";
import PatternsPage from "./dashboard/PatternsPage";
import ProblemsPage from "./dashboard/ProblemsPage";
import SessionsPage from "./dashboard/SessionsPage";
import SettingsPage from "./dashboard/SettingsPage";

export default function DashboardWrapper() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardHome />} />
        <Route path="problems" element={<ProblemsPage />} />
        <Route path="problems/new" element={<NewProblemPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/new" element={<NewSessionPage />} />
        <Route path="patterns" element={<PatternsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
