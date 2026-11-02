// The home painting: Seoul on top (Namsan, N Seoul Tower, Lotte World Tower,
// the Han river), a hometown village below, then a rice field in front.
// Coordinates live in an 816×1488 canvas, drawn back to front.

import { blob, circle, createRng, dots, n, path, stroke, sway, wobbleRect, type Point, type Rng } from './draw';

export const PAINTING_VIEWBOX = '0 0 816 1488';

const C = {
  cream: '#faf5e8',
  paper: '#fbf8f0',
  navy: '#1f3355',
  red: '#e0402f',
  green: '#4f8d39',
  greenDark: '#2f6b25',
  greenLight: '#6aa84f',
  river: '#3f7fca',
  trunk: '#6b3d2a',
};

// Bush / canopy colours: [fill, vein, highlight].
const FOLIAGE = {
  red: ['#e8222a', '#fbe4e4', '#ffd9d9'],
  yellow: ['#f6ba2c', '#e0521b', '#fcebb8'],
  green: ['#548d32', '#11480f', '#c4d898'],
  olive: ['#a8b93e', '#2a5a19', '#eef0c4'],
  pink: ['#fb8ca5', '#fde9ee', '#fff4f6'],
  dark: ['#0f4d1a', '#022a08', '#8fb07e'],
  teal: ['#0bb19b', '#0a6b47', '#b4eadf'],
} as const;
type Foliage = keyof typeof FOLIAGE;

const BUILDING_COLORS = [
  ['#fbf8f0', '#2a4675'],
  ['#f3e3b5', '#2a4675'],
  ['#e9b949', '#7a4a12'],
  ['#2f7f86', '#cfeff0'],
  ['#4f8fc9', '#e3f0fb'],
  ['#1f3355', '#f6d77a'],
  ['#e8836b', '#fff1e6'],
  ['#f6f2ea', '#3a6fb0'],
] as const;

/* ── Shared pieces ────────────────────────────────────────────── */

/** A bush sitting on `groundY`, with vein strokes fanning from its base and highlight dots. */
function bush(rng: Rng, cx: number, groundY: number, w: number, h: number, kind: Foliage): string {
  const [fill, vein, light] = FOLIAGE[kind];
  const body = blob(rng, cx, groundY - h * 0.45, w / 2, h * 0.6, {
    points: rng.int(8, 11),
    jitter: 0.24,
    floor: groundY,
  });
  const veins = Array.from({ length: rng.int(2, 4) }, () => {
    const tx = cx + rng.range(-w * 0.35, w * 0.35);
    const ty = groundY - h * rng.range(0.55, 0.85);
    return `M${n(cx)} ${n(groundY - 2)}Q${n((cx + tx) / 2 + rng.range(-6, 6))} ${n((groundY + ty) / 2)} ${n(tx)} ${n(ty)}`;
  }).join('');
  const highlights = Array.from({ length: rng.int(3, 7) }, (): [number, number, number] => [
    cx + rng.range(-w * 0.38, w * 0.38),
    groundY - h * rng.range(0.2, 0.8),
    rng.range(0.6, 1.4),
  ]);
  return sway(
    rng,
    'bush',
    path(body, fill) + stroke(veins, vein, 1.4) + path(dots(highlights), light, ' opacity="0.75"'),
  );
}

