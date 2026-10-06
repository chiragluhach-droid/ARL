/**
 * 3D → screen anchors. The scene projects points on the truck each frame and
 * DOM callouts read them, so labels stay pinned to the moving vehicle.
 */
export type Anchor = { x: number; y: number; behind: boolean };

export const ANCHOR_POINTS = {
  container: [5.2, 3.9, 1.25], // roof edge, near side
  cab: [11.6, 3.3, 1.2],
  wheels: [3.6, 0.55, 1.3],
} as const;

export type AnchorId = keyof typeof ANCHOR_POINTS;

type Listener = (a: Record<AnchorId, Anchor>) => void;
const listeners = new Set<Listener>();

export const anchors = {
  data: {
    container: { x: 0, y: 0, behind: true },
    cab: { x: 0, y: 0, behind: true },
    wheels: { x: 0, y: 0, behind: true },
  } as Record<AnchorId, Anchor>,
  emit() {
    listeners.forEach((l) => l(this.data));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};
