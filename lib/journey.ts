import * as THREE from "three";

/* ------------------------------------------------------------------ */
/* Math helpers                                                        */
/* ------------------------------------------------------------------ */

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a));
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
/** 0→1 eased over [a, b] of progress */
export const ramp = (p: number, a: number, b: number, ease = easeInOut) => ease(invLerp(a, b, p));

/* ------------------------------------------------------------------ */
/* World layout                                                        */
/* ------------------------------------------------------------------ */

/** Indian traffic keeps left: heading +X, the left lane sits at -Z. */
export const LANE = -1.85;
/** Rear of the truck travels from x=0 (pickup dock) to x=LF (destination yard). */
export const LF = 2200;
/** Destination dock: truck reverses so its rear lands at (DK, ZE), facing +Z. */
export const DK = LF - 9;
export const ZE = -16;
export const DOCK_H = 1.25; // platform height == container floor height

export const TRUCK = {
  length: 12.45,
  wheelR: 0.52,
  wheelbase: 7.6,
  floorY: 1.25,
  pivotX: 6,
};

/* ------------------------------------------------------------------ */
/* Beats — every moment of the story, as progress ranges               */
/* ------------------------------------------------------------------ */

export const BEATS = {
  hero: [0, 0.05],
  load: [0.068, 0.158],
  pickupLipUp: [0.158, 0.164],
  creep: [0.164, 0.173],
  pickupShutter: [0.168, 0.188],
  doorsClose: [0.173, 0.19],
  depart: 0.196,
  journey: [0.255, 0.385],
  callouts: [0.395, 0.475],
  tracking: [0.485, 0.605],
  distance: [0.615, 0.72],
  arrive: 0.785, // forward stop in destination yard
  doorsOpen: [0.787, 0.802],
  reverse: [0.8, 0.835],
  arrival: [0.755, 0.84],
  destShutter: [0.83, 0.845],
  destLip: [0.845, 0.853],
  unload: [0.855, 0.9155],
  forkApproach: [0.885, 0.905],
  forkLift: [0.917, 0.923],
  forkReverse: [0.923, 0.945],
  final: [0.947, 1],
} as const;

/** Night amount: 0 (day) → 1 (lights on). */
export const nightAmount = (p: number) => smooth(invLerp(0.64, 0.75, p));

/* ------------------------------------------------------------------ */
/* Forward motion: integrate a velocity profile so speed feels heavy   */
/* ------------------------------------------------------------------ */

const CREEP = 2.5;

function vel(p: number) {
  const accel = smooth(invLerp(BEATS.depart, 0.275, p));
  const decel = 1 - smooth(invLerp(0.722, BEATS.arrive, p));
  // slower through the industrial belt and the city, full speed on the highway
  const zone =
    lerp(0.5, 1, smooth(invLerp(0.26, 0.37, p))) * lerp(1, 0.7, smooth(invLerp(0.69, 0.75, p)));
  return accel * decel * zone;
}

const N = 4000;
const table = new Float32Array(N + 1);
let total = 0;
{
  for (let i = 1; i <= N; i++) {
    total += ((vel((i - 1) / N) + vel(i / N)) * 0.5) / N;
    table[i] = total;
  }
}
const FWD = LF - CREEP;

/** Distance along the road at progress p (rear of truck x). */
export function forwardX(p: number) {
  const f = clamp(p) * N;
  const i = Math.floor(f);
  const s = lerp(table[i], table[Math.min(i + 1, N)], f - i);
  return CREEP * ramp(p, BEATS.creep[0], BEATS.creep[1]) + (s / total) * FWD;
}

/** Normalised forward speed 0..1 */
export const speedAt = (p: number) => vel(clamp(p));

/* ------------------------------------------------------------------ */
/* Reverse into the destination dock (cubic bezier for the rear point)  */
/* ------------------------------------------------------------------ */

const B0 = new THREE.Vector2(DK + 9, LANE);
const B1 = new THREE.Vector2(DK + 2, LANE);
const B2 = new THREE.Vector2(DK, ZE + 10);
const B3 = new THREE.Vector2(DK, ZE);

function bez(u: number, out: THREE.Vector2) {
  const a = 1 - u;
  return out.set(
    a * a * a * B0.x + 3 * a * a * u * B1.x + 3 * a * u * u * B2.x + u * u * u * B3.x,
    a * a * a * B0.y + 3 * a * a * u * B1.y + 3 * a * u * u * B2.y + u * u * u * B3.y,
  );
}
function bezD(u: number, out: THREE.Vector2) {
  const a = 1 - u;
  return out.set(
    3 * a * a * (B1.x - B0.x) + 6 * a * u * (B2.x - B1.x) + 3 * u * u * (B3.x - B2.x),
    3 * a * a * (B1.y - B0.y) + 6 * a * u * (B2.y - B1.y) + 3 * u * u * (B3.y - B2.y),
  );
}

