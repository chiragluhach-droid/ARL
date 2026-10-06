"use client";

import { useEffect, useRef } from "react";
import { useScrub, linesIn, linesOut, fadeIn, fadeOut } from "@/lib/useScrub";
import { progress } from "@/lib/progress";
import { BEATS, routeFraction } from "@/lib/journey";
import { route } from "@/lib/content";
import Lines from "./Lines";

/** Interpolated position along the route for HUD/tracking readouts. */
export function routeReadout(p: number) {
  const km = routeFraction(p) * route.totalKm;
  const s = route.stops;
  let i = 0;
  while (i < s.length - 2 && km > s[i + 1].km) i++;
  const t = Math.min(1, Math.max(0, (km - s[i].km) / (s[i + 1].km - s[i].km)));
  const lat = s[i].lat + (s[i + 1].lat - s[i].lat) * t;
  const lng = s[i].lng + (s[i + 1].lng - s[i].lng) * t;
  const near = t < 0.5 ? s[i] : s[i + 1];
  return { km, lat, lng, near: near.name, next: s[i + 1].name };
}

export const fmtCoord = (lat: number, lng: number) => `${lat.toFixed(4)}° N  ${lng.toFixed(4)}° E`;

/** 03 — tracked every mile: minimal live route, integrated with the aerial shot. */
export default function TrackingScene() {
  const [a, b] = BEATS.tracking;
  const ref = useScrub((tl, q) => {
    fadeIn(tl, q(".idx"), a, 0.012);
    linesIn(tl, q("h2 .li"), a + 0.004, 0.022, 0.006);
    fadeIn(tl, q(".route"), a + 0.012, 0.016, 24);
    linesOut(tl, q("h2 .li"), b - 0.02, 0.016);
    fadeOut(tl, [...q(".idx"), ...q(".route")], b - 0.016, 0.014, 16);
  });

  const fill = useRef<HTMLDivElement>(null);
  const truck = useRef<HTMLDivElement>(null);
  const kmEl = useRef<HTMLElement>(null);
  const coordEl = useRef<HTMLElement>(null);
  const nextEl = useRef<HTMLElement>(null);
  const stops = useRef<HTMLDivElement>(null);

  useEffect(
    () =>
      progress.subscribe((p) => {
        if (p < a - 0.03 || p > b + 0.03) return;
        const f = routeFraction(p);
        const r = routeReadout(p);
        if (fill.current) fill.current.style.transform = `scaleX(${f})`;
        if (truck.current) truck.current.style.left = `${f * 100}%`;
        if (kmEl.current) kmEl.current.textContent = Math.round(r.km).toLocaleString("en-IN");
        if (coordEl.current) coordEl.current.textContent = fmtCoord(r.lat, r.lng);
        if (nextEl.current) nextEl.current.textContent = r.next;
        stops.current
          ?.querySelectorAll<HTMLElement>(".route__stop")
          .forEach((s) => s.classList.toggle("on", Number(s.dataset.km) <= r.km + 1));
      }),
    [a, b],
  );

  return (
    <div ref={ref} className="scene" style={{ inset: 0 }} id="tracking-scene">
      <div className="scene chapter">
        <div className="idx mono">
          <b>03</b>
          <i />
          Real-time tracking
        </div>
        <h2 className="display">
          <Lines lines={["Tracked", "every mile."]} />
        </h2>
      </div>

      <div className="route">
        <div className="route__head mono">
          <span className="live">Live · {route.highway}</span>
          <span>
            Next · <b ref={nextEl}>—</b>
          </span>
        </div>
        <div className="route__track mono" ref={stops}>
          <div className="route__rail" />
          <div className="route__fill" ref={fill} />
          {route.stops.map((s) => (
            <div
              key={s.name}
              className="route__stop"
              data-km={s.km}
              style={{ left: `${(s.km / route.totalKm) * 100}%` }}
            >
              <i />
              <span>{s.name}</span>
            </div>
          ))}
          <div className="route__truck" ref={truck}>
            <em>ARL · Truck</em>
          </div>
        </div>
        <div className="route__foot mono">
          <span>
            KM <b ref={kmEl}>0</b> / {route.totalKm.toLocaleString("en-IN")}
          </span>
          <span ref={coordEl} />
          <span>
            Status · <b>On route</b>
          </span>
        </div>
      </div>
    </div>
  );
}
