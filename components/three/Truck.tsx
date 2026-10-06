"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { progress } from "@/lib/progress";
import {
  BEATS,
  TRUCK,
  bodyMatrix,
  nightAmount,
  ramp,
  truckMatrix,
  truckPose,
} from "@/lib/journey";
import { containerDoor, containerSide, plate } from "@/lib/textures";
import { useMats, type Mats } from "./materials";

type V3 = [number, number, number];

function Box({
  size,
  pos,
  mat,
  rot,
  shadow = true,
}: {
  size: V3;
  pos: V3;
  mat: THREE.Material | THREE.Material[];
  rot?: V3;
  shadow?: boolean;
}) {
  return (
    <mesh position={pos} rotation={rot} material={mat} castShadow={shadow} receiveShadow={shadow}>
      <boxGeometry args={size} />
    </mesh>
  );
}

/* ---------------- wheels ---------------- */

function useTyreGeometry() {
  return useMemo(() => {
    const R = TRUCK.wheelR;
    const w = 0.3;
    const pts: THREE.Vector2[] = [];
    const inner = 0.31;
    pts.push(new THREE.Vector2(inner, -w / 2));
    pts.push(new THREE.Vector2(R - 0.06, -w / 2));
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(R - 0.06 + Math.cos(a) * 0.06, -w / 2 + 0.06 + Math.sin(a) * 0.06));
    }
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(R - 0.06 + Math.cos(a) * 0.06, w / 2 - 0.06 + Math.sin(a) * 0.06));
    }
    pts.push(new THREE.Vector2(inner, w / 2));
    const g = new THREE.LatheGeometry(pts, 36);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
}

function Wheel({ m, dual, side }: { m: Mats; dual: boolean; side: 1 | -1 }) {
  const tyre = useTyreGeometry();
  const offsets = dual ? [0, -0.31 * side] : [0];
  return (
    <>
      {offsets.map((o, i) => (
        <group key={i} position={[0, 0, o]}>
          <mesh geometry={tyre} material={m.rubber} castShadow />
          {/* rim */}
          <mesh material={m.alu} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.31, 0.31, 0.26, 28]} />
          </mesh>
        </group>
      ))}
      {/* outer face: hub + studs (makes rotation readable) */}
      <group position={[0, 0, 0.14 * side]}>
        <mesh material={m.chrome} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.15, 0.06, 20]} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              material={m.dark}
              position={[Math.cos(a) * 0.22, Math.sin(a) * 0.22, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.035, 0.035, 0.05, 8]} />
            </mesh>
          );
        })}
        <mesh material={m.signal} position={[0.255, 0, 0.02]}>
          <boxGeometry args={[0.05, 0.05, 0.02]} />
        </mesh>
      </group>
    </>
  );
}

/* ---------------- light cone (headlight volume) ---------------- */

const coneMat = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: { uI: { value: 0 } },
    vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
    fragmentShader: `uniform float uI; varying float vY; void main(){ float a = pow(vY, 2.2) * uI; gl_FragColor = vec4(vec3(1.0,0.93,0.8)*a, a);} `,
  });

/* ---------------- the truck ---------------- */

