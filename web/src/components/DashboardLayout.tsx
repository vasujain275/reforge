import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Network,
  FileText,
  Grid3x3,
  Terminal,
  Plus,
  Settings,
  Zap,
} from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

export default function DashboardLayout() {
  const location = useLocation();

  const navItems = [
    { path: "/dashboard", label: "Console", icon: Terminal, exact: true },
    { path: "/dashboard/problems", label: "Problems", icon: Grid3x3 },
    { path: "/dashboard/sessions", label: "Sessions", icon: FileText },
    { path: "/dashboard/patterns", label: "Patterns", icon: Network },
    { path: "/dashboard/settings", label: "Config", icon: Settings },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
        {/* Logo Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 font-mono text-sm">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-bold tracking-tighter text-primary uppercase">
              Reforge
            </span>
            <span className="text-xs text-muted-foreground">v0.1.0</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.exact);
            return (
              <Link key={item.path} to={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all font-mono",
                    active
                      ? "bg-primary/10 text-primary font-medium border border-primary/20 shadow-[0_0_15px_-3px_var(--primary)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent hover:border hover:border-border"
                  )}
                >
                  {active && (
                    <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  )}
                  <Icon className="h-4 w-4" />
                  <span className="uppercase tracking-wider text-xs">
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="p-4 border-t border-border space-y-2 bg-muted/20">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
            Quick Actions
          </p>
          <Link to="/dashboard/problems/new">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 text-xs font-mono rounded-md border-border hover:border-primary/50 hover:shadow-[0_0_10px_-3px_var(--primary)] transition-all"
            >
              <Plus className="h-3 w-3" />
              <span className="uppercase tracking-wider">Add Problem</span>
            </Button>
          </Link>
          <Link to="/dashboard/sessions/new">
            <Button
              size="sm"
              className="w-full justify-start gap-2 text-xs font-mono bg-primary hover:bg-primary/90 rounded-md shadow-[0_0_15px_-3px_var(--primary)] hover:shadow-[0_0_20px_-3px_var(--primary)] transition-all"
            >
              <Zap className="h-3 w-3" />
              <span className="uppercase tracking-wider">Start Session</span>
            </Button>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
