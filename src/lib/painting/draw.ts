// Small, seeded drawing kit for the home painting. Everything here returns SVG
// markup strings so the whole scene can be generated once at build time.

export type Point = [number, number];

/** Deterministic PRNG (mulberry32) so every build draws the same painting. */
export function createRng(seed: number) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min: number, max: number) => min + (max - min) * next(),
    int: (min: number, max: number) => Math.floor(min + (max - min + 1) * next()),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Round to one decimal — keeps the generated markup small. */
export const n = (v: number) => Math.round(v * 10) / 10;

const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** Closed, smoothed outline through `pts` (quadratic curves between midpoints). */
export function smoothClosed(pts: Point[]): string {
  const start = mid(pts[pts.length - 1], pts[0]);
  let d = `M${n(start[0])} ${n(start[1])}`;
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length]);
    d += `Q${n(p[0])} ${n(p[1])} ${n(m[0])} ${n(m[1])}`;
  });
  return `${d}Z`;
}

/** Irregular rounded blob. `floor` flattens the bottom (bushes sitting on ground). */
export function blob(
  rng: Rng,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  { points = 9, jitter = 0.22, floor }: { points?: number; jitter?: number; floor?: number } = {},
): string {
  const start = rng.range(0, Math.PI * 2);
  const pts: Point[] = [];
  for (let i = 0; i < points; i++) {
    const a = start + (i / points) * Math.PI * 2;
    const r = 1 + rng.range(-jitter, jitter);
    const y = cy + Math.sin(a) * ry * r;
    pts.push([cx + Math.cos(a) * rx * r, floor === undefined ? y : Math.min(y, floor)]);
  }
  return smoothClosed(pts);
}

/** Hand-drawn rectangle: corners nudged a little so edges never look ruled. */
export function wobbleRect(rng: Rng, x: number, y: number, w: number, h: number, j = 1.2): string {
  const c = (px: number, py: number) => `${n(px + rng.range(-j, j))} ${n(py + rng.range(-j, j))}`;
  return `M${c(x, y)}L${c(x + w, y)}L${c(x + w, y + h)}L${c(x, y + h)}Z`;
}

export const path = (d: string, fill: string, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

export const stroke = (d: string, color: string, width: number, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;

export const circle = (cx: number, cy: number, r: number, fill: string, extra = '') =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${extra}/>`;

/** Several dots in one path — far less markup than individual circles. */
export function dots(points: [number, number, number][]): string {
  return points
    .map(
      ([x, y, r]) => `M${n(x - r)} ${n(y)}a${n(r)} ${n(r)} 0 1 0 ${n(r * 2)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-r * 2)} 0Z`,
    )
    .join('');
}

export type SwayKind = 'bush' | 'grass' | 'wheat' | 'leaf' | 'flower';

/** Wraps a plant so the wind CSS can bend it from its base. */
export const sway = (rng: Rng, kind: SwayKind, inner: string) =>
  `<g class="painting-sway painting-${kind}" style="animation-delay:-${rng.int(0, 2400)}ms">${inner}</g>`;
