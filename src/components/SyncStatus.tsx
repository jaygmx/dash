import * as React from "react";
import { Cloud, CloudOff, CloudUpload, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import type { SyncStatus } from "@/lib/cloud";
import { cn } from "@/lib/utils";

interface Props {
  status: SyncStatus;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function SyncStatusBadge({ status }: Props) {
  const { Icon, label, tone, spin } = (() => {
    switch (status.state) {
      case "idle":
        return { Icon: Cloud, label: "Idle", tone: "muted", spin: false };
      case "loading":
        return { Icon: Loader2, label: "Loading", tone: "muted", spin: true };
      case "saving":
        return { Icon: CloudUpload, label: "Saving", tone: "accent", spin: false };
      case "ok":
        return {
          Icon: CheckCircle2,
          label: `Synced · ${formatTime(status.at)}`,
          tone: "ok",
          spin: false,
        };
      case "offline":
        return { Icon: CloudOff, label: "Offline", tone: "muted", spin: false };
      case "error":
        return { Icon: AlertTriangle, label: status.message, tone: "error", spin: false };
    }
  })();

  return (
    <span
      title={label}
      className={cn(
        "h-9 px-2.5 inline-flex items-center gap-2 border bg-card",
        "font-mono text-[10px] uppercase tracking-[0.2em] whitespace-nowrap",
        tone === "ok" && "border-ink/30 text-foreground",
        tone === "muted" && "border-ink/30 text-muted-foreground",
        tone === "accent" && "border-accent text-accent",
        tone === "error" && "border-destructive text-destructive",
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", spin && "animate-spin")} />
      <span className="hidden lg:inline max-w-[180px] truncate">{label}</span>
    </span>
  );
}
