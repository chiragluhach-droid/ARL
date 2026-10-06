"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import { DK, LF, forwardX } from "@/lib/journey";
import { route } from "@/lib/content";
import { highwaySign, road as roadTex } from "@/lib/textures";
import { useMats } from "./materials";
import { Inst, rng, type InstItem } from "./util";

const ROAD_START = -10;
const ROAD_END = LF + 700;

/** Zone boundaries are expressed in journey progress, then mapped to road distance. */
function zones() {
  const X = (p: number) => forwardX(p) + 6;
  return {
    industrial: [60, X(0.35)] as const,
    highway: [X(0.32), X(0.53)] as const,
    open: [X(0.46), X(0.715)] as const,
    city: [X(0.68), ROAD_END] as const,
  };
}

/**
 * Keep props off the road, out of the two facilities, and out of the camera's corridor:
 * low tracking shots sit up to ~30 m off the road on the +Z verge, so nothing may stand
 * between them and the truck (or the camera would fly through it).
 */
const CAMERA_CORRIDOR = 48;
function clear(x: number, z: number, pad = 0) {
  if (Math.abs(z) < 9 + pad) return false;
  if (z > 0 && z < CAMERA_CORRIDOR + pad) return false;
  if (x > -50 - pad && x < 45 + pad && z > -35 - pad && z < 28 + pad) return false;
  if (x > DK - 32 - pad && x < DK + 45 + pad && z > -58 - pad && z < 9 + pad) return false;
  return true;
}

function groundColor(x: number, Z: ReturnType<typeof zones>) {
  const stops: [number, string][] = [
    [-200, "#cfc7b6"],
    [60, "#cbc1aa"],
    [Z.industrial[1], "#c2b693"],
    [Z.highway[1], "#b3ab7e"],
    [(Z.open[0] + Z.open[1]) / 2, "#9da46a"],
    [Z.open[1], "#9a9a7a"],
    [Z.city[0] + 200, "#9e9b90"],
    [ROAD_END + 800, "#a3a096"],
  ];
  const c = new THREE.Color();
  for (let i = 0; i < stops.length - 1; i++) {
    const [x0, c0] = stops[i];
    const [x1, c1] = stops[i + 1];
    if (x <= x1) {
      const t = THREE.MathUtils.clamp((x - x0) / (x1 - x0), 0, 1);
      return c.set(c0).lerp(new THREE.Color(c1), t);
    }
  }
  return c.set(stops[stops.length - 1][1]);
}

