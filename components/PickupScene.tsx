"use client";

import { useEffect, useRef } from "react";
import { useScrub, linesIn, linesOut, fadeIn, fadeOut } from "@/lib/useScrub";
import { progress } from "@/lib/progress";
import { BEATS, PALLETS } from "@/lib/journey";
import { company } from "@/lib/content";
import Lines from "./Lines";

/** 01 — cargo is loaded, doors close, truck pulls away. */
export default function PickupScene() {
  const ref = useScrub((tl, q) => {
    fadeIn(tl, q(".idx"), 0.058, 0.012);
    linesIn(tl, q("h2 .li"), 0.062, 0.02);
    fadeIn(tl, q(".serif"), 0.075, 0.015);
    fadeIn(tl, q(".meter"), 0.08, 0.012);
    linesOut(tl, q("h2 .li"), 0.172, 0.016);
    fadeOut(tl, [...q(".idx"), ...q(".serif"), ...q(".meter")], 0.168, 0.014);
    // departure chip
    fadeIn(tl, q(".chip"), BEATS.depart - 0.004, 0.01, 10);
    fadeOut(tl, q(".chip"), 0.236, 0.012, 10);
  });

  const count = useRef<HTMLElement>(null);
  const pips = useRef<HTMLDivElement>(null);
  useEffect(
    () =>
      progress.subscribe((p) => {
        const n = PALLETS.filter((pl) => p >= pl.load[1] - 0.004).length;
        if (count.current) count.current.textContent = String(n);
        pips.current?.querySelectorAll("span").forEach((s, i) => s.classList.toggle("on", i < n));
      }),
    [],
  );

  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      <div className="scene chapter">
        <div className="idx mono">
          <b>01</b>
          <i />
          Pickup · {company.pickupFacility}
        </div>
        <h2 className="display">
          <Lines lines={["Pick *up*"]} />
        </h2>
        <p className="serif quote">
          <span>“Every journey starts with precision.”</span>
        </p>
        <div className="meter mono">
          <span>
            Pallets loaded <b ref={count}>0</b>/{PALLETS.length}
          </span>
          <div className="pips" ref={pips}>
            {PALLETS.map((_, i) => (
              <span key={i} />
            ))}
          </div>
        </div>
      </div>
      <div className="chip mono">
        <span className="dot" />
        Doors sealed · Departing {company.pickupFacility} · NH 48 →
      </div>
    </div>
  );
}
