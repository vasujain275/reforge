import { ModeToggle } from "@/components/ModeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, LogOut, Menu, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  // Don't show standard navbar on auth pages if you want a clean look,
  // currently user didn't specify, but often Landing/Dashboard share layout, Auth is standalone.
  // For now I'll include it everywhere but simplify on auth pages if needed.
  // Actually, let's keep it simple: One layout for all, but maybe different content.

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans antialiased">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight">Reforge</span>
            </Link>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-4">
            <ModeToggle />
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        {/* Use user name initials or fallback */}
                        <AvatarImage src="" alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {/* Email is not in user type yet, relying on ID/Name */}
                          User ID: {user.id.slice(0, 8)}...
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard" className="flex items-center w-full cursor-pointer">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                       {/* Placeholder for Profile */}
                       <div className="flex items-center w-full cursor-pointer">
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                       </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-500 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              !isAuthPage && (
                <div className="flex items-center gap-2">
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Login</Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </div>
              )
            )}
          </nav>

           {/* Mobile Nav */}
           <div className="md:hidden">
              <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                    <div className="flex flex-col space-y-4 mt-8">
                         {user ? (
                            <>
                                <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">Dashboard</Button>
                                </Link>
                                <Button variant="ghost" className="w-full justify-start text-red-500" onClick={() => { logout(); setIsOpen(false); }}>
                                    Logout
                                </Button>
                            </>
                         ) : (
                            <>
                                <Link to="/login" onClick={() => setIsOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start">Login</Button>
                                </Link>
                                <Link to="/register" onClick={() => setIsOpen(false)}>
                                    <Button className="w-full justify-start">Get Started</Button>
                                </Link>
                            </>
                         )}
                    </div>
                </SheetContent>
              </Sheet>
           </div>

        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 md:px-8 py-6">
        {children}
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4 md:px-8">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for <strong>Reforge</strong>. Self-hosted DSA revision.
          </p>
        </div>
      </footer>
    </div>
  );
}
