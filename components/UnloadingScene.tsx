"use client";

import { useEffect, useRef } from "react";
import { useScrub, linesIn, linesOut, fadeIn, fadeOut } from "@/lib/useScrub";
import { progress } from "@/lib/progress";
import { BEATS, PALLETS } from "@/lib/journey";
import Lines from "./Lines";

const STEPS = [
  { label: "Docked at bay 04", at: BEATS.reverse[1] },
  { label: "Doors open · shutter up", at: BEATS.destShutter[1] },
  { label: "Cargo unloaded", at: BEATS.unload[1] },
  { label: "Handed over to warehouse", at: BEATS.forkReverse[1] - 0.004 },
];

/** 06 — the payoff: cargo comes out and lands in its marked bays. */
export default function UnloadingScene() {
  const ref = useScrub((tl, q) => {
    const a = BEATS.destShutter[0] + 0.008;
    fadeIn(tl, q(".scrim"), a - 0.006, 0.014, 0);
    fadeIn(tl, q(".idx"), a, 0.01);
    linesIn(tl, q("h2 .li"), a + 0.004, 0.02);
    fadeIn(tl, q(".meter"), a + 0.012, 0.01);
    fadeIn(tl, q(".steps"), a + 0.016, 0.01);
    linesOut(tl, q("h2 .li"), 0.948, 0.014);
    fadeOut(tl, [...q(".idx"), ...q(".meter"), ...q(".steps")], 0.946, 0.012);
    fadeOut(tl, q(".scrim"), 0.95, 0.014, 0);
  });

  const count = useRef<HTMLElement>(null);
  const pips = useRef<HTMLDivElement>(null);
  const steps = useRef<HTMLUListElement>(null);

  useEffect(
    () =>
      progress.subscribe((p) => {
        const n = PALLETS.filter((pl) => p >= (pl.toForklift ? BEATS.forkReverse[1] - 0.006 : pl.unload[1] - 0.002)).length;
        if (count.current) count.current.textContent = String(n);
        pips.current?.querySelectorAll("span").forEach((s, i) => s.classList.toggle("on", i < n));
        steps.current?.querySelectorAll("li").forEach((li, i) => li.classList.toggle("on", p >= STEPS[i].at));
      }),
    [],
  );

  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      {/* the dock is brightly lit: a soft dark falloff on the text side keeps copy readable */}
      <div className="scrim" />
      <div className="scene chapter chapter--onlight">
        <div className="idx mono">
          <b>06</b>
          <i />
          Unloading
        </div>
        <h2 className="display">
          <Lines lines={["Unloading."]} />
        </h2>
        <div className="meter mono">
          <span>
            Pallets delivered <b ref={count}>0</b>/{PALLETS.length}
          </span>
          <div className="pips" ref={pips}>
            {PALLETS.map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
        <ul className="steps mono" ref={steps}>
          {STEPS.map((s) => (
            <li key={s.label}>{s.label}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