/** A tree: tapered trunk and a canopy of overlapping blobs. */
function tree(rng: Rng, cx: number, groundY: number, size: number, kind: Foliage | 'blossom' | 'maple'): string {
  const palette =
    kind === 'blossom'
      ? ['#f5a7c2', '#e57fa3', '#fde3ec']
      : kind === 'maple'
        ? ['#e2532d', '#b13a1c', '#fbc7a8']
        : FOLIAGE[kind];
  const [fill, shade, light] = palette;
  const top = groundY - size * 1.15;
  const trunk = `M${n(cx - size * 0.07)} ${n(groundY)}L${n(cx - size * 0.03)} ${n(top + size * 0.35)}L${n(cx + size * 0.03)} ${n(top + size * 0.35)}L${n(cx + size * 0.07)} ${n(groundY)}Z`;
  const branches = `M${n(cx)} ${n(top + size * 0.5)}l${n(-size * 0.22)} ${n(-size * 0.2)}M${n(cx)} ${n(top + size * 0.55)}l${n(size * 0.25)} ${n(-size * 0.18)}`;
  const canopy = Array.from({ length: 3 }, (_, i) =>
    blob(
      rng,
      cx + (i - 1) * size * 0.3,
      top + size * 0.25 + rng.range(-size * 0.08, size * 0.08),
      size * 0.36,
      size * 0.3,
      {
        points: 8,
        jitter: 0.2,
      },
    ),
  ).join('');
  const crown = blob(rng, cx, top + size * 0.08, size * 0.4, size * 0.3, { points: 8, jitter: 0.2 });
  const speckle = Array.from({ length: Math.round(size / 3) }, (): [number, number, number] => [
    cx + rng.range(-size * 0.55, size * 0.55),
    top + rng.range(-size * 0.1, size * 0.5),
    rng.range(0.8, 1.8),
  ]);
  const shadeDots = Array.from({ length: Math.round(size / 5) }, (): [number, number, number] => [
    cx + rng.range(-size * 0.5, size * 0.5),
    top + rng.range(0.1, 0.55) * size,
    rng.range(1, 2.4),
  ]);
  return sway(
    rng,
    'bush',
    path(trunk, C.trunk) +
      stroke(branches, C.trunk, 2.2) +
      path(canopy + crown, fill) +
      path(dots(shadeDots), shade, ' opacity="0.8"') +
      path(dots(speckle), light, ' opacity="0.85"'),
  );
}

/** Building with a window pattern. */
function building(rng: Rng, x: number, baseY: number, w: number, h: number): string {
  const [wall, win] = rng.pick(BUILDING_COLORS);
  const y = baseY - h;
  let out = path(wobbleRect(rng, x, y, w, h, 0.8), wall);
  const style = rng.pick(['dots', 'grid', 'bands'] as const);
  if (style === 'bands') {
    let d = '';
    for (let yy = y + 8; yy < baseY - 6; yy += 9) d += `M${n(x + 4)} ${n(yy)}H${n(x + w - 4)}`;
    out += stroke(d, win, 2.4, ' opacity="0.85"');
  } else {
    const cols = Math.max(2, Math.floor((w - 6) / 7));
    const gap = (w - 6) / cols;
    const pts: [number, number, number][] = [];
    for (let yy = y + 8; yy < baseY - 5; yy += style === 'grid' ? 9 : 7) {
      for (let c = 0; c < cols; c++) pts.push([x + 3 + gap * (c + 0.5), yy, style === 'grid' ? 1.7 : 1.15]);
    }
    if (style === 'grid') {
      out += path(
        pts.map(([px, py]) => `M${n(px - 1.8)} ${n(py - 2.4)}h3.6v4.8h-3.6Z`).join(''),
        win,
        ' opacity="0.85"',
      );
    } else out += path(dots(pts), win, ' opacity="0.85"');
  }
  if (rng.chance(0.3)) out += path(wobbleRect(rng, x + w * 0.25, y - 6, w * 0.5, 6, 0.4), wall);
  return out;
}

/** Cream outline + body cloud built from overlapping circles. */
function cloud(rng: Rng, cx: number, cy: number, w: number): string {
  // Puffs sit on a flat base: each puff's bottom touches `cy`, bigger ones in the middle.
  const puffs: [number, number, number][] = [];
  const count = Math.max(3, Math.round(w / 40));
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const edge = Math.sin(t * Math.PI);
    const r = rng.range(14, 20) + edge * w * rng.range(0.1, 0.15);
    const x = cx - w / 2 + 12 + t * (w - 24);
    puffs.push([x, cy - r + 4, r]);
  }
  // Same (counter-clockwise) winding as the puffs so overlaps fill instead of punching holes.
  const base = `M${n(cx - w / 2)} ${n(cy - 8)}V${n(cy + 4)}Q${n(cx)} ${n(cy + 12)} ${n(cx + w / 2)} ${n(cy + 4)}V${n(cy - 8)}Z`;
  const shape = dots(puffs) + base;
  const shade = stroke(
    `M${n(cx - w * 0.36)} ${n(cy - 2)}Q${n(cx)} ${n(cy + 5)} ${n(cx + w * 0.36)} ${n(cy - 2)}`,
    '#e7dfcd',
    2.4,
  );
  return path(shape, '#ffffff', ' stroke="#ffffff" stroke-width="7"') + path(shape, C.cream) + shade;
}

