import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROWS: Array<[string, string]> = [
  ["/  or  ⌘ K", "Focus the catalogue search"],
  ["N", "File a new card (edit mode)"],
  ["F", "Filter by favorites"],
  ["1 – 9", "Jump to a drawer (in the order they're listed)"],
  ["0", "Show all entries"],
  ["T", "Toggle theme"],
  ["?", "Open this card"],
  ["Esc", "Close any dialog"],
];

export function ShortcutsHelp({ open, onOpenChange }: ShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogDescription>Reference card · 005.4</DialogDescription>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="mt-4 divide-y divide-ink/15">
          {ROWS.map(([keys, label]) => (
            <li key={keys} className="flex items-center justify-between gap-4 py-2.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {label}
              </span>
              <kbd className="font-mono text-[11px] tracking-[0.14em] border border-ink/30 px-2 py-0.5">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
