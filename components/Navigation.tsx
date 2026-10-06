"use client";

import { useEffect, useRef, useState } from "react";
import { progress, scroller } from "@/lib/progress";
import { BEATS } from "@/lib/journey";
import { company, nav } from "@/lib/content";
import SoundToggle from "./SoundToggle";

export default function Navigation() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(
    () =>
      progress.subscribe((p) => {
        ref.current?.classList.toggle("compact", p > 0.02 && p < 0.985);
        // close-up shots (doors closing → pull-away → wheel-level drive-by) put the black container
        // behind the wordmark; switch it to orange for that stretch only
        ref.current?.classList.toggle("on-truck", p > 0.165 && p < 0.29);
        // journey finished: About / Contact scroll underneath, so the bar gets a solid backdrop
        ref.current?.classList.toggle("solid", p >= 0.995);
      }),
    [],
  );

  const go = (href: string) => (e: React.MouseEvent) => {
    setOpen(false);
    e.preventDefault();
    if (href === "#tracking") scroller.toProgress?.(BEATS.tracking[0] + 0.04);
    else scroller.toTarget?.(href);
  };

  return (
    <>
      <header className="nav" ref={ref}>
        <a href="#" className="brand" aria-label={`${company.short} — ${company.name}`} onClick={(e) => { e.preventDefault(); scroller.toProgress?.(0); }}>
          <span className="brand__mark">{company.short}</span>
          <span className="brand__name mono">{company.name}</span>
        </a>
        <nav className="nav__links" aria-label="Primary">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={go(n.href)}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="nav__right">
          <SoundToggle />
          <a href="#contact" className="btn btn--primary btn--sm" onClick={go("#contact")}>
            Get a quote <span className="arrow">→</span>
          </a>
          <button className="nav__menu" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            <i />
            <i />
          </button>
        </div>
      </header>
      {open && (
        <div className="sheet">
          {nav.map((n) => (
            <a key={n.href} href={n.href} onClick={go(n.href)}>
              {n.label}
            </a>
          ))}
          <a href="#contact" onClick={go("#contact")}>
            Get a quote
          </a>
        </div>
      )}
    </>
  );
}