export default function Truck({ quality }: { quality: "high" | "low" }) {
  const m = useMats();
  const chassis = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Group>(null!);
  const wheels = useRef<(THREE.Group | null)[]>([]);
  const steerers = useRef<(THREE.Group | null)[]>([]);
  const doorL = useRef<THREE.Group>(null!);
  const doorR = useRef<THREE.Group>(null!);
  const spotL = useRef<THREE.SpotLight>(null);
  const spotR = useRef<THREE.SpotLight>(null);
  const tgtL = useRef<THREE.Object3D>(null!);
  const tgtR = useRef<THREE.Object3D>(null!);
  const inside = useRef<THREE.PointLight>(null!);
  const cone = useMemo(coneMat, []);

  const mats = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({
      map: containerSide(),
      roughness: 0.5,
      metalness: 0.35,
    });
    const door = new THREE.MeshStandardMaterial({ map: containerDoor(), roughness: 0.5, metalness: 0.35 });
    const plateM = new THREE.MeshStandardMaterial({ map: plate(), roughness: 0.4 });
    const interiorLight = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      emissive: "#fff3dc",
      emissiveIntensity: 0,
    });
    const g = m.graphite;
    const i = m.interior;
    return {
      side,
      door,
      plateM,
      interiorLight,
      // box face order: +x, -x, +y, -y, +z, -z
      sidePos: [g, g, g, g, side, i] as THREE.Material[],
      sideNeg: [g, g, g, g, i, side] as THREE.Material[],
      roof: [g, g, g, i, g, g] as THREE.Material[],
    };
  }, [m]);

  useEffect(() => {
    if (spotL.current) spotL.current.target = tgtL.current;
    if (spotR.current) spotR.current.target = tgtR.current;
  }, []);

  useFrame(() => {
    const p = progress.get();
    const pose = truckPose(p);

    truckMatrix(p, chassis.current.matrix);
    chassis.current.matrixWorldNeedsUpdate = true;
    bodyMatrix(p, body.current.matrix);
    body.current.matrixWorldNeedsUpdate = true;

    const spin = -pose.odo / TRUCK.wheelR;
    wheels.current.forEach((w) => w && (w.rotation.z = spin));
    steerers.current.forEach((s) => s && (s.rotation.y = pose.steer));

    // doors: open at pickup → close before departure → open again in the yard
    const open = p < 0.5 ? 1 - ramp(p, BEATS.doorsClose[0], BEATS.doorsClose[1]) : ramp(p, BEATS.doorsOpen[0], BEATS.doorsOpen[1]);
    const a = open * Math.PI * 1.5 * 0.97;
    doorL.current.rotation.y = a;
    doorR.current.rotation.y = -a;

    const night = nightAmount(p);
    m.head.emissiveIntensity = 0.25 + night * 6;
    const blink = pose.reversing && Math.floor(p * 1400) % 2 === 0 ? 1 : 0;
    m.amber.emissiveIntensity = blink * 4;
    m.tail.emissiveIntensity = night * 1.2 + pose.braking * (p > 0.19 ? 3.2 : 0);
    m.reverse.emissiveIntensity = pose.reversing * 5;
    if (spotL.current) spotL.current.intensity = night * 260;
    if (spotR.current) spotR.current.intensity = night * 260;
    cone.uniforms.uI.value = night * 0.11;

    const lit = open > 0.02 ? Math.max(0.55, night) * open : 0;
    mats.interiorLight.emissiveIntensity = lit * 3;
    inside.current.intensity = lit * 14;
  });

  const L = 9.8; // container length
  const W = 2.5;
  const H = 2.6;
  const y0 = TRUCK.floorY;
  const yc = y0 + H / 2;

  const wheelDefs: { x: number; dual: boolean; steer: boolean }[] = [
    { x: 2.95, dual: true, steer: false },
    { x: 4.3, dual: true, steer: false },
    { x: 11.2, dual: false, steer: true },
  ];

  return (
    <>
      {/* ---------- CHASSIS (unsprung) ---------- */}
      <group ref={chassis} matrixAutoUpdate={false}>
        {wheelDefs.map((wd, wi) =>
          ([1, -1] as const).map((side, si) => (
            <group
              key={`${wi}${si}`}
              position={[wd.x, TRUCK.wheelR, side * (wd.dual ? 1.06 : 1.08)]}
              ref={(el) => {
                if (wd.steer) steerers.current[si] = el;
              }}
            >
              <group ref={(el) => void (wheels.current[wi * 2 + si] = el)}>
                <Wheel m={m} dual={wd.dual} side={side} />
              </group>
            </group>
          )),
        )}
        {/* axles */}
        {wheelDefs.map((wd) => (
          <mesh key={wd.x} material={m.dark} position={[wd.x, TRUCK.wheelR, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 2.0, 10]} />
          </mesh>
        ))}
        {[2.95, 4.3].map((x) => (
          <mesh key={x} material={m.dark} position={[x, TRUCK.wheelR, 0]}>
            <sphereGeometry args={[0.22, 14, 10]} />
          </mesh>
        ))}
        {/* frame rails */}
        <Box size={[11.8, 0.28, 0.12]} pos={[6.15, 0.92, 0.48]} mat={m.dark} />
        <Box size={[11.8, 0.28, 0.12]} pos={[6.15, 0.92, -0.48]} mat={m.dark} />
        {/* fuel tank + battery box */}
        <mesh material={m.alu} position={[8.9, 0.82, 0.9]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.28, 0.28, 1.25, 24]} />
        </mesh>
        <Box size={[0.9, 0.5, 0.5]} pos={[8.8, 0.82, -0.95]} mat={m.dark} />
        {/* side under-run guards */}
        {[1, -1].map((s) => (
          <group key={s}>
            <Box size={[4.4, 0.06, 0.04]} pos={[7.05, 0.58, s * 1.2]} mat={m.alu} shadow={false} />
            <Box size={[4.4, 0.06, 0.04]} pos={[7.05, 0.86, s * 1.2]} mat={m.alu} shadow={false} />
            <Box size={[0.02, 0.6, 0.6]} pos={[2.1, 0.5, s * 1.0]} mat={m.rubber} shadow={false} />
          </group>
        ))}
        {/* exhaust stack */}
        <mesh material={m.chrome} position={[9.93, 2.4, -0.95]}>
          <cylinderGeometry args={[0.075, 0.075, 2.9, 14]} />
        </mesh>
        {/* rear under-run bar with lamps + plate */}
        <Box size={[0.1, 0.2, 2.3]} pos={[-0.08, 0.72, 0]} mat={m.dark} />
        {[1, -1].map((s) => (
          <group key={s}>
            <Box size={[0.06, 0.14, 0.32]} pos={[-0.15, 0.74, s * 0.92]} mat={m.tail} shadow={false} />
            <Box size={[0.06, 0.1, 0.14]} pos={[-0.15, 0.74, s * 0.6]} mat={m.reverse} shadow={false} />
            <Box size={[0.06, 0.1, 0.12]} pos={[-0.15, 0.74, s * 1.14]} mat={m.amber} shadow={false} />
          </group>
        ))}
        <mesh material={mats.plateM} position={[-0.14, 0.52, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.52, 0.13]} />
        </mesh>
      </group>

      {/* ---------- BODY (sprung) ---------- */}
      <group ref={body} matrixAutoUpdate={false}>
        {/* container shell */}
        <Box size={[L, H, 0.05]} pos={[L / 2, yc, W / 2 - 0.025]} mat={mats.sidePos} />
        <Box size={[L, H, 0.05]} pos={[L / 2, yc, -W / 2 + 0.025]} mat={mats.sideNeg} />
        <Box size={[L, 0.06, W]} pos={[L / 2, y0 + H, 0]} mat={mats.roof} />
        <Box size={[L, 0.1, W - 0.1]} pos={[L / 2, y0 - 0.05, 0]} mat={m.wood} />
        <Box size={[0.06, H, W]} pos={[L - 0.03, yc, 0]} mat={m.graphite} />
        <Box size={[L, 0.25, W]} pos={[L / 2, y0 - 0.22, 0]} mat={m.dark} />
        {/* frame: corner posts, rails */}
        {[1, -1].map((s) => (
          <group key={s}>
            <Box size={[0.14, H + 0.1, 0.12]} pos={[0.07, yc, s * 1.21]} mat={m.graphite} />
            <Box size={[0.14, H + 0.1, 0.12]} pos={[L - 0.07, yc, s * 1.21]} mat={m.graphite} />
            <Box size={[L, 0.1, 0.1]} pos={[L / 2, y0 + H - 0.02, s * 1.24]} mat={m.graphite} />
            <Box size={[L, 0.16, 0.1]} pos={[L / 2, y0 + 0.05, s * 1.24]} mat={m.graphite} />
          </group>
        ))}
        <Box size={[0.14, 0.18, W]} pos={[0.07, y0 + H - 0.05, 0]} mat={m.graphite} />
        <Box size={[0.14, 0.12, W]} pos={[0.07, y0 + 0.02, 0]} mat={m.graphite} />
        {/* interior light strip + lamp */}
        <Box size={[8.5, 0.03, 0.12]} pos={[5, y0 + H - 0.06, 0]} mat={mats.interiorLight} shadow={false} />
        <pointLight ref={inside} position={[3.2, y0 + H - 0.4, 0]} intensity={0} distance={9} decay={1.6} color="#fff1d6" />

        {/* rear doors (hinged on the outer corner posts) */}
        <group ref={doorL} position={[-0.06, 0, 1.31]}>
          <Door m={m} mat={mats.door} side={1} />
        </group>
        <group ref={doorR} position={[-0.06, 0, -1.31]}>
          <Door m={m} mat={mats.door} side={-1} />
        </group>

        {/* ---------- CAB (cab-over) ---------- */}
        <RoundedBox args={[2.2, 2.15, 2.45]} radius={0.12} smoothness={4} position={[11.15, 2.225, 0]} material={m.paint} castShadow receiveShadow />
        {/* aero deflector to container height */}
        <Deflector m={m} />
        {/* windscreen */}
        <RoundedBox args={[0.06, 0.88, 2.22]} radius={0.03} position={[12.24, 2.76, 0]} rotation={[0, 0, 0.07]} material={m.glass} />
        <Box size={[0.3, 0.08, 2.32]} pos={[12.3, 3.28, 0]} mat={m.dark} />
        {/* side windows + door seams */}
        {[1, -1].map((s) => (
          <group key={s}>
            <Box size={[0.95, 0.72, 0.02]} pos={[11.62, 2.78, s * 1.23]} mat={m.glass} shadow={false} />
            <Box size={[0.02, 1.9, 0.02]} pos={[10.95, 2.2, s * 1.228]} mat={m.dark} shadow={false} />
            <Box size={[1.9, 0.12, 0.02]} pos={[11.15, 1.72, s * 1.229]} mat={m.signal} shadow={false} />
            {/* mirror arm + head */}
            <Box size={[0.04, 0.04, 0.32]} pos={[12.3, 2.9, s * 1.36]} mat={m.dark} shadow={false} />
            <Box size={[0.08, 0.5, 0.22]} pos={[12.36, 2.62, s * 1.5]} mat={m.dark} />
            {/* steps */}
            <Box size={[0.5, 0.05, 0.22]} pos={[11.5, 0.82, s * 1.17]} mat={m.alu} shadow={false} />
            <Box size={[0.5, 0.05, 0.22]} pos={[11.5, 1.12, s * 1.2]} mat={m.alu} shadow={false} />
          </group>
        ))}
        {/* face: signal band, grille, badge */}
        <Box size={[0.04, 0.12, 2.38]} pos={[12.26, 2.22, 0]} mat={m.signal} shadow={false} />
        <Box size={[0.04, 0.62, 1.7]} pos={[12.26, 1.78, 0]} mat={m.dark} shadow={false} />
        {[0, 1, 2, 3, 4].map((i) => (
          <Box key={i} size={[0.05, 0.035, 1.6]} pos={[12.28, 1.56 + i * 0.11, 0]} mat={m.graphite} shadow={false} />
        ))}
        <Box size={[0.03, 0.12, 0.36]} pos={[12.3, 2.0, 0]} mat={m.chrome} shadow={false} />
        {/* bumper + lamps */}
        <RoundedBox args={[0.36, 0.42, 2.5]} radius={0.05} position={[12.22, 1.0, 0]} material={m.graphite} castShadow />
        {[1, -1].map((s) => (
          <group key={s}>
            <Box size={[0.06, 0.16, 0.44]} pos={[12.41, 1.08, s * 0.86]} mat={m.head} shadow={false} />
            <Box size={[0.05, 0.05, 0.44]} pos={[12.41, 1.2, s * 0.86]} mat={m.head} shadow={false} />
            <Box size={[0.06, 0.08, 0.12]} pos={[12.41, 1.08, s * 1.16]} mat={m.amber} shadow={false} />
            <object3D ref={s === 1 ? tgtL : tgtR} position={[40, -1.2, s * 2.5]} />
            <mesh material={cone} position={[12.45 + 9, 0.95, s * 0.86]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[2.8, 18, 24, 1, true]} />
            </mesh>
          </group>
        ))}
        <mesh material={mats.plateM} position={[12.41, 0.86, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.52, 0.13]} />
        </mesh>
        {quality === "high" && (
          <>
            <spotLight ref={spotL} position={[12.5, 1.1, 0.86]} angle={0.42} penumbra={0.7} distance={70} decay={1.4} intensity={0} color="#fff1d8" />
            <spotLight ref={spotR} position={[12.5, 1.1, -0.86]} angle={0.42} penumbra={0.7} distance={70} decay={1.4} intensity={0} color="#fff1d8" />
          </>
        )}
      </group>
    </>
  );
}

