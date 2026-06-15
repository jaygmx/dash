import * as React from "react";
import { Plus } from "lucide-react";
import type { Drawer } from "@/lib/drawers";

export type FilterKey = string | "all" | "favorites";

interface CategoryFilterProps {
  drawers: Drawer[];
  active: FilterKey;
  counts: Record<string, number>;
  onChange: (cat: FilterKey) => void;
  canEdit: boolean;
  onAddDrawer: () => void;
}

export function CategoryFilter({
  drawers,
  active,
  counts,
  onChange,
  canEdit,
  onAddDrawer,
}: CategoryFilterProps) {
  const entries: Array<{ key: FilterKey; label: string; index: string }> = [
    { key: "all", label: "All Entries", index: "00" },
    { key: "favorites", label: "Favorites", index: "★" },
    ...drawers.map((d, i) => ({
      key: d.key,
      label: d.label,
      index: String(i + 1).padStart(2, "0"),
    })),
  ];

  return (
    <nav aria-label="Drawers" className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Drawer · 01
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {counts.all ?? 0} cards
        </span>
      </div>
      <div className="hairline" />
      <ul className="flex flex-col gap-1.5 mt-2" role="list">
        {entries.map((e) => (
          <li key={e.key}>
            <button
              onClick={() => onChange(e.key)}
              data-active={active === e.key}
              className="drawer-label w-full text-left focus-ring"
              aria-pressed={active === e.key}
            >
              <span className="font-mono text-[10px] tracking-[0.2em] tabular-nums opacity-70 w-5">
                {e.index}
              </span>
              <span className="flex-1 truncate">{e.label}</span>
              <span className="font-mono tabular-nums opacity-70">{counts[e.key] ?? 0}</span>
            </button>
          </li>
        ))}
        {canEdit && (
          <li>
            <button
              onClick={onAddDrawer}
              className="drawer-label w-full text-left focus-ring border-dashed text-accent border-accent/60 hover:border-accent"
              aria-label="Manage drawers"
            >
              <Plus className="h-3 w-3 ml-0.5" aria-hidden />
              <span className="flex-1 truncate">Manage drawers…</span>
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
