import { getAppVersion } from "@/lib/version";

export default function SystemStatusBar() {
  return (
    <div className="h-16 border-b border-border bg-card/30 backdrop-blur-sm flex items-center px-6">
      <div className="flex items-center gap-4 font-mono text-sm">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-muted-foreground uppercase tracking-wider text-xs">
            System Active
          </span>
        </div>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-primary text-xs">DB: SQLite</span>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-muted-foreground text-xs">{getAppVersion()}</span>
      </div>
    </div>
  );
}
