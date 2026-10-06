import * as THREE from "three";
import { company } from "./content";

/** Canvas-generated textures: zero network requests, crisp, tiny. */

const cache = new Map<string, THREE.Texture>();

function make(
  key: string,
  w: number,
  h: number,
  draw: (g: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: { repeat?: [number, number]; srgb?: boolean; aniso?: number } = {},
) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  t.anisotropy = opts.aniso ?? 8;
  cache.set(key, t);
  return t;
}

const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

function noise(g: CanvasRenderingContext2D, w: number, h: number, amt: number, n = 6000) {
  for (let i = 0; i < n; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${Math.random() * amt})`;
    g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1);
  }
}

/** Corrugated container side with ARL livery. Box face: u along length, v along height. */
export function containerSide() {
  return make("containerSide", 2048, 544, (g, w, h) => {
    g.fillStyle = "#24272b";
    g.fillRect(0, 0, w, h);
    // corrugation: repeating soft vertical ribs
    const rib = 22;
    for (let x = 0; x < w; x += rib) {
      const grd = g.createLinearGradient(x, 0, x + rib, 0);
      grd.addColorStop(0, "rgba(255,255,255,0.05)");
      grd.addColorStop(0.35, "rgba(255,255,255,0.0)");
      grd.addColorStop(0.6, "rgba(0,0,0,0.22)");
      grd.addColorStop(1, "rgba(255,255,255,0.05)");
      g.fillStyle = grd;
      g.fillRect(x, 0, rib, h);
    }
    // signal stripe
    g.fillStyle = "#ff5a1f";
    g.fillRect(0, h * 0.8, w, h * 0.035);
    // wordmark
    g.fillStyle = "#f1efea";
    g.font = `800 ${h * 0.46}px ${SANS}`;
    g.textBaseline = "alphabetic";
    g.fillText("ARL", w * 0.06, h * 0.62);
    g.font = `600 ${h * 0.06}px ${SANS}`;
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "6px";
    g.fillText(company.name.toUpperCase(), w * 0.065, h * 0.73);
    g.fillStyle = "rgba(241,239,234,0.75)";
    g.font = `500 ${h * 0.045}px ${SANS}`;
    g.fillText("MOVING WHAT MATTERS.", w * 0.72, h * 0.73);
    // reflective conspicuity tape (red/white), along the bottom
    const seg = 48;
    for (let x = 0; x < w; x += seg * 2) {
      g.fillStyle = "#c8102e";
      g.fillRect(x, h * 0.93, seg, h * 0.045);
      g.fillStyle = "#e9e9e9";
      g.fillRect(x + seg, h * 0.93, seg, h * 0.045);
    }
    noise(g, w, h, 0.05, 9000);
  });
}

export function containerDoor() {
  return make("containerDoor", 256, 512, (g, w, h) => {
    g.fillStyle = "#26292d";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 26) {
      g.fillStyle = "rgba(0,0,0,0.2)";
      g.fillRect(0, y + 18, w, 6);
      g.fillStyle = "rgba(255,255,255,0.04)";
      g.fillRect(0, y, w, 4);
    }
    g.fillStyle = "#ff5a1f";
    g.fillRect(0, h * 0.8, w, h * 0.03);
    noise(g, w, h, 0.05, 2000);
  });
}

export function road(length: number) {
  return make(
    "road",
    512,
    256,
    (g, w, h) => {
      g.fillStyle = "#3b3c3f";
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 0.09, 26000);
      // wheel tracks (slightly darker, polished)
      g.fillStyle = "rgba(0,0,0,0.12)";
      [0.12, 0.3, 0.7, 0.88].forEach((y) => g.fillRect(0, h * y - 6, w, 12));
      // edge lines
      g.fillStyle = "#e8e6df";
      g.fillRect(0, h * 0.035, w, 6);
      g.fillRect(0, h * 0.965 - 6, w, 6);
      // centre dashes (6m dash / 6m gap per 12m tile)
      g.fillRect(0, h * 0.5 - 4, w * 0.5, 8);
    },
    { repeat: [length / 12, 1], aniso: 16 },
  );
}

export function concrete(rep: [number, number]) {
  return make(
    `concrete${rep.join("x")}`,
    256,
    256,
    (g, w, h) => {
      g.fillStyle = "#b7b3aa";
      g.fillRect(0, 0, w, h);
      noise(g, w, h, 0.08, 9000);
      g.strokeStyle = "rgba(0,0,0,0.18)";
      g.lineWidth = 2;
      g.strokeRect(0, 0, w, h);
    },
    { repeat: rep },
  );
}

/** Black/yellow safety edge for dock platforms. */
export function hazard() {
  return make(
    "hazard",
    256,
    32,
    (g, w, h) => {
      g.fillStyle = "#f2b705";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#151515";
      for (let x = -h; x < w + h; x += 32) {
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + 16, h);
        g.lineTo(x + 16 + h, 0);
        g.lineTo(x + h, 0);
        g.fill();
      }
    },
    { repeat: [6, 1] },
  );
}

export function cladding(rep: [number, number]) {
  return make(
    `clad${rep.join("x")}`,
    128,
    128,
    (g, w, h) => {
      g.fillStyle = "#dedbd4";
      g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        g.fillStyle = "rgba(0,0,0,0.07)";
        g.fillRect(x, 0, 3, h);
        g.fillStyle = "rgba(255,255,255,0.35)";
        g.fillRect(x + 4, 0, 2, h);
      }
    },
    { repeat: rep },
  );
}

export function shutter() {
  return make(
    "shutter",
    128,
    256,
    (g, w, h) => {
      g.fillStyle = "#a9adb1";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 10) {
        g.fillStyle = "rgba(0,0,0,0.22)";
        g.fillRect(0, y, w, 2);
        g.fillStyle = "rgba(255,255,255,0.25)";
        g.fillRect(0, y + 3, w, 2);
      }
    },
    { repeat: [1, 2] },
  );
}

export function facadeSign(sub: string) {
  return make(`facade-${sub}`, 1024, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#141518";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ff5a1f";
    g.fillRect(0, 0, 18, h);
    g.fillStyle = "#f1efea";
    g.font = `800 150px ${SANS}`;
    g.fillText("ARL", 60, 165);
    g.font = `600 30px ${SANS}`;
    (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "5px";
    g.fillText(company.name.toUpperCase(), 380, 105);
    g.fillStyle = "#ff5a1f";
    g.fillText(sub, 380, 165);
  });
}

export function plate() {
  return make("plate", 256, 64, (g, w, h) => {
    g.fillStyle = "#f5c518";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#111";
    g.lineWidth = 4;
    g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = "#111";
    g.font = `700 34px ${SANS}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(company.plate, w / 2, h / 2 + 2);
  });
}

