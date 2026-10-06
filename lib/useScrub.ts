"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { progress } from "./progress";

/**
 * Build a paused GSAP timeline whose time axis IS journey progress (0..1),
 * then scrub it from the shared progress store. Positions/durations are in
 * progress units, e.g. tl.to(el, { duration: 0.02 }, 0.31).
 */
export function useScrub<T extends HTMLElement = HTMLDivElement>(
  build: (tl: gsap.core.Timeline, q: (sel: string) => Element[]) => void,
) {
  const scope = useRef<T>(null);
  useLayoutEffect(() => {
    if (!scope.current) return;
    let tl: gsap.core.Timeline | null = null;
    const ctx = gsap.context(() => {
      tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
      build(tl, gsap.utils.selector(scope.current));
      tl.set({}, {}, 1);
    }, scope);
    const unsub = progress.subscribe((p) => tl?.totalTime(p));
    return () => {
      unsub();
      ctx.revert();
    };
    // build is intentionally static per component
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return scope;
}

/** Text in: lines rise out of a mask. */
export function linesIn(tl: gsap.core.Timeline, targets: Element[] | string, at: number, dur = 0.018, stagger = 0.004) {
  tl.fromTo(
    targets,
    { yPercent: 110, opacity: 0 },
    { yPercent: 0, opacity: 1, duration: dur, stagger, ease: "power3.out", immediateRender: true },
    at,
  );
}

/** Text out: lines continue upward and fade. */
export function linesOut(tl: gsap.core.Timeline, targets: Element[] | string, at: number, dur = 0.016, stagger = 0.003) {
  tl.fromTo(
    targets,
    { yPercent: 0, opacity: 1 },
    { yPercent: -110, opacity: 0, duration: dur, stagger, ease: "power2.in", immediateRender: false },
    at,
  );
}

export function fadeIn(tl: gsap.core.Timeline, targets: Element[] | string, at: number, dur = 0.012, y = 12) {
  tl.fromTo(targets, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: dur, ease: "power2.out", immediateRender: true }, at);
}

export function fadeOut(tl: gsap.core.Timeline, targets: Element[] | string, at: number, dur = 0.012, y = -12) {
  tl.fromTo(targets, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y, duration: dur, ease: "power2.in", immediateRender: false }, at);
}
