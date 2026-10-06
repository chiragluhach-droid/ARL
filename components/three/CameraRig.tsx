"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import { BEATS, DEST_DOCK, TRUCK, bodyMatrix, dockMatrix, invLerp, smooth, truckPose } from "@/lib/journey";
import { ANCHOR_POINTS, anchors, type AnchorId } from "@/lib/anchors";

type Key = { p: number; pos: [number, number, number]; look: [number, number, number]; fov: number };

/**
 * Truck-relative shots: offsets (world axes) from the truck's centre.
 * The road runs along +X, the camera mostly sits on the +Z verge.
 */
const ROAD_KEYS: Key[] = [
  { p: 0.0, pos: [24, 2.3, 22], look: [-4, 6.4, -1], fov: 30 }, // hero: low front three-quarter, truck sits low-right
  { p: 0.03, pos: [19, 3.6, 23], look: [-4, 5.2, 0], fov: 32 },
  { p: 0.065, pos: [-5, 6.5, 15], look: [-7, 1.9, 0], fov: 36 }, // swing to the dock
  { p: 0.11, pos: [-11, 6.8, 13.5], look: [-5.5, 1.4, 0], fov: 35 }, // loading close
  { p: 0.15, pos: [-12, 8, 12.5], look: [-8, 1.7, -1], fov: 36 },
  { p: 0.18, pos: [-16, 3.2, 7.5], look: [-6, 2.2, 0], fov: 33 }, // doors close, rear quarter
  { p: 0.205, pos: [-4, 2.6, 16], look: [0, 2, 0], fov: 32 }, // pulls away
  { p: 0.245, pos: [-3.6, 0.8, 6.6], look: [3, 1.1, 0], fov: 42 }, // wheel-level
  { p: 0.3, pos: [-18, 10, 24], look: [2, 3.2, 2], fov: 34 }, // industrial, high tracking
  { p: 0.355, pos: [26, 3.2, 6.8], look: [0, 4.2, 3.6], fov: 28 }, // head-on chase
  { p: 0.415, pos: [-1, 2.3, 34], look: [-2.2, 3.5, 0], fov: 22 }, // long-lens profile (callouts)
  { p: 0.47, pos: [-3.5, 2.4, 34], look: [-2.6, 3.5, 0], fov: 22 },
  { p: 0.51, pos: [-25, 52, 42], look: [22, 0, 0], fov: 34 }, // rise
  { p: 0.56, pos: [-12, 88, 24], look: [30, 0, 0], fov: 32 }, // tracking: from above
  { p: 0.6, pos: [-30, 24, 22], look: [40, 2, 0], fov: 34 },
  { p: 0.64, pos: [-24, 3.4, 8.5], look: [12, 5.2, -1], fov: 32 }, // golden rear chase
  { p: 0.69, pos: [18, 2.0, 11], look: [-1, 4.4, 0], fov: 34 }, // headlights, front quarter
  { p: 0.74, pos: [8, 13, 28], look: [6, 1.5, 0], fov: 34 }, // city
  { p: 0.79, pos: [26, 7, 14], look: [0, 1.5, -6], fov: 36 },
];

/** Destination shots in dock-local space (+X toward the cab, platform at -X). */
const DOCK_KEYS: Key[] = [
  { p: 0.765, pos: [26, 6, -30], look: [14, 2, -2], fov: 36 }, // truck arriving along the road
  { p: 0.79, pos: [21, 4.2, 1], look: [14, 2.2, -8], fov: 36 }, // doors opening in the yard
  { p: 0.815, pos: [26, 15, 12], look: [6, 1, -3], fov: 38 }, // reversing, wide
  { p: 0.84, pos: [9, 7.5, 14], look: [-1, 2, 0], fov: 36 },
  { p: 0.855, pos: [5.5, 4.4, 8.5], look: [-2, 2.2, 0], fov: 38 }, // doors + shutter
  { p: 0.878, pos: [4, 9.5, 11], look: [-3.5, 1.4, 0], fov: 40 }, // pallets out
  { p: 0.905, pos: [1.5, 5.6, 7.5], look: [-3, 1.8, 0.5], fov: 40 }, // forklift
  { p: 0.935, pos: [6, 17, 12], look: [-3, 1, 0], fov: 38 },
  { p: 1.0, pos: [3, 46, 7], look: [-2, 0, 0], fov: 34 }, // crane to overhead
];

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

/**
 * Monotone cubic (Fritsch–Carlson) between y1 and y2 with neighbours y0/y3.
 * Smooth like Catmull-Rom, but it can never overshoot a keyframe — a plain Catmull-Rom
 * dipped the camera below the road when a low shot was followed by a big crane-up.
 */