const BL = 200;
const bezLen = new Float32Array(BL + 1);
{
  const a = new THREE.Vector2();
  const b = new THREE.Vector2();
  bez(0, a);
  for (let i = 1; i <= BL; i++) {
    bez(i / BL, b);
    bezLen[i] = bezLen[i - 1] + a.distanceTo(b);
    a.copy(b);
  }
}
const arc = (u: number) => {
  const f = clamp(u) * BL;
  const i = Math.floor(f);
  return lerp(bezLen[i], bezLen[Math.min(i + 1, BL)], f - i);
};
const yawAtU = (u: number) => {
  const d = bezD(clamp(u, 0.0001, 0.9999), new THREE.Vector2());
  // truck faces opposite to its (backward) motion
  return Math.atan2(d.y, -d.x);
};

/* ------------------------------------------------------------------ */
/* Truck pose                                                          */
/* ------------------------------------------------------------------ */

export interface Pose {
  x: number;
  z: number;
  yaw: number;
  odo: number;
  steer: number;
  speed: number; // 0..1, forward
  accel: number;
  reversing: number; // 0..1 intensity
  braking: number;
}

const _v = new THREE.Vector2();
const _cache = { p: -1, pose: null as unknown as Pose };

export function truckPose(p: number): Pose {
  if (p === _cache.p) return _cache.pose;
  let pose: Pose;
  if (p <= BEATS.arrive) {
    const x = forwardX(p);
    const e = 0.002;
    const accel = (vel(p + e) - vel(p - e)) / (2 * e);
    pose = {
      x,
      z: LANE,
      yaw: 0,
      odo: x,
      steer: 0,
      speed: vel(p),
      accel,
      reversing: 0,
      braking: accel < -1 ? 1 : p > BEATS.arrive - 0.004 ? 1 : 0,
    };
  } else {
    const [r0, r1] = BEATS.reverse;
    const t = invLerp(r0, r1, p);
    const u = easeInOut(t);
    bez(u, _v);
    const yaw = yawAtU(u);
    // kinematic bicycle model: tan(δ) = L · dψ / ds (ds signed, negative in reverse)
    const du = 0.01;
    const u2 = clamp(u + du);
    const ds = -(arc(u2) - arc(u)) || -1e-4;
    const steer = clamp(Math.atan((TRUCK.wheelbase * (yawAtU(u2) - yaw)) / ds), -0.55, 0.55);
    pose = {
      x: _v.x,
      z: _v.y,
      yaw,
      odo: LF - arc(u),
      steer: t > 0 && t < 1 ? steer : 0,
      speed: 0,
      accel: 0,
      reversing: p > r0 - 0.003 && p < r1 + 0.002 ? 1 : 0,
      braking: 1,
    };
  }
  _cache.p = p;
  _cache.pose = pose;
  return pose;
}

const _q = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);
const _pos = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);

export function truckMatrix(p: number, out: THREE.Matrix4) {
  const pose = truckPose(p);
  _q.setFromAxisAngle(_up, pose.yaw);
  return out.compose(_pos.set(pose.x, 0, pose.z), _q, _one);
}

const _m = new THREE.Matrix4();
const _e = new THREE.Euler();

/** Sprung body (cab + container) relative to chassis: bob, squat/dive, slight roll. */
export function bodyMatrix(p: number, out: THREE.Matrix4) {
  const pose = truckPose(p);
  const sp = Math.max(pose.speed, pose.reversing * 0.25);
  const bob = (Math.sin(pose.odo * 1.7) * 0.012 + Math.sin(pose.odo * 0.53 + 1.3) * 0.01) * sp;
  const pitch = clamp(pose.accel * 0.0006, -0.012, 0.012);
  const roll = Math.sin(pose.odo * 0.37) * 0.004 * sp - pose.steer * 0.01;
  truckMatrix(p, out);
  _m.makeTranslation(TRUCK.pivotX, bob, 0);
  out.multiply(_m);
  _m.makeRotationFromEuler(_e.set(roll, 0, pitch));
  out.multiply(_m);
  _m.makeTranslation(-TRUCK.pivotX, 0, 0);
  return out.multiply(_m);
}

