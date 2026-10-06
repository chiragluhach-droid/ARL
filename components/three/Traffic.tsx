"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import { forwardX, nightAmount } from "@/lib/journey";
import { useMats } from "./materials";

/**
 * Oncoming traffic in the right-hand lane. Each vehicle is scheduled to cross our
 * truck at a given progress; position is a pure function of p (scrubs both ways).
 */
const LANE_ONCOMING = 1.85;
const REL = 2600; // world units per unit progress (closing speed feel)

const SCHEDULE = [
  { meet: 0.29, kind: "car", color: "#d8d8d4" },
  { meet: 0.335, kind: "truck", color: "#2f5d7c" },
  { meet: 0.375, kind: "car", color: "#8b1e1e" },
  { meet: 0.385, kind: "truck", color: "#c98a2e" },
  { meet: 0.492, kind: "car", color: "#2b2d30" },
  { meet: 0.52, kind: "truck", color: "#5c6b4a" },
  { meet: 0.635, kind: "car", color: "#e5e3dc" },
  { meet: 0.665, kind: "truck", color: "#a8493a" },
  { meet: 0.7, kind: "car", color: "#3f4a55" },
  { meet: 0.73, kind: "car", color: "#c9c7c2" },
] as const;

export default function Traffic({ quality }: { quality: "high" | "low" }) {
  const m = useMats();
  const list = useMemo(
    () => (quality === "high" ? [...SCHEDULE] : SCHEDULE.filter((_, i) => i % 2 === 0)),
    [quality],
  );
  const refs = useRef<(THREE.Group | null)[]>([]);
  const bodies = useMemo(
    () => list.map((v) => new THREE.MeshPhysicalMaterial({ color: v.color, roughness: 0.35, clearcoat: 1 })),
    [list],
  );
  const lights = useMemo(
    () => ({
      head: new THREE.MeshStandardMaterial({ color: "#eee", emissive: "#fff3dc", emissiveIntensity: 0 }),
      tail: new THREE.MeshStandardMaterial({ color: "#400", emissive: "#ff2010", emissiveIntensity: 0 }),
    }),
    [],
  );

  useFrame(() => {
    const p = progress.get();
    const n = nightAmount(p);
    lights.head.emissiveIntensity = 0.2 + n * 5;
    lights.tail.emissiveIntensity = n * 2;
    list.forEach((v, i) => {
      const g = refs.current[i];
      if (!g) return;
      const x = forwardX(v.meet) + 6 - (p - v.meet) * REL;
      const truckX = forwardX(p);
      const visible = Math.abs(x - truckX) < 420;
      g.visible = visible;
      if (!visible) return;
      g.position.set(x, 0, LANE_ONCOMING);
    });
  });

  return (
    <>
      {list.map((v, i) => {
        const body = bodies[i];
        const isTruck = v.kind === "truck";
        const wheels = isTruck ? [-3.2, -2.0, 2.4] : [-1.3, 1.3];
        return (
          <group key={i} ref={(el) => void (refs.current[i] = el)} rotation={[0, Math.PI, 0]}>
            {isTruck ? (
              <>
                <mesh material={body} position={[-1, 2.2, 0]} castShadow>
                  <boxGeometry args={[6.2, 2.5, 2.4]} />
                </mesh>
                <mesh material={m.paint} position={[3.1, 1.85, 0]} castShadow>
                  <boxGeometry args={[1.9, 2.2, 2.35]} />
                </mesh>
                <mesh material={m.glass} position={[4.06, 2.4, 0]}>
                  <boxGeometry args={[0.04, 0.8, 2.1]} />
                </mesh>
                <mesh material={m.dark} position={[0.4, 0.75, 0]}>
                  <boxGeometry args={[8, 0.3, 1.2]} />
                </mesh>
              </>
            ) : (
              <>
                <mesh material={body} position={[0, 0.62, 0]} castShadow>
                  <boxGeometry args={[4.2, 0.62, 1.75]} />
                </mesh>
                <mesh material={body} position={[-0.25, 1.15, 0]} castShadow>
                  <boxGeometry args={[2.3, 0.5, 1.6]} />
                </mesh>
                <mesh material={m.glass} position={[-0.25, 1.15, 0]}>
                  <boxGeometry args={[2.2, 0.42, 1.62]} />
                </mesh>
              </>
            )}
            {[0.62, -0.62].map((z) => (
              <group key={z}>
                <mesh material={lights.head} position={[isTruck ? 4.07 : 2.11, isTruck ? 1.0 : 0.65, z]}>
                  <boxGeometry args={[0.04, 0.14, 0.3]} />
                </mesh>
                <mesh material={lights.tail} position={[isTruck ? -4.12 : -2.11, isTruck ? 1.0 : 0.7, z]}>
                  <boxGeometry args={[0.04, 0.14, 0.3]} />
                </mesh>
              </group>
            ))}
            {wheels.map((wx) =>
              [1, -1].map((s) => (
                <mesh
                  key={`${wx}${s}`}
                  material={m.rubber}
                  position={[wx, isTruck ? 0.5 : 0.36, s * (isTruck ? 1.0 : 0.82)]}
                  rotation={[Math.PI / 2, 0, 0]}
                >
                  <cylinderGeometry args={[isTruck ? 0.5 : 0.36, isTruck ? 0.5 : 0.36, 0.28, 14]} />
                </mesh>
              )),
            )}
          </group>
        );
      })}
    </>
  );
}
