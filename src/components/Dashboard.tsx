"use client";

import * as React from "react";
import { Plus, Keyboard, Palette, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { HeroMark } from "./HeroMark";
import { LogoMark } from "./LogoMark";
import { BookmarkCard } from "./BookmarkCard";
import { BookmarkForm } from "./BookmarkForm";
import { SearchBar } from "./SearchBar";
import { CategoryFilter } from "./CategoryFilter";
import { ThemeToggle } from "./ThemeToggle";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { EmptyState } from "./EmptyState";
import { LiveClock } from "./LiveClock";
import { SyncStatusBadge } from "./SyncStatus";
import { AppearanceDialog } from "./AppearanceDialog";
import { MobileFilters } from "./MobileFilters";
import { DrawersDialog } from "./DrawersDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  loadBookmarks,
  saveBookmarks,
  uid,
  generateClassification,
  withPresets,
} from "@/lib/storage";
import {
  CloudUnauthorizedError,
  CloudUnavailableError,
  fetchCloudAppearance,
  fetchCloudBookmarks,
  fetchCloudDrawers,
  pushCloudAppearance,
  pushCloudBookmarks,
  pushCloudDrawers,
  type SyncStatus,
} from "@/lib/cloud";
import {
  applyAppearance,
  DEFAULT_APPEARANCE,
  FONT_PAIRS,
  loadAppearanceLocal,
  saveAppearanceLocal,
  type Appearance,
} from "@/lib/appearance";
import {
  DEFAULT_DRAWERS,
  drawerCode,
  drawerLabel,
  loadDrawersLocal,
  saveDrawersLocal,
  type Drawer,
} from "@/lib/drawers";
import type { Bookmark } from "@/lib/types";

type FilterKey = string | "all" | "favorites";

const PUSH_DEBOUNCE_MS = 800;

