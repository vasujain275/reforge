import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

// Simple subscription for SSR hydration - always returns true on client
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!mounted) {
    return <Button variant="ghost" size="icon" disabled className="opacity-0" />;
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden rounded-full hover:bg-accent hover:text-accent-foreground transition-all duration-300"
    >
      <div className={`transition-all duration-500 transform absolute ${theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`}>
         <Moon className="h-5 w-5 text-blue-400" fill="currentColor" />
      </div>
      <div className={`transition-all duration-500 transform absolute ${theme === 'light' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`}>
        <Sun className="h-5 w-5 text-orange-500" fill="currentColor" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
