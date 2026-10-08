"use client";

import { useReveal } from "@/lib/useReveal";
import { leadership } from "@/lib/content";
import Lines from "./Lines";

/** 08 — Leadership: the founder, then the directors carrying ARL forward. */
export default function Leadership() {
  const ref = useReveal<HTMLElement>();
  const { founder, directors } = leadership;
  return (
    <section className="lead" id="leadership" ref={ref} aria-labelledby="lead-title">
      <div className="lead__head">
        <div className="idx mono" data-reveal>
          <b>08</b>
          <i />
          Leadership
        </div>
        <h2 className="display lead__title" id="lead-title" data-reveal="lines">
          <Lines lines={["The people", "behind ARL."]} />
        </h2>
        <p className="lead__intro" data-reveal>
          From the founder who started with one truck to the directors driving it forward.
        </p>
      </div>

      {/* founder */}
      <article className="lead__founder">
        <figure className="lead__portrait lead__portrait--lg" data-reveal="wipe">
          <img src={founder.photo} alt={`${founder.name}, ${founder.role}`} width={640} height={800} loading="lazy" decoding="async" />
          <span className="lead__badge mono">Founder · 1993</span>
        </figure>
        <div className="lead__founder-text">
          <blockquote className="lead__quote" data-reveal>
            “{founder.quote}”
          </blockquote>
          <p className="lead__bio" data-reveal>
            {founder.bio}
          </p>
          <div className="lead__name" data-reveal>
            <strong>{founder.name}</strong>
            <span className="mono">{founder.role}</span>
          </div>
        </div>
      </article>

      {/* directors */}
      <div className="lead__grid">
        {directors.map((d) => (
          <article className="lead__card" key={d.name} data-reveal>
            <figure className="lead__portrait">
              <img src={d.photo} alt={`${d.name}, ${d.role}`} width={640} height={800} loading="lazy" decoding="async" />
              {d.joined && <span className="lead__badge mono">Joined {d.joined}</span>}
            </figure>
            <div className="lead__card-text">
              <div className="lead__name">
                <strong>{d.name}</strong>
                <span className="mono">{d.role}</span>
              </div>
              <p className="lead__bio">{d.bio}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="lead__swipe mono" aria-hidden>
        Swipe for more →
      </p>
    </section>
  );
}
