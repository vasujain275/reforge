import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Loader2,
  Server,
  Shield,
  SkipForward,
  Terminal,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  onboardingImportApi,
  connectToImportStream,
  type BundledDataset,
  type ImportProgress as ImportProgressType,
  type ImportResult,
} from "@/api/import";

type OnboardingStep = "welcome" | "features" | "setup" | "data";

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

      toast.success("Admin account created!");
      
      // Move to data import step instead of redirecting
      setStep("data");
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

  const handleFinish = () => {
    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden flex flex-col">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
      
      {/* Gradient Orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

      {/* Progress Indicator - positioned inside the flow */}
      <div className="relative z-10 pt-4 pb-2 flex justify-center shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 sm:px-4 py-2">
          <StepIndicator 
            step={1} 
            label="Welcome" 
            isActive={step === "welcome"} 
            isComplete={step === "features" || step === "setup" || step === "data"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <StepIndicator 
            step={2} 
            label="Features" 
            isActive={step === "features"} 
            isComplete={step === "setup" || step === "data"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <StepIndicator 
            step={3} 
            label="Setup" 
            isActive={step === "setup"} 
            isComplete={step === "data"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <StepIndicator 
            step={4} 
            label="Data" 
            isActive={step === "data"} 
            isComplete={false} 
          />
        </div>
      </div>

      {/* Main Content - scrollable area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="min-h-full flex items-center justify-center px-4 sm:px-6 py-4">
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
            {step === "data" && (
              <DataStep key="data" onFinish={handleFinish} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer - positioned inside the flow */}
      <div className="relative z-10 py-3 flex justify-center shrink-0">
        <p className="text-xs font-mono text-muted-foreground/60 bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          Reforge v0.0.1-alpha
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
      className="w-full max-w-2xl text-center space-y-5 sm:space-y-6"
    >
      {/* Logo & Branding */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 border border-primary/20">
          <Terminal className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        </div>
      </motion.div>

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 py-1.5 sm:px-4 sm:py-2"
      >
        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs sm:text-sm font-mono text-muted-foreground uppercase tracking-wider">
          System Ready
        </span>
        <span className="text-muted-foreground/50 hidden sm:inline">|</span>
        <span className="text-xs sm:text-sm font-mono text-primary font-bold hidden sm:inline">
          First Run
        </span>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
          <span className="text-primary">Welcome to</span>
          <br />
          <span className="text-foreground">Reforge.</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed px-2">
          Your local-first, self-hosted DSA revision command center.
        </p>
      </motion.div>

      {/* Terminal Preview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-3 sm:p-4 max-w-sm mx-auto text-left"
      >
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          <span className="text-xs font-mono text-muted-foreground ml-2">terminal</span>
        </div>
        <div className="font-mono text-xs sm:text-sm space-y-0.5">
          <p className="text-muted-foreground">$ reforge init</p>
          <p className="text-green-500">Initializing...</p>
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
          className="h-11 sm:h-12 px-6 sm:px-8 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          Get Started
          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

function FeaturesStep({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: <Brain className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />,
      title: "Smart Scheduling",
      description: "Deterministic algorithm for optimal revision"
    },
    {
      icon: <Server className="h-6 w-6 sm:h-7 sm:w-7 text-blue-400" />,
      title: "Single Binary",
      description: "One executable, SQLite, no dependencies"
    },
    {
      icon: <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-400" />,
      title: "Privacy First",
      description: "Your data stays on your machine"
    },
    {
      icon: <Terminal className="h-6 w-6 sm:h-7 sm:w-7 text-orange-400" />,
      title: "Explainable",
      description: "No ML black boxes - pure logic"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl space-y-5 sm:space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5"
        >
          <span className="text-xs sm:text-sm font-mono text-primary uppercase tracking-wider">
            Why Reforge?
          </span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground"
        >
          Built for Engineers,
          <span className="text-primary block">By Engineers</span>
        </motion.h2>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="group bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 hover:border-primary/30 transition-all duration-300"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-background/50 border border-border group-hover:border-primary/30 transition-colors shrink-0">
                {feature.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
        className="flex justify-center gap-6 sm:gap-8 py-2"
      >
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold font-mono text-primary">100%</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Local</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold font-mono text-primary">0</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Cloud Deps</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-xl sm:text-2xl font-bold font-mono text-primary">1</p>
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
          className="h-11 sm:h-12 px-6 sm:px-8 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          Create Admin Account
          <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
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
      className="w-full max-w-md space-y-4 sm:space-y-5"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 border border-primary/20"
        >
          <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Create Admin Account
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
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
        className="space-y-4"
      >
        {error && (
          <div className="bg-destructive/15 text-destructive text-sm p-2.5 rounded-lg flex items-center gap-2 border border-destructive/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="font-mono text-xs">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
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
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
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
              className="h-10"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-11 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Initialize Reforge
            </>
          )}
        </Button>
      </motion.form>
    </motion.div>
  );
}

// ============= Data Import Step =============

type DataStepPhase = "select" | "importing" | "complete";

function DataStep({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<DataStepPhase>("select");
  const [datasets, setDatasets] = useState<BundledDataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<BundledDataset | null>(null);
  
  // Import state
  const [importProgress, setImportProgress] = useState<ImportProgressType | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch datasets on mount
  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const data = await onboardingImportApi.getBundledDatasets();
        setDatasets(data);
      } catch (err) {
        console.error("Failed to load datasets:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDatasets();
  }, []);

  const handleStartImport = (dataset: BundledDataset) => {
    setSelectedDataset(dataset);
    setPhase("importing");
    setImportError(null);
    setImportProgress(null);

    const url = onboardingImportApi.getExecuteImportURL(dataset.id);
    
    eventSourceRef.current = connectToImportStream(url, {
      onProgress: (progress) => {
        setImportProgress(progress);
      },
      onComplete: (result) => {
        setImportResult(result);
        setPhase("complete");
      },
      onError: (error) => {
        setImportError(error);
        setPhase("select");
      },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl space-y-6"
    >
      <AnimatePresence mode="wait">
        {phase === "select" && (
          <DataSelectPhase
            key="select"
            datasets={datasets}
            isLoading={isLoading}
            error={importError}
            onSelect={handleStartImport}
            onSkip={onFinish}
          />
        )}
        {phase === "importing" && selectedDataset && (
          <DataImportingPhase
            key="importing"
            dataset={selectedDataset}
            progress={importProgress}
          />
        )}
        {phase === "complete" && importResult && (
          <DataCompletePhase
            key="complete"
            result={importResult}
            onFinish={onFinish}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Select Dataset Phase
function DataSelectPhase({
  datasets,
  isLoading,
  error,
  onSelect,
  onSkip,
}: {
  datasets: BundledDataset[];
  isLoading: boolean;
  error: string | null;
  onSelect: (dataset: BundledDataset) => void;
  onSkip: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative inline-block"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 border border-primary/20">
            <Database className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/20 rounded-full blur-2xl animate-pulse" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Load Problem Set
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-lg mx-auto">
            Get started quickly with a curated dataset of LeetCode problems and patterns.
            <span className="block mt-1 text-xs font-mono text-muted-foreground/70">
              // Optional - you can always import later from Admin → Data
            </span>
          </p>
        </motion.div>
      </div>

      {/* Status Badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex justify-center"
      >
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
          <Check className="h-3 w-3 text-green-500" />
          <span className="text-xs font-mono text-green-500 uppercase tracking-wider">
            Admin Account Created
          </span>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2"
        >
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <span className="text-xs font-mono text-red-500">{error}</span>
        </motion.div>
      )}

      {/* Dataset Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Loading datasets...
            </span>
          </div>
        </div>
      ) : datasets.length === 0 ? (
        <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
          <Database className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-mono text-sm font-semibold uppercase tracking-wider">
            No Datasets Available
          </h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            You can add problems manually from the dashboard
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {datasets.map((dataset, index) => (
            <DatasetCard
              key={dataset.id}
              dataset={dataset}
              index={index}
              onSelect={() => onSelect(dataset)}
            />
          ))}
        </div>
      )}

      {/* Skip Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center pt-2"
      >
        <Button
          variant="ghost"
          onClick={onSkip}
          className="font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="h-3 w-3 mr-1.5" />
          Skip for now
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Dataset Card
function DatasetCard({
  dataset,
  index,
  onSelect,
}: {
  dataset: BundledDataset;
  index: number;
  onSelect: () => void;
}) {
  const totalProblems =
    dataset.difficulties.easy +
    dataset.difficulties.medium +
    dataset.difficulties.hard;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.1, duration: 0.3 }}
    >
      <Card 
        className="border border-border bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all duration-300 cursor-pointer group"
        onClick={onSelect}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {dataset.name}
                </h3>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {dataset.description}
              </p>

              {/* Stats Row */}
              <div className="flex items-center gap-4 mt-3 font-mono text-xs">
                <span className="text-muted-foreground">
                  <span className="text-foreground font-semibold">{totalProblems.toLocaleString()}</span> problems
                </span>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-muted-foreground">
                  <span className="text-foreground font-semibold">{dataset.pattern_count}</span> patterns
                </span>
              </div>

              {/* Difficulty Breakdown */}
              <div className="flex items-center gap-3 mt-2 font-mono text-xs">
                <span>
                  <span className="text-green-500 font-semibold">{dataset.difficulties.easy}</span>
                  <span className="text-muted-foreground ml-1">E</span>
                </span>
                <span>
                  <span className="text-orange-400 font-semibold">{dataset.difficulties.medium}</span>
                  <span className="text-muted-foreground ml-1">M</span>
                </span>
                <span>
                  <span className="text-red-500 font-semibold">{dataset.difficulties.hard}</span>
                  <span className="text-muted-foreground ml-1">H</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Importing Phase
function DataImportingPhase({
  dataset,
  progress,
}: {
  dataset: BundledDataset;
  progress: ImportProgressType | null;
}) {
  const percentage = progress?.percentage ?? 0;
  const isPatternPhase = progress?.phase === "patterns";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative inline-block"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/10 border border-primary/20">
            <Loader2 className="h-7 w-7 sm:h-8 sm:w-8 text-primary animate-spin" />
          </div>
        </motion.div>
        
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Importing Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {dataset.name}
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <Card className="border border-border bg-card/50 backdrop-blur-sm">
        <CardContent className="p-6 space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {isPatternPhase ? "Creating Patterns" : "Importing Problems"}
              </span>
            </div>
            <span className="font-mono text-sm text-primary font-bold">
              {percentage.toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar */}
          <Progress value={percentage} className="h-2" />

          {/* Stats */}
          {progress && (
            <div className="flex items-center justify-center gap-6 pt-2 font-mono text-xs">
              <div className="text-center">
                <p className="text-lg font-bold text-green-500">{progress.problems_created}</p>
                <p className="text-muted-foreground uppercase tracking-wider">Created</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{progress.patterns_created}</p>
                <p className="text-muted-foreground uppercase tracking-wider">Patterns</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-lg font-bold text-muted-foreground">{progress.duplicates_skipped}</p>
                <p className="text-muted-foreground uppercase tracking-wider">Skipped</p>
              </div>
            </div>
          )}

          {/* Current Item */}
          {progress?.current_item && (
            <div className="bg-muted/30 border border-border rounded-lg p-3 font-mono text-xs">
              <span className="text-primary">$ </span>
              <span className="text-muted-foreground">importing </span>
              <span className="text-foreground">{progress.current_item}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Complete Phase
function DataCompletePhase({
  result,
  onFinish,
}: {
  result: ImportResult;
  onFinish: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative inline-block"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-green-500/10 border border-green-500/20">
            <Check className="h-8 w-8 sm:h-10 sm:w-10 text-green-500" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-green-500">
            System Ready
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Your Reforge instance is configured and loaded with data
          </p>
        </motion.div>
      </div>

      {/* Terminal Success Message */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 max-w-md mx-auto"
      >
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
          <span className="text-xs font-mono text-muted-foreground ml-2">terminal</span>
        </div>
        <div className="font-mono text-xs space-y-1">
          <p className="text-muted-foreground">$ reforge status</p>
          <p className="text-green-500">✔ Database initialized</p>
          <p className="text-green-500">✔ Admin account created</p>
          <p className="text-green-500">
            ✔ Loaded {result.problems_created.toLocaleString()} problems, {result.patterns_created} patterns
          </p>
          <p className="text-primary">Ready to start revision</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center gap-6 sm:gap-8 py-2"
      >
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold font-mono text-primary">
            {result.problems_created.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Problems</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold font-mono text-primary">
            {result.patterns_created}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Patterns</p>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <p className="text-2xl sm:text-3xl font-bold font-mono text-muted-foreground">
            {result.duration}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Duration</p>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex justify-center"
      >
        <Button
          size="lg"
          onClick={onFinish}
          className="h-11 sm:h-12 px-6 sm:px-8 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-primary/20"
        >
          <Terminal className="mr-2 h-4 w-4" />
          Launch Console
        </Button>
      </motion.div>
    </motion.div>
  );
}
