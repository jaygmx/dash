import * as React from "react";
import { Pencil, Trash2, Star, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hostnameOf } from "@/lib/storage";
import type { Bookmark } from "@/lib/types";

interface BookmarkCardProps {
  bookmark: Bookmark;
  /** Display label of the drawer the bookmark sits in. */
  drawerLabel: string;
  canEdit: boolean;
  onEdit: (b: Bookmark) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
  const year = String(d.getFullYear()).slice(-2);
  return `${day}·${mon}·${year}`;
}

export function BookmarkCard({
  bookmark,
  drawerLabel,
  canEdit,
  onEdit,
  onDelete,
  onToggleFavorite,
}: BookmarkCardProps) {
  const host = hostnameOf(bookmark.url);
  const tilt = ((bookmark.id.charCodeAt(0) + bookmark.id.charCodeAt(1)) % 5) - 2;
  const displayTitle = bookmark.title?.trim() || host;

  const hasCover = Boolean(bookmark.cover);

  return (
    <article
      className={cn(
        "group relative isolate bg-card border border-ink/85 dark:border-ink/30",
        "flex flex-col gap-4 min-h-[220px]",
        hasCover ? "pt-0" : "pt-4",
        "px-5 pb-5",
        "lift grain clip-corner",
      )}
      style={{ ["--tilt" as any]: `${tilt * 0.12}deg` }}
    >
      {hasCover && (
        <a
          href={bookmark.url}
          target="_blank"
          rel="noreferrer noopener"
          className="relative block -mx-5 aspect-[16/9] overflow-hidden border-b border-ink/15 bg-ink/5 focus-ring"
          aria-hidden
          tabIndex={-1}
        >
          <img
            src={bookmark.cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
          <span
            className="absolute inset-0 mix-blend-multiply pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: "hsl(var(--accent) / 0.08)" }}
          />
        </a>
      )}

      {/* top row: classification + holes + favorite */}
      <header className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            № {bookmark.classification ?? "—"}
          </span>
          <span className="holes" aria-hidden>
            <span /><span /><span />
          </span>
        </div>

        {canEdit && (
          <div
            className={cn(
              "flex items-center gap-1.5 sm:gap-1 transition-opacity",
              // Touch (mobile): always visible. Pointer (sm+): hover/focus reveal.
              "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100",
            )}
          >
            <button
              onClick={() => onToggleFavorite(bookmark.id)}
              className={cn(
                "h-9 w-9 sm:h-7 sm:w-7 inline-flex items-center justify-center border border-ink/30 focus-ring transition-colors",
                bookmark.favorite ? "text-accent border-accent" : "hover:text-accent hover:border-accent",
              )}
              aria-label={bookmark.favorite ? "Unfavorite" : "Favorite"}
              aria-pressed={bookmark.favorite}
            >
              <Star className={cn("h-4 w-4 sm:h-3.5 sm:w-3.5", bookmark.favorite && "fill-accent")} />
            </button>
            <button
              onClick={() => onEdit(bookmark)}
              className="h-9 w-9 sm:h-7 sm:w-7 inline-flex items-center justify-center border border-ink/30 hover:text-accent hover:border-accent focus-ring transition-colors"
              aria-label="Edit"
            >
              <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
            <button
              onClick={() => onDelete(bookmark.id)}
              className="h-9 w-9 sm:h-7 sm:w-7 inline-flex items-center justify-center border border-ink/30 hover:text-destructive hover:border-destructive focus-ring transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* title + description */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noreferrer noopener"
        className="relative z-10 flex-1 flex flex-col gap-1.5 focus-ring -m-1 p-1"
      >
        <h3 className="font-display italic text-[2.1rem] leading-[1.02] tracking-tight text-foreground group-hover:text-accent transition-colors">
          {displayTitle}
        </h3>
        {bookmark.description && (
          <p className="font-mono text-[12px] leading-snug text-muted-foreground line-clamp-2 pr-2">
            {bookmark.description}
          </p>
        )}
      </a>

      <div className="hairline" />

      {/* footer: host + tags + filed date */}
      <footer className="relative z-10 flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2 min-w-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent hover:underline truncate inline-flex items-center gap-1.5"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{host}</span>
          </a>
          {bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bookmark.tags.slice(0, 4).map((t) => (
                <Badge key={t} variant="default" className="px-1.5 py-0.5">
                  #{t}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {bookmark.favorite && (
            <span className="stamp" aria-hidden style={{ ["--stamp-rot" as any]: `${tilt}deg` }}>
              Filed ★
            </span>
          )}
          <span className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground">
            {formatDate(bookmark.createdAt)}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
            {drawerLabel}
          </span>
        </div>
      </footer>
    </article>
  );
}
