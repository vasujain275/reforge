import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Shield,
  Terminal,
  UserCog,
} from "lucide-react";
import { Link } from "react-router-dom";
import { getAppVersion } from "@/lib/version";

export default function ForgotPasswordPage() {
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
                {getAppVersion()}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Need to reset your
              <span className="text-primary block">password?</span>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Reforge is a self-hosted application. Password resets are handled
              by your system administrator to ensure security.
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Why Contact Admin?</span>
            </div>
            <ul className="font-mono text-sm space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                Self-hosted means no external email servers
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                Direct verification by your admin is more secure
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                No third-party services involved in reset process
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Right Side - Info Card */}
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
                  {getAppVersion()}
                </p>
              </div>
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <UserCog className="h-10 w-10 text-primary" />
              </div>
            </div>

            {/* Header */}
            <div className="space-y-2 text-center mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Contact Your Administrator
              </h2>
              <p className="text-sm text-muted-foreground">
                To reset your password, please reach out to your system
                administrator
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Contact your admin
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Let them know you need a password reset
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Receive reset link
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Admin will generate a secure reset link for you
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Set new password
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the link to create your new password
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Options (placeholders) */}
            <div className="flex gap-3 mb-6">
              <div className="flex-1 p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
                <Mail className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Email Admin</p>
              </div>
              <div className="flex-1 p-3 rounded-lg bg-muted/20 border border-border/50 text-center">
                <MessageSquare className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Message Admin</p>
              </div>
            </div>

            {/* Back Button */}
            <Link to="/login">
              <Button
                variant="outline"
                className="w-full h-11 text-sm font-medium"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </div>

          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center mt-6"
          >
            <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border rounded-full px-4 py-2">
              <Shield className="h-3 w-3 text-primary" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Secure Process
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
