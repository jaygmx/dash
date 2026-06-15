import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Lock } from "lucide-react";

interface EmptyStateProps {
  reason: "empty" | "no-results";
  canEdit: boolean;
  onNew: () => void;
  onReset: () => void;
}

export function EmptyState({ reason, canEdit, onNew, onReset }: EmptyStateProps) {
  return (
    <div className="border border-dashed border-ink/30 p-8 sm:p-12 flex flex-col items-center justify-center gap-4 text-center min-h-[260px] sm:min-h-[320px]">
      <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
        Drawer · empty
      </span>
      <h2 className="font-display italic text-4xl sm:text-5xl leading-none">
        {reason === "empty" ? "An unfiled drawer." : "Nothing on this card."}
      </h2>
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground max-w-md">
        {reason === "empty"
          ? canEdit
            ? "File your first card — a personal site, a tool you keep losing, a place to come back to."
            : "Nothing has been filed yet. Unlock the catalogue to add the first card."
          : "Your query returned no matches. Try a different term or clear the filter."}
      </p>
      <div className="flex items-center gap-2 mt-2">
        {reason === "empty" ? (
          <Button variant="accent" onClick={onNew}>
            {canEdit ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {canEdit ? "File first card" : "Unlock to file"}
          </Button>
        ) : (
          <Button variant="outline" onClick={onReset}>
            Reset filters
          </Button>
        )}
      </div>
    </div>
  );
}
