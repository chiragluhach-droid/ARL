"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { progress } from "@/lib/progress";
import Truck from "./Truck";
import Dock from "./Dock";
import World from "./World";
import Traffic from "./Traffic";
import Atmosphere from "./Atmosphere";
import CameraRig from "./CameraRig";
import TrackingFX from "./TrackingFX";
import { Forklift, Pallets } from "./Cargo";

/** Render on demand: a new frame only when scroll progress changes. */
function InvalidateOnProgress() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => progress.subscribe(() => invalidate()), [invalidate]);
  return null;
}

/** Fires once the first frame is on screen (shaders compiled). */
function Ready({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    gl.compile(scene, camera);
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(onReady);
    });
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera, onReady]);
  return null;
}

export default function Stage({
  quality,
  reduced,
  onReady,
}: {
  quality: "high" | "low";
  reduced: boolean;
  onReady: () => void;
}) {
  const hi = quality === "high";
  return (
    <Canvas
      frameloop="demand"
      dpr={hi ? [1, 1.75] : [1, 1.35]}
      shadows={hi ? { type: THREE.PCFShadowMap } : false}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
      }}
      camera={{ fov: 30, near: 0.4, far: 5000, position: [16, 2, 8] }}
    >
      <InvalidateOnProgress />
      <CameraRig reduced={reduced} />
      <Atmosphere quality={quality} />
      <World quality={quality} />
      <Dock kind="pickup" quality={quality} />
      <Dock kind="dest" quality={quality} />
      <Truck quality={quality} />
      <Pallets />
      <Forklift />
      <Traffic quality={quality} />
      <TrackingFX />
      <Ready onReady={onReady} />
    </Canvas>
  );
}
