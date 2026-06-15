import * as React from "react";
import { Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeToggleProps {
  mode: "view" | "edit";
  onRequestUnlock: () => void;
  onLock: () => void;
}

export function ModeToggle({ mode, onRequestUnlock, onLock }: ModeToggleProps) {
  const isEdit = mode === "edit";
  return (
    <button
      onClick={isEdit ? onLock : onRequestUnlock}
      aria-label={isEdit ? "Lock — switch to view mode" : "Unlock — enter edit mode"}
      title={isEdit ? "Editing — click to lock" : "Read-only — click to unlock"}
      className={cn(
        "h-9 px-3 inline-flex items-center gap-2 border bg-card transition-colors focus-ring",
        "font-mono text-[10px] uppercase tracking-[0.2em]",
        isEdit
          ? "border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          : "border-ink/85 dark:border-ink/30 hover:border-accent hover:text-accent",
      )}
    >
      {isEdit ? (
        <Unlock className="h-3.5 w-3.5" />
      ) : (
        <Lock className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">{isEdit ? "Editing" : "View"}</span>
    </button>
  );
}
