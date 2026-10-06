"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Reveal-on-enter for the regular (non-pinned) sections after the journey.
 * Marks: [data-reveal] fades/rises in; [data-reveal="lines"] uses the masked-line reveal;
 * [data-reveal="draw"] scales in from the left (rules, timelines).
 */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
        const kind = el.dataset.reveal;
        const st = { trigger: el, start: "top 88%", once: true };
        if (kind === "lines") {
          gsap.from(el.querySelectorAll(".li"), { yPercent: 110, opacity: 0, duration: 1.1, stagger: 0.09, ease: "expo.out", scrollTrigger: st });
        } else if (kind === "wipe") {
          gsap.fromTo(
            el,
            { clipPath: "inset(0% 100% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut", scrollTrigger: st },
          );
        } else if (kind === "draw") {
          gsap.from(el, { scaleX: 0, transformOrigin: "0 50%", duration: 1.4, ease: "expo.inOut", scrollTrigger: st });
        } else {
          gsap.from(el, { y: 24, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: st });
        }
      });
    }, ref);
    return () => ctx.revert();
  }, []);
  return ref;
}
