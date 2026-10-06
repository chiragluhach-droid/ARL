"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export type V3 = [number, number, number];

/** Deterministic RNG so the world is identical on every load. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box geometry whose UVs are in metres / scale, so tiled textures never stretch. */
export function worldBox(w: number, h: number, d: number, scale = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [
    [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
  ];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, (uv.getX(i) * dims[f][0]) / scale, (uv.getY(i) * dims[f][1]) / scale);
    }
  }
  return g;
}

export function Box({
  size,
  pos,
  mat,
  rot,
  shadow = false,
  receive = true,
  uvScale,
}: {
  size: V3;
  pos: V3;
  mat: THREE.Material | THREE.Material[];
  rot?: V3;
  shadow?: boolean;
  receive?: boolean;
  uvScale?: number;
}) {
  const geo = useMemo(
    () => (uvScale ? worldBox(size[0], size[1], size[2], uvScale) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [size[0], size[1], size[2], uvScale],
  );
  return (
    <mesh position={pos} rotation={rot} material={mat} castShadow={shadow} receiveShadow={receive} geometry={geo ?? undefined}>
      {!geo && <boxGeometry args={size} />}
    </mesh>
  );
}

export interface InstItem {
  p: V3;
  s?: V3;
  r?: number; // yaw
  c?: string | THREE.Color;
}

/** Static instanced mesh from a list of transforms. */
export function Inst({
  geo,
  mat,
  items,
  shadow = false,
  receive = false,
}: {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  items: InstItem[];
  shadow?: boolean;
  receive?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const pos = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      q.setFromEuler(e.set(0, it.r ?? 0, 0));
      m.compose(pos.set(...it.p), q, it.s ? sc.set(...it.s) : sc.set(1, 1, 1));
      ref.current.setMatrixAt(i, m);
      if (it.c !== undefined) ref.current.setColorAt(i, col.set(it.c as THREE.ColorRepresentation));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [items]);
  if (!items.length) return null;
  return (
    <instancedMesh
      ref={ref}
      args={[geo, mat, items.length]}
      castShadow={shadow}
      receiveShadow={receive}
    />
  );
}
