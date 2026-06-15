import * as React from "react";
import { Pencil, Trash2, Plus, X, Check, Lock as LockIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  deriveCode,
  slugify,
  validateNewDrawer,
  type Drawer,
} from "@/lib/drawers";
import { cn } from "@/lib/utils";

interface DrawersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drawers: Drawer[];
  /** Per-drawer-key bookmark counts — used to block deletes that would orphan cards. */
  counts: Record<string, number>;
  onCreate: (drawer: Drawer) => Promise<void>;
  onUpdate: (key: string, patch: { label: string; code: string }) => Promise<void>;
  onDelete: (key: string) => Promise<void>;
}

export function DrawersDialog({
  open,
  onOpenChange,
  drawers,
  counts,
  onCreate,
  onUpdate,
  onDelete,
}: DrawersDialogProps) {
  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [editLabel, setEditLabel] = React.useState("");
  const [editCode, setEditCode] = React.useState("");
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editPending, setEditPending] = React.useState(false);

  const [newLabel, setNewLabel] = React.useState("");
  const [newCode, setNewCode] = React.useState("");
  const [newCodeTouched, setNewCodeTouched] = React.useState(false);
  const [newError, setNewError] = React.useState<string | null>(null);
  const [newPending, setNewPending] = React.useState(false);

  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);
  const [rowError, setRowError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setEditingKey(null);
      setEditError(null);
      setEditPending(false);
      setNewLabel("");
      setNewCode("");
      setNewCodeTouched(false);
      setNewError(null);
      setNewPending(false);
      setConfirmDelete(null);
      setDeletePending(false);
      setRowError(null);
    }
  }, [open]);

  // Auto-derive code from new label until user touches the code field.
  React.useEffect(() => {
    if (!newCodeTouched) setNewCode(deriveCode(newLabel));
  }, [newLabel, newCodeTouched]);

  function beginEdit(d: Drawer) {
    setEditingKey(d.key);
    setEditLabel(d.label);
    setEditCode(d.code);
    setEditError(null);
    setRowError(null);
    setConfirmDelete(null);
  }

  function cancelEdit() {
    setEditingKey(null);
    setEditError(null);
  }

  async function saveEdit(original: Drawer) {
    const label = editLabel.trim();
    const code = editCode.trim().toUpperCase();
    if (!label) return setEditError("Label is required.");
    if (!/^[A-Z0-9]{2,3}$/.test(code))
      return setEditError("Code must be 2–3 letters or digits.");
    // Collision check excluding the row being edited.
    const others = drawers.filter((d) => d.key !== original.key);
    const collidesCode = others.some((d) => d.code.toUpperCase() === code);
    if (collidesCode) return setEditError(`Code "${code}" already in use.`);
    if (label === original.label && code === original.code) {
      cancelEdit();
      return;
    }
    setEditPending(true);
    setEditError(null);
    try {
      await onUpdate(original.key, { label, code });
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setEditPending(false);
    }
  }

  async function requestDelete(d: Drawer) {
    setRowError(null);
    const cardCount = counts[d.key] ?? 0;
    if (cardCount > 0) {
      setRowError(
        `Can't delete "${d.label}" — it still holds ${cardCount} card${
          cardCount === 1 ? "" : "s"
        }. Move or remove them first.`,
      );
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(d.key);
  }

  async function confirmDeleteNow(d: Drawer) {
    setDeletePending(true);
    setRowError(null);
    try {
      await onDelete(d.key);
      setConfirmDelete(null);
    } catch (err) {
      setRowError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletePending(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const candidate = { label: newLabel.trim(), code: newCode.trim().toUpperCase() };
    const err = validateNewDrawer(candidate, drawers);
    if (err) return setNewError(err);
    setNewPending(true);
    setNewError(null);
    try {
      await onCreate({
        key: slugify(candidate.label),
        label: candidate.label,
        code: candidate.code,
      });
      setNewLabel("");
      setNewCode("");
      setNewCodeTouched(false);
    } catch (err) {
      setNewError(err instanceof Error ? err.message : "Couldn't add drawer.");
    } finally {
      setNewPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogDescription>Drawers · Dash</DialogDescription>
          <DialogTitle>Manage drawers</DialogTitle>
        </DialogHeader>

        <section className="mt-4 grid gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {drawers.length} on file
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Built-ins · read-only
            </span>
          </div>
          <ul className="border border-ink/20 divide-y divide-ink/15">
            {drawers.map((d) => {
              const isEditing = editingKey === d.key;
              const cardCount = counts[d.key] ?? 0;
              return (
                <li key={d.key} className="p-2.5 flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        value={editLabel}
                        onChange={(e) => {
                          setEditLabel(e.target.value);
                          if (editError) setEditError(null);
                        }}
                        className="flex-1 h-9"
                        autoFocus
                        disabled={editPending}
                      />
                      <Input
                        value={editCode}
                        onChange={(e) => {
                          setEditCode(e.target.value.toUpperCase().slice(0, 3));
                          if (editError) setEditError(null);
                        }}
                        className="w-16 h-9 uppercase tracking-[0.2em] text-center"
                        maxLength={3}
                        disabled={editPending}
                      />
                      <button
                        onClick={() => saveEdit(d)}
                        className="h-9 w-9 inline-flex items-center justify-center border border-accent text-accent hover:bg-accent hover:text-accent-foreground focus-ring transition-colors"
                        aria-label="Save"
                        disabled={editPending}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="h-9 w-9 inline-flex items-center justify-center border border-ink/30 hover:text-foreground focus-ring transition-colors"
                        aria-label="Cancel"
                        disabled={editPending}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground tabular-nums w-10 text-center">
                        {d.code}
                      </span>
                      <span className="flex-1 truncate">{d.label}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground tabular-nums shrink-0">
                        {cardCount} {cardCount === 1 ? "card" : "cards"}
                      </span>
                      {d.builtIn ? (
                        <span
                          className="h-8 w-8 inline-flex items-center justify-center text-muted-foreground/60"
                          title="Built-in drawer — cannot be edited"
                          aria-label="Built-in"
                        >
                          <LockIcon className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => beginEdit(d)}
                            className="h-8 w-8 inline-flex items-center justify-center border border-ink/30 hover:text-accent hover:border-accent focus-ring transition-colors"
                            aria-label={`Edit ${d.label}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {confirmDelete === d.key ? (
                            <button
                              onClick={() => confirmDeleteNow(d)}
                              className="h-8 px-2 inline-flex items-center gap-1 border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground focus-ring transition-colors font-mono text-[10px] uppercase tracking-[0.18em]"
                              disabled={deletePending}
                            >
                              {deletePending ? "…" : "Confirm"}
                            </button>
                          ) : (
                            <button
                              onClick={() => requestDelete(d)}
                              className="h-8 w-8 inline-flex items-center justify-center border border-ink/30 hover:text-destructive hover:border-destructive focus-ring transition-colors"
                              aria-label={`Delete ${d.label}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          {editError && editingKey && (
            <p className="font-mono text-[11px] text-destructive uppercase tracking-[0.16em] px-1 pt-1">
              {editError}
            </p>
          )}
          {rowError && (
            <p className="font-mono text-[11px] text-destructive uppercase tracking-[0.16em] px-1 pt-1">
              {rowError}
            </p>
          )}
        </section>

        <section className="mt-5">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground pb-2">
            Add a drawer
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-[1fr_5rem_auto] gap-2 items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="new-drawer-label">Label</Label>
              <Input
                id="new-drawer-label"
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  if (newError) setNewError(null);
                }}
                placeholder="Bookshelf"
                maxLength={40}
                disabled={newPending}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-drawer-code">Code</Label>
              <Input
                id="new-drawer-code"
                value={newCode}
                onChange={(e) => {
                  setNewCodeTouched(true);
                  setNewCode(e.target.value.toUpperCase().slice(0, 3));
                  if (newError) setNewError(null);
                }}
                placeholder="BK"
                className="uppercase tracking-[0.3em] text-center"
                maxLength={3}
                disabled={newPending}
              />
            </div>
            <Button type="submit" variant="accent" disabled={newPending}>
              <Plus className={cn("h-3.5 w-3.5", newPending && "animate-spin")} />
              {newPending ? "Adding" : "Add"}
            </Button>
          </form>
          {newError && (
            <p className="font-mono text-[11px] text-destructive uppercase tracking-[0.16em] pt-2">
              {newError}
            </p>
          )}
        </section>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-snug">
          Drawer changes sync to the cloud and apply for every visitor.
        </p>
      </DialogContent>
    </Dialog>
  );
}