/* ── Layers ───────────────────────────────────────────────────── */

function sky(rng: Rng): string {
  const wind = Array.from({ length: 80 }, () => {
    const x = rng.range(-40, 816);
    const y = rng.range(0, 1180);
    const len = rng.range(24, 70);
    return `M${n(x)} ${n(y)}l${n(len)} ${n(-len * 0.28)}`;
  }).join('');
  return (
    `<defs><linearGradient id="painting-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5d9ddb"/><stop offset="0.55" stop-color="#86b9e6"/><stop offset="1" stop-color="#a9cdee"/></linearGradient></defs>` +
    `<rect width="816" height="1488" fill="url(#painting-sky)"/>` +
    stroke(wind, '#ffffff', 1.6, ' opacity="0.35"')
  );
}

function clouds(rng: Rng): string {
  return [
    cloud(rng, 150, 240, 230),
    cloud(rng, 600, 150, 260),
    cloud(rng, 520, 380, 170),
    cloud(rng, 120, 905, 210),
    cloud(rng, 650, 890, 240),
  ].join('');
}

/** Namsan hill outline height at x (approximates the drawn curve). */
const namsanTop = (x: number) => 452 + ((x - 230) / 245) ** 2 * 230;

function seoul(rng: Rng): string {
  let out = '';

  // Office towers behind Lotte World Tower.
  for (let x = 440; x < 830;) {
    const w = rng.range(34, 58);
    if (x < 640 || x > 730) out += building(rng, x, 705, w, rng.range(110, 230));
    x += w + rng.range(-4, 6);
  }

  // Lotte World Tower: a tall tapering glass spire.
  const lotte = `M650 705C652 560 670 380 689 262C690 254 692 254 693 262C712 380 730 560 732 705Z`;
  const mullions = [0.25, 0.42, 0.58, 0.75]
    .map(
      (t) =>
        `M${n(650 + 82 * t)} 702C${n(655 + 72 * t)} 560 ${n(675 + 32 * t)} 400 691 ${n(270 + Math.abs(t - 0.5) * 40)}`,
    )
    .join('');
  out += path(lotte, '#d6e8f7') + stroke(mullions, '#86b0dc', 1.4) + stroke(lotte, '#2f5e9e', 2);
  out += stroke('M691 262V236', '#2f5e9e', 2) + stroke('M672 420H710M664 520H718', '#2f5e9e', 1.2, ' opacity="0.6"');

  // Lower buildings in front of the tower base.
  for (let x = 430; x < 830;) {
    const w = rng.range(30, 52);
    out += building(rng, x, 712, w, rng.range(45, 95));
    x += w + rng.range(2, 10);
  }

  // Namsan with its forest texture.
  out += path('M-20 712C40 640 120 470 230 452C330 438 420 560 480 650L480 712Z', C.green);
  const forest: [number, number, number][] = [];
  const forestLight: [number, number, number][] = [];
  for (let i = 0; i < 170; i++) {
    const x = rng.range(-10, 470);
    const y = rng.range(namsanTop(x) + 6, 712);
    (rng.chance(0.55) ? forest : forestLight).push([x, y, rng.range(2, 5)]);
  }
  out += path(dots(forest), C.greenDark, ' opacity="0.7"') + path(dots(forestLight), C.greenLight, ' opacity="0.8"');
  for (let i = 0; i < 7; i++) {
    const x = rng.range(40, 430);
    out += path(blob(rng, x, namsanTop(x) + rng.range(20, 60), rng.range(10, 18), rng.range(7, 11)), '#f5a7c2');
  }

  // Transmission tower (red lattice) and N Seoul Tower on the summit.
  const lattice =
    'M128 488L140 404L152 488M131 466L149 466M134 444L146 444M137 424L143 424M131 466L146 444M149 466L134 444M134 444L143 424M146 444L137 424M140 404V384';
  out += stroke(lattice, '#d9483b', 1.8);
  out += path(wobbleRect(rng, 224, 360, 12, 96, 0.4), '#f2efe6') + stroke('M224 360V456M236 360V456', '#c9c2b2', 1);
  out += path('M212 346Q212 334 230 334Q248 334 248 346L248 356Q248 364 230 364Q212 364 212 356Z', '#f6f2ea');
  out += path('M212 347H248V353H212Z', '#2d4d7a') + path('M220 322H240V334H220Z', '#f2efe6');
  let mast = '';
  for (let i = 0; i < 6; i++)
    mast += path(`M227.6 ${n(322 - (i + 1) * 15)}H232.4V${n(322 - i * 15)}H227.6Z`, i % 2 ? '#f6f2ea' : '#d9483b');
  out += mast + stroke('M230 232V206', '#d9483b', 1.4);

  // Apartment blocks at the foot of the hill.
  for (let x = -12; x < 420;) {
    const w = rng.range(30, 52);
    out += building(rng, x, 716, w, rng.range(48, 96));
    x += w + rng.range(3, 12);
  }

  // Han river with a red bridge.
  out += path('M330 712Q560 704 840 708L840 772Q560 778 330 772Z', C.river);
  const ripples = Array.from({ length: 34 }, () => {
    const x = rng.range(350, 816);
    const y = rng.range(722, 768);
    return `M${n(x)} ${n(y)}h${n(rng.range(8, 20))}`;
  }).join('');
  out += stroke(ripples, '#cfe3f7', 1.6, ' opacity="0.8"');
  let piers = '';
  let arches = '';
  for (let x = 410; x < 830; x += 70) {
    piers += `M${x} 726h9v44h-9Z`;
    arches += `M${x + 9} 732Q${x + 39} 752 ${x + 70} 732`;
  }
  out += path(piers, '#efe6d2') + stroke(arches, '#d9483b', 3.4);
  out += path('M392 720H840V730H392Z', '#d9483b') + stroke('M392 718H840', '#a8322a', 1.6);

  // Paper rim under the band, then trees and bushes along the bank.
  out += path(
    'M-20 790Q120 800 260 794Q420 788 560 796Q700 802 840 792L840 806Q600 816 400 810Q180 804 -20 812Z',
    C.cream,
  );
  out += path('M-20 712L360 712Q330 760 360 800L-20 800Z', '#5f9b3e');
  for (const [x, size, kind] of [
    [30, 70, 'blossom'],
    [120, 60, 'green'],
    [205, 74, 'blossom'],
    [300, 58, 'yellow'],
  ] as const) {
    out += tree(rng, x + rng.range(-8, 8), 796, size, kind);
  }
  const bankKinds: Foliage[] = ['red', 'pink', 'green', 'yellow', 'olive', 'red', 'dark', 'pink'];
  for (let x = -10; x < 830; x += rng.range(34, 52)) {
    out += bush(rng, x, 798, rng.range(36, 64), rng.range(22, 40), rng.pick(bankKinds));
  }
  return out;
}

