import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  resultCount: number;
}

export function SearchBar({ value, onChange, onClear, inputRef, resultCount }: SearchBarProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5",
        "border border-ink/85 dark:border-ink/30 bg-card",
        "focus-within:border-accent transition-colors",
      )}
    >
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-focus-within:text-accent" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Query the catalogue…"
        className="flex-1 min-w-0 bg-transparent font-mono text-base sm:text-sm focus:outline-none placeholder:text-muted-foreground/80"
        aria-label="Search bookmarks"
      />
      <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums shrink-0">
        {resultCount} {resultCount === 1 ? "result" : "results"}
      </span>
      <span className="sm:hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums shrink-0">
        {resultCount}
      </span>
      {value && (
        <button
          onClick={onClear}
          className="text-muted-foreground hover:text-accent focus-ring shrink-0"
          aria-label="Clear search"
        >
          <X className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </button>
      )}
      <kbd className="hidden md:inline-flex items-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground border border-ink/30 px-1.5 py-0.5 shrink-0">
        /
      </kbd>
    </div>
  );
}
