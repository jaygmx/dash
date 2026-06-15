import * as React from "react";

const TIME_ZONE = "America/New_York";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const dateCompactFmt = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  timeZone: TIME_ZONE,
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
  timeZone: TIME_ZONE,
  timeZoneName: "short",
});

interface LiveClockProps {
  /**
   * Compact rendering — shortens the date to `DD MMM` to save horizontal room
   * when the masthead is crowded (e.g. when edit-mode adds buttons).
   */
  compact?: boolean;
}

export function LiveClock({ compact = false }: LiveClockProps) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Render nothing on the server / first paint — avoids hydration mismatch.
  if (!now) return <span className="opacity-0 select-none" aria-hidden>—</span>;

  const date = (compact ? dateCompactFmt : dateFmt).format(now).toUpperCase();
  const time = timeFmt.format(now).toUpperCase();

  return (
    <span
      className="inline-flex items-baseline gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground tabular-nums whitespace-nowrap"
      aria-live="off"
    >
      <span aria-hidden>·</span>
      <span>{date}</span>
      <span aria-hidden>·</span>
      <span className="text-foreground">{time}</span>
    </span>
  );
}