function hometown(rng: Rng): string {
  let out = '';

  // Two mountain ridges with forest dots.
  out += path('M-20 1000Q90 900 210 930Q330 880 470 925Q610 890 700 930Q770 900 840 920L840 1100L-20 1100Z', '#7aa95a');
  out += path('M-20 1040Q120 960 260 990Q420 950 560 995Q700 960 840 985L840 1110L-20 1110Z', C.green);
  const ridgeDots: [number, number, number][] = Array.from({ length: 120 }, () => [
    rng.range(-10, 830),
    rng.range(1000, 1090),
    rng.range(2, 4.5),
  ]);
  out += path(dots(ridgeDots), C.greenDark, ' opacity="0.45"');

  // Trees behind the village.
  for (const [x, size, kind] of [
    [40, 66, 'yellow'],
    [395, 62, 'blossom'],
    [560, 70, 'yellow'],
    [745, 64, 'maple'],
  ] as const) {
    out += tree(rng, x, 1092, size, kind);
  }

  // Low-rise block behind the houses.
  out += building(rng, 430, 1090, 120, 74);

  // Water tower.
  out += stroke(
    'M622 1094L638 978M678 1094L662 978M628 1050H672M632 1012H668M628 1050L668 1012M672 1050L632 1012',
    C.navy,
    2.6,
  );
  out += path('M626 978H674V936H626Z', '#f2e8d5') + path('M626 946H674V954H626Z', '#d9483b');
  out += path('M622 938L650 914L678 938Z', '#d9483b') + stroke('M650 914V904', C.navy, 1.6);

  // Utility pole with sagging wires.
  out +=
    stroke('M772 1100V954M760 966H784', '#5a3b2a', 3) +
    stroke('M760 966Q620 990 470 972M784 966Q800 972 840 970', '#3b2a22', 1, ' opacity="0.7"');

  // Village ground.
  out += path('M-20 1090Q200 1078 420 1088Q620 1096 840 1084L840 1240L-20 1240Z', '#86b34f');

  // Hanok: stone wall, wooden posts, white walls, and a curved giwa roof.
  out += path(wobbleRect(rng, 96, 1022, 210, 62, 0.6), '#f7f1e3');
  let posts = '';
  for (const x of [100, 152, 204, 256, 298]) posts += `M${x} 1020h7v66h-7Z`;
  out += path(posts, '#7a4a2b');
  let lattice = '';
  for (const x of [114, 166, 218, 266]) {
    lattice += `M${x} 1034h30v34h-30Z`;
  }
  out += path(lattice, '#c99a64') + stroke(lattice.replace(/h30v34h-30Z/g, 'm15 0v34m-15 -17h30'), '#7a4a2b', 1.1);
  out += path('M58 1016Q112 1032 182 1028Q252 1032 326 1014L304 990Q182 962 82 990Z', '#24324f');
  let tiles = '';
  for (let x = 90; x < 300; x += 9)
    tiles += `M${x} ${n(1024 - Math.abs(x - 190) * 0.05)}L${n(x + 4)} ${n(990 - Math.abs(x - 190) * 0.12)}`;
  out += stroke(tiles, '#4a5f88', 1.2) + stroke('M110 986Q190 958 276 986', '#141d33', 4);
  out += stroke('M58 1016Q112 1032 182 1028Q252 1032 326 1014', '#f7f1e3', 1.6);
  out += path(wobbleRect(rng, 200, 1070, 190, 34, 0.6), '#efe3c6');
  const stones: [number, number, number][] = Array.from({ length: 26 }, () => [
    rng.range(206, 384),
    rng.range(1076, 1100),
    rng.range(2.4, 4.2),
  ]);
  out += path(dots(stones), '#cdbf9f') + path('M196 1066H394V1072H196Z', C.navy);

  // Houses with red and blue roofs.
  const roofs = ['#d9483b', '#3a6fb0', '#e8836b', '#d9483b'];
  [430, 520, 600, 690].forEach((x, i) => {
    const w = rng.range(64, 82);
    const h = rng.range(36, 48);
    const base = 1108;
    out += path(wobbleRect(rng, x, base - h, w, h, 0.6), rng.pick(['#fbf8f0', '#f8f3e6', '#f3e3b5']));
    out += path(
      `M${x - 6} ${base - h + 2}L${n(x + w * 0.18)} ${base - h - 18}H${n(x + w * 0.82)}L${x + w + 6} ${base - h + 2}Z`,
      roofs[i],
    );
    out += path(`M${x + 10} ${base - h + 12}h10v10h-10ZM${n(x + w - 22)} ${base - h + 12}h10v10h-10Z`, C.navy);
    out += path(`M${n(x + w / 2 - 6)} ${base - 18}h12v18h-12Z`, '#3a6fb0');
  });

  // Village path and front trees.
  out += path('M600 1110Q590 1130 610 1150Q630 1170 600 1200L640 1200Q665 1170 642 1146Q625 1128 640 1110Z', '#efe1bf');
  for (const [x, size, kind] of [
    [24, 56, 'blossom'],
    [340, 50, 'green'],
    [500, 48, 'maple'],
    [800, 58, 'blossom'],
  ] as const) {
    out += tree(rng, x, 1124, size, kind);
  }
  const yardKinds: Foliage[] = ['red', 'pink', 'yellow', 'green', 'teal'];
  for (let x = 380; x < 830; x += rng.range(46, 70)) {
    out += bush(rng, x, 1120, rng.range(30, 46), rng.range(18, 30), rng.pick(yardKinds));
  }
  return out;
}

