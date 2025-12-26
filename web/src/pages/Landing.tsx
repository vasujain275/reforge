import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  Server,
  Shield,
  Terminal,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background relative selection:bg-primary selection:text-primary-foreground">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

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
              <div className="inline-flex items-center space-x-2 bg-primary/10 px-4 py-2 rounded-md mb-2 border border-primary/30">
                <User className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono text-primary">
                  Welcome back, {useAuthStore.getState().user?.name || "User"}
                </span>
                <span className="text-xs text-muted-foreground/50 mx-1">|</span>
                <span className="text-sm font-mono text-green-500">
                  Console Active
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center space-x-2 bg-secondary/50 px-3 py-1 rounded-md mb-2 border border-border">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
                  System Online
                </span>
                <span className="text-xs text-muted-foreground/50 mx-1">|</span>
                <span className="text-sm font-mono text-primary font-bold">
                  v0.0.1-alpha
                </span>
              </div>
            )}

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground">
              <span className="text-primary block mb-3">Reforge.</span>
              <span className="text-2xl md:text-3xl font-light text-muted-foreground block leading-snug">
                {isAuthenticated
                  ? "Your DSA Revision Command Center"
                  : "Consistent, Explainable DSA Revision"}
              </span>
            </h1>

            <p className="text-lg text-muted-foreground/80 max-w-md leading-relaxed">
              {isAuthenticated ? (
                <>
                  Your local-first revision system is ready. Continue building
                  your coding interview preparation with explainable,
                  deterministic problem selection.
                  <span className="block mt-4 text-sm font-mono text-green-500">
                    $ reforge status --verbose
                    <br />
                    <span className="text-muted-foreground/60">
                      ✔ Session active. Database synced.
                    </span>
                  </span>
                </>
              ) : (
                <>
                  Local-first tool for coding interview prep.{" "}
                  <span className="text-foreground">
                    One binary, SQLite, pure logic.
                  </span>
                  <span className="block mt-3 text-sm font-mono text-muted-foreground/60">
                    // Self-hostable. No ML. Fully explainable.
                  </span>
                </>
              )}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md hover:shadow-primary/20 hover:translate-y-[-1px]"
                  >
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button
                      size="lg"
                      className="h-12 px-8 text-base font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-md hover:shadow-primary/20 hover:translate-y-[-1px]"
                    >
                      <Terminal className="mr-2 h-4 w-4" />
                      Initialize System
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-12 px-8 text-base font-medium rounded-lg border-2 hover:bg-accent hover:text-accent-foreground transition-all"
                    >
                      Access Console
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>

          {/* Graphic / Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            {/* Abstract Illustration */}
            <div className="relative aspect-square max-w-[400px] mx-auto">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl opacity-30 animate-pulse" />
              <div className="relative bg-card/50 backdrop-blur-sm border border-border rounded-xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <FeatureBox
                    icon={<Brain className="h-8 w-8 text-primary" />}
                    label="Neural Sched"
                  />
                  <FeatureBox
                    icon={<Server className="h-8 w-8 text-blue-400" />}
                    label="Single Binary"
                  />
                  <FeatureBox
                    icon={<Shield className="h-8 w-8 text-emerald-400" />}
                    label="SQLite Only"
                  />
                  <FeatureBox
                    icon={<Terminal className="h-8 w-8 text-orange-400" />}
                    label="Local First"
                  />
                </div>
                <div className="mt-8 space-y-3">
                  <div className="h-2 w-3/4 bg-border/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "75%" }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Revision Index</span>
                    <span>98.4%</span>
                  </div>
                </div>
                {/* Decorative Code Lines */}
                <div className="mt-6 space-y-2 opacity-50 font-mono text-xs text-muted-foreground border-t border-border/50 pt-4">
                  <div>$ reforge status --verbose</div>
                  <div className="text-green-500">
                    ✔ Database mounted (SQLite)
                  </div>
                  <div className="text-green-500">
                    ✔ Spaced repetition active
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer / Status Bar Area */}
      <footer className="border-t bg-card/30 backdrop-blur-sm py-4">
        <div className="container mx-auto px-6 flex justify-between items-center text-xs font-mono text-muted-foreground">
          <div className="flex gap-4">
            <Link to="#" className="hover:text-primary transition-colors">
              Documentation
            </Link>
            <Link to="#" className="hover:text-primary transition-colors">
              GitHub
            </Link>
          </div>
          <div>Reforge v0.0.1-alpha</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureBox({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-background/50 rounded-lg border border-border/50 hover:border-primary/50 transition-colors group">
      <div className="mb-2 transform group-hover:scale-110 transition-transform duration-300">
        {icon}
      </div>
      <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
    </div>
  );
}
