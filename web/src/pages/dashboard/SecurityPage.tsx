import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usersApi } from "@/api/users";
import { useAuthStore } from "@/store/authStore";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Unlock,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function SecurityPage() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Account Deletion State
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, label: "Enter password", color: "bg-muted" };
    if (password.length < 8) return { level: 1, label: "Too short", color: "bg-red-500" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 2, label: "Weak", color: "bg-orange-500" };
    if (score <= 3) return { level: 3, label: "Fair", color: "bg-yellow-500" };
    if (score <= 4) return { level: 4, label: "Strong", color: "bg-green-500" };
    return { level: 5, label: "Excellent", color: "bg-primary" };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      setIsChangingPassword(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      setIsChangingPassword(false);
      return;
    }

    try {
      await usersApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      setPasswordSuccess(true);
      toast.success("Password changed successfully");

      // Clear form after short delay
      setTimeout(() => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setPasswordSuccess(false);
      }, 2000);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiErr.response?.data?.message || "Failed to change password";
      setPasswordError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setDeleteError("");

    // Validation
    if (!deletePassword) {
      setDeleteError("Password is required");
      setIsDeleting(false);
      return;
    }

    if (deleteConfirmation !== "DELETE") {
      setDeleteError("Please type DELETE to confirm");
      setIsDeleting(false);
      return;
    }

    try {
      await usersApi.deleteAccount({
        password: deletePassword,
      });

      toast.success("Account deleted successfully");

      // Logout and redirect to landing page
      setTimeout(async () => {
        await logout();
        navigate("/");
      }, 1500);
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      const errorMsg = apiErr.response?.data?.message || "Failed to delete account";
      setDeleteError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Security Settings</h1>
            <p className="text-sm text-muted-foreground font-mono">
              Manage authentication & account security
            </p>
          </div>
        </motion.div>

        {/* Status Bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-4 p-4 bg-card/50 backdrop-blur-sm border border-border rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Session Active
            </span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 text-primary" />
            <span className="text-xs font-mono text-muted-foreground">
              Password Protected
            </span>
          </div>
        </motion.div>

        {/* Change Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 backdrop-blur-sm border border-border rounded-xl overflow-hidden"
        >
          {/* Section Header */}
          <div className="p-6 border-b border-border bg-muted/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Change Password</h2>
                <p className="text-sm text-muted-foreground">
                  Update your account credentials
                </p>
              </div>
            </div>
          </div>

          {/* Success State */}
          <AnimatePresence>
            {passwordSuccess && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 bg-green-500/10 border-b border-green-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600 dark:text-green-400">
                      Password Updated Successfully
                    </p>
                    <p className="text-sm text-green-600/70 dark:text-green-400/70">
                      Your new password is now active
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleChangePassword} className="p-6 space-y-6">
            {/* Error */}
            <AnimatePresence>
              {passwordError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-destructive/15 text-destructive p-4 rounded-lg flex items-start gap-3 border border-destructive/20"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Authentication Error</p>
                    <p className="text-xs opacity-80">{passwordError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Left Column - Current Password */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="oldPassword" className="text-sm font-medium flex items-center gap-2">
                    <Unlock className="h-3.5 w-3.5 text-muted-foreground" />
                    Current Password
                  </Label>
                  <Input
                    id="oldPassword"
                    type="password"
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    disabled={isChangingPassword}
                    className="h-11"
                  />
                </div>

                {/* Password Requirements Info */}
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Password Requirements
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <div className={`h-1 w-1 rounded-full ${newPassword.length >= 8 ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                      Minimum 8 characters
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`h-1 w-1 rounded-full ${/[A-Z]/.test(newPassword) ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                      Uppercase letter (recommended)
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`h-1 w-1 rounded-full ${/[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                      Number (recommended)
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column - New Password */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isChangingPassword}
                    className="h-11"
                  />
                  {/* Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.level
                                ? passwordStrength.color
                                : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-mono ${
                        passwordStrength.level <= 1 ? 'text-red-500' :
                        passwordStrength.level <= 2 ? 'text-orange-500' :
                        passwordStrength.level <= 3 ? 'text-yellow-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-muted-foreground" />
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isChangingPassword}
                      className={`h-11 pr-10 ${
                        confirmPassword && !passwordsMatch ? 'border-red-500/50' : ''
                      } ${passwordsMatch ? 'border-green-500/50' : ''}`}
                    />
                    {confirmPassword && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {passwordsMatch ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isChangingPassword || !oldPassword || !newPassword || !passwordsMatch}
                className="w-full md:w-auto h-11 px-8 font-medium"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Update Password
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/50 backdrop-blur-sm border border-destructive/20 rounded-xl overflow-hidden"
        >
          {/* Section Header */}
          <div className="p-6 border-b border-destructive/20 bg-destructive/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <ShieldAlert className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
                  <p className="text-sm text-muted-foreground">
                    Irreversible account actions
                  </p>
                </div>
              </div>
              {!showDeleteForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteForm(true)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              )}
            </div>
          </div>

          {/* Delete Form (Collapsible) */}
          <AnimatePresence>
            {showDeleteForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <form onSubmit={handleDeleteAccount} className="p-6 space-y-6">
                  {/* Warning Banner */}
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-destructive text-sm">
                          This action cannot be undone
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          All your data including problems, sessions, attempts, patterns, and settings
                          will be permanently deleted. This process is irreversible.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {deleteError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-destructive/15 text-destructive p-3 rounded-lg flex items-center gap-2 border border-destructive/20"
                      >
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm">{deleteError}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="deletePassword" className="text-sm font-medium">
                        Confirm Your Password
                      </Label>
                      <Input
                        id="deletePassword"
                        type="password"
                        placeholder="Enter your password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="h-11 border-destructive/30 focus:border-destructive"
                        disabled={isDeleting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deleteConfirmation" className="text-sm font-medium">
                        Type <span className="font-mono text-destructive">DELETE</span> to confirm
                      </Label>
                      <Input
                        id="deleteConfirmation"
                        type="text"
                        placeholder="DELETE"
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value.toUpperCase())}
                        className={`h-11 font-mono border-destructive/30 focus:border-destructive ${
                          deleteConfirmation === "DELETE" ? "border-destructive" : ""
                        }`}
                        disabled={isDeleting}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDeleteForm(false);
                        setDeletePassword("");
                        setDeleteConfirmation("");
                        setDeleteError("");
                      }}
                      disabled={isDeleting}
                      className="h-11"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={isDeleting || deleteConfirmation !== "DELETE" || !deletePassword}
                      className="h-11 flex-1 md:flex-none md:px-8"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting Account...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Account Permanently
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed State Info */}
          {!showDeleteForm && (
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, all of your data will be permanently removed.
                This action cannot be reversed.
              </p>
            </div>
          )}
        </motion.div>

        {/* Footer Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2">
            <Terminal className="h-3 w-3 text-primary" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Security Console
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