export function Dashboard() {
  const [bookmarks, setBookmarks] = React.useState<Bookmark[]>([]);
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [editing, setEditing] = React.useState<Bookmark | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>({ state: "idle" });
  const [tagFilter, setTagFilter] = React.useState<string | null>(null);
  const [appearance, setAppearance] = React.useState<Appearance>(DEFAULT_APPEARANCE);
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);
  const [drawers, setDrawers] = React.useState<Drawer[]>(DEFAULT_DRAWERS);
  const [drawersOpen, setDrawersOpen] = React.useState(false);

  const searchRef = React.useRef<HTMLInputElement>(null);
  const hydrated = React.useRef(false);
  /** Serialised snapshot of the last list that matches cloud (or local fallback). */
  const lastSynced = React.useRef<string>("");

  // initial hydration: try cloud, fall back to local cache
  React.useEffect(() => {
    let cancelled = false;
    setSyncStatus({ state: "loading" });

    // appearance: apply local cache immediately, then refresh from cloud
    const cachedAppearance = loadAppearanceLocal();
    setAppearance(cachedAppearance);
    applyAppearance(cachedAppearance);
    fetchCloudAppearance()
      .then((cloudA) => {
        if (cancelled) return;
        if (
          cloudA.theme !== cachedAppearance.theme ||
          cloudA.font !== cachedAppearance.font
        ) {
          setAppearance(cloudA);
          applyAppearance(cloudA);
          saveAppearanceLocal(cloudA);
        }
      })
      .catch(() => {
        /* offline / unavailable — keep the local cache */
      });

    // drawers: same pattern — local cache up front, refresh from cloud.
    const cachedDrawers = loadDrawersLocal();
    setDrawers(cachedDrawers);
    fetchCloudDrawers()
      .then((cloudD) => {
        if (cancelled) return;
        setDrawers(cloudD);
        saveDrawersLocal(cloudD);
      })
      .catch(() => {
        /* offline / unavailable — keep the local cache */
      });

    fetchCloudBookmarks()
      .then((res) => {
        if (cancelled) return;
        const merged = withPresets(res.bookmarks);
        const serialized = JSON.stringify(merged);
        lastSynced.current = serialized;
        setBookmarks(merged);
        saveBookmarks(merged);
        setSyncStatus({ state: "ok", at: Date.now() });
      })
      .catch((err) => {
        if (cancelled) return;
        const local = loadBookmarks();
        lastSynced.current = JSON.stringify(local);
        setBookmarks(local);
        if (err instanceof CloudUnavailableError) {
          setSyncStatus({ state: "offline" });
        } else {
          setSyncStatus({
            state: "error",
            message: err instanceof Error ? err.message : "Sync failed",
          });
        }
      })
      .finally(() => {
        if (!cancelled) hydrated.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Session lapsed mid-action → send the owner back through the login wall. */
  function redirectToLogin() {
    window.location.assign("/login");
  }

  // Mirror to local cache on every change, and debounce-push to cloud when
  // in edit mode with a valid token.
  React.useEffect(() => {
    if (!hydrated.current) return;
    saveBookmarks(bookmarks);

    const serialized = JSON.stringify(bookmarks);
    if (serialized === lastSynced.current) return;

    setSyncStatus({ state: "saving" });
    const timer = window.setTimeout(async () => {
      try {
        await pushCloudBookmarks(bookmarks);
        lastSynced.current = serialized;
        setSyncStatus({ state: "ok", at: Date.now() });
      } catch (err) {
        if (err instanceof CloudUnauthorizedError) {
          redirectToLogin();
        } else if (err instanceof CloudUnavailableError) {
          setSyncStatus({ state: "offline" });
        } else {
          setSyncStatus({
            state: "error",
            message: err instanceof Error ? err.message : "Save failed",
          });
        }
      }
    }, PUSH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [bookmarks]);

  // The whole site is behind the login wall, so an owner is always present.
  const canEdit = true;

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(b: Bookmark) {
    if (!canEdit) return;
    setEditing(b);
    setFormOpen(true);
  }

  function handleDelete(id: string) {
    if (!canEdit) return;
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }

  function handleToggleFavorite(id: string) {
    if (!canEdit) return;
    setBookmarks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, favorite: !b.favorite } : b)),
    );
  }

  function handleSubmit(data: Omit<Bookmark, "id" | "createdAt"> & { id?: string }) {
    if (data.id) {
      setBookmarks((prev) =>
        prev.map((b) =>
          b.id === data.id
            ? {
                ...b,
                ...data,
                id: b.id,
                createdAt: b.createdAt,
                classification:
                  data.classification ??
                  generateClassification(drawerCode(drawers, data.category), b.id),
              }
            : b,
        ),
      );
    } else {
      const id = uid();
      const fresh: Bookmark = {
        id,
        title: data.title,
        url: data.url,
        description: data.description,
        category: data.category,
        tags: data.tags,
        favorite: data.favorite,
        classification: generateClassification(drawerCode(drawers, data.category), id),
        createdAt: Date.now(),
      };
      setBookmarks((prev) => [fresh, ...prev]);
    }
  }

  /** Push a new drawers array to the cloud with optimistic local update +
   *  rollback on failure. Shared by add / update / delete. */
  async function commitDrawers(next: Drawer[]): Promise<void> {
    const prev = drawers;
    setDrawers(next);
    saveDrawersLocal(next);
    try {
      await pushCloudDrawers(next);
    } catch (err) {
      setDrawers(prev);
      saveDrawersLocal(prev);
      if (err instanceof CloudUnauthorizedError) {
        redirectToLogin();
        throw new Error("Session expired — signing in again.");
      }
      throw err;
    }
  }

  async function handleAddDrawer(d: Drawer): Promise<void> {
    await commitDrawers([...drawers, d]);
  }

  async function handleUpdateDrawer(
    key: string,
    patch: { label: string; code: string },
  ): Promise<void> {
    const next = drawers.map((d) =>
      d.key === key ? { ...d, label: patch.label, code: patch.code } : d,
    );
    await commitDrawers(next);
  }

  async function handleDeleteDrawer(key: string): Promise<void> {
    const target = drawers.find((d) => d.key === key);
    if (target?.builtIn) throw new Error("Built-in drawers can't be removed.");
    // Defensive: if a card still references the drawer, refuse here too
    // (the dialog also enforces this, but the server doesn't know about cards).
    const inUse = bookmarks.some((b) => b.category === key);
    if (inUse) throw new Error("Move or delete the cards in this drawer first.");
    await commitDrawers(drawers.filter((d) => d.key !== key));
    // If the user was viewing the removed drawer, fall back to "all".
    if (filter === key) setFilter("all");
  }

  async function handleAppearanceChange(next: Appearance) {
    // Optimistic: apply + cache locally, then push to cloud.
    setAppearance(next);
    applyAppearance(next);
    saveAppearanceLocal(next);
    try {
      await pushCloudAppearance(next);
    } catch (err) {
      if (err instanceof CloudUnauthorizedError) {
        redirectToLogin();
      } else if (err instanceof CloudUnavailableError) {
        setSyncStatus({ state: "offline" });
      } else {
        setSyncStatus({
          state: "error",
          message: err instanceof Error ? err.message : "Style save failed",
        });
      }
    }
  }

  // keyboard shortcuts
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (isTyping) return;

      switch (e.key) {
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "n":
        case "N":
          e.preventDefault();
          openNew();
          break;
        case "?":
          e.preventDefault();
          setHelpOpen(true);
          break;
        case "f":
        case "F":
          e.preventDefault();
          setFilter((f) => (f === "favorites" ? "all" : "favorites"));
          break;
        case "0":
          setFilter("all");
          break;
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          const idx = parseInt(e.key, 10) - 1;
          const d = drawers[idx];
          if (d) setFilter(d.key);
          break;
        }
        case "t":
        case "T":
          e.preventDefault();
          document.documentElement.classList.toggle("dark");
          try {
            const isDark = document.documentElement.classList.contains("dark");
            window.localStorage.setItem(
              "jay.portal.theme.v1",
              isDark ? "dark" : "light",
            );
          } catch {}
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [drawers]);

  // counts per drawer (plus `all` and `favorites`)
  const counts = React.useMemo(() => {
    const acc: Record<string, number> = {
      all: bookmarks.length,
      favorites: bookmarks.filter((b) => b.favorite).length,
    };
    for (const d of drawers) acc[d.key] = 0;
    for (const b of bookmarks) {
      acc[b.category] = (acc[b.category] ?? 0) + 1;
    }
    return acc;
  }, [bookmarks, drawers]);

  // filtered + searched
  const visible = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookmarks.filter((b) => {
      if (filter === "favorites" && !b.favorite) return false;
      if (filter !== "all" && filter !== "favorites" && b.category !== filter)
        return false;
      if (tagFilter && !b.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        (b.title ?? "").toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q) ||
        b.tags.some((t) => t.includes(q)) ||
        b.category.includes(q)
      );
    });
  }, [bookmarks, filter, query, tagFilter]);

  const currentFontHint =
    FONT_PAIRS.find((f) => f.key === appearance.font)?.hint ??
    "Instrument Serif · JetBrains Mono";

  // popular tags (top 8)
  const popularTags = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags) map.set(t, (map.get(t) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [bookmarks]);

  return (
    <div className="min-h-screen pb-16">
      {/* Masthead */}
      <header
        className={cn(
          "border-b bg-paper/80 backdrop-blur-sm sticky top-0 z-30 transition-colors",
          canEdit ? "border-accent" : "border-ink/85 dark:border-ink/30",
        )}
      >
        <div className="container max-w-[1400px] flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
          <div className="flex items-baseline gap-3 min-w-0">
            <LogoMark className="h-6 w-6 sm:h-7 sm:w-7 shrink-0 self-center" />
            <span
              className={cn(
                "font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground whitespace-nowrap",
                canEdit ? "hidden 2xl:inline" : "hidden lg:inline",
              )}
            >
              Vol. I · Ed. 01
            </span>
            <span className="font-display italic text-[1.6rem] sm:text-3xl leading-none whitespace-nowrap">
              Dash
            </span>
            {/* Desktop clock — inline with title on md+ */}
            <span className="hidden md:inline">
              <LiveClock compact={canEdit} />
            </span>
          </div>

          {/* Right cluster — ml-auto keeps it right-flush wherever it wraps to. */}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <SyncStatusBadge status={syncStatus} />
            <button
              onClick={() => setHelpOpen(true)}
              className="h-9 px-3 hidden md:inline-flex items-center gap-2 border border-ink/85 dark:border-ink/30 bg-card hover:text-accent hover:border-accent focus-ring transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
            >
              <Keyboard className="h-3.5 w-3.5" /> Shortcuts
            </button>
            {canEdit && (
              <button
                onClick={() => setAppearanceOpen(true)}
                className="h-9 px-3 inline-flex items-center gap-2 border border-accent text-accent bg-card hover:bg-accent hover:text-accent-foreground focus-ring transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
                title="Dash style — palette & type"
                aria-label="Dash style"
              >
                <Palette className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Style</span>
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="h-9 px-3 inline-flex items-center gap-2 border border-ink/85 dark:border-ink/30 bg-card hover:text-accent hover:border-accent focus-ring transition-colors font-mono text-[10px] uppercase tracking-[0.2em]"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <ThemeToggle />
            {canEdit && (
              <Button
                variant="accent"
                onClick={openNew}
                className="px-3 sm:px-4"
                aria-label="File a new card"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New entry</span>
              </Button>
            )}
          </div>

          {/* Mobile clock row — forced to its own line below md */}
          <div className="md:hidden basis-full -mt-0.5">
            <LiveClock compact={canEdit} />
          </div>
        </div>
        {/* Ticker */}
        <div className="border-t border-ink/15 overflow-hidden h-7">
          <div className="marquee-track animate-ticker py-1.5">
            {Array.from({ length: 2 }).map((_, i) => (
              <span
                key={i}
                className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground"
              >
                {`${counts.all} cards on record · ${counts.favorites} favorites · ${drawers.length} drawers in service · Dash · a personal index of the open web · ${canEdit ? "Editing — cloud sync live" : "Read-only mode"} · Press ? for shortcuts · `.repeat(2)}
              </span>
            ))}
          </div>
        </div>
      </header>

      <HeroMark canEdit={canEdit} cardCount={counts.all} drawerCount={drawers.length} />

      <main className="container max-w-[1400px] grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8 mt-5 sm:mt-8">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col gap-6">
          <CategoryFilter
            drawers={drawers}
            active={filter}
            counts={counts}
            onChange={setFilter}
            canEdit={canEdit}
            onAddDrawer={() => setDrawersOpen(true)}
          />

          {popularTags.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Cross-Refs
                </span>
                {tagFilter && (
                  <button
                    onClick={() => setTagFilter(null)}
                    className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="hairline" />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {popularTags.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                    className="focus-ring"
                  >
                    <Badge
                      variant={tag === tagFilter ? "accent" : "default"}
                      className="cursor-pointer hover:border-accent hover:text-accent"
                    >
                      #{tag} <span className="ml-1 opacity-60">{count}</span>
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground px-1">
              Imprint
            </span>
            <div className="hairline" />
            <p className="font-mono text-[11px] leading-relaxed text-muted-foreground mt-2 px-1">
              Dash — links worth keeping, filed by hand and synced to the
              cloud. A private catalogue; sign out from the masthead.
            </p>
          </div>
        </aside>

        {/* Content */}
        <section className="flex flex-col gap-5">
          <MobileFilters
            drawers={drawers}
            active={filter}
            counts={counts}
            onChange={setFilter}
            tags={popularTags}
            tagFilter={tagFilter}
            onTagToggle={setTagFilter}
            canEdit={canEdit}
            onAddDrawer={() => setDrawersOpen(true)}
          />
          <SearchBar
            value={query}
            onChange={setQuery}
            onClear={() => setQuery("")}
            inputRef={searchRef}
            resultCount={visible.length}
          />

          <div className="flex items-baseline justify-between gap-4">
            <h1 className="font-display italic text-[clamp(1.9rem,5vw,4.4rem)] leading-[0.95] tracking-tight">
              {filter === "all" && !tagFilter ? (
                <>An index of <span className="text-accent">elsewhere</span>.</>
              ) : filter === "favorites" ? (
                <>Cards I keep close.</>
              ) : tagFilter ? (
                <>Filed under <span className="text-accent">#{tagFilter}</span></>
              ) : (
                <>Drawer · {drawerLabel(drawers, filter)}</>
              )}
            </h1>
            <span className="hidden md:inline font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground shrink-0">
              {canEdit ? "Editing" : "Read-only"} · {counts.all} cards
            </span>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              reason={bookmarks.length === 0 ? "empty" : "no-results"}
              canEdit={canEdit}
              onNew={openNew}
              onReset={() => { setQuery(""); setFilter("all"); setTagFilter(null); }}
            />
          ) : (
            <div
              data-stagger
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5"
            >
              {visible.map((b) => (
                <BookmarkCard
                  key={b.id}
                  bookmark={b}
                  drawerLabel={drawerLabel(drawers, b.category)}
                  canEdit={canEdit}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Colophon */}
          <footer className="mt-16 pt-6 border-t border-ink/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              End of catalogue ·{" "}
              {canEdit
                ? <>Press <kbd className="border border-ink/30 px-1">N</kbd> to file another card</>
                : <>Unlock the catalogue to file new cards</>}
            </span>
            <span className="font-display italic text-xl">
              — set in {currentFontHint}.
            </span>
          </footer>
        </section>
      </main>

      <BookmarkForm
        open={formOpen && canEdit}
        onOpenChange={setFormOpen}
        initial={editing}
        drawers={drawers}
        onSubmit={handleSubmit}
      />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      <AppearanceDialog
        open={appearanceOpen && canEdit}
        onOpenChange={setAppearanceOpen}
        current={appearance}
        onChange={handleAppearanceChange}
      />
      <DrawersDialog
        open={drawersOpen && canEdit}
        onOpenChange={setDrawersOpen}
        drawers={drawers}
        counts={counts}
        onCreate={handleAddDrawer}
        onUpdate={handleUpdateDrawer}
        onDelete={handleDeleteDrawer}
      />
    </div>
  );
}
