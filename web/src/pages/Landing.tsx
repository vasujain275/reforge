import { Button } from "@/components/ui/button";
import { COPY } from "@/lib/copy";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Calendar,
  BarChart3,
  Layers,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background relative selection:bg-primary selection:text-primary-foreground">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative z-10">
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Branding / Text */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            {isAuthenticated ? (
              <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-foreground">
                  {COPY.dashboard.welcome}, {user?.name || "User"}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-full border border-border">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Spaced repetition for DSA
                </span>
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              <span className="text-primary block mb-3">{COPY.brand.name}.</span>
              <span className="text-2xl md:text-3xl font-normal text-muted-foreground block leading-snug">
                {COPY.brand.tagline}
              </span>
            </h1>

            <p className="text-lg text-muted-foreground/80 max-w-md leading-relaxed">
              {isAuthenticated ? (
                <>
                  Your revision schedule is ready. Continue building your
                  coding interview preparation with intelligent problem
                  selection.
                </>
              ) : (
                <>
                  {COPY.brand.description}. Track your progress, identify weak
                  areas, and practice smarter.
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-medium rounded-lg"
                  >
                    {COPY.actions.goToDashboard}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="h-12 px-8 text-base font-medium rounded-lg"
                    >
                      {COPY.actions.getStarted}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 px-8 text-base font-medium rounded-lg border-2"
                    >
                      {COPY.auth.signIn}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>

          {/* Feature Cards Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative max-w-[400px] mx-auto">
              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-primary/5 rounded-3xl blur-3xl opacity-50" />
              
              <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 shadow-lg">
                <div className="grid grid-cols-2 gap-4">
                  <FeatureBox
                    icon={<Brain className="h-6 w-6 text-primary" />}
                    label="Smart Scheduling"
                    description="AI-free spaced repetition"
                  />
                  <FeatureBox
                    icon={<Calendar className="h-6 w-6 text-blue-500" />}
                    label="Daily Practice"
                    description="Consistent progress"
                  />
                  <FeatureBox
                    icon={<BarChart3 className="h-6 w-6 text-emerald-500" />}
                    label="Track Progress"
                    description="See your improvement"
                  />
                  <FeatureBox
                    icon={<Layers className="h-6 w-6 text-orange-500" />}
                    label="Pattern Mastery"
                    description="Organize by technique"
                  />
                </div>

                {/* Stats Preview */}
                <div className="mt-6 pt-6 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Problems mastered</span>
                    <span className="font-medium text-foreground">127</span>
                  </div>
                  <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "72%" }}
                      transition={{ duration: 1.2, delay: 0.5 }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Interview readiness</span>
                    <span className="font-mono">72%</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/30 py-4">
        <div className="container mx-auto px-6 flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <a
              href="#"
              className="hover:text-foreground transition-colors"
            >
              Documentation
            </a>
          </div>
          <div>{COPY.brand.name}</div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureBoxProps {
  icon: React.ReactNode;
  label: string;
  description: string;
}

function FeatureBox({ icon, label, description }: FeatureBoxProps) {
  return (
    <div className="flex flex-col p-4 bg-background/50 rounded-xl border border-border/50 hover:border-border transition-colors">
      <div className="mb-3">{icon}</div>
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground mt-0.5">{description}</span>
    </div>
  );
}
