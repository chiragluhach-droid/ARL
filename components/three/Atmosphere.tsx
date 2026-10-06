"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { progress } from "@/lib/progress";
import { TRUCK, invLerp, nightAmount, smooth, truckPose } from "@/lib/journey";
import { useMats, windowUniform } from "./materials";

/** Time-of-day keys: morning pickup → bright highway → golden hour → dusk → night dock. */
const KEYS = [
  { p: 0.0, top: "#a3b9cc", hor: "#ece6da", sun: "#fff0d8", sunI: 2.7, hemi: 1.15, dir: [0.55, 0.62, 0.56], fog: [70, 560], exp: 1.0, cloud: "#ffffff" },
  { p: 0.3, top: "#88a9c8", hor: "#e9ebe7", sun: "#fff6ea", sunI: 3.0, hemi: 1.15, dir: [0.35, 0.82, 0.5], fog: [90, 700], exp: 1.0, cloud: "#ffffff" },
  { p: 0.5, top: "#7fa2c4", hor: "#e5e9e8", sun: "#fff6ea", sunI: 3.0, hemi: 1.1, dir: [0.4, 0.8, 0.45], fog: [140, 1050], exp: 1.0, cloud: "#ffffff" },
  { p: 0.6, top: "#8e9db2", hor: "#f1cf9b", sun: "#ffd29a", sunI: 2.6, hemi: 0.95, dir: [0.9, 0.26, -0.33], fog: [90, 700], exp: 1.0, cloud: "#ffe6c8" },
  { p: 0.665, top: "#58617f", hor: "#ef955b", sun: "#ff9c5a", sunI: 1.9, hemi: 0.7, dir: [1, 0.09, -0.3], fog: [70, 560], exp: 1.05, cloud: "#f2a582" },
  { p: 0.72, top: "#273050", hor: "#b0605a", sun: "#ff7a4c", sunI: 0.7, hemi: 0.42, dir: [1, 0.03, -0.3], fog: [60, 480], exp: 1.12, cloud: "#7f6a80" },
  { p: 0.79, top: "#111a2d", hor: "#463a54", sun: "#9aa6d8", sunI: 0.45, hemi: 0.3, dir: [-0.35, 0.7, 0.55], fog: [60, 430], exp: 1.2, cloud: "#3a3f58" },
  { p: 1.0, top: "#0c1220", hor: "#2d2b40", sun: "#9aa6d8", sunI: 0.4, hemi: 0.28, dir: [-0.35, 0.7, 0.55], fog: [60, 430], exp: 1.2, cloud: "#30344a" },
] as const;

const cA = new THREE.Color();
const cB = new THREE.Color();
function mixColor(out: THREE.Color, a: string, b: string, t: number) {
  return out.copy(cA.set(a)).lerp(cB.set(b), t);
}

