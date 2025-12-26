import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Code2, Database, LineChart, ShieldCheck, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 -z-10 bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background opacity-50 dark:opacity-30" />
        <AnimatedGrid />
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-24 md:py-32 text-center space-y-8 container relative z-10 px-4">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5 }}
           className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary backdrop-blur-sm"
        >
           <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
           v1.0.0 Now Self-Hostable
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-5xl font-extrabold tracking-tight lg:text-7xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary via-orange-400 to-amber-500 pb-2"
        >
          Forge Your <br className="hidden md:block"/>
          <span className="text-foreground">Engineering Mind.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mx-auto max-w-[800px] text-muted-foreground text-lg md:text-2xl leading-relaxed"
        >
          The local-first, privacy-focused spaced repetition system for high-performance engineers.
          <span className="text-foreground font-medium"> No cloud. No subscriptions. Just logic.</span>
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto"
        >
          <Link to="/register">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_30px_-5px_var(--color-primary)] hover:shadow-[0_0_50px_-10px_var(--color-primary)] transition-all duration-300 w-full sm:w-auto">
              Initialize System <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="https://github.com/vasujain275/reforge" target="_blank">
            <Button variant="outline" size="lg" className="h-14 px-8 text-lg rounded-full border-primary/20 hover:bg-primary/5 w-full sm:w-auto">
              <Code2 className="ml-2 h-5 w-5 mr-2" /> View Source
            </Button>
          </Link>
        </motion.div>

        {/* Floating Abstract Visual */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 opacity-30 pointer-events-none">
            {/* Can add a huge SVG glow here if needed, but the radial gradient above helps */}
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
         <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ModernFeatureCard
                    icon={<Brain className="h-8 w-8 text-primary" />}
                    title="Neural Spaced Repetition"
                    description="Optimized scheduling algorithm that adapts to your confidence levels and retention decay."
                    delay={0.1}
                />
                <ModernFeatureCard
                    icon={<LineChart className="h-8 w-8 text-primary" />}
                    title="Deterministic Scoring"
                    description="Full explainability. Inspect the exact weight of every variable driving your revision queue."
                    delay={0.2}
                />
                <ModernFeatureCard
                    icon={<Database className="h-8 w-8 text-primary" />}
                    title="Local SQLite Core"
                    description="Your data lives in a single file on your machine. Zero latency, instant queries, easy backups."
                    delay={0.3}
                />
                 <ModernFeatureCard
                    icon={<ShieldCheck className="h-8 w-8 text-primary" />}
                    title="Privacy First"
                    description="Self-hosted by design. No telemetry, no third-party tracking. You own the binary."
                    delay={0.4}
                />
                 <ModernFeatureCard
                    icon={<Zap className="h-8 w-8 text-primary" />}
                    title="Single Binary"
                    description="Deploy anywhere. Docker, bare metal, or Raspberry Pi. Extremely low resource footprint."
                    delay={0.5}
                />
                 <ModernFeatureCard
                    icon={<Code2 className="h-8 w-8 text-primary" />}
                    title="Open Architecture"
                    description="Built with Go and React. Extendable, hackable, and designed for longevity."
                    delay={0.6}
                />
            </div>
         </div>
      </section>
    </div>
  );
}

function ModernFeatureCard({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string, delay: number }) {
  return (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
    >
        <Card className="h-full bg-card/10 backdrop-blur-md border border-white/5 dark:border-white/5 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_-10px_var(--color-primary)] group overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <CardHeader>
            <div className="mb-4 inline-block p-3 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <CardTitle className="text-xl font-bold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground relative z-10">
            {description}
        </CardContent>
        </Card>
    </motion.div>
  );
}

function AnimatedGrid() {
    return (
        <svg className="absolute inset-0 w-full h-full [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none opacity-20 dark:opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
    )
}
