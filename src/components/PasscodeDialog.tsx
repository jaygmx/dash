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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestToken, saveToken } from "@/lib/cloud";

interface PasscodeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: () => void;
}

/**
 * Auto-submit when the input reaches this length. The server-side passcode is
 * 4 digits (1144) by default — if you rotate it to a different length, bump
 * this constant to match for the auto-submit affordance. The Unlock button
 * stays as a manual fallback regardless.
 */
const AUTOSUBMIT_LENGTH = 4;

export function PasscodeDialog({ open, onOpenChange, onUnlock }: PasscodeDialogProps) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  /** Inputs that have already been rejected — don't keep retrying them. */
  const tried = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (open) {
      setValue("");
      setError(null);
      setPending(false);
      tried.current = new Set();
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const attempt = React.useCallback(
    async (passcode: string) => {
      if (!passcode.trim()) {
        setError("Enter the passcode.");
        return;
      }
      if (tried.current.has(passcode)) return;
      tried.current.add(passcode);

      setPending(true);
      setError(null);
      try {
        const token = await requestToken(passcode);
        saveToken(token);
        onUnlock();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unlock.");
        setValue("");
        inputRef.current?.focus();
      } finally {
        setPending(false);
      }
    },
    [onUnlock, onOpenChange],
  );

  // Auto-submit when the user has typed the expected number of characters.
  React.useEffect(() => {
    if (!open || pending) return;
    if (value.length !== AUTOSUBMIT_LENGTH) return;
    if (tried.current.has(value)) return;
    attempt(value);
  }, [value, open, pending, attempt]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    attempt(value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogDescription>Authorisation · Dash</DialogDescription>
          <DialogTitle>Unlock edit mode</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 mt-2">
          <div className="grid gap-2">
            <Label htmlFor="passcode">Passcode</Label>
            <Input
              ref={inputRef}
              id="passcode"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={AUTOSUBMIT_LENGTH}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="••••"
              className="tracking-[0.6em] text-center text-lg"
              disabled={pending}
            />
          </div>
          {error && (
            <p className="font-mono text-[11px] text-destructive uppercase tracking-[0.16em] leading-snug">
              {error}
            </p>
          )}
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-snug">
            Edit mode unlocks cloud sync. Session auto-locks after 60 minutes.
          </p>
          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? "Verifying…" : "Unlock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
