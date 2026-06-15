import * as React from "react";
import { Plus } from "lucide-react";
import type { Drawer } from "@/lib/drawers";
import { cn } from "@/lib/utils";

type FilterKey = string | "all" | "favorites";

interface MobileFiltersProps {
  drawers: Drawer[];
  active: FilterKey;
  counts: Record<string, number>;
  onChange: (k: FilterKey) => void;
  tags: Array<[string, number]>;
  tagFilter: string | null;
  onTagToggle: (tag: string | null) => void;
  canEdit: boolean;
  onAddDrawer: () => void;
}

/**
 * Mobile-only filter bar. Renders the drawer list + popular tags as a pair
 * of compact, horizontally-scrolling chip rows that replace the desktop
 * sidebar on small screens.
 */
export function MobileFilters({
  drawers,
  active,
  counts,
  onChange,
  tags,
  tagFilter,
  onTagToggle,
  canEdit,
  onAddDrawer,
}: MobileFiltersProps) {
  const entries: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "favorites", label: "★ Favorites" },
    ...drawers.map((d) => ({ key: d.key, label: d.label })),
  ];

  return (
    <div className="lg:hidden flex flex-col gap-3">
      <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {entries.map((e) => {
          const isActive = active === e.key;
          return (
            <button
              key={e.key}
              onClick={() => onChange(e.key)}
              aria-pressed={isActive}
              className={cn(
                "shrink-0 h-9 px-3 inline-flex items-center gap-1.5 border bg-card font-mono text-[10px] uppercase tracking-[0.18em] transition-colors focus-ring",
                isActive
                  ? "border-ink bg-ink text-paper"
                  : "border-ink/30 hover:border-accent hover:text-accent",
              )}
            >
              <span className="whitespace-nowrap">{e.label}</span>
              <span
                className={cn(
                  "tabular-nums",
                  isActive ? "opacity-70" : "opacity-50",
                )}
              >
                {counts[e.key] ?? 0}
              </span>
            </button>
          );
        })}
        {canEdit && (
          <button
            onClick={onAddDrawer}
            aria-label="Manage drawers"
            className="shrink-0 h-9 px-3 inline-flex items-center gap-1.5 border border-dashed border-accent/60 bg-card font-mono text-[10px] uppercase tracking-[0.18em] text-accent hover:border-accent transition-colors focus-ring"
          >
            <Plus className="h-3 w-3" />
            <span className="whitespace-nowrap">Drawers</span>
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground pr-1">
            Cross-Refs
          </span>
          {tags.slice(0, 12).map(([tag, count]) => {
            const isActive = tag === tagFilter;
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(isActive ? null : tag)}
                aria-pressed={isActive}
                className={cn(
                  "shrink-0 h-8 px-2.5 inline-flex items-center gap-1 border bg-card font-mono text-[10px] uppercase tracking-[0.15em] transition-colors focus-ring",
                  isActive
                    ? "border-accent text-accent"
                    : "border-ink/30 hover:border-accent hover:text-accent",
                )}
              >
                <span>#{tag}</span>
                <span className="opacity-60 tabular-nums">{count}</span>
              </button>
            );
          })}
          {tagFilter && (
            <button
              onClick={() => onTagToggle(null)}
              className="shrink-0 h-8 px-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent hover:underline focus-ring"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
