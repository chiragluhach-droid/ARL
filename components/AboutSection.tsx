"use client";

import { useReveal } from "@/lib/useReveal";
import { about, company } from "@/lib/content";

/** 07 — About: rises over the overhead shot of the delivered cargo, before Contact. */
export default function AboutSection() {
  const ref = useReveal<HTMLElement>();
  return (
    <section className="about" id="about" ref={ref} aria-labelledby="about-title">
      <div className="about__fade" />
      <div className="about__body">
        <div className="about__grid">
          {/* ---- left: year mark + archive photo ---- */}
          <div className="about__left">
            <div className="idx mono about__idx" data-reveal>
              <b>07</b>
              <i />
              About {company.short}
            </div>
            <h2 className="display about__title" id="about-title" data-reveal="lines">
              <span className="line about__since">
                <span className="li">{about.since}</span>
              </span>
              <span className="line about__year">
                <span className="li">{about.year}</span>
              </span>
            </h2>
            <p className="about__tagline mono" data-reveal>
              {about.tagline}
            </p>
            <span className="about__rule" data-reveal="draw" />

            <figure className="about__photo" data-reveal="wipe">
              <img src={about.photo.src} alt={about.photo.alt} width={1244} height={1084} loading="lazy" decoding="async" />
              <figcaption className="about__caption mono">
                {about.photo.caption}
                <span />
              </figcaption>
              <span className="about__hair about__hair--l" aria-hidden />
              <span className="about__hair about__hair--r" aria-hidden />
            </figure>
          </div>

          {/* ---- right: the story ---- */}
          <div className="about__right">
            <p className="about__lead" data-reveal>
              {about.lead}
            </p>
            {about.body.map((para) => (
              <p className="about__p" key={para.slice(0, 24)} data-reveal>
                {para}
              </p>
            ))}
            <div className="about__today" data-reveal>
              <span className="mono about__today-label">What we move today</span>
              <ul>
                {about.today.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
            <dl className="about__stats">
              {about.stats.map((s) => (
                <div key={s.value} data-reveal>
                  <dt>{s.value}</dt>
                  <dd className="mono">
                    {s.label[0]}
                    <br />
                    {s.label[1]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