function fields(rng: Rng): string {
  let out = '';
  const hill = 'M-20 1190Q200 1110 430 1146Q640 1176 840 1126L840 1400L-20 1400Z';
  out += `<clipPath id="painting-hill"><path d="${hill}"/></clipPath>` + path(hill, '#80a03f');
  let light = '';
  let dark = '';
  for (let row = 0; row < 26; row++) {
    for (let x = -60; x < 840; x += rng.range(70, 140)) {
      const y = 1110 + row * 11 + (x / 840) * 40 + rng.range(-3, 3);
      const len = rng.range(40, 110);
      const seg = `M${n(x)} ${n(y)}q${n(len / 2)} ${n(len * 0.14)} ${n(len)} ${n(len * 0.24)}`;
      if (rng.chance(0.5)) light += seg;
      else dark += seg;
    }
  }
  out += `<g clip-path="url(#painting-hill)">${stroke(light, '#a9b64e', 3, ' opacity="0.75"')}${stroke(dark, '#3a6722', 2)}</g>`;

  // Golden rice field.
  out +=
    `<defs><linearGradient id="painting-field" x1="0" y1="1240" x2="0" y2="1488" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f6c84c"/><stop offset="0.3" stop-color="#d9c048"/><stop offset="1" stop-color="#8fae43"/></linearGradient></defs>` +
    path('M-20 1300Q120 1262 300 1268Q520 1276 660 1252Q760 1236 840 1240L840 1500L-20 1500Z', 'url(#painting-field)');
  const texture = Array.from({ length: 160 }, () => {
    const x = rng.range(-10, 826);
    const y = rng.range(1290, 1488);
    return `M${n(x)} ${n(y)}l${n(rng.range(-2, 2))} ${n(-rng.range(10, 26))}`;
  }).join('');
  out += stroke(texture, '#cfcb62', 1.8, ' opacity="0.5"');
  return out;
}

