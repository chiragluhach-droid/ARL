"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { useScrub, fadeOut } from "@/lib/useScrub";
import { company, route } from "@/lib/content";
import Lines from "./Lines";

export default function Hero({ ready }: { ready: boolean }) {
  const ref = useScrub((tl, q) => {
    // as the truck starts to roll, the headline lifts away and opens up
    tl.fromTo(q(".hero__title"), { scale: 1, letterSpacing: "-0.035em" }, { scale: 1.06, letterSpacing: "-0.01em", duration: 0.05 }, 0);
    tl.fromTo(q(".hero__title .li"), { yPercent: 0, opacity: 1 }, { yPercent: -120, opacity: 0, duration: 0.03, stagger: 0.006, ease: "power2.in", immediateRender: false }, 0.012);
    fadeOut(tl, [...q(".hero__row"), ...q(".hero__meta")], 0.006, 0.02);
    fadeOut(tl, q(".cue"), 0, 0.008, 0);
    fadeOut(tl, q(".gridlines"), 0.01, 0.03, 0);
  });

  useEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".hero__title .lj", { yPercent: 115, duration: 1.4, stagger: 0.12, ease: "expo.out", delay: 0.25 });
      gsap.from([".hero__row", ".hero__meta"], { opacity: 0, y: 14, duration: 1.1, stagger: 0.1, ease: "power3.out", delay: 0.75 });
    }, ref);
    return () => ctx.revert();
  }, [ready, ref]);

  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      <div className="gridlines" />
      <div className="scene hero">
        <h1 className="display hero__title">
          <Lines lines={["Moving", "*What Matters.*"]} />
        </h1>
        <div className="hero__row">
          <p className="hero__sub">
            <span>Reliable transportation.</span>
            <span>From pickup to destination.</span>
          </p>
        </div>
      </div>
      <div className="hero__meta mono">
        <div>{company.name}</div>
        <div>
          {route.stops[0].name} → {route.stops[route.stops.length - 1].name} · {route.highway}
        </div>
      </div>
      <div className="cue mono">
        Scroll to start the journey
        <i />
      </div>
    </div>
  );
}
