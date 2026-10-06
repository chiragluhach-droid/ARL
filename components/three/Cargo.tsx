"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import {
  DEST_DOCK,
  DOCK_H,
  PALLETS,
  PICKUP_DOCK,
  bodyMatrix,
  dockMatrix,
  forkliftState,
  palletState,
} from "@/lib/journey";
import { palletWrap } from "@/lib/textures";
import { useMats, type Mats } from "./materials";
import { Box } from "./util";

/* ---------------- pallet ---------------- */

function PalletModel({ variant, m, wrap }: { variant: number; m: Mats; wrap: THREE.Material }) {
  return (
    <group>
      {/* stringers leave visible fork pockets */}
      {[-0.44, 0, 0.44].map((z) => (
        <Box key={z} size={[1.2, 0.1, 0.1]} pos={[0, 0.05, z]} mat={m.palletWood} shadow />
      ))}
      <Box size={[1.2, 0.035, 1.0]} pos={[0, 0.118, 0]} mat={m.palletWood} shadow />
      {variant === 1 ? (
        <Box size={[1.14, 1.3, 0.96]} pos={[0, 0.135 + 0.65, 0]} mat={wrap} shadow />
      ) : variant === 0 ? (
        <>
          <Box size={[1.14, 0.62, 0.96]} pos={[0, 0.135 + 0.31, 0]} mat={wrap} shadow />
          <Box size={[1.1, 0.58, 0.92]} pos={[0, 0.135 + 0.62 + 0.29, 0]} mat={wrap} shadow />
        </>
      ) : (
        <>
          {[0, 1, 2].map((i) => (
            <Box key={i} size={[1.12 - i * 0.04, 0.42, 0.94 - i * 0.04]} pos={[0, 0.135 + 0.21 + i * 0.42, 0]} mat={wrap} shadow />
          ))}
        </>
      )}
    </group>
  );
}

export function Pallets() {
  const m = useMats();
  const refs = useRef<(THREE.Group | null)[]>([]);
  const wraps = useMemo(
    () => [0, 1, 2].map((v) => new THREE.MeshStandardMaterial({ map: palletWrap(v), roughness: v === 1 ? 0.35 : 0.85 })),
    [],
  );
  const frames = useMemo(
    () => ({
      pickup: dockMatrix(PICKUP_DOCK, new THREE.Matrix4()),
      dest: dockMatrix(DEST_DOCK, new THREE.Matrix4()),
    }),
    [],
  );
  const tmp = useMemo(
    () => ({ v: new THREE.Vector3(), m: new THREE.Matrix4(), t: new THREE.Matrix4() }),
    [],
  );

  useFrame(() => {
    const p = progress.get();
    PALLETS.forEach((pl, i) => {
      const g = refs.current[i];
      if (!g) return;
      const frame = palletState(pl, p, tmp.v);
      if (frame === "truck") bodyMatrix(p, tmp.m);
      else if (frame === "forklift") {
        const f = forkliftState(p);
        tmp.m.copy(frames.dest).multiply(tmp.t.makeTranslation(f.x, 0, f.z));
      } else tmp.m.copy(frame === "pickup" ? frames.pickup : frames.dest);
      g.matrix.copy(tmp.m).multiply(tmp.t.makeTranslation(tmp.v.x, tmp.v.y, tmp.v.z));
      g.matrixWorldNeedsUpdate = true;
    });
  });

  return (
    <>
      {PALLETS.map((pl, i) => (
        <group key={i} ref={(el) => void (refs.current[i] = el)} matrixAutoUpdate={false}>
          <PalletModel variant={pl.variant} m={m} wrap={wraps[pl.variant]} />
        </group>
      ))}
    </>
  );
}

/* ---------------- forklift ---------------- */

function ForkliftModel({ m, forks }: { m: Mats; forks?: React.Ref<THREE.Group> }) {
  return (
    <group>
      <Box size={[1.5, 0.75, 1.1]} pos={[-0.35, 0.55, 0]} mat={m.signal} shadow />
      <Box size={[0.55, 0.85, 1.12]} pos={[-1.2, 0.62, 0]} mat={m.dark} shadow />
      <Box size={[0.45, 0.5, 0.5]} pos={[-0.55, 1.1, 0]} mat={m.dark} shadow />
      {/* overhead guard */}
      {[
        [0.1, 0.48],
        [0.1, -0.48],
        [-0.9, 0.48],
        [-0.9, -0.48],
      ].map(([x, z]) => (
        <Box key={`${x}${z}`} size={[0.05, 1.3, 0.05]} pos={[x, 1.55, z]} mat={m.dark} shadow />
      ))}
      <Box size={[1.1, 0.05, 1.05]} pos={[-0.4, 2.2, 0]} mat={m.dark} shadow />
      {/* mast */}
      {[0.36, -0.36].map((z) => (
        <Box key={z} size={[0.09, 2.3, 0.09]} pos={[0.5, 1.25, z]} mat={m.graphite} shadow />
      ))}
      <group ref={forks}>
        <Box size={[0.06, 0.55, 0.9]} pos={[0.58, 0.32, 0]} mat={m.graphite} />
        {[0.28, -0.28].map((z) => (
          <Box key={z} size={[1.15, 0.045, 0.11]} pos={[1.17, 0.06, z]} mat={m.dark} shadow />
        ))}
      </group>
      {[
        [0.15, 0.48],
        [0.15, -0.48],
        [-1.05, 0.48],
        [-1.05, -0.48],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} material={m.rubber} position={[x, 0.24, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.2, 16]} />
        </mesh>
      ))}
      <Box size={[0.12, 0.12, 0.12]} pos={[-0.4, 2.27, 0]} mat={m.beacon} />
    </group>
  );
}

export function Forklift() {
  const m = useMats();
  const root = useRef<THREE.Group>(null!);
  const forks = useRef<THREE.Group>(null!);
  const { x, z, yaw } = DEST_DOCK;
  useFrame(() => {
    const p = progress.get();
    const f = forkliftState(p);
    root.current.position.set(f.x, DOCK_H, f.z);
    forks.current.position.y = f.lift - DOCK_H;
    m.beacon.emissiveIntensity = Math.floor(p * 700) % 2 ? 3 : 0.2;
  });
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]}>
      <group ref={root}>
        <ForkliftModel m={m} forks={forks} />
      </group>
    </group>
  );
}
