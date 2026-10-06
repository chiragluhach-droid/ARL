"use client";

import { useEffect, useRef } from "react";
import { useScrub, linesIn, linesOut, fadeIn, fadeOut } from "@/lib/useScrub";
import { progress } from "@/lib/progress";
import { anchors, type AnchorId } from "@/lib/anchors";
import { BEATS } from "@/lib/journey";
import Lines from "./Lines";

const STRETCHES = [
  { label: "Industrial belt", from: 0.2 },
  { label: "NH 48", from: 0.32 },
  { label: "Open country", from: 0.46 },
];

const CALLOUTS: { id: AnchorId; small: string; title: string; h: number; down?: boolean; flip?: boolean }[] = [
  { id: "container", small: "Load", title: "Full & part truck load", h: 110 },
  { id: "cab", small: "Route", title: "Long haul transportation", h: 70, flip: true },
  { id: "wheels", small: "Capacity", title: "Dedicated fleet", h: 42, down: true },
];

/** 02 — the road. Then a long-lens profile with labels pinned to the moving truck. */
export default function JourneyScene() {
  const [j0, j1] = BEATS.journey;
  const [c0, c1] = BEATS.callouts;
  const ref = useScrub((tl, q) => {
    fadeIn(tl, q(".j .idx"), j0, 0.012);
    linesIn(tl, q(".j h2 .li"), j0 + 0.004, 0.022, 0.006);
    fadeIn(tl, q(".j .ticker"), j0 + 0.016, 0.012);
    linesOut(tl, q(".j h2 .li"), j1 - 0.018, 0.016);
    fadeOut(tl, [...q(".j .idx"), ...q(".j .ticker")], j1 - 0.016, 0.012);

    fadeIn(tl, q(".callouts__head"), c0, 0.012);
    q(".callout").forEach((el, i) => {
      const at = c0 + 0.008 + i * 0.008;
      tl.fromTo(el.querySelector(".callout__stem"), { scaleY: 0 }, { scaleY: 1, duration: 0.01, immediateRender: true }, at);
      tl.fromTo(el.querySelector(".callout__dot"), { scale: 0 }, { scale: 1, duration: 0.006, immediateRender: true }, at);
      tl.fromTo(el.querySelector(".callout__label"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.01, immediateRender: true }, at + 0.006);
    });
    fadeOut(tl, [...q(".callouts__head"), ...q(".callout")], c1 - 0.012, 0.012, 0);
  });

  const ticker = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const un1 = progress.subscribe((p) => {
      let cur = 0;
      STRETCHES.forEach((s, i) => p >= s.from && (cur = i));
      ticker.current?.querySelectorAll("span[data-i]").forEach((s, i) => s.classList.toggle("on", i === cur));
    });
    const un2 = anchors.subscribe((a) => {
      CALLOUTS.forEach((c, i) => {
        const el = els.current[i];
        if (!el) return;
        const pt = a[c.id];
        el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
        el.classList.toggle("is-offscreen", pt.behind);
      });
    });
    return () => {
      un1();
      un2();
    };
  }, []);

  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      <div className="scene chapter j">
        <div className="idx mono">
          <b>02</b>
          <i />
          The journey
        </div>
        <h2 className="display">
          <Lines lines={["Into the", "open road."]} />
        </h2>
        <div className="ticker mono" ref={ticker}>
          {STRETCHES.map((s, i) => (
            <span key={s.label} data-i={i}>
              {i > 0 && "→ "}
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="scene callouts" style={{ inset: 0 }}>
        <div className="callouts__head">
          <div className="idx mono">
            <b>02</b>
            <i />
            What we move
          </div>
          <h2 className="display">
            <span className="line">One road.</span>
            <span className="line">Every load.</span>
          </h2>
          <ul className="callouts__list mono">
            {CALLOUTS.map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ul>
        </div>
        {CALLOUTS.map((c, i) => (
          <div
            key={c.id}
            className={`callout${c.down ? " callout--down" : ""}${c.flip ? " callout--flip" : ""}`}
            ref={(el) => void (els.current[i] = el)}
            style={{ ["--h" as string]: `${c.h}px` }}
          >
            <span className="callout__stem" />
            <span className="callout__dot" />
            <div className="callout__label">
              <small className="mono">{c.small}</small>
              <strong>{c.title}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
