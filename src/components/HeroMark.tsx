import * as React from "react";

/**
 * Animated hero for Dash. A card-catalogue scene rendered as a single SVG:
 * three index cards file up out of a drawer (staggered reveal + gentle bob),
 * a "FILED" stamp lands on the front card, punch-holes and ruled lines echo a
 * real library card, and a bold accent em-dash draws itself — the literal
 * "Dash" mark. Every fill/stroke is driven by the theme CSS variables
 * (`--paper`, `--ink`, `--accent`, `--stamp`, `--card`), so it adapts across
 * all five palettes and light/dark automatically. All motion is CSS and
 * collapses to a composed still frame under `prefers-reduced-motion`.
 */

interface HeroMarkProps {
  canEdit: boolean;
  cardCount: number;
  drawerCount: number;
}

/** One index card in local coordinates (156 × 112), with a clipped top-right
 *  corner echoing the `.clip-corner` card aesthetic. `front` adds the ruled
 *  lines, punch-holes, classification block, stamp, and the accent dash. */
function IndexCard({ front = false }: { front?: boolean }) {
  return (
    <>
      <path
        className="hm-paper"
        d="M0 4 Q0 0 4 0 H140 L156 16 V108 Q156 112 152 112 H4 Q0 112 0 108 Z"
      />
      {/* classification code block (accent) */}
      <rect className="hm-accent" x="14" y="14" width="46" height="9" rx="1" />
      {/* punch-hole row */}
      <circle className="hm-hole" cx="18" cy="36" r="2.6" />
      <circle className="hm-hole" cx="30" cy="36" r="2.6" />
      <circle className="hm-hole" cx="42" cy="36" r="2.6" />
      {front && (
        <>
          <rect className="hm-rule" x="14" y="54" width="118" height="2.4" rx="1" />
          <rect className="hm-rule" x="14" y="68" width="118" height="2.4" rx="1" />
          <rect className="hm-rule" x="14" y="82" width="78" height="2.4" rx="1" />
          {/* the Dash mark — a bold accent em-dash that draws itself */}
          <line className="hm-dash" x1="14" y1="98" x2="64" y2="98" />
          {/* FILED stamp — outer group places it, inner group animates */}
          <g transform="translate(98 70) rotate(-9)">
            <g className="hm-stamp">
              <rect className="hm-stamp-box" x="0" y="0" width="48" height="21" rx="1" />
              <text className="hm-stamp-text" x="24" y="14.5" textAnchor="middle">
                FILED
              </text>
            </g>
          </g>
        </>
      )}
    </>
  );
}

export function HeroMark({ canEdit, cardCount, drawerCount }: HeroMarkProps) {
  return (
    <section className="hm-band" aria-label="Dash — an index of elsewhere">
      <div className="container max-w-[1400px] hm-grid">
        <div className="hm-copy">
          <p className="hm-kicker font-mono">
            Vol. I · Ed. 01 · {cardCount} cards · {drawerCount} drawers
            {canEdit ? " · editing" : ""}
          </p>
          <h2 className="hm-word font-display italic">
            Dash
            <svg
              className="hm-word-dash"
              viewBox="0 0 120 12"
              fill="none"
              aria-hidden="true"
            >
              <line className="hm-dash" x1="2" y1="6" x2="118" y2="6" />
            </svg>
          </h2>
          <p className="hm-tagline font-mono">
            An index of elsewhere — links worth keeping, filed by hand and
            synced to the cloud.
          </p>
        </div>

        <div className="hm-art" aria-hidden="true">
          <svg viewBox="0 0 460 244" fill="none" role="img">
            {/* drawer shadow */}
            <ellipse className="hm-shadow" cx="230" cy="226" rx="170" ry="12" />

            {/* index cards — back to front */}
            <g transform="translate(96 86) rotate(-7)">
              <g className="hm-card hm-card-3">
                <IndexCard />
              </g>
            </g>
            <g transform="translate(168 70) rotate(3)">
              <g className="hm-card hm-card-2">
                <IndexCard />
              </g>
            </g>
            <g transform="translate(150 60) rotate(-2)">
              <g className="hm-card hm-card-1">
                <IndexCard front />
              </g>
            </g>

            {/* catalogue drawer front */}
            <g className="hm-drawer">
              <path
                className="hm-paper"
                d="M70 178 H390 Q394 178 394 182 V222 Q394 226 390 226 H70 Q66 226 66 222 V182 Q66 178 70 178 Z"
              />
              {/* label plate */}
              <rect className="hm-plate" x="96" y="190" width="86" height="24" rx="2" />
              <rect className="hm-rule" x="104" y="199" width="60" height="2.4" rx="1" />
              {/* pull knob */}
              <rect className="hm-knob" x="300" y="196" width="44" height="12" rx="6" />
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
