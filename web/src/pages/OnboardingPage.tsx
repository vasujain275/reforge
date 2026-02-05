import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COPY } from "@/lib/copy";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Brain,
  Check,
  ChevronRight,
  BarChart3,
  Layers,
  LayoutDashboard,
  Loader2,
  Shield,
  Settings,
} from "lucide-react";
import { useEffect } from "react";
import { useOnboardingStore } from "@/store/onboardingStore";

export default function OnboardingPage() {
  const { step, nextStep, formData, error, isSubmitting, setFormField, submitSetup, reset } = useOnboardingStore();

  // Reset store on mount to ensure fresh state
  useEffect(() => {
    reset();
  }, [reset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitSetup();
  };

  const handleFinish = () => {
    // Redirect to login
    window.location.href = "/login";
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] bg-background relative overflow-hidden flex flex-col">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      
      {/* Gradient Orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* Progress Indicator */}
      <div className="relative z-10 pt-4 pb-2 flex justify-center shrink-0">
        <div className="flex items-center gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-3 sm:px-4 py-2">
          <StepIndicator 
            step={1} 
            label="Welcome" 
            isActive={step === "welcome"} 
            isComplete={step === "features" || step === "setup" || step === "complete"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <StepIndicator 
            step={2} 
            label="Features" 
            isActive={step === "features"} 
            isComplete={step === "setup" || step === "complete"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <StepIndicator 
            step={3} 
            label="Setup" 
            isActive={step === "setup"} 
            isComplete={step === "complete"} 
          />
          <ChevronRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <StepIndicator 
            step={4} 
            label="Complete" 
            isActive={step === "complete"} 
            isComplete={false} 
          />
        </div>
      </div>

      {/* Main Content */}
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
                formData={formData}
                setFormField={setFormField}
                error={error}
                isSubmitting={isSubmitting}
                onSubmit={handleSubmit}
              />
            )}
            {step === "complete" && (
              <CompleteStep key="complete" onFinish={handleFinish} />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 py-3 flex justify-center shrink-0">
        <p className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-3 py-1 rounded-full">
          {COPY.brand.name}
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
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all
        ${isComplete ? "bg-green-500/20 text-green-500 border border-green-500/30" : ""}
        ${isActive ? "bg-primary/20 text-primary border border-primary/30" : ""}
        ${!isActive && !isComplete ? "bg-muted text-muted-foreground border border-border" : ""}
      `}>
        {isComplete ? <Check className="h-3 w-3" /> : step}
      </div>
      <span className={`text-xs hidden sm:inline ${isActive ? "text-primary font-medium" : "text-muted-foreground"}`}>
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
      className="w-full max-w-2xl text-center space-y-6"
    >
      {/* Logo & Branding */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20">
          <LayoutDashboard className="h-10 w-10 text-primary" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center -z-10">
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
        <span className="text-sm text-muted-foreground">
          First Time Setup
        </span>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          <span className="text-primary">Welcome to</span>
          <br />
          <span className="text-foreground">{COPY.brand.name}.</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          {COPY.brand.description}
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          size="lg"
          onClick={onNext}
          className="h-12 px-8 text-base font-medium rounded-lg"
        >
          {COPY.actions.getStarted}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

function FeaturesStep({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: <Brain className="h-7 w-7 text-primary" />,
      title: "Smart Scheduling",
      description: "Spaced repetition algorithm for optimal retention"
    },
    {
      icon: <BarChart3 className="h-7 w-7 text-emerald-500" />,
      title: "Track Progress",
      description: "Monitor your improvement over time"
    },
    {
      icon: <Layers className="h-7 w-7 text-blue-500" />,
      title: "Pattern Mastery",
      description: "Organize problems by technique and focus area"
    },
    {
      icon: <Settings className="h-7 w-7 text-orange-500" />,
      title: "Customizable",
      description: "Adjust scoring weights to match your goals"
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-3xl space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5"
        >
          <span className="text-sm text-primary">
            Why {COPY.brand.name}?
          </span>
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold tracking-tight text-foreground"
        >
          Everything you need for
          <span className="text-primary block">interview preparation</span>
        </motion.h2>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-5 hover:border-primary/30 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-background/50 border border-border shrink-0">
                {feature.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex justify-center pt-2"
      >
        <Button
          size="lg"
          onClick={onNext}
          className="h-12 px-8 text-base font-medium rounded-lg"
        >
          {COPY.auth.createAccount}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

interface OnboardingFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface SetupStepProps {
  formData: OnboardingFormData;
  setFormField: <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => void;
  error: string;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

function SetupStep({
  formData,
  setFormField,
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
      className="w-full max-w-md space-y-5"
    >
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 border border-primary/20"
        >
          <Shield className="h-7 w-7 text-primary" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
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
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-lg flex items-center gap-2 border border-destructive/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              {COPY.auth.name}
            </Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormField("name", e.target.value)}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {COPY.auth.email}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(e) => setFormField("email", e.target.value)}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {COPY.auth.password}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimum 8 characters"
              value={formData.password}
              onChange={(e) => setFormField("password", e.target.value)}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              {COPY.auth.confirmPassword}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={formData.confirmPassword}
              onChange={(e) => setFormField("confirmPassword", e.target.value)}
              required
              disabled={isSubmitting}
              className="h-11"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full h-12 text-base font-medium rounded-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating account...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-5 w-5" />
              {COPY.actions.create} Admin Account
            </>
          )}
        </Button>
      </motion.form>
    </motion.div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl text-center space-y-6"
    >
      {/* Success Icon */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-green-500/10 border border-green-500/20">
          <Check className="h-10 w-10 text-green-500" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-32 h-32 bg-green-500/20 rounded-full blur-2xl animate-pulse" />
        </div>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-green-500">
          All Set!
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Your admin account has been created. Sign in to start building your revision schedule.
        </p>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/50 backdrop-blur-sm border border-border rounded-xl p-6 max-w-md mx-auto text-left space-y-4"
      >
        <h3 className="text-sm font-medium text-foreground">Next steps:</h3>
        <ul className="space-y-3">
          {[
            "Sign in with your admin credentials",
            "Add your first problems or import a dataset",
            "Configure scoring weights in Settings",
            "Start your first practice session",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
              <div className="h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">{i + 1}</span>
              </div>
              {step}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Note about importing data */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-muted/30 border border-border rounded-lg p-4 max-w-md mx-auto"
      >
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="text-left space-y-1">
            <p className="text-sm font-medium text-foreground">Import problems later</p>
            <p className="text-xs text-muted-foreground">
              You can bulk import problems and patterns from {COPY.nav.settings} → Data Management after signing in.
            </p>
          </div>
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
          onClick={onFinish}
          className="h-12 px-8 text-base font-medium rounded-lg"
        >
          <LayoutDashboard className="mr-2 h-5 w-5" />
          {COPY.auth.signIn}
        </Button>
      </motion.div>
    </motion.div>
  );
}