/* ── Foreground plants ────────────────────────────────────────── */

function grassClump(rng: Rng, bx: number, by: number, height: number): string {
  const greens = ['#3c9444', '#6cb351', '#5f963f', '#b3bf52'];
  let out = '';
  for (let i = 0; i < rng.int(8, 14); i++) {
    const w = rng.range(1.8, 3.4);
    const x = bx + rng.range(-14, 14);
    const tx = x + rng.range(-height * 0.4, height * 0.4);
    const ty = by - height * rng.range(0.55, 1);
    const cx = (x + tx) / 2 + rng.range(-8, 8);
    const cy = (by + ty) / 2;
    out += path(
      `M${n(x - w)} ${n(by)}Q${n(cx)} ${n(cy)} ${n(tx)} ${n(ty)}Q${n(cx + w)} ${n(cy)} ${n(x + w)} ${n(by)}Z`,
      rng.pick(greens),
    );
  }
  return sway(rng, 'grass', out);
}

function riceStalk(rng: Rng, bx: number, by: number, tx: number, ty: number): string {
  const dir = rng.chance(0.5) ? 1 : -1;
  const stem = `M${n(bx)} ${n(by)}Q${n((bx + tx) / 2 + rng.range(-10, 10))} ${n((by + ty) / 2)} ${n(tx)} ${n(ty)}`;
  const len = rng.range(70, 110);
  const ctrl: Point = [tx + dir * len * 0.55, ty - 18];
  const end: Point = [tx + dir * len, ty + len * 0.55];
  const at = (t: number): Point => [
    (1 - t) ** 2 * tx + 2 * (1 - t) * t * ctrl[0] + t * t * end[0],
    (1 - t) ** 2 * ty + 2 * (1 - t) * t * ctrl[1] + t * t * end[1],
  ];
  let grains = '';
  let ticks = '';
  for (let t = 0.06; t <= 1; t += 0.06) {
    const [x, y] = at(t);
    const [x2, y2] = at(Math.min(1, t + 0.01));
    const angle = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
    const size = 1 - t * 0.35;
    for (const side of [-1, 1]) {
      const a = angle + side * 32;
      const r = (a * Math.PI) / 180;
      const gx = x + Math.cos(r) * 5 * size;
      const gy = y + Math.sin(r) * 5 * size;
      grains += `<ellipse cx="${n(gx)}" cy="${n(gy)}" rx="${n(7.5 * size)}" ry="${n(3.6 * size)}" transform="rotate(${n(a)} ${n(gx)} ${n(gy)})"/>`;
      ticks += `M${n(gx)} ${n(gy)}l${n(Math.cos(r) * 4 * size)} ${n(Math.sin(r) * 4 * size)}`;
    }
  }
  const leaf = `M${n(bx)} ${n(by - 30)}Q${n(bx + dir * 30)} ${n(by - 90)} ${n(bx + dir * 46)} ${n(by - 150)}Q${n(bx + dir * 20)} ${n(by - 90)} ${n(bx + dir * 4)} ${n(by - 32)}Z`;
  return sway(
    rng,
    'wheat',
    stroke(stem, '#6f8f2a', 3) +
      path(leaf, '#4e913f') +
      stroke(`M${n(tx)} ${n(ty)}Q${n(ctrl[0])} ${n(ctrl[1])} ${n(end[0])} ${n(end[1])}`, '#c98a1c', 1.4) +
      `<g fill="#f2b632">${grains}</g>` +
      stroke(ticks, '#c9701a', 1),
  );
}