/** Indian NH gantry sign: green with white text. */
export function highwaySign(lines: [string, string][]) {
  const key = "sign" + lines.map((l) => l.join()).join("|");
  return make(key, 1024, 384, (g, w, h) => {
    g.fillStyle = "#0e6b3a";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f2f2f2";
    g.lineWidth = 8;
    g.strokeRect(14, 14, w - 28, h - 28);
    // NH shield
    g.fillStyle = "#f2f2f2";
    g.fillRect(40, 40, 150, 70);
    g.fillStyle = "#0e6b3a";
    g.font = `800 46px ${SANS}`;
    g.textAlign = "center";
    g.fillText("NH 48", 115, 92);
    g.fillStyle = "#f2f2f2";
    g.font = `700 64px ${SANS}`;
    lines.forEach(([place, km], i) => {
      const y = 190 + i * 100;
      g.textAlign = "left";
      g.fillText(place, 60, y);
      g.textAlign = "right";
      g.fillText(km, w - 60, y);
    });
  });
}

export function palletWrap(variant: number) {
  return make(`wrap${variant}`, 256, 256, (g, w, h) => {
    const base = ["#c49a6c", "#e9e7e2", "#b88a5a"][variant];
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    if (variant === 1) {
      // shrink wrap sheen + tape
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(255,255,255,${Math.random() * 0.25})`;
        g.fillRect(0, Math.random() * h, w, 2 + Math.random() * 6);
      }
      g.fillStyle = "#ff5a1f";
      g.fillRect(0, h * 0.42, w, 18);
    } else {
      // carton seams
      g.strokeStyle = "rgba(60,40,20,0.45)";
      g.lineWidth = 3;
      g.strokeRect(0, 0, w / 2, h / 2);
      g.strokeRect(w / 2, 0, w / 2, h / 2);
      g.strokeRect(0, h / 2, w / 2, h / 2);
      g.strokeRect(w / 2, h / 2, w / 2, h / 2);
      g.fillStyle = "rgba(240,230,210,0.6)";
      g.fillRect(w * 0.47, 0, w * 0.06, h);
      g.fillStyle = "#1a1a1a";
      g.fillRect(w * 0.08, h * 0.08, w * 0.16, h * 0.06);
    }
    noise(g, w, h, 0.06, 1500);
  });
}