export default function World({ quality }: { quality: "high" | "low" }) {
  const m = useMats();
  const hi = quality === "high";
  const Z = useMemo(zones, []);

  /* ---------- ground ---------- */
  const ground = useMemo(() => {
    const len = ROAD_END + 1600;
    const g = new THREE.PlaneGeometry(len, 2400, 260, 1);
    g.rotateX(-Math.PI / 2);
    g.translate(len / 2 - 800, 0, 0);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const c = groundColor(pos.getX(i), Z);
      cols.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(cols, 3));
    return g;
  }, [Z]);
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), []);

  /* ---------- road ---------- */
  const roadLen = ROAD_END - ROAD_START;
  const roadMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: roadTex(roadLen), roughness: 0.88 }),
    [roadLen],
  );
  const shoulderMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#9d927e", roughness: 1 }), []);

  /* ---------- props ---------- */
  const props = useMemo(() => {
    const r = rng(48);
    const trees: InstItem[] = [];
    const crowns: InstItem[] = [];
    const sheds: InstItem[] = [];
    const roofs: InstItem[] = [];
    const containers: InstItem[] = [];
    const chimneys: InstItem[] = [];
    const towers: InstItem[] = [];
    const fields: InstItem[] = [];
    const hills: InstItem[] = [];
    const lamps: InstItem[] = [];
    const rails: InstItem[] = [];
    const posts: InstItem[] = [];
    const stones: InstItem[] = [];
    const clouds: InstItem[] = [];

    const treeCols = ["#5f7a3a", "#6f8a43", "#4f6a33", "#7d8f4a", "#8a8f52", "#5a6e3c"];
    const addTree = (x: number, z: number, s = 1) => {
      if (!clear(x, z, 2)) return;
      const h = (3 + r() * 4) * s;
      trees.push({ p: [x, 0, z], s: [1, h, 1] });
      const cs = (2.2 + r() * 2.4) * s;
      crowns.push({
        p: [x, h + cs * 0.55, z],
        s: [cs, cs * (0.8 + r() * 0.5), cs],
        r: r() * 6,
        c: treeCols[Math.floor(r() * treeCols.length)],
      });
    };

    // trees — density varies by zone
    const treeN = hi ? 1100 : 450;
    for (let i = 0; i < treeN; i++) {
      const x = -60 + r() * (ROAD_END + 100);
      const inOpen = x > Z.open[0] && x < Z.open[1];
      const inCity = x > Z.city[0] + 150;
      if (inCity && r() > 0.25) continue;
      const side = r() > 0.4 ? -1 : 1;
      const z = side * (10 + Math.pow(r(), 1.6) * (inOpen ? 260 : 160));
      addTree(x, z, inOpen ? 1.1 : 0.9);
      // roadside rows (neem/babul lines along the NH)
      if (inOpen && r() > 0.55) addTree(x + 6, side * (11 + r() * 3), 1.0);
    }

    // industrial belt
    const shedCols = ["#d9d5cd", "#c4c8cb", "#bdb6aa", "#e3ded4", "#a9adb0"];
    for (let x = Z.industrial[0]; x < Z.industrial[1]; x += 22 + r() * 30) {
      for (const side of [-1, 1]) {
        if (r() > 0.75) continue;
        const w = 22 + r() * 35;
        const d = 16 + r() * 26;
        const h = 6 + r() * 7;
        const z = side * (22 + d / 2 + r() * 70);
        if (!clear(x, z, 12)) continue;
        const col = shedCols[Math.floor(r() * shedCols.length)];
        sheds.push({ p: [x, h / 2, z], s: [w, h, d], c: col });
        roofs.push({ p: [x, h, z], s: [w + 0.6, 2 + r() * 2, d + 0.6], c: r() > 0.5 ? "#7d8489" : "#a3a8ac" });
        if (r() > 0.82) chimneys.push({ p: [x + w * 0.3, 0, z - side * d * 0.3], s: [1, 22 + r() * 18, 1] });
      }
    }
    // container yard near the pickup + along the industrial belt
    const boxCols = ["#a8493a", "#2f5d7c", "#c98a2e", "#5c6b4a", "#8a8f94", "#ff5a1f", "#3f4a55"];
    const yard = (cx: number, cz: number, rows: number, cols: number) => {
      for (let i = 0; i < rows; i++)
        for (let j = 0; j < cols; j++) {
          const stack = 1 + Math.floor(r() * 3);
          for (let k = 0; k < stack; k++)
            containers.push({
              p: [cx + i * 6.4, 1.3 + k * 2.6, cz + j * 2.6],
              s: [1, 1, 1],
              c: boxCols[Math.floor(r() * boxCols.length)],
            });
        }
    };
    yard(55, -48, 6, 5);
    yard(55, 34, 5, 4);
    yard(Z.industrial[0] + 220, -60, 8, 4);
    yard(Z.industrial[0] + 420, 40, 6, 5);

    // lamp posts (industrial, highway, city)
    for (let x = 30; x < ROAD_END; x += 34) {
      const inZone =
        x < Z.highway[1] || x > Z.city[0] - 40;
      if (!inZone) continue;
      if (x > DK - 30 && x < DK + 45) continue;
      lamps.push({ p: [x, 0, -5.4], r: 0 });
      lamps.push({ p: [x + 17, 0, 5.4], r: Math.PI });
    }

    // guard rails + posts on the highway stretch
    rails.push({ p: [(Z.highway[0] + Z.open[1]) / 2, 0.62, -4.6], s: [Z.open[1] - Z.highway[0], 1, 1] });
    rails.push({ p: [(Z.highway[0] + Z.open[1]) / 2, 0.62, 4.6], s: [Z.open[1] - Z.highway[0], 1, 1] });
    for (let x = Z.highway[0]; x < Z.open[1]; x += hi ? 4 : 8) {
      posts.push({ p: [x, 0.4, -4.65] });
      posts.push({ p: [x, 0.4, 4.65] });
    }
    // NH milestones (white body, yellow cap) on the left verge
    for (let x = 120; x < Z.city[0]; x += 90) stones.push({ p: [x, 0, -5.6], r: Math.PI / 2 });

    // fields (mustard, wheat, fallow) across open country
    const fieldCols = ["#d6b443", "#8fa250", "#b79d5e", "#a3b05a", "#c9b778", "#7f9448"];
    let fi = 0;
    for (let x = Z.highway[0] + 100; x < Z.open[1] + 100; x += 30 + r() * 50) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < 3; k++) {
          const w = 30 + r() * 80;
          const d = 25 + r() * 60;
          const z = side * (14 + d / 2 + k * 70 + r() * 30);
          fields.push({
            p: [x, 0.03 + (fi++ % 40) * 0.002, z],
            s: [w, 0.04, d],
            r: (r() - 0.5) * 0.1,
            c: fieldCols[Math.floor(r() * fieldCols.length)],
          });
        }
      }
    }

    // distant hills (Aravalli silhouettes), behind everything
    for (let x = -300; x < ROAD_END + 500; x += 120 + r() * 160) {
      for (const side of [-1, 1]) {
        if (side === 1 && r() > 0.5) continue;
        hills.push({
          p: [x, -6, side * (380 + r() * 260)],
          s: [140 + r() * 200, 30 + r() * 55, 90 + r() * 90],
          c: r() > 0.5 ? "#9d9a86" : "#8f8f7d",
        });
      }
    }

    // city
    const towerCols = ["#c9c7c2", "#b4b8bc", "#d8d4cc", "#9ea4aa", "#bfb5a6", "#e1ddd6"];
    for (let x = Z.city[0]; x < ROAD_END + 300; x += 14 + r() * 20) {
      for (const side of [-1, 1]) {
        for (let k = 0; k < (hi ? 3 : 2); k++) {
          const w = 12 + r() * 18;
          const d = 12 + r() * 18;
          const dist = 26 + k * 55 + r() * 40;
          const z = side * dist;
          if (!clear(x, z, 14)) continue;
          const ramp = THREE.MathUtils.clamp((x - Z.city[0]) / 250, 0.25, 1);
          const h = (14 + r() * 26 + k * 24 * r()) * ramp + 6;
          towers.push({ p: [x, h / 2, z], s: [w, h, d], c: towerCols[Math.floor(r() * towerCols.length)] });
        }
      }
    }

    // clouds — puffs clustered, mostly on the far side of the road
    for (let i = 0; i < (hi ? 46 : 24); i++) {
      const cx = -200 + r() * (ROAD_END + 400);
      const cz = (r() > 0.25 ? -1 : 1) * (180 + r() * 520);
      const cy = 95 + r() * 70;
      const n = 3 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const s = 14 + r() * 18;
        clouds.push({ p: [cx + (k - n / 2) * s * 0.9, cy + r() * 6, cz + r() * 12], s: [s * 1.4, s * 0.62, s] });
      }
    }

    return { trees, crowns, sheds, roofs, containers, chimneys, towers, fields, hills, lamps, rails, posts, stones, clouds };
  }, [Z, hi]);

  const geos = useMemo(() => {
    const trunk = new THREE.CylinderGeometry(0.12, 0.2, 1, 6);
    trunk.translate(0, 0.5, 0);
    const crown = new THREE.IcosahedronGeometry(0.5, 1);
    const box = new THREE.BoxGeometry(1, 1, 1);
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-0.5, 0);
    roofShape.lineTo(0.5, 0);
    roofShape.lineTo(0, 1);
    roofShape.closePath();
    const roof = new THREE.ExtrudeGeometry(roofShape, { depth: 1, bevelEnabled: false });
    roof.translate(0, 0, -0.5);
    roof.rotateY(Math.PI / 2);
    const container = new THREE.BoxGeometry(6.06, 2.59, 2.44);
    const chimney = new THREE.CylinderGeometry(0.9, 1.3, 1, 12);
    chimney.translate(0, 0.5, 0);
    const pole = new THREE.CylinderGeometry(0.08, 0.12, 9, 6);
    pole.translate(0, 4.5, 0);
    const arm = new THREE.BoxGeometry(0.08, 0.08, 2.4);
    arm.translate(0, 8.95, 1.2);
    const head = new THREE.BoxGeometry(0.3, 0.1, 0.8);
    head.translate(0, 8.88, 2.1);
    const rail = new THREE.BoxGeometry(1, 0.32, 0.05);
    const post = new THREE.BoxGeometry(0.12, 0.8, 0.12);
    const stone = new THREE.BoxGeometry(0.2, 0.55, 0.42);
    stone.translate(0, 0.275, 0);
    const cap = new THREE.CylinderGeometry(0.21, 0.21, 0.2, 12, 1, false, 0, Math.PI);
    cap.rotateZ(Math.PI / 2);
    cap.rotateY(Math.PI / 2);
    cap.translate(0, 0.55, 0);
    const hill = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const puff = new THREE.IcosahedronGeometry(1, 2);
    return { trunk, crown, box, roof, container, chimney, pole, arm, head, rail, post, stone, cap, hill, puff };
  }, []);

  const trunkMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b5a46", roughness: 1 }), []);
  const stoneMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#efede6", roughness: 0.8 }), []);

  /* ---------- gantries with live distances ---------- */
  const gantries = useMemo(() => {
    return [0.37, 0.6, 0.67].map((p) => {
      const x = forwardX(p) + 120;
      const km = Math.round((route.totalKm * x) / LF);
      const ahead = route.stops.filter((s) => s.km > km + 5).slice(0, 2);
      const lines = ahead.map((s) => [s.name.toUpperCase(), `${s.km - km} km`] as [string, string]);
      return { x, tex: highwaySign(lines.length === 2 ? lines : [...lines, ["", ""]]) };
    });
  }, []);

  return (
    <group>
      <mesh geometry={ground} material={groundMat} receiveShadow />
      {/* road + shoulders */}
      <mesh position={[(ROAD_START + ROAD_END) / 2, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={roadMat} receiveShadow>
        <planeGeometry args={[roadLen, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(ROAD_START + ROAD_END) / 2, 0.012, s * 4.9]} rotation={[-Math.PI / 2, 0, 0]} material={shoulderMat} receiveShadow>
          <planeGeometry args={[roadLen, 1.8]} />
        </mesh>
      ))}

      <Inst geo={geos.trunk} mat={trunkMat} items={props.trees} />
      <Inst geo={geos.crown} mat={m.foliage} items={props.crowns} shadow={hi} />
      <Inst geo={geos.box} mat={m.tint} items={props.sheds} shadow={hi} receive />
      <Inst geo={geos.roof} mat={m.tint} items={props.roofs} />
      <Inst geo={geos.container} mat={m.tint} items={props.containers} shadow={hi} receive />
      <Inst geo={geos.chimney} mat={m.concrete} items={props.chimneys} />
      <Inst geo={geos.box} mat={m.building} items={props.towers} receive />
      <Inst geo={geos.box} mat={m.tint} items={props.fields} receive />
      <Inst geo={geos.hill} mat={m.tint} items={props.hills} />
      <Inst geo={geos.pole} mat={m.graphite} items={props.lamps} />
      <Inst geo={geos.arm} mat={m.graphite} items={props.lamps} />
      <Inst geo={geos.head} mat={m.lamp} items={props.lamps} />
      <Inst geo={geos.rail} mat={m.alu} items={props.rails} />
      <Inst geo={geos.post} mat={m.graphite} items={props.posts} />
      <Inst geo={geos.stone} mat={stoneMat} items={props.stones} />
      <Inst geo={geos.cap} mat={m.yellow} items={props.stones} />
      <Inst geo={geos.puff} mat={m.cloud} items={props.clouds} />

      {gantries.map((g) => (
        <group key={g.x} position={[g.x, 0, 0]}>
          {[-5.8, 5.8].map((z) => (
            <mesh key={z} position={[0, 3.9, z]} material={m.graphite}>
              <cylinderGeometry args={[0.18, 0.22, 7.8, 10]} />
            </mesh>
          ))}
          <mesh position={[0, 7.4, 0]} material={m.graphite}>
            <boxGeometry args={[0.3, 0.3, 12]} />
          </mesh>
          <mesh position={[-0.2, 7.6, -1.85]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[6.4, 2.4]} />
            <meshStandardMaterial map={g.tex} roughness={0.5} emissive="#ffffff" emissiveMap={g.tex} emissiveIntensity={0.08} />
          </mesh>
          <mesh position={[0, 7.6, -1.85]} material={m.dark}>
            <boxGeometry args={[0.25, 2.5, 6.5]} />
          </mesh>
        </group>
      ))}

      <Turbines from={Z.open[0]} to={Z.open[1]} count={hi ? 9 : 5} />
    </group>
  );
}

