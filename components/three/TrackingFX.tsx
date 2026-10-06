"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import { BEATS, LANE, invLerp, smooth, truckPose } from "@/lib/journey";

/** "Tracked every mile": a signal-orange route line painted ahead of the truck + GPS pings. */
export default function TrackingFX() {
  const line = useRef<THREE.Mesh>(null!);
  const trail = useRef<THREE.Mesh>(null!);
  const rings = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(() => {
    const mk = (o: number) =>
      new THREE.MeshBasicMaterial({ color: "#ff5a1f", transparent: true, opacity: o, depthWrite: false, toneMapped: false });
    return { line: mk(0.9), trail: mk(0.35), ring: [mk(0.8), mk(0.8), mk(0.8)] };
  }, []);

  useFrame(() => {
    const p = progress.get();
    const [a, b] = BEATS.tracking;
    const vis = smooth(invLerp(a - 0.01, a + 0.03, p)) * (1 - smooth(invLerp(b - 0.02, b + 0.01, p)));
    const pose = truckPose(p);
    const grow = smooth(invLerp(a, a + 0.06, p));
    const L = 20 + grow * 700;
    const front = pose.x + 12.6;

    line.current.visible = trail.current.visible = vis > 0.001;
    rings.current.forEach((r) => r && (r.visible = vis > 0.001));
    if (vis <= 0.001) return;

    line.current.scale.set(L, 1, 1);
    line.current.position.set(front + L / 2, 0.05, LANE);
    mats.line.opacity = 0.9 * vis;

    const T = 160;
    trail.current.scale.set(T, 1, 1);
    trail.current.position.set(pose.x - T / 2, 0.05, LANE);
    mats.trail.opacity = 0.4 * vis;

    rings.current.forEach((r, i) => {
      if (!r) return;
      const ph = (p * 140 + i / 3) % 1;
      const s = 4 + ph * 34;
      r.scale.set(s, s, s);
      r.position.set(pose.x + 6, 0.08 + i * 0.01, LANE);
      mats.ring[i].opacity = (1 - ph) * 0.75 * vis;
    });
  });

  return (
    <>
      <mesh ref={line} rotation={[-Math.PI / 2, 0, 0]} material={mats.line} renderOrder={2}>
        <planeGeometry args={[1, 0.5]} />
      </mesh>
      <mesh ref={trail} rotation={[-Math.PI / 2, 0, 0]} material={mats.trail} renderOrder={2}>
        <planeGeometry args={[1, 0.35]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => void (rings.current[i] = el)} rotation={[-Math.PI / 2, 0, 0]} material={mats.ring[i]} renderOrder={3}>
          <ringGeometry args={[0.96, 1, 64]} />
        </mesh>
      ))}
    </>
  );
}
