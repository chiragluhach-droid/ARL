"use client";

import { useReveal } from "@/lib/useReveal";
import { scroller } from "@/lib/progress";
import { BEATS } from "@/lib/journey";
import { company, fleet, services } from "@/lib/content";
import Lines from "./Lines";

/** 08 — Contact: the clean landing after the story and the About section. */
export default function FinalCTA() {
  const ref = useReveal<HTMLElement>();
  const tel = company.phone.replace(/[^\d+]/g, "");
  return (
    <section className="final" id="contact" ref={ref}>
      <div className="final__body">
        <div className="idx mono" style={{ color: "rgba(15,16,18,.6)", marginBottom: 22 }} data-reveal>
          <b>08</b>
          <i />
          Contact
        </div>
        <h2 className="display final__title" data-reveal="lines">
          <Lines lines={["Your cargo.", "Our responsibility."]} />
        </h2>
        <div className="final__copy" data-reveal>
          <p className="serif">From the first mile to the final delivery, we keep your goods moving.</p>
          <div className="final__cta">
            <a className="btn btn--primary" href={`mailto:${company.email.replace(/[[\]]/g, "")}?subject=Quote%20request`}>
              Get a quote <span className="arrow">→</span>
            </a>
            <a className="btn btn--ghost" href={`tel:${tel}`}>
              Talk to us
            </a>
          </div>
        </div>
        <div className="info" data-reveal>
          <div id="services">
            <h3 className="mono">Transportation</h3>
            <ul>
              {services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div id="fleet">
            <h3 className="mono">Fleet</h3>
            <p>{fleet}</p>
          </div>
          <div id="tracking">
            <h3 className="mono">Tracking</h3>
            <p>Live status for every consignment, from pickup to delivery.</p>
            <button className="linklike" onClick={() => scroller.toProgress?.(BEATS.tracking[0] + 0.04)}>
              Replay the route ↺
            </button>
          </div>
          <div id="contact-info">
            <h3 className="mono">Contact</h3>
            <p>
              <a href={`tel:${tel}`}>{company.phone}</a>
              <br />
              <a href={`mailto:${company.email.replace(/[[\]]/g, "")}`}>{company.email}</a>
              <br />
              {company.address}
              <br />
              <span style={{ color: "rgba(15,16,18,.5)" }}>{company.hours}</span>
            </p>
          </div>
        </div>
        <footer className="foot mono">
          <span>
            © {new Date().getFullYear()} {company.short} — {company.name}
          </span>
          <span>{company.tagline}</span>
        </footer>
      </div>
    </section>
  );
}
