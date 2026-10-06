"use client";

import { useScrub, linesIn, linesOut, fadeIn, fadeOut } from "@/lib/useScrub";
import { BEATS } from "@/lib/journey";
import { company } from "@/lib/content";
import Lines from "./Lines";

/** 05 — the truck slows, stops, opens up and reverses onto the bay. */
export default function ArrivalScene() {
  const [a, b] = BEATS.arrival;
  const ref = useScrub((tl, q) => {
    fadeIn(tl, q(".idx"), a, 0.01);
    linesIn(tl, q("h2 .li"), a + 0.004, 0.022, 0.008);
    fadeIn(tl, q(".chip"), BEATS.arrive, 0.01, 10);
    linesOut(tl, q("h2 .li"), b - 0.016, 0.014);
    fadeOut(tl, q(".idx"), b - 0.014, 0.01);
    fadeOut(tl, q(".chip"), BEATS.reverse[1] - 0.006, 0.01, 10);
  });
  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      <div className="scene chapter">
        <div className="idx mono">
          <b>05</b>
          <i />
          Arrival · {company.destinationFacility}
        </div>
        <h2 className="display">
          <Lines lines={["Delivered.", "Right on time."]} />
        </h2>
      </div>
      <div className="chip mono">
        <span className="dot" />
        Arrived · {company.destinationFacility} · Reversing to bay 04
      </div>
    </div>
  );
}
