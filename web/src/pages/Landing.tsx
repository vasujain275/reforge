import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Brain, Database, LineChart, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center py-24 text-center space-y-8 bg-gradient-to-b from-background to-muted/20">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="container px-4 md:px-6"
        >
          <motion.h1
            variants={itemVariants}
            className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600"
          >
            Master Algorithms with <br />
            Explainable Revision
          </motion.h1>
          <motion.p
            variants={itemVariants}
            className="mx-auto max-w-[700px] text-muted-foreground text-lg md:text-xl mb-8"
          >
            Reforge is your local-first, self-hosted companion for consistent DSA preparation.
            Smart scheduling without the black box.
          </motion.p>
          <motion.div variants={itemVariants} className="flex gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="h-12 px-8 text-lg">
                Start For Free
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-lg">
                Login
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.5 }}
             className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why Reforge?</h2>
            <p className="text-muted-foreground">Built for engineers who value ownership and clarity.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Brain className="h-10 w-10 text-primary" />}
              title="Spaced Repetition"
              description="Review problems at optimal intervals based on your confidence and performance."
            />
            <FeatureCard
              icon={<LineChart className="h-10 w-10 text-primary" />}
              title="Explainable Scoring"
              description="No AI magic. See exactly why a problem was chosen for your session."
            />
            <FeatureCard
              icon={<Database className="h-10 w-10 text-primary" />}
              title="Local First"
              description="Everything is stored in a single SQLite file. You own your data completely."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-10 w-10 text-primary" />}
              title="Offline Ready"
              description="Built as a single binary. Run it on your laptop without internet access."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow bg-card/50">
      <CardHeader className="flex flex-col items-center text-center pb-2">
        <div className="mb-4 bg-primary/10 p-3 rounded-full">{icon}</div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center text-muted-foreground">
        {description}
      </CardContent>
    </Card>
  );
}
