"use client";

import { useEffect, useRef } from "react";

/**
 * Animated particle background for the login page — ported from the Jaunt
 * login (../jaunt). Behavior:
 *   - Picks ONE mode at random on every mount: cobweb | canvas | polygon |
 *     square | circle.
 *   - Pulls colors from the active Dash theme's CSS vars (HSL triplets, wrapped
 *     in `hsl(...)`), shuffling a random 3–5 subset each load so the palette
 *     varies per visit and tracks the current palette + light/dark.
 *   - Proximity links (cobweb / polygon), edge-wrap, DPR-aware canvas.
 *   - `square` mode runs deliberately slow; under prefers-reduced-motion every
 *     mode drops to ~8% speed (a near-static field).
 */

type Mode = "cobweb" | "canvas" | "polygon" | "square" | "circle";
const MODES: Mode[] = ["cobweb", "canvas", "polygon", "square", "circle"];

// Dash palette vars are bare HSL triplets (e.g. `11 80% 50%`), consumed as
// `hsl(var(--x))`. We read them and wrap in hsl() for the canvas.
const THEME_VARS = [
  "--accent",
  "--stamp",
  "--ring",
  "--ink",
  "--ink-soft",
  "--ink-faint",
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readPalette(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const colors = THEME_VARS.map((v) => {
    const raw = styles.getPropertyValue(v).trim();
    return raw ? `hsl(${raw})` : "";
  }).filter(Boolean);
  const base = colors.length ? colors : ["#888888"];
  // Keep a random 3–5 of the available colors so the palette varies per load.
  return shuffle(base).slice(0, Math.max(3, Math.min(5, base.length)));
}

interface ModeConfig {
  count: number;
  speed: number;
  links: boolean;
  linkDist: number;
  shape: "dot" | "ring" | "square" | "polygon";
  sizeMin: number;
  sizeMax: number;
}

function configFor(mode: Mode, area: number): ModeConfig {
  const density = Math.round(area / 16000);
  const base = Math.max(28, Math.min(110, density));
  switch (mode) {
    case "cobweb":
      return { count: base, speed: 0.65, links: true, linkDist: 140, shape: "dot", sizeMin: 1.5, sizeMax: 3 };
    case "canvas":
      return { count: Math.round(base * 1.2), speed: 0.85, links: false, linkDist: 0, shape: "dot", sizeMin: 1.5, sizeMax: 4 };
    case "polygon":
      return { count: Math.round(base * 0.8), speed: 0.7, links: true, linkDist: 150, shape: "polygon", sizeMin: 4, sizeMax: 8 };
    case "square":
      return { count: Math.round(base * 0.7), speed: 0.32, links: false, linkDist: 0, shape: "square", sizeMin: 5, sizeMax: 12 };
    case "circle":
      return { count: Math.round(base * 0.8), speed: 0.75, links: false, linkDist: 0, shape: "ring", sizeMin: 4, sizeMax: 11 };
  }
}

export default function ParticleField({ mode }: { mode?: Mode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const chosen: Mode = mode ?? pick(MODES);
    let palette = readPalette();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let cfg = configFor(chosen, window.innerWidth * window.innerHeight);

    function rand(min: number, max: number) {
      return min + Math.random() * (max - min);
    }

    function spawn(): Particle {
      const speed = cfg.speed * (reduced ? 0.08 : 1);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: rand(-speed, speed),
        vy: rand(-speed, speed),
        size: rand(cfg.sizeMin, cfg.sizeMax),
        color: pick(palette),
        angle: Math.random() * Math.PI * 2,
        spin: rand(-0.01, 0.01) * (chosen === "square" ? 0.5 : 1),
      };
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cfg = configFor(chosen, width * height);
      palette = readPalette();
      particles = Array.from({ length: cfg.count }, spawn);
    }

    function drawShape(p: Particle) {
      ctx!.fillStyle = p.color;
      ctx!.strokeStyle = p.color;
      if (cfg.shape === "dot") {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
        return;
      }
      ctx!.save();
      ctx!.translate(p.x, p.y);
      ctx!.rotate(p.angle);
      if (cfg.shape === "ring") {
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx!.stroke();
      } else if (cfg.shape === "square") {
        ctx!.lineWidth = 1.5;
        ctx!.strokeRect(-p.size, -p.size, p.size * 2, p.size * 2);
      } else if (cfg.shape === "polygon") {
        const sides = 3;
        ctx!.beginPath();
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          const x = Math.cos(a) * p.size;
          const y = Math.sin(a) * p.size;
          if (i === 0) ctx!.moveTo(x, y);
          else ctx!.lineTo(x, y);
        }
        ctx!.closePath();
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }
      ctx!.restore();
    }

    function drawLinks() {
      if (!cfg.links) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < cfg.linkDist) {
            const alpha = (1 - dist / cfg.linkDist) * 0.5;
            ctx!.strokeStyle = a.color;
            ctx!.globalAlpha = alpha;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }
      ctx!.globalAlpha = 1;
    }

    let raf = 0;
    function frame() {
      ctx!.clearRect(0, 0, width, height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;
        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        else if (p.y > height + 20) p.y = -20;
      }
      drawLinks();
      ctx!.globalAlpha = 0.85;
      for (const p of particles) drawShape(p);
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
