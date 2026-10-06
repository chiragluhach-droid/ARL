/**
 * Single source of truth for the journey: scroll progress p ∈ [0, 1].
 * Everything — 3D scene, typography, HUD — is a pure function of p.
 * Kept outside React so per-frame updates never trigger re-renders.
 */
type Listener = (p: number) => void;

const listeners = new Set<Listener>();
let current = 0;

export const progress = {
  get: () => current,
  set(p: number) {
    if (p === current) return;
    current = p;
    listeners.forEach((l) => l(p));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    l(current);
    return () => {
      listeners.delete(l);
    };
  },
};

/** Lenis instance, so UI (progress rail) can jump to a point in the journey. */
export const scroller: { toProgress?: (p: number) => void; toTarget?: (selector: string) => void } = {};
