/**
 * Scroll pacing. The story (truck, camera, text, sound) is authored in "story progress" p ∈ [0,1].
 * This maps raw scroll progress s → p so each part of the story gets the amount of scroll it deserves:
 * the long drive is compressed, the pickup and the unloading keep their breathing room.
 *
 * Knots are [scroll distance in vh, story progress]. Interpolation is monotone-cubic, so the truck's
 * speed changes smoothly between parts (no jolt at a knot).
 */
const KNOTS: [number, number][] = [
  [0, 0], // hero
  [330, 0.196], // pickup + loading done → departure
  [530, 0.39], // industrial belt → open road
  [640, 0.48], // side-on profile with labels
  [760, 0.61], // tracked every mile (was ~2.5 screens, now ~1.2)
  [890, 0.725], // distance: golden hour → dusk
  [990, 0.79], // arrival, truck stops in the yard
  [1100, 0.855], // reverse onto the dock, doors + shutter
  [1260, 0.947], // unloading → forklift handover
  [1360, 1], // About rises over the overhead shot (last 100vh)
];

const SCROLL_VH = KNOTS[KNOTS.length - 1][0];
/** Height of the journey track: scroll distance + one viewport for the sticky stage. */
export const JOURNEY_VH = SCROLL_VH + 100;

const xs = KNOTS.map(([vh]) => vh / SCROLL_VH);
const ys = KNOTS.map(([, p]) => p);

// Fritsch–Carlson monotone tangents
const n = xs.length;
const d = Array.from({ length: n - 1 }, (_, k) => (ys[k + 1] - ys[k]) / (xs[k + 1] - xs[k]));
const m = Array.from({ length: n }, (_, k) => (k === 0 ? d[0] : k === n - 1 ? d[n - 2] : (d[k - 1] + d[k]) / 2));
for (let k = 0; k < n - 1; k++) {
  if (d[k] === 0) {
    m[k] = m[k + 1] = 0;
    continue;
  }
  const a = m[k] / d[k];
  const b = m[k + 1] / d[k];
  const s = a * a + b * b;
  if (s > 9) {
    const t = 3 / Math.sqrt(s);
    m[k] = t * a * d[k];
    m[k + 1] = t * b * d[k];
  }
}

/** Raw scroll progress (0..1) → story progress (0..1). */
export function scrollToStory(s: number) {
  if (s <= 0) return 0;
  if (s >= 1) return 1;
  let k = 0;
  while (k < n - 2 && s > xs[k + 1]) k++;
  const h = xs[k + 1] - xs[k];
  const t = (s - xs[k]) / h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k] + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1];
}

/** Story progress → raw scroll progress (for jumping to a chapter). */
export function storyToScroll(p: number) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (scrollToStory(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
