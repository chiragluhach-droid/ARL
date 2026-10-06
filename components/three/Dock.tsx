"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import {
  BEATS,
  DEST_DOCK,
  DOCK_H,
  PALLETS,
  PICKUP_DOCK,
  nightAmount,
  ramp,
} from "@/lib/journey";
import { company } from "@/lib/content";
import { cladding, concrete, facadeSign, hazard, shutter as shutterTex } from "@/lib/textures";
import { useMats } from "./materials";
import { Box } from "./util";

export const EDGE = -0.35; // platform face (gap bridged by the dock leveler lip)
const DEPTH = 10;
const WALL_X = EDGE - DEPTH;
const HALF = 10; // platform half-width
const BW = 18; // building half-width
const BH = 11; // building height
const BD = 30; // building depth
const OPEN_W = 3.6;
const OPEN_H = 4;

/** Platform top with painted bays — one canvas instead of dozens of meshes. */
function platformTexture(kind: "pickup" | "dest") {
  const W = 512, H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.fillStyle = "#bdb9b0";
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.07})`;
    g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
  }
  // expansion joints
  g.strokeStyle = "rgba(0,0,0,0.15)";
  g.lineWidth = 2;
  for (let y = 0; y < H; y += H / 8) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(W, y);
    g.stroke();
  }
  const px = (x: number) => ((x - WALL_X) / DEPTH) * W;
  const py = (z: number) => (z / (HALF * 2) + 0.5) * H;
  const bay = (x: number, z: number) => {
    g.strokeStyle = "#e8b10a";
    g.lineWidth = 5;
    const w = (1.5 / DEPTH) * W;
    const h = (1.3 / (HALF * 2)) * H;
    g.strokeRect(px(x) - w / 2, py(z) - h / 2, w, h);
  };
  if (kind === "pickup") PALLETS.forEach((pl) => bay(pl.staging[0], pl.staging[1]));
  else PALLETS.filter((pl) => !pl.toForklift).forEach((pl) => bay(pl.target[0], pl.target[1]));
  // forklift / walkway lane
  g.fillStyle = "rgba(232,177,10,0.9)";
  g.fillRect(px(WALL_X + 0.2), py(-1.9), px(EDGE - 0.6) - px(WALL_X + 0.2), 4);
  g.fillRect(px(WALL_X + 0.2), py(1.9), px(EDGE - 0.6) - px(WALL_X + 0.2), 4);
  // bay number
  g.save();
  g.translate(px(EDGE - 1.0), py(-3.2));
  g.rotate(Math.PI / 2);
  g.fillStyle = "rgba(30,30,30,0.55)";
  g.font = '700 46px "Helvetica Neue", Arial';
  g.fillText(kind === "pickup" ? "BAY 02" : "BAY 04", 0, 0);
  g.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function Dock({ kind, quality }: { kind: "pickup" | "dest"; quality: "high" | "low" }) {
  const m = useMats();
  const root = useRef<THREE.Group>(null!);
  const lip = useRef<THREE.Group>(null!);
  const shutter = useRef<THREE.Mesh>(null!);
  const inside = useRef<THREE.PointLight>(null!);
  const flood = useRef<(THREE.SpotLight | null)[]>([]);
  const floodTargets = useRef<(THREE.Object3D | null)[]>([]);

  const mats = useMemo(() => {
    const clad = new THREE.MeshStandardMaterial({ map: cladding([1, 1]), roughness: 0.8, metalness: 0.1 });
    const top = new THREE.MeshStandardMaterial({ map: platformTexture(kind), roughness: 0.92 });
    const slab = new THREE.MeshStandardMaterial({ map: concrete([1, 1]), roughness: 0.95 });
    const haz = new THREE.MeshStandardMaterial({ map: hazard(), roughness: 0.6 });
    const shut = new THREE.MeshStandardMaterial({ map: shutterTex(), roughness: 0.5, metalness: 0.6 });
    const sign = new THREE.MeshStandardMaterial({
      map: facadeSign(kind === "pickup" ? company.pickupFacility : company.destinationFacility),
      roughness: 0.6,
      emissive: "#ffffff",
      emissiveIntensity: 0,
    });
    sign.emissiveMap = sign.map;
    const warm = new THREE.MeshStandardMaterial({ color: "#3a3631", emissive: "#ffcf96", emissiveIntensity: 0.3 });
    const rack = new THREE.MeshStandardMaterial({ color: "#ff5a1f", roughness: 0.6 });
    return { clad, top, slab, haz, shut, sign, warm, rack };
  }, [kind]);

  const frame = kind === "pickup" ? PICKUP_DOCK : DEST_DOCK;

  useFrame(() => {
    const p = progress.get();
    const night = nightAmount(p);
    let lipDown: number, open: number;
    if (kind === "pickup") {
      lipDown = 1 - ramp(p, BEATS.pickupLipUp[0], BEATS.pickupLipUp[1]);
      open = 1 - ramp(p, BEATS.pickupShutter[0], BEATS.pickupShutter[1]);
    } else {
      lipDown = ramp(p, BEATS.destLip[0], BEATS.destLip[1]);
      open = ramp(p, BEATS.destShutter[0], BEATS.destShutter[1]);
    }
    lip.current.rotation.z = THREE.MathUtils.lerp(-Math.PI / 2, -0.05, lipDown);
    const h = Math.max(0.001, 1 - open);
    shutter.current.scale.y = h;
    shutter.current.position.y = DOCK_H + OPEN_H - (OPEN_H * h) / 2;
    inside.current.intensity = open * (kind === "dest" ? 14 : 10);
    mats.warm.emissiveIntensity = 0.25 + open * 1.4;
    mats.sign.emissiveIntensity = night * 0.9;
    const fl = kind === "dest" ? night * 70 : 0;
    flood.current.forEach((s, i) => {
      if (!s) return;
      s.intensity = fl;
      if (floodTargets.current[i]) s.target = floodTargets.current[i]!;
    });
  });

  // wall pieces around three openings (z = -7, 0, 7)
  const openings = [-7, 0, 7];
  const segs: [number, number][] = [];
  {
    let z = -BW;
    openings.forEach((oz) => {
      segs.push([z, oz - OPEN_W / 2]);
      z = oz + OPEN_W / 2;
    });
    segs.push([z, BW]);
  }
  const wallT = 0.4;
  const wx = WALL_X - wallT / 2;

  return (
    <group ref={root} position={[frame.x, 0, frame.z]} rotation={[0, frame.yaw, 0]}>
      {/* yard slab */}
      <mesh position={[kind === "pickup" ? 16 : 6, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={mats.slab}>
        <planeGeometry args={[kind === "pickup" ? 33 : 13, 40]} />
      </mesh>

      {/* platform */}
      <Box size={[DEPTH, DOCK_H, HALF * 2]} pos={[EDGE - DEPTH / 2, DOCK_H / 2, 0]} mat={m.concrete} shadow />
      <mesh position={[EDGE - DEPTH / 2, DOCK_H + 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.top} receiveShadow>
        <planeGeometry args={[DEPTH, HALF * 2]} />
      </mesh>
      <mesh position={[EDGE + 0.002, DOCK_H - 0.14, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.haz}>
        <planeGeometry args={[HALF * 2, 0.28]} />
      </mesh>
      {/* dock bumpers */}
      {[1.0, -1.0, 8, 6, -6, -8].map((z) => (
        <Box key={z} size={[0.12, 0.42, 0.26]} pos={[EDGE + 0.06, DOCK_H - 0.3, z]} mat={m.rubber} />
      ))}
      {/* leveler lip (hinged at the platform edge) */}
      <group ref={lip} position={[EDGE, DOCK_H, 0]}>
        <Box size={[0.55, 0.04, 2.0]} pos={[0.275, -0.02, 0]} mat={m.alu} shadow />
      </group>
      {/* bollards */}
      {[-HALF - 0.6, HALF + 0.6].map((z) => (
        <mesh key={z} position={[EDGE + 0.6, 0.6, z]} material={m.yellow} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 1.2, 12]} />
        </mesh>
      ))}

      {/* facade */}
      {segs.map(([a, b]) => (
        <Box key={a} size={[wallT, OPEN_H, b - a]} pos={[wx, DOCK_H + OPEN_H / 2, (a + b) / 2]} mat={mats.clad} uvScale={1.5} shadow />
      ))}
      <Box size={[wallT, BH - DOCK_H - OPEN_H, BW * 2]} pos={[wx, (BH + DOCK_H + OPEN_H) / 2, 0]} mat={mats.clad} uvScale={1.5} shadow />
      <Box size={[wallT, DOCK_H, BW * 2]} pos={[wx, DOCK_H / 2, 0]} mat={m.concrete} />
      {/* dark band + sign */}
      <Box size={[0.1, 0.5, BW * 2]} pos={[WALL_X + 0.05, BH - 0.25, 0]} mat={m.dark} />
      <mesh position={[WALL_X + 0.03, 8.2, 0]} rotation={[0, Math.PI / 2, 0]} material={mats.sign}>
        <planeGeometry args={[10, 2.5]} />
      </mesh>
      {/* shell */}
      <Box size={[BD, BH, wallT]} pos={[WALL_X - BD / 2, BH / 2, BW]} mat={mats.clad} uvScale={1.5} shadow />
      <Box size={[BD, BH, wallT]} pos={[WALL_X - BD / 2, BH / 2, -BW]} mat={mats.clad} uvScale={1.5} shadow />
      <Box size={[wallT, BH, BW * 2]} pos={[WALL_X - BD, BH / 2, 0]} mat={mats.warm} />
      <Box size={[BD, 0.3, BW * 2 + 0.4]} pos={[WALL_X - BD / 2, BH, 0]} mat={m.graphite} shadow />
      <Box size={[BD, DOCK_H, BW * 2]} pos={[WALL_X - BD / 2, DOCK_H / 2, 0]} mat={m.concrete} />
      {/* interior: racking + ceiling light */}
      {[-4.5, 4.5].map((z) =>
        [0, 1, 2].map((i) => (
          <group key={`${z}${i}`} position={[WALL_X - 8 - i * 6, DOCK_H, z]}>
            <Box size={[5, 0.12, 1.4]} pos={[0, 2.2, 0]} mat={mats.rack} />
            <Box size={[5, 0.12, 1.4]} pos={[0, 4.4, 0]} mat={mats.rack} />
            <Box size={[4.6, 1.4, 1.1]} pos={[0, 0.7, 0]} mat={m.palletWood} />
            <Box size={[4.6, 1.3, 1.1]} pos={[0, 2.95, 0]} mat={m.interior} />
          </group>
        )),
      )}
      <Box size={[BD - 2, 0.08, 0.3]} pos={[WALL_X - BD / 2, BH - 0.6, 0]} mat={m.coolLamp} />
      <pointLight ref={inside} position={[WALL_X - 5, BH - 3, 0]} intensity={0} distance={26} decay={1.4} color="#ffe2b8" />

      {/* doors: active shutter (animated) + two closed bays */}
      <mesh ref={shutter} position={[WALL_X - 0.1, DOCK_H + OPEN_H / 2, 0]} material={mats.shut}>
        <boxGeometry args={[0.08, OPEN_H, OPEN_W]} />
      </mesh>
      {openings.map((z) => (
        <group key={z}>
          {z !== 0 && (
            <mesh position={[WALL_X - 0.1, DOCK_H + OPEN_H / 2, z]} material={mats.shut}>
              <boxGeometry args={[0.08, OPEN_H, OPEN_W]} />
            </mesh>
          )}
          <Box size={[0.6, 0.55, OPEN_W + 0.3]} pos={[WALL_X + 0.1, DOCK_H + OPEN_H + 0.28, z]} mat={m.graphite} />
          <Box size={[0.12, 0.07, OPEN_W - 0.4]} pos={[WALL_X + 0.42, DOCK_H + OPEN_H + 0.05, z]} mat={m.coolLamp} />
          <Box size={[0.25, 0.25, 0.25]} pos={[WALL_X + 0.2, DOCK_H + 3.2, z + OPEN_W / 2 + 0.4]} mat={m.lamp} />
        </group>
      ))}

      {/* flood light masts */}
      {[-HALF - 1.2, HALF + 1.2].map((z, i) => (
        <group key={z} position={[EDGE + 1.4, 0, z]}>
          <mesh material={m.graphite} position={[0, 4.5, 0]}>
            <cylinderGeometry args={[0.09, 0.12, 9, 10]} />
          </mesh>
          <Box size={[0.5, 0.25, 0.9]} pos={[-0.25, 9, -Math.sign(z) * 0.3]} mat={m.lamp} />
          {kind === "dest" && quality === "high" && (
            <>
              <spotLight
                ref={(el) => void (flood.current[i] = el)}
                position={[-0.3, 8.8, -Math.sign(z) * 0.3]}
                angle={0.75}
                penumbra={0.8}
                distance={40}
                decay={1.3}
                intensity={0}
                color="#ffe6c4"
              />
              <object3D ref={(el) => void (floodTargets.current[i] = el)} position={[-5, 0, -z * 0.7]} />
            </>
          )}
        </group>
      ))}
    </group>
  );
}
