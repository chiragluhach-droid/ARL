"use client";

import { useEffect, useRef } from "react";
import { useScrub, fadeIn, fadeOut } from "@/lib/useScrub";
import { progress } from "@/lib/progress";
import { routeFraction, speedAt, truckPose } from "@/lib/journey";
import { route } from "@/lib/content";
import { fmtCoord, routeReadout } from "./TrackingScene";

/** Tiny technical readouts along the bottom edge — present for the whole drive. */
export default function Hud() {
  const ref = useScrub((tl, q) => {
    fadeIn(tl, q(".hud"), 0.03, 0.014, 8);
    fadeOut(tl, q(".hud"), 0.935, 0.012, 8);
  });
  const km = useRef<HTMLElement>(null);
  const coord = useRef<HTMLElement>(null);
  const speed = useRef<HTMLElement>(null);
  const near = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);

  useEffect(
    () =>
      progress.subscribe((p) => {
        const r = routeReadout(p);
        const pose = truckPose(p);
        const kmh = pose.reversing ? 4 : Math.round(speedAt(p) * 72);
        if (km.current) km.current.textContent = String(Math.round(r.km)).padStart(4, "0");
        if (coord.current) coord.current.textContent = fmtCoord(r.lat, r.lng);
        if (speed.current) speed.current.textContent = `${String(kmh).padStart(2, "0")} km/h${pose.reversing ? " · R" : ""}`;
        if (near.current) near.current.textContent = r.near;
        if (bar.current) bar.current.style.transform = `scaleX(${routeFraction(p)})`;
      }),
    [],
  );

  return (
    <div ref={ref} className="scene" style={{ inset: 0 }}>
      <div className="hud mono">
        <div className="hud__group">
          <div className="hud__cell">
            <span>{route.highway} · Delhi → Mumbai</span>
            <span className="hud__bar">
              <i ref={bar} />
            </span>
          </div>
          <div className="hud__cell">
            <span>Odometer</span>
            <b>
              <span ref={km}>0000</span> km
            </b>
          </div>
          <div className="hud__cell hud__cell--hide-sm">
            <span>Near</span>
            <b ref={near}>Delhi</b>
          </div>
        </div>
        <div className="hud__group">
          <div className="hud__cell hud__cell--hide-sm" style={{ textAlign: "right" }}>
            <span>Position</span>
            <b ref={coord} />
          </div>
          <div className="hud__cell" style={{ textAlign: "right" }}>
            <span>Speed</span>
            <b ref={speed}>00 km/h</b>
          </div>
        </div>
      </div>
    </div>
  );
}
