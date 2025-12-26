import { Route, Routes } from "react-router-dom";
import DashboardHome from "./dashboard/DashboardHome";
// Will import other dashboard sub-pages here later

export default function DashboardWrapper() {
  return (
    <div className="space-y-6">
      <Routes>
        <Route index element={<DashboardHome />} />
        {/* <Route path="sessions" element={<SessionsPage />} /> */}
      </Routes>
    </div>
  );
}
