import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema } from "@/lib/schemas";
import { useAuthStore } from "@/store/authStore";
import { publicApi } from "@/api/admin";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Brain, Loader2, Server, Shield, Terminal } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";

export default function RegisterPage() {
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [inviteCodesRequired, setInviteCodesRequired] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await publicApi.getSignupSettings();
        console.log("Signup settings:", settings);
        setSignupEnabled(settings.signup_enabled);
        setInviteCodesRequired(settings.invite_codes_enabled);
      } catch (err) {
        console.error("Failed to fetch signup settings:", err);
        // If we can't fetch settings, default to allowing signup without invite codes
        setSignupEnabled(true);
        setInviteCodesRequired(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Zod Validation
    const result = registerSchema.safeParse({ 
      name, 
      email, 
      password,
      invite_code: inviteCode || undefined,
    });
    if (!result.success) {
      setError(result.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      await register(result.data);
      toast.success("Account created successfully!");
      navigate("/login");
    } catch (err: unknown) {
      const errorMsg = getApiErrorMessage(err, "Registration failed. Try again.");
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (!signupEnabled) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background relative overflow-hidden flex items-center justify-center p-6">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Registration Disabled
            </h1>
            <p className="text-muted-foreground">
              New user registration is currently disabled by the administrator.
            </p>
          </div>

          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
            <p className="text-xs font-mono text-muted-foreground">
              $ reforge status --signup<br />
              <span className="text-red-400">✗ Public registration: disabled</span>
            </p>
          </div>

          <Link to="/login">
            <Button variant="outline" size="lg" className="h-12 px-8">
              Back to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

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
              <p className="text-xs font-mono text-muted-foreground">v0.0.1-alpha</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Start your journey to
              <span className="text-primary block">interview mastery.</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Join Reforge and get access to a deterministic, explainable DSA revision system. No ML black boxes - just pure logic.
            </p>
          </div>

          {/* Features Preview */}
          <div className="space-y-3">
            {[
              { icon: <Brain className="h-5 w-5 text-primary" />, text: "Smart spaced repetition" },
              { icon: <Server className="h-5 w-5 text-blue-400" />, text: "Local-first architecture" },
              { icon: <Shield className="h-5 w-5 text-emerald-400" />, text: "Your data, your machine" },
            ].map((feature, i) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center gap-3 bg-card/30 backdrop-blur-sm border border-border/50 rounded-lg px-4 py-3"
              >
                {feature.icon}
                <span className="text-sm text-muted-foreground">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right Side - Register Form */}
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
                <p className="text-xs font-mono text-muted-foreground">v0.0.1-alpha</p>
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2 mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Create Account
              </h2>
              <p className="text-sm text-muted-foreground">
                Initialize your local revision system
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
                <Label htmlFor="name" className="text-sm font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
              </div>

              {inviteCodesRequired && (
                <div className="space-y-2">
                  <Label htmlFor="inviteCode" className="text-sm font-medium">
                    Invite Code
                  </Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    placeholder="Enter your invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="h-11 font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    An invite code is required to register
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md hover:shadow-primary/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Initialize System
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer Link */}
            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline underline-offset-4 transition-colors"
                >
                  Access Console
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
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Registration Open
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