function cr(y0: number, y1: number, y2: number, y3: number, t: number) {
  const d0 = y1 - y0, d1 = y2 - y1, d2 = y3 - y2;
  let m1 = d0 * d1 <= 0 ? 0 : (d0 + d1) / 2;
  let m2 = d1 * d2 <= 0 ? 0 : (d1 + d2) / 2;
  if (d1 === 0) {
    m1 = 0;
    m2 = 0;
  } else {
    const a = m1 / d1, b = m2 / d1, s = a * a + b * b;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m1 = tau * a * d1;
      m2 = tau * b * d1;
    }
  }
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * y2 + (t3 - t2) * m2;
}

/** Smooth, overshoot-free path through keyframes — continuous motion between shots. */
function sample(keys: Key[], p: number, pos: THREE.Vector3, look: THREE.Vector3) {
  if (p <= keys[0].p) {
    pos.set(...keys[0].pos);
    look.set(...keys[0].look);
    return keys[0].fov;
  }
  const last = keys[keys.length - 1];
  if (p >= last.p) {
    pos.set(...last.pos);
    look.set(...last.look);
    return last.fov;
  }
  let i = 0;
  while (p > keys[i + 1].p) i++;
  const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
  // ease inside each segment so shots breathe, but keep CR tangents for flow
  const raw = (p - k1.p) / (k2.p - k1.p);
  const t = raw * 0.35 + smooth(raw) * 0.65;
  for (let a = 0; a < 3; a++) {
    pos.setComponent(a, cr(k0.pos[a], k1.pos[a], k2.pos[a], k3.pos[a], t));
    look.setComponent(a, cr(k0.look[a], k1.look[a], k2.look[a], k3.look[a], t));
  }
  return cr(k0.fov, k1.fov, k2.fov, k3.fov, t);
}

export default function CameraRig({ reduced }: { reduced: boolean }) {
  const { camera, size } = useThree();
  const dock = useMemo(() => dockMatrix(DEST_DOCK, new THREE.Matrix4()), []);
  const v = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      dpos: new THREE.Vector3(),
      dlook: new THREE.Vector3(),
      body: new THREE.Matrix4(),
    }),
    [],
  );

  useFrame(() => {
    const p = progress.get();
    const cam = camera as THREE.PerspectiveCamera;
    const pose = truckPose(p);
    const cx = pose.x + Math.cos(pose.yaw) * TRUCK.pivotX;
    const cz = pose.z - Math.sin(pose.yaw) * TRUCK.pivotX;

    let fov = sample(ROAD_KEYS, p, v.pos, v.look);
    v.pos.x += cx;
    v.pos.z += cz;
    v.look.x += cx;
    v.look.z += cz;

    const w = smooth(invLerp(0.765, 0.795, p));
    if (w > 0) {
      const dfov = sample(DOCK_KEYS, p, v.dpos, v.dlook);
      v.dpos.applyMatrix4(dock);
      v.dlook.applyMatrix4(dock);
      v.pos.lerp(v.dpos, w);
      v.look.lerp(v.dlook, w);
      fov = fov + (dfov - fov) * w;
    }

    // handheld + road vibration, scaled by speed (never during reduced motion)
    if (!reduced) {
      const s = pose.speed;
      const o = pose.odo;
      v.pos.y += Math.sin(o * 0.9) * 0.025 * s + Math.sin(p * 40) * 0.04;
      v.pos.x += Math.sin(o * 0.37 + 1.1) * 0.03 * s;
      v.look.y += Math.sin(o * 1.3) * 0.012 * s;
    }

    // portrait: preserve horizontal framing and drop the truck into the lower third
    const aspect = size.width / size.height;
    if (aspect < 1) {
      const hf = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(fov) / 2) * 1.35);
      fov = Math.min(68, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(hf / 2) / aspect)));
      v.look.y += 1.4;
    }

    // hard floor: the camera never goes below the road surface
    v.pos.y = Math.max(v.pos.y, 0.55);
    cam.position.copy(v.pos);
    cam.lookAt(tmpA.copy(v.look));
    if (Math.abs(cam.fov - fov) > 1e-3) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }

    // Callout anchors are projected HERE, right after the camera moves, so the DOM labels
    // always use this frame's camera (projecting elsewhere can lag a frame and make them jump).
    if (p > BEATS.callouts[0] - 0.03 && p < BEATS.callouts[1] + 0.03) {
      cam.updateMatrixWorld();
      bodyMatrix(p, v.body);
      (Object.keys(ANCHOR_POINTS) as AnchorId[]).forEach((id) => {
        const pt = ANCHOR_POINTS[id];
        tmpB.set(pt[0], pt[1], pt[2]).applyMatrix4(v.body).project(cam);
        const a = anchors.data[id];
        a.x = (tmpB.x * 0.5 + 0.5) * size.width;
        a.y = (-tmpB.y * 0.5 + 0.5) * size.height;
        a.behind = tmpB.z > 1 || Math.abs(tmpB.x) > 1.05 || Math.abs(tmpB.y) > 1.05;
      });
      anchors.emit();
    }
  });

  return null;
}
