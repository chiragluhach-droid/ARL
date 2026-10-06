"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { progress, scroller } from "@/lib/progress";
import { company } from "@/lib/content";
import Navigation from "./Navigation";
import Hero from "./Hero";
import PickupScene from "./PickupScene";
import JourneyScene from "./JourneyScene";
import TrackingScene from "./TrackingScene";
import DistanceScene from "./DistanceScene";
import ArrivalScene from "./ArrivalScene";
import UnloadingScene from "./UnloadingScene";
import Hud from "./Hud";
import ProgressRail from "./ProgressRail";
import FinalCTA from "./FinalCTA";
import AboutSection from "./AboutSection";

// three.js is client-only and the heaviest chunk: load it after first paint
const Stage = dynamic(() => import("./three/Stage"), { ssr: false });

type Quality = "high" | "low";

function detectQuality(): Quality {
  const small = window.matchMedia("(max-width: 820px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  return small || coarse || cores <= 4 ? "low" : "high";
}

/**
 * Orchestrator. The journey section is a tall scroll track; inside it a sticky
 * stage holds the 3D canvas and every overlay. Scroll position → progress (0..1)
 * → everything. SCROLL = TIME.
 */
export default function TruckJourney() {
  const track = useRef<HTMLElement>(null);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    setQuality(detectQuality());
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (quality === null) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    // heavy, controlled scroll; native scroll when reduced motion is requested
    const lenis = reduced ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
    const tick = (t: number) => lenis?.raf(t * 1000);
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }

    const st = ScrollTrigger.create({
      trigger: track.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (s) => progress.set(s.progress),
      onRefresh: (s) => progress.set(s.progress),
    });

    scroller.toProgress = (p: number) => {
      const y = st.start + (st.end - st.start) * Math.min(1, p);
      const dist = Math.abs(y - window.scrollY);
      if (lenis) lenis.scrollTo(y, { duration: Math.min(4, 1.2 + dist / 6000), easing: (t) => 1 - Math.pow(1 - t, 3) });
      else window.scrollTo({ top: y });
    };

    scroller.toTarget = (selector: string) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return;
      if (lenis) lenis.scrollTo(el, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 3) });
      else el.scrollIntoView();
    };

    const unTone = progress.subscribe((p) => {
      document.documentElement.dataset.tone = p > 0.668 && p < 0.995 ? "dark" : "light";
    });

    return () => {
      unTone();
      st.kill();
      if (lenis) {
        gsap.ticker.remove(tick);
        lenis.destroy();
      }
      scroller.toProgress = undefined;
      scroller.toTarget = undefined;
    };
  }, [quality, reduced]);

  return (
    <>
      <div className={`preloader${ready ? " done" : ""}`} aria-hidden={ready}>
        <div className="preloader__inner">
          <div className="brand__mark" style={{ fontSize: 30 }}>
            {company.short}
          </div>
          <div className="mono" style={{ color: "rgba(15,16,18,.55)" }}>
            {company.name}
          </div>
          <div className="preloader__bar">
            <i />
          </div>
        </div>
      </div>

      <Navigation />

      <main>
        <section ref={track} className="journey" aria-label="The journey of a consignment">
          <div className="stage">
            <div className="canvas-wrap" aria-hidden>
              {quality && <Stage quality={quality} reduced={reduced} onReady={onReady} />}
            </div>
            <div className="vignette" />
            <div className="grain" />
            <Hero ready={ready} />
            <PickupScene />
            <JourneyScene />
            <TrackingScene />
            <DistanceScene />
            <ArrivalScene />
            <UnloadingScene />
            <Hud />
            <ProgressRail />
          </div>
        </section>
        <AboutSection />
        <FinalCTA />
      </main>
    </>
  );
}
