import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import type { Bookmark } from "@/lib/types";
import { hostnameOf, normalizeUrl } from "@/lib/storage";
import {
  CloudUnavailableError,
  fetchUrlMeta,
  loadToken,
} from "@/lib/cloud";
import type { Drawer } from "@/lib/drawers";

interface BookmarkFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: Bookmark | null;
  drawers: Drawer[];
  onSubmit: (data: Omit<Bookmark, "id" | "createdAt"> & { id?: string }) => void;
}

const MAX_TAGS = 5;
const DEFAULT_DRAWER_KEY = "personal";

function parseTagList(raw: string): string[] {
  return raw
    .split(/[,#\s]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function dedupeTags(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const t of list) {
      if (!t || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
      if (out.length >= MAX_TAGS) return out;
    }
  }
  return out;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "fetching" }
  | { kind: "saving" };

export function BookmarkForm({
  open,
  onOpenChange,
  initial,
  drawers,
  onSubmit,
}: BookmarkFormProps) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<string>(DEFAULT_DRAWER_KEY);
  const [tags, setTags] = React.useState("");
  const [favorite, setFavorite] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [submitState, setSubmitState] = React.useState<SubmitState>({ kind: "idle" });

  // Pick a sensible default category — prefer the initial value, else the
  // existing "personal" default, else the first drawer in the list.
  const fallbackKey =
    drawers.find((d) => d.key === DEFAULT_DRAWER_KEY)?.key ?? drawers[0]?.key ?? DEFAULT_DRAWER_KEY;

  React.useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setUrl(initial?.url ?? "");
      setDescription(initial?.description ?? "");
      setCategory(initial?.category ?? fallbackKey);
      setTags(initial?.tags.join(", ") ?? "");
      setFavorite(initial?.favorite ?? false);
      setError(null);
      setNotice(null);
      setSubmitState({ kind: "idle" });
    }
  }, [open, initial, fallbackKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const normalized = normalizeUrl(url);
    try {
      new URL(normalized);
    } catch {
      return setError("Enter a valid URL.");
    }

    let finalTitle = title.trim();
    let finalDescription = description.trim();
    let finalTags = parseTagList(tags);
    let finalCover: string | undefined = initial?.cover;
    let warning: string | null = null;

    // Auto-fill from URL meta when both title and description are blank.
    const shouldAutoFill = !finalTitle && !finalDescription;
    if (shouldAutoFill) {
      const tok = loadToken();
      if (!tok) {
        return setError("Unlock edit mode before auto-filling from URL.");
      }
      setSubmitState({ kind: "fetching" });
      setError(null);
      try {
        const meta = await fetchUrlMeta(normalized, tok.token);
        finalTitle = meta.title.trim() || hostnameOf(normalized);
        finalDescription = meta.description.trim();
        finalTags = dedupeTags(finalTags, meta.tags);
        if (meta.cover) finalCover = meta.cover;
      } catch (err) {
        finalTitle = hostnameOf(normalized);
        warning =
          err instanceof CloudUnavailableError
            ? "Couldn't reach the meta fetcher — saved with hostname as title."
            : `Meta fetch failed: ${err instanceof Error ? err.message : "unknown"} — saved with hostname.`;
      }
    }

    // Final fallback if user left title blank but description was filled.
    if (!finalTitle) finalTitle = hostnameOf(normalized);

    // Always enforce MAX_TAGS so manual entries can't exceed the cap either.
    finalTags = dedupeTags(finalTags);

    setSubmitState({ kind: "saving" });
    try {
      onSubmit({
        id: initial?.id,
        title: finalTitle,
        url: normalized,
        description: finalDescription || undefined,
        category,
        tags: finalTags,
        favorite,
        cover: finalCover || undefined,
        classification: initial?.classification,
        preset: initial?.preset,
      });
      if (warning) {
        // Surface to the user via the small notice line and pause-close so
        // they see it before the dialog vanishes.
        setNotice(warning);
        setSubmitState({ kind: "idle" });
        return;
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
      setSubmitState({ kind: "idle" });
    }
  }

  const submitLabel =
    submitState.kind === "fetching" ? "Fetching…" :
    submitState.kind === "saving"   ? "Saving…"   :
    initial                          ? "Save changes" : "File card";

  const submitting = submitState.kind !== "idle";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogDescription>
            {initial ? "Edit entry · Dash" : "New entry · Dash"}
          </DialogDescription>
          <DialogTitle>
            {initial ? "Revise the card" : "File a new card"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="pudding.cool"
              inputMode="url"
              autoFocus={!initial}
              required
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">
              Title · optional (auto-filled from URL meta when blank)
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Pudding"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="category">Drawer</Label>
              <Select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={submitting}
              >
                {drawers.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags · up to {MAX_TAGS}, comma-separated</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="data, essay"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description · optional</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short note for your future self."
              rows={6}
              disabled={submitting}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={favorite}
              onChange={(e) => setFavorite(e.target.checked)}
              className="h-3.5 w-3.5 accent-[hsl(var(--accent))]"
              disabled={submitting}
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
              Mark as favorite
            </span>
          </label>

          {error && (
            <p className="font-mono text-[11px] text-destructive uppercase tracking-[0.16em] leading-snug">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="font-mono text-[11px] text-accent uppercase tracking-[0.16em] leading-snug">
              {notice}
            </p>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              {notice ? "Close" : "Cancel"}
            </Button>
            <Button type="submit" variant="accent" disabled={submitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
