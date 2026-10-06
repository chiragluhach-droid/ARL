import * as THREE from "three";

/** Shared materials — created once, reused across components. */
let mats: ReturnType<typeof create> | null = null;

/** Uniform shared by every lit-window building; driven by the atmosphere. */
export const windowUniform = { value: 0 };

/** City towers: procedural window grid from world position — no textures. */
function buildingMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.7, metalness: 0.15 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uNight = windowUniform;
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNorm;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec4 wpX = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          vWNorm = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);
        #else
          vec4 wpX = modelMatrix * vec4(transformed, 1.0);
          vWNorm = normalize(mat3(modelMatrix) * objectNormal);
        #endif
        vWPos = wpX.xyz;`,
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uNight; varying vec3 vWPos; varying vec3 vWNorm;
        float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float side = step(abs(vWNorm.y), 0.5);
          float coord = abs(vWNorm.x) > 0.5 ? vWPos.z : vWPos.x;
          vec2 g = vec2(coord / 2.6, (vWPos.y - 1.2) / 3.4);
          vec2 f = fract(g);
          float win = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.82) * side * step(3.0, vWPos.y);
          float lit = step(0.42, hsh(floor(g) + floor(vWPos.xz / 37.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.19, 0.23), win * 0.7);
          totalEmissiveRadiance += win * lit * uNight * vec3(1.0, 0.76, 0.45) * 1.8;
        }`,
      );
  };
  return mat;
}

function create() {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: "#ebe9e3",
      roughness: 0.32,
      metalness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    signal: new THREE.MeshPhysicalMaterial({
      color: "#ff5a1f",
      roughness: 0.35,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2,
    }),
    graphite: new THREE.MeshStandardMaterial({ color: "#26292d", roughness: 0.55, metalness: 0.4 }),
    dark: new THREE.MeshStandardMaterial({ color: "#16181b", roughness: 0.7, metalness: 0.2 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#121314", roughness: 0.92 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#d8dadc", roughness: 0.18, metalness: 1 }),
    alu: new THREE.MeshStandardMaterial({ color: "#b9bcbf", roughness: 0.35, metalness: 0.85 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: "#0c0f13",
      roughness: 0.04,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    }),
    interior: new THREE.MeshStandardMaterial({ color: "#9a9893", roughness: 0.85 }),
    wood: new THREE.MeshStandardMaterial({ color: "#8d6b48", roughness: 0.9 }),
    palletWood: new THREE.MeshStandardMaterial({ color: "#b8925f", roughness: 0.95 }),
    concrete: new THREE.MeshStandardMaterial({ color: "#b9b5ac", roughness: 0.95 }),
    yellow: new THREE.MeshStandardMaterial({ color: "#f2b705", roughness: 0.6 }),
    // emissive "lamps" — intensities driven per frame
    head: new THREE.MeshStandardMaterial({ color: "#f4f1ea", emissive: "#fff6e0", emissiveIntensity: 0.2 }),
    tail: new THREE.MeshStandardMaterial({ color: "#5a0a0a", emissive: "#ff1a10", emissiveIntensity: 0 }),
    reverse: new THREE.MeshStandardMaterial({ color: "#cfcfcf", emissive: "#ffffff", emissiveIntensity: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: "#7a4a08", emissive: "#ffa21a", emissiveIntensity: 0 }),
    beacon: new THREE.MeshStandardMaterial({ color: "#7a4a08", emissive: "#ffa21a", emissiveIntensity: 0 }),
    building: buildingMaterial(),
    tint: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85 }),
    foliage: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }),
    cloud: new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1, fog: false, emissive: "#ffffff", emissiveIntensity: 0.35 }),
    lamp: new THREE.MeshStandardMaterial({ color: "#d9d6cf", emissive: "#ffd9a0", emissiveIntensity: 0 }),
    coolLamp: new THREE.MeshStandardMaterial({ color: "#d9d6cf", emissive: "#e8f1ff", emissiveIntensity: 0 }),
  };
}

export function useMats() {
  if (!mats) mats = create();
  return mats;
}
export type Mats = ReturnType<typeof create>;
