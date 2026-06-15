import * as React from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FONT_PAIRS,
  THEMES,
  type Appearance,
  type FontKey,
  type ThemeKey,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

interface AppearanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: Appearance;
  onChange: (next: Appearance) => void;
}

export function AppearanceDialog({
  open,
  onOpenChange,
  current,
  onChange,
}: AppearanceDialogProps) {
  function pickTheme(theme: ThemeKey) {
    if (theme !== current.theme) onChange({ ...current, theme });
  }
  function pickFont(font: FontKey) {
    if (font !== current.font) onChange({ ...current, font });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogDescription>Style · Dash</DialogDescription>
          <DialogTitle>Set the look</DialogTitle>
        </DialogHeader>

        <section className="mt-4 grid gap-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Palette
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {THEMES.map((t) => {
              const active = t.key === current.theme;
              return (
                <button
                  key={t.key}
                  onClick={() => pickTheme(t.key)}
                  aria-pressed={active}
                  className={cn(
                    "group relative text-left p-2 border bg-card focus-ring transition-colors",
                    active
                      ? "border-accent"
                      : "border-ink/30 hover:border-accent",
                  )}
                  title={t.hint}
                >
                  <div
                    className="h-12 w-full border border-ink/20 relative overflow-hidden"
                    style={{ background: t.swatch.paper }}
                  >
                    <div
                      className="absolute left-1.5 top-1.5 bottom-1.5 w-3"
                      style={{ background: t.swatch.ink }}
                    />
                    <div
                      className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full"
                      style={{ background: t.swatch.accent }}
                    />
                    {active && (
                      <Check
                        className="absolute right-1 bottom-1 h-3 w-3"
                        style={{ color: t.swatch.accent }}
                      />
                    )}
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.18em] truncate">
                    {t.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Type
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FONT_PAIRS.map((f) => {
              const active = f.key === current.font;
              return (
                <button
                  key={f.key}
                  onClick={() => pickFont(f.key)}
                  aria-pressed={active}
                  className={cn(
                    "group relative text-left p-3 border bg-card focus-ring transition-colors",
                    active
                      ? "border-accent"
                      : "border-ink/30 hover:border-accent",
                  )}
                  title={f.hint}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className="text-2xl italic leading-none truncate"
                      style={{ fontFamily: f.preview.display }}
                    >
                      Aa — index
                    </span>
                    {active && (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    )}
                  </div>
                  <div
                    className="mt-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate"
                    style={{ fontFamily: f.preview.mono }}
                  >
                    {f.hint}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] truncate">
                    {f.label}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-snug">
          Changes apply instantly and sync to the cloud for every visitor.
          Light / dark stays a personal preference.
        </p>
      </DialogContent>
    </Dialog>
  );
}
