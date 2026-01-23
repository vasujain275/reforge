import { adminApi, type SignupSettings } from "@/api/admin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Loader2,
  Settings,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SignupSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await adminApi.getSignupSettings();
      setSettings(data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load settings"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleSignup = async (enabled: boolean) => {
    if (!settings) return;
    
    setUpdating('signup');
    try {
      await adminApi.updateSignupEnabled(enabled);
      setSettings({ ...settings, signup_enabled: enabled });
      toast.success(
        enabled ? "Public signup enabled" : "Public signup disabled"
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update setting"));
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleInvites = async (enabled: boolean) => {
    if (!settings) return;
    
    setUpdating('invites');
    try {
      await adminApi.updateInviteCodesEnabled(enabled);
      setSettings({ ...settings, invite_codes_enabled: enabled });
      toast.success(
        enabled ? "Invite codes required" : "Invite codes not required"
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update setting"));
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center py-12 px-4">
          <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error || "Failed to load settings"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-mono uppercase flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Admin Settings
        </h1>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          Configure system settings and registration policies
        </p>
      </div>

      {/* Registration Settings */}
      <Card className="border-2">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg font-mono uppercase flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Registration Settings
          </CardTitle>
          <CardDescription className="font-mono">
            Control how users can register for the system
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Public Signup Toggle */}
          <div className="flex items-start justify-between gap-4 pb-6 border-b border-border">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="signup-toggle" className="font-mono font-semibold text-base">
                  Public Signup
                </Label>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${
                    settings.signup_enabled
                      ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  }`}
                >
                  {settings.signup_enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {settings.signup_enabled
                  ? "Anyone can register for a new account"
                  : "New user registration is disabled"}
              </p>
              {!settings.signup_enabled && (
                <p className="text-xs text-primary font-mono mt-2">
                  Only admins can create accounts via password reset links
                </p>
              )}
            </div>
            <Switch
              id="signup-toggle"
              checked={settings.signup_enabled}
              onCheckedChange={handleToggleSignup}
              disabled={updating === 'signup'}
              className="mt-1"
            />
          </div>

          {/* Invite Codes Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor="invites-toggle" className="font-mono font-semibold text-base">
                  Require Invite Codes
                </Label>
                <span
                  className={`px-2 py-0.5 rounded-md text-xs font-mono font-semibold ${
                    settings.invite_codes_enabled
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {settings.invite_codes_enabled ? "REQUIRED" : "NOT REQUIRED"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {settings.invite_codes_enabled
                  ? "Users must provide a valid invite code to register"
                  : "Users can register without an invite code"}
              </p>
              {!settings.signup_enabled && (
                <p className="text-xs text-muted-foreground font-mono mt-2 italic">
                  This setting has no effect while public signup is disabled
                </p>
              )}
            </div>
            <Switch
              id="invites-toggle"
              checked={settings.invite_codes_enabled}
              onCheckedChange={handleToggleInvites}
              disabled={updating === 'invites' || !settings.signup_enabled}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-sm font-mono uppercase flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            Security Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono text-muted-foreground">
          <p>
            <strong className="text-foreground">Recommended Configuration:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Enable public signup + require invite codes for controlled onboarding</li>
            <li>Disable public signup entirely for closed/private systems</li>
            <li>Admins can always create password reset links to onboard users manually</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
