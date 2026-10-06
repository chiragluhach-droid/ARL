"use client";

import { useScrub, linesIn, linesOut, fadeIn, fadeOut } from "@/lib/useScrub";
import { BEATS } from "@/lib/journey";
import Lines from "./Lines";

/** 04 — day becomes evening; one statement, very large. */
export default function DistanceScene() {
  const [a, b] = BEATS.distance;
  const ref = useScrub((tl, q) => {
    fadeIn(tl, q(".idx"), a, 0.012);
    linesIn(tl, q("h2 .li"), a + 0.004, 0.026, 0.01);
    linesOut(tl, q("h2 .li"), b - 0.022, 0.018, 0.005);
    fadeOut(tl, q(".idx"), b - 0.02, 0.012);
  });
  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      <div className="scene distance">
        <div className="idx mono" style={{ marginBottom: 18 }}>
          <b>04</b>
          <i />
          Long distance
        </div>
        <h2 className="display">
          <Lines lines={["Distance", "is just part", "of the job."]} />
        </h2>
      </div>
    </div>
  );
}
