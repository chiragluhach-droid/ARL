"use client";

import { useEffect, useRef } from "react";
import { progress, scroller } from "@/lib/progress";
import { BEATS } from "@/lib/journey";

const CHAPTERS = [
  { n: "00", label: "Start", p: 0 },
  { n: "01", label: "Pick up", p: 0.1 },
  { n: "02", label: "Journey", p: 0.27 },
  { n: "03", label: "Tracking", p: BEATS.tracking[0] + 0.03 },
  { n: "04", label: "Distance", p: BEATS.distance[0] + 0.03 },
  { n: "05", label: "Arrival", p: BEATS.arrival[0] + 0.02 },
  { n: "06", label: "Unload", p: BEATS.destShutter[0] + 0.02 },
  { n: "07", label: "About", p: 1 },
  { n: "08", label: "Leaders", p: 1, target: "#leadership" },
  { n: "09", label: "Contact", p: 1, target: "#contact" },
];

/** Scroll-position-as-time indicator; chapters are jump points in the journey. */
export default function ProgressRail() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      progress.subscribe((p) => {
        const el = root.current;
        if (!el) return;
        el.style.setProperty("--p", p.toFixed(4));
        // stays out of the way of the hero headline; appears once the journey starts
        el.style.opacity = p > 0.025 ? "1" : "0";
        el.style.pointerEvents = p > 0.025 ? "" : "none";
        let cur = 0;
        CHAPTERS.forEach((c, i) => !("target" in c) && p >= c.p - 0.02 && (cur = i));
        el.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === cur));
      }),
    [],
  );
  return (
    <nav className="rail mono" ref={root} aria-label="Journey chapters">
      <div className="rail__line">
        <i />
      </div>
      <ol className="rail__list">
        {CHAPTERS.map((c) => (
          <li key={c.n}>
            <button onClick={() => ("target" in c && c.target ? scroller.toTarget?.(c.target) : scroller.toProgress?.(c.p))}>
              <b>{c.n}</b>
              {c.label}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