export default function Atmosphere({ quality }: { quality: "high" | "low" }) {
  const { scene, gl, camera } = useThree();
  const m = useMats();
  const sun = useRef<THREE.DirectionalLight>(null!);
  const hemi = useRef<THREE.HemisphereLight>(null!);
  const sky = useRef<THREE.Mesh>(null!);

  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHor: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3(1, 0.1, 0) },
          uSunCol: { value: new THREE.Color() },
          uSunAmt: { value: 0 },
          uStars: { value: 0 },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; }`,
        fragmentShader: `
          uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uSunAmt; uniform float uStars;
          varying vec3 vDir;
          float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
          void main(){
            vec3 d = normalize(vDir);
            float y = clamp(d.y, -0.2, 1.0);
            float t = pow(smoothstep(-0.02, 0.55, y), 0.7);
            vec3 col = mix(uHor, uTop, t);
            float s = max(dot(d, normalize(uSunDir)), 0.0);
            col += uSunCol * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.35 + pow(s, 3.0) * 0.12) * uSunAmt;
            vec3 q = floor(d * 420.0);
            float star = step(0.9975, h(q)) * smoothstep(0.08, 0.5, y) * uStars;
            col += vec3(star);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [],
  );

  const fog = useMemo(() => new THREE.Fog("#e9e6dd", 70, 560), []);
  scene.fog = fog;

  const tmp = useMemo(() => ({ dir: new THREE.Vector3(), c: new THREE.Color() }), []);

  useFrame(() => {
    const p = progress.get();
    let i = 0;
    while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const t = smooth(invLerp(a.p, b.p, p));

    const top = mixColor(skyMat.uniforms.uTop.value, a.top, b.top, t);
    const hor = mixColor(skyMat.uniforms.uHor.value, a.hor, b.hor, t);
    void top;
    fog.color.copy(hor);
    fog.near = THREE.MathUtils.lerp(a.fog[0], b.fog[0], t);
    fog.far = THREE.MathUtils.lerp(a.fog[1], b.fog[1], t);

    tmp.dir.set(
      THREE.MathUtils.lerp(a.dir[0], b.dir[0], t),
      THREE.MathUtils.lerp(a.dir[1], b.dir[1], t),
      THREE.MathUtils.lerp(a.dir[2], b.dir[2], t),
    ).normalize();
    skyMat.uniforms.uSunDir.value.copy(tmp.dir);
    mixColor(skyMat.uniforms.uSunCol.value, a.sun, b.sun, t);
    // visible sun disc only from late afternoon until it sets
    skyMat.uniforms.uSunAmt.value = smooth(invLerp(0.52, 0.6, p)) * (1 - smooth(invLerp(0.72, 0.76, p)));
    skyMat.uniforms.uStars.value = smooth(invLerp(0.76, 0.84, p)) * 0.8;

    const pose = truckPose(p);
    const cx = pose.x + Math.cos(pose.yaw) * TRUCK.pivotX;
    const cz = pose.z - Math.sin(pose.yaw) * TRUCK.pivotX;
    sun.current.position.set(cx + tmp.dir.x * 90, tmp.dir.y * 90, cz + tmp.dir.z * 90);
    sun.current.target.position.set(cx, 0, cz);
    sun.current.target.updateMatrixWorld();
    sun.current.color.copy(mixColor(tmp.c, a.sun, b.sun, t));
    sun.current.intensity = THREE.MathUtils.lerp(a.sunI, b.sunI, t);

    hemi.current.intensity = THREE.MathUtils.lerp(a.hemi, b.hemi, t);
    hemi.current.color.copy(top).lerp(hor, 0.5);
    hemi.current.groundColor.set("#8a8172").lerp(hor, 0.25);

    m.cloud.color.copy(mixColor(tmp.c, a.cloud, b.cloud, t));
    m.cloud.emissive.copy(m.cloud.color);

    const night = nightAmount(p);
    gl.toneMappingExposure = THREE.MathUtils.lerp(a.exp, b.exp, t);
    scene.environmentIntensity = THREE.MathUtils.lerp(1, 0.22, night);
    m.lamp.emissiveIntensity = night * 4;
    m.coolLamp.emissiveIntensity = 0.3 + night * 3.5;
    windowUniform.value = night;

    sky.current.position.copy(camera.position);
  });

  return (
    <>
      <mesh ref={sky} material={skyMat} renderOrder={-1} frustumCulled={false}>
        <sphereGeometry args={[2200, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} intensity={1} />
      <directionalLight
        ref={sun}
        castShadow={quality === "high"}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      {/* studio-style reflections for paint & glass; rendered once */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 6, -8]} scale={[20, 4, 1]} />
        <Lightformer form="rect" intensity={1.4} color="#ffe9d0" position={[10, 3, 6]} rotation-y={-Math.PI / 2} scale={[12, 3, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#d6e4f2" position={[-10, 4, 4]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="ring" intensity={1.2} color="#ffffff" position={[0, 12, 0]} rotation-x={Math.PI / 2} scale={8} />
      </Environment>
    </>
  );
}