function cosmos(rng: Rng, cx: number, cy: number, r: number, baseY: number): string {
  const [fill, vein] = rng.pick([
    ['#d6246e', '#8c0f3e'],
    ['#f27aa6', '#c94f7c'],
    ['#e8262f', '#a8121c'],
    ['#f27aa6', '#c94f7c'],
  ] as const);
  const stem = `M${n(cx + rng.range(-20, 20))} ${n(baseY)}Q${n(cx + rng.range(-25, 25))} ${n((cy + baseY) / 2)} ${n(cx)} ${n(cy)}`;
  const turn = rng.range(0, Math.PI * 2);
  let petals = '';
  let veins = '';
  for (let i = 0; i < 8; i++) {
    const a = turn + (i / 8) * Math.PI * 2;
    const pt = (rr: number, da: number) => `${n(cx + Math.cos(a + da) * rr)} ${n(cy + Math.sin(a + da) * rr)}`;
    petals += `M${pt(r * 0.15, 0)}Q${pt(r * 0.8, -0.32)} ${pt(r * 0.98, -0.16)}L${pt(r * 0.86, -0.04)}L${pt(r, 0.04)}L${pt(r * 0.88, 0.12)}Q${pt(r * 0.8, 0.32)} ${pt(r * 0.15, 0)}Z`;
    veins += `M${pt(r * 0.28, 0)}L${pt(r * 0.72, rng.range(-0.06, 0.06))}`;
  }
  return sway(
    rng,
    'flower',
    stroke(stem, '#2f6b2c', 2.4) +
      path(petals, fill) +
      stroke(veins, vein, 1.2, ' opacity="0.7"') +
      circle(cx, cy, r * 0.22, '#f3b61f') +
      path(
        dots(
          Array.from({ length: 6 }, (): [number, number, number] => [
            cx + rng.range(-r * 0.12, r * 0.12),
            cy + rng.range(-r * 0.12, r * 0.12),
            0.9,
          ]),
        ),
        '#d9861a',
      ),
  );
}

