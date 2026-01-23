/**
 * Timer utility functions for consistent time formatting and display.
 * Used by session timers, problem timers, and attempt timers.
 */

/**
 * Format seconds as MM:SS or HH:MM:SS (if hours > 0)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds as human-readable elapsed time (e.g., "5m 30s")
 */
export function formatElapsedTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Calculate time since a given date as a human-readable string
 */
export function getTimeSinceLastSave(lastSaveTime: Date | null): string {
  if (!lastSaveTime) return "Never";
  const seconds = Math.floor((Date.now() - lastSaveTime.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

/**
 * Get Tailwind CSS classes for difficulty badge colors.
 * Follows STYLE-GUIDE.md status color conventions.
 */
export function getDifficultyColor(difficulty?: string): string {
  switch (difficulty) {
    case "easy":
      return "text-green-500 border-green-500/20 bg-green-500/10";
    case "medium":
      return "text-orange-400 border-orange-400/20 bg-orange-400/10";
    case "hard":
      return "text-red-500 border-red-500/20 bg-red-500/10";
    default:
      return "text-muted-foreground border-border bg-muted/50";
  }
}

/**
 * Get simple text color class for difficulty (no background/border)
 */
export function getDifficultyTextColor(difficulty?: string): string {
  switch (difficulty) {
    case "easy":
      return "text-green-500";
    case "medium":
      return "text-orange-400";
    case "hard":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}