function Door({ m, mat, side }: { m: Mats; mat: THREE.Material; side: 1 | -1 }) {
  const y0 = TRUCK.floorY;
  const dz = -0.65 * side;
  return (
    <group>
      <Box size={[0.05, 2.52, 1.27]} pos={[0, y0 + 1.31, dz]} mat={mat} />
      {[0.32, 0.98].map((o) => (
        <mesh key={o} material={m.chrome} position={[-0.045, y0 + 1.31, -o * side]}>
          <cylinderGeometry args={[0.022, 0.022, 2.5, 8]} />
        </mesh>
      ))}
      {[0.32, 0.98].map((o) => (
        <Box key={o} size={[0.05, 0.05, 0.22]} pos={[-0.06, y0 + 1.1, -(o + 0.1) * side]} mat={m.chrome} shadow={false} />
      ))}
      {[0.45, 2.2].map((y) => (
        <Box key={y} size={[0.06, 0.12, 0.08]} pos={[-0.03, y0 + y, -0.02 * side]} mat={m.dark} shadow={false} />
      ))}
    </group>
  );
}

function Deflector({ m }: { m: Mats }) {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(11.9, 3.28);
    s.lineTo(10.12, 3.28);
    s.lineTo(10.12, 3.86);
    s.lineTo(10.55, 3.86);
    s.quadraticCurveTo(11.3, 3.75, 11.9, 3.28);
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.34, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2 });
    g.translate(0, 0, -1.17);
    return g;
  }, []);
  return <mesh geometry={geo} material={m.paint} castShadow />;
}
