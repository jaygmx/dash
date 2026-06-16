/**
 * The Dash mark — a library-catalogue index card (punch-holes + the accent
 * em-dash). Drawn in `hsl(var(--…))` like HeroMark, so it tracks the active
 * palette + light/dark. Static SVG counterparts (fixed colors, dark-mode aware)
 * live at `public/favicon.svg` and `public/logo.svg`.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Dash"
      fill="none"
    >
      <rect
        x="11"
        y="13"
        width="42"
        height="38"
        fill="hsl(var(--card))"
        stroke="hsl(var(--ink))"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="22" r="2.4" fill="hsl(var(--ink))" />
      <circle cx="32" cy="22" r="2.4" fill="hsl(var(--ink))" />
      <circle cx="40" cy="22" r="2.4" fill="hsl(var(--ink))" />
      <rect x="20" y="30" width="24" height="7" fill="hsl(var(--accent))" />
      <rect x="20" y="44" width="16" height="1.6" fill="hsl(var(--ink))" opacity="0.5" />
    </svg>
  );
}
