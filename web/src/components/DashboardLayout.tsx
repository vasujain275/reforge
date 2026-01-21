import { ModeToggle } from "@/components/ModeToggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import {
  Network,
  FileText,
  Grid3x3,
  Terminal,
  Settings,
  LogOut,
  User as UserIcon,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const navItems = [
    { path: "/dashboard", label: "Console", icon: Terminal, exact: true },
    { path: "/dashboard/problems", label: "Problems", icon: Grid3x3 },
    { path: "/dashboard/sessions", label: "Sessions", icon: FileText },
    { path: "/dashboard/patterns", label: "Patterns", icon: Network },
    { path: "/dashboard/settings", label: "Config", icon: Settings },
  ];

  // Admin-only nav items
  const adminNavItems = user?.role === 'admin' ? [
    { path: "/dashboard/admin", label: "Admin", icon: ShieldAlert },
  ] : [];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    // Special case: /settings/security should NOT highlight Config
    if (path === "/dashboard/settings" && location.pathname === "/dashboard/settings/security") {
      return false;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
        {/* Logo Section */}
        <div className="h-16 p-4 border-b border-border flex items-center">
          <div className="flex items-center gap-2 font-mono text-sm">
            <Terminal className="h-4 w-4 text-primary" />
            <span className="font-bold tracking-tighter text-primary uppercase">
              Reforge
            </span>
            <span className="text-xs text-muted-foreground">v0.0.1-alpha</span>
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
          
          {/* Admin Section */}
          {adminNavItems.length > 0 && (
            <>
              <div className="pt-4 pb-2 px-3">
                <div className="h-px bg-border" />
              </div>
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
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
            </>
          )}
        </nav>

        {/* User Profile & Theme Toggle */}
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex-1 justify-start gap-2 px-2 h-10 hover:bg-accent"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      <UserIcon className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-xs font-mono font-semibold truncate w-full">
                      {user?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate w-full">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email || "user@example.com"}
                    </p>
                    {user?.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20 mt-1">
                        <ShieldAlert className="h-2.5 w-2.5" />
                        ADMIN
                      </span>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings/security" className="flex items-center w-full cursor-pointer">
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Security</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                  className="cursor-pointer text-red-500 focus:text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ModeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
