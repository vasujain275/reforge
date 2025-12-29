import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Bell, Clock, Loader2, Moon, Save, Terminal, User } from "lucide-react";
import { useEffect, useState } from "react";

interface UserSettings {
  name: string;
  email: string;
  theme: string;
  default_duration: number;
  daily_goal: number;
  reminder_time: string;
  notifications_enabled: boolean;
}

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<UserSettings>({
    name: user?.name || "",
    email: user?.email || "",
    theme: "dark",
    default_duration: 35,
    daily_goal: 3,
    reminder_time: "09:00",
    notifications_enabled: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/users/settings");
      if (response.data.data) {
        setSettings(response.data.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch settings:", err);
      setError(
        "Failed to load settings. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.put("/users/settings", settings);
    } catch (err: unknown) {
      console.error("Failed to save settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  if (error && !settings.email) {
    return <ApiError message={error} onRetry={fetchSettings} />;
  }

  return (
    <div className="flex-1 p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {error && (
        <ApiError variant="inline" message={error} onRetry={handleSave} />
      )}

      <div className="space-y-6 mt-6">
        {/* Profile Settings */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Your personal information and account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                  id="name"
                  value={settings.name}
                  onChange={(e) =>
                    setSettings({ ...settings, name: e.target.value })
                  }
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  className="font-mono"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              <CardTitle>Appearance</CardTitle>
            </div>
            <CardDescription>
              Customize how Reforge looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) =>
                  setSettings({ ...settings, theme: value })
                }
              >
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark (Default)</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Nerdy Linux aesthetic works best in dark mode
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Session Preferences */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Session Preferences</CardTitle>
            </div>
            <CardDescription>
              Configure your default session settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Default Session Duration</Label>
                <Select
                  value={settings.default_duration.toString()}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      default_duration: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="35">35 minutes</SelectItem>
                    <SelectItem value="55">55 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily Problem Goal</Label>
                <Select
                  value={settings.daily_goal.toString()}
                  onValueChange={(value) =>
                    setSettings({ ...settings, daily_goal: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 problem/day</SelectItem>
                    <SelectItem value="2">2 problems/day</SelectItem>
                    <SelectItem value="3">3 problems/day</SelectItem>
                    <SelectItem value="5">5 problems/day</SelectItem>
                    <SelectItem value="10">10 problems/day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure when and how you receive reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Practice Reminder</Label>
                <p className="text-sm text-muted-foreground">
                  Get a reminder to start your daily session
                </p>
              </div>
              <Button
                variant={settings.notifications_enabled ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSettings({
                    ...settings,
                    notifications_enabled: !settings.notifications_enabled,
                  })
                }
              >
                {settings.notifications_enabled ? "Enabled" : "Disabled"}
              </Button>
            </div>
            {settings.notifications_enabled && (
              <div className="space-y-2 pt-2">
                <Label>Reminder Time</Label>
                <Input
                  type="time"
                  value={settings.reminder_time}
                  onChange={(e) =>
                    setSettings({ ...settings, reminder_time: e.target.value })
                  }
                  className="font-mono w-full max-w-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="border-dashed bg-muted/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-muted-foreground">
                System Info
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs text-muted-foreground space-y-1">
              <p>$ reforge --version</p>
              <p className="text-foreground">reforge v0.1.0-alpha</p>
              <p className="mt-2">$ echo $USER</p>
              <p className="text-foreground">{user?.email || "anonymous"}</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