/* ------------------------------------------------------------------ */
/* Docks                                                               */
/* ------------------------------------------------------------------ */

/** Dock local frame: origin at platform edge (ground), +X toward the truck. */
export const PICKUP_DOCK = { x: 0, z: LANE, yaw: 0 };
export const DEST_DOCK = { x: DK, z: ZE, yaw: -Math.PI / 2 };

export function dockMatrix(d: { x: number; z: number; yaw: number }, out: THREE.Matrix4) {
  _q.setFromAxisAngle(_up, d.yaw);
  return out.compose(_pos.set(d.x, 0, d.z), _q, _one);
}

/* ------------------------------------------------------------------ */
/* Cargo choreography                                                  */
/* ------------------------------------------------------------------ */

export interface Pallet {
  r: number;
  c: number;
  slot: [number, number];
  staging: [number, number];
  load: [number, number];
  unload: [number, number];
  target: [number, number];
  toForklift: boolean;
  variant: number;
}

export const PALLETS: Pallet[] = [];
{
  const targets: Record<number, [number, number][]> = {
    0: [[-2.5, 4.6], [-2.5, -4.6]],
    1: [[-4.6, 4.6], [-4.6, -4.6]],
    2: [[-2.5, 6.3], [-2.5, -6.3]],
    3: [[-1.6, 0.6], [-4.6, -6.3]], // c0 rides out onto the forklift
  };
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 2; c++) {
      const z = c === 0 ? 0.6 : -0.6;
      const ls = BEATS.load[0] + r * 0.0215 + c * 0.004;
      const k = 3 - r; // unload rear-most first
      const us = BEATS.unload[0] + k * 0.0135 + c * 0.003;
      PALLETS.push({
        r,
        c,
        slot: [9.05 - r * 1.35, z],
        staging: [-1.9 - r * 1.45, z],
        load: [ls, ls + 0.03],
        unload: [us, us + 0.02 - (k === 3 && c === 0 ? 0.005 : 0)],
        target: targets[k][c],
        toForklift: k === 3 && c === 0,
        variant: (r * 2 + c) % 3,
      });
    }
  }
}

export type PalletFrame = "pickup" | "truck" | "dest" | "forklift";

/** Where pallet i is at progress p, in which frame. */
export function palletState(pl: Pallet, p: number, out: THREE.Vector3): PalletFrame {
  if (p < pl.load[1]) {
    const t = ramp(p, pl.load[0], pl.load[1]);
    out.set(lerp(pl.staging[0], pl.slot[0], t), DOCK_H, pl.staging[1]);
    return "pickup";
  }
  if (p < pl.unload[0]) {
    out.set(pl.slot[0], DOCK_H, pl.slot[1]);
    return "truck";
  }
  if (pl.toForklift && p >= pl.unload[1]) {
    const f = forkliftState(p);
    out.set(1.2, f.lift, 0);
    return "forklift";
  }
  const t = ramp(p, pl.unload[0], pl.unload[1]);
  const exitX = -1.6;
  const [tx, tz] = pl.target;
  const split = pl.toForklift ? 1 : 0.5;
  if (t <= split) {
    const u = t / split;
    out.set(lerp(pl.slot[0], exitX, u), DOCK_H, pl.slot[1]);
  } else {
    // quadratic turn from exit point to its marked bay on the platform
    const u = (t - split) / (1 - split);
    const cx = tx, cz = pl.slot[1];
    const a = 1 - u;
    out.set(
      a * a * exitX + 2 * a * u * cx + u * u * tx,
      DOCK_H,
      a * a * pl.slot[1] + 2 * a * u * cz + u * u * tz,
    );
  }
  return "dest";
}

/** Forklift at destination, dock-local. */
export function forkliftState(p: number) {
  const a = ramp(p, BEATS.forkApproach[0], BEATS.forkApproach[1], easeOut);
  const back = ramp(p, BEATS.forkReverse[0], BEATS.forkReverse[1]);
  const x = lerp(-17, -2.8, a) + lerp(0, -14.5, back);
  const lift = DOCK_H + 0.32 * ramp(p, BEATS.forkLift[0], BEATS.forkLift[1]);
  return { x, z: 0.6, lift, wheel: x / 0.3 };
}

/* ------------------------------------------------------------------ */
/* Route / HUD helpers                                                 */
/* ------------------------------------------------------------------ */

/** 0..1 of the journey distance at progress p (for odometer & route UI). */
export const routeFraction = (p: number) =>
  p <= BEATS.arrive ? clamp(forwardX(p) / LF) : 1;
