import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { Photo } from "@/components/Photo";
import { Floating } from "@/components/Floating";
import { PageHeader } from "@/components/PageHeader";
import { about } from "@/content/about";
import Link from "next/link";
import { contactLink, site } from "@/content/site";
import { photo } from "@/lib/media";

export const metadata: Metadata = {
  title: "Om",
  description: about.lead,
  alternates: { canonical: "/om-os" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Om"
        title={
          <>
            Én fotograf,
            <br />
            ét kamerahus
          </>
        }
        lead={about.lead}
        meta={about.facts.map((f) => ({ label: f.label, value: f.value }))}
      />

      {/* --------------------------------------------------------- story */}
      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(5rem,14vh,10rem)]">
        <div className="rule mb-16" data-reveal />
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-12">
          <h2 className="label md:col-span-4" data-reveal>
            {about.story.title}
          </h2>
          <div className="measure space-y-7 md:col-span-7 md:col-start-6">
            {about.story.paragraphs.map((p, i) => (
              <p
                key={i}
                className="text-[clamp(1rem,1.7vw,1.1875rem)] leading-relaxed"
                data-reveal
                style={{ "--reveal-delay": `${i * 90}ms` } as CSSProperties}
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- team */}
      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(5rem,14vh,10rem)]">
        <div className="rule mb-16" data-reveal />
        <p className="label mb-16" data-reveal>
          Bag kameraet
        </p>

        {/* One person, so the portrait sits beside the text rather than in a
            grid of cards that would leave an obvious empty cell. */}
        {about.team.map((member) => (
          <article key={member.name} className="grid gap-x-10 gap-y-10 md:grid-cols-12">
            <div className="md:col-span-4" data-reveal>
              <Floating
                mass={2.4}
                push={0.6}
                stiffness={180}
                damping={18}
                sag={5}
                tilt={0.00015}
                draggable
                className="overflow-hidden rounded-[3px] bg-paper-raised"
              >
                <Photo
                  photo={photo("team", member.photo)}
                  alt={`Portræt af ${member.name}`}
                  sizes="(min-width: 768px) 30vw, 88vw"
                  ratio={0.86}
                />
              </Floating>
            </div>

            <div
              className="md:col-span-7 md:col-start-6"
              data-reveal
              style={{ "--reveal-delay": "120ms" } as CSSProperties}
            >
              <h3 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.035em]">
                {member.name}
              </h3>
              <p className="label mt-3">{member.role}</p>
              <p className="measure mt-6 text-[clamp(1rem,1.6vw,1.125rem)] leading-relaxed text-ink-muted">
                {member.bio}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
                <a
                  href={member.cv.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group inline-flex items-center gap-2 rounded-full border border-hairline px-5 py-2.5 text-[0.8125rem] transition-colors duration-300 hover:border-ink"
                >
                  {member.cv.label}
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-500 [transition-timing-function:var(--ease-material)] group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                </a>
                {member.links.map((l) => (
                  <a
                    key={l.href}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="link-underline text-[0.8125rem] text-ink-muted hover:text-ink"
                  >
                    {l.label}
                  </a>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* ------------------------------------------------------- contact */}
      <section className="gutter mx-auto max-w-[1600px] pb-[clamp(3rem,10vh,7rem)]">
        <div className="rule mb-16" data-reveal />
        <div className="grid gap-x-10 gap-y-10 md:grid-cols-12">
          <p className="label md:col-span-4" data-reveal>
            Kontakt
          </p>
          <div className="md:col-span-7 md:col-start-6">
            <p className="title" data-reveal>
              Har I en opgave?
            </p>
            <p
              className="measure mt-6 text-[0.9375rem] leading-relaxed text-ink-muted"
              data-reveal
              style={{ "--reveal-delay": "90ms" } as CSSProperties}
            >
              Skriv til mig med lidt om hvad det er, hvornår det ligger, og hvor. Så vender
              jeg tilbage med et bud.
            </p>
            <Link
              href={contactLink.href}
              className="mt-8 inline-block rounded-full bg-ink px-7 py-3.5 text-[0.875rem] text-paper transition-transform duration-500 [transition-timing-function:var(--ease-weight)] hover:scale-[1.03]"
              data-reveal
              style={{ "--reveal-delay": "150ms" } as CSSProperties}
            >
              Skriv til mig
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