function daisy(rng: Rng, cx: number, cy: number, s: number, baseY: number): string {
  let petals = '';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 360;
    petals += `<ellipse cx="${n(cx)}" cy="${n(cy - 5.5 * s)}" rx="${n(1.9 * s)}" ry="${n(5.2 * s)}" transform="rotate(${n(a)} ${n(cx)} ${n(cy)})"/>`;
  }
  return sway(
    rng,
    'flower',
    stroke(
      `M${n(cx)} ${n(baseY)}Q${n(cx + rng.range(-8, 8))} ${n((cy + baseY) / 2)} ${n(cx)} ${n(cy)}`,
      '#3c7f3a',
      1.4,
    ) +
      `<g fill="#fbfbf5">${petals}</g>` +
      circle(cx, cy, 2.6 * s, '#e3202a'),
  );
}

function longLeaf(rng: Rng, bx: number, tx: number, ty: number): string {
  const by = 1500;
  const w = rng.range(8, 16);
  const cx = (bx + tx) / 2 + rng.range(-30, 30);
  const cy = (by + ty) / 2;
  const [fill, rib] = rng.pick([
    ['#2a7a3a', '#5aa860'],
    ['#4e913f', '#86b85a'],
    ['#1d6a2d', '#4f9442'],
  ] as const);
  return sway(
    rng,
    'leaf',
    path(
      `M${n(bx - w)} ${by}Q${n(cx - w)} ${n(cy)} ${n(tx)} ${n(ty)}Q${n(cx + w)} ${n(cy)} ${n(bx + w)} ${by}Z`,
      fill,
    ) + stroke(`M${n(bx)} ${by}Q${n(cx)} ${n(cy)} ${n(tx)} ${n(ty)}`, rib, 1.4),
  );
}

function foreground(rng: Rng): string {
  let out = '';
  for (let i = 0; i < 22; i++) out += grassClump(rng, rng.range(-10, 826), rng.range(1300, 1360), rng.range(40, 80));
  for (let i = 0; i < 14; i++) {
    const bx = 10 + i * 58 + rng.range(-16, 16);
    out += riceStalk(rng, bx, 1500, bx + rng.range(-30, 30), rng.range(1220, 1340));
  }
  for (let i = 0; i < 22; i++) {
    const cy = rng.range(1350, 1450);
    out += daisy(rng, rng.range(10, 806), cy, rng.range(0.8, 1.4), 1500);
  }
  for (let i = 0; i < 18; i++) out += grassClump(rng, rng.range(-10, 826), rng.range(1420, 1490), rng.range(60, 110));
  for (const [cx, cy, r] of [
    [70, 1418, 34],
    [190, 1366, 22],
    [300, 1400, 26],
    [430, 1420, 28],
    [540, 1372, 22],
    [610, 1352, 20],
    [740, 1405, 36],
  ] as const) {
    out += cosmos(rng, cx + rng.range(-10, 10), cy, r, 1500);
  }
  for (let i = 0; i < 8; i++) {
    const bx = rng.range(-10, 826);
    out += longLeaf(rng, bx, bx + rng.range(-70, 70), rng.range(1290, 1380));
  }
  for (const [cx, cy, r] of [
    [140, 1470, 46],
    [650, 1478, 52],
  ] as const) {
    out += cosmos(rng, cx, cy, r, 1500);
  }
  return out;
}

/** Builds the three stacked layers: sky, drifting clouds, and the land with its swaying plants. */
export function paintScene(seed = 20261102) {
  const rng = createRng(seed);
  return {
    sky: sky(rng),
    clouds: clouds(rng),
    land: seoul(rng) + hometown(rng) + fields(rng) + foreground(rng),
  };
}
