import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Key, Settings, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import UsersPage from "./UsersPage";
import InvitesPage from "./InvitesPage";
import AdminSettingsPage from "./SettingsPage";
import ImportPage from "./ImportPage";

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  const getActiveTab = () => {
    if (location.pathname.includes("/admin/invites")) return "invites";
    if (location.pathname.includes("/admin/settings")) return "settings";
    if (location.pathname.includes("/admin/data")) return "data";
    return "users";
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "users":
        navigate("/dashboard/admin/users");
        break;
      case "invites":
        navigate("/dashboard/admin/invites");
        break;
      case "settings":
        navigate("/dashboard/admin/settings");
        break;
      case "data":
        navigate("/dashboard/admin/data");
        break;
    }
  };

  return (
    <div className="h-full">
      <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="h-full flex flex-col">
        <div className="border-b border-border bg-muted/20 px-6 pt-6">
          <TabsList className="font-mono">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2">
              <Key className="h-4 w-4" />
              Invites
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <TabsContent value="users" className="m-0 h-full">
            <UsersPage />
          </TabsContent>
          <TabsContent value="invites" className="m-0 h-full">
            <InvitesPage />
          </TabsContent>
          <TabsContent value="data" className="m-0 h-full">
            <ImportPage />
          </TabsContent>
          <TabsContent value="settings" className="m-0 h-full">
            <AdminSettingsPage />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
