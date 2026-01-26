import { Input } from "@/components/ui/input";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCallback, useRef } from "react";

interface SearchInputProps {
  /** Current input value (use localSearchQuery from usePagination) */
  value: string;
  /** Change handler (use setLocalSearchQuery from usePagination) */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show loading spinner (use isFetching from TanStack Query) */
  isFetching?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Additional className for the input */
  inputClassName?: string;
}

/**
 * Reusable search input component with:
 * - Search icon on the left
 * - Clear button (X) when there's input
 * - Loading spinner during fetch
 * - Escape key to clear search
 * - Consistent styling across pages
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  isFetching = false,
  className,
  inputClassName,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = useCallback(() => {
    onChange("");
    // Keep focus on input after clearing
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape" && value) {
        e.preventDefault();
        handleClear();
      }
    },
    [value, handleClear]
  );

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("pl-9 pr-10 rounded-md font-mono", inputClassName)}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
        {isFetching ? (
          <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-sm hover:bg-muted transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
