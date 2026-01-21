import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Loader2,
  Server,
  Shield,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type OnboardingStep = "welcome" | "features" | "setup";

export default function OnboardingPage() {
  const [step, setStep] = useState<OnboardingStep>("welcome");
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsSubmitting(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsSubmitting(false);
      return;
    }

    try {
      await api.post("/onboarding/setup", {
        name,
        email,
        password,
      });

      toast.success("System initialized successfully!");
      
      // Force a full page reload to reset InitializationGuard state
      // This ensures the guard re-checks and redirects properly to login
      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to initialize system";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (step === "welcome") setStep("features");
    else if (step === "features") setStep("setup");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden overflow-y-auto">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Gradient Orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Progress Indicator */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2">
          <StepIndicator 
            step={1} 
            label="Welcome" 
            isActive={step === "welcome"} 
            isComplete={step === "features" || step === "setup"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          <StepIndicator 
            step={2} 
            label="Features" 
            isActive={step === "features"} 
            isComplete={step === "setup"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          <StepIndicator 
            step={3} 
            label="Setup" 
            isActive={step === "setup"} 
            isComplete={false} 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex items-center justify-center p-6 pt-20 pb-16">
        <AnimatePresence mode="wait">
          {step === "welcome" && (
            <WelcomeStep key="welcome" onNext={nextStep} />
          )}
          {step === "features" && (
            <FeaturesStep key="features" onNext={nextStep} />
          )}
          {step === "setup" && (
            <SetupStep
              key="setup"
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              error={error}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <p className="text-xs font-mono text-muted-foreground/60 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          Reforge v0.0.1-alpha | Self-Hosted DSA Revision Tool
        </p>
      </div>
    </div>
  );
}

function StepIndicator({ 
  step, 
  label, 
  isActive, 
  isComplete 
}: { 
  step: number; 
  label: string; 
  isActive: boolean; 
  isComplete: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all
        ${isComplete ? "bg-green-500/20 text-green-500 border border-green-500/30" : ""}
        ${isActive ? "bg-primary/20 text-primary border border-primary/30" : ""}
        ${!isActive && !isComplete ? "bg-muted text-muted-foreground border border-border" : ""}
      `}>
        {isComplete ? <Check className="h-3 w-3" /> : step}
      </div>
      <span className={`text-xs font-mono uppercase tracking-wider hidden sm:inline ${isActive ? "text-primary" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl text-center space-y-8"
    >
      {/* Logo & Branding */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
          <Terminal className="h-12 w-12 text-primary" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        </div>
      </motion.div>

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2"
      >
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
          System Ready
        </span>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-sm font-mono text-primary font-bold">
          First Run Detected
        </span>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          <span className="text-primary">Welcome to</span>
          <br />
          <span className="text-foreground">Reforge.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
          Your local-first, self-hosted DSA revision command center.
          <span className="block mt-2 text-base text-muted-foreground/70">
            Consistent, explainable problem selection. No cloud required.
          </span>
        </p>
      </motion.div>

      {/* Terminal Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 max-w-md mx-auto text-left"
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
          <span className="text-xs font-mono text-muted-foreground ml-2">terminal</span>
        </div>
        <div className="font-mono text-sm space-y-1">
          <p className="text-muted-foreground">$ reforge init</p>
          <p className="text-green-500">Initializing Reforge instance...</p>
          <p className="text-muted-foreground/70">Creating SQLite database...</p>
          <p className="text-primary animate-pulse">Waiting for admin setup...</p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Button
          size="lg"
          onClick={onNext}
          className="h-14 px-10 text-lg font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          Get Started
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

function FeaturesStep({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: <Brain className="h-8 w-8 text-primary" />,
      title: "Smart Scheduling",
      description: "7-feature deterministic algorithm for optimal revision timing"
    },
    {
      icon: <Server className="h-8 w-8 text-blue-400" />,
      title: "Single Binary",
      description: "One executable, SQLite database, no dependencies"
    },
    {
      icon: <Shield className="h-8 w-8 text-emerald-400" />,
      title: "Privacy First",
      description: "Your data stays on your machine, always"
    },
    {
      icon: <Terminal className="h-8 w-8 text-orange-400" />,
      title: "Explainable Logic",
      description: "No ML black boxes - fully transparent scoring"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-4xl space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2"
        >
          <span className="text-sm font-mono text-primary uppercase tracking-wider">
            Why Reforge?
          </span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
        >
          Built for Engineers,
          <span className="text-primary block">By Engineers</span>
        </motion.h2>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="group bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-[0_0_30px_-10px_var(--primary)] transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-background/50 border border-border group-hover:border-primary/30 transition-colors">
                {feature.icon}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center gap-8 py-4"
      >
        <div className="text-center">
          <p className="text-2xl font-bold font-mono text-primary">100%</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Local</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold font-mono text-primary">0</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cloud Deps</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl font-bold font-mono text-primary">1</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Binary</p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="h-14 px-10 text-lg font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          Create Admin Account
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

interface SetupStepProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  error: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function SetupStep({
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  error,
  isSubmitting,
  onSubmit,
}: SetupStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-lg space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary/10 border border-primary/20"
        >
          <Shield className="h-8 w-8 text-primary" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Create Admin Account
          </h2>
          <p className="text-muted-foreground mt-2">
            This account will have full system access
          </p>
        </motion.div>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onSubmit={onSubmit}
        className="space-y-5"
      >
        {/* Security Notice */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            <span className="text-primary font-semibold">SECURITY:</span>{" "}
            Choose a strong password. This admin account controls your entire Reforge instance.
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="font-mono text-xs">{error}</span>
          </div>
        )}

        <div className="space-y-4">
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
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Initializing System...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-5 w-5" />
              Initialize Reforge
            </>
          )}
        </Button>
      </motion.form>
    </motion.div>
  );
}
