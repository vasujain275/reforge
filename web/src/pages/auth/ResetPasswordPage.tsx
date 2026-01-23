import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  KeyRound,
  Loader2,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "@/types/api";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validation
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post("/users/reset-password", {
        token,
        new_password: password,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(err, "Failed to reset password. The link may be expired or invalid.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-destructive/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 shadow-xl text-center">
            <div className="p-4 rounded-full bg-destructive/10 border border-destructive/20 w-fit mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This password reset link is invalid or missing. Please request a
              new password reset from your administrator.
            </p>
            <Link to="/login">
              <Button className="w-full h-11">
                Return to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background relative overflow-hidden flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-green-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 shadow-xl text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="p-4 rounded-full bg-green-500/10 border border-green-500/20 w-fit mx-auto mb-4"
            >
              <CheckCircle className="h-8 w-8 text-green-500" />
            </motion.div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-2">
              Password Reset Complete
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Your password has been successfully reset. You can now log in with
              your new password.
            </p>
            <Link to="/login">
              <Button className="w-full h-11 bg-primary hover:bg-primary/90">
                Continue to Login
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background relative overflow-hidden flex items-center justify-center p-6">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Gradient Orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side - Branding */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden lg:block space-y-8"
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <Terminal className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reforge</h1>
              <p className="text-xs font-mono text-muted-foreground">
                v0.0.1-alpha
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Reset your
              <span className="text-primary block">credentials.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Create a new secure password for your account. Make sure to use a
              strong password that you haven't used elsewhere.
            </p>
          </div>

          {/* Security Tips */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <KeyRound className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Password Requirements</span>
            </div>
            <ul className="font-mono text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Minimum 8 characters
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Mix of letters, numbers, symbols (recommended)
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                Avoid common passwords
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Right Side - Reset Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md mx-auto lg:mx-0"
        >
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 shadow-xl">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Reforge</h1>
                <p className="text-xs font-mono text-muted-foreground">
                  v0.0.1-alpha
                </p>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Set New Password
              </h2>
              <p className="text-sm text-muted-foreground">
                Enter your new password below
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs">{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  New Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                  minLength={8}
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                  minLength={8}
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md hover:shadow-primary/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>
                    Reset Password
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Link */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline underline-offset-4 transition-colors"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center mt-6"
          >
            <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2">
              <KeyRound className="h-3 w-3 text-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Secure Reset
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