/** Wind turbines on the Gujarat stretch — rotors turn with scroll. */
function Turbines({ from, to, count }: { from: number; to: number; count: number }) {
  const m = useMats();
  const rotors = useRef<(THREE.Group | null)[]>([]);
  const list = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: count }).map((_, i) => ({
      x: from + ((i + 0.5) / count) * (to - from) + (r() - 0.5) * 60,
      z: (i % 3 === 0 ? 1 : -1) * (110 + r() * 120),
      s: 0.85 + r() * 0.3,
      ph: r() * 6,
    }));
  }, [from, to, count]);
  useFrame(() => {
    const p = progress.get();
    rotors.current.forEach((g, i) => g && (g.rotation.z = p * 90 + list[i].ph));
  });
  return (
    <>
      {list.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 32, 0]} material={m.tint}>
            <cylinderGeometry args={[0.9, 1.7, 64, 12]} />
          </mesh>
          <mesh position={[0, 64.5, -1.2]} material={m.tint}>
            <boxGeometry args={[2.4, 2.6, 6]} />
          </mesh>
          <group position={[0, 64.5, 2]} ref={(el) => void (rotors.current[i] = el)}>
            <mesh material={m.tint} rotation={[Math.PI / 2, 0, 0]}>
              <coneGeometry args={[1.2, 2.4, 12]} />
            </mesh>
            {[0, 1, 2].map((k) => (
              <mesh key={k} material={m.tint} rotation={[0, 0, (k * Math.PI * 2) / 3]} position={[0, 0, 0]}>
                <boxGeometry args={[1.6, 0.25, 0.4]} />
                <mesh position={[0, 15.5, 0]}>
                  <boxGeometry args={[1.4, 30, 0.25]} />
                  <meshStandardMaterial color="#f2f2ef" roughness={0.6} />
                </mesh>
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </>
  );
}
